# BTCStandard Protocol — TODO

Last updated: 2026-03-02

> **Architecture pivot:** migrated from wBTC-on-Starknet to native Bitcoin OP_CAT vaults.
> Real BTC locked on Bitcoin via OP_CAT covenant | debt tracked on Starknet | oracle bridge via Chainlink CRE.

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
- [ ] Verify OP_CAT covenant: confirm liquidate output cannot be redirected

### 2b. Starknet Contracts — CDP Layer

- [ ] Write VaultRegistry.cairo (maps btc_txid → position owner + amount)
- [ ] Write CDPCore.cairo (debt tracking, health factor, liquidation trigger)
- [ ] Rename BTSUSDToken → BTCUSDToken (100% reusable, just rename + redeploy)
- [ ] Write interfaces.cairo (updated for new contracts)
- [ ] Write tests for VaultRegistry (register, verify_active, close)
- [ ] Write tests for CDPCore (mint_debt, repay_debt, liquidate, get_health_factor)
- [ ] Deploy VaultRegistry to Sepolia
- [ ] Deploy CDPCore to Sepolia
- [ ] Deploy BTCUSDToken to Sepolia
- [ ] Configure CDPCore → BTCUSDToken mint authority

### 2c. Chainlink CRE Integration

- [ ] Design CRE workflow spec (triggers, compute, outputs)
- [ ] Implement Bitcoin UTXO monitor (check vault UTXO unspent)
- [ ] Implement health factor compute (BTC/USD price → LTV check)
- [ ] Implement liquidation attestation signing (oracle_keypair signs liquidate_tx)
- [ ] Implement repayment attestation signing (oracle signs repay_tx after debt cleared)
- [ ] Push BTC/USD price updates to Starknet CDPCore
- [ ] Wire oracle keypair (private key in CRE secrets, public key in vault script)
- [ ] Test CRE end-to-end on regtest → trigger liquidation via price drop

### 2d. Frontend Update

- [ ] Rewrite useCDP hook (register vault by btc_txid, not deposit collateral)
- [ ] Build RegisterVaultModal (user pastes btc_txid after on-chain deposit)
- [ ] Update Borrow page: show vault status, debt, health factor
- [ ] Add mint/repay BTCUSD flow
- [ ] Remove wBTC collateral deposit UI
- [ ] Show oracle public key + vault Taproot address during deposit flow
- [ ] Health factor warnings + liquidation risk display
- [ ] Add BitcoinVaultStatus component (UTXO confirmed, depth, amount)

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
| VaultRegistry | — | Not deployed yet |
| CDPCore | — | Not deployed yet |
| BTCUSDToken | — | Not deployed yet |

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
