/**
 * BTCStandard Phase 2 contract addresses and ABIs — Starknet Sepolia
 *
 * These are the native Bitcoin CDP contracts (VaultRegistry, CDPCore, BTSUSDToken, MockOracle).
 * Addresses are hardcoded for Sepolia. Swap to mainnet addresses when deploying.
 */

// ─── Addresses ─────────────────────────────────────────────────────────────────

export const NATIVE_ADDRESSES = {
  VAULT_REGISTRY:
    "0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae",
  CDP_CORE:
    "0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879",
  BTSUSD_TOKEN:
    "0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd",
  MOCK_ORACLE:
    "0x04ed3d329fffa670f2a728444a9b53d0cae859a4397adfbde1622e0303041f14",
} as const;

// ─── Shared types ──────────────────────────────────────────────────────────────

const U256_STRUCT = {
  type: "struct",
  name: "core::integer::u256",
  members: [
    { name: "low", type: "core::integer::u128" },
    { name: "high", type: "core::integer::u128" },
  ],
} as const;

const BOOL_ENUM = {
  type: "enum",
  name: "core::bool",
  variants: [
    { name: "False", type: "()" },
    { name: "True", type: "()" },
  ],
} as const;

// ─── CDPCore ABI ───────────────────────────────────────────────────────────────

export const CDP_CORE_ABI = [
  U256_STRUCT,
  {
    type: "impl",
    name: "CDPCoreImpl",
    interface_name: "contracts::interfaces::ICDPCore",
  },
  {
    type: "interface",
    name: "contracts::interfaces::ICDPCore",
    items: [
      {
        type: "function",
        name: "register_vault",
        inputs: [
          { name: "txid", type: "core::felt252" },
          { name: "btc_amount", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "mint_debt",
        inputs: [
          { name: "txid", type: "core::felt252" },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "repay_debt",
        inputs: [
          { name: "txid", type: "core::felt252" },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "liquidate",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "get_health_factor",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_position",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [{ type: "(core::integer::u256, core::integer::u256)" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_protocol_stats",
        inputs: [],
        outputs: [{ type: "(core::integer::u256, core::integer::u256)" }],
        state_mutability: "view",
      },
    ],
  },
] as const;

// ─── VaultRegistry ABI ────────────────────────────────────────────────────────

export const VAULT_REGISTRY_ABI = [
  U256_STRUCT,
  BOOL_ENUM,
  {
    type: "enum",
    name: "contracts::interfaces::VaultState",
    variants: [
      { name: "Active", type: "()" },
      { name: "Repaid", type: "()" },
      { name: "Liquidated", type: "()" },
    ],
  },
  {
    type: "struct",
    name: "contracts::interfaces::VaultInfo",
    members: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      { name: "btc_amount", type: "core::integer::u256" },
      { name: "state", type: "contracts::interfaces::VaultState" },
      { name: "registered_at", type: "core::integer::u64" },
    ],
  },
  {
    type: "impl",
    name: "VaultRegistryImpl",
    interface_name: "contracts::interfaces::IVaultRegistry",
  },
  {
    type: "interface",
    name: "contracts::interfaces::IVaultRegistry",
    items: [
      {
        type: "function",
        name: "get_vault",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [{ type: "contracts::interfaces::VaultInfo" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "is_active",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_btc_amount",
        inputs: [{ name: "txid", type: "core::felt252" }],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_total_vaults",
        inputs: [],
        outputs: [{ type: "core::integer::u64" }],
        state_mutability: "view",
      },
    ],
  },
] as const;

// ─── BTSUSDToken ABI (ERC20) ───────────────────────────────────────────────────

export const BTSUSD_TOKEN_ABI = [
  U256_STRUCT,
  {
    type: "function",
    name: "balance_of",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "total_supply",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
] as const;

// ─── MockOracle ABI ────────────────────────────────────────────────────────────

export const MOCK_ORACLE_ABI = [
  U256_STRUCT,
  {
    type: "function",
    name: "get_btc_price",
    inputs: [],
    outputs: [{ type: "(core::integer::u256, core::integer::u64)" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_btc_volatility",
    inputs: [],
    outputs: [{ type: "core::integer::u128" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "is_price_stale",
    inputs: [],
    outputs: [{ type: "core::bool" }],
    state_mutability: "view",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert the first 31 bytes of a Bitcoin txid (64 hex chars) to a felt252 string */
export function txidToFelt(txid: string): string {
  const clean = txid.startsWith("0x") ? txid.slice(2) : txid;
  // felt252 max is 252 bits = 31.5 bytes, so we take 31 bytes (62 hex chars)
  return "0x" + clean.slice(0, 62).toLowerCase();
}

/** Parse a u256 from starknet-react response (returns bigint) */
export function parseU256(raw: any): bigint {
  if (!raw) return BigInt(0);
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") return BigInt(raw);
  if (typeof raw === "string") return BigInt(raw);
  // {low, high} struct
  if (raw.low !== undefined && raw.high !== undefined) {
    return BigInt(raw.low) + (BigInt(raw.high) << BigInt(128));
  }
  // [low, high] tuple — true array or object with numeric keys (starknet-react tuples)
  const r0 = Array.isArray(raw) ? raw[0] : (raw[0] ?? raw["0"]);
  const r1 = Array.isArray(raw) ? raw[1] : (raw[1] ?? raw["1"]);
  if (r0 !== undefined && r1 !== undefined) {
    return BigInt(r0) + (BigInt(r1) << BigInt(128));
  }
  try {
    return BigInt(raw.toString());
  } catch {
    return BigInt(0);
  }
}

/** BTC amount in satoshis → formatted BTC string */
export function formatBTC(sats: bigint, decimals = 8): string {
  if (sats === BigInt(0)) return "0";
  const SATS_PER_BTC = BigInt(100000000);
  const whole = sats / SATS_PER_BTC;
  const frac = sats % SATS_PER_BTC;
  const fracStr = frac.toString().padStart(8, "0").slice(0, decimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}

/** BTSUSD amount (18 decimals) → formatted string */
export function formatBTSUSD(amount: bigint, decimals = 2): string {
  if (amount === BigInt(0)) return "0";
  const divisor = BigInt("1000000000000000000");
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(18, "0").slice(0, decimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}
