/**
 * POST /api/bitcoin/finalize
 * Body: { psbt: string }
 *
 * Finalizes a signed PSBT into a broadcast-ready hex transaction,
 * then broadcasts it and mines 1 block to confirm.
 */

export const runtime = "nodejs";

const RPC_BASE = "http://127.0.0.1:18443";
const RPC_AUTH = "Basic " + Buffer.from("user:password").toString("base64");

let _id = 0;
async function rpc(method: string, params: unknown[], wallet?: string) {
  const url = wallet ? `${RPC_BASE}/wallet/${wallet}` : RPC_BASE;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: RPC_AUTH },
    body: JSON.stringify({ jsonrpc: "1.0", id: String(++_id), method, params }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

export async function POST(request: Request) {
  try {
    const { psbt } = await request.json().catch(() => ({}));
    if (!psbt) return Response.json({ ok: false, error: "psbt required" }, { status: 400 });

    // Finalize PSBT → hex
    const finalized = await rpc("finalizepsbt", [psbt]);
    if (!finalized.complete) {
      return Response.json({
        ok: false,
        error: "PSBT not fully signed",
        hex: finalized.hex,
      }, { status: 400 });
    }

    // Broadcast
    const txid: string = await rpc("sendrawtransaction", [finalized.hex]);

    // Mine 1 block to confirm
    const minerAddr: string = await rpc("getnewaddress", [], "miner");
    const blocks: string[] = await rpc("generatetoaddress", [1, minerAddr]);

    return Response.json({ ok: true, txid, blockHash: blocks[0] });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? "finalize failed" }, { status: 500 });
  }
}
