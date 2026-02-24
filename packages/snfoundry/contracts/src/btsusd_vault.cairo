/// BTSUSD Vault Contract
///
/// Core CDP engine. Users deposit wBTC as collateral and mint BTSUSD stablecoin against it.
///
/// Security invariants:
///   1. total BTSUSD supply == sum of all position debts
///   2. every position with debt must have collateral_ratio >= 150%
///   3. only this contract may call BTSUSDToken.mint / burn

#[starknet::contract]
pub mod BTSUSDVault {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry,
    };
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::pausable::PausableComponent;
    use openzeppelin_security::reentrancyguard::ReentrancyGuardComponent;
    use contracts::interfaces::{
        IBTSUSDVault, Position, IBTSUSDTokenDispatcher, IBTSUSDTokenDispatcherTrait,
        IYieldManagerDispatcher, IYieldManagerDispatcherTrait,
        IPriceOracleDispatcher, IPriceOracleDispatcherTrait,
    };

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy, event: ReentrancyEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
    impl ReentrancyInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // CONSTANTS
    // ================================================================================================

    const PRECISION: u256 = 10000;
    const MIN_COLLATERAL_RATIO: u256 = 15000;  // 150%
    const LIQUIDATION_THRESHOLD: u256 = 12000; // 120%
    const MAX_LTV: u256 = 6667;                // 66.67%
    const WBTC_DECIMALS: u256 = 100000000;     // 1e8
    const BTSUSD_DECIMALS: u256 = 1000000000000000000; // 1e18
    const PRICE_DECIMALS: u256 = 100000000;    // 1e8  (oracle uses 8 decimals)
    const DEFAULT_MIN_DEPOSIT: u256 = 100000;  // 0.001 wBTC

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        #[substorage(v0)]
        reentrancy: ReentrancyGuardComponent::Storage,
        wbtc_token: ContractAddress,
        btsusd_token: ContractAddress,
        price_oracle: ContractAddress,
        yield_manager: ContractAddress,
        liquidator: ContractAddress,
        positions: Map<ContractAddress, Position>,
        total_collateral: u256,
        total_debt: u256,
        min_deposit: u256,
    }

    // ================================================================================================
    // EVENTS
    // ================================================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
        #[flat]
        ReentrancyEvent: ReentrancyGuardComponent::Event,
        CollateralDeposited: CollateralDeposited,
        CollateralWithdrawn: CollateralWithdrawn,
        BTSUSDMinted: BTSUSDMinted,
        BTSUSDBurned: BTSUSDBurned,
        PositionUpdated: PositionUpdated,
        PositionLiquidated: PositionLiquidated,
        LiquidatorUpdated: LiquidatorUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CollateralDeposited {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub total_collateral: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CollateralWithdrawn {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub remaining_collateral: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BTSUSDMinted {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub total_debt: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BTSUSDBurned {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub remaining_debt: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PositionUpdated {
        #[key]
        pub user: ContractAddress,
        pub collateral: u256,
        pub debt: u256,
        pub collateral_ratio: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PositionLiquidated {
        #[key]
        pub user: ContractAddress,
        #[key]
        pub liquidator: ContractAddress,
        pub debt_repaid: u256,
        pub collateral_seized: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LiquidatorUpdated {
        pub old_liquidator: ContractAddress,
        pub new_liquidator: ContractAddress,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    pub mod Errors {
        pub const ZERO_ADDRESS: felt252 = 'Vault: zero address';
        pub const ZERO_AMOUNT: felt252 = 'Vault: zero amount';
        pub const BELOW_MIN_DEPOSIT: felt252 = 'Vault: below min deposit';
        pub const INSUFFICIENT_COLLATERAL: felt252 = 'Vault: insufficient collateral';
        pub const INSUFFICIENT_DEBT: felt252 = 'Vault: insufficient debt';
        pub const UNHEALTHY_POSITION: felt252 = 'Vault: unhealthy position';
        pub const NO_POSITION: felt252 = 'Vault: no position';
        pub const STALE_PRICE: felt252 = 'Vault: stale price';
        pub const ZERO_PRICE: felt252 = 'Vault: zero price';
        pub const NOT_LIQUIDATOR: felt252 = 'Vault: not liquidator';
        pub const NOT_LIQUIDATABLE: felt252 = 'Vault: not liquidatable';
        pub const SEIZE_TOO_MUCH: felt252 = 'Vault: seize too much';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        wbtc_token: ContractAddress,
        btsusd_token: ContractAddress,
        price_oracle: ContractAddress,
        yield_manager: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        assert(!wbtc_token.is_zero(), Errors::ZERO_ADDRESS);
        assert(!btsusd_token.is_zero(), Errors::ZERO_ADDRESS);
        assert(!price_oracle.is_zero(), Errors::ZERO_ADDRESS);
        assert(!yield_manager.is_zero(), Errors::ZERO_ADDRESS);
        self.wbtc_token.write(wbtc_token);
        self.btsusd_token.write(btsusd_token);
        self.price_oracle.write(price_oracle);
        self.yield_manager.write(yield_manager);
        self.min_deposit.write(DEFAULT_MIN_DEPOSIT);
    }

    // ================================================================================================
    // IBTSUSDVAULT IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl BTSUSDVaultImpl of IBTSUSDVault<ContractState> {
        // --- User Operations ---

        fn deposit_collateral(ref self: ContractState, amount: u256) {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(amount > 0, Errors::ZERO_AMOUNT);
            assert(amount >= self.min_deposit.read(), Errors::BELOW_MIN_DEPOSIT);

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer_from(caller, get_contract_address(), amount);

            let mut position = self.positions.entry(caller).read();
            position.collateral += amount;
            position.last_update = get_block_timestamp();
            self.positions.entry(caller).write(position);
            self.total_collateral.write(self.total_collateral.read() + amount);

            self._deposit_to_yield_manager(caller, amount);

            self.emit(CollateralDeposited { user: caller, amount, total_collateral: position.collateral });
            self._emit_position_updated(caller, position);
            self.reentrancy.end();
        }

        fn withdraw_collateral(ref self: ContractState, amount: u256) {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let mut position = self.positions.entry(caller).read();
            assert(position.collateral >= amount, Errors::INSUFFICIENT_COLLATERAL);

            let new_collateral = position.collateral - amount;
            if position.debt > 0 {
                let new_ratio = self._calculate_collateral_ratio(new_collateral, position.debt);
                assert(new_ratio >= MIN_COLLATERAL_RATIO, Errors::UNHEALTHY_POSITION);
            }

            position.collateral = new_collateral;
            position.last_update = get_block_timestamp();
            self.positions.entry(caller).write(position);
            self.total_collateral.write(self.total_collateral.read() - amount);

            self._withdraw_from_yield_manager(caller, amount);
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(caller, amount);

            self.emit(CollateralWithdrawn { user: caller, amount, remaining_collateral: new_collateral });
            self._emit_position_updated(caller, position);
            self.reentrancy.end();
        }

        fn mint_BTSUSD(ref self: ContractState, amount: u256) {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let mut position = self.positions.entry(caller).read();
            assert(position.collateral > 0, Errors::NO_POSITION);

            let new_debt = position.debt + amount;
            let new_ratio = self._calculate_collateral_ratio(position.collateral, new_debt);
            assert(new_ratio >= MIN_COLLATERAL_RATIO, Errors::UNHEALTHY_POSITION);

            position.debt = new_debt;
            position.last_update = get_block_timestamp();
            self.positions.entry(caller).write(position);
            self.total_debt.write(self.total_debt.read() + amount);

            let btsusd = IBTSUSDTokenDispatcher { contract_address: self.btsusd_token.read() };
            btsusd.mint(caller, amount);

            self.emit(BTSUSDMinted { user: caller, amount, total_debt: new_debt });
            self._emit_position_updated(caller, position);
            self.reentrancy.end();
        }

        fn burn_BTSUSD(ref self: ContractState, amount: u256) {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let mut position = self.positions.entry(caller).read();
            assert(position.debt >= amount, Errors::INSUFFICIENT_DEBT);

            position.debt -= amount;
            position.last_update = get_block_timestamp();
            self.positions.entry(caller).write(position);
            self.total_debt.write(self.total_debt.read() - amount);

            let btsusd = IBTSUSDTokenDispatcher { contract_address: self.btsusd_token.read() };
            btsusd.burn(caller, amount);

            self.emit(BTSUSDBurned { user: caller, amount, remaining_debt: position.debt });
            self._emit_position_updated(caller, position);
            self.reentrancy.end();
        }

        fn deposit_and_mint(ref self: ContractState, collateral_amount: u256) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(collateral_amount > 0, Errors::ZERO_AMOUNT);
            assert(collateral_amount >= self.min_deposit.read(), Errors::BELOW_MIN_DEPOSIT);

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer_from(caller, get_contract_address(), collateral_amount);

            let mut position = self.positions.entry(caller).read();
            let new_collateral = position.collateral + collateral_amount;

            let collateral_value = self._get_collateral_value(new_collateral);
            let max_debt_value = collateral_value * MAX_LTV / PRECISION;
            let current_debt_value = self._get_debt_value(position.debt);
            let mint_amount = if max_debt_value > current_debt_value {
                max_debt_value - current_debt_value
            } else {
                0
            };

            position.collateral = new_collateral;
            position.debt += mint_amount;
            position.last_update = get_block_timestamp();
            self.positions.entry(caller).write(position);
            self.total_collateral.write(self.total_collateral.read() + collateral_amount);
            self.total_debt.write(self.total_debt.read() + mint_amount);

            self._deposit_to_yield_manager(caller, collateral_amount);

            if mint_amount > 0 {
                let btsusd = IBTSUSDTokenDispatcher { contract_address: self.btsusd_token.read() };
                btsusd.mint(caller, mint_amount);
            }

            self
                .emit(
                    CollateralDeposited {
                        user: caller, amount: collateral_amount, total_collateral: new_collateral,
                    },
                );
            self.emit(BTSUSDMinted { user: caller, amount: mint_amount, total_debt: position.debt });
            self._emit_position_updated(caller, position);
            self.reentrancy.end();

            mint_amount
        }

        fn repay_and_withdraw(ref self: ContractState, BTSUSD_amount: u256) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(BTSUSD_amount > 0, Errors::ZERO_AMOUNT);

            let position = self.positions.entry(caller).read();
            assert(position.debt > 0, Errors::NO_POSITION);
            assert(BTSUSD_amount <= position.debt, Errors::INSUFFICIENT_DEBT);

            // Proportional collateral release: return = amount * collateral / debt
            let collateral_to_return = BTSUSD_amount * position.collateral / position.debt;
            let new_collateral = position.collateral - collateral_to_return;
            let new_debt = position.debt - BTSUSD_amount;

            let mut updated = position;
            updated.collateral = new_collateral;
            updated.debt = new_debt;
            updated.last_update = get_block_timestamp();
            self.positions.entry(caller).write(updated);
            self.total_collateral.write(self.total_collateral.read() - collateral_to_return);
            self.total_debt.write(self.total_debt.read() - BTSUSD_amount);

            let btsusd = IBTSUSDTokenDispatcher { contract_address: self.btsusd_token.read() };
            btsusd.burn(caller, BTSUSD_amount);

            self._withdraw_from_yield_manager(caller, collateral_to_return);
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(caller, collateral_to_return);

            self.emit(BTSUSDBurned { user: caller, amount: BTSUSD_amount, remaining_debt: new_debt });
            self
                .emit(
                    CollateralWithdrawn {
                        user: caller,
                        amount: collateral_to_return,
                        remaining_collateral: new_collateral,
                    },
                );
            self._emit_position_updated(caller, updated);
            self.reentrancy.end();

            collateral_to_return
        }

        // --- View Functions ---

        fn get_position(self: @ContractState, user: ContractAddress) -> Position {
            self.positions.entry(user).read()
        }

        fn get_collateral_ratio(self: @ContractState, user: ContractAddress) -> u256 {
            let position = self.positions.entry(user).read();
            if position.debt == 0 {
                return 0;
            }
            self._calculate_collateral_ratio(position.collateral, position.debt)
        }

        fn get_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
            self.get_collateral_ratio(user)
        }

        fn is_liquidatable(self: @ContractState, user: ContractAddress) -> bool {
            let ratio = self.get_collateral_ratio(user);
            ratio > 0 && ratio < LIQUIDATION_THRESHOLD
        }

        fn get_max_mintable(self: @ContractState, user: ContractAddress) -> u256 {
            let position = self.positions.entry(user).read();
            if position.collateral == 0 {
                return 0;
            }
            let max_debt = self._get_collateral_value(position.collateral) * MAX_LTV / PRECISION;
            let current_debt = self._get_debt_value(position.debt);
            if max_debt > current_debt {
                max_debt - current_debt
            } else {
                0
            }
        }

        fn get_max_withdrawable(self: @ContractState, user: ContractAddress) -> u256 {
            let position = self.positions.entry(user).read();
            if position.debt == 0 {
                return position.collateral;
            }
            let min_collateral_value =
                self._get_debt_value(position.debt) * MIN_COLLATERAL_RATIO / PRECISION;
            let (btc_price, _) = self._get_btc_price_safe();
            let min_collateral =
                min_collateral_value * WBTC_DECIMALS * PRICE_DECIMALS / (btc_price * BTSUSD_DECIMALS);
            if position.collateral > min_collateral {
                position.collateral - min_collateral
            } else {
                0
            }
        }

        fn get_protocol_stats(self: @ContractState) -> (u256, u256) {
            (self.total_collateral.read(), self.total_debt.read())
        }

        fn get_btc_price(self: @ContractState) -> u256 {
            let (price, _) = self._get_btc_price_safe();
            price
        }

        // --- Admin ---

        fn set_oracle(ref self: ContractState, oracle: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!oracle.is_zero(), Errors::ZERO_ADDRESS);
            self.price_oracle.write(oracle);
        }

        fn set_yield_manager(ref self: ContractState, yield_manager: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!yield_manager.is_zero(), Errors::ZERO_ADDRESS);
            self.yield_manager.write(yield_manager);
        }

        fn set_min_deposit(ref self: ContractState, min_deposit: u256) {
            self.ownable.assert_only_owner();
            self.min_deposit.write(min_deposit);
        }

        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }

        fn get_addresses(
            self: @ContractState,
        ) -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress) {
            (
                self.wbtc_token.read(),
                self.btsusd_token.read(),
                self.price_oracle.read(),
                self.yield_manager.read(),
            )
        }

        // --- Liquidation ---

        fn liquidate(
            ref self: ContractState,
            user: ContractAddress,
            debt_to_repay: u256,
            collateral_to_seize: u256,
        ) {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            let caller = get_caller_address();
            assert(caller == self.liquidator.read(), Errors::NOT_LIQUIDATOR);
            assert(self.is_liquidatable(user), Errors::NOT_LIQUIDATABLE);

            let mut position = self.positions.entry(user).read();
            assert(debt_to_repay <= position.debt, Errors::INSUFFICIENT_DEBT);
            assert(collateral_to_seize <= position.collateral, Errors::SEIZE_TOO_MUCH);

            position.debt -= debt_to_repay;
            position.collateral -= collateral_to_seize;
            position.last_update = get_block_timestamp();
            self.positions.entry(user).write(position);
            self.total_debt.write(self.total_debt.read() - debt_to_repay);
            self.total_collateral.write(self.total_collateral.read() - collateral_to_seize);

            let btsusd = IBTSUSDTokenDispatcher { contract_address: self.btsusd_token.read() };
            btsusd.burn(get_contract_address(), debt_to_repay);

            self._withdraw_from_yield_manager(user, collateral_to_seize);
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(caller, collateral_to_seize);

            self
                .emit(
                    PositionLiquidated {
                        user,
                        liquidator: caller,
                        debt_repaid: debt_to_repay,
                        collateral_seized: collateral_to_seize,
                        timestamp: get_block_timestamp(),
                    },
                );
            self._emit_position_updated(user, position);
            self.reentrancy.end();
        }

        fn set_liquidator(ref self: ContractState, liquidator: ContractAddress) {
            self.ownable.assert_only_owner();
            let old_liquidator = self.liquidator.read();
            self.liquidator.write(liquidator);
            self.emit(LiquidatorUpdated { old_liquidator, new_liquidator: liquidator });
        }

        fn get_liquidator(self: @ContractState) -> ContractAddress {
            self.liquidator.read()
        }
    }

    // ================================================================================================
    // INTERNAL
    // ================================================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Fetches the BTC price from the oracle, asserting it is non-zero and fresh.
        fn _get_btc_price_safe(self: @ContractState) -> (u256, u64) {
            let oracle = IPriceOracleDispatcher { contract_address: self.price_oracle.read() };
            let (price, timestamp) = oracle.get_btc_price();
            assert(price > 0, Errors::ZERO_PRICE);
            assert(!oracle.is_price_stale(), Errors::STALE_PRICE);
            (price, timestamp)
        }

        /// collateral(8dec) * price(8dec) * 1e18 / (1e8 * 1e8) = value(18dec)
        fn _get_collateral_value(self: @ContractState, collateral: u256) -> u256 {
            if collateral == 0 {
                return 0;
            }
            let (btc_price, _) = self._get_btc_price_safe();
            collateral * btc_price * BTSUSD_DECIMALS / (WBTC_DECIMALS * PRICE_DECIMALS)
        }

        /// BTSUSD is pegged 1:1 to USD, already in 18 decimals.
        fn _get_debt_value(self: @ContractState, debt: u256) -> u256 {
            debt
        }

        /// ratio = collateral_value * PRECISION / debt_value  (in basis points)
        fn _calculate_collateral_ratio(
            self: @ContractState, collateral: u256, debt: u256,
        ) -> u256 {
            if debt == 0 {
                return 0;
            }
            self._get_collateral_value(collateral) * PRECISION / self._get_debt_value(debt)
        }

        fn _deposit_to_yield_manager(
            ref self: ContractState, user: ContractAddress, amount: u256,
        ) {
            let yield_manager = self.yield_manager.read();
            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.approve(yield_manager, amount);
            let ym = IYieldManagerDispatcher { contract_address: yield_manager };
            ym.deposit(user, amount);
        }

        fn _withdraw_from_yield_manager(
            ref self: ContractState, user: ContractAddress, amount: u256,
        ) {
            let ym = IYieldManagerDispatcher { contract_address: self.yield_manager.read() };
            ym.withdraw(user, amount);
        }

        fn _emit_position_updated(
            ref self: ContractState, user: ContractAddress, position: Position,
        ) {
            let ratio = if position.debt > 0 {
                self._calculate_collateral_ratio(position.collateral, position.debt)
            } else {
                0
            };
            self
                .emit(
                    PositionUpdated {
                        user,
                        collateral: position.collateral,
                        debt: position.debt,
                        collateral_ratio: ratio,
                    },
                );
        }
    }
}
