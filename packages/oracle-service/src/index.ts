/**
 * BTCStandard Oracle Service
 *
 * Keeps the on-chain MockOracle in sync with real BTC market data from CoinGecko.
 *
 * Schedule:
 *   - Price update:      every 5 minutes  (PRICE_UPDATE_INTERVAL)
 *   - Volatility update: every 60 minutes (VOLATILITY_UPDATE_INTERVAL)
 *
 * Usage:
 *   cp .env.example .env   # fill in keys
 *   npm run start
 */

import cron from "node-cron";
import { fetchBTCPrice, fetchBTCVolatility } from "./coingecko.js";
import { pushBTCPrice, pushBTCVolatility } from "./starknet.js";

// Load .env if present (tsx doesn't auto-load it)
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const envPath = resolve(process.cwd(), ".env");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && !key.startsWith("#") && rest.length) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
} catch {
  // .env not found — rely on shell env
}

const PRICE_INTERVAL = parseInt(process.env.PRICE_UPDATE_INTERVAL ?? "5");
const VOL_INTERVAL = parseInt(process.env.VOLATILITY_UPDATE_INTERVAL ?? "60");

// ─── Price Update ──────────────────────────────────────────────────────────────

async function updatePrice() {
  const ts = new Date().toISOString();
  try {
    const { usd, usd_24h_change } = await fetchBTCPrice();
    console.log(
      `[${ts}] CoinGecko BTC price: $${usd.toFixed(2)} (${usd_24h_change >= 0 ? "+" : ""}${usd_24h_change.toFixed(2)}% 24h)`,
    );

    const txHash = await pushBTCPrice(usd);
    console.log(`[${ts}] ✅ set_btc_price → ${txHash}`);
  } catch (err) {
    console.error(`[${ts}] ❌ Price update failed:`, err);
  }
}

// ─── Volatility Update ─────────────────────────────────────────────────────────

async function updateVolatility() {
  const ts = new Date().toISOString();
  try {
    const volatility = await fetchBTCVolatility();
    const volPct = (Number(volatility) / 1e8).toFixed(2);
    console.log(
      `[${ts}] Calculated 30-day annualized volatility: ${volPct}% (${volatility} raw)`,
    );

    const txHash = await pushBTCVolatility(volatility);
    console.log(`[${ts}] ✅ set_btc_volatility → ${txHash}`);
  } catch (err) {
    console.error(`[${ts}] ❌ Volatility update failed:`, err);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

console.log("BTCStandard Oracle Service starting...");
console.log(
  `  Price updates: every ${PRICE_INTERVAL} minutes → MockOracle.set_btc_price()`,
);
console.log(
  `  Volatility updates: every ${VOL_INTERVAL} minutes → MockOracle.set_btc_volatility()`,
);
console.log(`  Oracle: ${process.env.MOCK_ORACLE_ADDRESS ?? "(not set)"}`);
console.log("");

// Run immediately on start
updatePrice();
updateVolatility();

// Schedule recurring updates
cron.schedule(`*/${PRICE_INTERVAL} * * * *`, updatePrice);
cron.schedule(`*/${VOL_INTERVAL} * * * *`, updateVolatility);
