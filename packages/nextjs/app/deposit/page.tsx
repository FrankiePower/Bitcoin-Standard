"use client";

import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Info, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import React from "react";

export default function BorrowPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto py-4">
        <h1 className="text-[40px] font-bold tracking-tight text-black mb-8">
          Easy Borrow
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 relative z-10 items-start">
          
          {/* ── LEFT COLUMN (Interactive Area) ───────────────────── */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Deposit / Borrow Blocks */}
            <div className="flex flex-col md:flex-row gap-4 relative">
              {/* Decorative separator */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-100 items-center justify-center z-10 text-orange-400">
                <Sparkles className="w-4 h-4" />
              </div>

              {/* Deposit Block */}
              <div className="flex-1 bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[15px] font-bold flex items-center gap-1.5">
                    Deposit <Info className="w-4 h-4 text-neutral-400" />
                  </div>
                  <button className="text-[13px] text-neutral-500 hover:text-black font-semibold flex items-center transition-colors">
                    Add more <Plus className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
                
                <div className="bg-[#fcf8f3]/50 border border-[#f97316]/20 rounded-[16px] p-4 flex items-center justify-between">
                  <button className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-[12px] border border-neutral-200 shadow-sm hover:border-neutral-300 transition-colors">
                    <Image src="/bitcoin-btc-logo.svg" alt="WBTC" width={22} height={22} />
                    <span className="font-bold text-[15px]">WBTC</span>
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="text-right">
                    <div className="text-[20px] font-medium text-neutral-300">0</div>
                    <div className="text-[12px] text-neutral-400">$0.00</div>
                  </div>
                </div>
              </div>

              {/* Borrow Block */}
              <div className="flex-1 bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[15px] font-bold">Borrow</div>
                </div>
                
                <div className="bg-[#fcf8f3]/50 border border-[#f97316]/20 rounded-[16px] p-4 flex items-center justify-between">
                  <button className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-[12px] border border-neutral-200 shadow-sm hover:border-neutral-300 transition-colors">
                    <div className="w-[22px] h-[22px] rounded-full bg-[#f97316] p-1 flex items-center justify-center">
                      <Image src="/bitcoin-btc-logo.svg" alt="BTSUSD" width={14} height={14} className="brightness-0 invert" />
                    </div>
                    <span className="font-bold text-[15px]">BTSUSD</span>
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="text-right">
                    <div className="text-[20px] font-medium text-neutral-300">0</div>
                    <div className="text-[12px] text-neutral-400">$0.00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan to Value (LTV) Block */}
            <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 w-full">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight mb-1">Loan to Value (LTV)</h3>
                  <p className="text-[13px] text-neutral-500 font-medium">Ratio of the collateral value to the borrowed value</p>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-bold mb-1">0.00%</div>
                  <div className="text-[13px] text-neutral-500 font-medium tracking-tight">max. 66.00%</div>
                </div>
              </div>

              {/* LTV Slider Bar */}
              <div className="w-full relative pt-6 pb-2">
                <div className="absolute top-2 right-[25%] text-[10px] text-[#f43f5e] font-bold tracking-tight">66.00%</div>
                
                <div className="h-3 w-full bg-neutral-100 rounded-full flex overflow-hidden">
                  <div className="h-full bg-emerald-100 relative" style={{ width: "30%" }}>
                    {/* Tiny sun/sparkle at 0 */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border border-emerald-400 flex items-center justify-center shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                    </div>
                  </div>
                  <div className="h-full bg-neutral-100 flex-1 border-l border-white"></div>
                  <div className="h-full bg-neutral-100 flex-1 border-l border-white"></div>
                  {/* Liquidation threshold marker */}
                  <div className="w-[20%] h-full bg-neutral-100 border-l border-[#f43f5e]/30 relative">
                     <div className="absolute left-0 -top-1 -bottom-1 w-px bg-[#f43f5e]"></div>
                  </div>
                </div>

                <div className="flex justify-between mt-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">
                  <span className="text-black">Conservative</span>
                  <span>Moderate</span>
                  <span>Aggressive</span>
                  <span>Liquidation</span>
                </div>
              </div>
            </div>

            {/* Promo Banner */}
            <div className="relative overflow-hidden bg-[#1a1226] text-white rounded-[20px] p-8 md:p-12 shadow-md mt-4">
              {/* Background gradient waves */}
               <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#fb923c_0%,transparent_60%)] opacity-30"></div>
                <svg viewBox="0 0 500 200" fill="none" className="absolute bottom-0 w-full h-full" preserveAspectRatio="none">
                  <path d="M 0 200 Q 250 50 500 200" stroke="#f43f5e" strokeWidth="2" fill="none" />
                  <path d="M 0 200 Q 250 80 500 200" stroke="#f43f5e" strokeWidth="1" fill="none" />
                  <path d="M 0 200 Q 250 110 500 200" stroke="#f43f5e" strokeWidth="0.5" fill="none" />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <h2 className="text-3xl md:text-[36px] font-bold tracking-tight mb-8">
                  Connect your wallet to use<br/>Bitcoin Standard
                </h2>

                <div className="flex items-center gap-2 mb-8 bg-black/40 p-2 rounded-full border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center p-1.5 z-40"><Image src="/bitcoin-btc-logo.svg" alt="BTC" width={20} height={20} className="w-full h-full object-contain" /></div>
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center p-1.5 -ml-4 z-30 ring-2 ring-[#1a1226]"><span className="font-bold text-[10px]">ETH</span></div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center -ml-4 z-20 ring-2 ring-[#1a1226]"><span className="font-bold text-[10px]">$</span></div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    className="px-6 py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg w-full sm:w-auto min-w-[160px]"
                    style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                  >
                    Connect wallet
                  </button>
                  <button className="px-6 py-3.5 rounded-full text-[15px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors flex items-center gap-2 justify-center w-full sm:w-auto min-w-[160px]">
                    <Sparkles className="w-4 h-4" /> Try in Sandbox
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Rates Panel) ────────────────────────── */}
          <div className="w-full lg:w-[320px] shrink-0">
            <div className="bg-[#1c1c1e] text-white rounded-[20px] p-6 shadow-lg relative overflow-hidden">
               {/* Abstract curve background */}
               <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f97316]/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center gap-2 text-[15px] font-bold text-neutral-300 mb-2 relative z-10">
                <span className="w-5 h-5 rounded-full bg-[#f97316] p-1 flex items-center justify-center">
                   <Image src="/bitcoin-btc-logo.svg" alt="BTSUSD" width={10} height={10} className="brightness-0 invert" />
                </span>
                Borrow Rate
              </div>
              <div className="text-[52px] font-bold tracking-tight text-[#fef3c7] relative z-10" style={{ letterSpacing: "-0.04em" }}>
                2.50%
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
