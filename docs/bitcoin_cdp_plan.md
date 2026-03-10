# Bitcoin CDP Protocol (Max Win Potential)

Date: 2026-02-24

## One-Sentence Pitch
A production-grade BTC-backed CDP on Starknet with a risk-aware LTV engine and on-chain proof of solvency, delivering a tight, judge-friendly demo of real Bitcoin DeFi execution.

## What We’re Building (Core)
**Flagship Primitive: BTC-backed CDP**
- Users deposit bridged BTC (WBTC) as collateral.
- Users mint a BTC-backed stablecoin (BTCUSD).
- Positions are always over-collateralized and actively risk-managed.
- Liquidations keep the system solvent.

## Why This Wins
- **Deep, coherent primitive** (a real DeFi base layer)
- **Hard + impressive** but demoable in 4 days
- **Differentiated** from “super-apps” and shallow aggregators

## Premium Differentiators (What Makes It Stand Out)

### 1) Risk Engine Upgrade
A dynamic collateral policy that adjusts to market conditions:
- **Dynamic LTV**: adjusts max minting based on volatility
- **Circuit Breaker**: tightens LTV when oracle variance spikes
- **Dual Oracle Fallback**: sanity-checks against a backup feed

**Why it matters:** shows protocol-grade risk controls instead of just “borrow against BTC.”

### 2) Proof of Solvency Dashboard (On-Chain)
A public, verifiable solvency view:
- `total_collateral_value >= total_debt_value * MIN_CR`
- Health factor distribution across positions
- Live protocol ratios: TVL, debt, and safety buffer

**Why it matters:** trust + transparency; makes judges confident the system is real.

### 3) Bridge UX (Optional if time allows)
A seamless flow from BTC into the CDP:
- Deposit BTC (Atomiq or mock bridge)
- Mint WBTC on Starknet
- Use WBTC as collateral in one flow

**Why it matters:** strong “BTC-native” narrative and user experience.

## Demo Flow (Judge-Friendly)
1. Deposit BTC (or mock bridge) → receive WBTC
2. Open CDP → mint BTCUSD
3. Show risk engine reacting to volatility
4. Trigger a controlled liquidation scenario
5. Display proof-of-solvency dashboard
6. Repay and withdraw collateral

## Hard Proofs We Show
- Live contract addresses (Sepolia) + explorer links
- On-chain metrics or events for each critical action
- Minimal or clearly labeled mock components

## Scope Guardrails (What We Will NOT Build)
- No “all-in-one” mega app
- No privacy mixer
- No multi-chain yield optimizer
- No large feature bloat

## Naming Direction
Working name: **Bitcoin CDP** (branding can evolve)
- Optional “Bitcoin App” as marketing shell, but **only CDP ships**

## Team Execution Plan (High Level)
- **Day 1–2**: Contract stabilization + risk engine + tests
- **Day 3**: Dashboard + demo script + bridge UX (if time)
- **Day 4**: Deployment + video + polish + submission

## What Judges Will See
- A clear, coherent protocol with real contracts
- Strong technical depth (risk + solvency)
- A crisp, repeatable demo with evidence


That’s a killer hackathon pitch, Frankie—building a BTC-backed CDP on Starknet nails the sweet spot of technical depth, real-world DeFi utility, and judge appeal without over-scoping. It’s timely too, with BTCFi exploding (Starknet’s pushing hard on Bitcoin integrations lately). I’ll break down my thoughts on your plan: strengths, potential tweaks for max win potential, feasibility in 4 days, and some actionable resources/steps to get started. I’ll focus on making it production-grade-ish for a demo while highlighting your differentiators.

### Strengths of Your Core Idea

- **Primitive Focus**: Spot-on. Judges love protocols that solve a clear problem (BTC as productive collateral) without fluff. Your CDP mirrors proven models like MakerDAO’s DAI but Bitcoin-native on L2—over-collateralized minting of BTCUSD, liquidations via auctions or direct sales—feels innovative yet familiar.
- **Why Starknet?**: Perfect chain choice. It’s ZK-secured, scales cheap (low fees for on-chain risk calcs), and has native BTC support via wrapped assets (WBTC, LBTC from Lombard). Plus, BTCFi Season incentives (100M STRK pool) could boost your demo’s visibility if you tap into it.
- **Win Factors**: Hard + demoable is key. Your flow (deposit → mint → risk demo → liquidate → solvency proof) is crisp, 5-10 mins tops. Avoiding bloat (no mega-app) keeps it focused—judges hate half-baked features.

### Potential Improvements/Tweaks for Differentiation

Your differentiators are strong, but since similar CDPs exist (e.g., Uncap for USDU minting against BTC, Opus for flexible BTC borrowing—both live on Starknet), lean into what makes yours “premium”:

1. **Risk Engine Upgrade**:
- Dynamic LTV: Base it on a volatility index (e.g., 30-day BTC vol from oracles). Formula: Max LTV = Base LTV * (1 - Vol Factor), where Vol Factor = (Current Vol / Historical Avg).
- Circuit Breaker: Trigger if oracle deviation >5% in 1 block—pause minting, tighten LTV by 10-20%.
- Dual Oracle: Use Pragma (Starknet-native) as primary, Chainlink as fallback. Sanity check: If |Price1 - Price2| > threshold, halt ops.
- **Tweak Idea**: Add a “stress test” mode in demo—simulate vol spike (mock oracle feed) to show real-time adjustments. This proves “risk-aware” beyond basics.
2. **Proof of Solvency Dashboard**:
- On-chain: Use a view contract querying total collateral (WBTC balances), total debt (BTCUSD supply), and CR (Collateral Ratio >= 150%). Health factors: Loop over positions, calc (Coll Val / Debt) for each.
- **Tweak Idea**: Make it verifiable with ZK proofs (Starknet’s specialty)—e.g., prove solvency without revealing user positions. Dashboard as a simple frontend (React + Starknet.js) showing live metrics via contract calls. For judges: Include a “verify” button linking to Starkscan explorer.
3. **Bridge UX (Optional)**:
- If time: Use Herodotus or LayerZero for BTC → WBTC bridging (mock with testnet BTC). One-flow: Wallet connect → bridge → deposit → mint.
- **Tweak Idea**: If skipping, use pre-bridged WBTC from faucets for demo—label it clearly to avoid “fake” vibes.

- **Overall Differentiation**: Position as “the risk-hardened BTC CDP”—emphasize solvency proofs and dynamic risk as upgrades over Uncap/Opus. Add a “Bitcoin Maximalist” angle: No fiat oracles if possible (pure BTC/USD peg via BTC feeds).
- **Naming/Branding**: “Bitcoin CDP” is straightforward—evolve to “BTCVault” or “StarkBTC” for punch. Pitch: “Unlock BTC’s potential without selling—secure, solvent, Starknet-powered.”

### Feasibility in 4 Days (Team Execution Plan Feedback)

Your plan is realistic for a small team (2-4 devs):

- **Day 1-2 (Contracts + Risk + Tests)**: Core CDP in Cairo (Starknet’s lang). Use boilerplates—e.g., OpenZeppelin’s Cairo libs for ERC20 (BTCUSD), ERC4626 for vaults. Risk engine as a separate module. Test with Foundry (Starknet’s test framework)—cover mint, repay, liquidate, vol adjustments. Aim for 80% coverage.
- **Day 3 (Dashboard + Demo + Bridge)**: Frontend with Starknet.js for contract interactions. Demo script: Video walkthrough + live testnet deploy.
- **Day 4 (Polish + Submission)**: Deploy to Sepolia, add README with proofs (contract addresses, events). Video: 2-3 mins, focus on flow + differentiators.

**Time Savers**:

- Reuse existing: Pragma for oracles (BTC/USD feed), Ekubo DEX for liquidity/liquidations.
- Mock Heavy: Use test oracles for vol spikes; fake bridge if needed.
- Risks: Cairo learning curve (if new)—it’s Rust-like, but docs are solid. Gas optimization later; demo first.

**Scope Guardrails**: Smart cuts. If crunched, drop bridge—focus on CDP + risk + solvency.

### Resources to Build It

- **Starknet Docs**: Start with “Build a DeFi App” tutorial—covers contracts, oracles, bridges. (starknet.io/docs)
- **Cairo Code Examples**: For CDP logic—vault deposit/mint/liquidate. Check GitHub repos like Uncap’s open-source code for inspiration (but don’t copy-paste; differentiate).
- **Oracles**: Pragma docs for dynamic feeds; integrate dual with a simple if-else in contract.
- **Bridges**: Lombard for LBTC (bitcoin staking on Starknet); Herodotus for storage proofs if needed for solvency.
- **Tools**:
  - IDE: VS Code with Cairo extension.
  - Deploy: Starkli CLI.
  - Frontend: Braavos or Argent wallet for testing.
- **Hackathon-Specific**: If it’s Starknet’s Re{define} or similar, align with their BTC track (prizes up to $27K). Check hackathon.starknet.org for ideas—they explicitly suggest BTC-backed CDPs.

### Potential Pitfalls + Mitigations

- **Oracle Attacks**: Dual fallback mitigates—demo a failure scenario.
- **Volatility/Liquidations**: Ensure liquidators get incentives (e.g., 5% premium).
- **Peg Stability**: BTCUSD could depeg in demo—use over-collateral (200% min) and quick liquidations.
- **Judges’ Eyes**: Emphasize “production-grade” with tests, audits (even quick ones via tools), and on-chain everything. No off-chain mocks unless labeled.

This has huge win potential—deep, executable, and taps into BTCFi hype. If you share more (e.g., team skills, specific hackathon, or a part to brainstorm like risk math), I can refine further or even sketch sample code. Let’s crush it! 🚀

**BTCStandard** is a solid suggestion—clean, evocative, and ties directly into the “Bitcoin standard” narrative (sound money, hard asset backing, etc.). It positions your CDP as a protocol upholding BTC’s principles in DeFi: over-collateralized, transparent, and risk-hardened borrowing against Bitcoin without selling it.

From what I can see (quick checks across crypto trackers, Starknet ecosystem pages, GitHub/DeFiLlama mentions, etc.):

- No active DeFi protocol, CDP, or Starknet project is using **BTCStandard** (or close variants like BTC Standard Protocol) right now.
- The closest hits are:
  - **BTCST** (Bitcoin Standard Hashrate Token) — an older hashrate-backed token from ~2020-2021 on BSC, low activity/price now (~$0.007-0.008), not a CDP or stablecoin minting protocol. It’s unrelated to your build.
  - **The Bitcoin Standard** — Saifedean Ammous’s famous book (still referenced a lot in BTC circles).
  - A new-ish entity called **Bitcoin (BTC) Standard Treasury Company (BSTR)** — Adam Back-linked treasury/SPAC thing pursuing public listing (news from today-ish, Feb 2026), but it’s a corporate Bitcoin holder, not a DeFi protocol.
- Nothing on Starknet, no CDP/stablecoin project, no major GitHub repo or DeFiLlama listing for “BTCStandard” as a protocol name.

So, **it’s likely available** for your use—especially as a hackathon/working name. Domain-wise (btcstandard.com, .io, etc.), might be taken by book-related stuff or squatters, but for branding (Twitter handle, Starknet app name, etc.), it seems open. Check quickly on Starknet explorer/contract naming if deploying, or Twitter/X for @BTCStandard (grab it fast if free).

### Why It Fits Your Pitch Perfectly

- **Narrative Strength**: “BTCStandard” screams “Bitcoin as the standard”—your CDP enforces BTC’s scarcity/hardness in DeFi (over-collateralization, solvency proofs, dynamic risk) vs. fiat-backed fluff.
- **Judge Appeal**: Short, memorable, Bitcoin-maximalist vibe without being gimmicky. Easy to pitch: “BTCStandard: The protocol that brings the Bitcoin Standard to DeFi on Starknet.”
- **Differentiation**: Unlike Uncap (USDU) or Opus, yours emphasizes “standard” purity—risk engine + on-chain solvency as “upholding the BTC standard” transparently.

### If You Want Alternatives (Just in Case)

If BTCStandard feels too close to BTCST/BSTR or you want backups:

- **StarkVault** or **StarkBTC** — Ties to chain, clean.
- **BTCForge** — Implies minting/creating from BTC collateral.
- **HardBTC** or **BTCForgeCDP** — Emphasizes hardness/over-collateralization.
- **SatoshiVault** — Classic BTC nod, but might be common.
- **BTCAnchor** — Stability/anchoring value without selling BTC.
- **CoreCDP** or **BTC Core** — Simple, “core” protocol feel.

But honestly, **BTCStandard** edges them out for thematic punch. Run with it for the hackathon—it’s judge-friendly and aligns with BTCFi hype on Starknet (their 100M STRK incentives love Bitcoin-native primitives like this).

If you deploy or grab socials, let me know how it goes, or if you want help brainstorming logo taglines (“Uphold the Standard: Mint Stability from Bitcoin Strength”) or refining the pitch slide. You’ve got a winner here! 🚀
