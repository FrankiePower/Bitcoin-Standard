import { liquidateVault } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(_: Request) {
  try {
    const result = await liquidateVault();
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        action: "liquidate",
        error: e?.message ?? "Liquidation failed",
      },
      { status: 500 },
    );
  }
}
