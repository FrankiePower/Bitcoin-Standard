"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Info, ArrowDown, Settings2 } from "lucide-react";
import Image from "next/image";
import React from "react";

export default function SwapPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  const [fromToken, setFromToken] = useState({
    symbol: "USDC",
    name: "USD Coin",
    icon: "/bitcoin-btc-logo.svg",
    isBtcStyle: false,
  });
  const [toToken, setToToken] = useState({
    symbol: "BTSUSD",
    name: "Bitcoin Standard USD",
    icon: "/bitcoin-btc-logo.svg",
    isBtcStyle: true,
  });

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const handleSwap = () => {
    // Logic for swapping
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto py-4">
        <div className="flex items-center gap-2 mb-8">
          <h1 className="text-[40px] font-bold tracking-tight text-black">
            Swap
          </h1>
          <Info className="w-5 h-5 text-neutral-300 mt-2 cursor-help" />
        </div>

        <div className="max-w-[600px] mx-auto relative mt-10">
          {/* Settings button top right */}
          <button className="absolute -top-12 right-0 p-2 text-neutral-400 hover:text-black transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>

          <div className="space-y-1 relative">
            {/* FROM CARD */}
            <div className="bg-white border border-neutral-100 rounded-t-[24px] p-6 shadow-sm hover:border-neutral-200 transition-all group">
              <div className="text-[13px] font-bold text-neutral-500 mb-4 px-1 uppercase tracking-wider">
                From
              </div>
              <div className="flex items-center justify-between gap-4">
                <button className="flex items-center gap-2.5 px-4 py-3 bg-neutral-50 rounded-[16px] border border-neutral-100 shadow-sm hover:border-neutral-300 transition-all min-w-[140px]">
                  {fromToken.isBtcStyle ? (
                    <div className="w-6 h-6 rounded-full bg-[#f97316] p-1 flex items-center justify-center">
                      <Image
                        src={fromToken.icon}
                        alt={fromToken.symbol}
                        width={14}
                        height={14}
                        className="brightness-0 invert"
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                      $
                    </div>
                  )}
                  <span className="font-bold text-[16px]">
                    {fromToken.symbol}
                  </span>
                  <svg
                    className="w-4 h-4 text-neutral-400 ml-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="flex-1 text-right">
                  <input
                    type="text"
                    placeholder="0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="w-full bg-transparent text-[32px] font-medium text-neutral-300 focus:text-black outline-none text-right placeholder-neutral-200"
                  />
                  <div className="text-[12px] text-neutral-400 font-medium px-1">
                    0 {fromToken.symbol}
                  </div>
                </div>
              </div>
            </div>

            {/* SWAP ICON SEPARATOR */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-10 h-10 rounded-full bg-white shadow-md border border-neutral-100 flex items-center justify-center text-[#6c48ff] group-hover:scale-110 transition-transform cursor-pointer">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#6c48ff]/10 rounded-full blur-md animate-pulse"></div>
                  <ArrowDown className="w-5 h-5 relative z-10" />
                </div>
              </div>
            </div>

            {/* TO CARD */}
            <div className="bg-[#f8f9ff]/50 border border-neutral-100 rounded-b-[24px] p-6 shadow-sm hover:border-neutral-200 transition-all group">
              <div className="text-[13px] font-bold text-neutral-500 mb-4 px-1 uppercase tracking-wider">
                To
              </div>
              <div className="flex items-center justify-between gap-4">
                <button className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-[16px] border border-neutral-100 shadow-sm hover:border-neutral-300 transition-all min-w-[140px]">
                  {toToken.isBtcStyle ? (
                    <div className="w-6 h-6 rounded-full bg-[#f97316] p-1 flex items-center justify-center">
                      <Image
                        src={toToken.icon}
                        alt={toToken.symbol}
                        width={14}
                        height={14}
                        className="brightness-0 invert"
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                      $
                    </div>
                  )}
                  <span className="font-bold text-[16px]">
                    {toToken.symbol}
                  </span>
                  <svg
                    className="w-4 h-4 text-neutral-400 ml-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="flex-1 text-right">
                  <input
                    type="text"
                    placeholder="0"
                    value={toAmount}
                    readOnly
                    className="w-full bg-transparent text-[32px] font-medium text-neutral-300 focus:text-black outline-none text-right placeholder-neutral-200 cursor-default"
                  />
                  <div className="text-[12px] text-neutral-400 font-medium px-1 invisible">
                    Placeholder
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connect / Swap Button */}
          <div className="mt-4">
            <button
              className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isConnected
                  ? "rgb(248, 249, 255)"
                  : "linear-gradient(135deg, #f97316 0%, #fb923c 100%, #f43f5e 100%)",
                color: isConnected ? "#6c48ff" : "white",
                border: isConnected ? "1px solid #6c48ff" : "none",
              }}
              disabled={isConnected && !fromAmount}
            >
              {isConnected
                ? fromAmount
                  ? "Swap"
                  : "Enter amount"
                : "Connect Wallet"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
