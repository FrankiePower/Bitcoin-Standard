"use client";

import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Button } from "~~/components/ui/button";
import { Card, CardContent } from "~~/components/ui/card";
import { Badge } from "~~/components/ui/badge";
import {
  Loader2,
  ExternalLink,
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Bitcoin,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";

type Transaction = {
  id: string;
  type: "deposit" | "mint" | "burn" | "withdraw" | "liquidation";
  amount: string;
  token: string;
  timestamp: Date;
  txHash: string;
  status: "pending" | "confirmed" | "failed";
};

export default function Transactions() {
  const router = useRouter();
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock transaction data
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    // Simulate loading transactions
    const loadTransactions = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data - in production this would come from indexer/API
      setTransactions([
        {
          id: "1",
          type: "deposit",
          amount: "0.05",
          token: "WBTC",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          txHash: "0x1234...abcd",
          status: "confirmed",
        },
        {
          id: "2",
          type: "mint",
          amount: "2500",
          token: "BTSUSD",
          timestamp: new Date(Date.now() - 1000 * 60 * 25),
          txHash: "0x5678...efgh",
          status: "confirmed",
        },
        {
          id: "3",
          type: "burn",
          amount: "500",
          token: "BTSUSD",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          txHash: "0x9abc...ijkl",
          status: "confirmed",
        },
      ]);
      setLoading(false);
    };

    loadTransactions();
  }, [isConnected, router]);

  const refreshTransactions = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
      case "mint":
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case "burn":
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      case "withdraw":
        return <ArrowUpRight className="h-5 w-5 text-red-500" />;
      case "liquidation":
        return <Bitcoin className="h-5 w-5 text-red-500" />;
      default:
        return <History className="h-5 w-5" />;
    }
  };

  const getTransactionLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
        return "Deposit Collateral";
      case "mint":
        return "Mint BTSUSD";
      case "burn":
        return "Repay BTSUSD";
      case "withdraw":
        return "Withdraw Collateral";
      case "liquidation":
        return "Liquidation";
      default:
        return "Transaction";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isConnected) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Transaction History
          </h1>
          <p className="text-muted-foreground mt-2">
            View your vault deposits, mints, and repayments.
          </p>
        </div>

        {/* Wallet Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Connected Wallet
                  </p>
                  <p className="font-mono text-sm">
                    {address
                      ? `${address.slice(0, 10)}...${address.slice(-8)}`
                      : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshTransactions}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-20 flex flex-col gap-2 bg-transparent"
            asChild
          >
            <Link href="/deposit">
              <ArrowDownLeft className="h-6 w-6" />
              <span>Deposit Bitcoin</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col gap-2 bg-transparent"
            asChild
          >
            <Link href="/dashboard">
              <DollarSign className="h-6 w-6" />
              <span>Mint BTSUSD</span>
            </Link>
          </Button>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshTransactions}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <History className="h-4 w-4" />
              )}
            </Button>
          </div>

          {transactions.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <History className="h-6 w-6 opacity-50" />
                </div>
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm mt-1">
                  Deposit Bitcoin to get started with your first vault position.
                </p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/deposit">Deposit Bitcoin</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card
                key={tx.id}
                className="overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-sm"
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getTransactionLabel(tx.type)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold">
                        {tx.type === "deposit" || tx.type === "withdraw"
                          ? ""
                          : tx.type === "burn"
                            ? "-"
                            : "+"}
                        {tx.amount} {tx.token}
                      </div>
                      <Badge
                        variant={
                          tx.status === "confirmed"
                            ? "default"
                            : tx.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        window.open(
                          `https://starkscan.co/tx/${tx.txHash}`,
                          "_blank",
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
