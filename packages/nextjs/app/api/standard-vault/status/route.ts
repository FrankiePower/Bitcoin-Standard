import { getStandardVaultStatus } from "~~/lib/standardVaultBridge";

export const runtime = "nodejs";
export const revalidate = 3;

export async function GET(_: Request) {
  try {
    const status = await getStandardVaultStatus();
    return Response.json(status, { status: status.available ? 200 : 503 });
  } catch (e: any) {
    return Response.json(
      {
        available: false,
        bridgeMode: "direct",
        error: e?.message ?? "Failed to query standard_vault status",
      },
      { status: 500 },
    );
  }
}
