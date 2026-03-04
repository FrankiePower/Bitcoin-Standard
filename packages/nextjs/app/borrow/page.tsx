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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-orange-500/30 bg-orange-50 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Bitcoin size={16} className="text-orange-400" />
        <span className="font-semibold text-black">
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
          <div className="text-neutral-600">
            MCap:{" "}
            <span className="text-neutral-800">
              ${(market.market_cap / 1e9).toFixed(0)}B
            </span>
          </div>
          <div className="text-neutral-600">
            Vol 24h:{" "}
            <span className="text-neutral-800">
              ${(market.volume_24h / 1e9).toFixed(1)}B
            </span>
          </div>
        </>
      )}
      <div className="ml-auto text-xs text-neutral-500">via CoinGecko</div>
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

function BitcoinVaultStatus({
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
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-sm">
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">
          Vault Status
        </span>
        <span
          className={`flex items-center gap-1.5 text-sm font-medium ${stateColor}`}
        >
          <StateIcon size={14} />
          {vaultInfo.state}
        </span>
      </div>

      <div className="font-mono text-xs text-neutral-500 break-all">{txid}</div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-neutral-500 text-xs mb-1">BTC Locked</div>
          <div className="font-semibold text-neutral-900">
            {formatBTC(position.btcSats)} BTC
          </div>
          <div className="text-xs text-neutral-500">
            ≈ $
            {collateralUSD.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-neutral-500 text-xs mb-1">BTCUSD Debt</div>
          <div className="font-semibold text-neutral-900">
            {formatBTCUSD(position.debtBTCUSD)} BTCUSD
          </div>
          <div className="text-xs text-neutral-500">
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

function RegisterVaultModal({
  open,
  onClose,
  regTxid,
  setRegTxid,
  regBTC,
  setRegBTC,
  regBTCSats,
  oraclePubKey,
  setOraclePubKey,
  vaultTaprootAddress,
  setVaultTaprootAddress,
  isConnected,
  isRegistering,
  onRegister,
}: {
  open: boolean;
  onClose: () => void;
  regTxid: string;
  setRegTxid: (value: string) => void;
  regBTC: string;
  setRegBTC: (value: string) => void;
  regBTCSats: bigint;
  oraclePubKey: string;
  setOraclePubKey: (value: string) => void;
  vaultTaprootAddress: string;
  setVaultTaprootAddress: (value: string) => void;
  isConnected: boolean;
  isRegistering: boolean;
  onRegister: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Register Vault</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Close
          </button>
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-16 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Oracle Public Key
              </label>
              <input
                type="text"
                value={oraclePubKey}
                onChange={(e) => setOraclePubKey(e.target.value)}
                placeholder="x-only pubkey from `just deposit`"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Vault Taproot Address
              </label>
              <input
                type="text"
                value={vaultTaprootAddress}
                onChange={(e) => setVaultTaprootAddress(e.target.value)}
                placeholder="bcrt1... from `just deposit`"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-xs text-zinc-400">
            Save values from `standard_vault` output so operators can verify the
            Bitcoin vault metadata before minting.
          </div>

          <button
            onClick={() => {
              void onRegister();
            }}
            disabled={!isConnected || isRegistering}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegistering ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {isRegistering ? "Registering..." : "Register Vault"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "register" | "mint" | "repay";
const TOKEN_DECIMALS = BigInt("1000000000000000000");

export default function BorrowPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  // Vault txid state (managed in page, passed to hook)
  const [activeTxid, setActiveTxid] = useState("");
  const [txidInput, setTxidInput] = useState("");

  const cdp = useNativeCDP({ txid: activeTxid || undefined });

  const [tab, setTab] = useState<Tab>("register");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [error, setError] = useState("");
  const [oraclePubKey, setOraclePubKey] = useState("");
  const [vaultTaprootAddress, setVaultTaprootAddress] = useState("");
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorMessage, setOperatorMessage] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState<{
    available: boolean;
    bridgeUrl: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/standard-vault/status")
      .then((r) => r.json())
      .then((d) =>
        setBridgeStatus({
          available: !!d.available,
          bridgeUrl: d.bridgeUrl || "http://127.0.0.1:4040",
        }),
      )
      .catch(() => setBridgeStatus(null));
  }, []);

  useEffect(() => {
    const savedOracle = window.localStorage.getItem("btcstd:oracle_pubkey");
    const savedTaproot = window.localStorage.getItem("btcstd:taproot_address");
    if (savedOracle) setOraclePubKey(savedOracle);
    if (savedTaproot) setVaultTaprootAddress(savedTaproot);
  }, []);

  useEffect(() => {
    if (oraclePubKey.trim()) {
      window.localStorage.setItem("btcstd:oracle_pubkey", oraclePubKey.trim());
    }
  }, [oraclePubKey]);

  useEffect(() => {
    if (vaultTaprootAddress.trim()) {
      window.localStorage.setItem(
        "btcstd:taproot_address",
        vaultTaprootAddress.trim(),
      );
    }
  }, [vaultTaprootAddress]);

  // ─── Derived amounts ──────────────────────────────────────────────────────

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
      return false;
    }
    if (regBTCSats === BigInt(0)) {
      setError("Enter a BTC amount");
      return false;
    }
    try {
      await cdp.registerVault(t, regBTCSats);
      setActiveTxid(t);
      setTab("mint");
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Registration failed");
      return false;
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

  const runOperatorAction = useCallback(
    async (
      action: "deposit" | "liquidate" | "repay" | "timeout",
      body?: Record<string, unknown>,
    ) => {
      setError("");
      setOperatorMessage("");
      setOperatorBusy(true);
      try {
        const response = await fetch(`/api/standard-vault/${action}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || data?.output || `${action} failed`);
        }

        if (action === "deposit") {
          if (data.outpointTxid) {
            setRegTxid(data.outpointTxid);
            setTxidInput(data.outpointTxid);
          }
          if (data.oraclePubKey) setOraclePubKey(data.oraclePubKey);
          if (data.vaultTaprootAddress)
            setVaultTaprootAddress(data.vaultTaprootAddress);
        }

        setOperatorMessage(
          `${action} complete${data.txid ? ` (txid: ${data.txid})` : ""}`,
        );
      } catch (e: any) {
        setError(e?.message ?? `${action} failed`);
      } finally {
        setOperatorBusy(false);
      }
    },
    [],
  );

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Borrow BTCUSD</h1>
          <p className="mt-1 text-sm text-neutral-600">
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
              className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
            >
              <div className="text-xs text-neutral-500">{s.label}</div>
              <div className="mt-1 text-lg font-bold text-neutral-900">
                {s.value}
              </div>
              <div className="text-xs text-neutral-500">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Before You Borrow
            </h2>
            <span
              className={`text-xs font-medium ${bridgeStatus?.available ? "text-emerald-600" : "text-amber-600"}`}
            >
              {bridgeStatus?.available
                ? "Bitcoin bridge online"
                : "Bitcoin bridge offline"}
            </span>
          </div>
          <ul className="space-y-1 text-xs text-neutral-600">
            <li>
              1. Register a confirmed Bitcoin vault deposit (txid + BTC amount).
            </li>
            <li>
              2. Borrow only within max mintable to keep health factor above
              100.
            </li>
            <li>
              3. Liquidation can be triggered when health factor drops below
              100.
            </li>
            <li>
              4. Local bridge endpoint:{" "}
              <code className="text-neutral-800">
                {bridgeStatus?.bridgeUrl || "http://127.0.0.1:4040"}
              </code>
            </li>
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => void runOperatorAction("deposit")}
              disabled={operatorBusy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              Run BTC Deposit
            </button>
            <button
              onClick={() => void runOperatorAction("liquidate")}
              disabled={operatorBusy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              Run Liquidate
            </button>
            <button
              onClick={() => void runOperatorAction("repay")}
              disabled={operatorBusy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              Run Repay
            </button>
            <button
              onClick={() => void runOperatorAction("timeout")}
              disabled={operatorBusy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              Run Timeout
            </button>
          </div>
          {operatorMessage && (
            <p className="mt-2 text-xs text-emerald-600">{operatorMessage}</p>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
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
                  : "text-neutral-600 hover:text-neutral-900"
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
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-500/15 p-2">
                <Bitcoin size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">
                  Register Bitcoin Vault
                </h2>
                <p className="mt-0.5 text-xs text-neutral-600">
                  First, deposit BTC into an OP_CAT Taproot vault on Bitcoin (
                  <code className="text-neutral-800">just deposit</code>). Then
                  register with txid + amount on Starknet.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-xs text-neutral-600">
                Step A: Run{" "}
                <code className="text-neutral-800">just deposit</code> in{" "}
                <code className="text-neutral-800">standard_vault/</code>.
              </div>
              <div className="text-xs text-neutral-600">
                Step B: Open the modal and paste txid, BTC amount, oracle
                pubkey, and Taproot address.
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Open RegisterVaultModal
                <ChevronRight size={14} />
              </button>
              {!isConnected && (
                <p className="text-xs text-neutral-500">
                  Connect your Starknet wallet to register.
                </p>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-3">
              <p className="text-xs text-neutral-500 mb-2">
                Already have a vault?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={txidInput}
                  onChange={(e) => setTxidInput(e.target.value)}
                  placeholder="Paste txid to load vault"
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={handleLoadVault}
                  className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-orange-500 hover:text-orange-600 transition"
                >
                  Load <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {(oraclePubKey || vaultTaprootAddress) && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs">
                <div className="mb-2 font-medium text-neutral-700">
                  Current Vault Metadata
                </div>
                <div className="space-y-1.5 text-neutral-600">
                  <div className="font-mono break-all">
                    Oracle PubKey:{" "}
                    <span className="text-neutral-900">
                      {oraclePubKey || "Not set"}
                    </span>
                  </div>
                  <div className="font-mono break-all">
                    Taproot Address:{" "}
                    <span className="text-neutral-900">
                      {vaultTaprootAddress || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Mint BTCUSD ─────────────────────────────────────────────── */}
        {tab === "mint" && (
          <div className="space-y-4">
            {/* Vault status */}
            {activeTxid ? (
              <BitcoinVaultStatus
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
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Mint BTCUSD</h2>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-700">
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
                    className="text-xs text-orange-600 hover:text-orange-500"
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
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 pr-20 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500">
                    BTCUSD
                  </span>
                </div>
              </div>

              {/* Projected health factor */}
              {projectedHF !== null && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">
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

              <div className="flex items-start gap-2 text-xs text-neutral-500">
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
              <BitcoinVaultStatus
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
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-sm">
              <h2 className="font-semibold text-neutral-900">Repay Debt</h2>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">
                    Outstanding Debt
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {formatBTCUSD(cdp.position.debtBTCUSD)} BTCUSD
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">
                    Your Balance
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {formatBTCUSD(cdp.btcusdBalance)} BTCUSD
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-700">
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
                    className="text-xs text-orange-600 hover:text-orange-500"
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
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 pr-20 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500">
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-neutral-500 mb-2 flex items-center gap-1.5">
            <Zap size={12} className="text-orange-400" />
            Demo Flow
          </div>
          <ol className="space-y-1 text-xs text-neutral-600">
            <li>
              <span className="text-neutral-800">1.</span>{" "}
              <code className="text-orange-300">just deposit</code> in{" "}
              <code className="text-neutral-800">standard_vault/</code> →
              creates OP_CAT UTXO, prints txid
            </li>
            <li>
              <span className="text-neutral-800">2.</span> Paste txid + amount
              above → Register Vault on Starknet
            </li>
            <li>
              <span className="text-neutral-800">3.</span> Mint BTCUSD
              stablecoin against your locked BTC
            </li>
            <li>
              <span className="text-neutral-800">4.</span> To repay:{" "}
              <code className="text-orange-300">just repay &lt;addr&gt;</code>{" "}
              on Bitcoin + Repay Debt here
            </li>
            <li>
              <span className="text-neutral-800">5.</span> Liquidation: oracle
              detects HF &lt; 100 →{" "}
              <code className="text-orange-300">just liquidate</code> triggers
              OP_CAT covenant
            </li>
          </ol>
        </div>
      </div>
      <RegisterVaultModal
        open={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        regTxid={regTxid}
        setRegTxid={setRegTxid}
        regBTC={regBTC}
        setRegBTC={setRegBTC}
        regBTCSats={regBTCSats}
        oraclePubKey={oraclePubKey}
        setOraclePubKey={setOraclePubKey}
        vaultTaprootAddress={vaultTaprootAddress}
        setVaultTaprootAddress={setVaultTaprootAddress}
        isConnected={isConnected}
        isRegistering={cdp.isRegistering}
        onRegister={async () => {
          const ok = await handleRegisterVault();
          if (ok) setIsRegisterModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
