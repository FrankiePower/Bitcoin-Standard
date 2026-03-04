# BTCStandard Protocol — TODO

Last updated: 2026-03-04

> **Architecture pivot:** migrated from wBTC-on-Starknet to native Bitcoin OP_CAT vaults.
> Real BTC locked on Bitcoin via OP_CAT covenant | debt tracked on Starknet | oracle bridge via Chainlink CRE.

---

## Full E2E Test Run (March 2026)

- [x] 1. Homepage copy updated to OP_CAT-native Bitcoin flow (no wBTC collateral messaging)

---

## Phase 1: Savings Module ✅ COMPLETE

- [x] Build BTSSavingsVault (ERC-4626 with chi/rho/vsr)
- [x] Build BTSSavingsFactory (vault registry)
- [x] Create MockWBTC for testing
- [x] Write 43 unit tests for vault + factory
- [x] Deploy MockWBTC to Sepolia
- [x] Deploy BTSSavingsVault to Sepolia
- [x] Create useSavingsVault hook
- [x] Create useTestTokens hook (faucet)
- [x] Build FaucetModal component
- [x] Build Savings Dashboard page
- [x] Connect frontend to deployed contracts

---

## Phase 2: Native Bitcoin Vault (OP_CAT) 🔥 IN PROGRESS

### 2a. Rust Vault — standard_vault ✅ DONE

- [x] Copy purrfect_vault reference → standard_vault/
- [x] Write `vault_repay(user_key, oracle_key)` — Leaf A, 2-of-2, no OP_CAT
- [x] Write `vault_liquidate(oracle_key, liq_pool_spk)` — Leaf B, OP_CAT covenant
- [x] Write `vault_emergency_timeout(user_key, timelock)` — Leaf C, CSV
- [x] Rewrite VaultCovenant struct (user_keypair + oracle_keypair + liquidation_pool_address)
- [x] Implement create_repay_tx, create_liquidate_tx, create_timeout_tx
- [x] Update CLI: deposit / repay / liquidate / timeout / status
- [x] Rename package to standard_vault (Cargo.toml)
- [x] `cargo build` — 0 errors ✅
- [x] Bootstrap patched Bitcoin Core + start regtest ✅
- [x] Test deposit → repay path end-to-end ✅ (txid: 9abf64468f72904efe5c1bcdb1c796a15582fa5ed57dee3144d8cba58bb27c01)
- [x] Test deposit → liquidate path end-to-end ✅ (txid: 7b44b7efa7d0014399dd547a403c21be43cf34fd933483431ad08701b02a8858)
- [x] Test deposit → timeout path (mine timelock blocks) ✅ (txid: dd65d8f72bbfe22095917407ed764afa1f2ee171127e5a9f3143533fd08f608f)
- [x] Verify OP_CAT covenant: confirm liquidate output cannot be redirected ✅

### 2b. Starknet Contracts — CDP Layer

- [x] Write VaultRegistry.cairo (maps btc_txid → position owner + amount) ✅
- [x] Write CDPCore.cairo (debt tracking, health factor, liquidation trigger) ✅
- [x] Write BTCUSDToken.cairo (replaces btsusd_token; mint/burn gated to CDPCore) ✅
- [x] Rewrite interfaces.cairo — purged 467 lines of wBTC CDP cruft, 0 external trust assumptions ✅
- [x] Purge Phase 1 wBTC contracts — 8 contracts + 5 test files deleted (~3,100 LOC removed) ✅
- [x] `scarb build` → 0 errors ✅
- [x] Write tests for VaultRegistry (register, verify_active, close, liquidate, access control) ✅ 18 tests
- [x] Write tests for CDPCore (mint_debt, repay_debt, liquidate, get_health_factor, undercollateralization) ✅ 24 tests
- [x] `snforge test` → 59 passed, 0 failed ✅
- [x] Deploy PragmaOracle to Sepolia ✅ `0x013e2be818f9fd0d0747159bf0e1201b6e698cc1c0744f2dd4d375eca29b5a69`
- [x] Deploy VaultRegistry to Sepolia ✅ `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae`
- [x] Deploy BTCUSDToken to Sepolia ✅ `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd`
- [x] Deploy CDPCore to Sepolia ✅ `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879`
- [x] Configure CDPCore → BTCUSDToken mint authority ✅ (set_vault)
- [x] Configure VaultRegistry → CDPCore ✅ (set_cdp_core)
- [x] Verify PragmaOracle live price ✅ BTC/USD = $112,165.39 (stale — Sepolia testnet)
- [x] Deploy MockOracle to Sepolia ✅ `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14`
- [x] Switch CDPCore oracle → MockOracle (set_oracle) ✅
- [x] Set correct BTC price on MockOracle ✅ $69,407.00

### 2c. Oracle Service (Bitcoin watcher)

- [x] Write oracle service (Node.js or Rust cron)
  - [x] Monitor Bitcoin signet vault UTXOs
  - [x] Check CDPCore health factors on Starknet
  - [x] Sign liquidation attestations when HF < 100
  - [x] Sign repayment attestations when debt cleared
- [x] Wire oracle keypair (private key in service env, public key in vault Tapscript)

### 2d. Frontend Update

- [x] Rewrite useCDP hook (register vault by btc_txid, not deposit collateral)
- [x] Build RegisterVaultModal (user pastes btc_txid after on-chain deposit)
- [x] Update Borrow page: show vault status, debt, health factor
- [x] Add mint/repay BTCUSD flow
- [x] Remove wBTC collateral deposit UI
- [x] Show oracle public key + vault Taproot address during deposit flow
- [x] Health factor warnings + liquidation risk display
- [x] Add BitcoinVaultStatus component (UTXO confirmed, depth, amount)

---

## Phase 3: Multi-Vault Savings (DEFERRED)

- [ ] Deploy BTSSavingsFactory to Sepolia
- [ ] Deploy sBTCUSD vault
- [ ] Deploy sSTRK vault
- [ ] Update dashboard to show all vaults
- [ ] SavingsVaultIntents + ALM Planner relayer

---

## Demo Flow (Hackathon Submission)

```
1. run: just deposit          → creates Taproot UTXO on Bitcoin regtest, prints txid
2. UI:  Register Vault        → paste txid into Starknet frontend
3. UI:  Mint BTCUSD           → CDPCore mints stablecoin against BTC collateral
4. CRE: price drop simulation → health factor < 1.0 → CRE signs liquidate_tx
5. run: just liquidate        → OP_CAT covenant sends BTC to liquidation pool
6. UI:  Show solvency         → protocol TVL, total debt, health factors
7. Alt: just repay <addr>     → happy path: debt repaid, BTC returned to user
8. Alt: just timeout <addr>   → emergency: user recovers after CSV timelock
```

---

## Deployed Contracts (Starknet Sepolia)

| Contract | Address | Status |
|----------|---------|--------|
| MockWBTC | `0x0455bfec3f128001fd0fc6c7c243a5a446d93aa813a6d76d1a26002f27093fa0` | Live (legacy) |
| BTSSavingsVault | `0x01286e3af345995555c0248f6ab32c3a10ac1a882343730de9400ea07f1714c0` | Live ✅ |
| MockOracle | `0x03d86bc966d124fce2c7fdec8ccbb5af4e429ecafa7e97b84b14b98812d5ab6e` | Legacy |
| BTSUSDToken | `0x065b99291375dd031316a50f44718ba6f7582802cbae093f9327e1dd1ddc94ce` | Legacy → rename BTCUSDToken |
| MockYieldManager | `0x0478fbd0abaa32a8fe551ef1699dea2c64e61e837ad7092ebee383ce58d2dbdf` | Replaced |
| BTSUSDVault | `0x071d1fb34337cb55478cc2784bbc9aa905eae7d670f4267f60dc0c9ee2ac0040` | Replaced |
| Liquidator | `0x02fc386dc1b2642510048dc42428aef88a3c4a5b8660ce6c41f98263eb07670f` | Replaced |
| PragmaOracle | `0x013e2be818f9fd0d0747159bf0e1201b6e698cc1c0744f2dd4d375eca29b5a69` | Live (stale feed) |
| MockOracle | `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14` | Live ✅ $69,407 |
| VaultRegistry | `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae` | Live ✅ |
| CDPCore | `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879` | Live ✅ |
| BTCUSDToken | `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd` | Live ✅ |

---

## Quick Commands

```bash
# Bitcoin vault (regtest)
cd standard_vault
just bootstrap          # build patched Bitcoin Core + start regtest (one-time)
just deposit            # fund vault, print txid + oracle pubkey
just repay <addr>       # repay path (oracle + user sign)
just liquidate          # liquidation path (OP_CAT covenant)
just timeout <addr>     # emergency recovery after CSV timelock
just status             # show vault state

# Starknet contracts
cd packages/snfoundry/contracts
scarb build
snforge test

# Frontend
cd packages/nextjs && yarn dev
```

---

## Known Environment Issue

- [ ] Fix frontend test runner environment mismatch: `yarn test:nextjs` fails with esbuild host/binary version mismatch (`0.25.9` vs `0.27.3`).
