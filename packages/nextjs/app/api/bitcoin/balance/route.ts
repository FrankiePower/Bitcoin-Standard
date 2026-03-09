/**
 * GET /api/bitcoin/balance?address=<btcAddress>
 * Returns the confirmed BTC balance for any address via scantxoutset.
 */

export const runtime = "nodejs";

const RPC_BASE = "http://127.0.0.1:18443";
const RPC_AUTH = "Basic " + Buffer.from("user:password").toString("base64");

let _id = 0;
async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: RPC_AUTH },
    body: JSON.stringify({ jsonrpc: "1.0", id: String(++_id), method, params }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    if (!address) {
      return Response.json(
        { ok: false, error: "address required" },
        { status: 400 },
      );
    }

    const scan = await rpc("scantxoutset", ["start", [`addr(${address})`]]);

    return Response.json({
      ok: true,
      balance: scan.total_amount ?? 0,
      utxos: scan.unspents?.length ?? 0,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "balance fetch failed" },
      { status: 500 },
    );
  }
}
