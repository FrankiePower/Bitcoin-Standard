# BTCStandard UX + Storytelling Plan

Created: 2026-03-09
Status: Deferred until core engineering completion

## Goal

Match top competitor polish in UX and narrative clarity while preserving BTCStandard's stronger trust-minimized architecture.

Core message to repeat everywhere:

`Lock real BTC on Bitcoin. Mint BTCUSD on Starknet. Collateral enforced by Bitcoin consensus.`

## Narrative Framework

Use one consistent 3-step story across homepage, README, demo script, and presenter voiceover:

1. `Lock BTC on Bitcoin` (Taproot OP_CAT vault)
2. `Mint BTCUSD on Starknet` (debt ledger only)
3. `Repay or Liquidate via Bitcoin-enforced vault paths`

## UX Execution Checklist

- Define one user-facing promise line and use it in all product surfaces.
- Add a lifecycle status rail with explicit chain labels (Bitcoin vs Starknet):
  - `Vault detected`
  - `Vault registered`
  - `Debt minted`
  - `Healthy / At risk`
  - `Repaid` or `Liquidated`
- For each status, show:
  - What happened
  - Which chain it happened on
  - Proof link (tx hash / explorer link)
- Replace abstract examples with fixed demo scenarios and concrete values.
- Add quick action defaults:
  - `Max mint at safe LTV`
  - `Repay 25% / 50% / 100%`
- Keep advanced controls behind `Advanced`.

## Messaging and Positioning

- Add a concise comparison table in README:
  - BTCStandard vs wrapped-BTC CDPs vs payment-relay/oracle systems
- Keep one canonical vocabulary:
  - `vault`, `position`, `health factor`, `liquidation attestation`
- Remove or rewrite any legacy wording (`wBTC`, bridge-first framing).

## Deliverables

- Homepage copy refresh (single promise + 3-step story)
- README narrative refresh (same story order)
- Demo script update with fixed numbers and judge-friendly flow
- UI status/proof rail implementation
- Comparison table section in docs

## Success Criteria

- A first-time viewer can explain the protocol in under 20 seconds.
- A judge can follow every lifecycle step without verbal clarification.
- Every core claim in the demo has a visible on-chain proof link.
