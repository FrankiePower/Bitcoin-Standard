"use client";

import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Button } from "~~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { Badge } from "~~/components/ui/badge";
import {
  Copy,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Info,
  Bitcoin,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAccount } from "@starknet-react/core";

export default function DepositBitcoin() {
  const router = useRouter();
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  const [depositAmount, setDepositAmount] = useState("0.01");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositStatus, setDepositStatus] = useState<
    "pending" | "processing" | "success"
  >("pending");

  // Mock collateral ratio calculation
  const btcPrice = 97500; // Mock BTC price
  const collateralValue = parseFloat(depositAmount || "0") * btcPrice;
  const mintableAmount = collateralValue * 0.66; // 150% collateralization = 66% LTV

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsDepositing(true);
    setDepositStatus("processing");

    // Simulate deposit transaction
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setDepositStatus("success");
      toast.success("Bitcoin deposited successfully!", {
        description: `${depositAmount} WBTC deposited as collateral`,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      toast.error("Deposit failed. Please try again.");
      setDepositStatus("pending");
    } finally {
      setIsDepositing(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-4 pl-0" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Deposit Bitcoin
            </h1>
            <p className="text-muted-foreground mt-2">
              Deposit wrapped Bitcoin (WBTC) as collateral to mint BTSUSD
              stablecoins.
            </p>
          </div>
          <Badge
            variant={depositStatus === "success" ? "default" : "secondary"}
            className={
              depositStatus === "success"
                ? "bg-green-500 hover:bg-green-600"
                : ""
            }
          >
            {depositStatus === "success" && (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            )}
            {depositStatus === "success"
              ? "Deposited"
              : depositStatus === "processing"
                ? "Processing..."
                : "Ready"}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Vault Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4" /> Your Vault
                </CardTitle>
                <CardDescription>Starknet CDP Position</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="w-full space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Connected Address
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={
                        address
                          ? `${address.slice(0, 10)}...${address.slice(-8)}`
                          : ""
                      }
                      readOnly
                      className="font-mono text-xs bg-muted/50"
                    />
                    <Button variant="outline" size="icon" onClick={copyAddress}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="w-full bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Current Collateral
                    </span>
                    <span className="font-medium">0.00 WBTC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">BTSUSD Minted</span>
                    <span className="font-medium">0.00 BTSUSD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health Factor</span>
                    <span className="font-medium text-green-500">--</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit status card */}
            <Card
              className={
                depositStatus === "success"
                  ? "bg-green-500/10 border-green-500/20"
                  : ""
              }
            >
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                {depositStatus === "success" ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-600">
                        Deposit Complete!
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Your collateral is ready to mint BTSUSD.
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push("/dashboard")}
                      className="bg-green-600 hover:bg-green-700 w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>Deposit WBTC to enable minting</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Deposit Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bitcoin className="h-4 w-4 text-orange-500" /> Deposit
                  Collateral
                </CardTitle>
                <CardDescription>
                  Deposit wrapped Bitcoin (WBTC) to your vault position.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deposit Amount</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.001"
                        min="0"
                        className="pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        WBTC
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount("0.1")}
                    >
                      Max
                    </Button>
                  </div>
                </div>

                {/* Collateral Preview */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium">Position Preview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Collateral Value
                      </p>
                      <p className="text-lg font-bold">
                        ${collateralValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Max Mintable BTSUSD
                      </p>
                      <p className="text-lg font-bold text-primary">
                        ${mintableAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>150% minimum collateralization ratio required</span>
                  </div>
                </div>

                {/* BTC Price Info */}
                <div className="flex items-center justify-between text-sm bg-orange-500/10 rounded-lg px-4 py-3 border border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <Bitcoin className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">
                      Current BTC Price
                    </span>
                  </div>
                  <span className="font-bold">
                    ${btcPrice.toLocaleString()}
                  </span>
                </div>

                {/* Deposit Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDeposit}
                  disabled={
                    isDepositing ||
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0
                  }
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      Deposit {depositAmount || "0"} WBTC
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  You will need to approve the WBTC token transfer first.
                </p>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">How Bitcoin Collateral Works</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>
                        Deposit WBTC (wrapped Bitcoin) as collateral into your
                        vault
                      </li>
                      <li>
                        Mint BTSUSD stablecoins up to 66% of your collateral
                        value (150% ratio)
                      </li>
                      <li>
                        Your Bitcoin remains secure and earns no interest while
                        locked
                      </li>
                      <li>
                        Repay BTSUSD + fees to withdraw your Bitcoin anytime
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
