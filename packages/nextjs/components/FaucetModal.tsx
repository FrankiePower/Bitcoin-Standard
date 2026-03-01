"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Droplets, Loader2, Check, AlertCircle } from "lucide-react";
import { useTestTokens, formatTokenDisplay, TEST_TOKENS, TestToken } from "~~/hooks/useTestTokens";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const {
    isConnected,
    isDeployed,
    balances,
    mint,
    isMinting,
    refetchBalances,
  } = useTestTokens();

  const [mintingToken, setMintingToken] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMint = async (token: TestToken) => {
    setMintingToken(token.symbol);
    setMintSuccess(null);
    setMintError(null);

    try {
      await mint(token);
      setMintSuccess(token.symbol);
      refetchBalances();
      // Clear success after 3 seconds
      setTimeout(() => setMintSuccess(null), 3000);
    } catch (err: any) {
      console.error("Mint error:", err);
      setMintError(err.message || "Failed to mint tokens");
      setTimeout(() => setMintError(null), 5000);
    } finally {
      setMintingToken(null);
    }
  };

  const getBalance = (symbol: string): bigint => {
    switch (symbol) {
      case "wBTC":
        return balances.wBTC;
      default:
        return BigInt(0);
    }
  };

  const isTokenDeployed = (contractName: string): boolean => {
    switch (contractName) {
      case "MockWBTC":
        return isDeployed.wBTC;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-black">Test Faucet</h2>
              <p className="text-[13px] text-neutral-500">Get tokens for testing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Not connected warning */}
        {!isConnected && (
          <div className="mb-4 p-4 rounded-[12px] bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-800">
              Please connect your wallet to use the faucet.
            </p>
          </div>
        )}

        {/* Error message */}
        {mintError && (
          <div className="mb-4 p-4 rounded-[12px] bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-800">{mintError}</p>
          </div>
        )}

        {/* Token list */}
        <div className="space-y-3">
          {TEST_TOKENS.map((token) => {
            const balance = getBalance(token.symbol);
            const deployed = isTokenDeployed(token.contractName);
            const isMintingThis = mintingToken === token.symbol;
            const mintedThis = mintSuccess === token.symbol;

            return (
              <div
                key={token.symbol}
                className={`p-4 rounded-[16px] border transition-all ${
                  deployed
                    ? "bg-white border-neutral-100 hover:border-neutral-200"
                    : "bg-neutral-50 border-neutral-100 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f97316] flex items-center justify-center p-2 shrink-0">
                      <Image
                        src={token.icon}
                        alt={token.symbol}
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-black">
                        {token.symbol}
                      </div>
                      <div className="text-[12px] text-neutral-500">
                        {token.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[13px] text-neutral-500 mb-1">
                      Balance
                    </div>
                    <div className="font-medium text-[15px] text-black">
                      {deployed
                        ? formatTokenDisplay(balance, token.decimals)
                        : "Not deployed"}
                    </div>
                  </div>
                </div>

                {/* Mint button */}
                <button
                  onClick={() => handleMint(token)}
                  disabled={!isConnected || !deployed || isMinting}
                  className={`mt-4 w-full py-2.5 rounded-full text-[14px] font-semibold transition-all flex items-center justify-center gap-2 ${
                    mintedThis
                      ? "bg-emerald-100 text-emerald-700"
                      : deployed && isConnected
                      ? "bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  {isMintingThis ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Minting...
                    </>
                  ) : mintedThis ? (
                    <>
                      <Check className="w-4 h-4" />
                      Minted!
                    </>
                  ) : (
                    <>
                      <Droplets className="w-4 h-4" />
                      Mint {formatTokenDisplay(token.mintAmount, token.decimals)} {token.symbol}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Info footer */}
        <div className="mt-6 p-4 rounded-[12px] bg-neutral-50 border border-neutral-100">
          <p className="text-[12px] text-neutral-600 leading-relaxed">
            This faucet provides test tokens for development and testing purposes only.
            These tokens have no real value. Make sure you&apos;re connected to the correct
            test network.
          </p>
        </div>
      </div>
    </div>
  );
}
