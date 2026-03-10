# standard_vault

Bitcoin OP_CAT covenant vault for the Bitcoin Standard Protocol.

Real BTC is locked in a Taproot vault on Bitcoin L1. The vault enforces three
spend paths at the script level — no trusted intermediary can redirect funds
outside the allowed paths.

---

## Vault Spend Paths

| Path | Signers | Enforcement |
|------|---------|-------------|
| **Repay** (Leaf A) | User + Oracle (2-of-2) | Multisig — debt cleared on Starknet, user reclaims BTC |
| **Liquidate** (Leaf B) | Oracle only | OP_CAT covenant — output is cryptographically pinned to the liquidation pool address |
| **Timeout** (Leaf C) | User only | CSV timelock — user recovers BTC after N blocks with no counterparty |

The liquidation path is the key trust-minimization property: even a compromised
oracle cannot redirect the liquidation output anywhere other than the
pre-committed liquidation pool address.

---

## Prerequisites

- Rust toolchain (`cargo`)
- C++ compiler (to build the patched Bitcoin Core with OP_CAT enabled)
- `make`

---

## Setup (one-time)

```bash
# Build OP_CAT-enabled Bitcoin Core and the vault binary
make bootstrap
```

This will:
1. Build a patched Bitcoin Core with OP_CAT enabled into `./bitcoin-core-cat/`
2. Compile the `standard_vault` binary (`cargo build --release`)
3. Wipe any stale chain data and start a fresh regtest node

---

## Oracle Keypair Wiring

The vault Tapscript commits to the oracle's x-only public key. The oracle
service must use the matching private key to sign liquidation/repayment
attestations.

1. Set `oracle_private_key_hex` in `settings.toml` (64 hex chars, no `0x` prefix).
2. Run `make deposit` — it prints the oracle x-only pubkey.
3. In `packages/oracle-service/.env`, set:
   - `ORACLE_BTC_PRIVATE_KEY` — same private key as `settings.toml`
   - `EXPECTED_ORACLE_XONLY_PUBKEY` — the pubkey printed by `make deposit`

---

## Demo Flow

```bash
# 1. Start bitcoind (if not already running)
make start-bitcoind

# 2. Deposit BTC into a new vault
make deposit
# → prints txid and oracle pubkey; vault_covenant.json is updated

# 3. Check vault status
make status

# 4a. Happy path — repay debt, reclaim BTC
make repay

# 4b. Liquidation path — oracle signs, OP_CAT sends BTC to liquidation pool
make liquidate

# 4c. Emergency recovery — user reclaims after CSV timelock
make timeout

# Stop the node
make stop-bitcoind
```

---

## Vault State Persistence

The active vault state is saved to `vault_covenant.json` (UTXO outpoint,
keypairs, status). The Bitcoin chain data lives in `./bitcoin-data/`.

| Action | Result |
|--------|--------|
| Stop + restart bitcoind | Chain intact, vault resumes |
| `make clean-bitcoin-data` | Chain wiped — need a fresh `make deposit` |
| `make bootstrap` | Same as above (cleans data first) |

Do not run `clean-bitcoin-data` mid-demo.

---

## How It Works — CAT+Schnorr Covenant Technique

The liquidation covenant (Leaf B) uses OP_CAT to enforce the output destination
at the script level. Here's the underlying technique:

[BIP341 signature validation](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#common-signature-message)
constructs a `SigMsg` — a commitment to all fields of the spending transaction.
[Andrew Polestra observed](https://medium.com/blockstream/cat-and-schnorr-tricks-i-faf1b59bd298)
that if you set the public key (P) and nonce commitment (R) to the generator
point G, the `s` value of the resulting Schnorr signature equals `SigMsg + 1`.

We exploit this: the witness passes in the raw SigMsg components, OP_CAT
reassembles them on the stack, and CHECKSIG validates the result. If it passes,
the transaction structure is exactly what the script expected — including the
output address.

For the liquidation path this means the script asserts that the single output
goes to `liquidation_pool_address`. An oracle that tries to sign a tx sending
funds elsewhere will produce an invalid SigMsg and the transaction will be
rejected by consensus.

Additional technique used: TXID reconstruction on the stack. To verify the
previous transaction state, we pass the serialized tx fields as witness data,
hash them twice to get the TXID, and assert the spending input matches. Two
constraints to be aware of:
- Witness stack items have an 80-byte standardness limit — outputs are split
  into chunks and reassembled with OP_CAT.
- Stack items have a 520-byte consensus limit — the tightly-constrained tx
  structure keeps us safely under this.

Signature grinding: the s-value must not end in `0x7f` or `0xff`. We grind the
low-order bits of the locktime and sequence of the last input to satisfy this.
See [this post](https://delvingbitcoin.org/t/efficient-multi-input-transaction-grinding-for-op-cat-based-bitcoin-covenants/1080)
for details.

All script logic lives in `src/vault/script.rs`.

---

## Limitations

- **Single vault input per tx.** All vault operations consume one vault UTXO
  and produce one vault output. Naively allowing multiple vault inputs opens an
  attack where an adversary can drain vault inputs to fees. Fixing this requires
  either 64-bit arithmetic (implementable in CAT via big-num), pre-defined
  amount tapscripts, or restricting to 32-bit amounts.

- **Vault always returns to itself on repay.** The repay path sends BTC back to
  the same vault address. Routing to a different user address on close would be
  straightforward but was not implemented in this version.

- **Regtest only.** The current settings target Bitcoin regtest. Signet/mainnet
  deployment requires OP_CAT to be activated on that network.

---

## Available Make Targets

```
make bootstrap         # one-time: build Bitcoin Core + vault binary + fresh regtest
make build             # cargo build --release only
make start-bitcoind    # start regtest node (keeps existing chain data)
make stop-bitcoind     # gracefully stop the node
make clean-bitcoin-data # wipe regtest chain data

make deposit           # fund and create a new vault
make status            # show current vault state
make repay             # Leaf A: user + oracle sign, BTC returned
make liquidate         # Leaf B: oracle signs, OP_CAT sends BTC to liquidation pool
make timeout           # Leaf C: user recovers after CSV timelock
```
