# Deployment Guide (Starknet Sepolia)

Date: 2026-02-24

This guide documents the exact, repeatable steps to deploy contracts from this repo to Starknet Sepolia using `scarb` + `sncast`.

---

## 1) Prerequisites
- `scarb` installed
- `sncast` installed (Starknet Foundry)
- `starknet-devnet` installed (optional for local testing)
- A funded Sepolia account (STRK)

Verify versions:
```bash
scarb --version
snforge --version && sncast --version
```

---

## 2) Project Locations
Contracts live here:
```
/Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/contracts
```

---

## 3) Account Setup (Sepolia)
Create a new Sepolia account:
```bash
cd /Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/contracts
sncast account create --network=sepolia --name=sepolia
```

Fund the account using the Sepolia faucet, then deploy it:
```bash
sncast account deploy --network sepolia --name sepolia --silent
```

---

## 4) .env Configuration
Edit this file:
```
/Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/.env
```

Set values:
```
PRIVATE_KEY_SEPOLIA=0x<YOUR_PRIVATE_KEY>
ACCOUNT_ADDRESS_SEPOLIA=0x<YOUR_ACCOUNT_ADDRESS>
RPC_URL_SEPOLIA=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/<YOUR_KEY>
```

---

## 5) Build Contracts
```bash
cd /Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/contracts
scarb build
```

---

## 6) Declare Contract Class
Find the contract name from `contracts/src/*.cairo`.
Example for `YourContract`:
```bash
sncast --account=sepolia declare \
  --contract-name=YourContract \
  --network=sepolia
```

You will receive a **Class Hash**. Save it.

---

## 7) Deploy Contract Instance
Use the class hash from the declare step.
Example:
```bash
sncast --account=sepolia deploy \
  --class-hash <CLASS_HASH> \
  --arguments <constructor_args> \
  --network sepolia
```

Example with a single `owner: ContractAddress` constructor arg:
```bash
sncast --account=sepolia deploy \
  --class-hash 0x... \
  --arguments 0x<YOUR_ACCOUNT_ADDRESS> \
  --network sepolia
```

Save the **Contract Address** and **Transaction Hash**.

---

## 8) Verify Deployment (Optional)
Call a read method to confirm the deployment is live.
Example:
```bash
sncast call \
  --contract-address 0x<DEPLOYED_ADDRESS> \
  --function greeting \
  --network sepolia
```

---

## 9) Common Errors
- **Class not declared**: wait 1–2 minutes after declare and retry deploy.
- **Insufficient funds**: fund the account with more STRK before deploying.
- **Missing Scarb.toml**: run `scarb build` from the `contracts/` directory.

---

## 10) Useful Links
- Starknet Sepolia Faucet: https://starknet-faucet.vercel.app/
- Starkscan Sepolia Explorer: https://sepolia.starkscan.co/

---

## Appendix: Reproducible Paths
- Repo root: `/Users/user/SuperFranky/Bitcoin-Standard`
- Contracts: `/Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/contracts`
- Env file: `/Users/user/SuperFranky/Bitcoin-Standard/packages/snfoundry/.env`

