# Bridge + Vesu Integration Notes (Sepolia)

## Goal
We need a BTC → WBTC path (even if mocked) on Sepolia, plus oracles and optional Vesu yield integration.

## Findings Summary

### 1) Xverse API (tested)
- The swap endpoint returns **runes assets** as destination tokens for BTC (no WBTC on Starknet).
- This does **not** provide a BTC → WBTC bridge for Starknet.
- Conclusion: Xverse API is **not a BTC→WBTC bridge** for our Starknet flow.

### 2) Garden Finance API (candidate bridge)
- Garden API supports **Starknet WBTC** in the assets list.
- The API exposes `GET /assets` and `GET /quote` on `https://{environment}.garden.finance/v2`.
- Quickstart example shows **bitcoin_testnet:btc → base_sepolia:wbtc** for quotes; Starknet WBTC is listed in supported assets, but we must confirm route availability.

Useful endpoints:
- `GET /assets` (supports `starknet:wbtc` on mainnet, `starknet_sepolia:wbtc` on testnet)
- `GET /quote?from=...&to=...&from_amount=...`
- `POST /orders` (create swap order)
- `GET /orders/{id}` (order status)

Notes:
- API uses `garden-app-id` header.
- Route availability should be validated (Garden provides route validation docs).
- Garden provides a **public test app ID** for development:
  - `f242ea49332293424c96c562a6ef575a819908c878134dcb4fce424dc84ec796`

### 3) Reference BTCUSD project (Sepolia)
- On Sepolia, they **use a mock WBTC** and **mock oracle**.
- Bridge flow is mocked via backend, with optional Atomiq integration.

## Implications for Our Flow
- If we want BTC → WBTC on Sepolia **without full Atomiq**, Garden is the most promising API candidate so far.
- If Garden routes do not allow BTC → starknet_sepolia:wbtc, we still need a **mock bridge**.
- Vesu integration can be real if we supply real vToken addresses and use ERC4626 deposit/withdraw patterns.

## Next Steps
1) Test Garden `GET /assets` and `GET /quote` for:
   - `from=bitcoin_testnet:btc`
   - `to=starknet_sepolia:wbtc`
2) If supported, design a minimal bridge adapter:
   - Quote → create order → monitor status → credit WBTC (or mock mint).
3) If not supported, keep **mock WBTC** on Sepolia with a “bridge simulation” module.
