/**
 * Starknet MockOracle interactions
 * Pushes BTC price + volatility to the on-chain MockOracle contract.
 */

import { RpcProvider, Account, Contract, cairo } from "starknet";

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

function buildAccount(): Account {
  const rpc = process.env.STARKNET_RPC_URL;
  const addr = process.env.ACCOUNT_ADDRESS;
  const pk = process.env.PRIVATE_KEY;

  if (!rpc || !addr || !pk) {
    throw new Error(
      "Missing env vars: STARKNET_RPC_URL, ACCOUNT_ADDRESS, PRIVATE_KEY",
    );
  }

  const provider = new RpcProvider({ nodeUrl: rpc });
  return new Account(provider, addr, pk);
}

function buildOracle(account: Account): Contract {
  const addr = process.env.MOCK_ORACLE_ADDRESS;
  if (!addr) throw new Error("Missing env var: MOCK_ORACLE_ADDRESS");
  return new Contract(MOCK_ORACLE_ABI as any, addr, account);
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
