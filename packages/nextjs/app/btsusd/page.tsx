"use client";

import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import {
  Info,
  ExternalLink,
  ChevronRight,
  Coins,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import Image from "next/image";
import React from "react";

export default function BTSUSDPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  const stats = [
    { label: "Total Supply", value: "$0.00", icon: Coins },
    { label: "Stability Fee", value: "2.5% p.a.", icon: Gauge },
    { label: "Backing Ratio", value: "--", icon: ShieldCheck },
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
                A Bitcoin-backed, decentralized stablecoin pegged to the US
                Dollar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-full border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center gap-2">
              Learn Docs <ExternalLink className="w-4 h-4" />
            </button>
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
            <p className="text-neutral-500 leading-relaxed space-y-4">
              BTSUSD is the core stablecoin of the Bitcoin Standard Protocol. It
              is designed to maintain a 1:1 peg with the US Dollar while being
              collateralized exclusively by Bitcoin assets on Starknet.
              <br />
              <br />
              The protocol uses over-collateralized Debt Positions (CDPs) to
              ensure every BTSUSD in circulation is backed by significantly more
              value in Bitcoin collateral.
            </p>

            <div className="mt-8 pt-8 border-t border-dotted border-neutral-100 space-y-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-neutral-500">Contract Address</span>
                <span className="text-blue-500 hover:underline cursor-pointer flex items-center gap-1.5">
                  0x...42 <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-neutral-500">Total Collateral Held</span>
                <span className="text-black">$0.00</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
              <p className="text-neutral-400 text-sm mb-8 max-w-[200px]">
                Deposit WBTC and borrow BTSUSD against it instantly.
              </p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold shadow-lg">
                Open Borrow <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[28px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-emerald-900 mb-2">
                Want yield?
              </h3>
              <p className="text-emerald-700 text-sm mb-6 max-w-[200px]">
                Deposit your BTSUSD back into Savings to earn interest.
              </p>
              <div className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all cursor-pointer">
                Go to Savings <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
