"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNetwork } from "@starknet-react/core";
import { useAccount } from "~~/hooks/useAccount";
import Wallet from "sats-connect";
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
  formatBTSUSD,
  formatHealthFactor,
  healthStatus,
} from "~~/hooks/useNativeCDP";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { useXverseStore } from "~~/services/store/xverseStore";

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
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm space-y-1">
        <div className="font-medium text-neutral-800">Vault txid loaded</div>
        <div className="font-mono text-xs text-neutral-500 break-all">
          {txid}
        </div>
        <div>
          Not registered on Starknet yet. Complete Step 1 below to enable
          minting.
        </div>
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
          <div className="text-neutral-500 text-xs mb-1">BTSUSD Debt</div>
          <div className="font-semibold text-neutral-900">
            {formatBTSUSD(position.debtBTSUSD)} BTSUSD
          </div>
          <div className="text-xs text-neutral-500">
            ≈ ${debtUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {position.debtBTSUSD > BigInt(0) && (
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
          <h3 className="text-base font-semibold text-white">Deposit BTC</h3>
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
            {isRegistering ? "Registering..." : "Confirm Deposit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "register" | "mint" | "repay";
const TOKEN_DECIMALS = BigInt("1000000000000000000");
type RegtestKeyRecord = {
  wallet: string;
  address: string;
  privateKeyWif: string;
  createdAt: string;
};

export default function BorrowPage() {
  const { status, address: xverseAddress } = useAccount();
  const [braavosAddress, setBraavosAddress] = useState<string | null>(null);
  const address = braavosAddress ?? xverseAddress;
  const isConnected = status === "connected" || !!braavosAddress;
  const { chain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

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
  const [operatorMessage, setOperatorMessage] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState<{
    available: boolean;
    bridgeUrl: string;
  } | null>(null);
  const [spotPriceUSD, setSpotPriceUSD] = useState<number>(0);
  const [regtestWalletName, setRegtestWalletName] = useState("btcstd_demo");
  const [isCreatingRegtestAddress, setIsCreatingRegtestAddress] =
    useState(false);
  const [latestRegtestKey, setLatestRegtestKey] =
    useState<RegtestKeyRecord | null>(null);
  const [savedRegtestKeys, setSavedRegtestKeys] = useState<RegtestKeyRecord[]>(
    [],
  );

  useEffect(() => {
    fetch("/api/standard-vault/status")
      .then((r) => r.json())
      .then((d) => {
        setBridgeStatus({
          available: !!d.available,
          bridgeUrl: d.bridgeUrl || "http://127.0.0.1:4040",
        });
        // Auto-populate activeTxid from the vault file if not already set
        const txid = d.currentOutpoint?.txid as string | undefined;
        if (txid && txid.length === 64) {
          setActiveTxid((prev) => prev || txid);
          setRegTxid((prev) => prev || txid);
        }
      })
      .catch(() => setBridgeStatus(null));
  }, []);

  useEffect(() => {
    const fetchSpot = () => {
      fetch("/api/price")
        .then((r) => r.json())
        .then((d) => {
          const v = Number(d?.bitcoin?.usd || 0);
          if (!Number.isNaN(v) && v > 0) setSpotPriceUSD(v);
        })
        .catch(() => {});
    };
    fetchSpot();
    const timer = window.setInterval(fetchSpot, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedOracle = window.localStorage.getItem("btcstd:oracle_pubkey");
    const savedTaproot = window.localStorage.getItem("btcstd:taproot_address");
    const savedKeys = window.localStorage.getItem("btcstd:regtest_keys");
    const savedActiveTxid = window.localStorage.getItem("btcstd:active_txid");
    if (savedOracle) setOraclePubKey(savedOracle);
    if (savedTaproot) setVaultTaprootAddress(savedTaproot);
    if (savedActiveTxid) {
      setActiveTxid(savedActiveTxid);
      setRegTxid(savedActiveTxid);
    }
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys) as RegtestKeyRecord[];
        setSavedRegtestKeys(parsed);
        if (parsed.length > 0) setLatestRegtestKey(parsed[0]);
      } catch {
        setSavedRegtestKeys([]);
      }
    }
  }, []);

  useEffect(() => {
    if (oraclePubKey.trim()) {
      window.localStorage.setItem("btcstd:oracle_pubkey", oraclePubKey.trim());
    }
  }, [oraclePubKey]);

  // Auto-fetch vault taproot address from the standard_vault binary when the
  // deposit tab is open and no address is loaded yet.
  useEffect(() => {
    if (tab !== "register" || vaultTaprootAddress) return;
    fetch("/api/standard-vault/prepare", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.vaultTaprootAddress)
          setVaultTaprootAddress(d.vaultTaprootAddress);
        if (d.ok && d.oraclePubKey) setOraclePubKey(d.oraclePubKey);
      })
      .catch(() => {});
  }, [tab, vaultTaprootAddress]);

  useEffect(() => {
    if (vaultTaprootAddress.trim()) {
      window.localStorage.setItem(
        "btcstd:taproot_address",
        vaultTaprootAddress.trim(),
      );
    }
  }, [vaultTaprootAddress]);

  useEffect(() => {
    if (activeTxid.trim()) {
      window.localStorage.setItem("btcstd:active_txid", activeTxid.trim());
    }
  }, [activeTxid]);

  // ─── Derived amounts ──────────────────────────────────────────────────────

  const mintAmountBigInt = useMemo(() => {
    if (!mintAmount || isNaN(Number(mintAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(mintAmount) * 1e18));
  }, [mintAmount]);

  const repayAmountBigInt = useMemo(() => {
    if (!repayAmount || isNaN(Number(repayAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(repayAmount) * 1e18));
  }, [repayAmount]);

  // Deposit BTC via Xverse PSBT
  const { btcAddress, bitcoinNetwork, connectToStarknetSepolia } =
    useXverseStore();
  const [depositAmount, setDepositAmount] = useState("1");
  const [depositStep, setDepositStep] = useState<
    "idle" | "preparing" | "signing" | "broadcasting" | "done" | "error"
  >("idle");
  const [depositTxid, setDepositTxid] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);

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
    const newDebt = cdp.position.debtBTSUSD + mintAmountBigInt;
    const collateralUSD8dec = BigInt(Math.floor(cdp.collateralUSD * 1e8));
    const debtUSD8dec = (newDebt * BigInt(1e8)) / TOKEN_DECIMALS;
    if (debtUSD8dec === BigInt(0)) return null;
    const mcr = BigInt(cdp.dynamicMCR);
    return (collateralUSD8dec * BigInt(10000)) / (debtUSD8dec * mcr);
  }, [mintAmountBigInt, cdp]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDepositBtc = useCallback(async () => {
    if (!btcAddress) {
      setDepositError("Connect your Xverse wallet first");
      return;
    }
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setDepositError("Enter a valid BTC amount");
      return;
    }
    setDepositError(null);
    setDepositTxid(null);
    setDepositStep("preparing");
    try {
      const dest = vaultTaprootAddress.trim() || undefined;
      const prepRes = await fetch("/api/bitcoin/test-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: btcAddress,
          toAddress: dest,
          amount: amt,
        }),
      }).then((r) => r.json());
      if (!prepRes.ok) throw new Error(prepRes.error);

      setDepositStep("signing");
      const signRes = await Wallet.request("signPsbt", {
        psbt: prepRes.psbt,
        signInputs: { [btcAddress]: [0] },
        broadcast: false,
      } as any);
      if (signRes.status !== "success" || !(signRes.result as any)?.psbt) {
        throw new Error((signRes as any).error?.message ?? "Signing rejected");
      }

      setDepositStep("broadcasting");
      const finalRes = await fetch("/api/bitcoin/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psbt: (signRes.result as any).psbt }),
      }).then((r) => r.json());
      if (!finalRes.ok) throw new Error(finalRes.error);

      setDepositTxid(finalRes.txid);
      setTxidInput(finalRes.txid);

      // Activate the vault with the confirmed deposit outpoint.
      const amtSats = Math.round(amt * 1e8);
      await fetch("/api/standard-vault/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: finalRes.txid,
          vout: 0,
          amountSats: amtSats,
        }),
      })
        .then((r) => r.json())
        .catch(() => {});

      setDepositStep("done");
    } catch (e: any) {
      setDepositError(e?.message ?? "Deposit failed");
      setDepositStep("error");
    }
  }, [btcAddress, depositAmount, vaultTaprootAddress]);

  const handleLoadVault = useCallback(() => {
    const t = txidInput.trim().replace(/^0x/, "");
    if (t.length !== 64) {
      setError("TxID must be 64 hex characters (32 bytes)");
      return;
    }
    setError("");
    setActiveTxid(t);
    setRegTxid(t);
    setTab("mint");
  }, [txidInput]);

  const handleRegisterVault = useCallback(async () => {
    setError("");
    // If not connected, do two-step: sats-connect (gets starknet address + activates
    // window.starknet_xverse on Sepolia), then starknet-react InjectedConnector
    // (establishes account interface needed by useTransactor).
    if (!isConnected || !address) {
      // Try Braavos first, fall back to Xverse
      const braavos = (window as any).starknet_braavos;
      if (braavos) {
        const accounts = await braavos.enable();
        if (accounts?.[0]) {
          setBraavosAddress(accounts[0]);
          return false;
        }
      }
      await connectToStarknetSepolia();
      return false;
    }
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
      setOperatorMessage(
        `Vault registered and bound to Starknet owner ${address || "connected account"}.`,
      );
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Registration failed");
      return false;
    }
  }, [
    isConnected,
    connectToStarknetSepolia,
    regTxid,
    regBTCSats,
    cdp,
    address,
  ]);

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
  }, [activeTxid, mintAmountBigInt, cdp, address]);

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
    if (repayAmountBigInt > cdp.position.debtBTSUSD) {
      setError("Amount exceeds outstanding debt");
      return;
    }
    try {
      await cdp.repayDebt(activeTxid, repayAmountBigInt);
      setRepayAmount("");
    } catch (e: any) {
      setError(e?.message ?? "Repay failed");
    }
  }, [activeTxid, repayAmountBigInt, cdp, address]);

  const handleCreateRegtestAddress = useCallback(async () => {
    setError("");
    setOperatorMessage("");
    setIsCreatingRegtestAddress(true);
    try {
      const response = await fetch("/api/standard-vault/new-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: regtestWalletName.trim() || "btcstd_demo",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.address || !data.privateKeyWif) {
        throw new Error(
          data?.error || data?.output || "Failed to create address",
        );
      }

      const next: RegtestKeyRecord = {
        wallet: data.wallet || "btcstd_demo",
        address: data.address,
        privateKeyWif: data.privateKeyWif,
        createdAt: new Date().toISOString(),
      };
      setLatestRegtestKey(next);
      setSavedRegtestKeys((prev) => {
        const merged = [
          next,
          ...prev.filter((k) => k.address !== next.address),
        ].slice(0, 10);
        window.localStorage.setItem(
          "btcstd:regtest_keys",
          JSON.stringify(merged),
        );
        return merged;
      });
      setOperatorMessage(`New regtest address created: ${next.address}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create regtest address");
    } finally {
      setIsCreatingRegtestAddress(false);
    }
  }, [regtestWalletName]);

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Borrow BTSUSD</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Lock native Bitcoin in an OP_CAT vault, then mint BTSUSD stablecoin
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
              value:
                spotPriceUSD || cdp.btcPriceUSD
                  ? `$${(spotPriceUSD || cdp.btcPriceUSD).toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 2,
                      },
                    )}`
                  : "—",
              sub: "Current BTC price feed",
            },
            {
              label: "Min Coll. Ratio",
              value: `${cdp.dynamicMCR}%`,
              sub: `Vol: ${cdp.volatilityPct.toFixed(1)}% annualized`,
            },
            {
              label: "Total Vaults",
              value: cdp.vaultInfo ? "1" : "0",
              sub:
                cdp.position.btcSats > BigInt(0)
                  ? `${formatBTC(cdp.position.btcSats)} BTC locked`
                  : "No active vault",
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
              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                bridgeStatus?.available
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700"
              }`}
            >
              {bridgeStatus?.available ? "online" : "offline"}
            </span>
          </div>
          <ul className="space-y-1 text-xs text-neutral-600">
            <li>
              1. Run{" "}
              <code className="text-neutral-800">make start-bitcoind</code> in{" "}
              <code className="text-neutral-800">standard_vault/</code> and
              start the oracle service.
            </li>
            <li>
              2. Connect your Xverse wallet (top-right), then enter a BTC amount
              in the Deposit tab and sign with Xverse.
            </li>
            <li>
              3. The deposit txid auto-populates — click Register Vault on
              Starknet to link it to your account.
            </li>
            <li>4. Mint BTSUSD and keep health factor above 100.</li>
            <li>
              5. BTC proxy:{" "}
              <code className="text-neutral-800">
                {bridgeStatus?.bridgeUrl || "http://127.0.0.1:4040"}
              </code>
            </li>
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Bitcoin Network
              </div>
              <div className="mt-0.5 text-xs font-semibold text-neutral-900">
                {bitcoinNetwork || "Not connected"}
              </div>
              <div className="text-[11px] text-neutral-500">
                Use Regtest for local BTC node operations.
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Starknet Network
              </div>
              <div className="mt-0.5 text-xs font-semibold text-neutral-900">
                {chain?.name || "Not connected"}
              </div>
              <div className="text-[11px] text-neutral-500">
                Must be {targetNetwork.name} for register/mint calls.
              </div>
            </div>
          </div>
          {isConnected &&
            chain?.id &&
            BigInt(chain.id) !== targetNetwork.id && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-700">
                  Connected to the wrong Starknet network.
                </p>
                <button
                  onClick={() => void connectToStarknetSepolia()}
                  className="rounded-md border border-amber-600/40 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-500/30"
                >
                  Switch to {targetNetwork.name}
                </button>
              </div>
            )}
          {operatorMessage && (
            <p className="mt-2 text-xs text-emerald-600">{operatorMessage}</p>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
          {(
            [
              { id: "register", label: "1. Deposit BTC" },
              { id: "mint", label: "2. Mint BTSUSD" },
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

        {/* ── Tab: Deposit BTC ─────────────────────────────────────────────── */}
        {tab === "register" && (
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-500/15 p-2">
                <Bitcoin size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">
                  Deposit Bitcoin
                </h2>
                <p className="mt-0.5 text-xs text-neutral-600">
                  Send BTC from your Xverse wallet to the vault. Sign with
                  Xverse to get your deposit txid.
                </p>
              </div>
            </div>

            {/* Vault destination address */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Vault Address (destination)
              </label>
              <input
                type="text"
                value={vaultTaprootAddress}
                onChange={(e) => setVaultTaprootAddress(e.target.value)}
                placeholder="bcrt1p... (Taproot vault address)"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-mono text-xs text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-700">
                  Amount (BTC)
                </label>
                {btcAddress && (
                  <span className="text-xs text-neutral-500">
                    From: {btcAddress.slice(0, 8)}…{btcAddress.slice(-6)}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.0001"
                  step="0.0001"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 pr-16 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500">
                  BTC
                </span>
              </div>
            </div>

            {/* Deposit button */}
            <button
              onClick={() => void handleDepositBtc()}
              disabled={
                !btcAddress ||
                ["preparing", "signing", "broadcasting"].includes(depositStep)
              }
              className="w-full rounded-lg bg-orange-500 py-3 text-[15px] font-semibold text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {["preparing", "signing", "broadcasting"].includes(
                depositStep,
              ) && <Loader2 size={16} className="animate-spin" />}
              {depositStep === "preparing" && "Building transaction…"}
              {depositStep === "signing" && "Waiting for Xverse…"}
              {depositStep === "broadcasting" && "Broadcasting…"}
              {(depositStep === "idle" ||
                depositStep === "done" ||
                depositStep === "error") &&
                "Deposit & Sign with Xverse"}
            </button>

            {!btcAddress && (
              <p className="text-xs text-neutral-500 text-center">
                Connect your Xverse wallet to deposit.
              </p>
            )}

            {/* Success */}
            {depositStep === "done" && depositTxid && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Deposit confirmed
                  </span>
                </div>
                <p className="font-mono text-[11px] text-emerald-300 break-all mb-3">
                  {depositTxid}
                </p>
                <button
                  onClick={() => {
                    const t = depositTxid.replace(/^0x/, "");
                    setActiveTxid(t);
                    setRegTxid(t);
                    setRegBTC(depositAmount);
                    setTab("mint");
                  }}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition"
                >
                  Continue to Mint BTSUSD <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Error */}
            {depositStep === "error" && depositError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                <AlertTriangle size={14} />
                {depositError}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Mint BTSUSD ─────────────────────────────────────────────── */}
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
                No vault loaded. Deposit BTC first or paste a txid below.
              </div>
            )}

            {/* Step 1: Register on Starknet (shown until vault is registered) */}
            {activeTxid && !cdp.vaultInfo && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    1
                  </div>
                  <h2 className="font-semibold text-neutral-900">
                    Register Vault on Starknet
                  </h2>
                </div>
                <p className="text-xs text-neutral-500">
                  Link your Bitcoin deposit to your Starknet account so you can
                  mint BTSUSD.
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-700">
                      BTC Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={regBTC}
                        onChange={(e) => setRegBTC(e.target.value)}
                        placeholder="e.g. 1.0"
                        min="0.0001"
                        step="0.0001"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-12 text-sm text-neutral-900 placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500">
                        BTC
                      </span>
                    </div>
                    {regBTCSats > BigInt(0) && (
                      <p className="mt-1 text-xs text-neutral-400">
                        = {regBTCSats.toLocaleString()} satoshis
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleRegisterVault()}
                  disabled={cdp.isRegistering}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cdp.isRegistering ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {cdp.isRegistering
                    ? "Registering…"
                    : !isConnected
                      ? "Connect Starknet & Register"
                      : "Register Vault on Starknet"}
                </button>
                {!isConnected && (
                  <p className="text-xs text-neutral-500 text-center">
                    Click to connect Starknet Sepolia via Xverse, then register.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Mint form (shown only after vault is registered) */}
            <div
              className={`rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-sm ${activeTxid && !cdp.vaultInfo ? "opacity-40 pointer-events-none" : ""}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  2
                </div>
                <h2 className="font-semibold text-neutral-900">Mint BTSUSD</h2>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-700">
                    Amount
                    {cdp.position.btcSats > BigInt(0) && (
                      <span className="ml-2 font-normal text-neutral-400">
                        · {formatBTC(cdp.position.btcSats)} BTC in vault
                      </span>
                    )}
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
                      ? `${(Number(cdp.maxMintable) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} BTSUSD`
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
                    BTSUSD
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
                {cdp.isMinting ? "Minting..." : "Mint BTSUSD"}
              </button>

              <div className="flex items-start gap-2 text-xs text-neutral-500">
                <Info size={12} className="mt-0.5 shrink-0" />
                BTSUSD is a BTC-backed stablecoin. Maintain health factor above
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
                    {formatBTSUSD(cdp.position.debtBTSUSD)} BTSUSD
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">
                    Your Balance
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {formatBTSUSD(cdp.btsusdBalance)} BTSUSD
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
                        cdp.position.debtBTSUSD < cdp.btsusdBalance
                          ? cdp.position.debtBTSUSD
                          : cdp.btsusdBalance;
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
                    BTSUSD
                  </span>
                </div>
              </div>

              {repayAmountBigInt > BigInt(0) &&
                repayAmountBigInt >= cdp.position.debtBTSUSD && (
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
                  cdp.position.debtBTSUSD === BigInt(0)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cdp.isRepaying ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {cdp.isRepaying ? "Repaying..." : "Repay BTSUSD"}
              </button>

              {cdp.position.debtBTSUSD === BigInt(0) && activeTxid && (
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
              <code className="text-orange-600">make deposit</code> in{" "}
              <code className="text-neutral-800">standard_vault/</code> → locks
              BTC in OP_CAT vault, prints txid
            </li>
            <li>
              <span className="text-neutral-800">2.</span> Paste txid + amount →
              Register Vault on Starknet (CDPCore)
            </li>
            <li>
              <span className="text-neutral-800">3.</span> Mint BTSUSD
              stablecoin against your locked BTC
            </li>
            <li>
              <span className="text-neutral-800">4.</span> To repay:{" "}
              <code className="text-orange-600">make repay &lt;addr&gt;</code>{" "}
              in terminal + Repay Debt here
            </li>
            <li>
              <span className="text-neutral-800">5.</span> Liquidation: oracle
              detects HF &lt; 100 →{" "}
              <code className="text-orange-600">make liquidate</code> triggers
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
