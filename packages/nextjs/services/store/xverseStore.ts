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
  // Live balances & vault state — updated by useBitcoinMonitor
  btcBalance: number | null;
  vaultBtcBalance: number | null;
  vaultState: string | null;
  vaultTaprootAddress: string | null;
  connect: () => Promise<void>;
  connectToLocalRegtest: () => Promise<void>;
  connectToStarknetSepolia: () => Promise<void>;
  disconnect: () => Promise<void>;
  hydrate: () => void;
  refreshBalances: () => Promise<void>;
  setVaultTaprootAddress: (addr: string | null) => void;
};

export const useXverseStore = create<XverseWalletState>((set, get) => ({
  btcAddress: null,
  starknetAddress: null,
  bitcoinNetwork: null,
  status: "disconnected",
  btcBalance: null,
  vaultBtcBalance: null,
  vaultState: null,
  vaultTaprootAddress: null,

  setVaultTaprootAddress: (addr) => set({ vaultTaprootAddress: addr }),

  refreshBalances: async () => {
    const { btcAddress, vaultTaprootAddress: storedVaultAddr } = get();
    // Also check localStorage for vault address set by the borrow page.
    const vaultAddr =
      storedVaultAddr ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("btcstd:taproot_address")
        : null);

    const fetchBalance = (address: string) =>
      fetch(`/api/bitcoin/balance?address=${address}`)
        .then((r) => r.json())
        .then((d) => (d.ok ? (d.balance as number) : null))
        .catch(() => null);

    const [walletBal, vaultBal] = await Promise.all([
      btcAddress ? fetchBalance(btcAddress) : Promise.resolve(null),
      vaultAddr ? fetchBalance(vaultAddr) : Promise.resolve(null),
    ]);

    // Fetch vault covenant state from the local file via status API.
    const vaultState = await fetch("/api/standard-vault/status")
      .then((r) => r.json())
      .then((d) => (d.vaultState as string | undefined) ?? null)
      .catch(() => null);

    if (vaultBal !== null)
      localStorage.setItem("btcstd:vault_btc_balance", String(vaultBal));
    if (vaultState !== null)
      localStorage.setItem("btcstd:vault_state", vaultState);

    set({
      btcBalance: walletBal,
      vaultBtcBalance: vaultBal,
      vaultState,
      ...(vaultAddr && !storedVaultAddr
        ? { vaultTaprootAddress: vaultAddr }
        : {}),
    });
  },

  hydrate: () => {
    const btcAddress = localStorage.getItem("xverse_payment_address");
    const starknetAddress = localStorage.getItem("xverse_starknet_address");
    const bitcoinNetwork = localStorage.getItem("xverse_bitcoin_network");
    const vaultTaprootAddress = localStorage.getItem("btcstd:taproot_address");
    const cachedVaultBalance = localStorage.getItem("btcstd:vault_btc_balance");
    const cachedVaultState = localStorage.getItem("btcstd:vault_state");
    if (btcAddress) {
      set({
        btcAddress,
        starknetAddress,
        bitcoinNetwork,
        status: "connected",
        vaultTaprootAddress,
        vaultBtcBalance:
          cachedVaultBalance !== null ? Number(cachedVaultBalance) : null,
        vaultState: cachedVaultState,
      });
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
      void get().refreshBalances();
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

  connectToStarknetSepolia: async () => {
    toast.info("Switching to Starknet Sepolia...");
    try {
      const response = await Wallet.request("wallet_connect", {
        addresses: ["payment", "ordinals", "starknet"],
        message: "Bitcoin Standard: connect on Testnet for Starknet Sepolia",
        network: "Testnet",
      } as any);

      if (response.status !== "success" || !response.result) {
        const msg =
          response.status === "error"
            ? (response as any).error?.message
            : "Connection not approved";
        toast.error(msg || "Failed to switch to Starknet Sepolia");
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
        toast.error("Xverse did not return a payment address");
        return;
      }

      const btcAddress = paymentAccount.address;
      const starknetAddress = starknetAccount?.address ?? null;
      const bitcoinNetwork = result.network?.bitcoin?.name ?? "Testnet";

      localStorage.setItem("xverse_payment_address", btcAddress);
      if (starknetAddress)
        localStorage.setItem("xverse_starknet_address", starknetAddress);
      localStorage.setItem("xverse_bitcoin_network", bitcoinNetwork);

      set({ btcAddress, starknetAddress, bitcoinNetwork, status: "connected" });
      toast.success(
        `Starknet Sepolia connected${starknetAddress ? ` — ${starknetAddress.slice(0, 10)}...` : ""}`,
      );
      void get().refreshBalances();
    } catch (err: any) {
      toast.error(err?.message || "Failed to switch to Starknet Sepolia");
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
