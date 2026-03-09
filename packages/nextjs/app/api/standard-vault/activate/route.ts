import { activateVault } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { txid, vout = 0, amountSats } = await request.json();
    if (!txid || typeof txid !== "string") {
      return Response.json(
        { ok: false, action: "activate", error: "txid required" },
        { status: 400 },
      );
    }
    if (typeof amountSats !== "number" || amountSats <= 0) {
      return Response.json(
        { ok: false, action: "activate", error: "amountSats required" },
        { status: 400 },
      );
    }
    const result = await activateVault(txid, vout, amountSats);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      { ok: false, action: "activate", error: e?.message ?? "Activate failed" },
      { status: 500 },
    );
  }
}
