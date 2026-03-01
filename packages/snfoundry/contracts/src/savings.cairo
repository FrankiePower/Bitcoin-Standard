/// Savings Module
///
/// Contains the ERC4626-compliant savings vault and factory registry
/// for the Bitcoin Standard Protocol.
///
/// ## Contracts
///
/// - `savings_vault`   : BTSSavingsVault — yield-bearing vault with chi/rho/vsr rate accumulation
/// - `savings_factory` : BTSSavingsFactory — registry of all deployed vault instances
/// - `interfaces`      : Savings-specific interfaces and types

pub mod interfaces;
pub mod savings_factory;
pub mod savings_vault;
