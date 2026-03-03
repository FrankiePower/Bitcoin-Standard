/// BTCStandard Protocol — Shared Interfaces
///
/// Contains all contract interfaces and shared types for Phase 2
/// (native Bitcoin CDP via OP_CAT vaults).
///
/// Savings module interfaces live in savings/interfaces.cairo.

use starknet::ContractAddress;

// ================================================================================================
// ORACLE
// ================================================================================================

/// BTC/USD price oracle. In production, backed by Pragma; mock in tests.
#[starknet::interface]
pub trait IPriceOracle<TContractState> {
    /// Returns (price, timestamp). Price has 8 decimals (e.g. 50000_00000000 = $50,000).
    fn get_btc_price(self: @TContractState) -> (u256, u64);

    /// Returns true if the price is older than the allowed maximum age.
    fn is_price_stale(self: @TContractState) -> bool;

    /// Returns the maximum allowed price age in seconds.
    fn get_max_price_age(self: @TContractState) -> u64;

    /// Returns annualized realized volatility with 8 decimals (e.g. 7076538586 = 70.76%).
    fn get_btc_volatility(self: @TContractState) -> u128;
}

/// Admin interface for the mock oracle (testing only).
#[starknet::interface]
pub trait IMockOracle<TContractState> {
    fn set_btc_price(ref self: TContractState, price: u256);
    fn set_max_price_age(ref self: TContractState, max_age: u64);
    fn set_btc_volatility(ref self: TContractState, volatility: u128);
}

// ================================================================================================
// BTCUSD TOKEN
// ================================================================================================

/// BTCUSD stablecoin — ERC20 minted against native Bitcoin collateral.
/// Only CDPCore can mint and burn.
#[starknet::interface]
pub trait IBTCUSDToken<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);
    fn set_vault(ref self: TContractState, new_vault: ContractAddress);
    fn get_vault(self: @TContractState) -> ContractAddress;
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn get_paused_status(self: @TContractState) -> bool;
}

// ================================================================================================
// VAULT REGISTRY
// ================================================================================================

/// State of a native Bitcoin OP_CAT vault.
#[derive(Drop, Serde, Copy, PartialEq)]
pub enum VaultState {
    Active,
    Repaid,
    Liquidated,
}

/// On-chain record of a Bitcoin vault registered by a user.
#[derive(Drop, Serde, Copy)]
pub struct VaultInfo {
    pub owner: ContractAddress,
    /// Deposited amount in satoshis.
    pub btc_amount: u256,
    pub state: VaultState,
    pub registered_at: u64,
}

/// VaultRegistry — maps Bitcoin txid (felt252) → vault owner + amount + state.
/// txid is the first 31 bytes of the 32-byte Bitcoin deposit txid.
#[starknet::interface]
pub trait IVaultRegistry<TContractState> {
    fn register_vault(
        ref self: TContractState, txid: felt252, owner: ContractAddress, btc_amount: u256,
    );
    fn close_vault(ref self: TContractState, txid: felt252);
    fn liquidate_vault(ref self: TContractState, txid: felt252);
    fn get_vault(self: @TContractState, txid: felt252) -> VaultInfo;
    fn is_active(self: @TContractState, txid: felt252) -> bool;
    fn get_owner(self: @TContractState, txid: felt252) -> ContractAddress;
    fn get_btc_amount(self: @TContractState, txid: felt252) -> u256;
    fn get_total_vaults(self: @TContractState) -> u64;
    fn set_cdp_core(ref self: TContractState, new_cdp_core: ContractAddress);
}

// ================================================================================================
// CDP CORE
// ================================================================================================

/// CDPCore — debt tracking, health factor checks, and liquidation.
#[starknet::interface]
pub trait ICDPCore<TContractState> {
    fn register_vault(ref self: TContractState, txid: felt252, btc_amount: u256);
    fn mint_debt(ref self: TContractState, txid: felt252, amount: u256);
    fn repay_debt(ref self: TContractState, txid: felt252, amount: u256);
    fn liquidate(ref self: TContractState, txid: felt252);
    fn get_health_factor(self: @TContractState, txid: felt252) -> u256;
    fn get_position(self: @TContractState, txid: felt252) -> (u256, u256);
    fn get_protocol_stats(self: @TContractState) -> (u256, u256);
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn set_oracle(ref self: TContractState, new_oracle: ContractAddress);
}
