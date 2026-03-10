"use client";

import { useCallback, useMemo, useState } from "react";
import { useReadContract } from "@starknet-react/core";
import { useAccount } from "~~/hooks/useAccount";
import { Contract, cairo } from "starknet";
import { notification } from "~~/utils/scaffold-stark";
import {
  NATIVE_ADDRESSES,
  CDP_CORE_ABI,
  VAULT_REGISTRY_ABI,
  BTSUSD_TOKEN_ABI,
  MOCK_ORACLE_ABI,
  txidToFelt,
  parseU256,
  formatBTC,
  formatBTSUSD,
} from "~~/contracts/nativeContracts";

// Re-export formatters for use in pages
export { txidToFelt, formatBTC, formatBTSUSD };

// ─── Constants ────────────────────────────────────────────────────────────────

const SAT_PRECISION = BigInt(1e8); // 1 BTC = 1e8 sats
const TOKEN_DECIMALS = BigInt("1000000000000000000"); // 1e18
const ORACLE_DECIMALS = BigInt(1e8); // price has 8 decimals
const HEALTH_FACTOR_SAFE = BigInt(100); // >= 100 = safe (normalized)

export type HealthStatus = "safe" | "warning" | "danger" | "none";

/** Derive display health status from the normalized health factor (100 = at threshold) */
export function healthStatus(hf: bigint): HealthStatus {
  if (hf === BigInt(0)) return "none";
  if (hf < BigInt(100)) return "danger";
  if (hf < BigInt(115)) return "warning";
  return "safe";
}

/** hf from CDPCore is: (collateral_usd * 10000) / (debt_usd * mcr)
 *  >= 100 = safe at current MCR. Convert to a human-readable collateral ratio.
 *  Formula: CR% = hf * mcr / 100  (approximate — exact MCR is dynamic).
 *  For display we show hf directly: "Health: 154 / 100 (safe)" */
export function formatHealthFactor(hf: bigint): string {
  if (hf === BigInt(0)) return "N/A";
  if (hf >= BigInt(999_999)) return "∞";
  return hf.toString();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseNativeCDPOptions {
  /** Currently selected Bitcoin deposit txid (64 hex chars, no 0x prefix) */
  txid?: string;
}

/** Get the active Starknet wallet account — supports Braavos, Xverse, or any SNIP-6 wallet. */
async function getStarknetAccount() {
  const w = window as any;
  const wallet = w.starknet_braavos ?? w.starknet_xverse ?? w.starknet;
  if (!wallet)
    throw new Error("No Starknet wallet found. Install Braavos or Xverse.");
  await wallet.enable();
  if (!wallet.account)
    throw new Error("Wallet account unavailable after enable().");
  return wallet.account;
}

export function useNativeCDP({ txid }: UseNativeCDPOptions = {}) {
  const { address, status } = useAccount();
  const isConnected = status === "connected";
  const [isPending, setIsPending] = useState(false);

  // Convert txid to felt252 for on-chain calls
  const txidFelt = useMemo(() => (txid ? txidToFelt(txid) : undefined), [txid]);

  // ─── Loading states ────────────────────────────────────────────────────────
  const [isRegistering, setIsRegistering] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  // ─── On-chain reads ────────────────────────────────────────────────────────

  const { data: oraclePriceRaw, refetch: refetchPrice } = useReadContract({
    functionName: "get_btc_price",
    address: NATIVE_ADDRESSES.MOCK_ORACLE,
    abi: MOCK_ORACLE_ABI as any,
    args: [],
    watch: true,
  });

  const { data: oracleVolRaw } = useReadContract({
    functionName: "get_btc_volatility",
    address: NATIVE_ADDRESSES.MOCK_ORACLE,
    abi: MOCK_ORACLE_ABI as any,
    args: [],
    watch: true,
  });

  const { data: protocolStatsRaw, refetch: refetchStats } = useReadContract({
    functionName: "get_protocol_stats",
    address: NATIVE_ADDRESSES.CDP_CORE,
    abi: CDP_CORE_ABI as any,
    args: [],
    watch: true,
  });

  const { data: totalVaultsRaw, refetch: refetchTotalVaults } = useReadContract(
    {
      functionName: "get_total_vaults",
      address: NATIVE_ADDRESSES.VAULT_REGISTRY,
      abi: VAULT_REGISTRY_ABI as any,
      args: [],
      watch: true,
    },
  );

  // Vault-specific reads (only when a txid is provided)
  const { data: vaultInfoRaw, refetch: refetchVaultInfo } = useReadContract({
    functionName: "get_vault",
    address: NATIVE_ADDRESSES.VAULT_REGISTRY,
    abi: VAULT_REGISTRY_ABI as any,
    args: txidFelt ? [txidFelt] : [],
    enabled: !!txidFelt,
    watch: true,
  });

  const { data: positionRaw, refetch: refetchPosition } = useReadContract({
    functionName: "get_position",
    address: NATIVE_ADDRESSES.CDP_CORE,
    abi: CDP_CORE_ABI as any,
    args: txidFelt ? [txidFelt] : [],
    enabled: !!txidFelt,
    watch: true,
  });

  const { data: healthFactorRaw, refetch: refetchHF } = useReadContract({
    functionName: "get_health_factor",
    address: NATIVE_ADDRESSES.CDP_CORE,
    abi: CDP_CORE_ABI as any,
    args: txidFelt ? [txidFelt] : [],
    enabled: !!txidFelt,
    watch: true,
  });

  // User's BTSUSD balance
  const { data: btsusdBalanceRaw, refetch: refetchBalance } = useReadContract({
    functionName: "balance_of",
    address: NATIVE_ADDRESSES.BTSUSD_TOKEN,
    abi: BTSUSD_TOKEN_ABI as any,
    args: address ? [address] : [],
    enabled: isConnected,
    watch: true,
  });

  // BTSUSD total supply
  const { data: totalSupplyRaw } = useReadContract({
    functionName: "total_supply",
    address: NATIVE_ADDRESSES.BTSUSD_TOKEN,
    abi: BTSUSD_TOKEN_ABI as any,
    args: [],
    watch: true,
  });

  // ─── Derived values ────────────────────────────────────────────────────────

  const btcPrice = useMemo(() => {
    if (!oraclePriceRaw) return BigInt(0);
    const raw = oraclePriceRaw as any;
    // Returns (u256, u64) — price is first element.
    // starknet-react may return tuples as object with numeric keys, not a true Array.
    const first = Array.isArray(raw) ? raw[0] : (raw[0] ?? raw["0"]);
    if (first !== undefined) return parseU256(first);
    return parseU256(raw);
  }, [oraclePriceRaw]);

  const btcPriceUSD = useMemo(() => {
    if (btcPrice === BigInt(0)) return 0;
    return Number(btcPrice) / 1e8;
  }, [btcPrice]);

  const volatilityPct = useMemo(() => {
    if (!oracleVolRaw) return 0;
    return Number(oracleVolRaw) / 1e8;
  }, [oracleVolRaw]);

  // Dynamic MCR mirrors the on-chain formula: 150 + vol_pct / 2, capped at 250
  const dynamicMCR = useMemo(() => {
    const mcr = 150 + Math.floor(volatilityPct / 2);
    return Math.min(mcr, 250);
  }, [volatilityPct]);

  const protocolStats = useMemo(() => {
    if (!protocolStatsRaw) return { totalBTC: BigInt(0), totalDebt: BigInt(0) };
    const raw = protocolStatsRaw as any;
    const el0 = Array.isArray(raw) ? raw[0] : (raw[0] ?? raw["0"]);
    const el1 = Array.isArray(raw) ? raw[1] : (raw[1] ?? raw["1"]);
    if (el0 !== undefined) {
      return { totalBTC: parseU256(el0), totalDebt: parseU256(el1 ?? 0) };
    }
    return { totalBTC: BigInt(0), totalDebt: BigInt(0) };
  }, [protocolStatsRaw]);

  const totalVaults = useMemo(() => {
    if (!totalVaultsRaw) return 0;
    return Number(totalVaultsRaw);
  }, [totalVaultsRaw]);

  const vaultInfo = useMemo(() => {
    if (!vaultInfoRaw) return null;
    const raw = vaultInfoRaw as any;
    const stateVariant = raw.state?.variant ?? raw.state;
    const state: "Active" | "Repaid" | "Liquidated" =
      stateVariant?.Active !== undefined
        ? "Active"
        : stateVariant?.Repaid !== undefined
          ? "Repaid"
          : "Liquidated";

    return {
      owner: raw.owner as string,
      btcAmount: parseU256(raw.btc_amount),
      state,
      registeredAt: Number(raw.registered_at ?? 0),
    };
  }, [vaultInfoRaw]);

  const position = useMemo(() => {
    if (!positionRaw) return { btcSats: BigInt(0), debtBTSUSD: BigInt(0) };
    const raw = positionRaw as any;
    const el0 = Array.isArray(raw) ? raw[0] : (raw[0] ?? raw["0"]);
    const el1 = Array.isArray(raw) ? raw[1] : (raw[1] ?? raw["1"]);
    if (el0 !== undefined) {
      return { btcSats: parseU256(el0), debtBTSUSD: parseU256(el1 ?? 0) };
    }
    return { btcSats: BigInt(0), debtBTSUSD: BigInt(0) };
  }, [positionRaw]);

  const healthFactor = useMemo(() => {
    if (!healthFactorRaw) return BigInt(0);
    return parseU256(healthFactorRaw);
  }, [healthFactorRaw]);

  const btsusdBalance = useMemo(
    () => parseU256(btsusdBalanceRaw),
    [btsusdBalanceRaw],
  );

  const totalSupply = useMemo(
    () => parseU256(totalSupplyRaw),
    [totalSupplyRaw],
  );

  // Collateral value in USD
  const collateralUSD = useMemo(() => {
    if (position.btcSats === BigInt(0) || btcPrice === BigInt(0)) return 0;
    return (Number(position.btcSats) / 1e8) * btcPriceUSD;
  }, [position.btcSats, btcPrice, btcPriceUSD]);

  // Debt value in USD (BTSUSD is 1:1 with USD)
  const debtUSD = useMemo(
    () => Number(position.debtBTSUSD) / 1e18,
    [position.debtBTSUSD],
  );

  // Max mintable BTSUSD at current dynamic MCR
  const maxMintable = useMemo(() => {
    if (collateralUSD === 0 || btcPrice === BigInt(0)) return BigInt(0);
    const maxDebt = (collateralUSD * 100) / dynamicMCR - debtUSD;
    if (maxDebt <= 0) return BigInt(0);
    return BigInt(Math.floor(maxDebt * 1e18));
  }, [collateralUSD, dynamicMCR, debtUSD]);

  const hfStatus = useMemo(() => healthStatus(healthFactor), [healthFactor]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  /**
   * Register a Bitcoin vault by txid.
   * @param depositTxid - 64-char hex Bitcoin deposit txid
   * @param btcAmountSats - BTC amount in satoshis (e.g. 100_000_000 = 1 BTC)
   */
  const registerVault = useCallback(
    async (depositTxid: string, btcAmountSats: bigint) => {
      // wallet check is handled by getStarknetAccount()

      const felt = txidToFelt(depositTxid);
      const cdp = new Contract({
        abi: CDP_CORE_ABI as any,
        address: NATIVE_ADDRESSES.CDP_CORE,
      });
      const call = cdp.populate("register_vault", [
        felt,
        cairo.uint256(btcAmountSats),
      ]);

      setIsRegistering(true);
      setIsPending(true);
      const notifId = notification.loading("Awaiting wallet confirmation…");
      try {
        const account = await getStarknetAccount();
        const { transaction_hash } = await account.execute([call]);
        notification.remove(notifId);
        notification.success(
          `Vault registered! Tx: ${transaction_hash.slice(0, 10)}…`,
        );
      } finally {
        setIsRegistering(false);
        setIsPending(false);
        notification.remove(notifId);
      }
    },
    [address],
  );

  /**
   * Mint BTSUSD debt against a registered vault.
   * @param depositTxid - vault txid
   * @param amount - BTSUSD amount (18 decimals)
   */
  const mintDebt = useCallback(
    async (depositTxid: string, amount: bigint) => {
      // wallet check is handled by getStarknetAccount()

      const felt = txidToFelt(depositTxid);
      const cdp = new Contract({
        abi: CDP_CORE_ABI as any,
        address: NATIVE_ADDRESSES.CDP_CORE,
      });
      const call = cdp.populate("mint_debt", [felt, cairo.uint256(amount)]);

      setIsMinting(true);
      setIsPending(true);
      const notifId = notification.loading("Awaiting wallet confirmation…");
      try {
        const account = await getStarknetAccount();
        const { transaction_hash } = await account.execute([call]);
        notification.remove(notifId);
        notification.success(
          `BTSUSD minted! Tx: ${transaction_hash.slice(0, 10)}…`,
        );
      } finally {
        setIsMinting(false);
        setIsPending(false);
        notification.remove(notifId);
      }
    },
    [address],
  );

  /**
   * Repay BTSUSD debt.
   * @param depositTxid - vault txid
   * @param amount - BTSUSD amount (18 decimals)
   */
  const repayDebt = useCallback(
    async (depositTxid: string, amount: bigint) => {
      // wallet check is handled by getStarknetAccount()

      const felt = txidToFelt(depositTxid);
      const cdp = new Contract({
        abi: CDP_CORE_ABI as any,
        address: NATIVE_ADDRESSES.CDP_CORE,
      });
      const call = cdp.populate("repay_debt", [felt, cairo.uint256(amount)]);

      setIsRepaying(true);
      setIsPending(true);
      const notifId = notification.loading("Awaiting wallet confirmation…");
      try {
        const account = await getStarknetAccount();
        const { transaction_hash } = await account.execute([call]);
        notification.remove(notifId);
        notification.success(
          `Debt repaid! Tx: ${transaction_hash.slice(0, 10)}…`,
        );
      } finally {
        setIsRepaying(false);
        setIsPending(false);
        notification.remove(notifId);
      }
    },
    [address],
  );

  const refetchAll = useCallback(() => {
    refetchPrice();
    refetchStats();
    refetchTotalVaults();
    refetchBalance();
    if (txidFelt) {
      refetchVaultInfo();
      refetchPosition();
      refetchHF();
    }
  }, [
    refetchPrice,
    refetchStats,
    refetchTotalVaults,
    refetchBalance,
    txidFelt,
    refetchVaultInfo,
    refetchPosition,
    refetchHF,
  ]);

  return {
    // Wallet
    isConnected,
    address,

    // Oracle
    btcPrice,
    btcPriceUSD,
    volatilityPct,
    dynamicMCR,

    // Protocol
    totalBTC: protocolStats.totalBTC,
    totalDebt: protocolStats.totalDebt,
    totalVaults,
    totalSupply,

    // Current vault
    txidFelt,
    vaultInfo,
    position,
    healthFactor,
    hfStatus,
    collateralUSD,
    debtUSD,
    maxMintable,

    // User
    btsusdBalance,

    // Actions
    registerVault,
    mintDebt,
    repayDebt,
    refetchAll,

    // Loading
    isRegistering: isRegistering || isPending,
    isMinting: isMinting || isPending,
    isRepaying: isRepaying || isPending,
    isLoading: isPending,

    // Constants
    HEALTH_FACTOR_SAFE,
    SAT_PRECISION,
    TOKEN_DECIMALS,
  };
}
