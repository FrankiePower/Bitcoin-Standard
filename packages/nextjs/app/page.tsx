"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Shield,
  Zap,
  TrendingUp,
  Bitcoin,
  Lock,
  Activity,
  ArrowRight,
  Terminal,
  Cpu,
  Database,
} from "lucide-react";
import { Button } from "~~/components/ui/button";
import { Card, CardContent } from "~~/components/ui/card";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useAccount();
  const isConnected = status === "connected";
  const [systemTime, setSystemTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toISOString().replace("T", " ").slice(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <Bitcoin className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <span className="text-orange-500 font-bold tracking-wider">BTC STANDARD</span>
                <span className="text-neutral-600 text-xs ml-2">v1.0.0</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>SYSTEM ONLINE</span>
              </div>
              <div className="hidden md:block text-xs text-neutral-600 font-mono">
                {systemTime}
              </div>
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[150px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-8">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded border border-orange-500/30 bg-orange-500/10 text-orange-500 text-sm">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="tracking-wider">PROTOCOL ACTIVE • STARKNET L2</span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter">
              <span className="text-white">THE BITCOIN</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
                STANDARD
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
              Deposit BTC. Mint BTSUSD. Earn Yield.
              <br />
              <span className="text-neutral-500">
                Decentralized CDP Protocol on Starknet
              </span>
            </p>

            {/* Stats Bar */}
            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">$0.00</div>
                <div className="text-neutral-500 text-xs tracking-wider">TVL LOCKED</div>
              </div>
              <div className="w-px h-12 bg-neutral-800 hidden md:block" />
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">150%</div>
                <div className="text-neutral-500 text-xs tracking-wider">MIN COLLATERAL</div>
              </div>
              <div className="w-px h-12 bg-neutral-800 hidden md:block" />
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono">0.5%</div>
                <div className="text-neutral-500 text-xs tracking-wider">STABILITY FEE</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <CustomConnectButton />
              <Button
                variant="outline"
                size="lg"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <Terminal className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Overview */}
      <section className="py-20 px-4 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-orange-500 tracking-widest mb-4">{`// PROTOCOL ARCHITECTURE`}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              SYSTEM COMPONENTS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Database,
                title: "VAULT ENGINE",
                desc: "Deposit WBTC as collateral. Manage your CDP position with real-time health monitoring.",
                status: "OPERATIONAL",
              },
              {
                icon: Cpu,
                title: "MINT PROTOCOL",
                desc: "Generate BTSUSD stablecoins against your locked Bitcoin at configurable ratios.",
                status: "OPERATIONAL",
              },
              {
                icon: TrendingUp,
                title: "YIELD MATRIX",
                desc: "Deploy BTSUSD into automated yield strategies. Earn from protocol fees and DeFi.",
                status: "OPERATIONAL",
              },
            ].map((item, i) => (
              <Card key={i} className="bg-neutral-900 border-neutral-800 hover:border-orange-500/50 transition-all group">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <item.icon className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-500">{item.status}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold tracking-wider">{item.title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-neutral-900/50 border-y border-neutral-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-orange-500 tracking-widest mb-4">{`// SECURITY PROTOCOLS`}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              BUILT FOR SECURITY
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Shield,
                title: "OVER-COLLATERALIZED",
                desc: "All BTSUSD is backed by >150% Bitcoin collateral. Automated liquidations protect the protocol.",
              },
              {
                icon: Lock,
                title: "NON-CUSTODIAL",
                desc: "Your keys, your coins. All assets remain in your control via smart contracts on Starknet.",
              },
              {
                icon: Zap,
                title: "INSTANT SETTLEMENT",
                desc: "Starknet L2 enables near-instant transactions with minimal gas fees.",
              },
              {
                icon: Activity,
                title: "REAL-TIME MONITORING",
                desc: "24/7 position monitoring with automated alerts and risk management tools.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-all flex gap-4"
              >
                <div className="h-10 w-10 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold tracking-wider mb-2">{item.title}</h3>
                  <p className="text-neutral-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-orange-500 tracking-widest mb-4">{`// EXECUTION FLOW`}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              OPERATION SEQUENCE
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "CONNECT", desc: "Link Starknet wallet" },
              { step: "02", title: "DEPOSIT", desc: "Lock WBTC collateral" },
              { step: "03", title: "MINT", desc: "Generate BTSUSD" },
              { step: "04", title: "DEPLOY", desc: "Earn yield on DeFi" },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="p-6 rounded border border-neutral-800 bg-neutral-900/50 text-center hover:border-orange-500/30 transition-all">
                  <div className="text-4xl font-bold text-orange-500/30 mb-4 font-mono">
                    {item.step}
                  </div>
                  <h3 className="font-bold tracking-wider mb-2">{item.title}</h3>
                  <p className="text-neutral-500 text-xs">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ChevronRight className="h-4 w-4 text-neutral-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-neutral-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-lg border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black relative overflow-hidden">
            <div className="absolute inset-0 bg-orange-500/5" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                INITIALIZE PROTOCOL
              </h2>
              <p className="text-neutral-400 max-w-xl mx-auto">
                Connect your Starknet wallet to access the Bitcoin Standard protocol.
                Deposit BTC, mint stablecoins, and maximize your yield.
              </p>
              <div className="pt-4">
                <CustomConnectButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-orange-500/20 flex items-center justify-center">
              <Bitcoin className="h-3 w-3 text-orange-500" />
            </div>
            <span className="text-neutral-500 text-sm">BITCOIN STANDARD PROTOCOL</span>
          </div>
          <div className="text-neutral-600 text-xs">
            DEPLOYED ON STARKNET • {new Date().getFullYear()}
          </div>
          <div className="flex gap-6 text-xs text-neutral-600">
            <a href="#" className="hover:text-orange-500 transition-colors">DOCS</a>
            <a href="#" className="hover:text-orange-500 transition-colors">GITHUB</a>
            <a href="#" className="hover:text-orange-500 transition-colors">DISCORD</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
