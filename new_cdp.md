# BTCStandard — Native Bitcoin CDP
## The first CDP where collateral never leaves Bitcoin

**One-line pitch:** Lock real BTC in an OP_CAT vault on Bitcoin. Track debt on Starknet. Bridge them with Chainlink CRE. No wrapped tokens. No bridge risk. Bitcoin consensus enforces the collateral.

---

## Why This Wins

Every other BTC CDP (Uncap, Opus, etc.) uses WBTC — a bridged token. If the bridge is exploited or the contract is hacked, users lose their BTC. Their "BTC-backed" claim is only as strong as the bridge.

BTCStandard eliminates that. The collateral **never leaves Bitcoin**. Starknet only holds the debt ledger. The vault covenant, enforced by Bitcoin consensus, is what makes "BTC-backed" actually mean something cryptographically.

---

## Core Architecture

```
User's real BTC
      │
      ▼
OP_CAT Vault (Bitcoin Inquisition Signet)
  - Taproot UTXO with 3 spending leaves
  - Covenant enforces liquidation output via OP_CAT
  - Oracle sig verified via OP_CSFS
      │
      ▼
Chainlink CRE Workflow (the oracle bridge)
  - Monitors Bitcoin signet: detects new vault UTXOs, verifies unspent
  - Provides BTC/USD price feed to Starknet
  - Signs "liquidate:position_id:price" when health factor < 1
  - Signs "cleared:position_id" when debt repaid
      │
      ▼
Starknet Sepolia (debt ledger only)
  VaultRegistry  — maps position_id → (btc_txid, btc_amount, owner)
  CDPCore        — debt tracking, LTV, health factor, liquidation logic
  BTCUSDToken    — ERC20 stablecoin, minted/burned by CDPCore
```

---

## Bitcoin Vault: Taproot Script Design

Three spending leaves on the vault UTXO:

### Leaf A — Repayment (user reclaims BTC)
```
<user_pubkey> OP_CHECKSIG
<oracle_pubkey> <"cleared:position_id"> OP_CHECKSIGFROMSTACK OP_VERIFY
```
User gets BTC back only when CRE signs debt-cleared attestation.

### Leaf B — Liquidation (liquidator claims BTC)
```
<oracle_pubkey> <"liquidate:position_id:price"> OP_CHECKSIGFROMSTACK OP_VERIFY
<expected_output_hash> OP_CAT [reconstructed tx commitment] OP_EQUALVERIFY
```
OP_CAT enforces the output structure — liquidator cannot redirect BTC to an arbitrary address. It must go to the CDP-designated liquidation address embedded in the covenant.

### Leaf C — Emergency timeout
```
<user_pubkey> OP_CHECKSIG
<2016 blocks> OP_CHECKLOCKTIMEVERIFY
```
Safety exit if CRE is unresponsive for ~2 weeks.

---

## Full User Flow

### Opening a position
1. User creates Bitcoin vault UTXO on Inquisition signet
2. CRE detects the vault, verifies it's unspent, relays to Starknet
3. User calls `register_vault(txid, amount)` on Starknet
4. CDPCore mints BTCUSD up to `LTV × btc_amount`

### Normal repayment
1. User repays BTCUSD on Starknet
2. CDPCore burns the debt tokens
3. CRE detects full repayment, signs `"cleared:position_42"`
4. User submits attestation to Bitcoin → Leaf A executes → BTC returned

### Liquidation
1. BTC price drops, health factor < 1
2. CRE detects undercollateralization, signs `"liquidate:position_42:price:65000"`
3. Liquidator submits signed attestation to Bitcoin network
4. Leaf B executes: OP_CSFS verifies oracle sig, OP_CAT covenant enforces output
5. Liquidator receives BTC directly from Bitcoin — no bridge, no contract call
6. CRE detects vault spent, notifies Starknet to close position

---

## Starknet Contracts (Cairo)

### VaultRegistry
```cairo
#[starknet::interface]
trait IVaultRegistry<TContractState> {
    fn register_vault(ref self: TContractState, btc_txid: felt252, amount: u256);
    fn verify_vault_active(self: @TContractState, position_id: u256) -> bool;
    fn close_vault(ref self: TContractState, position_id: u256); // called by CRE
}
```

### CDPCore
```cairo
#[starknet::interface]
trait ICDP<TContractState> {
    fn mint_debt(ref self: TContractState, position_id: u256, amount: u256);
    fn repay_debt(ref self: TContractState, position_id: u256, amount: u256);
    fn liquidate(ref self: TContractState, position_id: u256);
    fn update_price(ref self: TContractState, price: u256); // called by CRE
    fn get_health_factor(self: @TContractState, position_id: u256) -> u256;
}
```

### BTCUSDToken
Standard OZ ERC20, mint/burn controlled by CDPCore.

---

## Chainlink CRE Workflow

One workflow handles everything:
- **Trigger:** BTC/USD price deviation (Chainlink Streams) OR cron (every N minutes)
- **Actions:**
  - Verify Bitcoin vault UTXOs still unspent
  - Compute health factors for all positions
  - Sign liquidation attestations for unhealthy positions
  - Write updated price to Starknet CDPCore
- **Signing:** Oracle keypair whose pubkey is hardcoded in the Bitcoin vault Tapscript

---

## Risk Engine (on Starknet)

- **Dynamic LTV:** `max_mint = btc_value × base_ltv × (1 - vol_factor)`
- **Circuit breaker:** If oracle price deviates >5% in one update, pause minting
- **Dual oracle:** Chainlink Streams primary, Pragma (Starknet-native) as sanity check
- **Liquidation bonus:** 5% premium to incentivize liquidators

---

## Proof of Solvency (on Starknet)

Public view functions:
```
total_btc_collateral_value ≥ total_btcusd_supply × MIN_CR
health_factor_distribution across all positions
```
Anyone can verify the protocol is solvent — no ZK needed, it's just public state.

---

## Testnet Stack

| Layer | Network |
|---|---|
| Bitcoin vault | Bitcoin Inquisition Signet (BIP-347 OP_CAT + BIP-348 OP_CSFS active) |
| Debt / stablecoin | Starknet Sepolia |
| Oracle bridge | Chainlink CRE |
| Price feed | Chainlink Streams (BTC/USD) |

---

## 4-Day Build Plan

**Day 1 — Bitcoin vault**
- Set up Bitcoin Inquisition signet node
- Study `taproot-wizards/purrfect_vault` as reference
- Write Tapscript with OP_CAT covenant + OP_CSFS oracle check in btcdeb
- Deploy vault UTXO to Inquisition signet, test spending paths

**Day 2 — Starknet contracts**
- VaultRegistry + CDPCore + BTCUSDToken in Cairo
- Tests with Starknet Foundry (snforge)
- Deploy to Starknet Sepolia
- Manual end-to-end: register vault → mint BTCUSD → repay → check health factor

**Day 3 — Chainlink CRE workflow**
- CRE workflow: price feed → compute health factors → sign attestations → write to Starknet
- Wire the oracle keypair: pubkey hardcoded in vault script, private key in CRE secrets
- Test liquidation trigger end-to-end: drop mock price → CRE signs → Bitcoin leaf B executes

**Day 4 — Demo polish**
- Clean demo script: full loop in one take
- Proof of solvency dashboard (simple React + starknet.js)
- Video recording: lock BTC → mint BTCUSD → liquidation scenario → BTC released
- Deploy, README, submission

---

## What Judges See

1. Lock real BTC in an OP_CAT vault — no bridge, no WBTC
2. Mint BTCUSD on Starknet against the Bitcoin-locked collateral
3. Price drops — Chainlink CRE fires liquidation attestation
4. Bitcoin script executes — liquidator gets BTC directly on Bitcoin
5. Proof of solvency dashboard proves the system is real

**The headline:** "Collateral enforced by Bitcoin consensus. Not a smart contract. Not a bridge. Bitcoin itself."

---

## Key Resources

### Bitcoin / OP_CAT
- Bitcoin Inquisition (OP_CAT + OP_CSFS signet): https://github.com/bitcoin-inquisition/bitcoin
- Reference vault implementation: https://github.com/taproot-wizards/purrfect_vault
- btcdeb (script debugger): https://github.com/bitcoin-core/btcdeb
- BIP-347 (OP_CAT): https://github.com/bitcoin/bips/blob/master/bip-0347.mediawiki
- BIP-348 (OP_CSFS): https://github.com/bitcoin/bips/blob/master/bip-0348.mediawiki
- Inquisition signet explorer: https://explorer.bc-2.jp/

### Starknet
- Scarb (Cairo build tool): https://docs.swmansion.com/scarb
- Starknet Foundry (testing): https://foundry-rs.github.io/starknet-foundry/
- OpenZeppelin Cairo: https://github.com/OpenZeppelin/cairo-contracts
- Starknet Sepolia faucet: https://faucet.starknet.io/
- Sepolia explorer: https://sepolia.starkscan.co/

### Chainlink CRE
- CRE docs: https://docs.chain.link/cre
- chainlink-common SDK: https://github.com/smartcontractkit/chainlink-common

### Liquid (fallback if Inquisition has issues)
- liquidjs-lib: https://github.com/vulpemventures/liquidjs-lib
- Liquid testnet explorer: https://blockstream.info/liquidtestnet/
- Liquid testnet faucet: https://liquidtestnet.com/faucet
