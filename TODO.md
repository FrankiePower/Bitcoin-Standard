# Bitcoin Standard Protocol - TODO

Last updated: 2026-03-01

## Phase 1: Savings Module (COMPLETE)

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

## Phase 2: CDP System (NEXT PRIORITY)

- [ ] Deploy BTSUSDVault (CDP) to Sepolia
- [ ] Deploy BTSUSDToken (stablecoin) to Sepolia
- [ ] Deploy BTSUSDOracle (mock price feed) to Sepolia
- [ ] Deploy Liquidator contract to Sepolia
- [ ] Create useCDP hook for vault interactions
- [ ] Build Borrow page UI (collateral deposit, mint BTSUSD)
- [ ] Add position management (repay, withdraw collateral)
- [ ] Add health factor display and warnings

## Phase 3: Multi-Vault Savings

- [ ] Deploy BTSSavingsFactory to Sepolia
- [ ] Deploy sBTSUSD vault (BTSUSD savings)
- [ ] Deploy sSTRK vault (STRK savings)
- [ ] Update dashboard to show all vaults
- [ ] Build SavingsVaultIntents contract (large withdrawals)
- [ ] Implement ALM Planner relayer (off-chain)

## Phase 4: Bitcoin Bridge Integration

- [ ] Deploy AtomiqAdapter to Sepolia
- [ ] Deploy MockBtcRelay to Sepolia
- [ ] Build backend bridge API (Node.js + mempool.space)
- [ ] Implement deposit address generation
- [ ] Implement Bitcoin transaction monitoring
- [ ] Add BTC deposit flow to frontend
- [ ] Add deposit status tracking UI

## Phase 5: Yield & Production

- [ ] Integrate VesuYieldManager for real yield
- [ ] Connect to Pragma oracle (real BTC/USD price)
- [ ] Security audit
- [ ] Deploy to Starknet Mainnet
- [ ] Production monitoring setup

---

## Deployed Contracts (Sepolia)

| Contract | Address | Status |
|----------|---------|--------|
| MockWBTC | `0x0455bfec3f128001fd0fc6c7c243a5a446d93aa813a6d76d1a26002f27093fa0` | Live |
| BTSSavingsVault | `0x01286e3af345995555c0248f6ab32c3a10ac1a882343730de9400ea07f1714c0` | Live |
| BTSUSDVault | - | Not deployed |
| BTSUSDToken | - | Not deployed |
| BTSUSDOracle | - | Not deployed |
| Liquidator | - | Not deployed |

---

## Quick Commands

```bash
# Build contracts
cd packages/snfoundry/contracts && scarb build

# Run tests
cd packages/snfoundry/contracts && snforge test

# Deploy (using sncast)
sncast --account=sepolia declare --contract-name=<NAME> --network=sepolia
sncast --account=sepolia deploy --class-hash <HASH> --arguments '<ARGS>' --network sepolia

# Start frontend
cd packages/nextjs && yarn dev
```
