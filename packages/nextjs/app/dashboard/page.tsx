"use client";

import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import {
  ExternalLink,
  ChevronRight,
  Coins,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useNativeCDP,
  formatBTC,
  formatBTCUSD,
} from "~~/hooks/useNativeCDP";
import { NATIVE_ADDRESSES } from "~~/contracts/nativeContracts";

export default function BTSUSDPage() {
  const { totalSupply, totalDebt, totalBTC, btcPriceUSD } = useNativeCDP();

  const collateralUSD = (Number(totalBTC) / 1e8) * btcPriceUSD;
  const debtUSD = Number(totalDebt) / 1e18;
  const backingRatio =
    debtUSD > 0 ? `${((collateralUSD / debtUSD) * 100).toFixed(1)}%` : "∞";

  const stats = [
    {
      label: "Total Supply",
      value: `${formatBTCUSD(totalSupply)} BTSUSD`,
      icon: Coins,
    },
    { label: "Stability Fee", value: "2.5% p.a.", icon: Gauge },
    { label: "Backing Ratio", value: backingRatio, icon: ShieldCheck },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#f97316] shadow-lg shadow-orange-500/20 p-4 flex items-center justify-center">
              <Image
                src="/bitcoin-btc-logo.svg"
                alt="BTSUSD"
                width={36}
                height={36}
                className="brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-black flex items-center gap-2">
                BTSUSD{" "}
                <span className="text-neutral-300 font-medium">Stablecoin</span>
              </h1>
              <p className="text-neutral-500 font-medium mt-1">
                Bitcoin-native stablecoin powered by OP_CAT vaults.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/FrankiePower/Bitcoin-Standard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2"
            >
              Learn Docs <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">
                  {stat.label}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* More Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-neutral-100 rounded-[28px] p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6">About BTSUSD</h3>
            <p className="text-neutral-700 text-[15px] md:text-base leading-relaxed">
              BTSUSD is the core stablecoin of the Bitcoin Standard Protocol.
              It keeps collateral in Bitcoin-native vaults while debt and user
              account logic run on Starknet.
            </p>

            <div className="mt-8 pt-8 border-t border-dotted border-neutral-100 space-y-6">
              <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3.5">
                <div className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-1">
                  Architecture
                </div>
                <p className="text-[15px] text-neutral-100 leading-relaxed">
                  OP_CAT covenant vault scripts constrain collateral spend paths
                  on Bitcoin, including liquidation destination rules.
                </p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3.5">
                <div className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-1">
                  Risk
                </div>
                <p className="text-[15px] text-neutral-100 leading-relaxed">
                  The collateral path avoids wrapped-BTC bridge custody,
                  reducing bridge custody and exploit exposure.
                </p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-2xl px-4 py-3.5">
                <div className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-1">
                  Protocol Flow
                </div>
                <p className="text-[15px] text-neutral-100 leading-relaxed">
                  Lock BTC in a vault, register the position, mint BTSUSD, then
                  repay or liquidate based on health factor and oracle
                  attestations.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-sky-50 border border-sky-100 rounded-[28px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-sky-900 mb-4">
                Protocol Snapshot
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium gap-3">
                  <span className="text-sky-700">Contract Address</span>
                  <a
                    href={`https://sepolia.starkscan.co/contract/${NATIVE_ADDRESSES.BTCUSD_TOKEN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:underline flex items-center gap-1.5"
                  >
                    {`${NATIVE_ADDRESSES.BTCUSD_TOKEN.slice(0, 8)}...${NATIVE_ADDRESSES.BTCUSD_TOKEN.slice(-6)}`}{" "}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-sky-700">Total Collateral Held</span>
                  <span className="text-sky-900">
                    {formatBTC(totalBTC, 4)} BTC
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-sky-700">Collateral USD Value</span>
                  <span className="text-sky-900">
                    ${collateralUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#111] text-white rounded-[28px] p-8 shadow-xl relative overflow-hidden group cursor-pointer hover:scale-[1.01] transition-all">
              {/* Accent line */}
              <div className="absolute top-0 right-0 w-[40%] h-full opacity-20 group-hover:opacity-40 transition-opacity">
                <svg
                  viewBox="0 0 200 200"
                  fill="none"
                  className="w-full h-full"
                >
                  <path
                    d="M 200 0 Q 100 100 0 200"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Want to mint?</h3>
              <p className="text-neutral-400 text-sm mb-8 max-w-[260px]">
                Use your active Bitcoin-backed position to mint BTSUSD in the
                borrow flow.
              </p>
              <Link
                href="/borrow"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold shadow-lg"
              >
                Open Borrow <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[28px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-emerald-900 mb-2">
                Want yield?
              </h3>
              <p className="text-emerald-700 text-sm mb-6 max-w-[200px]">
                Deposit your BTSUSD back into Savings to earn interest.
              </p>
              <Link
                href="/btsusd"
                className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
              >
                Go to Savings <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
