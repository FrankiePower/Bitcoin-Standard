# Bitcoin Standard — Architecture

## The first CDP where collateral never leaves Bitcoin

**One-line pitch:** Lock real BTC in an OP_CAT covenant vault on Bitcoin. Track debt on Starknet. No wrapped tokens. No bridge risk. Bitcoin consensus enforces the collateral.

---

## Why This Wins

Every other BTC CDP (Uncap, Opus, etc.) uses WBTC — a bridged token. If the bridge is exploited or the contract is hacked, users lose their BTC. Their "BTC-backed" claim is only as strong as the bridge.

Bitcoin Standard eliminates that. The collateral **never leaves Bitcoin**. Starknet only holds the debt ledger. The vault covenant, enforced by Bitcoin consensus, is what makes "BTC-backed" actually mean something cryptographically.

---

## System Overview

```
User's real BTC
      │
      ▼
OP_CAT Vault (Bitcoin Regtest / Taproot UTXO)
  - 3 spending paths: repay, liquidate, timeout (CSV)
  - Covenant enforces liquidation output via OP_CAT
  - Oracle sig verified via 2-of-2 multisig (user + oracle)
      │
      ▼
Oracle Service (Node.js, custom)
  - Fetches BTC/USD price from CoinGecko
  - Computes realized volatility
  - Pushes price + volatility to MockOracle on Starknet every 5 min
  - Monitors vault health factors, signs liquidation attestations
      │
      ▼
Starknet Sepolia (debt ledger + stablecoin)
  VaultRegistry   — maps BTC txid → owner + sat amount
  CDPCore         — debt tracking, LTV, health factor, liquidation
  BTSUSDToken     — ERC-20 stablecoin, minted/burned by CDPCore
  MockOracle      — BTC price + volatility feed
  BTSSavingsVault — ERC-4626 savings vault (VSR mechanism, ~4% APY)
```

---

## Bitcoin Vault: Taproot Script Design

Three spending leaves on the vault UTXO (`standard_vault` Rust CLI):

### Leaf A — Repayment (user reclaims BTC)
```
<user_pubkey> OP_CHECKSIG
<oracle_pubkey> OP_CHECKSIGADD
OP_2 OP_EQUAL
```
2-of-2 user + oracle multisig. Oracle co-signs only after debt is cleared on Starknet.

### Leaf B — Liquidation (covenant path)
```
OP_CAT [reconstructed tx commitment] OP_EQUALVERIFY
<oracle_pubkey> OP_CHECKSIG
```
OP_CAT enforces output structure — liquidator cannot redirect BTC arbitrarily. Must go to the CDP-designated liquidation address embedded in the covenant.

### Leaf C — Emergency timeout
```
<user_pubkey> OP_CHECKSIG
<2016 blocks> OP_CSV OP_DROP
```
Safety exit if oracle is unresponsive for ~2 weeks.

---

## Full User Flow

### Opening a position
1. Frontend calls `standard_vault prepare` → generates Taproot vault address
2. User sends BTC to vault address (Xverse wallet PSBT signing)
3. User calls `register_vault(txid, sat_amount)` on Starknet VaultRegistry
4. CDPCore mints BTSUSD up to `LTV × btc_value × (1 - vol_factor)`

### Normal repayment
1. User repays BTSUSD on Starknet (CDPCore burns debt tokens)
2. Oracle service detects full repayment, co-signs repay transaction
3. User submits 2-of-2 signed tx to Bitcoin → Leaf A executes → BTC returned

### Liquidation
1. BTC price drops, health factor < 1
2. Oracle service signs liquidation attestation
3. Anyone submits the attestation to Bitcoin network
4. Leaf B executes: OP_CAT covenant enforces output → liquidator receives BTC directly
5. Oracle service notifies Starknet to close position

---

## Starknet Contracts (Cairo, deployed on Sepolia)

| Contract | Address |
|---|---|
| VaultRegistry | `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae` |
| CDPCore | `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879` |
| BTSUSDToken | `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd` |
| MockOracle | `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14` |
| BTSSavingsVault | `0x4784a0040cabef8d70a84fd32ebd65d78f96077997af7204fbc103c9ae9b2cd` |

### VaultRegistry
Maps BTC txid (as felt252) to owner address and sat amount. Gated writes — only CDPCore can close a vault.

### CDPCore
- `register_vault(txid, amount)` — registers collateral, sets owner
- `mint_btsusd(txid, amount)` — mints debt up to dynamic LTV cap
- `repay(txid, amount)` — burns debt tokens
- `liquidate(txid)` — closes undercollateralized position
- `get_health_factor(txid)` — returns `(collateral_value × 100) / debt`

### BTSUSDToken
Standard ERC-20 (OpenZeppelin Cairo). Mint/burn controlled exclusively by CDPCore.

### MockOracle
- `set_btc_price(price: u256)` — price in 8-decimal USD (e.g. `6940752000000` = $69,407.52)
- `set_btc_volatility(volatility: u128)` — annualized realized vol in 8 decimals

### BTSSavingsVault (ERC-4626)
- Underlying asset: BTSUSDToken
- VSR (Vault Savings Rate): per-second accumulation rate in ray precision (1e27)
- `chi` accrues over time; depositor shares appreciate in BTSUSD terms
- Current VSR: ~4% APY

---

## Risk Engine

- **Dynamic LTV:** `max_mint = btc_value × base_ltv × (1 - vol_factor)`
- **Health factor:** `(collateral_usd × 100) / debt_usd` — liquidatable below 100
- **Liquidation bonus:** 5% premium to incentivize liquidators
- **Circuit breaker:** Volatility factor reduces max mintable during high-vol regimes

---

## Oracle Service (`packages/oracle-service`)

Node.js service (`tsx`), runs alongside the frontend:

| Task | Frequency |
|---|---|
| BTC/USD price push | Every 5 min |
| Realized volatility push | Every 60 min |
| Vault health check | Every 2 min |

Price source: CoinGecko public API. Volatility: computed from trailing price history.
Auto-liquidate mode available (disabled by default).

---

## Frontend (`packages/nextjs`)

Next.js + Scaffold-Stark + starknet-react.

| Route | Description |
|---|---|
| `/` | Landing page |
| `/borrow` | Main CDP UI — deposit BTC, register vault, mint/repay BTSUSD |
| `/btsusd` | Savings vault — deposit BTSUSD, earn ~4% APY, withdraw |
| `/dashboard` | Protocol stats — TVL, total debt, collateral ratio |
| `/yield` | Yield strategies overview |

Key hooks:
- `useNativeCDP` — vault registration, mint, repay, health factor reads
- `useSavingsVault` — ERC-4626 deposit/withdraw, TVL, APY, user position

---

## Limitations

- **Single vault input per tx.** All vault operations consume one vault UTXO and produce one vault output. Multi-input support requires 64-bit arithmetic via OP_CAT big-num or pre-defined amount tapscripts.
- **Vault returns to itself on repay.** The repay path sends BTC back to the same vault address, not directly to the user's wallet. Routing to an arbitrary close address was not implemented in this version.
- **Regtest only.** OP_CAT must be activated on-chain. Currently targets Bitcoin regtest. Signet/mainnet deployment requires network-level OP_CAT activation (BIP-347).

---

## What the Demo Shows

1. Lock real BTC in an OP_CAT vault — no bridge, no WBTC
2. Mint BTSUSD on Starknet against the Bitcoin-locked collateral
3. Repay debt — health factor updates in real time
4. Deposit BTSUSD into savings vault — earn ~4% APY via VSR
5. Oracle service keeps price + health factors live on Starknet

**The headline:** "Collateral enforced by Bitcoin consensus. Not a smart contract. Not a bridge. Bitcoin itself."
