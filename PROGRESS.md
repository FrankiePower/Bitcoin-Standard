# Bitcoin Standard Protocol - Progress Report

## Project Overview

The Bitcoin Standard Protocol is a Bitcoin-backed DeFi protocol on Starknet with two main pillars:

1. **CDP/Stablecoin System** - Borrow BTSUSD stablecoin against wBTC collateral
2. **Savings System** - Earn yield on wBTC, BTSUSD, and STRK through ERC-4626 vaults

---

## Architecture

```
BTC → Atomiq → wBTC → BTSUSDVault → BTSUSD
                             ↓
                       YieldManager → Vesu
                             ↓
                       Liquidator

Savings:
  wBTC/BTSUSD/STRK → BTSSavingsVault → sWBTC/sBTSUSD/sSTRK (share tokens)
                             ↑
                     BTSSavingsFactory (registry)
```

---

## Development Log

### 2026-03-01 - Savings Module Complete

**Deployed to Sepolia:**
- MockWBTC: `0x0455bfec3f128001fd0fc6c7c243a5a446d93aa813a6d76d1a26002f27093fa0`
- BTSSavingsVault: `0x01286e3af345995555c0248f6ab32c3a10ac1a882343730de9400ea07f1714c0`

**Contracts Built:**
- `BTSSavingsVault` - ERC-4626 vault with Spark-style chi/rho/vsr rate accumulation (~4% APY)
- `BTSSavingsFactory` - Registry for multiple savings vaults
- `MockWBTC` - Test ERC-20 token for development

**Tests:**
- 43 unit tests passing (vault + factory coverage)

**Frontend:**
- `useSavingsVault` hook - reads vault stats, user position, executes deposit/withdraw/redeem
- `useTestTokens` hook - mints 1000 test wBTC from faucet
- `FaucetModal` component - UI for minting test tokens
- Dashboard page - savings UI with vault stats, deposit modal, position display

**Configuration:**
- Scaffold config set to Sepolia testnet
- Deployed contracts added to `deployedContracts.ts`

---

## Comparison: Bitcoin Standard vs Reference btcusd-stablecoin

| Feature | Reference | Bitcoin Standard | Status |
|---------|-----------|------------------|--------|
| CDP Vault | BTCUSDVault | BTSUSDVault | Built |
| Stablecoin | BTCUSDToken | BTSUSDToken | Built |
| Price Oracle | PriceOracle | BTSUSDOracle | Built |
| Liquidator | Liquidator | Liquidator | Built |
| Mock wBTC | MockWBTC | MockWBTC | **Deployed** |
| BTC Bridge | AtomiqAdapter | AtomiqAdapter | Built |
| Yield Manager | YieldManager | VesuYieldManager | Built |
| **Savings Vaults** | Not included | BTSSavingsVault | **Deployed** |
| **Intent System** | Not included | Planned | Not started |
| Mobile App | React Native | Next.js Web | Different |
| Backend API | Node.js | Not built | Not started |

**Key Differentiators:**
1. Savings vaults with Spark-style VSR mechanism (unique to Bitcoin Standard)
2. Web-first approach vs mobile-first
3. Intent system planned for large withdrawals

---

## Technical Details

### Savings Vault Mechanism

The BTSSavingsVault implements the Spark/MakerDAO rate accumulation pattern:

- **chi** - Rate accumulator tracking cumulative growth (starts at RAY = 1e27)
- **rho** - Timestamp of last rate update
- **vsr** - Vault Savings Rate (per-second rate in ray precision)

**Rate Formula:**
```
chi_new = chi_old * (vsr)^(time_delta) / RAY
totalAssets = totalShares * nowChi() / RAY
```

**Current Configuration:**
- VSR: `1000000001243680656318820312` (~4% APY)
- Decimals: 8 (matching wBTC)

### Deployment Method

Using `sncast` (Starknet Foundry) for reliable deployment:

```bash
# Declare contract class
sncast --account=sepolia declare --contract-name=MockWBTC --network=sepolia

# Deploy instance
sncast --account=sepolia deploy \
  --class-hash 0x467ff1f... \
  --arguments '0x069571...' \
  --network sepolia
```

---

## Files Modified/Created

### Contracts
- `packages/snfoundry/contracts/src/savings/savings_vault.cairo`
- `packages/snfoundry/contracts/src/savings/savings_factory.cairo`
- `packages/snfoundry/contracts/src/savings/interfaces.cairo`
- `packages/snfoundry/contracts/tests/test_savings_vault.cairo`
- `packages/snfoundry/contracts/tests/test_savings_factory.cairo`

### Frontend
- `packages/nextjs/hooks/useSavingsVault.ts`
- `packages/nextjs/hooks/useTestTokens.ts`
- `packages/nextjs/components/FaucetModal.tsx`
- `packages/nextjs/app/dashboard/page.tsx`
- `packages/nextjs/components/layout/navbar.tsx`
- `packages/nextjs/contracts/deployedContracts.ts`
- `packages/nextjs/scaffold.config.ts`

### Configuration
- `packages/snfoundry/.env` (Sepolia credentials)
- `packages/snfoundry/contracts/snfoundry.toml`

---

## Next Steps

1. **Deploy CDP System** - BTSUSDVault, BTSUSDToken, Oracle, Liquidator
2. **Build Borrow UI** - Collateral management, mint/repay BTSUSD
3. **Multi-Vault Savings** - Deploy factory and additional vaults
4. **Bridge Integration** - AtomiqAdapter + backend API

---

## Resources

- [Spark Vaults V2 Reference](sparksvault.md)
- [Spark Savings Intents Reference](sparkssavingsintent.md)
- [Reference btcusd-stablecoin](references/btcusd-stablecoin/)
- [Deployment Guide](packages/snfoundry/deployment_guide.md)
