/// Savings Module Interfaces
///
/// ERC4626-inspired savings vault interfaces for the Bitcoin Standard Protocol.
/// Based on Spark Vaults V2 architecture with continuous rate accumulation.

use starknet::ContractAddress;

// ================================================================================================
// SAVINGS VAULT INTERFACE
// ================================================================================================

/// Vault configuration returned by the factory.
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct VaultInfo {
    /// Address of the deployed vault
    pub vault_address: ContractAddress,
    /// Underlying asset (wBTC, BTSUSD, STRK, etc.)
    pub asset: ContractAddress,
    /// Current vault savings rate (ray, 1e27 = 1.0)
    pub vsr: u256,
    /// Whether the vault is active
    pub active: bool,
}

/// Stats snapshot for dashboard display.
#[derive(Drop, Copy, Serde)]
pub struct VaultStats {
    /// Total underlying assets (accounting value, not balance)
    pub total_assets: u256,
    /// Total share tokens outstanding
    pub total_shares: u256,
    /// Current conversion rate (chi) — ray precision
    pub chi: u256,
    /// Vault savings rate — ray precision
    pub vsr: u256,
    /// Idle liquidity sitting in the vault
    pub idle_assets: u256,
    /// Assets deployed externally (total_assets - idle)
    pub assets_outstanding: u256,
    /// Number of unique depositors
    pub depositor_count: u256,
    /// Maximum deposit cap (0 = unlimited)
    pub deposit_cap: u256,
}

/// IBTSSavingsVault — ERC4626-like yield-bearing savings vault.
///
/// Implements continuous rate accumulation via `chi/rho/vsr` pattern
/// inspired by Spark Vaults V2 / MakerDAO sUSDS.
#[starknet::interface]
pub trait IBTSSavingsVault<TContractState> {
    // ── ERC4626 Core ────────────────────────────────────────────────

    /// Returns the address of the underlying asset token.
    fn asset(self: @TContractState) -> ContractAddress;

    /// Returns the total amount of underlying assets managed by the vault.
    /// This is an accounting value: totalShares * nowChi() / RAY.
    fn total_assets(self: @TContractState) -> u256;

    /// Deposits `assets` of underlying token and mints shares to `receiver`.
    /// Returns: number of shares minted.
    fn deposit(ref self: TContractState, assets: u256, receiver: ContractAddress) -> u256;

    /// Withdraws `assets` of underlying to `receiver` by burning shares from `owner`.
    /// Returns: number of shares burned.
    fn withdraw(
        ref self: TContractState,
        assets: u256,
        receiver: ContractAddress,
        owner: ContractAddress,
    ) -> u256;

    /// Mints exactly `shares` share tokens to `receiver` by depositing underlying.
    /// Returns: amount of underlying assets deposited.
    fn mint_shares(ref self: TContractState, shares: u256, receiver: ContractAddress) -> u256;

    /// Redeems `shares` share tokens from `owner`, sending underlying to `receiver`.
    /// Returns: amount of underlying assets sent.
    fn redeem(
        ref self: TContractState,
        shares: u256,
        receiver: ContractAddress,
        owner: ContractAddress,
    ) -> u256;

    // ── ERC4626 Accounting ──────────────────────────────────────────

    /// Converts an amount of assets to shares (at current chi).
    fn convert_to_shares(self: @TContractState, assets: u256) -> u256;

    /// Converts an amount of shares to assets (at current chi).
    fn convert_to_assets(self: @TContractState, shares: u256) -> u256;

    /// Returns the max amount of underlying that `owner` can deposit.
    fn max_deposit(self: @TContractState, owner: ContractAddress) -> u256;

    /// Returns the max shares that `owner` can mint.
    fn max_mint(self: @TContractState, owner: ContractAddress) -> u256;

    /// Returns the max underlying that `owner` can withdraw.
    fn max_withdraw(self: @TContractState, owner: ContractAddress) -> u256;

    /// Returns the max shares that `owner` can redeem.
    fn max_redeem(self: @TContractState, owner: ContractAddress) -> u256;

    /// Preview the number of shares for a given deposit amount.
    fn preview_deposit(self: @TContractState, assets: u256) -> u256;

    /// Preview the amount of assets for a given mint amount.
    fn preview_mint(self: @TContractState, shares: u256) -> u256;

    /// Preview the number of shares burned for a given withdraw amount.
    fn preview_withdraw(self: @TContractState, assets: u256) -> u256;

    /// Preview the amount of assets received for a given redeem amount.
    fn preview_redeem(self: @TContractState, shares: u256) -> u256;

    // ── Spark-style Extensions ──────────────────────────────────────

    /// Returns the current conversion rate at `block.timestamp` (ray precision).
    fn now_chi(self: @TContractState) -> u256;

    /// Returns the underlying value of `user`'s position at current timestamp.
    fn assets_of(self: @TContractState, user: ContractAddress) -> u256;

    /// Returns the value of assets not available as immediate liquidity.
    fn assets_outstanding(self: @TContractState) -> u256;

    /// Returns a full stats snapshot for dashboard display.
    fn get_vault_stats(self: @TContractState) -> VaultStats;

    /// Returns the current vault savings rate (ray).
    fn get_vsr(self: @TContractState) -> u256;

    /// Returns the timestamp of the last rate update.
    fn get_rho(self: @TContractState) -> u64;

    /// Returns the number of unique depositors.
    fn get_depositor_count(self: @TContractState) -> u256;

    // ── Admin ───────────────────────────────────────────────────────

    /// Sets the vault savings rate. Only callable by rate setter.
    fn set_vsr(ref self: TContractState, new_vsr: u256);

    /// Sets the deposit cap (0 = unlimited). Only owner.
    fn set_deposit_cap(ref self: TContractState, cap: u256);

    /// Pauses the vault. Only owner.
    fn pause(ref self: TContractState);

    /// Unpauses the vault. Only owner.
    fn unpause(ref self: TContractState);
}

// ================================================================================================
// SAVINGS FACTORY INTERFACE
// ================================================================================================

/// IBTSSavingsFactory — deploys and tracks savings vault instances.
#[starknet::interface]
pub trait IBTSSavingsFactory<TContractState> {
    /// Returns all registered vault addresses.
    fn get_all_vaults(self: @TContractState) -> Array<ContractAddress>;

    /// Returns the vault address for a given underlying asset. Zero if none.
    fn get_vault_for_asset(self: @TContractState, asset: ContractAddress) -> ContractAddress;

    /// Returns the number of deployed vaults.
    fn get_vault_count(self: @TContractState) -> u256;

    /// Returns info for a specific vault.
    fn get_vault_info(self: @TContractState, vault: ContractAddress) -> VaultInfo;

    /// Registers a vault. Only owner.
    fn register_vault(ref self: TContractState, vault: ContractAddress, asset: ContractAddress);

    /// Deactivates a vault. Only owner.
    fn deactivate_vault(ref self: TContractState, vault: ContractAddress);
}
