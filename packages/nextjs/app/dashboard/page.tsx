"use client";

import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Info, ExternalLink } from "lucide-react";
import React from "react";
import Image from "next/image";

export default function SavingsPage() {
  const { status, address } = useAccount();
  const isConnected = status === "connected";

  return (
    <DashboardLayout>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <h1 className="text-[40px] font-bold tracking-tight text-black flex items-center gap-2">
          Savings <Info className="w-4 h-4 text-neutral-400 mt-2" />
        </h1>

        <div className="flex items-center gap-4 text-[13px] font-medium text-neutral-600 bg-white/50 backdrop-blur px-5 py-2.5 rounded-full border border-black/5 shadow-sm">
          <span>TVL: <strong className="text-black ml-1">$1.2M</strong></span>
          <span className="w-[1px] h-3 bg-neutral-300"></span>
          <span>Users: <strong className="text-black ml-1">42</strong></span>
          <span className="w-[1px] h-3 bg-neutral-300"></span>
          <span>Deposit cap: <strong className="text-[#3b82f6] ml-1 flex items-center gap-1"><Image src="/bitcoin-btc-logo.svg" alt="BTC" width={14} height={14} /> 500</strong></span>
          <ExternalLink className="w-3.5 h-3.5 ml-2 text-neutral-400 hover:text-black cursor-pointer" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10 items-start">
        {/* ── LEFT SIDEBAR: SAVINGS ACCOUNTS ─────────────────────── */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-3">
          <div className="text-[13px] text-neutral-500 font-medium flex items-center gap-1 ml-1 mb-4">
            Savings accounts <Info className="w-3.5 h-3.5 text-neutral-400" />
          </div>

          {[
            { symbol: "BTSUSD", name: "Bitcoin Standard USD", apy: "4.00%", icon: "/bitcoin-btc-logo.svg", active: true },
            { symbol: "WBTC", name: "Wrapped Bitcoin", apy: "1.50%", icon: "/bitcoin-btc-logo.svg", active: false },
            { symbol: "STRK", name: "Starknet Token", apy: "3.20%", icon: "/bitcoin-btc-logo.svg", active: false },
          ].map((asset) => (
            <div
              key={asset.symbol}
              className={`flex items-center justify-between p-4 rounded-[16px] cursor-pointer transition-all ${
                asset.active
                  ? "bg-white border-[1.5px] border-emerald-500 shadow-sm"
                  : "bg-white border border-neutral-100 hover:border-emerald-300 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center p-1.5 shrink-0">
                    <Image src={asset.icon} alt={asset.symbol} width={20} height={20} className="w-full h-full object-contain" />
                  </div>
                  {asset.active && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white">★</span>
                    </div>
                  )}
                </div>
                <span className="font-bold text-[15px]">{asset.symbol}</span>
              </div>
              <span className="font-medium text-[14px] text-neutral-600">{asset.apy}</span>
            </div>
          ))}

          <div className="mt-8 text-[13px] text-neutral-500 font-medium flex items-center gap-1 ml-1 mb-4 pt-4 border-t border-neutral-200/60">
            Higher-yield Opportunities <Info className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-[16px] bg-white border border-neutral-100 shadow-sm opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold shrink-0">S</div>
              <span className="font-bold text-[15px]">sBTSUSD</span>
            </div>
            <span className="font-medium text-[14px] text-neutral-600">6.38%</span>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ──────────────────────────────────── */}
        <div className="flex-1 w-full space-y-6 lg:space-y-8">
          
          {/* Dark Promo Banner */}
          <div className="relative overflow-hidden bg-[#111111] text-white rounded-[20px] p-8 md:p-12 shadow-md">
            {/* SVG Background waves */}
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-40 pointer-events-none">
              <svg viewBox="0 0 500 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-0 top-0 w-full h-full" preserveAspectRatio="none">
                <path d="M 0 50 Q 250 150 500 0" stroke="#00ff9d" strokeWidth="1" fill="none" />
                <path d="M 0 100 Q 250 120 500 50" stroke="#00ff9d" strokeWidth="0.5" fill="none" />
                <path d="M 0 150 Q 250 90 500 100" stroke="#00ff9d" strokeWidth="0.3" fill="none" />
                <path d="M 0 200 Q 250 60 500 150" stroke="#00ff9d" strokeWidth="0.1" fill="none" />
              </svg>
            </div>

            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl md:text-[44px] font-bold leading-[1.1] mb-6 tracking-tight">
                Deposit your BTSUSD<br/>and earn <span className="text-[#34d399]">4%</span> APY!
              </h2>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] z-10 flex items-center justify-center"><Image src="/bitcoin-btc-logo.svg" alt="BTC" width={12} height={12} /></div>
                  <div className="w-6 h-6 rounded-full bg-[#34d399] -ml-2 z-0 flex items-center justify-center text-white text-[10px] font-bold">$</div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Eligible for Rewards
                </div>
              </div>

              <p className="text-neutral-400 text-[15px] leading-relaxed mb-10 max-w-[440px]">
                Deposit your BTSUSD into Savings to earn a transparent APY based on protocol revenue. The rate updates automatically as it evolves. <span className="text-[#34d399] hover:underline cursor-pointer transition-all">Learn more ↗</span>
              </p>

              <div className="flex items-center gap-4">
                <button
                  className="px-6 py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  {isConnected ? "Start Saving" : "Connect Wallet"}
                </button>
                <button className="px-6 py-3.5 rounded-full text-[15px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors">
                  Try in Sandbox
                </button>
              </div>
            </div>
          </div>

          {/* Chart / Stats Section */}
          <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm min-h-[400px]">
            {/* Chart Header Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4 mb-6">
              <div className="flex items-center gap-2 p-1 bg-neutral-50 rounded-full border border-neutral-200/60">
                <button className="px-4 py-1.5 rounded-full bg-white shadow-sm text-[14px] font-bold text-black border border-black/5 flex items-center gap-1.5">
                  Savings Rate
                </button>
                <button className="px-4 py-1.5 rounded-full text-[14px] font-medium text-neutral-500 hover:text-black transition-colors">
                  Collateral Composition
                </button>
                <button className="px-4 py-1.5 rounded-full text-[14px] font-medium text-neutral-500 hover:text-black transition-colors">
                  Liquidity
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-neutral-50 rounded-full border border-neutral-200/60 text-xs font-semibold text-neutral-500">
                <button className="px-2.5 py-1 rounded-full hover:text-black transition-colors">1M</button>
                <button className="px-2.5 py-1 rounded-full bg-white shadow-sm text-black border border-black/5">3M</button>
                <button className="px-2.5 py-1 rounded-full hover:text-black transition-colors">1Y</button>
                <button className="px-2.5 py-1 rounded-full hover:text-black transition-colors">All</button>
              </div>
            </div>

            {/* Fake Chart Area mapping Spark design */}
            <div className="relative w-full h-[280px] mt-8 overflow-hidden">
               {/* Grid lines */}
               <div className="absolute inset-0 flex flex-col justify-between">
                 {[5, 4, 3, 2, 1, 0].map(val => (
                   <div key={val} className="w-full flex items-center border-t border-dashed border-neutral-200/80 h-0">
                     <span className="text-[10px] text-neutral-400 -mt-4 -ml-6 w-8 text-right pr-2">{val}%</span>
                   </div>
                 ))}
               </div>
               
               {/* Filled Graph Area (svg placeholder) */}
               <div className="absolute inset-x-8 bottom-0 top-[32%] w-[calc(100%-2rem)] h-full overflow-hidden">
                 <div className="w-full h-full bg-[#34d399]/20 border-t-2 border-[#34d399]" style={{ clipPath: "polygon(0 0, 15% 0, 15% 10%, 30% 10%, 30% 20%, 100% 20%, 100% 100%, 0 100%)" }} />
               </div>

               {/* X-axis labels */}
               <div className="absolute bottom-2 left-8 right-8 flex justify-between text-[10px] text-neutral-400 font-medium">
                  <span>December</span>
                  <span>2026</span>
                  <span>February</span>
               </div>
            </div>
          </div>

          {/* Supported Assets Table */}
          <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
            <h3 className="text-[22px] font-bold text-black tracking-tight mb-6">Supported assets</h3>
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="pb-3 text-[13px] font-semibold text-neutral-400">Asset</th>
                    <th className="pb-3 text-[13px] font-semibold text-neutral-400 text-right pr-4">Balance</th>
                    <th className="pb-3 text-[13px] font-semibold text-neutral-400 text-right w-[160px]"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center p-1.5 shrink-0">
                          <Image src="/bitcoin-btc-logo.svg" alt="BTSUSD" width={20} height={20} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-[15px] text-black">BTSUSD</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-right align-middle">
                      <span className="font-medium text-[15px] text-black">-</span>
                    </td>
                    <td className="py-4 text-right align-middle w-[160px]">
                      <button className="px-4 py-2 rounded-full text-[14px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors w-full">
                        Deposit
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
