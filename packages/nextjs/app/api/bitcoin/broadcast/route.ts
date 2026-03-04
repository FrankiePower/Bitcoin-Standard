import { callBitcoinApi } from "~~/lib/bitcoinApiBridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await callBitcoinApi("/broadcast", "POST", body);

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error: result.error ?? "Failed to broadcast transaction",
          upstreamStatus: result.status,
          data: result.data,
        },
        { status: result.status >= 400 ? result.status : 500 },
      );
    }

    return Response.json({ ok: true, ...result.data }, { status: 200 });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "Failed to broadcast transaction" },
      { status: 500 },
    );
  }
}
