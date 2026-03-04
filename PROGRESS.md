# Bitcoin Standard Protocol - Progress Report

Last updated: 2026-03-04

## Project Overview

Bitcoin Standard is a native Bitcoin-backed CDP protocol on Starknet:

1. Native BTC collateral locked in Bitcoin OP_CAT vaults (`standard_vault`)
2. Debt engine and stablecoin accounting on Starknet (`VaultRegistry`, `CDPCore`, `BTCUSDToken`)
3. Savings vault module on Starknet (`BTSSavingsVault`)

The prior wBTC-first CDP stack is now considered legacy/replaced.

---

## Current Architecture (Active)

```text
Bitcoin L1 (OP_CAT Vault UTXO)
  -> deposit txid + sats
  -> registered on Starknet (VaultRegistry)
  -> debt minted on Starknet (CDPCore -> BTCUSDToken)
  -> health factor driven by oracle price + volatility
  -> repay path: close vault
  -> liquidation path: mark liquidated + trigger covenant flow on Bitcoin

Savings (separate module):
  underlying token -> BTSSavingsVault (ERC-4626, chi/rho/vsr)
```

---

## Status By Area

### 1) Bitcoin Vault Runtime (`standard_vault`) - Done

- OP_CAT covenant vault logic implemented (repay, liquidate, timeout paths)
- CLI flows implemented and tested on regtest
- Regtest end-to-end flows completed for:
  - deposit -> repay
  - deposit -> liquidate
  - deposit -> timeout
- Remaining hardening item:
  - enforce/verify liquidate output redirection constraints end-to-end

### 2) Starknet CDP Contracts - Done

- `VaultRegistry.cairo` implemented and deployed
- `CDPCore.cairo` implemented and deployed
- `BTCUSDToken.cairo` implemented and deployed
- `MockOracle.cairo` deployed and wired as active oracle
- Access wiring complete:
  - registry `set_cdp_core`
  - token `set_vault`
  - cdp `set_oracle`
- Automated quality status (2026-03-04):
  - `yarn compile`: pass
  - `yarn test` (snforge): 60 passed, 0 failed

### 3) Frontend (`packages/nextjs`) - In Progress

- Native CDP UI/hook exists (`useNativeCDP`, borrow page) and is wired to deployed addresses
- Savings dashboard/hook exists and is wired
- Quality status (2026-03-04):
  - `yarn next:check-types`: fixed and passing after native hook contract-instantiation patch
  - `yarn next:lint`: passing with no warnings after dependency cleanup
- Open product work:
  - complete native vault UX polish (registration guidance, risk messaging, lifecycle clarity)
  - expand component-level tests for key flows

### 4) Oracle Service (`packages/oracle-service`) - Partial

- Service can fetch BTC price/volatility from CoinGecko and push to MockOracle on Starknet
- Scheduling/cron flow implemented
- Not yet a full Bitcoin vault watcher/attestation signer

---

## Deployed Starknet Contracts (Sepolia)

- `VaultRegistry`:
  `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae`
- `CDPCore`:
  `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879`
- `BTCUSDToken`:
  `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd`
- `MockOracle`:
  `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14`
- `BTSSavingsVault`:
  `0x01286e3af345995555c0248f6ab32c3a10ac1a882343730de9400ea07f1714c0`

---

## Legacy Notes

The following previously deployed contracts were part of the wBTC-era CDP path and are no longer the active architecture target:

- legacy `BTSUSDVault`
- legacy `Liquidator`
- legacy `MockYieldManager`
- earlier `MockOracle`/`BTSUSDToken` instances

Keep them for historical traceability only.

---

## Next Priorities

1. Complete oracle watcher/attestation behavior for native vault lifecycle events
2. Finalize frontend UX around txid registration and liquidation risk communication
3. Add/repair frontend automated tests to cover borrow/register/repay critical path
