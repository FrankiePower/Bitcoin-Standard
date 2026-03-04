/**
 * Minimal Bitcoin JSON-RPC client for vault outpoint monitoring.
 *
 * Supports checking whether monitored outpoints (txid:vout) are still unspent.
 */

interface BitcoinRpcResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string;
}

interface TxOutStatus {
  value: number;
  confirmations: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    desc?: string;
    type?: string;
    address?: string;
  };
  coinbase: boolean;
}

export interface Outpoint {
  txid: string;
  vout: number;
}

export interface OutpointMonitorResult extends Outpoint {
  unspent: boolean;
  confirmations?: number;
  valueBtc?: number;
  scriptPubKeyHex?: string;
}

function getBitcoinRpcConfig() {
  const url = process.env.BITCOIN_RPC_URL;
  const user = process.env.BITCOIN_RPC_USER;
  const pass = process.env.BITCOIN_RPC_PASSWORD;
  const wallet = process.env.BITCOIN_RPC_WALLET;

  if (!url || !user || !pass) return null;
  const endpoint = wallet ? `${url.replace(/\/$/, "")}/wallet/${wallet}` : url;
  return { endpoint, user, pass };
}

async function bitcoinRpc<T>(method: string, params: unknown[]): Promise<T> {
  const cfg = getBitcoinRpcConfig();
  if (!cfg) {
    throw new Error(
      "Missing Bitcoin RPC env vars: BITCOIN_RPC_URL, BITCOIN_RPC_USER, BITCOIN_RPC_PASSWORD",
    );
  }

  const body = {
    jsonrpc: "1.0",
    id: "oracle-service",
    method,
    params,
  };

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${cfg.user}:${cfg.pass}`).toString("base64")}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Bitcoin RPC ${method} HTTP ${res.status}`);
  }

  const json = (await res.json()) as BitcoinRpcResponse<T>;
  if (json.error) {
    throw new Error(`Bitcoin RPC ${method} error: ${json.error.message}`);
  }
  return json.result;
}

export function getConfiguredOutpoints(): Outpoint[] {
  const raw = process.env.MONITORED_BTC_OUTPOINTS ?? "";
  if (!raw.trim()) return [];

  const outpoints: Outpoint[] = [];
  for (const item of raw.split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const [txid, voutRaw] = trimmed.split(":");
    const vout = Number(voutRaw);
    if (!txid || !Number.isInteger(vout) || vout < 0) continue;
    outpoints.push({ txid: txid.replace(/^0x/, "").toLowerCase(), vout });
  }
  return outpoints;
}

export async function getOutpointStatus(
  txid: string,
  vout: number,
): Promise<OutpointMonitorResult> {
  const txout = await bitcoinRpc<TxOutStatus | null>("gettxout", [txid, vout, true]);
  if (!txout) {
    return { txid, vout, unspent: false };
  }

  return {
    txid,
    vout,
    unspent: true,
    confirmations: txout.confirmations,
    valueBtc: txout.value,
    scriptPubKeyHex: txout.scriptPubKey?.hex,
  };
}

export async function monitorOutpoints(
  outpoints: Outpoint[],
): Promise<OutpointMonitorResult[]> {
  const results: OutpointMonitorResult[] = [];
  for (const outpoint of outpoints) {
    const status = await getOutpointStatus(outpoint.txid, outpoint.vout);
    results.push(status);
  }
  return results;
}

