import { callBitcoinApi, getBitcoinApiBaseUrl } from "~~/lib/bitcoinApiBridge";

export const runtime = "nodejs";

export async function GET(_: Request) {
  const checks = ["/health", "/status"] as const;

  for (const path of checks) {
    const result = await callBitcoinApi(path, "GET");
    if (result.ok) {
      return Response.json(
        {
          ok: true,
          available: true,
          baseUrl: getBitcoinApiBaseUrl(),
          endpoint: path,
          data: result.data,
        },
        { status: 200 },
      );
    }
  }

  return Response.json(
    {
      ok: false,
      available: false,
      baseUrl: getBitcoinApiBaseUrl(),
      error: "Bitcoin API unavailable",
    },
    { status: 503 },
  );
}
