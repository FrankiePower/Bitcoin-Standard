"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import { ArrowUpRight, TrendingUp, Landmark, Coins, Repeat2 } from "lucide-react";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useAccount();
  const isConnected = status === "connected";

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div
      className="min-h-screen text-black overflow-x-hidden"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: "#ffffff" }}
    >
      {/* ── NAV (scrolls with page) ───────────────────────────── */}
      <nav
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/bitcoin-btc-logo.svg" alt="Bitcoin" width={26} height={26} />
            <span className="font-semibold text-base tracking-tight">The Bitcoin Standard</span>
          </div>

          {/* Nav right */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-black transition-colors hidden md:block"
            >
              GitHub
            </a>
            {/* Invisible CustomConnectButton layered under visible Get Started pill */}
            <div className="relative">
              <div className="opacity-0 absolute inset-0 z-10 pointer-events-auto">
                <CustomConnectButton />
              </div>
              <button
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-full"
                style={{ background: "#111", pointerEvents: "none" }}
              >
                Get Started
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden flex items-center" style={{ minHeight: "calc(100vh - 65px)" }}>
        {/* Warm gradient + SVG lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[65vw] h-full"
            style={{
              background:
                "radial-gradient(ellipse at 75% 30%, rgba(251,146,60,0.2) 0%, rgba(253,186,116,0.12) 35%, transparent 70%)",
            }}
          />
          <svg
            className="absolute top-0 right-0 w-[65vw] h-full"
            viewBox="0 0 700 800"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            {[
              ["M 700 -30 Q 540 200 310 410 Q 110 600 -50 880", "0.10"],
              ["M 700 30  Q 520 230 300 430 Q 100 620 -50 930", "0.09"],
              ["M 700 90  Q 500 260 280 450 Q 90  640 -50 980", "0.08"],
              ["M 700 150 Q 480 290 260 470 Q 75  660 -50 1030","0.07"],
              ["M 700 210 Q 460 330 240 490 Q 60  680 -50 1080","0.06"],
              ["M 700 270 Q 440 370 220 510 Q 45  700 -50 1130","0.055"],
              ["M 700 60  Q 570 190 390 370 Q 200 540 -50 840",  "0.13"],
            ].map(([d, opacity], i) => (
              <path
                key={i}
                d={d}
                stroke={i === 6 ? `rgba(249,115,22,${opacity})` : `rgba(0,0,0,${opacity})`}
                strokeWidth={i === 6 ? "1.2" : "1"}
                fill="none"
              />
            ))}
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-20 w-full">
          <div className="max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-10"
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                color: "#ea580c",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
              Live on Starknet
            </div>

            {/* Headline */}
            <h1
              className="text-6xl md:text-7xl lg:text-[88px] font-black leading-[0.9] tracking-tight mb-8"
              style={{ letterSpacing: "-0.035em" }}
            >
              Bitcoin-
              <br />
              Backed
              <br />
              <span style={{ color: "#f97316" }}>Stablecoin.</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg text-neutral-500 max-w-sm leading-relaxed mb-10">
              Deposit WBTC as collateral. Mint BTSUSD. Earn yield.
              Decentralized CDP protocol on Starknet — non-custodial, over-collateralized.
            </p>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="opacity-0 absolute inset-0 z-10 pointer-events-auto">
                  <CustomConnectButton />
                </div>
                <button
                  className="flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white rounded-full"
                  style={{ background: "#111", pointerEvents: "none" }}
                >
                  Open App
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-500 hover:text-black transition-colors flex items-center gap-1"
              >
                View on GitHub <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Floating dark TVL card */}
          <div
            className="hidden lg:block absolute bottom-20 right-8 xl:right-16"
            style={{
              background: "#111",
              borderRadius: "20px",
              padding: "28px 32px",
              minWidth: "240px",
            }}
          >
            <div className="text-neutral-500 text-[10px] font-semibold tracking-widest uppercase mb-2">
              Protocol TVL
            </div>
            <div
              className="text-5xl font-black"
              style={{ color: "#f97316", letterSpacing: "-0.04em" }}
            >
              $0.00
            </div>
            <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                All systems operational
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WHAT YOU CAN DO WITH BTSUSD ──────────────── */}
      <section
        style={{ borderTop: "1px solid rgba(0,0,0,0.07)", background: "#fafafa" }}
        className="py-24 px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-14">
            <div className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-3">
              What you can do
            </div>
            <h2
              className="text-4xl md:text-5xl font-black tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Put your BTSUSD
              <br />
              <span style={{ color: "#f97316" }}>to work.</span>
            </h2>
          </div>

          {/* Use case grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Landmark,
                title: "Save",
                desc: "Park your BTSUSD in savings vaults and earn a stable, protocol-generated yield — no impermanent loss.",
                tag: "Coming soon",
              },
              {
                icon: TrendingUp,
                title: "Lend",
                desc: "Supply BTSUSD to lending markets and earn interest from borrowers. Interest rates set by supply and demand.",
                tag: "Coming soon",
              },
              {
                icon: Coins,
                title: "Earn Yield",
                desc: "Deploy into automated yield strategies across Starknet DeFi. Optimized for maximum BTC-denominated returns.",
                tag: "Coming soon",
              },
              {
                icon: Repeat2,
                title: "Trade",
                desc: "Swap BTSUSD across DEXs on Starknet with minimal slippage. Stable peg maintained by protocol mechanics.",
                tag: "Coming soon",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: "16px",
                  padding: "28px 24px",
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "rgba(249,115,22,0.08)" }}
                >
                  <item.icon className="w-5 h-5" style={{ color: "#f97316" }} />
                </div>

                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-6">{item.desc}</p>

                {/* Tag */}
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    color: "#9ca3af",
                  }}
                >
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-8 py-10"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/bitcoin-btc-logo.svg" alt="Bitcoin" width={22} height={22} />
            <span className="text-sm font-semibold">Bitcoin Standard</span>
            <span className="text-neutral-300 text-sm">·</span>
            <span className="text-neutral-400 text-sm">Starknet</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <a href="#" className="hover:text-black transition-colors">Docs</a>
            <a href="#" className="hover:text-black transition-colors">GitHub</a>
            <a href="#" className="hover:text-black transition-colors">Discord</a>
          </div>

          <div className="text-xs text-neutral-400">
            © 2026 Bitcoin Standard Protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
