export type BitcoinApiResult = {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
};

function getBitcoinApiUrl(): string {
  return (
    process.env.BITCOIN_API_URL ||
    process.env.NEXT_PUBLIC_BITCOIN_API_URL ||
    "http://127.0.0.1:4040"
  );
}

export function getBitcoinApiBaseUrl() {
  return getBitcoinApiUrl();
}

export async function callBitcoinApi(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<BitcoinApiResult> {
  const baseUrl = getBitcoinApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = { message: await response.text().catch(() => "") };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        error: data?.message || `Bitcoin API HTTP ${response.status}`,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      data: null,
      error: e?.message || "Failed to reach bitcoin API",
    };
  }
}
