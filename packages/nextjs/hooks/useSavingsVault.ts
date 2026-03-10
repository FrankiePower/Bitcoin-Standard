"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { Contract, Call } from "starknet";
import { useDeployedContractInfo } from "./scaffold-stark/useDeployedContractInfo";
import { useTransactor } from "./scaffold-stark/useTransactor";

/**
 * RAY = 1e27, precision for chi and vsr calculations
 */
const RAY = BigInt("1000000000000000000000000000");

/**
 * Seconds in a year for APY calculation
 */
const SECONDS_PER_YEAR = 31536000;

/**
 * Convert VSR (ray precision) to APY percentage
 */
export function vsrToApy(vsr: bigint): number {
  if (!vsr || vsr <= RAY) return 0;

  // vsr is per-second rate in ray
  // APY = (vsr / RAY) ^ SECONDS_PER_YEAR - 1
  const vsrFloat = Number(vsr) / Number(RAY);
  const apy = Math.pow(vsrFloat, SECONDS_PER_YEAR) - 1;
  return apy * 100; // Return as percentage
}

/**
 * Format large numbers with appropriate decimal places
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals: number = 8,
  displayDecimals: number = 4,
): string {
  if (!amount || amount === BigInt(0)) return "0";
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  const fractionalStr = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .slice(0, displayDecimals);
  return `${integerPart.toLocaleString()}.${fractionalStr}`;
}

/**
 * Hook for interacting with BTSSavingsVault contract
 */
export function useSavingsVault() {
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  // Get deployed contract info
  const { data: vaultData } = useDeployedContractInfo("BTSSavingsVault" as any);

  const isContractDeployed = !!vaultData?.address;
  const BTSUSD_ADDRESS =
    "0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd";

  // Use transactor for sending transactions
  const { writeTransaction, sendTransactionInstance } = useTransactor();
  const { isPending } = sendTransactionInstance;

  // Local action states
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Read vault stats
  const { data: totalAssetsRaw, refetch: refetchTotalAssets } = useReadContract(
    {
      functionName: "total_assets",
      address: vaultData?.address,
      abi: vaultData?.abi,
      args: [],
      enabled: isContractDeployed,
      watch: true,
    },
  );

  const { data: totalSharesRaw, refetch: refetchTotalShares } = useReadContract(
    {
      functionName: "total_supply",
      address: vaultData?.address,
      abi: vaultData?.abi,
      args: [],
      enabled: isContractDeployed,
      watch: true,
    },
  );

  const { data: vsrRaw, refetch: refetchVsr } = useReadContract({
    functionName: "get_vsr",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: [],
    enabled: isContractDeployed,
    watch: true,
  });

  const { data: depositorCountRaw, refetch: refetchDepositorCount } =
    useReadContract({
      functionName: "get_depositor_count",
      address: vaultData?.address,
      abi: vaultData?.abi,
      args: [],
      enabled: isContractDeployed,
      watch: true,
    });

  const { data: chiRaw, refetch: refetchChi } = useReadContract({
    functionName: "now_chi",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: [],
    enabled: isContractDeployed,
    watch: true,
  });

  // Read user position
  const { data: userSharesRaw, refetch: refetchUserShares } = useReadContract({
    functionName: "balance_of",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isContractDeployed && isConnected,
    watch: true,
  });

  const { data: userAssetsRaw, refetch: refetchUserAssets } = useReadContract({
    functionName: "assets_of",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isContractDeployed && isConnected,
    watch: true,
  });

  const { data: maxDepositRaw, refetch: refetchMaxDeposit } = useReadContract({
    functionName: "max_deposit",
    address: vaultData?.address,
    abi: vaultData?.abi,
    args: address ? [address] : [],
    enabled: isContractDeployed && isConnected,
    watch: true,
  });

  const { data: maxWithdrawRaw, refetch: refetchMaxWithdraw } = useReadContract(
    {
      functionName: "max_withdraw",
      address: vaultData?.address,
      abi: vaultData?.abi,
      args: address ? [address] : [],
      enabled: isContractDeployed && isConnected,
      watch: true,
    },
  );

  // Parse values
  const totalAssets = useMemo(() => {
    return totalAssetsRaw
      ? BigInt((totalAssetsRaw as any).toString())
      : BigInt(0);
  }, [totalAssetsRaw]);

  const totalShares = useMemo(() => {
    return totalSharesRaw
      ? BigInt((totalSharesRaw as any).toString())
      : BigInt(0);
  }, [totalSharesRaw]);

  const vsr = useMemo(() => {
    return vsrRaw ? BigInt((vsrRaw as any).toString()) : RAY;
  }, [vsrRaw]);

  const depositorCount = useMemo(() => {
    return depositorCountRaw
      ? Number((depositorCountRaw as any).toString())
      : 0;
  }, [depositorCountRaw]);

  const currentChi = useMemo(() => {
    return chiRaw ? BigInt((chiRaw as any).toString()) : RAY;
  }, [chiRaw]);

  const userShares = useMemo(() => {
    return userSharesRaw
      ? BigInt((userSharesRaw as any).toString())
      : BigInt(0);
  }, [userSharesRaw]);

  const userAssets = useMemo(() => {
    return userAssetsRaw
      ? BigInt((userAssetsRaw as any).toString())
      : BigInt(0);
  }, [userAssetsRaw]);

  const maxDeposit = useMemo(() => {
    return maxDepositRaw
      ? BigInt((maxDepositRaw as any).toString())
      : BigInt(0);
  }, [maxDepositRaw]);

  const maxWithdraw = useMemo(() => {
    return maxWithdrawRaw
      ? BigInt((maxWithdrawRaw as any).toString())
      : BigInt(0);
  }, [maxWithdrawRaw]);

  // Calculate APY from VSR
  const apy = useMemo(() => {
    return vsrToApy(vsr);
  }, [vsr]);

  // Deposit action
  const deposit = useCallback(
    async (assets: bigint, receiver?: string) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contracts not deployed or wallet not connected");
      }

      setIsDepositing(true);
      try {
        const receiverAddr = receiver || address;

        // First approve BTSUSD spending
        const BTSUSD_ERC20_ABI = [
          {
            type: "function",
            name: "approve",
            inputs: [
              {
                name: "spender",
                type: "core::starknet::contract_address::ContractAddress",
              },
              { name: "amount", type: "core::integer::u256" },
            ],
            outputs: [{ type: "core::bool" }],
            state_mutability: "external",
          },
        ] as const;
        const btsusdContract = new Contract({
          abi: BTSUSD_ERC20_ABI as any,
          address: BTSUSD_ADDRESS,
        });
        const approveCall = btsusdContract.populate("approve", [
          vaultData.address,
          assets,
        ]);

        // Then deposit
        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const depositCall = vaultContract.populate("deposit", [
          assets,
          receiverAddr,
        ]);

        // Execute both calls
        await writeTransaction([approveCall as Call, depositCall as Call]);
      } finally {
        setIsDepositing(false);
      }
    },
    [address, vaultData, writeTransaction],
  );

  // Withdraw action
  const withdraw = useCallback(
    async (assets: bigint, receiver?: string, owner?: string) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsWithdrawing(true);
      try {
        const receiverAddr = receiver || address;
        const ownerAddr = owner || address;

        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const withdrawCall = vaultContract.populate("withdraw", [
          assets,
          receiverAddr,
          ownerAddr,
        ]);

        await writeTransaction([withdrawCall as Call]);
      } finally {
        setIsWithdrawing(false);
      }
    },
    [address, vaultData, writeTransaction],
  );

  // Redeem action
  const redeem = useCallback(
    async (shares: bigint, receiver?: string, owner?: string) => {
      if (!address || !vaultData?.address || !vaultData?.abi) {
        throw new Error("Contract not deployed or wallet not connected");
      }

      setIsRedeeming(true);
      try {
        const receiverAddr = receiver || address;
        const ownerAddr = owner || address;

        const vaultContract = new Contract({
          abi: vaultData.abi,
          address: vaultData.address,
        });
        const redeemCall = vaultContract.populate("redeem", [
          shares,
          receiverAddr,
          ownerAddr,
        ]);

        await writeTransaction([redeemCall as Call]);
      } finally {
        setIsRedeeming(false);
      }
    },
    [address, vaultData, writeTransaction],
  );

  // Refetch all data
  const refetchAll = useCallback(() => {
    refetchTotalAssets();
    refetchTotalShares();
    refetchVsr();
    refetchDepositorCount();
    refetchChi();
    refetchUserShares();
    refetchUserAssets();
    refetchMaxDeposit();
    refetchMaxWithdraw();
  }, [
    refetchTotalAssets,
    refetchTotalShares,
    refetchVsr,
    refetchDepositorCount,
    refetchChi,
    refetchUserShares,
    refetchUserAssets,
    refetchMaxDeposit,
    refetchMaxWithdraw,
  ]);

  return {
    // Connection state
    isConnected,
    address,
    isContractDeployed,

    // Vault stats
    totalAssets,
    totalShares,
    depositCap: BigInt(0), // TODO: add to contract read
    depositorCount,
    currentChi,
    vsr,
    apy,

    // User position
    userAssets,
    userShares,
    maxDeposit,
    maxWithdraw,

    // Contract addresses
    vaultAddress: vaultData?.address,

    // Actions
    deposit,
    withdraw,
    redeem,
    refetchAll,

    // Loading states
    isDepositing: isDepositing || isPending,
    isWithdrawing: isWithdrawing || isPending,
    isRedeeming: isRedeeming || isPending,
    isLoading: isPending,
  };
}
