"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import {
  AlertTriangle,
  Bitcoin,
  CheckCircle,
  ChevronRight,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import {
  useNativeCDP,
  formatBTC,
  formatBTCUSD,
  formatHealthFactor,
  healthStatus,
} from "~~/hooks/useNativeCDP";

// ─── BTC Market Banner ─────────────────────────────────────────────────────────

function BTCMarketBanner() {
  const [market, setMarket] = useState<{
    price: number;
    change_24h: number;
    market_cap: number;
    volume_24h: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/price")
      .then((r) => r.json())
      .then((d) => {
        if (d.bitcoin?.usd) {
          setMarket({
            price: d.bitcoin.usd,
            change_24h: d.bitcoin.usd_24h_change ?? 0,
            market_cap: d.bitcoin.usd_market_cap ?? 0,
            volume_24h: d.bitcoin.usd_24h_vol ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const up = (market?.change_24h ?? 0) >= 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Bitcoin size={16} className="text-orange-400" />
        <span className="font-semibold text-white">
          {market ? `$${market.price.toLocaleString()}` : "—"}
        </span>
        {market && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}
          >
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? "+" : ""}
            {market.change_24h.toFixed(2)}%
          </span>
        )}
      </div>
      {market && (
        <>
          <div className="text-zinc-400">
            MCap:{" "}
            <span className="text-zinc-200">
              ${(market.market_cap / 1e9).toFixed(0)}B
            </span>
          </div>
          <div className="text-zinc-400">
            Vol 24h:{" "}
            <span className="text-zinc-200">
              ${(market.volume_24h / 1e9).toFixed(1)}B
            </span>
          </div>
        </>
      )}
      <div className="ml-auto text-xs text-zinc-500">via CoinGecko</div>
    </div>
  );
}

// ─── Health Factor Bar ─────────────────────────────────────────────────────────

function HealthFactorBar({ hf, mcr }: { hf: bigint; mcr: number }) {
  const status = healthStatus(hf);
  const hfNum = Number(hf);

  // Cap display at 300 for the bar width calculation
  const pct = Math.min((hfNum / 300) * 100, 100);
  const thresholdPct = (100 / 300) * 100; // where 100 sits on the bar

  const color =
    status === "safe"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-red-500";

  const label =
    status === "safe" ? "Safe" : status === "warning" ? "At Risk" : "Danger";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">Health Factor</span>
        <span
          className={`font-semibold ${status === "safe" ? "text-emerald-400" : status === "warning" ? "text-amber-400" : "text-red-400"}`}
        >
          {formatHealthFactor(hf)} / 100 — {label}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-zinc-800">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
        {/* liquidation threshold marker */}
        <div
          className="absolute top-0 h-2 w-0.5 bg-zinc-400"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div
        className="text-xs text-zinc-500"
        style={{ paddingLeft: `${thresholdPct}%` }}
      >
        ↑ MCR {mcr}%
      </div>
    </div>
  );
}

// ─── Vault Status Card ─────────────────────────────────────────────────────────

function VaultStatusCard({
  vaultInfo,
  position,
  healthFactor,
  hfStatus,
  collateralUSD,
  debtUSD,
  btcPriceUSD,
  mcr,
  txid,
}: {
  vaultInfo: ReturnType<typeof useNativeCDP>["vaultInfo"];
  position: ReturnType<typeof useNativeCDP>["position"];
  healthFactor: bigint;
  hfStatus: ReturnType<typeof useNativeCDP>["hfStatus"];
  collateralUSD: number;
  debtUSD: number;
  btcPriceUSD: number;
  mcr: number;
  txid: string;
}) {
  if (!vaultInfo) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 text-sm text-zinc-400">
        Loading vault...
      </div>
    );
  }

  const stateColor =
    vaultInfo.state === "Active"
      ? "text-emerald-400"
      : vaultInfo.state === "Repaid"
        ? "text-blue-400"
        : "text-red-400";

  const StateIcon =
    vaultInfo.state === "Active"
      ? CheckCircle
      : vaultInfo.state === "Repaid"
        ? CheckCircle
        : XCircle;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">
          Vault Status
        </span>
        <span
          className={`flex items-center gap-1.5 text-sm font-medium ${stateColor}`}
        >
          <StateIcon size={14} />
          {vaultInfo.state}
        </span>
      </div>

      <div className="font-mono text-xs text-zinc-500 break-all">{txid}</div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-zinc-900/60 p-3">
          <div className="text-zinc-400 text-xs mb-1">BTC Locked</div>
          <div className="font-semibold text-white">
            {formatBTC(position.btcSats)} BTC
          </div>
          <div className="text-xs text-zinc-400">
            ≈ $
            {collateralUSD.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-900/60 p-3">
          <div className="text-zinc-400 text-xs mb-1">BTCUSD Debt</div>
          <div className="font-semibold text-white">
            {formatBTCUSD(position.debtBTCUSD)} BTCUSD
          </div>
          <div className="text-xs text-zinc-400">
            ≈ ${debtUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {position.debtBTCUSD > BigInt(0) && (
        <HealthFactorBar hf={healthFactor} mcr={mcr} />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "register" | "mint" | "repay";

export default function BorrowPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  // Vault txid state (managed in page, passed to hook)
  const [activeTxid, setActiveTxid] = useState("");
  const [txidInput, setTxidInput] = useState("");

  const cdp = useNativeCDP({ txid: activeTxid || undefined });

  const [tab, setTab] = useState<Tab>("register");
  const [mintAmount, setMintAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [error, setError] = useState("");

  // ─── Derived amounts ──────────────────────────────────────────────────────

  const TOKEN_DECIMALS = BigInt("1000000000000000000");

  const mintAmountBigInt = useMemo(() => {
    if (!mintAmount || isNaN(Number(mintAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(mintAmount) * 1e18));
  }, [mintAmount]);

  const repayAmountBigInt = useMemo(() => {
    if (!repayAmount || isNaN(Number(repayAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(repayAmount) * 1e18));
  }, [repayAmount]);

  // Register vault inputs
  const [regTxid, setRegTxid] = useState("");
  const [regBTC, setRegBTC] = useState(""); // in BTC (e.g. "1.0")

  const regBTCSats = useMemo(() => {
    if (!regBTC || isNaN(Number(regBTC))) return BigInt(0);
    return BigInt(Math.floor(Number(regBTC) * 1e8));
  }, [regBTC]);

  // Projected health factor after minting additional debt
  const projectedHF = useMemo(() => {
    if (mintAmountBigInt === BigInt(0) || !cdp.vaultInfo) return null;
    const newDebt = cdp.position.debtBTCUSD + mintAmountBigInt;
    const collateralUSD8dec = BigInt(Math.floor(cdp.collateralUSD * 1e8));
    const debtUSD8dec = (newDebt * BigInt(1e8)) / TOKEN_DECIMALS;
    if (debtUSD8dec === BigInt(0)) return null;
    const mcr = BigInt(cdp.dynamicMCR);
    return (collateralUSD8dec * BigInt(10000)) / (debtUSD8dec * mcr);
  }, [mintAmountBigInt, cdp]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLoadVault = useCallback(() => {
    const t = txidInput.trim().replace(/^0x/, "");
    if (t.length !== 64) {
      setError("TxID must be 64 hex characters (32 bytes)");
      return;
    }
    setError("");
    setActiveTxid(t);
    setTab("mint");
  }, [txidInput]);

  const handleRegisterVault = useCallback(async () => {
    setError("");
    const t = regTxid.trim().replace(/^0x/, "");
    if (t.length !== 64) {
      setError("TxID must be 64 hex characters");
      return;
    }
    if (regBTCSats === BigInt(0)) {
      setError("Enter a BTC amount");
      return;
    }
    try {
      await cdp.registerVault(t, regBTCSats);
      setActiveTxid(t);
      setTab("mint");
    } catch (e: any) {
      setError(e?.message ?? "Registration failed");
    }
  }, [regTxid, regBTCSats, cdp]);

  const handleMint = useCallback(async () => {
    setError("");
    if (!activeTxid) {
      setError("Load a vault first");
      return;
    }
    if (mintAmountBigInt === BigInt(0)) {
      setError("Enter an amount");
      return;
    }
    if (mintAmountBigInt > cdp.maxMintable) {
      setError("Amount exceeds maximum mintable at current MCR");
      return;
    }
    try {
      await cdp.mintDebt(activeTxid, mintAmountBigInt);
      setMintAmount("");
    } catch (e: any) {
      setError(e?.message ?? "Mint failed");
    }
  }, [activeTxid, mintAmountBigInt, cdp]);

  const handleRepay = useCallback(async () => {
    setError("");
    if (!activeTxid) {
      setError("Load a vault first");
      return;
    }
    if (repayAmountBigInt === BigInt(0)) {
      setError("Enter an amount");
      return;
    }
    if (repayAmountBigInt > cdp.position.debtBTCUSD) {
      setError("Amount exceeds outstanding debt");
      return;
    }
    try {
      await cdp.repayDebt(activeTxid, repayAmountBigInt);
      setRepayAmount("");
    } catch (e: any) {
      setError(e?.message ?? "Repay failed");
    }
  }, [activeTxid, repayAmountBigInt, cdp]);

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Borrow BTCUSD</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lock native Bitcoin in an OP_CAT vault, then mint BTCUSD stablecoin
            against it on Starknet.
          </p>
        </div>

        {/* BTC market strip */}
        <BTCMarketBanner />

        {/* Protocol stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Oracle BTC Price",
              value: cdp.btcPriceUSD
                ? `$${cdp.btcPriceUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "—",
              sub: "MockOracle (Sepolia)",
            },
            {
              label: "Min Coll. Ratio",
              value: `${cdp.dynamicMCR}%`,
              sub: `Vol: ${cdp.volatilityPct.toFixed(1)}% annualized`,
            },
            {
              label: "Total Vaults",
              value: cdp.totalVaults.toString(),
              sub: `${formatBTCUSD(cdp.totalSupply)} BTCUSD issued`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-3"
            >
              <div className="text-xs text-zinc-500">{s.label}</div>
              <div className="mt-1 text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-zinc-500">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-xl bg-zinc-800/60 p-1">
          {(
            [
              { id: "register", label: "1. Register Vault" },
              { id: "mint", label: "2. Mint BTCUSD" },
              { id: "repay", label: "3. Repay Debt" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-orange-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ── Tab: Register Vault ──────────────────────────────────────────── */}
        {tab === "register" && (
          <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-800/40 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-500/15 p-2">
                <Bitcoin size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  Register Bitcoin Vault
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  First, deposit BTC into an OP_CAT Taproot vault on Bitcoin (
                  <code className="text-zinc-300">just deposit</code>). Then
                  paste the resulting txid here.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Bitcoin Deposit TxID
                </label>
                <input
                  type="text"
                  value={regTxid}
                  onChange={(e) => setRegTxid(e.target.value)}
                  placeholder="64-char hex (e.g. 9abf6446...)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  BTC Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={regBTC}
                    onChange={(e) => setRegBTC(e.target.value)}
                    placeholder="e.g. 1.0"
                    step="0.00000001"
                    min="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-16 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                    BTC
                  </span>
                </div>
                {regBTCSats > BigInt(0) && (
                  <p className="mt-1 text-xs text-zinc-500">
                    = {regBTCSats.toLocaleString()} satoshis
                  </p>
                )}
              </div>

              <button
                onClick={handleRegisterVault}
                disabled={!isConnected || cdp.isRegistering}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cdp.isRegistering ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {cdp.isRegistering ? "Registering..." : "Register Vault"}
              </button>

              {!isConnected && (
                <p className="text-center text-xs text-zinc-500">
                  Connect your Starknet wallet to register.
                </p>
              )}
            </div>

            <div className="border-t border-zinc-700 pt-3">
              <p className="text-xs text-zinc-500 mb-2">
                Already have a vault?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={txidInput}
                  onChange={(e) => setTxidInput(e.target.value)}
                  placeholder="Paste txid to load vault"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={handleLoadVault}
                  className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition"
                >
                  Load <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Mint BTCUSD ─────────────────────────────────────────────── */}
        {tab === "mint" && (
          <div className="space-y-4">
            {/* Vault status */}
            {activeTxid ? (
              <VaultStatusCard
                vaultInfo={cdp.vaultInfo}
                position={cdp.position}
                healthFactor={cdp.healthFactor}
                hfStatus={cdp.hfStatus}
                collateralUSD={cdp.collateralUSD}
                debtUSD={cdp.debtUSD}
                btcPriceUSD={cdp.btcPriceUSD}
                mcr={cdp.dynamicMCR}
                txid={activeTxid}
              />
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
                <AlertTriangle size={16} className="inline mr-2" />
                No vault loaded. Register a vault or load an existing one first.
              </div>
            )}

            {/* Mint form */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-5 space-y-3">
              <h2 className="font-semibold text-white">Mint BTCUSD</h2>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Amount
                  </label>
                  <button
                    onClick={() =>
                      setMintAmount(
                        cdp.maxMintable > BigInt(0)
                          ? (Number(cdp.maxMintable) / 1e18).toFixed(2)
                          : "",
                      )
                    }
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    Max:{" "}
                    {cdp.maxMintable > BigInt(0)
                      ? `${(Number(cdp.maxMintable) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} BTCUSD`
                      : "—"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-20 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                    BTCUSD
                  </span>
                </div>
              </div>

              {/* Projected health factor */}
              {projectedHF !== null && (
                <div className="rounded-lg bg-zinc-900/60 p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      Projected Health Factor
                    </span>
                    <span
                      className={
                        projectedHF >= BigInt(100)
                          ? "text-emerald-400 font-semibold"
                          : "text-red-400 font-semibold"
                      }
                    >
                      {formatHealthFactor(projectedHF)} / 100
                    </span>
                  </div>
                  {projectedHF < BigInt(100) && (
                    <p className="text-xs text-red-400">
                      ⚠ This amount would make the vault liquidatable at MCR{" "}
                      {cdp.dynamicMCR}%
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={
                  !isConnected ||
                  !activeTxid ||
                  cdp.isMinting ||
                  mintAmountBigInt === BigInt(0)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cdp.isMinting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {cdp.isMinting ? "Minting..." : "Mint BTCUSD"}
              </button>

              <div className="flex items-start gap-2 text-xs text-zinc-500">
                <Info size={12} className="mt-0.5 shrink-0" />
                BTCUSD is a BTC-backed stablecoin. Maintain health factor above
                100 to avoid liquidation. MCR is dynamic and increases with BTC
                volatility.
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Repay Debt ──────────────────────────────────────────────── */}
        {tab === "repay" && (
          <div className="space-y-4">
            {/* Vault status */}
            {activeTxid ? (
              <VaultStatusCard
                vaultInfo={cdp.vaultInfo}
                position={cdp.position}
                healthFactor={cdp.healthFactor}
                hfStatus={cdp.hfStatus}
                collateralUSD={cdp.collateralUSD}
                debtUSD={cdp.debtUSD}
                btcPriceUSD={cdp.btcPriceUSD}
                mcr={cdp.dynamicMCR}
                txid={activeTxid}
              />
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
                <AlertTriangle size={16} className="inline mr-2" />
                No vault loaded.
              </div>
            )}

            {/* Repay form */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-5 space-y-3">
              <h2 className="font-semibold text-white">Repay Debt</h2>

              <div className="rounded-lg bg-zinc-900/60 p-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-zinc-400 mb-0.5">
                    Outstanding Debt
                  </div>
                  <div className="font-semibold text-white">
                    {formatBTCUSD(cdp.position.debtBTCUSD)} BTCUSD
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-0.5">
                    Your Balance
                  </div>
                  <div className="font-semibold text-white">
                    {formatBTCUSD(cdp.btcusdBalance)} BTCUSD
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Amount
                  </label>
                  <button
                    onClick={() => {
                      const maxRepay =
                        cdp.position.debtBTCUSD < cdp.btcusdBalance
                          ? cdp.position.debtBTCUSD
                          : cdp.btcusdBalance;
                      setRepayAmount(
                        maxRepay > BigInt(0)
                          ? (Number(maxRepay) / 1e18).toFixed(2)
                          : "",
                      );
                    }}
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    Max
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-20 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                    BTCUSD
                  </span>
                </div>
              </div>

              {repayAmountBigInt > BigInt(0) &&
                repayAmountBigInt >= cdp.position.debtBTCUSD && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
                    <Info size={12} />
                    Full repayment — vault will be closed and BTC covenant
                    released on Bitcoin.
                  </div>
                )}

              <button
                onClick={handleRepay}
                disabled={
                  !isConnected ||
                  !activeTxid ||
                  cdp.isRepaying ||
                  repayAmountBigInt === BigInt(0) ||
                  cdp.position.debtBTCUSD === BigInt(0)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 py-3 text-sm font-semibold text-white transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cdp.isRepaying ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {cdp.isRepaying ? "Repaying..." : "Repay BTCUSD"}
              </button>

              {cdp.position.debtBTCUSD === BigInt(0) && activeTxid && (
                <p className="text-center text-xs text-emerald-400">
                  ✓ No outstanding debt on this vault.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Demo flow hint */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <Zap size={12} className="text-orange-400" />
            Demo Flow
          </div>
          <ol className="space-y-1 text-xs text-zinc-500">
            <li>
              <span className="text-zinc-300">1.</span>{" "}
              <code className="text-orange-300">just deposit</code> in{" "}
              <code className="text-zinc-300">standard_vault/</code> → creates
              OP_CAT UTXO, prints txid
            </li>
            <li>
              <span className="text-zinc-300">2.</span> Paste txid + amount
              above → Register Vault on Starknet
            </li>
            <li>
              <span className="text-zinc-300">3.</span> Mint BTCUSD stablecoin
              against your locked BTC
            </li>
            <li>
              <span className="text-zinc-300">4.</span> To repay:{" "}
              <code className="text-orange-300">just repay &lt;addr&gt;</code>{" "}
              on Bitcoin + Repay Debt here
            </li>
            <li>
              <span className="text-zinc-300">5.</span> Liquidation: oracle
              detects HF &lt; 100 →{" "}
              <code className="text-orange-300">just liquidate</code> triggers
              OP_CAT covenant
            </li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
