#!/usr/bin/env node
/**
 * btc-proxy.mjs
 *
 * Lightweight HTTP proxy that wraps Bitcoin Core JSON-RPC and exposes:
 *   GET  /health          → node liveness check
 *   GET  /status          → getblockchaininfo
 *   POST /                → raw passthrough to Bitcoin Core JSON-RPC (for Xverse)
 *   POST /rpc             → same
 *   POST /broadcast       → sendrawtransaction { hex }
 *   POST /psbt            → walletcreatefundedpsbt wrapper
 *   POST /address         → getnewaddress from btcstd_demo wallet
 *
 * Config via env (or defaults matching standard_vault/justfile):
 *   BTC_RPC_URL      default: http://127.0.0.1:18443
 *   BTC_RPC_USER     default: user
 *   BTC_RPC_PASS     default: password
 *   BTC_RPC_WALLET   default: btcstd_demo
 *   PROXY_PORT       default: 4040
 */

import http from "http";

const RPC_URL  = process.env.BTC_RPC_URL  ?? "http://127.0.0.1:18443";
const RPC_USER = process.env.BTC_RPC_USER ?? "user";
const RPC_PASS = process.env.BTC_RPC_PASS ?? "password";
const WALLET   = process.env.BTC_RPC_WALLET ?? "btcstd_demo";
const PORT     = parseInt(process.env.PROXY_PORT ?? "4040");

const AUTH = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");

let reqId = 0;

async function rpc(method, params = [], wallet = null) {
  const url = wallet ? `${RPC_URL}/wallet/${wallet}` : RPC_URL;
  const body = JSON.stringify({ jsonrpc: "1.0", id: String(++reqId), method, params });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${AUTH}`,
    },
    body,
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
  return json.result;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      try { resolve(JSON.parse(buf)); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }

  const url = req.url?.split("?")[0] ?? "/";

  try {
    // ── GET /health ──────────────────────────────────────────────────────────
    if (req.method === "GET" && (url === "/health" || url === "/status")) {
      const info = await rpc("getblockchaininfo");
      return json(res, 200, { ok: true, chain: info.chain, blocks: info.blocks, bestblockhash: info.bestblockhash });
    }

    // ── POST /broadcast ──────────────────────────────────────────────────────
    if (req.method === "POST" && url === "/broadcast") {
      const body = await readBody(req);
      const hex = body.hex ?? body.psbt ?? body.rawTx;
      if (!hex) return json(res, 400, { ok: false, error: "Missing hex field" });
      const txid = await rpc("sendrawtransaction", [hex]);
      return json(res, 200, { ok: true, txid });
    }

    // ── POST /psbt ───────────────────────────────────────────────────────────
    if (req.method === "POST" && url === "/psbt") {
      const body = await readBody(req);
      // body: { outputs: [{address: amount}], feeRate?: number }
      const outputs = body.outputs ?? [];
      const opts = body.feeRate ? { fee_rate: body.feeRate } : {};
      const result = await rpc("walletcreatefundedpsbt", [[], outputs, 0, opts], WALLET);
      return json(res, 200, { ok: true, psbt: result.psbt, fee: result.fee, changepos: result.changepos });
    }

    // ── POST /address ────────────────────────────────────────────────────────
    if (req.method === "POST" && url === "/address") {
      const body = await readBody(req);
      const wallet = body.wallet ?? WALLET;
      const address = await rpc("getnewaddress", [], wallet);
      return json(res, 200, { ok: true, address, wallet });
    }

    // ── POST / or /rpc — raw JSON-RPC passthrough ────────────────────────────
    if (req.method === "POST" && (url === "/" || url === "/rpc")) {
      const body = await readBody(req);
      const result = await rpc(body.method, body.params ?? []);
      return json(res, 200, { result, error: null, id: body.id ?? null });
    }

    json(res, 404, { ok: false, error: `Unknown route ${req.method} ${url}` });
  } catch (err) {
    json(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`btc-proxy listening on http://127.0.0.1:${PORT}`);
  console.log(`  → Bitcoin Core RPC: ${RPC_URL} (wallet: ${WALLET})`);
});
