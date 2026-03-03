/**
 * BTC price chart + market data for the frontend dashboard.
 *
 * Returns:
 *   - 30-day daily price series (for recharts sparkline)
 *   - Market cap, volume, circulating supply
 *   - 1h / 24h / 7d / 30d price change percentages
 */

export const revalidate = 300; // cache 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") ?? "30";

  const key = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = key
    ? { "x-cg-demo-api-key": key }
    : {};

  try {
    // Fetch market chart (price history) + coin metadata in parallel
    const [chartRes, coinRes] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart` +
          `?vs_currency=usd&days=${days}&interval=daily`,
        { headers, next: { revalidate: 300 } },
      ),
      fetch(
        `https://api.coingecko.com/api/v3/coins/markets` +
          `?vs_currency=usd&ids=bitcoin&order=market_cap_desc` +
          `&sparkline=false&price_change_percentage=1h,24h,7d,30d`,
        { headers, next: { revalidate: 300 } },
      ),
    ]);

    if (!chartRes.ok) throw new Error(`chart HTTP ${chartRes.status}`);
    if (!coinRes.ok) throw new Error(`coin HTTP ${coinRes.status}`);

    const chartJson = (await chartRes.json()) as {
      prices: [number, number][];
      market_caps: [number, number][];
      total_volumes: [number, number][];
    };
    const coinJson = (await coinRes.json()) as any[];
    const coin = coinJson[0] ?? {};

    // Normalize chart data for recharts
    const prices = chartJson.prices.map(([ts, price]) => ({
      time: ts,
      date: new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.round(price * 100) / 100,
    }));

    const volumes = chartJson.total_volumes.map(([ts, vol]) => ({
      time: ts,
      volume: Math.round(vol),
    }));

    return Response.json({
      prices,
      volumes,
      market: {
        price: coin.current_price ?? 0,
        market_cap: coin.market_cap ?? 0,
        volume_24h: coin.total_volume ?? 0,
        circulating_supply: coin.circulating_supply ?? 0,
        change_1h: coin.price_change_percentage_1h_in_currency ?? 0,
        change_24h: coin.price_change_percentage_24h ?? 0,
        change_7d: coin.price_change_percentage_7d_in_currency ?? 0,
        change_30d: coin.price_change_percentage_30d_in_currency ?? 0,
        ath: coin.ath ?? 0,
        ath_change_percentage: coin.ath_change_percentage ?? 0,
      },
    });
  } catch (err) {
    console.error("btc-chart API error:", err);
    return Response.json(
      { error: "Failed to fetch BTC market data" },
      { status: 500 },
    );
  }
}
