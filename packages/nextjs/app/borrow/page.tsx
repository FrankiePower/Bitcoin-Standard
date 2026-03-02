"use client";

import { useAccount } from "@starknet-react/core";
import { DashboardLayout } from "~~/components/layout/dashboard-layout";
import { Info, Plus, Sparkles, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import React, { useState, useMemo } from "react";
import { useCDP, formatWBTC, formatBTSUSD, formatRatio } from "~~/hooks/useCDP";

const WBTC_DECIMALS = BigInt(100000000); // 1e8
const BTSUSD_DECIMALS = BigInt("1000000000000000000"); // 1e18

export default function BorrowPage() {
  const { status } = useAccount();
  const isConnected = status === "connected";

  const {
    isVaultDeployed,
    btcPriceUSD,
    position,
    collateralRatio,
    healthStatus,
    isLiquidatable,
    maxMintable,
    maxWithdrawable,
    wbtcBalance,
    btsusdBalance,
    collateralValueUSD,
    depositCollateral,
    withdrawCollateral,
    mintBTSUSD,
    burnBTSUSD,
    isDepositingCollateral,
    isWithdrawingCollateral,
    isMintingBTSUSD,
    isBurningBTSUSD,
    isLoading,
    totalCollateral,
    totalDebt,
    MIN_COLLATERAL_RATIO,
    LIQUIDATION_THRESHOLD,
  } = useCDP();

  const [depositAmount, setDepositAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "mint" | "repay">("deposit");

  // Parse input amounts
  const depositAmountBigInt = useMemo(() => {
    if (!depositAmount || isNaN(Number(depositAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(depositAmount) * Number(WBTC_DECIMALS)));
  }, [depositAmount]);

  const borrowAmountBigInt = useMemo(() => {
    if (!borrowAmount || isNaN(Number(borrowAmount))) return BigInt(0);
    return BigInt(Math.floor(Number(borrowAmount) * Number(BTSUSD_DECIMALS)));
  }, [borrowAmount]);

  // Calculate projected values after deposit
  const projectedCollateralValue = useMemo(() => {
    const newCollateral = position.collateral + depositAmountBigInt;
    return Number(newCollateral) / Number(WBTC_DECIMALS) * btcPriceUSD;
  }, [position.collateral, depositAmountBigInt, btcPriceUSD]);

  // Calculate current LTV
  const currentLTV = useMemo(() => {
    if (collateralValueUSD === 0) return 0;
    const debtValue = Number(position.debt) / Number(BTSUSD_DECIMALS);
    return (debtValue / collateralValueUSD) * 100;
  }, [position.debt, collateralValueUSD]);

  const handleDeposit = async () => {
    if (depositAmountBigInt === BigInt(0)) return;
    try {
      await depositCollateral(depositAmountBigInt);
      setDepositAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
    }
  };

  const handleWithdraw = async () => {
    if (depositAmountBigInt === BigInt(0)) return;
    try {
      await withdrawCollateral(depositAmountBigInt);
      setDepositAmount("");
    } catch (error) {
      console.error("Withdraw failed:", error);
    }
  };

  const handleMint = async () => {
    if (borrowAmountBigInt === BigInt(0)) return;
    try {
      await mintBTSUSD(borrowAmountBigInt);
      setBorrowAmount("");
    } catch (error) {
      console.error("Mint failed:", error);
    }
  };

  const handleRepay = async () => {
    if (borrowAmountBigInt === BigInt(0)) return;
    try {
      await burnBTSUSD(borrowAmountBigInt);
      setBorrowAmount("");
    } catch (error) {
      console.error("Repay failed:", error);
    }
  };

  const handleMaxDeposit = () => {
    setDepositAmount(formatWBTC(wbtcBalance, 8));
  };

  const handleMaxMint = () => {
    setBorrowAmount((Number(maxMintable) / Number(BTSUSD_DECIMALS)).toFixed(2));
  };

  const handleMaxRepay = () => {
    const maxRepay = btsusdBalance < position.debt ? btsusdBalance : position.debt;
    setBorrowAmount((Number(maxRepay) / Number(BTSUSD_DECIMALS)).toFixed(2));
  };

  const handleMaxWithdraw = () => {
    setDepositAmount((Number(maxWithdrawable) / Number(WBTC_DECIMALS)).toFixed(8));
  };

  // Health status colors
  const getHealthColor = () => {
    switch (healthStatus) {
      case "healthy": return "text-emerald-500";
      case "warning": return "text-amber-500";
      case "danger": return "text-red-500";
      default: return "text-neutral-400";
    }
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case "healthy": return <CheckCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "danger": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // LTV bar width calculation
  const ltvWidth = Math.min(currentLTV / 66 * 75, 75); // max 66% LTV maps to 75% of bar width

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto py-4">
        <h1 className="text-[40px] font-bold tracking-tight text-black mb-2">
          Easy Borrow
        </h1>
        <p className="text-neutral-500 mb-8">
          Deposit wBTC as collateral and borrow BTSUSD stablecoin
        </p>

        <div className="flex flex-col lg:flex-row gap-6 relative z-10 items-start">
          {/* LEFT COLUMN */}
          <div className="flex-1 w-full space-y-6">
            {/* Deposit / Borrow Blocks */}
            <div className="flex flex-col md:flex-row gap-4 relative">
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-100 items-center justify-center z-10 text-orange-400">
                <Sparkles className="w-4 h-4" />
              </div>

              {/* Deposit Block */}
              <div className="flex-1 bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("deposit")}
                      className={`text-[14px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        activeTab === "deposit" ? "bg-orange-100 text-orange-600" : "text-neutral-400 hover:text-black"
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setActiveTab("withdraw")}
                      className={`text-[14px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        activeTab === "withdraw" ? "bg-orange-100 text-orange-600" : "text-neutral-400 hover:text-black"
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    Balance: {formatWBTC(wbtcBalance)} wBTC
                  </div>
                </div>

                <div className="bg-[#fcf8f3]/50 border border-[#f97316]/20 rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-[12px] border border-neutral-200 shadow-sm">
                      <Image src="/bitcoin-btc-logo.svg" alt="WBTC" width={22} height={22} />
                      <span className="font-bold text-[15px]">wBTC</span>
                    </div>
                    <button
                      onClick={activeTab === "withdraw" ? handleMaxWithdraw : handleMaxDeposit}
                      className="text-[12px] text-orange-500 hover:text-orange-600 font-semibold"
                    >
                      MAX
                    </button>
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-[24px] font-bold bg-transparent border-none outline-none text-right"
                  />
                  <div className="text-[12px] text-neutral-400 text-right">
                    ${(Number(depositAmount || 0) * btcPriceUSD).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="mt-3 text-[12px] text-neutral-500">
                  Collateral: {formatWBTC(position.collateral)} wBTC (${collateralValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </div>
              </div>

              {/* Borrow Block */}
              <div className="flex-1 bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("mint")}
                      className={`text-[14px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        activeTab === "mint" ? "bg-orange-100 text-orange-600" : "text-neutral-400 hover:text-black"
                      }`}
                    >
                      Borrow
                    </button>
                    <button
                      onClick={() => setActiveTab("repay")}
                      className={`text-[14px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        activeTab === "repay" ? "bg-orange-100 text-orange-600" : "text-neutral-400 hover:text-black"
                      }`}
                    >
                      Repay
                    </button>
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    Balance: {formatBTSUSD(btsusdBalance)} BTSUSD
                  </div>
                </div>

                <div className="bg-[#fcf8f3]/50 border border-[#f97316]/20 rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-[12px] border border-neutral-200 shadow-sm">
                      <div className="w-[22px] h-[22px] rounded-full bg-[#f97316] p-1 flex items-center justify-center">
                        <Image src="/bitcoin-btc-logo.svg" alt="BTSUSD" width={14} height={14} className="brightness-0 invert" />
                      </div>
                      <span className="font-bold text-[15px]">BTSUSD</span>
                    </div>
                    <button
                      onClick={activeTab === "repay" ? handleMaxRepay : handleMaxMint}
                      className="text-[12px] text-orange-500 hover:text-orange-600 font-semibold"
                    >
                      MAX
                    </button>
                  </div>
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-[24px] font-bold bg-transparent border-none outline-none text-right"
                  />
                  <div className="text-[12px] text-neutral-400 text-right">
                    ${Number(borrowAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="mt-3 text-[12px] text-neutral-500">
                  Debt: {formatBTSUSD(position.debt)} BTSUSD | Max mintable: {formatBTSUSD(maxMintable)}
                </div>
              </div>
            </div>

            {/* LTV Block */}
            <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 w-full">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight mb-1">Loan to Value (LTV)</h3>
                  <p className="text-[13px] text-neutral-500 font-medium">
                    Ratio of the borrowed value to the collateral value
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-[18px] font-bold mb-1 flex items-center gap-2 justify-end ${getHealthColor()}`}>
                    {getHealthIcon()}
                    {currentLTV.toFixed(2)}%
                  </div>
                  <div className="text-[13px] text-neutral-500 font-medium tracking-tight">
                    max. 66.67%
                  </div>
                </div>
              </div>

              {/* LTV Slider Bar */}
              <div className="w-full relative pt-6 pb-2">
                <div className="absolute top-2 right-[25%] text-[10px] text-[#f43f5e] font-bold tracking-tight">
                  66.67%
                </div>

                <div className="h-3 w-full bg-neutral-100 rounded-full flex overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      healthStatus === "healthy" ? "bg-emerald-400" :
                      healthStatus === "warning" ? "bg-amber-400" : "bg-red-400"
                    }`}
                    style={{ width: `${ltvWidth}%` }}
                  />
                  {/* Liquidation threshold marker */}
                  <div className="absolute right-[25%] top-0 bottom-0 w-0.5 bg-[#f43f5e]" />
                </div>

                <div className="flex justify-between mt-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">
                  <span className={currentLTV < 33 ? "text-emerald-600" : ""}>Conservative</span>
                  <span className={currentLTV >= 33 && currentLTV < 50 ? "text-amber-600" : ""}>Moderate</span>
                  <span className={currentLTV >= 50 && currentLTV < 66.67 ? "text-amber-600" : ""}>Aggressive</span>
                  <span className={currentLTV >= 66.67 ? "text-red-600" : ""}>Liquidation</span>
                </div>
              </div>

              {isLiquidatable && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Warning: Your position is at risk of liquidation!</span>
                </div>
              )}
            </div>

            {/* Position Summary */}
            {position.collateral > BigInt(0) && (
              <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
                <h3 className="text-[18px] font-bold tracking-tight mb-4">Your Position</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[12px] text-neutral-500 mb-1">Collateral</div>
                    <div className="text-[16px] font-bold">{formatWBTC(position.collateral)} wBTC</div>
                    <div className="text-[12px] text-neutral-400">${collateralValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-neutral-500 mb-1">Debt</div>
                    <div className="text-[16px] font-bold">{formatBTSUSD(position.debt)} BTSUSD</div>
                    <div className="text-[12px] text-neutral-400">${(Number(position.debt) / Number(BTSUSD_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-neutral-500 mb-1">Collateral Ratio</div>
                    <div className={`text-[16px] font-bold ${getHealthColor()}`}>{formatRatio(collateralRatio)}</div>
                    <div className="text-[12px] text-neutral-400">Min: 150%</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-neutral-500 mb-1">Health</div>
                    <div className={`text-[16px] font-bold flex items-center gap-1 ${getHealthColor()}`}>
                      {getHealthIcon()}
                      {healthStatus === "none" ? "No debt" : healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
                    </div>
                    <div className="text-[12px] text-neutral-400">Liq. at 120%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-4">
              {!isConnected ? (
                <button
                  className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  Connect Wallet
                </button>
              ) : activeTab === "deposit" ? (
                <button
                  onClick={handleDeposit}
                  disabled={depositAmountBigInt === BigInt(0) || isDepositingCollateral}
                  className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  {isDepositingCollateral ? "Depositing..." : "Deposit Collateral"}
                </button>
              ) : activeTab === "withdraw" ? (
                <button
                  onClick={handleWithdraw}
                  disabled={depositAmountBigInt === BigInt(0) || isWithdrawingCollateral || depositAmountBigInt > maxWithdrawable}
                  className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  {isWithdrawingCollateral ? "Withdrawing..." : "Withdraw Collateral"}
                </button>
              ) : activeTab === "mint" ? (
                <button
                  onClick={handleMint}
                  disabled={borrowAmountBigInt === BigInt(0) || isMintingBTSUSD || borrowAmountBigInt > maxMintable}
                  className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  {isMintingBTSUSD ? "Minting..." : "Borrow BTSUSD"}
                </button>
              ) : (
                <button
                  onClick={handleRepay}
                  disabled={borrowAmountBigInt === BigInt(0) || isBurningBTSUSD || borrowAmountBigInt > btsusdBalance}
                  className="w-full py-4 rounded-[20px] text-[17px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" }}
                >
                  {isBurningBTSUSD ? "Repaying..." : "Repay BTSUSD"}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-4">
            {/* BTC Price Card */}
            <div className="bg-[#1c1c1e] text-white rounded-[20px] p-6 shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f97316]/10 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-2 text-[15px] font-bold text-neutral-300 mb-2 relative z-10">
                <Image src="/bitcoin-btc-logo.svg" alt="BTC" width={20} height={20} />
                BTC Price
              </div>
              <div className="text-[42px] font-bold tracking-tight text-white relative z-10" style={{ letterSpacing: "-0.04em" }}>
                ${btcPriceUSD.toLocaleString()}
              </div>
              <div className="text-[13px] text-neutral-400 mt-1">Mock Oracle</div>
            </div>

            {/* Protocol Stats */}
            <div className="bg-white border border-neutral-100 rounded-[20px] p-6 shadow-sm">
              <h3 className="text-[15px] font-bold mb-4">Protocol Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[13px] text-neutral-500">Total Collateral</span>
                  <span className="text-[13px] font-bold">{formatWBTC(totalCollateral)} wBTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-neutral-500">Total Debt</span>
                  <span className="text-[13px] font-bold">{formatBTSUSD(totalDebt)} BTSUSD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-neutral-500">Min Collateral Ratio</span>
                  <span className="text-[13px] font-bold">150%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-neutral-500">Liquidation Threshold</span>
                  <span className="text-[13px] font-bold text-red-500">120%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-neutral-500">Max LTV</span>
                  <span className="text-[13px] font-bold">66.67%</span>
                </div>
              </div>
            </div>

            {/* Risk Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-[14px] font-bold text-amber-900 mb-1">Risk Notice</h4>
                  <p className="text-[12px] text-amber-700">
                    Maintain collateral ratio above 150% to avoid liquidation.
                    Positions below 120% can be liquidated with a 10% penalty.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
