import { createRegtestAddress } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const wallet =
      typeof body.wallet === "string" && body.wallet.trim().length > 0
        ? body.wallet.trim()
        : "btcstd_demo";

    const result = await createRegtestAddress(wallet);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        wallet: "btcstd_demo",
        error: e?.message ?? "Failed to create regtest address",
        output: "",
      },
      { status: 500 },
    );
  }
}
