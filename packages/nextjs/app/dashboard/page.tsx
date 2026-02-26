"use client";

import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Button } from "~~/components/ui/button";
import {
  Loader2,
  Copy,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Bug,
  Zap,
  Activity,
  ArrowDownToLine,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "@starknet-react/core";
import useScaffoldStrkBalance from "~~/hooks/scaffold-stark/useScaffoldStrkBalance";

export default function Dashboard() {
  const { address, status } = useAccount();
  const strkBalanceResult = useScaffoldStrkBalance({ address });
  const strkBalance = strkBalanceResult?.formatted || "0";
  const balanceLoading = strkBalanceResult?.isLoading;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };

  // Open in block explorer
  const openInExplorer = () => {
    if (address) {
      window.open(`https://starkscan.co/contract/${address}`, "_blank");
    }
  };

  if (!mounted || status === "connecting" || status === "reconnecting") {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-neutral-800 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-xs text-neutral-500 font-mono">LOADING_DATA...</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Format address for display
  const shortAddress = address
    ? `${address.slice(0, 10)}...${address.slice(-8)}`
    : "";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Activity className="w-3 h-3 text-orange-500" />
              <span className="font-mono">CONTROL_CENTER</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SYSTEM_DASHBOARD
            </h1>
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-black font-mono text-xs">
            <Link href="/debug">
              <Bug className="mr-2 h-4 w-4" /> DEBUG_CONTRACTS
            </Link>
          </Button>
        </div>

        {/* Wallet Card */}
        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Wallet className="w-4 h-4 text-orange-500" />
                <span className="font-mono">WALLET_STATUS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-500 font-mono">CONNECTED</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
              >
                <Copy className="h-4 w-4 text-neutral-400" />
              </button>
              <button
                onClick={openInExplorer}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="bg-black/50 border border-neutral-800 p-4 mb-6">
            <div className="text-[10px] text-neutral-500 mb-1 font-mono tracking-wider">
              WALLET_ADDRESS
            </div>
            <div className="font-mono text-sm text-orange-500 break-all">
              {address || "NOT_CONNECTED"}
            </div>
          </div>

          {/* Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-black/50 border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 mb-2 font-mono tracking-wider">
                STRK_BALANCE
              </div>
              {balanceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              ) : (
                <div className="text-xl font-bold text-white font-mono">
                  {Number(strkBalance).toFixed(4)}
                  <span className="text-xs text-neutral-500 ml-2">STRK</span>
                </div>
              )}
            </div>
            <div className="bg-black/50 border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 mb-2 font-mono tracking-wider">
                BTSUSD_BALANCE
              </div>
              <div className="text-xl font-bold text-white font-mono">
                0.00
                <span className="text-xs text-neutral-500 ml-2">BTSUSD</span>
              </div>
            </div>
            <div className="bg-black/50 border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 mb-2 font-mono tracking-wider">
                COLLATERAL_RATIO
              </div>
              <div className="text-xl font-bold text-green-500 font-mono">
                ---
                <span className="text-xs text-neutral-500 ml-2">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Protocol Info */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <div className="bg-neutral-900 border border-neutral-800 p-6">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="font-mono">QUICK_OPERATIONS</span>
            </div>

            <div className="space-y-3">
              <Link
                href="/create-vault"
                className="flex items-center justify-between p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-mono text-white">CREATE_VAULT</div>
                    <div className="text-[10px] text-neutral-500">Initialize new CDP position</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-500 transition-colors" />
              </Link>

              <Link
                href="/deposit"
                className="flex items-center justify-between p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ArrowDownToLine className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-mono text-white">DEPOSIT_BTC</div>
                    <div className="text-[10px] text-neutral-500">Add collateral to vault</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-500 transition-colors" />
              </Link>

              <Link
                href="/yield"
                className="flex items-center justify-between p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-mono text-white">YIELD_STRATEGIES</div>
                    <div className="text-[10px] text-neutral-500">Optimize returns</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-500 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Protocol Info */}
          <div className="bg-neutral-900 border border-neutral-800 p-6">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="font-mono">PROTOCOL_PARAMETERS</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-black/50 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-mono">NETWORK</span>
                <span className="text-xs text-white font-mono">STARKNET</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/50 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-mono">COLLATERAL_TYPE</span>
                <span className="text-xs text-orange-500 font-mono">WBTC</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/50 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-mono">MIN_RATIO</span>
                <span className="text-xs text-white font-mono">150%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/50 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-mono">LIQUIDATION</span>
                <span className="text-xs text-white font-mono">125%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black/50 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-mono">STATUS</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-500 font-mono">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Development Tools */}
        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
            <Bug className="w-4 h-4 text-orange-500" />
            <span className="font-mono">DEVELOPMENT_TOOLS</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/debug"
              className="flex items-center gap-3 p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all"
            >
              <Bug className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm font-mono text-white">DEBUG</div>
                <div className="text-[10px] text-neutral-500">Contract interactions</div>
              </div>
            </Link>

            <Link
              href="/blockexplorer"
              className="flex items-center gap-3 p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all"
            >
              <ExternalLink className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm font-mono text-white">EXPLORER</div>
                <div className="text-[10px] text-neutral-500">View transactions</div>
              </div>
            </Link>

            <Link
              href="/configure"
              className="flex items-center gap-3 p-4 bg-black/50 border border-neutral-800 hover:border-orange-500/50 transition-all"
            >
              <Wallet className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm font-mono text-white">CONFIGURE</div>
                <div className="text-[10px] text-neutral-500">Download ABIs</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
