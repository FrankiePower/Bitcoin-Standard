import { timeoutVault } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const destination =
      typeof body?.destination === "string" ? body.destination.trim() : "";
    const result = await timeoutVault(destination || undefined);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: any) {
    return Response.json(
      { ok: false, action: "timeout", error: e?.message ?? "Timeout failed" },
      { status: 500 },
    );
  }
}
