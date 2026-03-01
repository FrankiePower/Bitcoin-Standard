"use client";

import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Info, ExternalLink, Loader2 } from "lucide-react";
import React, { useState } from "react";
import Image from "next/image";
import { useSavingsVault, formatTokenAmount } from "~~/hooks/useSavingsVault";

export default function SavingsPage() {
  const { status, address } = useAccount();
  const isConnected = status === "connected";

  // Use the savings vault hook
  const {
    totalAssets,
    depositorCount,
    depositCap,
    apy,
    userAssets,
    userShares,
    deposit,
    withdraw,
    isDepositing,
    isWithdrawing,
    isLoading,
  } = useSavingsVault();

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  // Format TVL for display (assuming 8 decimals for wBTC)
  const formattedTVL = formatTokenAmount(totalAssets, 8, 4);
  const formattedUserBalance = formatTokenAmount(userAssets, 8, 4);
  const formattedDepositCap = depositCap > 0 ? formatTokenAmount(depositCap, 8, 2) : "Unlimited";

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || isDepositing) return;
    try {
      const amount = BigInt(Math.floor(parseFloat(depositAmount) * 1e8)); // Convert to 8 decimals
      await deposit(amount);
      setDepositAmount("");
      setShowDepositModal(false);
    } catch (error) {
      console.error("Deposit failed:", error);
    }
  };

  return (
    <DashboardLayout>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <h1 className="text-[40px] font-bold tracking-tight text-black flex items-center gap-2">
          Savings <Info className="w-4 h-4 text-neutral-400 mt-2" />
        </h1>

        <div className="flex items-center gap-4 text-[13px] font-medium text-neutral-600 bg-white/50 backdrop-blur px-5 py-2.5 rounded-full border border-black/5 shadow-sm">
          <span>
            TVL: <strong className="text-black ml-1">{formattedTVL} wBTC</strong>
          </span>
          <span className="w-[1px] h-3 bg-neutral-300"></span>
          <span>
            Users: <strong className="text-black ml-1">{depositorCount}</strong>
          </span>
          <span className="w-[1px] h-3 bg-neutral-300"></span>
          <span>
            Deposit cap:{" "}
            <strong className="text-[#3b82f6] ml-1 flex items-center gap-1">
              <Image
                src="/bitcoin-btc-logo.svg"
                alt="BTC"
                width={14}
                height={14}
              />{" "}
              {formattedDepositCap}
            </strong>
          </span>
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
            {
              symbol: "sWBTC",
              name: "Savings wBTC",
              apy: `${apy.toFixed(2)}%`,
              icon: "/bitcoin-btc-logo.svg",
              active: true,
              deployed: true,
            },
            {
              symbol: "sBTSUSD",
              name: "Savings BTSUSD",
              apy: "4.00%",
              icon: "/bitcoin-btc-logo.svg",
              active: false,
              deployed: false,
            },
            {
              symbol: "sSTRK",
              name: "Savings STRK",
              apy: "3.20%",
              icon: "/bitcoin-btc-logo.svg",
              active: false,
              deployed: false,
            },
          ].map((asset) => (
            <div
              key={asset.symbol}
              className={`flex items-center justify-between p-4 rounded-[16px] cursor-pointer transition-all ${
                asset.active
                  ? "bg-white border-[1.5px] border-emerald-500 shadow-sm"
                  : asset.deployed
                  ? "bg-white border border-neutral-100 hover:border-emerald-300 shadow-sm"
                  : "bg-white border border-neutral-100 shadow-sm opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={asset.icon}
                      alt={asset.symbol}
                      width={20}
                      height={20}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {asset.active && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white">★</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[15px]">{asset.symbol}</span>
                  {!asset.deployed && (
                    <span className="text-[10px] text-neutral-400">Coming soon</span>
                  )}
                </div>
              </div>
              <span className="font-medium text-[14px] text-neutral-600">
                {asset.apy}
              </span>
            </div>
          ))}

          {/* User Position Card */}
          {isConnected && userShares > 0 && (
            <div className="mt-6 p-4 rounded-[16px] bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
              <div className="text-[12px] text-emerald-700 font-medium mb-2">Your Position</div>
              <div className="text-[24px] font-bold text-emerald-800">
                {formattedUserBalance} wBTC
              </div>
              <div className="text-[12px] text-emerald-600 mt-1">
                {formatTokenAmount(userShares, 18, 4)} shares
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT AREA ──────────────────────────────────── */}
        <div className="flex-1 w-full space-y-6 lg:space-y-8">
          {/* Dark Promo Banner */}
          <div className="relative overflow-hidden bg-[#111111] text-white rounded-[20px] p-8 md:p-12 shadow-md">
            {/* SVG Background waves */}
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-40 pointer-events-none">
              <svg
                viewBox="0 0 500 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-0 top-0 w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M 0 50 Q 250 150 500 0"
                  stroke="#00ff9d"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d="M 0 100 Q 250 120 500 50"
                  stroke="#00ff9d"
                  strokeWidth="0.5"
                  fill="none"
                />
                <path
                  d="M 0 150 Q 250 90 500 100"
                  stroke="#00ff9d"
                  strokeWidth="0.3"
                  fill="none"
                />
                <path
                  d="M 0 200 Q 250 60 500 150"
                  stroke="#00ff9d"
                  strokeWidth="0.1"
                  fill="none"
                />
              </svg>
            </div>

            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl md:text-[44px] font-bold leading-[1.1] mb-6 tracking-tight">
                Deposit your assets
                <br />
                and earn up to <span className="text-[#34d399]">{apy.toFixed(1)}%</span> APY!
              </h2>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] z-10 flex items-center justify-center">
                    <Image
                      src="/bitcoin-btc-logo.svg"
                      alt="BTC"
                      width={12}
                      height={12}
                    />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#34d399] -ml-2 z-0 flex items-center justify-center text-white text-[10px] font-bold">
                    s
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                  ERC-4626 Vault
                </div>
              </div>

              <p className="text-neutral-400 text-[15px] leading-relaxed mb-10 max-w-[440px]">
                Deposit wBTC, BTSUSD, or STRK into the Savings Vault to earn yield. Your shares
                automatically appreciate as the vault accumulates returns through the VSR (Vault Savings Rate) mechanism.{" "}
                <span className="text-[#34d399] hover:underline cursor-pointer transition-all">
                  Learn more ↗
                </span>
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => isConnected && setShowDepositModal(true)}
                  disabled={isLoading}
                  className="px-6 py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                  }}
                >
                  {isDepositing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isConnected ? "Deposit wBTC" : "Connect Wallet"}
                </button>
                <button className="px-6 py-3.5 rounded-full text-[15px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors">
                  View Contract
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-100 rounded-[16px] p-5 shadow-sm">
              <div className="text-[12px] text-neutral-500 font-medium mb-1">Current APY</div>
              <div className="text-[28px] font-bold text-emerald-600">{apy.toFixed(2)}%</div>
            </div>
            <div className="bg-white border border-neutral-100 rounded-[16px] p-5 shadow-sm">
              <div className="text-[12px] text-neutral-500 font-medium mb-1">Total Value Locked</div>
              <div className="text-[28px] font-bold text-black">{formattedTVL} wBTC</div>
            </div>
            <div className="bg-white border border-neutral-100 rounded-[16px] p-5 shadow-sm">
              <div className="text-[12px] text-neutral-500 font-medium mb-1">Depositors</div>
              <div className="text-[28px] font-bold text-black">{depositorCount}</div>
            </div>
          </div>

          {/* Your Position Section */}
          {isConnected && (
            <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
              <h3 className="text-[22px] font-bold text-black tracking-tight mb-6">
                Your Position
              </h3>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="pb-3 text-[13px] font-semibold text-neutral-400">
                        Asset
                      </th>
                      <th className="pb-3 text-[13px] font-semibold text-neutral-400 text-right pr-4">
                        Deposited
                      </th>
                      <th className="pb-3 text-[13px] font-semibold text-neutral-400 text-right pr-4">
                        Shares
                      </th>
                      <th className="pb-3 text-[13px] font-semibold text-neutral-400 text-right w-[200px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center p-1.5 shrink-0">
                            <Image
                              src="/bitcoin-btc-logo.svg"
                              alt="sWBTC"
                              width={20}
                              height={20}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="font-bold text-[15px] text-black">
                            sWBTC
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right align-middle">
                        <span className="font-medium text-[15px] text-black">
                          {formattedUserBalance} wBTC
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-right align-middle">
                        <span className="font-medium text-[15px] text-neutral-600">
                          {formatTokenAmount(userShares, 18, 4)}
                        </span>
                      </td>
                      <td className="py-4 text-right align-middle w-[200px]">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setShowDepositModal(true)}
                            disabled={isDepositing}
                            className="px-4 py-2 rounded-full text-[14px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                          >
                            Deposit
                          </button>
                          <button
                            disabled={isWithdrawing || userShares === BigInt(0)}
                            className="px-4 py-2 rounded-full text-[14px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                          >
                            Withdraw
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-[24px] font-bold text-black mb-6">Deposit wBTC</h3>

            <div className="mb-6">
              <label className="text-[13px] text-neutral-500 font-medium mb-2 block">
                Amount to deposit
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 pr-20 border border-neutral-200 rounded-[12px] text-[18px] font-medium focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-neutral-500">
                  wBTC
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-6 py-3 rounded-full text-[15px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || isDepositing}
                className="flex-1 px-6 py-3 rounded-full text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDepositing && <Loader2 className="w-4 h-4 animate-spin" />}
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
