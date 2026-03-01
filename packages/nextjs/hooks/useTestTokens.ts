"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { Contract, Call } from "starknet";
import { useDeployedContractInfo } from "./scaffold-stark/useDeployedContractInfo";
import { useTransactor } from "./scaffold-stark/useTransactor";

/**
 * Test token configuration
 */
export interface TestToken {
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  mintAmount: bigint; // Default amount to mint
  contractName: string;
}

/**
 * Available test tokens for the faucet
 */
export const TEST_TOKENS: TestToken[] = [
  {
    symbol: "wBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    icon: "/bitcoin-btc-logo.svg",
    mintAmount: BigInt(100000000000), // 1000 wBTC
    contractName: "MockWBTC",
  },
  // Add more tokens as they become available
  // {
  //   symbol: "BTSUSD",
  //   name: "Bitcoin Standard USD",
  //   decimals: 18,
  //   icon: "/bitcoin-btc-logo.svg",
  //   mintAmount: BigInt("1000000000000000000000"), // 1000 BTSUSD
  //   contractName: "BTSUSDToken",
  // },
];

/**
 * Format token amount for display
 */
export function formatTokenDisplay(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = amount / divisor;
  const fracPart = amount % divisor;
  const fracStr = fracPart.toString().padStart(decimals, "0").slice(0, 4);
  return `${intPart.toLocaleString()}.${fracStr}`;
}

/**
 * Hook for interacting with test token faucet
 */
export function useTestTokens() {
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  // Get MockWBTC contract info
  const { data: wbtcData } = useDeployedContractInfo("MockWBTC" as any);

  // Read wBTC balance
  const { data: wbtcBalanceRaw, refetch: refetchWbtcBalance } = useReadContract(
    {
      functionName: "balance_of",
      address: wbtcData?.address,
      abi: wbtcData?.abi,
      args: address ? [address] : [],
      enabled: !!wbtcData?.address && isConnected,
      watch: true,
    },
  );

  // Use transactor for sending transactions
  const { writeTransaction, sendTransactionInstance } = useTransactor();
  const { isPending } = sendTransactionInstance;

  // Local minting state
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<Error | null>(null);

  // Parse balances
  const balances = useMemo(() => {
    const wbtcBalance = wbtcBalanceRaw
      ? BigInt((wbtcBalanceRaw as any).toString())
      : BigInt(0);

    return {
      wBTC: wbtcBalance,
    };
  }, [wbtcBalanceRaw]);

  // Check if contracts are deployed
  const isDeployed = useMemo(
    () => ({
      wBTC: !!wbtcData?.address,
    }),
    [wbtcData],
  );

  // Mint function
  const mint = useCallback(
    async (token: TestToken, amount?: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      if (!wbtcData?.address || !wbtcData?.abi) {
        throw new Error("Contract not deployed");
      }

      setIsMinting(true);
      setMintError(null);

      try {
        const mintAmount = amount || token.mintAmount;

        // Create contract instance
        const contract = new Contract({
          abi: wbtcData.abi,
          address: wbtcData.address,
        });

        // Build mint call
        const call = contract.populate("mint", [address, mintAmount]);

        // Execute transaction using transactor
        const result = await writeTransaction([call as Call]);
        return result;
      } catch (err: any) {
        setMintError(err);
        throw err;
      } finally {
        setIsMinting(false);
      }
    },
    [address, wbtcData, writeTransaction],
  );

  // Refetch all balances
  const refetchBalances = useCallback(() => {
    refetchWbtcBalance();
  }, [refetchWbtcBalance]);

  return {
    // State
    isConnected,
    address,
    isDeployed,
    balances,

    // Actions
    mint,
    refetchBalances,

    // Loading/error states
    isMinting: isMinting || isPending,
    error: mintError,

    // Token list
    tokens: TEST_TOKENS,
  };
}
