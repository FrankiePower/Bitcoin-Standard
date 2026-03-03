pub mod btcusd_token;
pub mod cdp_core;
// pub mod pragma_oracle; // Requires pragma_lib, which currently conflicts with our
// openzeppelin_security dependency
/// BTCStandard Protocol
///
/// Native Bitcoin CDP on Starknet. Real BTC locked in OP_CAT Taproot vaults on Bitcoin;
/// debt tracked on Starknet; oracle bridge via Chainlink CRE.
///
/// ## Architecture
///
/// ```
/// Bitcoin (OP_CAT vault) → register txid → VaultRegistry
///                                                ↓
///                                           CDPCore → BTCUSDToken (mint/burn)
///                                                ↓
///                               Chainlink CRE (price feed + liquidation oracle)
///
/// Savings (Phase 1 — deployed):
///   wBTC/STRK → BTSSavingsVault (ERC4626) → share tokens
///                    ↑
///           BTSSavingsFactory (registry)
/// ```
///
/// ## Modules
///
/// - `interfaces`       : All contract interfaces and shared types
/// - `btcusd_token`     : BTCUSD stablecoin ERC20 (minted against BTC collateral)
/// - `vault_registry`   : Maps Bitcoin txid → vault owner + amount + state
/// - `cdp_core`         : Debt tracking, health factor, oracle-triggered liquidation
/// - `mock_oracle`      : Mock BTC/USD price oracle for testing
/// - `pragma_oracle`    : Pragma Oracle adapter for production
/// - `savings`          : ERC4626 savings vaults + factory (Phase 1, deployed)

pub mod interfaces;
pub mod mock_oracle;
pub mod savings;
pub mod vault_registry;
