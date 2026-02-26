"use client";

import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Button } from "~~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~~/components/ui/card";
import { Badge } from "~~/components/ui/badge";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import {
  TrendingUp,
  LineChart,
  Coins,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";

export default function YieldStrategies() {
  const router = useRouter();
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  const [yieldEnabled, setYieldEnabled] = useState(false);
  const [apy, setApy] = useState<number>(4.2);
  const [stakedBalance, setStakedBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleToggleYield = async (enable: boolean) => {
    setToggleLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setYieldEnabled(enable);
      toast.success(
        enable ? "Yield Strategy enabled!" : "Yield Strategy disabled",
      );
    } catch {
      toast.error("Failed to update yield settings");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    setDepositLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const amount = parseFloat(depositAmount);
      setStakedBalance((prev) => prev + amount);
      toast.success(`Deposited ${depositAmount} BTSUSD to yield strategy!`);
      setDepositAmount("");
    } catch {
      toast.error("Deposit failed");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const amount = withdrawAmount
        ? parseFloat(withdrawAmount)
        : stakedBalance;
      setStakedBalance((prev) => Math.max(0, prev - amount));
      toast.success(
        `Withdrew ${amount.toFixed(2)} BTSUSD from yield strategy!`,
      );
      setWithdrawAmount("");
    } catch {
      toast.error("Withdraw failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const comingSoon = [
    {
      id: 2,
      name: "Liquidity Provision",
      description:
        "Provide liquidity to BTSUSD/ETH pools on Starknet DEXes for trading fees.",
      apr: "8% - 15%",
      risk: "Medium",
      icon: LineChart,
    },
    {
      id: 3,
      name: "Lending Markets",
      description:
        "Lend your BTSUSD on Starknet lending protocols to earn interest from borrowers.",
      apr: "3% - 6%",
      risk: "Low",
      icon: TrendingUp,
    },
  ];

  if (!isConnected) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Yield Strategies
          </h1>
          <p className="text-muted-foreground mt-2">
            Put your BTSUSD to work with automated yield strategies on Starknet.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Yield Optimization (LIVE) */}
          <Card
            className={yieldEnabled ? "border-primary/50 bg-primary/5" : ""}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex gap-4">
                <div
                  className={`h-12 w-12 rounded-lg flex items-center justify-center ${yieldEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-1">BTSUSD Staking</CardTitle>
                  <CardDescription className="max-w-md">
                    Stake your BTSUSD stablecoins to earn yield from protocol
                    fees and liquidation profits.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={yieldEnabled ? "default" : "outline"}>
                  {yieldEnabled ? "Active" : "Disabled"}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  APY: {apy}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <span className="font-medium text-foreground">Risk Level:</span>
                <span className="text-green-500">Low</span>
                <span className="ml-4 font-medium text-foreground">
                  Protocol:
                </span>
                <span>Bitcoin Standard</span>
              </div>

              {yieldEnabled && (
                <div className="mt-4 space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3 border">
                      <div className="text-muted-foreground mb-1">
                        Staked BTSUSD
                      </div>
                      <div className="text-2xl font-bold">
                        ${stakedBalance.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        earning {apy}% APY
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 border">
                      <div className="text-muted-foreground mb-1">
                        Estimated Earnings
                      </div>
                      <div className="text-2xl font-bold text-green-500">
                        ${((stakedBalance * (apy / 100)) / 12).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        per month
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Deposit BTSUSD</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          min="0"
                          className="h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={handleDeposit}
                          disabled={depositLoading || !depositAmount}
                        >
                          {depositLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowDownToLine className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Withdraw (blank = all)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="All"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          min="0"
                          className="h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleWithdraw}
                          disabled={withdrawLoading || stakedBalance === 0}
                        >
                          {withdrawLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end pt-0">
              <Button
                variant={yieldEnabled ? "outline" : "default"}
                onClick={() => handleToggleYield(!yieldEnabled)}
                disabled={toggleLoading}
              >
                {toggleLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {yieldEnabled ? "Disable Strategy" : "Enable Strategy"}
              </Button>
            </CardFooter>
          </Card>

          {/* Coming Soon */}
          {comingSoon.map((strategy) => (
            <Card
              key={strategy.id}
              className="relative overflow-hidden opacity-70"
            >
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <Badge className="text-sm px-4 py-1.5 bg-background border shadow-md">
                  Coming Soon
                </Badge>
              </div>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                    <strategy.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-1">
                      {strategy.name}
                    </CardTitle>
                    <CardDescription className="max-w-md">
                      {strategy.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">Disabled</Badge>
                  <Badge variant="secondary" className="font-mono">
                    APR: {strategy.apr}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">
                    Risk Level:
                  </span>
                  <span
                    className={
                      strategy.risk === "Medium"
                        ? "text-yellow-500"
                        : "text-green-500"
                    }
                  >
                    {strategy.risk}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-0">
                <Button variant="default" disabled>
                  Enable Strategy
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-8 p-8 text-center border rounded-xl border-dashed bg-muted/10">
          <h3 className="text-lg font-medium mb-2">
            More Strategies Coming Soon
          </h3>
          <p className="text-muted-foreground mb-4">
            Additional yield strategies are coming, including lending,
            liquidity provision, and cross-chain opportunities.
          </p>
          <Button variant="outline" disabled>
            Suggest a Strategy
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
