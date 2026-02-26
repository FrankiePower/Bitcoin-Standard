pub mod atomiq_adapter;
pub mod btsusd_oracle;
pub mod btsusd_token;
pub mod btsusd_vault;
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
/// - `interfaces`        : All contract interfaces and shared types
/// - `btsusd_token`      : BTSUSD stablecoin ERC20 token
/// - `btsusd_vault`      : Core vault — collateral management and minting
/// - `vesu_yield_manager`: Yield generation via Vesu lending protocol
/// - `liquidator`        : Undercollateralized position liquidation
/// - `btsusd_oracle`     : BTC/USD price oracle (mock + Pragma integration)
/// - `atomiq_adapter`    : Atomiq BTC ↔ wBTC bridge adapter
/// - `mock_yield_manager`: Mock yield manager for Stage 1 testing
/// - `mock_wbtc`         : Mock wBTC ERC20 for testing
/// - `mock_btc_relay`    : Mock BTC relay for testing

pub mod interfaces;
pub mod liquidator;
pub mod mock_btc_relay;
pub mod mock_wbtc;
pub mod mock_yield_manager;
pub mod vesu_yield_manager;
