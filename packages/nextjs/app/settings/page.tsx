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
import { Switch } from "~~/components/ui/switch";
import { Slider } from "~~/components/ui/slider";
import {
  Shield,
  Save,
  Bell,
  Loader2,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Bitcoin,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";

export default function VaultSettings() {
  const router = useRouter();
  const { address, status } = useAccount();
  const isConnected = status === "connected";

  const [isLoading, setIsLoading] = useState(false);

  // Notification Settings
  const [notifEmail, setNotifEmail] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [liquidationAlerts, setLiquidationAlerts] = useState(true);

  // Risk Settings
  const [targetCollateralRatio, setTargetCollateralRatio] = useState(200);
  const [autoRepayEnabled, setAutoRepayEnabled] = useState(false);
  const [autoRepayThreshold, setAutoRepayThreshold] = useState(150);

  // Yield Settings
  const [yieldEnabled, setYieldEnabled] = useState(false);
  const [yieldAllocation, setYieldAllocation] = useState(40);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldSaved, setYieldSaved] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  const handleSaveNotifications = async () => {
    if (notifEmail && !notifEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setNotifLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setNotifSaved(true);
      toast.success("Notification settings saved!");
      setTimeout(() => setNotifSaved(false), 3000);
    } catch {
      toast.error("Failed to save notification settings");
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSaveYieldSettings = async () => {
    setYieldLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setYieldSaved(true);
      toast.success("Yield strategy settings saved!");
      setTimeout(() => setYieldSaved(false), 3000);
    } catch {
      toast.error("Failed to save yield settings");
    } finally {
      setYieldLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("All settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Vault Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your vault behavior and risk parameters.
          </p>
        </div>

        {/* Notification Settings */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notification Settings</CardTitle>
            </div>
            <CardDescription>
              Receive alerts about your vault health and important events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="notif-email"
                  type="email"
                  placeholder="you@example.com"
                  value={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveNotifications}
                  disabled={notifLoading}
                  variant={notifSaved ? "outline" : "default"}
                >
                  {notifLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : notifSaved ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />{" "}
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" /> Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Health Factor Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when health factor drops below 1.5
                  </div>
                </div>
                <Switch
                  checked={healthAlerts}
                  onCheckedChange={setHealthAlerts}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Liquidation Warnings</Label>
                  <div className="text-sm text-muted-foreground">
                    Alert when position is at risk of liquidation
                  </div>
                </div>
                <Switch
                  checked={liquidationAlerts}
                  onCheckedChange={setLiquidationAlerts}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Risk Management</CardTitle>
            </div>
            <CardDescription>
              Configure your vault risk parameters and automated protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Target Collateral Ratio</Label>
                <span className="text-sm font-semibold text-primary">
                  {targetCollateralRatio}%
                </span>
              </div>
              <Slider
                value={[targetCollateralRatio]}
                onValueChange={([v]) => setTargetCollateralRatio(v)}
                min={150}
                max={300}
                step={10}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum (150%)</span>
                <span>Safe (200%)</span>
                <span>Conservative (300%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Auto-Repay Protection</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically repay debt when health factor drops too low
                </div>
              </div>
              <Switch
                checked={autoRepayEnabled}
                onCheckedChange={setAutoRepayEnabled}
              />
            </div>

            {autoRepayEnabled && (
              <div className="space-y-3 bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Auto-Repay Settings</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Trigger when health factor below:
                    </span>
                    <span className="font-medium">
                      {(autoRepayThreshold / 100).toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[autoRepayThreshold]}
                    onValueChange={([v]) => setAutoRepayThreshold(v)}
                    min={110}
                    max={150}
                    step={5}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Yield Strategy */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Yield Strategy</CardTitle>
            </div>
            <CardDescription>
              Automatically stake a portion of your BTSUSD to earn yield.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Yield Optimization</Label>
                <div className="text-sm text-muted-foreground">
                  Auto-stake BTSUSD in the protocol yield vault
                </div>
              </div>
              <Switch
                checked={yieldEnabled}
                onCheckedChange={setYieldEnabled}
              />
            </div>

            <div
              className="space-y-4"
              style={{
                opacity: yieldEnabled ? 1 : 0.5,
                pointerEvents: yieldEnabled ? "auto" : "none",
              }}
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Yield Allocation (% of minted BTSUSD)</Label>
                  <span className="text-sm font-semibold text-primary">
                    {yieldAllocation}%
                  </span>
                </div>
                <Slider
                  value={[yieldAllocation]}
                  onValueChange={([v]) => setYieldAllocation(v)}
                  min={0}
                  max={100}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>All liquid</span>
                  <span>
                    Example: Mint 1000 BTSUSD → {yieldAllocation * 10} staked,{" "}
                    {1000 - yieldAllocation * 10} liquid
                  </span>
                  <span>All staked</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveYieldSettings}
                disabled={yieldLoading}
                variant={yieldSaved ? "outline" : "default"}
              >
                {yieldLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : yieldSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />{" "}
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save Yield Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Connected Wallet</CardTitle>
            </div>
            <CardDescription>
              Your connected Starknet wallet information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">
                Wallet Address
              </div>
              <div className="font-mono text-sm break-all">
                {address || "Not connected"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save All Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSaveAll} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
