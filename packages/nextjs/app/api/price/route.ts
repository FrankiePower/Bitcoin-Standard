// Cache price data for 60 seconds to avoid hammering CoinGecko
export const revalidate = 60;

export async function GET(_: Request) {
  const key = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = key
    ? { "x-cg-demo-api-key": key }
    : {};

  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,starknet" +
      "&vs_currencies=usd" +
      "&include_24hr_change=true" +
      "&include_market_cap=true" +
      "&include_24hr_vol=true";

    const response = await fetch(url, { headers, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);

    const json = await response.json();
    return Response.json(json);
  } catch {
    return Response.json({
      bitcoin: { usd: 0, usd_24h_change: 0, usd_market_cap: 0, usd_24h_vol: 0 },
      starknet: { usd: 0, usd_24h_change: 0 },
    });
  }
}
