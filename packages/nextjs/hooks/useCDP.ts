"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { Contract, Call } from "starknet";
import { useDeployedContractInfo } from "./scaffold-stark/useDeployedContractInfo";
import { useTransactor } from "./scaffold-stark/useTransactor";

/**
 * Constants for the CDP system
 */
const PRECISION = BigInt(10000);
const MIN_COLLATERAL_RATIO = BigInt(15000); // 150%
const LIQUIDATION_THRESHOLD = BigInt(12000); // 120%
const MAX_LTV = BigInt(6667); // 66.67%
const WBTC_DECIMALS = BigInt(100000000); // 1e8
const BTSUSD_DECIMALS = BigInt("1000000000000000000"); // 1e18
const PRICE_DECIMALS = BigInt(100000000); // 1e8

/**
 * Format wBTC amount (8 decimals)
 */
export function formatWBTC(amount: bigint | undefined, displayDecimals: number = 4): string {
  if (!amount || amount === BigInt(0)) return "0";
  const divisor = WBTC_DECIMALS;
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(8, "0").slice(0, displayDecimals);
  return `${integerPart.toLocaleString()}.${fractionalStr}`;
}

/**
 * Format BTSUSD amount (18 decimals)
 */
export function formatBTSUSD(amount: bigint | undefined, displayDecimals: number = 2): string {
  if (!amount || amount === BigInt(0)) return "0";
  const divisor = BTSUSD_DECIMALS;
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(18, "0").slice(0, displayDecimals);
  return `${integerPart.toLocaleString()}.${fractionalStr}`;
}

/**
 * Format collateral ratio as percentage
 */
export function formatRatio(ratio: bigint | undefined): string {
  if (!ratio || ratio === BigInt(0)) return "N/A";
  const percentage = Number(ratio) / 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get health status based on collateral ratio
 */
export function getHealthStatus(ratio: bigint): "healthy" | "warning" | "danger" | "none" {
  if (ratio === BigInt(0)) return "none";
  if (ratio < LIQUIDATION_THRESHOLD) return "danger";
  if (ratio < MIN_COLLATERAL_RATIO) return "warning";
  return "healthy";
}

/**
 * Hook for interacting with BTSUSDVault (CDP) contract
 */
export function useCDP() {
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  // Get deployed contract info
  const { data: vaultData } = useDeployedContractInfo("BTSUSDVault" as any);
  const { data: wbtcData } = useDeployedContractInfo("MockWBTC" as any);
  const { data: btsusdData } = useDeployedContractInfo("BTSUSDToken" as any);
  const { data: oracleData } = useDeployedContractInfo("MockOracle" as any);

  const isVaultDeployed = !!vaultData?.address;
  const isWbtcDeployed = !!wbtcData?.address;
  const isBtsusdDeployed = !!btsusdData?.address;

  // Use transactor for sending transactions
  const { writeTransaction, sendTransactionInstance } = useTransactor();
  const { isPending } = sendTransactionInstance;

  // Local action states
  const [isDepositingCollateral, setIsDepositingCollateral] = useState(false);
  const [isWithdrawingCollateral, setIsWithdrawingCollateral] = useState(false);
  const [isMintingBTSUSD, setIsMintingBTSUSD] = useState(false);
  const [isBurningBTSUSD, setIsBurningBTSUSD] = useState(false);

  // Read protocol stats
  const { data: protocolStatsRaw, refetch: refetchProtocolStats } = useReadContract({
    functionName: "get_protocol_stats",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: [],
    enabled: isVaultDeployed,
    watch: true,
  });

  const { data: btcPriceRaw, refetch: refetchBtcPrice } = useReadContract({
    functionName: "get_btc_price",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: [],
    enabled: isVaultDeployed,
    watch: true,
  });

  // Read user position
  const { data: positionRaw, refetch: refetchPosition } = useReadContract({
    functionName: "get_position",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isVaultDeployed && isConnected,
    watch: true,
  });

  const { data: collateralRatioRaw, refetch: refetchCollateralRatio } = useReadContract({
    functionName: "get_collateral_ratio",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isVaultDeployed && isConnected,
    watch: true,
  });

  const { data: isLiquidatableRaw, refetch: refetchIsLiquidatable } = useReadContract({
    functionName: "is_liquidatable",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isVaultDeployed && isConnected,
    watch: true,
  });

  const { data: maxMintableRaw, refetch: refetchMaxMintable } = useReadContract({
    functionName: "get_max_mintable",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isVaultDeployed && isConnected,
    watch: true,
  });

  const { data: maxWithdrawableRaw, refetch: refetchMaxWithdrawable } = useReadContract({
    functionName: "get_max_withdrawable",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isVaultDeployed && isConnected,
    watch: true,
  });

  // Read user balances
  const { data: wbtcBalanceRaw, refetch: refetchWbtcBalance } = useReadContract({
    functionName: "balance_of",
    address: wbtcData?.address,
    abi: wbtcData?.abi,
    args: address ? [address] : [],
    enabled: isWbtcDeployed && isConnected,
    watch: true,
  });

  const { data: btsusdBalanceRaw, refetch: refetchBtsusdBalance } = useReadContract({
    functionName: "balance_of",
    address: btsusdData?.address,
    abi: btsusdData?.abi,
    args: address ? [address] : [],
    enabled: isBtsusdDeployed && isConnected,
    watch: true,
  });

  // Parse values
  const protocolStats = useMemo(() => {
    if (!protocolStatsRaw) return { totalCollateral: BigInt(0), totalDebt: BigInt(0) };
    const stats = protocolStatsRaw as any;
    return {
      totalCollateral: stats[0] ? BigInt(stats[0].toString()) : BigInt(0),
      totalDebt: stats[1] ? BigInt(stats[1].toString()) : BigInt(0),
    };
  }, [protocolStatsRaw]);

  const btcPrice = useMemo(() => {
    return btcPriceRaw ? BigInt((btcPriceRaw as any).toString()) : BigInt(0);
  }, [btcPriceRaw]);

  const btcPriceUSD = useMemo(() => {
    if (btcPrice === BigInt(0)) return 0;
    return Number(btcPrice) / Number(PRICE_DECIMALS);
  }, [btcPrice]);

  const position = useMemo(() => {
    if (!positionRaw) return { collateral: BigInt(0), debt: BigInt(0), lastUpdate: BigInt(0) };
    const pos = positionRaw as any;
    return {
      collateral: pos.collateral ? BigInt(pos.collateral.toString()) : BigInt(0),
      debt: pos.debt ? BigInt(pos.debt.toString()) : BigInt(0),
      lastUpdate: pos.last_update ? BigInt(pos.last_update.toString()) : BigInt(0),
    };
  }, [positionRaw]);

  const collateralRatio = useMemo(() => {
    return collateralRatioRaw ? BigInt((collateralRatioRaw as any).toString()) : BigInt(0);
  }, [collateralRatioRaw]);

  const isLiquidatable = useMemo(() => {
    if (!isLiquidatableRaw) return false;
    return (isLiquidatableRaw as any) === true || (isLiquidatableRaw as any)?.variant?.True !== undefined;
  }, [isLiquidatableRaw]);

  const maxMintable = useMemo(() => {
    return maxMintableRaw ? BigInt((maxMintableRaw as any).toString()) : BigInt(0);
  }, [maxMintableRaw]);

  const maxWithdrawable = useMemo(() => {
    return maxWithdrawableRaw ? BigInt((maxWithdrawableRaw as any).toString()) : BigInt(0);
  }, [maxWithdrawableRaw]);

  const wbtcBalance = useMemo(() => {
    return wbtcBalanceRaw ? BigInt((wbtcBalanceRaw as any).toString()) : BigInt(0);
  }, [wbtcBalanceRaw]);

  const btsusdBalance = useMemo(() => {
    return btsusdBalanceRaw ? BigInt((btsusdBalanceRaw as any).toString()) : BigInt(0);
  }, [btsusdBalanceRaw]);

  const healthStatus = useMemo(() => {
    return getHealthStatus(collateralRatio);
  }, [collateralRatio]);

  // Calculate collateral value in USD
  const collateralValueUSD = useMemo(() => {
    if (position.collateral === BigInt(0) || btcPrice === BigInt(0)) return 0;
    const value = (position.collateral * btcPrice) / WBTC_DECIMALS / PRICE_DECIMALS;
    return Number(value);
  }, [position.collateral, btcPrice]);

  // Actions
  const depositCollateral = useCallback(
    async (amount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi || !wbtcData?.address || !wbtcData?.abi) {
        throw new Error("Contracts not deployed or wallet not connected");
      }

      setIsDepositingCollateral(true);
      try {
        // First approve wBTC spending
        const wbtcContract = new Contract({
          abi: wbtcData.abi,
          address: wbtcData.address,
        });
        const approveCall = wbtcContract.populate("approve", [vaultData.address, amount]);

        // Then deposit collateral
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const depositCall = vaultContract.populate("deposit_collateral", [amount]);

        await writeTransaction([approveCall as Call, depositCall as Call]);
      } finally {
        setIsDepositingCollateral(false);
      }
    },
    [address, vaultData, wbtcData, writeTransaction]
  );

  const withdrawCollateral = useCallback(
    async (amount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsWithdrawingCollateral(true);
      try {
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const withdrawCall = vaultContract.populate("withdraw_collateral", [amount]);

        await writeTransaction([withdrawCall as Call]);
      } finally {
        setIsWithdrawingCollateral(false);
      }
    },
    [address, vaultData, writeTransaction]
  );

  const mintBTSUSD = useCallback(
    async (amount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsMintingBTSUSD(true);
      try {
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const mintCall = vaultContract.populate("mint_BTSUSD", [amount]);

        await writeTransaction([mintCall as Call]);
      } finally {
        setIsMintingBTSUSD(false);
      }
    },
    [address, vaultData, writeTransaction]
  );

  const burnBTSUSD = useCallback(
    async (amount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsBurningBTSUSD(true);
      try {
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const burnCall = vaultContract.populate("burn_BTSUSD", [amount]);

        await writeTransaction([burnCall as Call]);
      } finally {
        setIsBurningBTSUSD(false);
      }
    },
    [address, vaultData, writeTransaction]
  );

  const depositAndMint = useCallback(
    async (collateralAmount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi || !wbtcData?.address || !wbtcData?.abi) {
        throw new Error("Contracts not deployed or wallet not connected");
      }

      setIsDepositingCollateral(true);
      setIsMintingBTSUSD(true);
      try {
        // First approve wBTC spending
        const wbtcContract = new Contract({
          abi: wbtcData.abi,
          address: wbtcData.address,
        });
        const approveCall = wbtcContract.populate("approve", [vaultData.address, collateralAmount]);

        // Then deposit and mint
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const depositMintCall = vaultContract.populate("deposit_and_mint", [collateralAmount]);

        await writeTransaction([approveCall as Call, depositMintCall as Call]);
      } finally {
        setIsDepositingCollateral(false);
        setIsMintingBTSUSD(false);
      }
    },
    [address, vaultData, wbtcData, writeTransaction]
  );

  const repayAndWithdraw = useCallback(
    async (btsusdAmount: bigint) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsBurningBTSUSD(true);
      setIsWithdrawingCollateral(true);
      try {
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const repayWithdrawCall = vaultContract.populate("repay_and_withdraw", [btsusdAmount]);

        await writeTransaction([repayWithdrawCall as Call]);
      } finally {
        setIsBurningBTSUSD(false);
        setIsWithdrawingCollateral(false);
      }
    },
    [address, vaultData, writeTransaction]
  );

  // Refetch all data
  const refetchAll = useCallback(() => {
    refetchProtocolStats();
    refetchBtcPrice();
    refetchPosition();
    refetchCollateralRatio();
    refetchIsLiquidatable();
    refetchMaxMintable();
    refetchMaxWithdrawable();
    refetchWbtcBalance();
    refetchBtsusdBalance();
  }, [
    refetchProtocolStats,
    refetchBtcPrice,
    refetchPosition,
    refetchCollateralRatio,
    refetchIsLiquidatable,
    refetchMaxMintable,
    refetchMaxWithdrawable,
    refetchWbtcBalance,
    refetchBtsusdBalance,
  ]);

  return {
    // Connection state
    isConnected,
    address,
    isVaultDeployed,

    // Protocol stats
    totalCollateral: protocolStats.totalCollateral,
    totalDebt: protocolStats.totalDebt,
    btcPrice,
    btcPriceUSD,

    // User position
    position,
    collateralRatio,
    healthStatus,
    isLiquidatable,
    maxMintable,
    maxWithdrawable,
    collateralValueUSD,

    // User balances
    wbtcBalance,
    btsusdBalance,

    // Contract addresses
    vaultAddress: vaultData?.address,
    wbtcAddress: wbtcData?.address,
    btsusdAddress: btsusdData?.address,

    // Constants
    MIN_COLLATERAL_RATIO,
    LIQUIDATION_THRESHOLD,
    MAX_LTV,

    // Actions
    depositCollateral,
    withdrawCollateral,
    mintBTSUSD,
    burnBTSUSD,
    depositAndMint,
    repayAndWithdraw,
    refetchAll,

    // Loading states
    isDepositingCollateral: isDepositingCollateral || isPending,
    isWithdrawingCollateral: isWithdrawingCollateral || isPending,
    isMintingBTSUSD: isMintingBTSUSD || isPending,
    isBurningBTSUSD: isBurningBTSUSD || isPending,
    isLoading: isPending,
  };
}
