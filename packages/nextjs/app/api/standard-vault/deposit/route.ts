import { depositVault } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(_: Request) {
  try {
    const result = await depositVault();
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      { ok: false, action: "deposit", error: e?.message ?? "Deposit failed" },
      { status: 500 },
    );
  }
}
