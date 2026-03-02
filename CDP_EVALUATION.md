# CDP Architecture Evaluation: Current vs Native Bitcoin

## Executive Summary

The `new_cdp.md` proposal represents a **fundamentally different and superior architecture** for a Bitcoin-backed stablecoin protocol. Instead of using wrapped Bitcoin (wBTC) on Starknet, it locks **real BTC in native Bitcoin vaults** using OP_CAT covenants, with Starknet serving only as a debt ledger.

**Recommendation:** Migrate to the native Bitcoin CDP architecture. The security and novelty gains far outweigh the implementation effort.

---

## Architecture Comparison

### Current Implementation (wBTC-based)

```
┌────────────────────────────────────────────────────────┐
│                    STARKNET                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │   wBTC ──► BTSUSDVault ──► BTSUSD                │  │
│  │              │                                    │  │
│  │        MockOracle                                 │  │
│  │        MockYieldManager                           │  │
│  │        Liquidator                                 │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                        ▲                                │
│                        │ BRIDGE (trust assumption)      │
│                        │                                │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│                    BITCOIN                              │
│                        │                                │
│   User BTC ──► Bridge ─┘                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Native Bitcoin CDP (new_cdp.md)

```
┌─────────────────────────────────────────────────────────┐
│                    BITCOIN                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │   User BTC ──► OP_CAT Vault (Taproot UTXO)        │  │
│  │                      │                             │  │
│  │           Leaf A: Repay (user gets BTC back)      │  │
│  │           Leaf B: Liquidate (enforced by OP_CAT)  │  │
│  │           Leaf C: Emergency timeout               │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │ Oracle attestations            │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────┐
│              CHAINLINK CRE (Oracle Bridge)               │
│                         │                                │
│   - Monitors BTC vaults                                  │
│   - Provides BTC/USD price                               │
│   - Signs liquidation attestations                       │
│   - Signs debt-cleared attestations                      │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────┐
│                    STARKNET                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │   VaultRegistry ──► CDPCore ──► BTCUSDToken       │  │
│  │        │               │                           │  │
│  │   (tracks BTC)    (debt only)   (stablecoin)      │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Detailed Comparison

| Aspect | Current (wBTC) | Native Bitcoin | Winner |
|--------|---------------|----------------|--------|
| **Collateral Location** | Starknet (wBTC) | Bitcoin (real BTC) | Native Bitcoin |
| **Bridge Risk** | Yes (wBTC bridge) | None | Native Bitcoin |
| **Trust Model** | Bridge + Starknet contracts | Bitcoin consensus + CRE oracle | Native Bitcoin |
| **Liquidation Enforcement** | Starknet contract | Bitcoin Script (OP_CAT covenant) | Native Bitcoin |
| **Security** | Contract bugs can steal collateral | Bitcoin consensus protects collateral | Native Bitcoin |
| **"Bitcoin-backed" Claim** | Weak (depends on bridge) | Strong (cryptographically enforced) | Native Bitcoin |
| **Technical Novelty** | Standard CDP | OP_CAT + Chainlink CRE (cutting-edge) | Native Bitcoin |
| **Implementation Complexity** | Moderate | High | Current |
| **Mainnet Readiness** | Yes (wBTC exists) | No (OP_CAT only on signet) | Current |
| **Hackathon Appeal** | Standard | Highly innovative | Native Bitcoin |

---

## Why Native Bitcoin CDP is Better

### 1. **True "Bitcoin-Backed" Claim**

The core promise of a "Bitcoin-backed" stablecoin is that BTC collateral is safe. With wBTC:
- If the wBTC bridge is exploited → collateral lost
- If Starknet contracts have bugs → collateral lost
- Users are trusting multiple layers of smart contracts

With native Bitcoin vaults:
- Collateral is enforced by **Bitcoin consensus itself**
- No smart contract can steal the BTC
- The only way to move BTC is through the covenant rules (repay debt or get liquidated)

### 2. **No Bridge Risk**

Bridge exploits are among the largest attack vectors in DeFi:
- Ronin Bridge: $625M stolen
- Wormhole: $320M stolen
- Nomad: $190M stolen

The native Bitcoin CDP has **zero bridge risk** because collateral never leaves Bitcoin.

### 3. **Cryptographic Enforcement**

In the current design, liquidation relies on:
1. Liquidator contract being bug-free
2. Oracle providing accurate prices
3. Starknet execution being honest

In the native Bitcoin design:
1. **OP_CAT covenant** mathematically enforces the output structure
2. **OP_CSFS** verifies oracle signatures on-chain
3. **Bitcoin Script** executes deterministically

The liquidation rules are **embedded in Bitcoin Script**, not a smart contract that can be upgraded or exploited.

### 4. **Technical Innovation**

This design uses:
- **OP_CAT** (BIP-347) - Enables covenants on Bitcoin
- **OP_CSFS** (BIP-348) - Enables signature verification from stack
- **Chainlink CRE** - Cross-chain oracle with compute capabilities
- **Taproot multi-path scripts** - Three spending paths with different conditions

This is cutting-edge technology that's only available on Bitcoin Inquisition signet. Perfect for a hackathon demonstration of what's possible.

### 5. **Judge Appeal**

For a hackathon, the native Bitcoin approach is far more impressive:
- Uses novel Bitcoin opcodes (OP_CAT)
- Demonstrates cross-chain coordination (Bitcoin + Starknet + Chainlink)
- Solves a real problem (bridge risk)
- Shows what's possible with programmable Bitcoin

---

## What We Lose by Migrating

### 1. Already Built and Deployed
- BTSUSDVault (full CDP logic)
- MockYieldManager (yield on collateral)
- Liquidator (on-chain liquidation)
- Full frontend (deposit/borrow UI)

### 2. Simpler Architecture
- Single-chain operation (just Starknet)
- No need for cross-chain coordination
- Easier to debug and test

### 3. Yield on Collateral
- Current design routes collateral through yield strategies
- Native Bitcoin design locks BTC in a covenant (no yield)

---

## What We Keep

| Component | Reusability | Notes |
|-----------|-------------|-------|
| BTSUSDToken | ✅ **100%** | Rename to BTCUSDToken, same ERC20 |
| Frontend structure | ✅ **70%** | Same UI, different data sources |
| Scaffold-stark setup | ✅ **100%** | Already configured |
| useCDP hook | ⚠️ **40%** | Needs rewrite for new contract interfaces |
| deployedContracts.ts | ⚠️ **30%** | New contracts, new ABIs |
| BTSUSDVault | ❌ **0%** | Completely different architecture |
| MockYieldManager | ❌ **0%** | Not applicable |
| Liquidator | ❌ **0%** | Liquidation happens on Bitcoin |
| MockOracle | ❌ **0%** | Replaced by Chainlink CRE |
| Savings Vault | ✅ **100%** | Independent module, can coexist |

---

## Migration Guide

### Phase 1: Bitcoin Vault Development (Day 1)

**New Work:**
1. Set up Bitcoin Inquisition signet node
2. Study `purrfect_vault` reference implementation
3. Write Tapscript with three spending leaves:
   - Leaf A: Repayment (user_pubkey + oracle "cleared" attestation)
   - Leaf B: Liquidation (oracle "liquidate" attestation + OP_CAT covenant)
   - Leaf C: Emergency timeout (user_pubkey + CLTV 2016 blocks)
4. Test all spending paths in btcdeb
5. Deploy test vault to Inquisition signet

**Resources:**
- https://github.com/bitcoin-inquisition/bitcoin
- https://github.com/taproot-wizards/purrfect_vault
- https://github.com/bitcoin-core/btcdeb

### Phase 2: Starknet Contract Rewrite (Day 2)

**Modify/Create:**

```
packages/snfoundry/contracts/src/
├── vault_registry.cairo     # NEW: Maps position_id → (btc_txid, amount, owner)
├── cdp_core.cairo           # NEW: Debt tracking, health factor (simpler than BTSUSDVault)
├── btcusd_token.cairo       # RENAME: BTSUSDToken → BTCUSDToken
├── interfaces.cairo         # MODIFY: New interfaces
└── savings/                  # KEEP: Independent module
```

**VaultRegistry Interface:**
```cairo
#[starknet::interface]
trait IVaultRegistry<TContractState> {
    fn register_vault(ref self: TContractState, btc_txid: felt252, btc_amount: u256);
    fn verify_vault_active(self: @TContractState, position_id: u256) -> bool;
    fn close_vault(ref self: TContractState, position_id: u256); // Called by CRE
    fn get_vault(self: @TContractState, position_id: u256) -> (felt252, u256, ContractAddress);
}
```

**CDPCore Interface:**
```cairo
#[starknet::interface]
trait ICDPCore<TContractState> {
    fn mint_debt(ref self: TContractState, position_id: u256, amount: u256);
    fn repay_debt(ref self: TContractState, position_id: u256, amount: u256);
    fn liquidate(ref self: TContractState, position_id: u256); // Marks as liquidated
    fn update_price(ref self: TContractState, price: u256); // Called by CRE
    fn get_health_factor(self: @TContractState, position_id: u256) -> u256;
    fn get_position(self: @TContractState, position_id: u256) -> (u256, u256); // (btc_value, debt)
}
```

**Key Differences from Current BTSUSDVault:**
- No `deposit_collateral` / `withdraw_collateral` (collateral is on Bitcoin)
- No yield manager integration
- Simpler liquidation (just marks position closed, actual liquidation on Bitcoin)
- Price comes from CRE, not mock oracle

### Phase 3: Chainlink CRE Integration (Day 3)

**New Work:**
1. Set up CRE workflow that:
   - Monitors Bitcoin signet for vault UTXOs
   - Verifies vaults are unspent
   - Computes health factors
   - Signs liquidation attestations when health < 1
   - Signs "cleared" attestations when debt repaid
   - Writes price updates to Starknet CDPCore

2. Wire the oracle keypair:
   - Public key hardcoded in Bitcoin vault Tapscript
   - Private key in CRE secrets

3. Test end-to-end:
   - Create vault on Bitcoin
   - Register on Starknet
   - Mint debt
   - Trigger liquidation (mock price drop)
   - Verify Bitcoin script executes

**CRE Workflow Pseudocode:**
```yaml
triggers:
  - type: price_deviation
    feed: BTC/USD
    threshold: 1%
  - type: cron
    interval: 5m

compute:
  - check_all_vault_utxos_unspent()
  - for each position:
      health = compute_health_factor(position)
      if health < 1:
        sign_liquidation_attestation(position)
  - write_price_to_starknet(current_price)

output:
  - attestations[] (for Bitcoin spending)
  - price_update (for Starknet)
```

### Phase 4: Frontend Migration (Day 4)

**Modify:**

1. **useCDP.ts** → Complete rewrite:
   - No more deposit/withdraw collateral on Starknet
   - Add Bitcoin wallet integration (for viewing vault status)
   - Read from VaultRegistry + CDPCore
   - Different transaction flow (register vault instead of deposit)

2. **borrow/page.tsx** → Significant changes:
   - Remove collateral deposit UI (happens on Bitcoin)
   - Add "Create Bitcoin Vault" instructions
   - Add "Register Vault" flow (enter btc_txid)
   - Keep mint/repay BTCUSD flow
   - Update health factor display

3. **New Components:**
   - `BitcoinVaultStatus` - Shows vault UTXO status
   - `RegisterVaultModal` - Enter btc_txid to register
   - `VaultInstructions` - How to create vault on Bitcoin

**New User Flow:**
```
1. User creates vault on Bitcoin (external wallet/CLI)
2. User copies btc_txid
3. User connects Starknet wallet
4. User calls "Register Vault" with btc_txid
5. CDPCore mints BTCUSD up to LTV
6. User repays debt when ready
7. CRE signs "cleared" attestation
8. User spends Bitcoin vault (gets BTC back)
```

---

## Timeline Estimate

| Phase | Current State | New State | Effort |
|-------|--------------|-----------|--------|
| Bitcoin Vault | Not started | Functional | 1 day |
| Starknet Contracts | Full CDP | Registry + Core | 1 day |
| Chainlink CRE | Not started | Functional | 1 day |
| Frontend | Full UI | Adapted UI | 0.5 days |
| Testing | 43 tests | New tests | 0.5 days |

**Total: 4 days** (matches new_cdp.md build plan)

---

## Risk Assessment

### Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OP_CAT complexity | Medium | High | Study purrfect_vault reference |
| CRE integration issues | Medium | High | Start early, have Liquid fallback |
| Time pressure | High | Medium | Parallelize Bitcoin + Starknet work |
| Incomplete migration | Medium | Medium | Keep savings module working |

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bitcoin Inquisition signet issues | Low | High | Liquid testnet as fallback |
| CRE signing problems | Medium | High | Test offline signing first |
| Cross-chain timing | Medium | Medium | Add retry logic |

---

## Recommendation

**Proceed with migration to native Bitcoin CDP.**

**Reasoning:**
1. The security model is fundamentally better
2. The technical innovation is impressive for a hackathon
3. We can reuse significant portions of our work (stablecoin, frontend, savings)
4. The 4-day timeline is aggressive but achievable
5. Even a partial implementation (Bitcoin vault + basic Starknet debt tracking) would be more impressive than the current wBTC-based approach

**Priority Order:**
1. **Day 1:** Bitcoin vault - this is the novel part
2. **Day 2:** Starknet contracts - keep them simple
3. **Day 3:** CRE integration - critical for the demo
4. **Day 4:** Polish and demo recording

**Fallback Plan:**
If Bitcoin Inquisition has issues, use Liquid testnet which has OP_CAT-like capabilities via Elements script extensions.