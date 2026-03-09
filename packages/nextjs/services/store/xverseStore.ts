import { create } from "zustand";
import Wallet from "sats-connect";
import { toast } from "sonner";

type XverseStatus = "disconnected" | "connecting" | "connected";

type XverseWalletState = {
  btcAddress: string | null;
  starknetAddress: string | null;
  bitcoinNetwork: string | null;
  status: XverseStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  hydrate: () => void;
};

export const useXverseStore = create<XverseWalletState>((set, get) => ({
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

      const paymentAccount = addresses.find((a: any) => a.purpose === "payment");
      const starknetAccount = addresses.find((a: any) => a.purpose === "starknet");

      if (!paymentAccount) {
        toast.error("Xverse did not return a Bitcoin payment address");
        set({ status: "disconnected" });
        return;
      }

      const btcAddress = paymentAccount.address;
      const starknetAddress = starknetAccount?.address ?? null;
      const bitcoinNetwork = result.network?.bitcoin?.name ?? null;

      localStorage.setItem("xverse_payment_address", btcAddress);
      if (starknetAddress) localStorage.setItem("xverse_starknet_address", starknetAddress);
      if (bitcoinNetwork) localStorage.setItem("xverse_bitcoin_network", bitcoinNetwork);

      set({ btcAddress, starknetAddress, bitcoinNetwork, status: "connected" });
      toast.success(`Xverse connected${bitcoinNetwork ? ` (${bitcoinNetwork})` : ""}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to connect Xverse wallet");
      set({ status: "disconnected" });
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
    set({ btcAddress: null, starknetAddress: null, bitcoinNetwork: null, status: "disconnected" });
    toast.info("Xverse wallet disconnected");
  },
}));
