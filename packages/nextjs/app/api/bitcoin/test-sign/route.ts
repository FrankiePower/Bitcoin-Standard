/**
 * POST /api/bitcoin/test-sign
 * Body: { fromAddress: string, toAddress?: string, amount?: number }
 *
 * 1. Scans UTXOs for fromAddress on the local regtest node.
 * 2. Builds a PSBT spending that UTXO → toAddress (defaults to self).
 * 3. Runs utxoupdatepsbt so the PSBT carries witness UTXO data for Xverse.
 * 4. Returns the PSBT base64 ready for signPsbt.
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
    const { fromAddress, toAddress, amount = 1 } = await request.json().catch(() => ({}));

    if (!fromAddress) {
      return Response.json({ ok: false, error: "fromAddress required" }, { status: 400 });
    }

    // 1. Find UTXOs for fromAddress
    const scan = await rpc("scantxoutset", ["start", [`addr(${fromAddress})`]]);
    const unspents: any[] = scan.unspents ?? [];
    if (!unspents.length) {
      return Response.json({ ok: false, error: `No UTXOs found for ${fromAddress}` }, { status: 400 });
    }
    const utxo = unspents[0];

    // 2. Destination: caller-supplied or send-to-self (avoids miner wallet dependency)
    const destination = toAddress ?? fromAddress;

    const fee = 0.0001;
    const sendAmount = parseFloat((Math.min(amount, utxo.amount - fee)).toFixed(8));
    if (sendAmount <= 0) {
      return Response.json({ ok: false, error: "Insufficient UTXO balance" }, { status: 400 });
    }

    // 3. Create raw PSBT
    const rawPsbt: string = await rpc("createpsbt", [
      [{ txid: utxo.txid, vout: utxo.vout }],
      [{ [destination]: sendAmount }],
    ]);

    // 4. Attach witness UTXO data (required for Taproot / SegWit signing in Xverse)
    const psbt: string = await rpc("utxoupdatepsbt", [rawPsbt]);

    return Response.json({
      ok: true,
      psbt,
      utxo: { txid: utxo.txid, vout: utxo.vout, amount: utxo.amount },
      destination,
      sendAmount,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? "test-sign failed" }, { status: 500 });
  }
}
