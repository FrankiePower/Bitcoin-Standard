"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "@starknet-react/core";
import { useRouter } from "next/navigation";
import { Bitcoin, ArrowUpRight, ExternalLink } from "lucide-react";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useAccount();
  const isConnected = status === "connected";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
            >
              <Bitcoin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight">The Bitcoin Standard</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
            <a href="#protocol" className="hover:text-black transition-colors">Protocol</a>
            <a href="#how-it-works" className="hover:text-black transition-colors">How it works</a>
            <a href="#security" className="hover:text-black transition-colors">Security</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* CTA */}
          <CustomConnectButton />
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center">
        {/* Abstract flowing line art background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Warm gradient blob – top right */}
          <div
            className="absolute top-0 right-0 w-[65vw] h-[100vh]"
            style={{
              background:
                "radial-gradient(ellipse at 80% 20%, rgba(251,146,60,0.22) 0%, rgba(253,186,116,0.15) 30%, rgba(255,237,213,0.1) 60%, transparent 80%)",
            }}
          />

          {/* SVG flowing lines – Spark.fi signature art */}
          <svg
            className="absolute top-0 right-0 w-[68vw] h-full"
            viewBox="0 0 700 900"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main flowing arcs converging from upper-right */}
            <path
              d="M 700 -50 Q 560 200 320 420 Q 120 600 -50 900"
              stroke="rgba(0,0,0,0.09)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 20 Q 540 230 310 440 Q 110 620 -50 950"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 80 Q 520 260 300 460 Q 100 640 -50 1000"
              stroke="rgba(0,0,0,0.07)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 140 Q 500 290 280 480 Q 90 660 -50 1050"
              stroke="rgba(0,0,0,0.065)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 200 Q 490 320 270 500 Q 80 680 -50 1100"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 260 Q 470 360 250 520 Q 60 700 -50 1150"
              stroke="rgba(0,0,0,0.055)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 320 Q 460 400 240 540 Q 50 720 -50 1200"
              stroke="rgba(0,0,0,0.05)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 380 Q 450 440 230 560 Q 40 740 -50 1250"
              stroke="rgba(0,0,0,0.045)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M 700 50 Q 580 180 380 360 Q 180 540 -50 850"
              stroke="rgba(249,115,22,0.12)"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M 700 -20 Q 600 160 420 340 Q 220 520 -50 820"
              stroke="rgba(249,115,22,0.08)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-20 w-full">
          <div className="max-w-2xl">
            {/* Eyebrow badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                color: "#ea580c",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
              Live on Starknet L2
            </div>

            {/* Main headline */}
            <h1
              className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight mb-8"
              style={{ letterSpacing: "-0.03em" }}
            >
              Bitcoin-
              <br />
              Backed
              <br />
              <span style={{ color: "#f97316" }}>Stablecoins.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg md:text-xl text-neutral-500 max-w-md leading-relaxed mb-10">
              Deposit WBTC as collateral. Mint BTSUSD. Earn yield.
              Decentralized CDP protocol on Starknet — non-custodial, over-collateralized.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <CustomConnectButton />
              <a
                href="#how-it-works"
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                Learn how it works
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Floating TVL card — bottom right of hero, Spark.fi style */}
          <div
            className="absolute bottom-16 right-6 lg:right-8 hidden lg:block"
            style={{
              background: "#111",
              borderRadius: "16px",
              padding: "24px 28px",
              minWidth: "260px",
            }}
          >
            <div className="text-neutral-500 text-xs font-medium tracking-widest uppercase mb-3">
              Protocol TVL
            </div>
            <div
              className="text-5xl font-black tracking-tight"
              style={{ color: "#f97316", letterSpacing: "-0.03em" }}
            >
              $0.00
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              All systems operational
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-28 px-6 lg:px-8"
        style={{ background: "#fafafa", borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-4">
              How it works
            </div>
            <h2
              className="text-4xl md:text-5xl font-black tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Four steps to
              <br />
              <span style={{ color: "#f97316" }}>financial sovereignty.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Connect",
                desc: "Link your Starknet wallet. ArgentX or Braavos supported.",
              },
              {
                num: "02",
                title: "Deposit",
                desc: "Lock WBTC as collateral in your personal vault.",
              },
              {
                num: "03",
                title: "Mint",
                desc: "Generate BTSUSD stablecoins at 150%+ collateral ratio.",
              },
              {
                num: "04",
                title: "Earn",
                desc: "Deploy BTSUSD into yield strategies across DeFi.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="group"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: "16px",
                  padding: "28px",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(249,115,22,0.3)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 30px rgba(249,115,22,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.07)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="text-5xl font-black mb-6"
                  style={{ color: "rgba(0,0,0,0.07)", letterSpacing: "-0.05em" }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROTOCOL STATS ──────────────────────────────────────── */}
      <section
        id="protocol"
        className="py-28 px-6 lg:px-8"
        style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-4">
                Protocol
              </div>
              <h2
                className="text-4xl md:text-5xl font-black tracking-tight mb-6"
                style={{ letterSpacing: "-0.03em" }}
              >
                Built for
                <br />
                serious Bitcoin
                <br />
                holders.
              </h2>
              <p className="text-neutral-500 leading-relaxed max-w-sm">
                Every BTSUSD is backed by real Bitcoin collateral. No algorithmic
                tricks. No fractional reserves. Pure, transparent, on-chain collateralization.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Min. Collateral Ratio", value: "150%", accent: false },
                { label: "Liquidation Threshold", value: "125%", accent: false },
                { label: "Stability Fee", value: "0.5%", accent: false },
                { label: "Collateral Type", value: "WBTC", accent: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: stat.accent ? "#111" : "#fafafa",
                    border: `1px solid ${stat.accent ? "transparent" : "rgba(0,0,0,0.07)"}`,
                    borderRadius: "16px",
                    padding: "24px",
                  }}
                >
                  <div
                    className="text-xs font-medium mb-3 uppercase tracking-wider"
                    style={{ color: stat.accent ? "rgba(255,255,255,0.4)" : "#9ca3af" }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="text-3xl font-black"
                    style={{
                      color: stat.accent ? "#f97316" : "#111",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────────────── */}
      <section
        id="security"
        className="py-28 px-6 lg:px-8"
        style={{ background: "#fafafa", borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold tracking-widest text-neutral-400 uppercase mb-4">
              Security
            </div>
            <h2
              className="text-4xl md:text-5xl font-black tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Trust the math,
              <br />
              not the middleman.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Non-Custodial",
                desc: "Your Bitcoin never leaves your control. Smart contracts on Starknet hold your collateral — no third party can touch it.",
              },
              {
                title: "Over-Collateralized",
                desc: "All BTSUSD in circulation is backed by more than 150% Bitcoin collateral. Automated liquidations keep the system solvent.",
              },
              {
                title: "Starknet L2",
                desc: "Near-instant finality, minimal gas fees, and Ethereum-grade security — powered by STARK zero-knowledge proofs.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: "16px",
                  padding: "32px",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full mb-6 flex items-center justify-center"
                  style={{ background: "rgba(249,115,22,0.08)" }}
                >
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section
        className="px-6 lg:px-8 py-28"
        style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="relative overflow-hidden rounded-2xl p-12 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
            style={{
              background: "#111",
            }}
          >
            {/* Subtle warm glow */}
            <div
              className="absolute top-0 right-0 w-[50%] h-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 80% 50%, rgba(249,115,22,0.15) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              <h2
                className="text-white text-4xl md:text-5xl font-black tracking-tight mb-4"
                style={{ letterSpacing: "-0.03em" }}
              >
                Ready to put your
                <br />
                Bitcoin to work?
              </h2>
              <p className="text-neutral-400 max-w-md">
                Connect your Starknet wallet to open a vault, mint BTSUSD, and start earning yield on your Bitcoin.
              </p>
            </div>

            <div className="relative z-10 flex-shrink-0">
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer
        className="px-6 lg:px-8 py-10"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
            >
              <Bitcoin className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold">Bitcoin Standard</span>
            <span className="text-neutral-300 text-sm">·</span>
            <span className="text-neutral-400 text-sm">Starknet</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <a href="#" className="hover:text-black transition-colors">Docs</a>
            <a href="#" className="hover:text-black transition-colors">GitHub</a>
            <a href="#" className="hover:text-black transition-colors">Discord</a>
          </div>

          <div className="text-xs text-neutral-300">
            © {new Date().getFullYear()} Bitcoin Standard Protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
