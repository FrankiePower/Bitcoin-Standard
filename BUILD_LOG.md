# Bitcoin Standard Protocol - Complete Build Log

**Last Updated:** 2026-03-02

---

## Session 3 — 2026-03-02: standard_vault Rust complete (OP_CAT vault)

### Architecture pivot summary
Migrated from wBTC-on-Starknet CDP → native Bitcoin OP_CAT vault + Starknet debt ledger + Chainlink CRE oracle bridge. See `CDP_EVALUATION.md` for full rationale.

### Files written

| File | Status | Notes |
|------|--------|-------|
| `standard_vault/src/vault/script.rs` | ✅ Rewritten | 3 new Tapscript leaves |
| `standard_vault/src/vault/contract.rs` | ✅ Rewritten | New VaultCovenant struct + tx builders |
| `standard_vault/src/main.rs` | ✅ Rewritten | New CLI actions |
| `standard_vault/Cargo.toml` | ✅ Updated | Renamed purrfect_vault → standard_vault |
| `standard_vault/src/vault/signature_building.rs` | 🔒 Untouched | Do not modify |
| `standard_vault/src/wallet.rs` | 🔒 Untouched | Do not modify |

### Three Tapscript leaves

**Leaf A — `vault_repay(user_key, oracle_key)`**
- 2-of-2: oracle CHECKSIGVERIFY → user CHECKSIG
- No OP_CAT. Both Schnorr sigs commit to same tx outputs.
- CRE signs when debt is cleared on Starknet. User chooses destination.
- Witness: `[oracle_sig, user_sig, script, control_block]`

**Leaf B — `vault_liquidate(oracle_key, liq_pool_spk)`**
- Oracle CHECKSIGVERIFY + OP_CAT covenant
- `liq_pool_spk` is `push_slice`'d into the script itself — hardcoded, not from witness
- Script reconstructs sighash preimage via OP_CAT; compares against oracle's actual Schnorr sig
- **Security property: even a fully compromised oracle cannot redirect BTC to any other address**
- Witness: `[sigcomps..., vault_amount, vault_spk, fee_amount, fee_spk, sig63, last_byte, last_byte+1, oracle_sig, script, control_block]`
- Key change from purrfect_vault cancel_withdrawal: replaced `OP_2DUP` + 4×TOALTSTACK with `TOALTSTACK, DUP, TOALTSTACK, push_slice(liq_pool_spk), TOALTSTACK, TOALTSTACK`

**Leaf C — `vault_emergency_timeout(user_key, timelock)`**
- CSV + user CHECKSIG. No OP_CAT.
- After 20 blocks, user recovers BTC unilaterally. Safety valve vs oracle liveness failures.
- Witness: `[user_sig, script, control_block]`

### New VaultCovenant struct
```
user_keypair         — user's Schnorr key (Leaf A + C)
oracle_keypair       — oracle key (Chainlink CRE holds private key in prod)
liquidation_pool_address — where liquidated BTC goes (hardcoded in Leaf B script)
timelock_in_blocks   — CSV timelock for Leaf C (default: 20)
```

### CLI commands
```
just deposit            → fund vault, print oracle pubkey for CRE
just repay <addr>       → oracle + user sign, BTC returned
just liquidate          → oracle-only, OP_CAT covenant enforces liquidation pool
just timeout <addr>     → user-only after CSV timelock
just status             → show vault state + oracle pubkey
```

### Build result
```
cargo build → Finished dev profile, 0 errors, 2 warnings (dead code in untouched original files)
```

### What's next
1. `just bootstrap` → test all 3 spending paths on regtest
2. Write Starknet Cairo: VaultRegistry + CDPCore + BTCUSDToken
3. Build Chainlink CRE workflow

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Smart Contracts](#smart-contracts)
3. [Frontend Components](#frontend-components)
4. [Hooks & State Management](#hooks--state-management)
5. [Pages & UI](#pages--ui)
6. [Deployed Contracts](#deployed-contracts)
7. [Configuration](#configuration)

---

## Project Overview

Bitcoin Standard Protocol is a Bitcoin-backed DeFi protocol on Starknet with two main systems:

1. **CDP/Stablecoin System** - Deposit wBTC as collateral, borrow BTSUSD stablecoin
2. **Savings System** - Earn yield on wBTC through ERC-4626 vaults with Spark-style rate accumulation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bitcoin Standard Protocol                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CDP SYSTEM                                                  │
│  ──────────                                                  │
│  wBTC ──► BTSUSDVault ──► BTSUSD (stablecoin)               │
│              │                                               │
│              ├── MockOracle (BTC price feed)                │
│              ├── MockYieldManager (yield on collateral)     │
│              └── Liquidator (liquidation engine)            │
│                                                              │
│  SAVINGS SYSTEM                                              │
│  ─────────────                                               │
│  wBTC ──► BTSSavingsVault ──► sWBTC (share tokens)          │
│              │                                               │
│              └── chi/rho/vsr rate accumulation (~4% APY)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

### Core CDP Contracts

#### 1. BTSUSDVault (`packages/snfoundry/contracts/src/btsusd_vault.cairo`)
**Purpose:** Core CDP engine for collateral management and stablecoin minting

**Key Features:**
- Deposit wBTC as collateral
- Mint BTSUSD against collateral (up to 66.67% LTV)
- Withdraw collateral (maintains 150% min ratio)
- Burn BTSUSD to reduce debt
- Combined operations: `deposit_and_mint`, `repay_and_withdraw`

**Key Parameters:**
- `MIN_COLLATERAL_RATIO`: 150% (15000 basis points)
- `LIQUIDATION_THRESHOLD`: 120% (12000 basis points)
- `MAX_LTV`: 66.67% (6667 basis points)
- `WBTC_DECIMALS`: 1e8
- `BTSUSD_DECIMALS`: 1e18

**Key Functions:**
| Function | Description |
|----------|-------------|
| `deposit_collateral(amount)` | Deposit wBTC as collateral |
| `withdraw_collateral(amount)` | Withdraw collateral (health check) |
| `mint_BTSUSD(amount)` | Mint stablecoin against collateral |
| `burn_BTSUSD(amount)` | Repay debt |
| `deposit_and_mint(amount)` | Deposit + mint max BTSUSD |
| `repay_and_withdraw(amount)` | Repay + withdraw proportional collateral |
| `get_position(user)` | Get user's collateral, debt, last_update |
| `get_collateral_ratio(user)` | Get current collateral ratio |
| `get_health_factor(user)` | Alias for collateral ratio |
| `is_liquidatable(user)` | Check if position can be liquidated |
| `get_max_mintable(user)` | Max BTSUSD user can mint |
| `get_max_withdrawable(user)` | Max collateral user can withdraw |
| `get_protocol_stats()` | Total collateral and debt |
| `get_btc_price()` | Current BTC price from oracle |

#### 2. BTSUSDToken (`packages/snfoundry/contracts/src/btsusd_token.cairo`)
**Purpose:** ERC-20 stablecoin with vault-only mint/burn

**Key Features:**
- Standard ERC-20 (name: "Bitcoin USD Stablecoin", symbol: "BTSUSD")
- 18 decimals
- Only vault can mint/burn
- Pausable by owner
- Vault address updatable by owner

**Key Functions:**
| Function | Description |
|----------|-------------|
| `mint(to, amount)` | Mint tokens (vault only) |
| `burn(from, amount)` | Burn tokens (vault only) |
| `set_vault(new_vault)` | Update vault address (owner only) |
| `get_vault()` | Get current vault address |
| `pause()` / `unpause()` | Emergency pause (owner only) |

#### 3. MockOracle (`packages/snfoundry/contracts/src/btsusd_oracle.cairo`)
**Purpose:** Mock BTC/USD price feed for testing

**Key Features:**
- Returns $65,000 BTC price (8 decimals)
- Tracks price freshness
- Owner can update price

**Key Functions:**
| Function | Description |
|----------|-------------|
| `get_btc_price()` | Returns (price, timestamp) |
| `is_price_stale()` | Check if price is stale |
| `set_btc_price(price)` | Update price (owner only) |

#### 4. Liquidator (`packages/snfoundry/contracts/src/liquidator.cairo`)
**Purpose:** Liquidation engine for undercollateralized positions

**Key Features:**
- Liquidates positions below 120% health factor
- 10% liquidation penalty
- 5% liquidator reward
- 50% close factor (max liquidation per tx)

**Key Functions:**
| Function | Description |
|----------|-------------|
| `liquidate(user, amount)` | Liquidate user's position |
| `is_liquidatable(user)` | Check if position can be liquidated |
| `calculate_liquidation(user, amount)` | Preview liquidation outcome |
| `get_liquidation_penalty()` | Get penalty in basis points |
| `get_liquidator_reward()` | Get reward in basis points |
| `get_close_factor()` | Get max liquidation percentage |

#### 5. MockYieldManager (`packages/snfoundry/contracts/src/mock_yield_manager.cairo`)
**Purpose:** Mock yield manager for collateral (Stage 1 testing)

**Key Features:**
- Tracks user deposits from vault
- Simulates 8% APY yield
- 70% user / 30% protocol fee split

**Key Functions:**
| Function | Description |
|----------|-------------|
| `deposit(user, amount)` | Track deposit (vault only) |
| `withdraw(user, amount)` | Track withdrawal (vault only) |
| `harvest_yield(user)` | Claim accrued yield |
| `get_user_deposit(user)` | Get user's deposited amount |
| `get_user_yield(user)` | Get user's accrued yield |

### Savings Contracts

#### 6. BTSSavingsVault (`packages/snfoundry/contracts/src/savings/savings_vault.cairo`)
**Purpose:** ERC-4626 yield-bearing vault with Spark-style rate accumulation

**Key Features:**
- ERC-4626 compliant vault
- Spark/MakerDAO chi/rho/vsr rate mechanism
- ~4% APY (configurable VSR)
- Deposit cap support
- Pausable

**Key Parameters:**
- `RAY`: 1e27 (precision for chi/vsr)
- `VSR`: 1000000001243680656318820312 (~4% APY)
- Decimals: 8 (matching wBTC)

**Key Functions:**
| Function | Description |
|----------|-------------|
| `deposit(assets, receiver)` | Deposit assets, receive shares |
| `withdraw(assets, receiver, owner)` | Withdraw assets by burning shares |
| `redeem(shares, receiver, owner)` | Redeem shares for assets |
| `convert_to_shares(assets)` | Preview shares for asset amount |
| `convert_to_assets(shares)` | Preview assets for share amount |
| `now_chi()` | Get current chi (rate accumulator) |
| `get_vsr()` | Get vault savings rate |
| `get_vault_stats()` | Get comprehensive vault stats |
| `set_vsr(new_vsr)` | Update savings rate (owner only) |

#### 7. BTSSavingsFactory (`packages/snfoundry/contracts/src/savings/savings_factory.cairo`)
**Purpose:** Registry for multiple savings vaults

**Key Functions:**
| Function | Description |
|----------|-------------|
| `create_vault(asset, name, symbol, vsr)` | Deploy new vault |
| `get_vault(asset)` | Get vault for asset |
| `get_all_vaults()` | List all registered vaults |

### Mock Contracts

#### 8. MockWBTC (`packages/snfoundry/contracts/src/mock_wbtc.cairo`)
**Purpose:** Test ERC-20 wBTC token

**Key Features:**
- Standard ERC-20 (name: "Wrapped Bitcoin", symbol: "WBTC")
- 8 decimals
- Public mint function (for testing)

---

## Frontend Components

### Layout Components

#### DashboardLayout (`packages/nextjs/components/layout/dashboard-layout.tsx`)
- Main dashboard wrapper with sidebar navigation
- Responsive design with mobile support

#### Navbar (`packages/nextjs/components/layout/navbar.tsx`)
- Top navigation bar
- Wallet connect button
- Network indicator

### Feature Components

#### FaucetModal (`packages/nextjs/components/FaucetModal.tsx`)
- Modal for minting test wBTC tokens
- Mints 1000 wBTC per request
- Shows transaction status

---

## Hooks & State Management

### CDP Hook

#### useCDP (`packages/nextjs/hooks/useCDP.ts`)
**Purpose:** Complete state management for CDP operations

**State Provided:**
```typescript
{
  // Connection
  isConnected: boolean
  address: string
  isVaultDeployed: boolean

  // Protocol Stats
  totalCollateral: bigint
  totalDebt: bigint
  btcPrice: bigint
  btcPriceUSD: number

  // User Position
  position: { collateral: bigint, debt: bigint, lastUpdate: bigint }
  collateralRatio: bigint
  healthStatus: "healthy" | "warning" | "danger" | "none"
  isLiquidatable: boolean
  maxMintable: bigint
  maxWithdrawable: bigint
  collateralValueUSD: number

  // Balances
  wbtcBalance: bigint
  btsusdBalance: bigint

  // Actions
  depositCollateral(amount): Promise<void>
  withdrawCollateral(amount): Promise<void>
  mintBTSUSD(amount): Promise<void>
  burnBTSUSD(amount): Promise<void>
  depositAndMint(amount): Promise<void>
  repayAndWithdraw(amount): Promise<void>

  // Loading States
  isDepositingCollateral: boolean
  isWithdrawingCollateral: boolean
  isMintingBTSUSD: boolean
  isBurningBTSUSD: boolean
}
```

**Helper Functions:**
- `formatWBTC(amount, decimals)` - Format wBTC amounts
- `formatBTSUSD(amount, decimals)` - Format BTSUSD amounts
- `formatRatio(ratio)` - Format collateral ratio as percentage
- `getHealthStatus(ratio)` - Get health status from ratio

### Savings Hook

#### useSavingsVault (`packages/nextjs/hooks/useSavingsVault.ts`)
**Purpose:** State management for savings vault operations

**State Provided:**
```typescript
{
  // Vault Stats
  totalAssets: bigint
  totalShares: bigint
  vsr: bigint
  apy: number
  depositorCount: number
  currentChi: bigint

  // User Position
  userAssets: bigint
  userShares: bigint
  maxDeposit: bigint
  maxWithdraw: bigint
  wbtcBalance: bigint

  // Actions
  deposit(assets, receiver): Promise<void>
  withdraw(assets, receiver, owner): Promise<void>
  redeem(shares, receiver, owner): Promise<void>
}
```

**Helper Functions:**
- `vsrToApy(vsr)` - Convert VSR to APY percentage
- `formatTokenAmount(amount, decimals)` - Format token amounts

### Test Tokens Hook

#### useTestTokens (`packages/nextjs/hooks/useTestTokens.ts`)
**Purpose:** Mint test tokens from faucet

**Features:**
- Mints 1000 wBTC to connected wallet
- Uses MockWBTC contract

---

## Pages & UI

### 1. Landing Page (`packages/nextjs/app/page.tsx`)
- Hero section with protocol introduction
- Feature highlights
- Call-to-action buttons

### 2. Dashboard Page (`packages/nextjs/app/dashboard/page.tsx`)
**Purpose:** Savings vault interface

**Features:**
- Vault stats display (TVL, APY, depositors)
- User position summary
- Deposit modal with wBTC approval
- Withdraw functionality
- Faucet button for test tokens
- Real-time data from deployed contracts

**UI Components:**
- Stats cards (Total Assets, APY, Depositors)
- Position card (Your Shares, Your Assets)
- Deposit/Withdraw forms
- wBTC balance display

### 3. Borrow Page (`packages/nextjs/app/borrow/page.tsx`)
**Purpose:** CDP management interface

**Features:**
- Deposit/Withdraw collateral tabs
- Borrow/Repay BTSUSD tabs
- LTV visualization bar with zones (Conservative/Moderate/Aggressive/Liquidation)
- Health status indicators (color-coded)
- Position summary card
- Protocol stats panel
- BTC price display
- Liquidation warnings

**UI Components:**
- Collateral input with MAX button
- BTSUSD borrow input with MAX button
- LTV progress bar
- Health status badge
- Position details grid
- Action buttons (Deposit/Withdraw/Borrow/Repay)

### 4. Debug Page (`packages/nextjs/app/debug/page.tsx`)
- Contract interaction debugger (scaffold-stark default)

---

## Deployed Contracts

### Sepolia Testnet

| Contract | Address | Class Hash |
|----------|---------|------------|
| MockWBTC | `0x0455bfec3f128001fd0fc6c7c243a5a446d93aa813a6d76d1a26002f27093fa0` | `0x467ff1f...` |
| BTSSavingsVault | `0x01286e3af345995555c0248f6ab32c3a10ac1a882343730de9400ea07f1714c0` | `0x37727037...` |
| MockOracle | `0x03d86bc966d124fce2c7fdec8ccbb5af4e429ecafa7e97b84b14b98812d5ab6e` | `0x194b5fe8...` |
| BTSUSDToken | `0x065b99291375dd031316a50f44718ba6f7582802cbae093f9327e1dd1ddc94ce` | `0x2f582e62...` |
| MockYieldManager | `0x0478fbd0abaa32a8fe551ef1699dea2c64e61e837ad7092ebee383ce58d2dbdf` | `0x2d19203a...` |
| BTSUSDVault | `0x071d1fb34337cb55478cc2784bbc9aa905eae7d670f4267f60dc0c9ee2ac0040` | `0x4c22a8dd...` |
| Liquidator | `0x02fc386dc1b2642510048dc42428aef88a3c4a5b8660ce6c41f98263eb07670f` | `0x1d62f601...` |

---

## Configuration

### Scaffold Config (`packages/nextjs/scaffold.config.ts`)
- Target network: Sepolia
- Polling interval: 30000ms

### Contract ABIs (`packages/nextjs/contracts/deployedContracts.ts`)
- Contains ABIs for all deployed contracts
- Addresses mapped by network (devnet, sepolia)

### Snfoundry Config (`packages/snfoundry/contracts/snfoundry.toml`)
- Scarb build settings
- Test configuration

### Environment (`packages/snfoundry/.env`)
- Sepolia account credentials
- RPC endpoints

---

## Test Coverage

### Unit Tests (43 passing)
- `test_savings_vault.cairo` - Vault deposit/withdraw/redeem tests
- `test_savings_factory.cairo` - Factory creation/registry tests

---

## Quick Start Commands

```bash
# Build contracts
cd packages/snfoundry/contracts && scarb build

# Run tests
cd packages/snfoundry/contracts && snforge test

# Deploy contract
sncast --account=sepolia declare --contract-name=<NAME> --network=sepolia
sncast --account=sepolia deploy --class-hash <HASH> --arguments '<ARGS>' --network sepolia

# Start frontend
cd packages/nextjs && yarn dev
```

---

## Files Created/Modified

### Contracts
- `packages/snfoundry/contracts/src/btsusd_vault.cairo`
- `packages/snfoundry/contracts/src/btsusd_token.cairo`
- `packages/snfoundry/contracts/src/btsusd_oracle.cairo`
- `packages/snfoundry/contracts/src/liquidator.cairo`
- `packages/snfoundry/contracts/src/mock_yield_manager.cairo`
- `packages/snfoundry/contracts/src/mock_wbtc.cairo`
- `packages/snfoundry/contracts/src/savings/savings_vault.cairo`
- `packages/snfoundry/contracts/src/savings/savings_factory.cairo`
- `packages/snfoundry/contracts/src/savings/interfaces.cairo`

### Frontend
- `packages/nextjs/hooks/useCDP.ts`
- `packages/nextjs/hooks/useSavingsVault.ts`
- `packages/nextjs/hooks/useTestTokens.ts`
- `packages/nextjs/components/FaucetModal.tsx`
- `packages/nextjs/app/dashboard/page.tsx`
- `packages/nextjs/app/borrow/page.tsx`
- `packages/nextjs/contracts/deployedContracts.ts`
- `packages/nextjs/scaffold.config.ts`

### Documentation
- `TODO.md`
- `PROGRESS.md`
- `BUILD_LOG.md`
