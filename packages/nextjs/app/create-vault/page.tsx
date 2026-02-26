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
import { Label } from "~~/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Shield,
  Bitcoin,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount } from "@starknet-react/core";

export default function CreateVault() {
  const router = useRouter();
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  const [isCreating, setIsCreating] = useState(false);
  const [vaultCreated, setVaultCreated] = useState(false);
  const [vaultId, setVaultId] = useState<string>("");
  const [initialDeposit, setInitialDeposit] = useState("0.01");

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleCreateVault = async () => {
    setIsCreating(true);

    try {
      // Simulate vault creation transaction
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const newVaultId = `VAULT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setVaultId(newVaultId);
      setVaultCreated(true);

      toast.success("Vault created successfully!", {
        description: `Vault ID: ${newVaultId}`,
      });

      // Auto-redirect to deposit page
      setTimeout(() => {
        router.push("/deposit");
      }, 3000);
    } catch (error: any) {
      console.error("Error creating vault:", error);
      toast.error(error.message || "Failed to create vault. Please try again.");
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  // Success state
  if (vaultCreated) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Vault Created!</h3>
                  <p className="text-muted-foreground mt-2">
                    Your CDP vault is ready to accept Bitcoin collateral.
                  </p>
                </div>

                {/* Vault ID Display */}
                <div className="w-full max-w-md bg-muted/50 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    Vault ID
                  </div>
                  <div className="font-mono text-lg font-bold">{vaultId}</div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Redirecting to deposit page in 3 seconds...
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => router.push("/deposit")} size="lg">
                    Deposit Bitcoin Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="outline"
                    size="lg"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Creating state
  if (isCreating) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Creating Your Vault</h3>
                  <p className="text-muted-foreground mt-2">
                    Setting up your CDP position on Starknet...
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-muted-foreground">
                      Initializing vault contract
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-muted-foreground">
                      Setting collateralization parameters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-muted-foreground">
                      Registering with protocol
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Initial state - ready to create
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Create CDP Vault
          </h1>
          <p className="text-muted-foreground mt-2">
            Open a new Collateralized Debt Position to deposit Bitcoin and mint
            BTSUSD.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Bitcoin Standard Vault
            </CardTitle>
            <CardDescription>
              Create a secure vault to manage your Bitcoin collateral and BTSUSD
              debt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bitcoin className="h-3 w-3 text-orange-500" />
                </div>
                <div>
                  <div className="font-medium">Bitcoin Collateral</div>
                  <div className="text-sm text-muted-foreground">
                    Deposit WBTC as collateral to secure your position
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="h-3 w-3 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium">Mint BTSUSD Stablecoin</div>
                  <div className="text-sm text-muted-foreground">
                    Borrow against your collateral at 150% minimum ratio
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                </div>
                <div>
                  <div className="font-medium">Earn Yield</div>
                  <div className="text-sm text-muted-foreground">
                    Stake your BTSUSD to earn protocol fees
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="h-3 w-3 text-violet-500" />
                </div>
                <div>
                  <div className="font-medium">Automated Risk Management</div>
                  <div className="text-sm text-muted-foreground">
                    Health factor monitoring and liquidation protection
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Wallet */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                Connected Wallet
              </div>
              <div className="font-mono text-sm">
                {address
                  ? `${address.slice(0, 12)}...${address.slice(-10)}`
                  : ""}
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Bitcoin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-orange-500">
                    What happens next?
                  </p>
                  <p className="text-muted-foreground">
                    Your vault position will be initialized on the Bitcoin Standard
                    protocol. You can then deposit WBTC as collateral and mint
                    BTSUSD stablecoins at your desired collateralization ratio.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateVault}
              disabled={isCreating}
              size="lg"
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Vault...
                </>
              ) : (
                <>
                  Create Vault
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
