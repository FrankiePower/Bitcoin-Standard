# BTCStandard Protocol — TODO

Last updated: 2026-03-10

> **Architecture:** Native Bitcoin OP_CAT vaults. Real BTC locked on Bitcoin via OP_CAT covenant. Debt tracked on Starknet. Oracle service (Node.js) bridges price + health.

---

## Full E2E Test Run (March 2026) ✅ COMPLETE

- [x] Homepage copy updated to OP_CAT-native Bitcoin flow (no wBTC collateral messaging)
- [x] Deposit BTC → register vault → mint BTSUSD → repay debt (full borrow page flow)
- [x] Deposit BTSUSD into BTSSavingsVault (savings page flow)
- [x] Oracle service running — price + volatility pushing to MockOracle on Sepolia

---

## Phase 1: Savings Module ✅ COMPLETE

- [x] Build BTSSavingsVault (ERC-4626 with chi/rho/vsr)
- [x] Write 43 unit tests for vault + factory
- [x] Deploy BTSSavingsVault to Sepolia (redeployed with BTSUSD as underlying asset)
- [x] Create useSavingsVault hook (BTSUSD approve + deposit multicall)
- [x] Build Savings Dashboard page (/btsusd)
- [x] Connect frontend to deployed contracts

---

## Phase 2: Native Bitcoin Vault (OP_CAT) ✅ COMPLETE

### 2a. Rust Vault — standard_vault ✅ DONE

- [x] Write `vault_repay(user_key, oracle_key)` — Leaf A, 2-of-2 multisig
- [x] Write `vault_liquidate(oracle_key, liq_pool_spk)` — Leaf B, OP_CAT covenant
- [x] Write `vault_emergency_timeout(user_key, timelock)` — Leaf C, CSV
- [x] Update CLI: deposit / repay / liquidate / timeout / status
- [x] `cargo build` — 0 errors ✅
- [x] Bootstrap patched Bitcoin Core + start regtest ✅
- [x] Test deposit → repay path end-to-end ✅ (txid: 9abf64468f72904efe5c1bcdb1c796a15582fa5ed57dee3144d8cba58bb27c01)
- [x] Test deposit → liquidate path end-to-end ✅ (txid: 7b44b7efa7d0014399dd547a403c21be43cf34fd933483431ad08701b02a8858)
- [x] Test deposit → timeout path ✅ (txid: dd65d8f72bbfe22095917407ed764afa1f2ee171127e5a9f3143533fd08f608f)
- [x] Verify OP_CAT covenant: liquidate output cannot be redirected ✅

### 2b. Starknet Contracts — CDP Layer ✅ DONE

- [x] VaultRegistry.cairo, CDPCore.cairo, BTSUSDToken.cairo deployed on Sepolia
- [x] `snforge test` → 60 passed, 0 failed ✅
- [x] MockOracle deployed and set as active oracle on CDPCore
- [x] Access control wired (set_vault, set_cdp_core, set_oracle)

### 2c. Oracle Service ✅ DONE

- [x] Node.js cron: BTC/USD price (5 min), volatility (60 min), health factor (2 min)
- [x] Auto-liquidate mode (disabled by default)
- [x] DuplicateNonce handling for volatility updates on restart

### 2d. Frontend ✅ DONE

- [x] useNativeCDP hook (register vault, mint, repay, health factor reads)
- [x] Borrow page: deposit BTC → register → mint → repay full flow
- [x] starknet.js v8 tuple parsing fixed (position, protocolStats, vaultInfo)
- [x] Savings page wired to BTSSavingsVault with BTSUSD

---

## Phase 3: Multi-Vault Savings (DEFERRED)

- [ ] Deploy sSTRK vault
- [ ] Update dashboard to show all vaults
- [ ] SavingsVaultIntents + ALM Planner relayer

---

## Phase 4: Demo Polish 🧭 CURRENT PRIORITY

Reference: `UX_STORY_PLAN.md`

- [ ] Lifecycle status rail on borrow page (Vault detected → Registered → Debt minted → Healthy/At risk → Repaid/Liquidated) with chain labels + tx proof links
- [ ] Quick action defaults: "Max safe mint" button, "Repay 25% / 50% / 100%" buttons
- [ ] Move advanced controls behind an `Advanced` toggle
- [ ] README comparison table: BTCStandard vs wBTC CDPs vs bridge-based models
- [ ] Unify one-line promise across homepage and demo script
- [ ] Add "get collateral back" flow: after Starknet repay, call `make repay` to release BTC on Bitcoin L1

---

## Demo Flow

```
1. make deposit          → creates OP_CAT Taproot UTXO on Bitcoin regtest, prints txid
2. UI: Register Vault    → paste txid into Starknet frontend, vault registered on-chain
3. UI: Mint BTSUSD       → CDPCore mints stablecoin against BTC collateral
4. oracle service        → health factor live, price updating from CoinGecko
5. make liquidate        → OP_CAT covenant sends BTC to liquidation pool (price drop sim)
6. UI: Show solvency     → protocol TVL, total debt, health factors on dashboard
7. Alt: UI repay debt    → happy path: repay BTSUSD on Starknet
8. Alt: make repay       → release BTC on Bitcoin L1 after Starknet repay
```

---

## Active Contracts (Starknet Sepolia)

| Contract | Address |
|----------|---------|
| VaultRegistry | `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae` |
| CDPCore | `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879` |
| BTSUSDToken | `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd` |
| MockOracle | `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14` |
| BTSSavingsVault | `0x4784a0040cabef8d70a84fd32ebd65d78f96077997af7204fbc103c9ae9b2cd` |

---

## Quick Commands

```bash
# Bitcoin vault (regtest)
cd standard_vault
make bootstrap        # one-time: build patched Bitcoin Core + start regtest
make deposit          # fund vault, print txid + oracle pubkey
make repay            # Leaf A: user + oracle sign, BTC returned
make liquidate        # Leaf B: oracle signs, OP_CAT sends BTC to liquidation pool
make timeout          # Leaf C: user recovers after CSV timelock
make status           # show vault state

# Starknet contracts
cd packages/snfoundry
yarn compile
yarn test

# Frontend
cd packages/nextjs && yarn dev

# Oracle service
cd packages/oracle-service && npm run start
```

---

## Known Issues

- [ ] Frontend test runner: `yarn test:nextjs` fails — esbuild version mismatch (`0.25.9` vs `0.27.3`)
- [ ] Vault repay path returns BTC to same vault address (not user's wallet) — standard_vault limitation
