import { prepareVault } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(_: Request) {
  try {
    const result = await prepareVault();
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      { ok: false, action: "prepare", error: e?.message ?? "Prepare failed" },
      { status: 500 },
    );
  }
}
