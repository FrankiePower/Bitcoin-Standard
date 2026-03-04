/**
 * Starknet MockOracle interactions
 * Pushes BTC price + volatility to MockOracle and monitors native BTC vault health.
 */

import { RpcProvider, Account, Contract, cairo, hash } from "starknet";

// Minimal ABI — only the two write functions we call
const MOCK_ORACLE_ABI = [
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      { name: "low", type: "core::integer::u128" },
      { name: "high", type: "core::integer::u128" },
    ],
  },
  {
    type: "function",
    name: "set_btc_price",
    inputs: [{ name: "price", type: "core::integer::u256" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    type: "function",
    name: "set_btc_volatility",
    inputs: [{ name: "volatility", type: "core::integer::u128" }],
    outputs: [],
    state_mutability: "external",
  },
] as const;

const CDP_CORE_ABI = [
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      { name: "low", type: "core::integer::u128" },
      { name: "high", type: "core::integer::u128" },
    ],
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
    name: "liquidate",
    inputs: [{ name: "txid", type: "core::felt252" }],
    outputs: [],
    state_mutability: "external",
  },
] as const;

const DEFAULT_VAULT_REGISTRY =
  "0x0147864dd4a1c9849cbdaea58c22cdc36fe42a66c1102bc02ec4668932937bae";
const DEFAULT_CDP_CORE =
  "0x070985a3cf9817e50a90bc2d3550f77d64f8a9bebc71577172295682f9580879";

type U256Like =
  | bigint
  | string
  | number
  | { low: bigint | string | number; high: bigint | string | number }
  | [bigint | string | number, bigint | string | number]
  | undefined
  | null;

function buildProvider(): RpcProvider {
  const rpc = process.env.STARKNET_RPC_URL;
  if (!rpc) throw new Error("Missing env var: STARKNET_RPC_URL");
  return new RpcProvider({ nodeUrl: rpc });
}

function buildAccount(): Account {
  const provider = buildProvider();
  const addr = process.env.ACCOUNT_ADDRESS;
  const pk = process.env.PRIVATE_KEY;

  if (!addr || !pk) {
    throw new Error(
      "Missing env vars: ACCOUNT_ADDRESS, PRIVATE_KEY",
    );
  }
  return new Account({
    provider,
    address: addr,
    signer: pk,
    cairoVersion: "1",
  });
}

function buildOracle(account: Account): Contract {
  const addr = process.env.MOCK_ORACLE_ADDRESS;
  if (!addr) throw new Error("Missing env var: MOCK_ORACLE_ADDRESS");
  return new Contract({
    abi: MOCK_ORACLE_ABI as any,
    address: addr,
    providerOrAccount: account,
  });
}

function buildCDPCore(account: Account): Contract {
  const addr = process.env.CDP_CORE_ADDRESS ?? DEFAULT_CDP_CORE;
  return new Contract({
    abi: CDP_CORE_ABI as any,
    address: addr,
    providerOrAccount: account,
  });
}

function parseU256(raw: U256Like): bigint {
  if (raw === null || raw === undefined) return BigInt(0);
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "string") return BigInt(raw);
  if (typeof raw === "number") return BigInt(raw);
  if (Array.isArray(raw)) {
    return BigInt(raw[0]) + (BigInt(raw[1]) << BigInt(128));
  }
  if (typeof raw === "object" && "low" in raw && "high" in raw) {
    return BigInt(raw.low) + (BigInt(raw.high) << BigInt(128));
  }
  return BigInt(0);
}

export interface VaultHealth {
  txidFelt: string;
  debt: bigint;
  healthFactor: bigint;
  liquidatable: boolean;
}

export function txidHexToFelt(txid: string): string {
  const clean = txid.startsWith("0x") ? txid.slice(2) : txid;
  return `0x${clean.slice(0, 62).toLowerCase()}`;
}

export function txidFeltToHex31(txidFelt: string): string {
  const clean = txidFelt.startsWith("0x") ? txidFelt.slice(2) : txidFelt;
  return `0x${clean.padStart(62, "0")}`;
}

export async function fetchRegisteredVaultTxidsFromEvents(): Promise<string[]> {
  const provider = buildProvider();
  const vaultRegistry = process.env.VAULT_REGISTRY_ADDRESS ?? DEFAULT_VAULT_REGISTRY;
  const selector = hash.getSelectorFromName("VaultRegistered");

  const discovered = new Set<string>();
  let continuationToken: string | undefined = undefined;
  do {
    const page: any = await provider.getEvents({
      address: vaultRegistry,
      keys: [[selector]],
      chunk_size: 100,
      continuation_token: continuationToken,
    } as any);

    for (const event of page.events ?? []) {
      const txidKey = event.keys?.[1] ?? event.data?.[0];
      if (txidKey !== undefined) {
        const txidFelt =
          typeof txidKey === "string" ? txidKey : `0x${BigInt(txidKey).toString(16)}`;
        discovered.add(txidFelt.toLowerCase());
      }
    }
    continuationToken = page.continuation_token ?? undefined;
  } while (continuationToken);

  return [...discovered];
}

export async function readVaultHealth(txidFelt: string): Promise<VaultHealth> {
  const account = buildAccount();
  const cdp = buildCDPCore(account);

  const positionRaw: any = await cdp.get_position(txidFelt);
  const debtField = Array.isArray(positionRaw)
    ? positionRaw[1]
    : (positionRaw?.[1] ?? positionRaw?.["1"] ?? positionRaw?.debt);
  const debt = parseU256(debtField);

  const healthFactorRaw: any = await cdp.get_health_factor(txidFelt);
  const healthFactor = parseU256(healthFactorRaw);

  return {
    txidFelt,
    debt,
    healthFactor,
    liquidatable: debt > BigInt(0) && healthFactor < BigInt(100),
  };
}

export async function liquidateVault(txidFelt: string): Promise<string> {
  const account = buildAccount();
  const cdp = buildCDPCore(account);
  const tx = await cdp.liquidate(txidFelt);
  await account.waitForTransaction(tx.transaction_hash);
  return tx.transaction_hash;
}

/**
 * Push BTC/USD price to MockOracle.
 * @param priceUSD - e.g. 69407.52 → stored as 6940752000000 (8 decimals)
 */
export async function pushBTCPrice(priceUSD: number): Promise<string> {
  const account = buildAccount();
  const oracle = buildOracle(account);

  // Convert to 8-decimal integer
  const price8dec = BigInt(Math.round(priceUSD * 1e8));

  const tx = await oracle.set_btc_price(cairo.uint256(price8dec));
  await account.waitForTransaction(tx.transaction_hash);
  return tx.transaction_hash;
}

/**
 * Push annualized realized volatility to MockOracle.
 * @param volatility - u128 already scaled to 8 decimals (e.g. 7076538586 = 70.76%)
 */
export async function pushBTCVolatility(volatility: bigint): Promise<string> {
  const account = buildAccount();
  const oracle = buildOracle(account);

  const tx = await oracle.set_btc_volatility(volatility);
  await account.waitForTransaction(tx.transaction_hash);
  return tx.transaction_hash;
}
