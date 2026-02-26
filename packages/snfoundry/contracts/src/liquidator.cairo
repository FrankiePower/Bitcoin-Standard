/// Liquidator Contract
///
/// Allows anyone to liquidate undercollateralized positions (health factor < 120%).
/// The liquidator repays a portion of the debt and receives wBTC collateral plus a bonus.

#[starknet::contract]
pub mod Liquidator {
    use contracts::interfaces::{
        IBTSUSDVaultDispatcher, IBTSUSDVaultDispatcherTrait, ILiquidator, ILiquidatorAdmin,
        IPriceOracleDispatcher, IPriceOracleDispatcherTrait, LiquidationResult,
    };
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::pausable::PausableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // CONSTANTS
    // ================================================================================================

    const PRECISION: u256 = 10000;
    const DEFAULT_LIQUIDATION_PENALTY: u256 = 1000; // 10%
    const DEFAULT_LIQUIDATOR_REWARD: u256 = 500; // 5%
    const DEFAULT_CLOSE_FACTOR: u256 = 5000; // 50%
    const LIQUIDATION_THRESHOLD: u256 = 12000; // 120%
    const WBTC_DECIMALS: u256 = 100000000; // 1e8

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        vault: ContractAddress,
        btsusd_token: ContractAddress,
        wbtc_token: ContractAddress,
        price_oracle: ContractAddress,
        liquidation_penalty: u256,
        liquidator_reward: u256,
        close_factor: u256,
        total_liquidations: u256,
        total_debt_repaid: u256,
        total_collateral_seized: u256,
    }

    // ================================================================================================
    // EVENTS
    // ================================================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
        PositionLiquidated: PositionLiquidated,
        ParametersUpdated: ParametersUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct PositionLiquidated {
        #[key]
        user: ContractAddress,
        #[key]
        liquidator: ContractAddress,
        debt_repaid: u256,
        collateral_seized: u256,
        liquidator_bonus: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ParametersUpdated {
        liquidation_penalty: u256,
        liquidator_reward: u256,
        close_factor: u256,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    mod Errors {
        pub const NOT_LIQUIDATABLE: felt252 = 'Position not liquidatable';
        pub const ZERO_AMOUNT: felt252 = 'Amount cannot be zero';
        pub const INSUFFICIENT_BALANCE: felt252 = 'Insufficient BTSUSD balance';
        pub const INVALID_PENALTY: felt252 = 'Invalid liquidation penalty';
        pub const INVALID_REWARD: felt252 = 'Invalid liquidator reward';
        pub const INVALID_CLOSE_FACTOR: felt252 = 'Invalid close factor';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        vault: ContractAddress,
        btsusd_token: ContractAddress,
        wbtc_token: ContractAddress,
        price_oracle: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.vault.write(vault);
        self.btsusd_token.write(btsusd_token);
        self.wbtc_token.write(wbtc_token);
        self.price_oracle.write(price_oracle);
        self.liquidation_penalty.write(DEFAULT_LIQUIDATION_PENALTY);
        self.liquidator_reward.write(DEFAULT_LIQUIDATOR_REWARD);
        self.close_factor.write(DEFAULT_CLOSE_FACTOR);
    }

    // ================================================================================================
    // ILIQUIDATOR IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl LiquidatorImpl of ILiquidator<ContractState> {
        fn liquidate(
            ref self: ContractState, user: ContractAddress, btcusd_amount: u256,
        ) -> LiquidationResult {
            self.pausable.assert_not_paused();
            assert(btcusd_amount > 0, Errors::ZERO_AMOUNT);
            assert(InternalImpl::_is_liquidatable(@self, user), Errors::NOT_LIQUIDATABLE);

            let caller = get_caller_address();
            let vault = IBTSUSDVaultDispatcher { contract_address: self.vault.read() };
            let btsusd = IERC20Dispatcher { contract_address: self.btsusd_token.read() };

            // Cap at close factor
            let position = vault.get_position(user);
            let max_liquidatable = (position.debt * self.close_factor.read()) / PRECISION;
            let actual_amount = if btcusd_amount > max_liquidatable {
                max_liquidatable
            } else {
                btcusd_amount
            };

            let (collateral_seized, debt_repaid, liquidator_bonus) =
                InternalImpl::_calculate_liquidation(
                @self, user, actual_amount,
            );

            assert(btsusd.balance_of(caller) >= debt_repaid, Errors::INSUFFICIENT_BALANCE);

            // Pull BTSUSD from liquidator into vault for burning
            btsusd.transfer_from(caller, self.vault.read(), debt_repaid);

            self.total_liquidations.write(self.total_liquidations.read() + 1);
            self.total_debt_repaid.write(self.total_debt_repaid.read() + debt_repaid);
            self
                .total_collateral_seized
                .write(self.total_collateral_seized.read() + collateral_seized);

            self
                .emit(
                    PositionLiquidated {
                        user,
                        liquidator: caller,
                        debt_repaid,
                        collateral_seized,
                        liquidator_bonus,
                        timestamp: get_block_timestamp(),
                    },
                );

            LiquidationResult { collateral_seized, debt_repaid, liquidator_bonus }
        }

        fn is_liquidatable(self: @ContractState, user: ContractAddress) -> bool {
            InternalImpl::_is_liquidatable(self, user)
        }

        fn calculate_liquidation(
            self: @ContractState, user: ContractAddress, btcusd_amount: u256,
        ) -> (u256, u256, u256) {
            InternalImpl::_calculate_liquidation(self, user, btcusd_amount)
        }

        fn get_liquidation_penalty(self: @ContractState) -> u256 {
            self.liquidation_penalty.read()
        }

        fn get_liquidator_reward(self: @ContractState) -> u256 {
            self.liquidator_reward.read()
        }

        fn get_close_factor(self: @ContractState) -> u256 {
            self.close_factor.read()
        }

        fn get_vault(self: @ContractState) -> ContractAddress {
            self.vault.read()
        }

        fn get_btcusd_token(self: @ContractState) -> ContractAddress {
            self.btsusd_token.read()
        }
    }

    // ================================================================================================
    // ILIQUIDATORADMIN IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl LiquidatorAdminImpl of ILiquidatorAdmin<ContractState> {
        fn set_liquidation_penalty(ref self: ContractState, penalty_bps: u256) {
            self.ownable.assert_only_owner();
            assert(penalty_bps <= 3000, Errors::INVALID_PENALTY); // max 30%
            self.liquidation_penalty.write(penalty_bps);
            InternalImpl::_emit_parameters_updated(ref self);
        }

        fn set_liquidator_reward(ref self: ContractState, reward_bps: u256) {
            self.ownable.assert_only_owner();
            assert(reward_bps <= self.liquidation_penalty.read(), Errors::INVALID_REWARD);
            self.liquidator_reward.write(reward_bps);
            InternalImpl::_emit_parameters_updated(ref self);
        }

        fn set_close_factor(ref self: ContractState, close_factor_bps: u256) {
            self.ownable.assert_only_owner();
            assert(
                close_factor_bps > 0 && close_factor_bps <= PRECISION, Errors::INVALID_CLOSE_FACTOR,
            );
            self.close_factor.write(close_factor_bps);
            InternalImpl::_emit_parameters_updated(ref self);
        }

        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }
    }

    // ================================================================================================
    // INTERNAL
    // ================================================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _is_liquidatable(self: @ContractState, user: ContractAddress) -> bool {
            let vault = IBTSUSDVaultDispatcher { contract_address: self.vault.read() };
            let hf = vault.get_health_factor(user);
            hf > 0 && hf < LIQUIDATION_THRESHOLD
        }

        fn _calculate_liquidation(
            self: @ContractState, user: ContractAddress, btcusd_amount: u256,
        ) -> (u256, u256, u256) {
            let vault = IBTSUSDVaultDispatcher { contract_address: self.vault.read() };
            let oracle = IPriceOracleDispatcher { contract_address: self.price_oracle.read() };

            let position = vault.get_position(user);
            let (btc_price, _) = oracle.get_btc_price();

            // Convert debt value → collateral amount: amount(18dec) / price(8dec) * 1e8
            let collateral_base = (btcusd_amount * WBTC_DECIMALS) / btc_price;

            let penalty = self.liquidation_penalty.read();
            let collateral_with_penalty = (collateral_base * (PRECISION + penalty)) / PRECISION;

            let collateral_seized = if collateral_with_penalty > position.collateral {
                position.collateral
            } else {
                collateral_with_penalty
            };

            let reward = self.liquidator_reward.read();
            let liquidator_bonus = (collateral_base * reward) / PRECISION;

            (collateral_seized, btcusd_amount, liquidator_bonus)
        }

        fn _emit_parameters_updated(ref self: ContractState) {
            self
                .emit(
                    ParametersUpdated {
                        liquidation_penalty: self.liquidation_penalty.read(),
                        liquidator_reward: self.liquidator_reward.read(),
                        close_factor: self.close_factor.read(),
                    },
                );
        }
    }
}
