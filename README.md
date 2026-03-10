# Bitcoin Standard Protocol

**Lock real BTC on Bitcoin. Mint BTSUSD on Starknet. Collateral enforced by Bitcoin consensus.**

## Overview

Bitcoin Standard is a **native Bitcoin-backed CDP (Collateralized Debt Position) protocol** built on Starknet. Unlike wrapped-BTC approaches, collateral never leaves Bitcoin — it is locked in **OP_CAT covenant Taproot vaults** directly on Bitcoin L1, while debt accounting and the stablecoin live on Starknet.

### The 3-Step Protocol Flow

```
1. Lock BTC on Bitcoin     →  OP_CAT Taproot vault constrains all spend paths
2. Mint BTSUSD on Starknet →  CDPCore issues stablecoin against BTC collateral
3. Repay or Liquidate      →  Bitcoin-enforced vault paths, no bridge custody
```

### Key Properties

- **No wrapped BTC** — real BTC stays on Bitcoin L1 inside a covenant vault
- **No bridge custody** — the vault script enforces liquidation destination at the consensus level
- **Trust-minimized oracle** — oracle keypair is committed into the Tapscript; a compromised oracle cannot redirect funds
- **Starknet accounting** — debt, health factor, and stablecoin supply tracked on-chain with full auditability
- **Three spend paths** — repay (user+oracle 2-of-2), liquidate (OP_CAT covenant), timeout (CSV emergency recovery)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Bitcoin L1 (regtest / mainnet)               │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │             OP_CAT Taproot Vault (standard_vault)            │  │
│   │                                                              │  │
│   │   Leaf A: Repay    → User + Oracle 2-of-2 multisig          │  │
│   │   Leaf B: Liquidate→ Oracle signs + OP_CAT pins destination  │  │
│   │   Leaf C: Timeout  → User CSV timelock (emergency recovery)  │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                           │ deposit txid                            │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ register_vault(txid, btc_sats)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Starknet Sepolia Testnet                        │
│                                                                     │
│  ┌─────────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  VaultRegistry  │──▶│   CDPCore    │──▶│    BTSUSDToken       │ │
│  │  maps txid →    │   │  debt ledger │   │  ERC-20 stablecoin   │ │
│  │  owner + sats   │   │  health HF   │   │  mint/burn gated     │ │
│  └─────────────────┘   └──────┬───────┘   └──────────────────────┘ │
│                               │ get_btc_price / get_btc_volatility  │
│                        ┌──────▼───────┐                             │
│                        │  MockOracle  │◀── Oracle Service (cron)    │
│                        │  BTC/USD     │    CoinGecko → Starknet     │
│                        └─────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                      Supporting Services                            │
│                                                                     │
│  btc-proxy.mjs    → HTTP proxy: Frontend ↔ Bitcoin Core RPC        │
│  oracle-service/  → Price feed + health monitor + attestation signer│
│  packages/nextjs/ → Next.js CDP dashboard (Starknet-React)         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete Lifecycle

### Phase 1 — Lock BTC on Bitcoin

User runs the `standard_vault` CLI to deposit BTC into an OP_CAT Taproot vault.

```bash
cd standard_vault
make deposit
# → Prints: txid, vault Taproot address, oracle x-only pubkey
# → Updates vault_covenant.json with active vault state
```

The vault UTXO is now on Bitcoin. Three spend paths are cryptographically enforced:

| Path | Who Signs | What Happens |
|------|-----------|--------------|
| Repay (Leaf A) | User + Oracle | Debt cleared on Starknet, BTC returned to user |
| Liquidate (Leaf B) | Oracle only | OP_CAT covenant pins output to liquidation pool — oracle cannot redirect funds |
| Timeout (Leaf C) | User only | CSV timelock — user reclaims BTC after N blocks, no counterparty needed |

### Phase 2 — Register and Mint on Starknet

User pastes the Bitcoin txid into the frontend. The frontend calls:

1. `CDPCore.register_vault(txid, btc_sats)` → registered in VaultRegistry
2. `CDPCore.mint_debt(txid, amount)` → mints BTSUSD against BTC collateral

Health factor is computed continuously:

```
HF = (collateral_usd × 10000) / (debt_usd × MCR)
MCR = 150 + volatility_pct / 2   (capped at 250)
HF ≥ 100 = safe
```

### Phase 3 — Repay or Liquidate

**Happy path (repay):**
- User repays BTSUSD on frontend → `CDPCore.repay_debt(txid, amount)`
- Oracle signs repayment attestation → `make repay` executes Leaf A → BTC returned

**Liquidation path:**
- Oracle service detects HF < 100 → signs LIQUIDATION attestation
- `make liquidate` executes Leaf B → OP_CAT covenant forces BTC to liquidation pool
- No amount of oracle compromise can redirect the liquidation output

---

## How OP_CAT Enforcement Works

The liquidation covenant uses the **CAT+Schnorr sighash introspection technique**:

[BIP341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message) defines a `SigMsg` — a commitment to every field of the spending transaction. [Andrew Polestra observed](https://medium.com/blockstream/cat-and-schnorr-tricks-i-faf1b59bd298) that setting P and R to the generator point G makes the Schnorr `s` value equal to `SigMsg + 1`.

The Tapscript exploits this: the witness provides raw `SigMsg` components; OP_CAT reassembles them on the stack; CHECKSIG validates the result. If it passes, the transaction structure is exactly what the script committed to — **including the output address**. The script asserts that the single output goes to the pre-committed `liquidation_pool_address`. Any attempt to sign a different destination produces an invalid `SigMsg` and fails at consensus.

All script logic is in [`standard_vault/src/vault/script.rs`](standard_vault/src/vault/script.rs).

---

## Deployed Contracts (Starknet Sepolia)

| Contract | Address | Explorer |
|----------|---------|---------|
| **VaultRegistry** | `0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae` | [View](https://sepolia.starkscan.co/contract/0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae) |
| **CDPCore** | `0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879` | [View](https://sepolia.starkscan.co/contract/0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879) |
| **BTSUSDToken** | `0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd` | [View](https://sepolia.starkscan.co/contract/0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd) |
| **MockOracle** | `0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14` | [View](https://sepolia.starkscan.co/contract/0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14) |
| **BTSSavingsVault** | `0x4784a0040cabef8d70a84fd32ebd65d78f96077997af7204fbc103c9ae9b2cd` | [View](https://sepolia.starkscan.co/contract/0x4784a0040cabef8d70a84fd32ebd65d78f96077997af7204fbc103c9ae9b2cd) |

---

## Monorepo Structure

```
Bitcoin-Standard/
├── standard_vault/              # Rust — OP_CAT Taproot vault CLI
│   ├── src/
│   │   ├── main.rs              # CLI entrypoint (deposit/repay/liquidate/timeout/status)
│   │   ├── settings.rs          # Config (oracle keypair, RPC, timelock)
│   │   └── vault/
│   │       ├── contract.rs      # Vault struct + tx builders (repay/liquidate/timeout)
│   │       └── script.rs        # OP_CAT Tapscript construction (Leaf A/B/C)
│   ├── Makefile                 # Demo commands
│   ├── settings.toml            # Vault config (oracle key, deposit amount, timelock)
│   └── vault_covenant.json      # Active vault state (txid, keypairs, status)
│
├── packages/
│   ├── nextjs/                  # Next.js frontend (CDP dashboard)
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── borrow/          # Vault register + mint + repay UI
│   │   │   ├── dashboard/       # Protocol stats (TVL, supply, backing ratio)
│   │   │   └── btsusd/          # Savings vault UI
│   │   ├── hooks/
│   │   │   └── useNativeCDP.ts  # Core hook: reads + writes to all Starknet contracts
│   │   └── contracts/
│   │       └── nativeContracts.ts  # Addresses, ABIs, formatters
│   │
│   ├── snfoundry/               # Cairo contracts + deploy scripts
│   │   └── contracts/src/
│   │       ├── VaultRegistry.cairo   # Maps BTC txid → owner + sats
│   │       ├── CDPCore.cairo         # Debt engine, health factor, liquidation
│   │       ├── BTSUSDToken.cairo     # ERC-20 stablecoin (mint/burn gated to CDPCore)
│   │       ├── MockOracle.cairo      # BTC price + volatility feed
│   │       └── BTSSavingsVault.cairo # ERC-4626 savings module
│   │
│   └── oracle-service/          # Node.js cron service
│       └── src/
│           ├── index.ts         # Scheduler: price (5min), volatility (60min), health (2min)
│           ├── coingecko.ts     # BTC price + 30-day volatility fetch
│           ├── starknet.ts      # MockOracle push + CDPCore health reads
│           ├── bitcoin.ts       # UTXO outpoint monitor via Bitcoin RPC
│           └── attestations.ts  # LIQUIDATION + REPAYMENT_CLEARED signature generation
│
├── btc-proxy.mjs                # HTTP proxy: Frontend ↔ Bitcoin Core RPC (CORS bridge)
├── docs/
│   ├── ARCHITECTURE.md          # Deep-dive protocol architecture
│   ├── TODO.md                  # Feature tracker + deployed addresses
│   └── UX_STORY_PLAN.md         # UX narrative and polish plan
└── README.md                    # This file
```

---

## Demo Setup

### Prerequisites (one-time)

```bash
# Build OP_CAT-enabled Bitcoin Core + vault binary
cd standard_vault
make bootstrap        # ~10-20 min first time (compiles Bitcoin Core)
```

Also requires:
- Node.js ≥ 22, Yarn
- Rust toolchain
- C++ compiler (for Bitcoin Core build)
- Argent / Braavos wallet connected to Starknet Sepolia

### Running the Demo (4 terminals)

**Terminal 1 — Bitcoin regtest node:**
```bash
cd standard_vault
make start-bitcoind
```

**Terminal 2 — BTC proxy (frontend ↔ Bitcoin Core):**
```bash
node btc-proxy.mjs
# Listening on http://127.0.0.1:4040
```

**Terminal 3 — Oracle service (price feed + health monitor):**
```bash
cd packages/oracle-service
cp .env.example .env   # fill in Starknet private key + RPC
npm run start
# → Pushes BTC price to MockOracle every 5 min
# → Monitors vault health factors every 2 min
# → Signs LIQUIDATION attestations when HF < 100
```

**Terminal 4 — Frontend:**
```bash
yarn start
# → http://localhost:3000
```

### Demo Flow

```
1. make deposit           → creates Taproot UTXO on Bitcoin, prints txid
2. Frontend: Register     → paste txid → CDPCore.register_vault()
3. Frontend: Mint BTSUSD  → CDPCore.mint_debt() → stablecoin issued
4. Frontend: Show HF      → health factor, collateral ratio, risk status
5. make liquidate         → oracle signs + OP_CAT sends BTC to liquidation pool
   (or)
6. make repay <addr>      → user + oracle sign → debt cleared, BTC returned
7. make timeout <addr>    → CSV timelock recovery (no oracle needed)
```

### Vault State Persistence

`vault_covenant.json` stores the active vault state. Bitcoin chain data lives in `standard_vault/bitcoin-data/`.

| Scenario | Result |
|----------|--------|
| Stop + restart bitcoind (`make start-bitcoind`) | Chain intact, vault resumes |
| `make clean-bitcoin-data` | Chain wiped — need fresh `make deposit` |
| `make bootstrap` | Same as above (cleans data first) |

---

## Oracle Keypair Wiring

The vault Tapscript commits to the oracle's x-only public key. The oracle service must use the matching private key.

1. Set `oracle_private_key_hex` in `standard_vault/settings.toml`
2. Run `make deposit` — prints the oracle x-only pubkey
3. In `packages/oracle-service/.env` set:
   - `ORACLE_BTC_PRIVATE_KEY` — same key as `settings.toml`
   - `EXPECTED_ORACLE_XONLY_PUBKEY` — pubkey printed by `make deposit`

The oracle service validates this wiring on startup and warns if there is a mismatch.

---

## Contract Quality

```
snforge test          → 60 passed, 0 failed
yarn compile          → pass (scarb build)
yarn next:check-types → pass
yarn next:lint        → pass (0 warnings)
```

---

## Comparison

> "If the bridge is exploited or the contract is hacked, users lose their BTC. Their 'BTC-backed' claim is only as strong as the bridge."

| | **Bitcoin Standard** | **Wrapped-BTC CDPs** (Uncap, Opus, etc.) | **Cross-chain relay models** |
|---|---|---|---|
| Where BTC lives | Bitcoin L1 — OP_CAT covenant vault | Bridge multisig or custodian | Off-chain / payment channel |
| Bridge custody risk | **None** | High — bridge exploit = total loss | Medium |
| Who can steal collateral | Nobody — script is immutable at deposit | Bridge operators / contract admins | Relay operators |
| Liquidation enforcement | **Bitcoin consensus** via OP_CAT | Smart contract call on EVM/L2 | Off-chain agreement |
| Oracle compromise impact | Can trigger liquidation, **cannot redirect funds** | Can trigger liquidation + redirect | Full fund loss |
| Emergency recovery | **CSV timelock** (Leaf C) — no oracle needed | Contract admin function | Provider-dependent |
| Stablecoin chain | Starknet | Ethereum / Starknet | Various |
| Trust assumption | Bitcoin script + Starknet contracts | Bridge multisig **+** contracts | Relay operator |
| Proof of solvency | On-chain public view functions | Varies | Rarely available |

---

## Security Model

- **Vault script is immutable** once the Taproot address is created. No admin can change spend paths post-deposit.
- **Liquidation destination is hard-coded** in the Tapscript at deposit time. The oracle cannot redirect liquidation proceeds.
- **Oracle key compromise** allows triggering liquidation but not theft — OP_CAT forces the output to the committed liquidation pool.
- **Timeout path** (Leaf C) requires no oracle or counterparty — user can always recover BTC after the CSV timelock expires.
- **Debt accounting** is fully on-chain on Starknet with no off-chain state.

---

## Roadmap

- [x] OP_CAT Taproot vault — 3-path covenant (repay / liquidate / timeout)
- [x] Starknet CDP contracts (VaultRegistry, CDPCore, BTSUSDToken, MockOracle)
- [x] Oracle service — price feed, health monitor, attestation signer
- [x] Frontend — register, mint, repay, health factor display
- [x] BTSSavingsVault — ERC-4626 savings module
- [x] End-to-end regtest demo (deposit → repay, deposit → liquidate, deposit → timeout)
- [ ] Signet / mainnet deployment (requires OP_CAT network activation, BIP-347)
- [ ] Merkle-batched bridge for higher throughput
- [ ] Multi-vault aggregation

---

## License

MIT — see [LICENSE](LICENSE)
