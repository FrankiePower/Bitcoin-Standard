# Pragma Oracle Integration Guide

This document provides a structured guide to integrating Pragma Oracle feeds into Starknet smart contracts. It covers basic price feeds, computational feeds (TWAP, Volatility), and architecture.

## 1. Setup & Installation

Add Pragma as a dependency to your `scarb`/`snforge` project:
```bash
scarb add pragma_lib --git https://github.com/astraly-labs/pragma-lib
```

## 2. Addresses & Identifiers

### Contract Addresses
| Network | Contract Name | Address | Explorer |
|---------|---------------|---------|----------|
| **Starknet Mainnet** | Oracle | `0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b` | Starkscan / Voyager |
| **Starknet Sepolia** | Oracle | `0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a` | Starkscan / Voyager |
| **Mainnet** | Realized Volatility / TWAP | `0x49eefafae944d07744d07cc72a5bf14728a6fb463c3eae5bca13552f5d455fd` | Starkscan |
| **General** | Summary Stats | `0x6421fdd068d0dc56b7f5edc956833ca0ba66b2d5f9a8fea40932f226668b5c4` | (Used in code examples) |

### Key Asset Identifiers (Pair IDs)
These are `felt252` representations of utf-8 encoded strings (e.g. `str_to_felt("BTC/USD")`). By default, these return with 8 decimals.
- **BTC/USD**: `18669995996566340` (Risk: Low)
- **ETH/USD**: `19514442401534788` (Risk: Low)
- **WBTC/USD**: `6287680677296296772` (Risk: Moderate)
- **STRK/USD**: `6004514686061859652` (Risk: Low)

## 3. Core Concepts

### Time-Weighted Average Price (TWAP)
A computational feed that averages the price of an asset over a specific period of time. This helps mitigate the risk of short-term price manipulation (like flash loan attacks or quick market crashes) by smoothing out anomalous data points.

### Liquid Staking & Conversion Rates
For liquid staking tokens (like wstETH, xSTRK) or liquid restaking tokens, liquidity is often poorer compared to the base asset. Rather than using standard spot market prices which can be easily manipulated due to low liquidity, it is safer to use specialized feeds that automatically calculate the Conversion Rate based on the underlying yield-bearing ERC4626 vault.

### Realized Volatility
Calculates the historical annualized volatility of an asset over a period of time using the Geometric Brownian Motion assumption. Useful for dynamic risk management, adjusting collateral parameters, or position sizing.

## 4. Usage Patterns

### A. Basic Spot Price (Median)
Retrieves the median price from the Oracle dispatcher.

```cairo
use starknet::ContractAddress;
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{DataType, AggregationMode, PragmaPricesResponse};

fn get_asset_price_median(oracle_address: ContractAddress, asset_id: felt252) -> u128 {
    let oracle_dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = oracle_dispatcher.get_data_median(DataType::SpotEntry(asset_id));
    return output.price; // Usually 8 decimals
}
```

### B. Time-Weighted Average Price (TWAP)
Fetches the TWAP over a specified duration using the Summary Stats contract.

```cairo
use starknet::{ContractAddress, get_block_timestamp};
use pragma_lib::abi::{ISummaryStatsABIDispatcher, ISummaryStatsABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType};

fn compute_twap(summary_stats_address: ContractAddress, data_type: DataType, aggregation_mode: AggregationMode) -> u128 {
    let start_time = 1691315416; // Defined start timestamp
    let end_tick = get_block_timestamp();
    let time = end_tick - start_time;
    
    let summary_dispatcher = ISummaryStatsABIDispatcher { contract_address: summary_stats_address };
    let (twap, _decimals) = summary_dispatcher.calculate_twap(
        data_type,
        aggregation_mode,
        time, // duration
        start_time, // beginning of the twap
    );
    return twap;
}
```

### C. Realized Volatility
Calculates annualized historical volatility. Can be used for dynamic risk models.

```cairo
use starknet::{ContractAddress, get_block_timestamp};
use pragma_lib::abi::{ISummaryStatsABIDispatcher, ISummaryStatsABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType};

fn compute_volatility(summary_stats_address: ContractAddress, data_type: DataType, aggregation_mode: AggregationMode) -> u128 {
    // Look back 1 week
    let start_tick = get_block_timestamp() - 604800; 
    let end_tick = get_block_timestamp();
    let num_samples = 200; // Max allowed by Starknet constraints
    
    let summary_dispatcher = ISummaryStatsABIDispatcher { contract_address: summary_stats_address };
    let (volatility, _decimals) = summary_dispatcher.calculate_volatility(
        data_type, 
        start_tick, 
        end_tick, 
        num_samples, 
        aggregation_mode
    );
    return volatility;
}
```

## 5. Technical API Reference

- **Types:**
  - `DataType::SpotEntry(felt252)`
  - `DataType::FutureEntry((felt252, u64))`
  - `AggregationMode::Median(())`, `AggregationMode::Mean(())`, `AggregationMode::ConversionRate`

- **Important Functions:**
  - `get_data_median`: Simplest robust aggregation.
  - `get_data_median_for_sources`: Aggregate median filtered by specific sources.
  - `get_data_with_USD_hop`: Rebase prices (e.g. BTC/ETH via BTC/USD and ETH/USD).
  - `calculate_twap`: Fetch time-weighted average price.
  - `calculate_volatility`: Fetch annualized volatility.

## 6. Risk Mitigation Best Practices
1. **Back-testing**: Thoroughly test your integration using Pragma’s historical data.
2. **Multiple Data Sources**: Use `get_data_median_for_sources` to enforce fetching from specifically trusted sources.
3. **Circuit Breakers**: Implement failsafes to halt CDP operations if oracle prices deviate significantly from expectations or become stale (`last_updated_timestamp` check).