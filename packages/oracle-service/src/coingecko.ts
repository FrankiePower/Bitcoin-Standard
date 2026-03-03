/**
 * CoinGecko price + volatility fetching
 *
 * Endpoints used:
 *   /simple/price         → current BTC/USD price + 24h change
 *   /coins/bitcoin/market_chart?days=30&interval=daily → 30-day daily prices for volatility
 */

const BASE = "https://api.coingecko.com/api/v3";

function headers(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

export interface BTCPrice {
  /** USD price, e.g. 69407.52 */
  usd: number;
  /** 24h change percentage, e.g. 2.15 */
  usd_24h_change: number;
}

/** Fetch current BTC price from CoinGecko simple/price endpoint */
export async function fetchBTCPrice(): Promise<BTCPrice> {
  const url = `${BASE}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`CoinGecko /simple/price HTTP ${res.status}`);
  const json = (await res.json()) as {
    bitcoin: { usd: number; usd_24h_change: number };
  };
  return { usd: json.bitcoin.usd, usd_24h_change: json.bitcoin.usd_24h_change };
}

/** Fetch 30-day daily BTC prices for volatility calculation */
async function fetch30DayPrices(): Promise<number[]> {
  const url = `${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`CoinGecko /market_chart HTTP ${res.status}`);
  const json = (await res.json()) as { prices: [number, number][] };
  return json.prices.map(([, price]) => price);
}

/**
 * Calculate annualized realized volatility from daily price series.
 * Returns a value with 8 decimal places (e.g. 7076538586 = 70.76538586%).
 */
export async function fetchBTCVolatility(): Promise<bigint> {
  const prices = await fetch30DayPrices();

  if (prices.length < 2) throw new Error("Not enough price data for volatility");

  // Daily log returns
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
  }

  // Sample standard deviation of daily returns
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    (logReturns.length - 1);
  const dailyVol = Math.sqrt(variance);

  // Annualize: σ_annual = σ_daily * sqrt(365)
  const annualVol = dailyVol * Math.sqrt(365);

  // Scale to 8 decimals
  const scaled = Math.round(annualVol * 1e8);
  return BigInt(scaled);
}

/** Fetch full BTC market data (for the dashboard API route) */
export async function fetchBTCMarket() {
  const url = `${BASE}/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`CoinGecko /coins/markets HTTP ${res.status}`);
  const json = await res.json();
  return json[0] ?? null;
}
