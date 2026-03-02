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

## Phase 2: CDP System (IN PROGRESS)

- [x] Deploy BTSUSDVault (CDP) to Sepolia
- [x] Deploy BTSUSDToken (stablecoin) to Sepolia
- [x] Deploy MockOracle (mock price feed) to Sepolia
- [x] Deploy MockYieldManager to Sepolia
- [x] Deploy Liquidator contract to Sepolia
- [x] Configure BTSUSDToken vault address
- [x] Configure MockYieldManager vault address
- [x] Configure BTSUSDVault liquidator address
- [x] Add CDP contracts to deployedContracts.ts
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
| MockOracle | `0x03d86bc966d124fce2c7fdec8ccbb5af4e429ecafa7e97b84b14b98812d5ab6e` | Live |
| BTSUSDToken | `0x065b99291375dd031316a50f44718ba6f7582802cbae093f9327e1dd1ddc94ce` | Live |
| MockYieldManager | `0x0478fbd0abaa32a8fe551ef1699dea2c64e61e837ad7092ebee383ce58d2dbdf` | Live |
| BTSUSDVault | `0x071d1fb34337cb55478cc2784bbc9aa905eae7d670f4267f60dc0c9ee2ac0040` | Live |
| Liquidator | `0x02fc386dc1b2642510048dc42428aef88a3c4a5b8660ce6c41f98263eb07670f` | Live |

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
