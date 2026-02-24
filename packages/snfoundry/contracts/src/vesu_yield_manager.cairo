/// Vesu Yield Manager Contract
///
/// Routes vault collateral into Vesu lending pools to earn supply-side yield.
/// Tracks per-user shares so yield can be distributed proportionally on harvest.
///
/// Flow: vault.deposit → this.deposit → Vesu.modify_position (supply wBTC)
///       this.harvest_yield → Vesu.position_unsafe → distribute wBTC to user + treasury

#[starknet::contract]
pub mod VesuYieldManager {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry,
    };
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_access::ownable::OwnableComponent;
    use contracts::interfaces::{
        IYieldManager,
        IVesuSingletonDispatcher, IVesuSingletonDispatcherTrait,
        Amount, AmountType, AmountDenomination, ModifyPositionParams,
    };
    use alexandria_math::i257::I257Impl;

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // CONSTANTS
    // ================================================================================================

    const PRECISION: u256 = 10000;
    const DEFAULT_USER_SHARE: u256 = 7000;     // 70%
    const DEFAULT_PROTOCOL_SHARE: u256 = 3000; // 30%

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        vault: ContractAddress,
        wbtc_token: ContractAddress,
        vesu_singleton: ContractAddress,
        vesu_pool_id: felt252,
        user_deposits: Map<ContractAddress, u256>,
        user_shares: Map<ContractAddress, u256>,
        total_deposits: u256,
        total_shares: u256,
        last_total_value: u256,
        total_yield_harvested: u256,
        user_share: u256,
        protocol_share: u256,
        treasury: ContractAddress,
        paused: bool,
    }

    // ================================================================================================
    // EVENTS
    // ================================================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        Deposited: Deposited,
        Withdrawn: Withdrawn,
        YieldHarvested: YieldHarvested,
        ConfigUpdated: ConfigUpdated,
        EmergencyWithdraw: EmergencyWithdraw,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Deposited {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub shares: u256,
        pub total_deposit: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Withdrawn {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
        pub shares: u256,
        pub remaining_deposit: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct YieldHarvested {
        #[key]
        pub user: ContractAddress,
        pub total_yield: u256,
        pub user_amount: u256,
        pub protocol_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ConfigUpdated {
        pub user_share: u256,
        pub protocol_share: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct EmergencyWithdraw {
        pub amount: u256,
        pub timestamp: u64,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    pub mod Errors {
        pub const ONLY_VAULT: felt252 = 'VesuYieldMgr: not vault';
        pub const ZERO_ADDRESS: felt252 = 'VesuYieldMgr: zero address';
        pub const ZERO_AMOUNT: felt252 = 'VesuYieldMgr: zero amount';
        pub const INSUFFICIENT_BALANCE: felt252 = 'VesuYieldMgr: insufficient bal';
        pub const INVALID_FEE_CONFIG: felt252 = 'VesuYieldMgr: invalid fees';
        pub const PAUSED: felt252 = 'VesuYieldMgr: paused';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        vault: ContractAddress,
        wbtc_token: ContractAddress,
        vesu_singleton: ContractAddress,
        vesu_pool_id: felt252,
        treasury: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        assert(!vault.is_zero(), Errors::ZERO_ADDRESS);
        assert(!wbtc_token.is_zero(), Errors::ZERO_ADDRESS);
        assert(!vesu_singleton.is_zero(), Errors::ZERO_ADDRESS);
        assert(!treasury.is_zero(), Errors::ZERO_ADDRESS);
        self.vault.write(vault);
        self.wbtc_token.write(wbtc_token);
        self.vesu_singleton.write(vesu_singleton);
        self.vesu_pool_id.write(vesu_pool_id);
        self.treasury.write(treasury);
        self.user_share.write(DEFAULT_USER_SHARE);
        self.protocol_share.write(DEFAULT_PROTOCOL_SHARE);
        self.paused.write(false);
    }

    // ================================================================================================
    // IYIELDMANAGER IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl YieldManagerImpl of IYieldManager<ContractState> {
        fn deposit(ref self: ContractState, user: ContractAddress, amount: u256) {
            self._assert_only_vault();
            self._assert_not_paused();
            assert(!user.is_zero(), Errors::ZERO_ADDRESS);
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer_from(self.vault.read(), get_contract_address(), amount);

            let shares = self._calculate_shares_for_deposit(amount);
            self._deposit_to_vesu(amount);

            let cur_deposit = self.user_deposits.entry(user).read();
            let cur_shares = self.user_shares.entry(user).read();
            self.user_deposits.entry(user).write(cur_deposit + amount);
            self.user_shares.entry(user).write(cur_shares + shares);
            self.total_deposits.write(self.total_deposits.read() + amount);
            self.total_shares.write(self.total_shares.read() + shares);

            self.emit(Deposited { user, amount, shares, total_deposit: cur_deposit + amount });
        }

        fn withdraw(ref self: ContractState, user: ContractAddress, amount: u256) {
            self._assert_only_vault();
            assert(!user.is_zero(), Errors::ZERO_ADDRESS);
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let cur_deposit = self.user_deposits.entry(user).read();
            assert(cur_deposit >= amount, Errors::INSUFFICIENT_BALANCE);

            let user_shares = self.user_shares.entry(user).read();
            let shares_to_burn = (user_shares * amount) / cur_deposit;

            self._withdraw_from_vesu(amount);

            self.user_deposits.entry(user).write(cur_deposit - amount);
            self.user_shares.entry(user).write(user_shares - shares_to_burn);
            self.total_deposits.write(self.total_deposits.read() - amount);
            self.total_shares.write(self.total_shares.read() - shares_to_burn);

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            wbtc.transfer(self.vault.read(), amount);

            self
                .emit(
                    Withdrawn {
                        user,
                        amount,
                        shares: shares_to_burn,
                        remaining_deposit: cur_deposit - amount,
                    },
                );
        }

        fn harvest_yield(ref self: ContractState, user: ContractAddress) -> u256 {
            self._assert_not_paused();

            let user_shares = self.user_shares.entry(user).read();
            if user_shares == 0 {
                return 0;
            }

            let total_shares = self.total_shares.read();
            let total_value = self._get_total_vesu_value();
            let user_value = (total_value * user_shares) / total_shares;
            let user_principal = self.user_deposits.entry(user).read();

            if user_value <= user_principal {
                return 0;
            }

            let total_yield = user_value - user_principal;
            let user_share_bps = self.user_share.read();
            let user_amount = (total_yield * user_share_bps) / PRECISION;
            let protocol_amount = total_yield - user_amount;

            self._withdraw_from_vesu(total_yield);

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            if user_amount > 0 {
                wbtc.transfer(user, user_amount);
            }
            if protocol_amount > 0 {
                wbtc.transfer(self.treasury.read(), protocol_amount);
            }

            self.total_yield_harvested.write(self.total_yield_harvested.read() + total_yield);
            self.emit(YieldHarvested { user, total_yield, user_amount, protocol_amount });

            user_amount
        }

        fn harvest_all(ref self: ContractState) {
            // No-op: batch harvesting requires off-chain enumeration of users.
        }

        fn get_user_deposit(self: @ContractState, user: ContractAddress) -> u256 {
            self.user_deposits.entry(user).read()
        }

        fn get_user_yield(self: @ContractState, user: ContractAddress) -> u256 {
            let user_shares = self.user_shares.entry(user).read();
            if user_shares == 0 {
                return 0;
            }
            let total_shares = self.total_shares.read();
            if total_shares == 0 {
                return 0;
            }
            let total_value = self._get_total_vesu_value();
            let user_value = (total_value * user_shares) / total_shares;
            let user_principal = self.user_deposits.entry(user).read();
            if user_value > user_principal {
                user_value - user_principal
            } else {
                0
            }
        }

        fn get_total_deposits(self: @ContractState) -> u256 {
            self.total_deposits.read()
        }

        fn get_total_yield(self: @ContractState) -> u256 {
            let total_value = self._get_total_vesu_value();
            let total_deposits = self.total_deposits.read();
            if total_value > total_deposits {
                total_value - total_deposits
            } else {
                0
            }
        }

        fn get_yield_rate(self: @ContractState) -> u256 {
            // Vesu rate is dynamic; return a placeholder until on-chain query is implemented.
            500 // 5% APY
        }

        fn get_fee_config(self: @ContractState) -> (u256, u256) {
            (self.user_share.read(), self.protocol_share.read())
        }

        fn set_vault(ref self: ContractState, vault: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!vault.is_zero(), Errors::ZERO_ADDRESS);
            self.vault.write(vault);
        }

        fn set_yield_rate(ref self: ContractState, rate: u256) {
            // No-op: rate is set by the Vesu protocol.
            self.ownable.assert_only_owner();
            let _ = rate;
        }

        fn set_fee_config(ref self: ContractState, user_share: u256, protocol_share: u256) {
            self.ownable.assert_only_owner();
            assert(user_share + protocol_share == PRECISION, Errors::INVALID_FEE_CONFIG);
            self.user_share.write(user_share);
            self.protocol_share.write(protocol_share);
            self.emit(ConfigUpdated { user_share, protocol_share });
        }

        fn emergency_withdraw(ref self: ContractState) {
            self.ownable.assert_only_owner();

            let total_value = self._get_total_vesu_value();
            if total_value > 0 {
                self._withdraw_from_vesu(total_value);
            }

            let wbtc = IERC20Dispatcher { contract_address: self.wbtc_token.read() };
            let balance = wbtc.balance_of(get_contract_address());
            if balance > 0 {
                wbtc.transfer(self.vault.read(), balance);
            }

            self.paused.write(true);
            self.emit(EmergencyWithdraw { amount: balance, timestamp: get_block_timestamp() });
        }
    }

    // ================================================================================================
    // ADMIN (extra Vesu-specific setters)
    // ================================================================================================

    #[generate_trait]
    #[abi(per_item)]
    impl AdminImpl of AdminTrait {
        #[external(v0)]
        fn set_vesu_pool_id(ref self: ContractState, pool_id: felt252) {
            self.ownable.assert_only_owner();
            self.vesu_pool_id.write(pool_id);
        }

        #[external(v0)]
        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!treasury.is_zero(), Errors::ZERO_ADDRESS);
            self.treasury.write(treasury);
        }

        #[external(v0)]
        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.paused.write(true);
        }

        #[external(v0)]
        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.paused.write(false);
        }

        /// Returns (collateral_shares, collateral_value) for this contract's Vesu position.
        #[external(v0)]
        fn get_vesu_position(self: @ContractState) -> (u256, u256) {
            let vesu = IVesuSingletonDispatcher {
                contract_address: self.vesu_singleton.read(),
            };
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let (position, collateral_value, _) = vesu
                .position_unsafe(
                    self.vesu_pool_id.read(), self.wbtc_token.read(), zero_addr, get_contract_address(),
                );
            (position.collateral_shares.into(), collateral_value)
        }
    }

    // ================================================================================================
    // INTERNAL
    // ================================================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_vault(self: @ContractState) {
            assert(get_caller_address() == self.vault.read(), Errors::ONLY_VAULT);
        }

        fn _assert_not_paused(self: @ContractState) {
            assert(!self.paused.read(), Errors::PAUSED);
        }

        /// Mints shares proportional to the current pool value (1:1 on first deposit).
        fn _calculate_shares_for_deposit(self: @ContractState, amount: u256) -> u256 {
            let total_shares = self.total_shares.read();
            let total_value = self._get_total_vesu_value();
            if total_shares == 0 || total_value == 0 {
                amount
            } else {
                (amount * total_shares) / total_value
            }
        }

        /// Queries Vesu for the current value of our entire position (principal + accrued yield).
        fn _get_total_vesu_value(self: @ContractState) -> u256 {
            if self.total_deposits.read() == 0 {
                return 0;
            }
            let vesu = IVesuSingletonDispatcher {
                contract_address: self.vesu_singleton.read(),
            };
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let (_position, collateral_value, _) = vesu
                .position_unsafe(
                    self.vesu_pool_id.read(),
                    self.wbtc_token.read(),
                    zero_addr,
                    get_contract_address(),
                );
            collateral_value
        }

        /// Approves Vesu and calls modify_position to supply `amount` wBTC as collateral.
        fn _deposit_to_vesu(ref self: ContractState, amount: u256) {
            let vesu_singleton = self.vesu_singleton.read();
            let wbtc_token = self.wbtc_token.read();

            let wbtc = IERC20Dispatcher { contract_address: wbtc_token };
            wbtc.approve(vesu_singleton, amount);

            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let params = ModifyPositionParams {
                pool_id: self.vesu_pool_id.read(),
                collateral_asset: wbtc_token,
                debt_asset: zero_addr,
                user: get_contract_address(),
                collateral: Amount {
                    amount_type: AmountType::Delta,
                    denomination: AmountDenomination::Native,
                    value: I257Impl::new(amount, false), // positive = supply
                },
                debt: Amount {
                    amount_type: AmountType::Delta,
                    denomination: AmountDenomination::Native,
                    value: I257Impl::new(0, false),
                },
                data: array![].span(),
            };

            let vesu = IVesuSingletonDispatcher { contract_address: vesu_singleton };
            vesu.modify_position(params);
        }

        /// Calls modify_position to withdraw `amount` wBTC from Vesu.
        fn _withdraw_from_vesu(ref self: ContractState, amount: u256) {
            let vesu_singleton = self.vesu_singleton.read();
            let wbtc_token = self.wbtc_token.read();
            let zero_addr: ContractAddress = 0.try_into().unwrap();

            let params = ModifyPositionParams {
                pool_id: self.vesu_pool_id.read(),
                collateral_asset: wbtc_token,
                debt_asset: zero_addr,
                user: get_contract_address(),
                collateral: Amount {
                    amount_type: AmountType::Delta,
                    denomination: AmountDenomination::Native,
                    value: I257Impl::new(amount, true), // negative = withdraw
                },
                debt: Amount {
                    amount_type: AmountType::Delta,
                    denomination: AmountDenomination::Native,
                    value: I257Impl::new(0, false),
                },
                data: array![].span(),
            };

            let vesu = IVesuSingletonDispatcher { contract_address: vesu_singleton };
            vesu.modify_position(params);
        }
    }
}
