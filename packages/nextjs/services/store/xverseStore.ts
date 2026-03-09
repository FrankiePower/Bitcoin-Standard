import { create } from "zustand";
import Wallet from "sats-connect";
import { toast } from "sonner";

type XverseStatus = "disconnected" | "connecting" | "connected";

const REGTEST_NAME =
  process.env.NEXT_PUBLIC_XVERSE_REGTEST_NAME ?? "btcstandard-local-regtest";
const REGTEST_RPC_URL =
  process.env.NEXT_PUBLIC_XVERSE_REGTEST_RPC_URL ??
  "http://user:password@127.0.0.1:18443";

type XverseWalletState = {
  btcAddress: string | null;
  starknetAddress: string | null;
  bitcoinNetwork: string | null;
  status: XverseStatus;
  connect: () => Promise<void>;
  connectToLocalRegtest: () => Promise<void>;
  disconnect: () => Promise<void>;
  hydrate: () => void;
};

export const useXverseStore = create<XverseWalletState>((set) => ({
  btcAddress: null,
  starknetAddress: null,
  bitcoinNetwork: null,
  status: "disconnected",

  hydrate: () => {
    const btcAddress = localStorage.getItem("xverse_payment_address");
    const starknetAddress = localStorage.getItem("xverse_starknet_address");
    const bitcoinNetwork = localStorage.getItem("xverse_bitcoin_network");
    if (btcAddress) {
      set({ btcAddress, starknetAddress, bitcoinNetwork, status: "connected" });
    }
  },

  connect: async () => {
    set({ status: "connecting" });
    try {
      const response = await Wallet.request("wallet_connect", {
        addresses: ["payment", "ordinals", "starknet"],
        message: "Bitcoin Standard wants to connect to your wallet",
      } as any);

      if (response.status !== "success" || !response.result) {
        const msg =
          response.status === "error"
            ? (response as any).error?.message
            : "Connection not approved";
        toast.error(msg || "Failed to connect Xverse wallet");
        set({ status: "disconnected" });
        return;
      }

      const result = response.result as any;
      const addresses: any[] = result.addresses ?? result.addressses ?? [];

      const paymentAccount = addresses.find(
        (a: any) => a.purpose === "payment",
      );
      const starknetAccount = addresses.find(
        (a: any) => a.purpose === "starknet",
      );

      if (!paymentAccount) {
        toast.error("Xverse did not return a Bitcoin payment address");
        set({ status: "disconnected" });
        return;
      }

      const btcAddress = paymentAccount.address;
      const starknetAddress = starknetAccount?.address ?? null;
      const bitcoinNetwork = result.network?.bitcoin?.name ?? null;

      localStorage.setItem("xverse_payment_address", btcAddress);
      if (starknetAddress)
        localStorage.setItem("xverse_starknet_address", starknetAddress);
      if (bitcoinNetwork)
        localStorage.setItem("xverse_bitcoin_network", bitcoinNetwork);

      set({ btcAddress, starknetAddress, bitcoinNetwork, status: "connected" });
      toast.success(
        `Xverse connected${bitcoinNetwork ? ` (${bitcoinNetwork})` : ""}`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to connect Xverse wallet");
      set({ status: "disconnected" });
    }
  },

  connectToLocalRegtest: async () => {
    console.log("[xverse] connectToLocalRegtest: start");
    toast.info("Connecting to local regtest...");

    // Re-connect with network: "Regtest" so Xverse generates regtest addresses.
    // wallet_addNetwork with localhost is unreliable; PSBT signing only needs
    // Xverse to be in regtest mode — our node handles everything else.
    try {
      console.log("[xverse] calling wallet_connect with network: Regtest");
      const response = await Wallet.request("wallet_connect", {
        addresses: ["payment", "ordinals"],
        message: "Bitcoin Standard: connect on Regtest for local node signing",
        network: "Regtest",
      } as any);

      console.log("[xverse] wallet_connect response:", response);

      if (response.status !== "success" || !response.result) {
        const msg =
          response.status === "error"
            ? (response as any).error?.message
            : "Connection not approved";
        console.error("[xverse] wallet_connect failed:", msg);
        toast.error(msg || "Failed to switch to Regtest");
        return;
      }

      const result = response.result as any;
      const addresses: any[] = result.addresses ?? result.addressses ?? [];
      const paymentAccount = addresses.find(
        (a: any) => a.purpose === "payment",
      );

      console.log("[xverse] regtest addresses:", addresses);

      if (!paymentAccount) {
        toast.error("Xverse did not return a regtest payment address");
        return;
      }

      const btcAddress = paymentAccount.address;
      const bitcoinNetwork = result.network?.bitcoin?.name ?? "Regtest";

      localStorage.setItem("xverse_payment_address", btcAddress);
      localStorage.setItem("xverse_bitcoin_network", bitcoinNetwork);

      set({ btcAddress, bitcoinNetwork, status: "connected" });

      // Best-effort: try wallet_addNetwork so Xverse can query our node.
      // Non-blocking — don't fail the whole flow if this doesn't work.
      Wallet.request("wallet_addNetwork", {
        name: REGTEST_NAME,
        chain: "bitcoin",
        rpc_url: REGTEST_RPC_URL,
      } as any)
        .then((r) => console.log("[xverse] wallet_addNetwork response:", r))
        .catch((e) => console.warn("[xverse] wallet_addNetwork skipped:", e));

      toast.success(`Xverse on Regtest — ${btcAddress.slice(0, 10)}...`);
      console.log("[xverse] connected on regtest, btcAddress:", btcAddress);
    } catch (err: any) {
      console.error("[xverse] connectToLocalRegtest error:", err);
      toast.error(err?.message || "Failed to connect to regtest");
    }
  },

  disconnect: async () => {
    try {
      await Wallet.request("wallet_disconnect", undefined as any);
    } catch {
      // ignore
    }
    localStorage.removeItem("xverse_payment_address");
    localStorage.removeItem("xverse_starknet_address");
    localStorage.removeItem("xverse_bitcoin_network");
    set({
      btcAddress: null,
      starknetAddress: null,
      bitcoinNetwork: null,
      status: "disconnected",
    });
    toast.info("Xverse wallet disconnected");
  },
}));
