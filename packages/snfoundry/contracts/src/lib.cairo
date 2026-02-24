/// The Bitcoin Standard Protocol
///
/// A Bitcoin-backed stablecoin protocol on Starknet.
///
/// ## Architecture
///
/// ```
/// BTC → Atomiq → wBTC → BTSUSDVault → BTSUSD
///                              ↓
///                        YieldManager → Vesu
///                              ↓
///                        Liquidator
/// ```
///
/// ## Modules
///
/// - `interfaces`: Contract interfaces and types
/// - `core`: Main protocol contracts
/// - `oracles`: Price feed implementations
/// - `liquidation`: Liquidation contracts
/// - `integrations`: External protocol adapters (Atomiq, Vesu)
/// - `mocks`: Test contracts

pub mod interfaces;
pub mod btsusd_token;
pub mod btsusd_vault;
pub mod vesu_yield_manager;
pub mod liquidator;
