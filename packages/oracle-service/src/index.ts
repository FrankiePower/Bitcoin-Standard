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
import {
  fetchRegisteredVaultTxidsFromEvents,
  liquidateVault,
  pushBTCPrice,
  pushBTCVolatility,
  readVaultHealth,
  txidFeltToHex31,
  txidHexToFelt,
} from "./starknet.js";
import { getConfiguredOutpoints, monitorOutpoints } from "./bitcoin.js";
import { persistAttestation, signAttestation } from "./attestations.js";

// Load .env if present (tsx doesn't auto-load it)
import { readFileSync, writeFileSync } from "fs";
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
const HEALTH_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL ?? "2");
const BTC_UTXO_INTERVAL = parseInt(process.env.BTC_UTXO_CHECK_INTERVAL ?? "2");
const MONITOR_REGISTRY_EVENTS =
  (process.env.MONITOR_REGISTRY_EVENTS ?? "true").toLowerCase() !== "false";
const AUTO_LIQUIDATE =
  (process.env.AUTO_LIQUIDATE ?? "false").toLowerCase() === "true";
const STATE_PATH = resolve(
  process.cwd(),
  process.env.ORACLE_STATE_PATH ?? ".oracle-state.json",
);

type OracleState = {
  debtByVault: Record<string, string>;
  outpointSpent: Record<string, boolean>;
};

let state: OracleState = { debtByVault: {}, outpointSpent: {} };

try {
  const loaded = JSON.parse(readFileSync(STATE_PATH, "utf8")) as OracleState;
  state = {
    debtByVault: loaded.debtByVault ?? {},
    outpointSpent: loaded.outpointSpent ?? {},
  };
} catch {
  // first run
}

function persistState() {
  try {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist oracle state:", err);
  }
}

function getConfiguredVaultTxids(): string[] {
  const raw = process.env.MONITORED_TXIDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(txidHexToFelt);
}

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

// ─── Vault Health Monitoring ───────────────────────────────────────────────────

async function monitorVaultHealth() {
  const ts = new Date().toISOString();
  try {
    const txids = new Set<string>();

    for (const felt of getConfiguredVaultTxids()) txids.add(felt);
    if (MONITOR_REGISTRY_EVENTS) {
      const fromEvents = await fetchRegisteredVaultTxidsFromEvents();
      for (const felt of fromEvents) txids.add(felt);
    }

    if (txids.size === 0) {
      console.log(`[${ts}] ℹ No vault txids configured or discovered`);
      return;
    }

    const feltList = [...txids];
    console.log(`[${ts}] Checking health for ${feltList.length} vault(s)...`);

    let liquidatableCount = 0;
    for (const txidFelt of feltList) {
      const health = await readVaultHealth(txidFelt);
      const prevDebt = BigInt(state.debtByVault[txidFelt] ?? "0");
      state.debtByVault[txidFelt] = health.debt.toString();

      if (prevDebt > BigInt(0) && health.debt === BigInt(0)) {
        const attestation = signAttestation({
          kind: "REPAYMENT_CLEARED",
          txidFelt,
          debt: health.debt.toString(),
          healthFactor: health.healthFactor.toString(),
          timestampSec: Math.floor(Date.now() / 1000),
          note: "Debt transitioned from >0 to 0",
        });
        if (attestation) {
          persistAttestation(attestation);
          console.log(
            `[${ts}] ✍ Signed REPAYMENT_CLEARED attestation for ${txidFeltToHex31(txidFelt)}`,
          );
        } else {
          console.warn(
            `[${ts}] ⚠ Repayment attestation skipped (ORACLE_ATTESTATION_PRIVATE_KEY not set)`,
          );
        }
      }

      if (health.debt === BigInt(0)) continue;

      const txidLabel = txidFeltToHex31(txidFelt);
      console.log(
        `[${ts}] Vault ${txidLabel} → HF=${health.healthFactor.toString()} debt=${health.debt.toString()}`,
      );

      if (!health.liquidatable) continue;
      liquidatableCount += 1;
      console.warn(`[${ts}] ⚠ LIQUIDATABLE: ${txidLabel} (HF < 100)`);

      const attestation = signAttestation({
        kind: "LIQUIDATION",
        txidFelt,
        debt: health.debt.toString(),
        healthFactor: health.healthFactor.toString(),
        timestampSec: Math.floor(Date.now() / 1000),
        note: "Health factor below liquidation threshold",
      });
      if (attestation) {
        persistAttestation(attestation);
        console.log(`[${ts}] ✍ Signed LIQUIDATION attestation for ${txidLabel}`);
      } else {
        console.warn(
          `[${ts}] ⚠ Liquidation attestation skipped (ORACLE_ATTESTATION_PRIVATE_KEY not set)`,
        );
      }

      if (AUTO_LIQUIDATE) {
        try {
          const txHash = await liquidateVault(txidFelt);
          console.warn(`[${ts}] ✅ liquidate(${txidLabel}) → ${txHash}`);
        } catch (err) {
          console.error(`[${ts}] ❌ liquidate(${txidLabel}) failed:`, err);
        }
      }
    }

    if (liquidatableCount === 0) {
      console.log(`[${ts}] ✅ No liquidatable vaults`);
    }
    persistState();
  } catch (err) {
    console.error(`[${ts}] ❌ Health monitor failed:`, err);
  }
}

async function monitorBitcoinUTXOs() {
  const ts = new Date().toISOString();
  try {
    const outpoints = getConfiguredOutpoints();
    if (outpoints.length === 0) {
      console.log(`[${ts}] ℹ No BTC outpoints configured`);
      return;
    }

    const statuses = await monitorOutpoints(outpoints);
    for (const s of statuses) {
      const key = `${s.txid}:${s.vout}`;
      const spent = !s.unspent;
      const prevSpent = state.outpointSpent[key];
      state.outpointSpent[key] = spent;

      if (prevSpent === undefined || prevSpent !== spent) {
        console.log(
          `[${ts}] BTC outpoint ${key} is now ${spent ? "SPENT" : "UNSPENT"}`,
        );
      }
    }
    persistState();
  } catch (err) {
    console.error(`[${ts}] ❌ BTC outpoint monitor failed:`, err);
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
console.log(
  `  Health checks: every ${HEALTH_INTERVAL} minutes → CDPCore.get_health_factor()`,
);
console.log(
  `  BTC outpoint checks: every ${BTC_UTXO_INTERVAL} minutes → Bitcoin gettxout`,
);
console.log(`  Auto-liquidate: ${AUTO_LIQUIDATE ? "ON" : "OFF"}`);
console.log(`  Oracle: ${process.env.MOCK_ORACLE_ADDRESS ?? "(not set)"}`);
console.log("");

// Run immediately on start
updatePrice();
updateVolatility();
monitorVaultHealth();
monitorBitcoinUTXOs();

// Schedule recurring updates
cron.schedule(`*/${PRICE_INTERVAL} * * * *`, updatePrice);
cron.schedule(`*/${VOL_INTERVAL} * * * *`, updateVolatility);
cron.schedule(`*/${HEALTH_INTERVAL} * * * *`, monitorVaultHealth);
cron.schedule(`*/${BTC_UTXO_INTERVAL} * * * *`, monitorBitcoinUTXOs);
