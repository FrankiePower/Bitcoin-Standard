"use client";

import { useState } from "react";
import Wallet from "sats-connect";
import { useXverseStore } from "~~/services/store/xverseStore";

type Step =
  | "idle"
  | "preparing"
  | "signing"
  | "broadcasting"
  | "done"
  | "error";

export const TestSignFlow = () => {
  const { btcAddress } = useXverseStore();
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<{
    txid?: string;
    error?: string;
  } | null>(null);

  const run = async () => {
    if (!btcAddress) return;
    setStep("preparing");
    setResult(null);

    try {
      // 1. Build PSBT from Xverse UTXO
      const prepRes = await fetch("/api/bitcoin/test-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: btcAddress,
          toAddress: "bcrt1qu7de3pmge8rncf68e99n39qtxq7gdzml6qmfrg",
          amount: 1,
        }),
      }).then((r) => r.json());

      if (!prepRes.ok) throw new Error(prepRes.error);
      console.log("[test-sign] psbt ready:", prepRes);

      // 2. Sign with Xverse
      setStep("signing");
      const signRes = await Wallet.request("signPsbt", {
        psbt: prepRes.psbt,
        signInputs: { [btcAddress]: [0] },
        broadcast: false,
      } as any);

      console.log("[test-sign] sign response:", signRes);
      if (signRes.status !== "success" || !(signRes.result as any)?.psbt) {
        throw new Error((signRes as any).error?.message ?? "Signing rejected");
      }

      const signedPsbt = (signRes.result as any).psbt;

      // 3. Finalize + broadcast + mine
      setStep("broadcasting");
      const finalRes = await fetch("/api/bitcoin/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psbt: signedPsbt }),
      }).then((r) => r.json());

      console.log("[test-sign] finalize response:", finalRes);
      if (!finalRes.ok) throw new Error(finalRes.error);

      setResult({ txid: finalRes.txid });
      setStep("done");
    } catch (err: any) {
      console.error("[test-sign] error:", err);
      setResult({ error: err.message });
      setStep("error");
    }
  };

  const stepLabel: Record<Step, string> = {
    idle: "Test: Sign & Broadcast",
    preparing: "Preparing PSBT...",
    signing: "Waiting for Xverse signature...",
    broadcasting: "Broadcasting...",
    done: "Done!",
    error: "Failed",
  };

  const isRunning = ["preparing", "signing", "broadcasting"].includes(step);

  return (
    <div className="flex flex-col gap-2 border border-yellow-500/30 rounded-xl p-3 bg-yellow-500/5">
      <p className="text-yellow-400 text-xs font-semibold">
        ⚡ TEST — remove after confirming
      </p>
      <button
        onClick={run}
        disabled={isRunning || !btcAddress}
        className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isRunning && (
          <span className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
        )}
        {stepLabel[step]}
      </button>
      {step === "done" && result?.txid && (
        <p className="text-green-400 text-xs font-mono break-all">
          ✓ txid: {result.txid}
        </p>
      )}
      {step === "error" && result?.error && (
        <p className="text-red-400 text-xs break-all">✗ {result.error}</p>
      )}
    </div>
  );
};
