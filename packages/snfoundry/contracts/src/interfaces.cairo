use starknet::ContractAddress;
use alexandria_math::i257::i257;

// ================================================================================================
// TOKEN INTERFACE
// ================================================================================================

/// BTSUSD stablecoin token — only the vault can mint and burn.
#[starknet::interface]
pub trait IBTSUSDToken<TContractState> {
    /// Mints BTSUSD to `to`. Only callable by the vault.
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);

    /// Burns BTSUSD from `from`. Only callable by the vault.
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);

    /// Updates the authorized vault address. Only owner.
    fn set_vault(ref self: TContractState, new_vault: ContractAddress);

    /// Returns the current vault address.
    fn get_vault(self: @TContractState) -> ContractAddress;

    /// Pauses all transfers. Only owner.
    fn pause(ref self: TContractState);

    /// Unpauses transfers. Only owner.
    fn unpause(ref self: TContractState);

    /// Returns whether the contract is paused.
    fn get_paused_status(self: @TContractState) -> bool;
}

// ================================================================================================
// VAULT INTERFACE
// ================================================================================================

/// User collateral/debt position.
#[derive(Drop, Copy, Serde, starknet::Store, PartialEq)]
pub struct Position {
    /// wBTC collateral deposited (8 decimals)
    pub collateral: u256,
    /// BTSUSD debt owed (18 decimals)
    pub debt: u256,
    /// Unix timestamp of last update
    pub last_update: u64,
}

/// BTSUSD Vault — manages CDPs, collateral routing, and BTSUSD minting/burning.
#[starknet::interface]
pub trait IBTSUSDVault<TContractState> {
    // --- User Operations ---

    /// Deposits wBTC collateral. Does not auto-mint; call `mint_BTSUSD` separately.
    fn deposit_collateral(ref self: TContractState, amount: u256);

    /// Withdraws wBTC. Position must stay healthy (ratio >= MIN_COLLATERAL_RATIO) or debt == 0.
    fn withdraw_collateral(ref self: TContractState, amount: u256);

    /// Mints BTSUSD against deposited collateral. Position must stay healthy.
    fn mint_BTSUSD(ref self: TContractState, amount: u256);

    /// Burns BTSUSD to reduce debt. Caller must hold the tokens.
    fn burn_BTSUSD(ref self: TContractState, amount: u256);

    /// Deposits collateral and mints the maximum safe BTSUSD in one call.
    /// Returns the amount of BTSUSD minted.
    fn deposit_and_mint(ref self: TContractState, collateral_amount: u256) -> u256;

    /// Burns BTSUSD and withdraws proportional collateral in one call.
    /// Returns the amount of wBTC withdrawn.
    fn repay_and_withdraw(ref self: TContractState, BTSUSD_amount: u256) -> u256;

    // --- View Functions ---

    /// Returns the position for `user`.
    fn get_position(self: @TContractState, user: ContractAddress) -> Position;

    /// Returns collateral ratio in basis points (e.g. 15000 = 150%). 0 if no debt.
    fn get_collateral_ratio(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns health factor in basis points. Alias for collateral ratio in this model.
    fn get_health_factor(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns true if the position is eligible for liquidation.
    fn is_liquidatable(self: @TContractState, user: ContractAddress) -> bool;

    /// Returns the max BTSUSD that can still be minted from current collateral.
    fn get_max_mintable(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns the max wBTC that can be withdrawn while keeping the position healthy.
    fn get_max_withdrawable(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns (total_collateral, total_debt) across all positions.
    fn get_protocol_stats(self: @TContractState) -> (u256, u256);

    /// Returns the current BTC price from the oracle (8 decimals).
    fn get_btc_price(self: @TContractState) -> u256;

    // --- Admin ---

    /// Sets the price oracle. Only owner.
    fn set_oracle(ref self: TContractState, oracle: ContractAddress);

    /// Sets the yield manager. Only owner.
    fn set_yield_manager(ref self: TContractState, yield_manager: ContractAddress);

    /// Sets the minimum deposit amount. Only owner.
    fn set_min_deposit(ref self: TContractState, min_deposit: u256);

    /// Pauses all vault operations. Only owner.
    fn pause(ref self: TContractState);

    /// Unpauses vault operations. Only owner.
    fn unpause(ref self: TContractState);

    /// Returns (wbtc_token, BTSUSD_token, oracle, yield_manager).
    fn get_addresses(
        self: @TContractState,
    ) -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress);

    // --- Liquidation (Stage 2) ---

    /// Executes a liquidation. Only callable by the authorized liquidator contract.
    fn liquidate(
        ref self: TContractState,
        user: ContractAddress,
        debt_to_repay: u256,
        collateral_to_seize: u256,
    );

    /// Sets the authorized liquidator contract. Only owner.
    fn set_liquidator(ref self: TContractState, liquidator: ContractAddress);

    /// Returns the authorized liquidator contract address.
    fn get_liquidator(self: @TContractState) -> ContractAddress;
}

// ================================================================================================
// LIQUIDATOR INTERFACE
// ================================================================================================

/// Result returned from a successful liquidation.
#[derive(Drop, Serde)]
pub struct LiquidationResult {
    pub collateral_seized: u256,
    pub debt_repaid: u256,
    pub liquidator_bonus: u256,
}

/// Liquidator — anyone can call `liquidate` on positions below the health threshold.
#[starknet::interface]
pub trait ILiquidator<TContractState> {
    /// Liquidates an unhealthy position. Returns details of the liquidation.
    fn liquidate(
        ref self: TContractState, user: ContractAddress, btcusd_amount: u256,
    ) -> LiquidationResult;

    /// Returns true if the position is eligible for liquidation.
    fn is_liquidatable(self: @TContractState, user: ContractAddress) -> bool;

    /// Calculates (collateral_seized, debt_repaid, liquidator_bonus) without executing.
    fn calculate_liquidation(
        self: @TContractState, user: ContractAddress, btcusd_amount: u256,
    ) -> (u256, u256, u256);

    /// Returns the liquidation penalty in basis points (e.g. 1000 = 10%).
    fn get_liquidation_penalty(self: @TContractState) -> u256;

    /// Returns the liquidator reward in basis points (e.g. 500 = 5%).
    fn get_liquidator_reward(self: @TContractState) -> u256;

    /// Returns the max fraction of a position that can be liquidated at once (basis points).
    fn get_close_factor(self: @TContractState) -> u256;

    /// Returns the vault contract address.
    fn get_vault(self: @TContractState) -> ContractAddress;

    /// Returns the BTSUSD token contract address.
    fn get_btcusd_token(self: @TContractState) -> ContractAddress;
}

/// Admin functions for liquidator configuration.
#[starknet::interface]
pub trait ILiquidatorAdmin<TContractState> {
    fn set_liquidation_penalty(ref self: TContractState, penalty_bps: u256);
    fn set_liquidator_reward(ref self: TContractState, reward_bps: u256);
    fn set_close_factor(ref self: TContractState, close_factor_bps: u256);
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
}

// ================================================================================================
// YIELD MANAGER INTERFACE
// ================================================================================================

/// Yield Manager — routes vault collateral to an external yield source (Vesu).
#[starknet::interface]
pub trait IYieldManager<TContractState> {
    // --- Vault-Only ---

    /// Records a collateral deposit for `user`. Only callable by vault.
    fn deposit(ref self: TContractState, user: ContractAddress, amount: u256);

    /// Records a collateral withdrawal for `user`. Only callable by vault.
    fn withdraw(ref self: TContractState, user: ContractAddress, amount: u256);

    // --- Yield Operations ---

    /// Harvests yield for `user` and sends their share after protocol fee. Returns amount claimed.
    fn harvest_yield(ref self: TContractState, user: ContractAddress) -> u256;

    /// Batch yield harvest, typically called by a keeper.
    fn harvest_all(ref self: TContractState);

    // --- View ---

    /// Returns total wBTC deposited by `user`.
    fn get_user_deposit(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns accrued yield for `user` before fees.
    fn get_user_yield(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns total wBTC under management.
    fn get_total_deposits(self: @TContractState) -> u256;

    /// Returns total accumulated yield before distribution.
    fn get_total_yield(self: @TContractState) -> u256;

    /// Returns the current yield rate in basis points per year (e.g. 800 = 8% APY).
    fn get_yield_rate(self: @TContractState) -> u256;

    /// Returns (user_share_bps, protocol_share_bps).
    fn get_fee_config(self: @TContractState) -> (u256, u256);

    // --- Admin ---

    /// Sets the vault address. Only owner.
    fn set_vault(ref self: TContractState, vault: ContractAddress);

    /// Sets the yield rate (mock only). Only owner.
    fn set_yield_rate(ref self: TContractState, rate: u256);

    /// Sets fee split. `user_share + protocol_share` must equal 10000. Only owner.
    fn set_fee_config(ref self: TContractState, user_share: u256, protocol_share: u256);

    /// Withdraws all funds back to vault in an emergency. Only owner.
    fn emergency_withdraw(ref self: TContractState);
}

// ================================================================================================
// PRICE ORACLE INTERFACE
// ================================================================================================

/// Price oracle — provides BTC/USD price data for collateral valuation.
#[starknet::interface]
pub trait IPriceOracle<TContractState> {
    /// Returns (price, timestamp). Price has 8 decimals (e.g. 65000_00000000 = $65,000).
    fn get_btc_price(self: @TContractState) -> (u256, u64);

    /// Returns true if the price is older than the allowed maximum age.
    fn is_price_stale(self: @TContractState) -> bool;

    /// Returns the maximum allowed price age in seconds.
    fn get_max_price_age(self: @TContractState) -> u64;
}

/// Mock oracle — extends IPriceOracle with price-setting for testing.
#[starknet::interface]
pub trait IMockOracle<TContractState> {
    fn set_btc_price(ref self: TContractState, price: u256);
    fn set_max_price_age(ref self: TContractState, max_age: u64);
}

// ================================================================================================
// VESU PROTOCOL TYPES & INTERFACE
// ================================================================================================

/// Specifies whether an amount is an incremental change or an absolute target.
#[derive(PartialEq, Copy, Drop, Serde, Default)]
pub enum AmountType {
    #[default]
    Delta,
    Target,
}

/// Specifies whether an amount is expressed in raw token units or asset value.
#[derive(PartialEq, Copy, Drop, Serde, Default)]
pub enum AmountDenomination {
    #[default]
    Native,
    Assets,
}

/// Signed amount used when modifying a Vesu position.
#[derive(PartialEq, Copy, Drop, Serde, Default)]
pub struct Amount {
    pub amount_type: AmountType,
    pub denomination: AmountDenomination,
    /// Signed value: negative = withdraw/repay, positive = deposit/borrow.
    pub value: i257,
}

/// A user's position in a Vesu pool.
#[derive(PartialEq, Copy, Drop, Serde)]
pub struct VesuPosition {
    pub collateral_shares: u256,
    pub nominal_debt: u256,
}

/// On-chain asset configuration returned by Vesu.
#[derive(PartialEq, Copy, Drop, Serde)]
pub struct AssetConfig {
    pub total_collateral_shares: u256,
    pub total_nominal_debt: u256,
    pub reserve: u256,
    pub max_utilization: u256,
    pub floor: u256,
    pub scale: u256,
    pub is_legacy: bool,
    pub last_updated: u64,
    pub last_rate_accumulator: u256,
    pub last_full_utilization_rate: u256,
    pub fee_rate: u256,
}

/// Parameters passed to `modify_position`.
#[derive(PartialEq, Copy, Drop, Serde)]
pub struct ModifyPositionParams {
    pub pool_id: felt252,
    pub collateral_asset: ContractAddress,
    pub debt_asset: ContractAddress,
    pub user: ContractAddress,
    pub collateral: Amount,
    pub debt: Amount,
    pub data: Span<felt252>,
}

/// Response returned from `modify_position`.
#[derive(PartialEq, Copy, Drop, Serde)]
pub struct UpdatePositionResponse {
    pub collateral_delta: i257,
    pub collateral_shares_delta: i257,
    pub debt_delta: i257,
    pub nominal_debt_delta: i257,
    pub bad_debt: u256,
}

/// Vesu Singleton — minimal interface for supply-only (no borrow) yield operations.
#[starknet::interface]
pub trait IVesuSingleton<TContractState> {
    /// Returns the current position (updates accumulators as a side-effect).
    fn position(
        ref self: TContractState,
        pool_id: felt252,
        collateral_asset: ContractAddress,
        debt_asset: ContractAddress,
        user: ContractAddress,
    ) -> (VesuPosition, u256, u256);

    /// Returns the current position without updating state (view-safe).
    fn position_unsafe(
        self: @TContractState,
        pool_id: felt252,
        collateral_asset: ContractAddress,
        debt_asset: ContractAddress,
        user: ContractAddress,
    ) -> (VesuPosition, u256, u256);

    /// Returns the asset configuration (updates accumulators as a side-effect).
    fn asset_config(
        ref self: TContractState, pool_id: felt252, asset: ContractAddress,
    ) -> (AssetConfig, u256);

    /// Returns the asset configuration without updating state (view-safe).
    fn asset_config_unsafe(
        self: @TContractState, pool_id: felt252, asset: ContractAddress,
    ) -> (AssetConfig, u256);

    /// Returns the rate accumulator (updates state as a side-effect).
    fn rate_accumulator(ref self: TContractState, pool_id: felt252, asset: ContractAddress) -> u256;

    /// Returns the rate accumulator without updating state (view-safe).
    fn rate_accumulator_unsafe(
        self: @TContractState, pool_id: felt252, asset: ContractAddress,
    ) -> u256;

    /// Deposits or withdraws collateral / borrows or repays debt.
    fn modify_position(
        ref self: TContractState, params: ModifyPositionParams,
    ) -> UpdatePositionResponse;

    /// Returns the current utilization ratio without updating state (view-safe).
    fn utilization_unsafe(
        self: @TContractState, pool_id: felt252, asset: ContractAddress,
    ) -> u256;

    /// Converts collateral shares to a token amount without updating state.
    fn calculate_collateral_unsafe(
        self: @TContractState,
        pool_id: felt252,
        asset: ContractAddress,
        collateral_shares: i257,
    ) -> u256;
}
