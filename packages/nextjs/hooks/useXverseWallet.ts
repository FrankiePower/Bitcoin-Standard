import { useEffect, useState } from "react";
import Wallet from "sats-connect";
import { toast } from "sonner";

type XverseAddressPurpose =
  | "payment"
  | "ordinals"
  | "stacks"
  | "spark"
  | "starknet";

type XverseNetworkName = "Mainnet" | "Testnet" | "Signet" | "Regtest";

type WalletConnectAddress = {
  address: string;
  publicKey: string;
  purpose: XverseAddressPurpose;
  addressType: string;
  network?: string;
};

type WalletConnectResult = {
  addresses?: WalletConnectAddress[];
  addressses?: WalletConnectAddress[]; // xverse docs typo compatibility
  network?: {
    bitcoin?: { name?: string };
    stacks?: { name?: string };
    spark?: { name?: string };
    starknet?: { name?: string };
  };
  walletType?: "ledger" | "software";
};

type SignPsbtResult = {
  psbt: string;
  txid?: string;
};

type AddNetworkParams = {
  name: string;
  chain: "bitcoin";
  rpc_url: string;
  rpc_fallback_url?: string;
  indexer_api?: string;
  block_explorer_url?: string;
};

type XverseLocalRegtestConfig = {
  name: string;
  rpc_url: string;
  rpc_fallback_url?: string;
  indexer_api?: string;
  block_explorer_url?: string;
};

const DEFAULT_REGTEST_NAME = "btcstandard-local-regtest";

function getDefaultRegtestConfig(): XverseLocalRegtestConfig {
  return {
    name:
      process.env.NEXT_PUBLIC_XVERSE_REGTEST_NAME?.trim() ||
      DEFAULT_REGTEST_NAME,
    rpc_url:
      process.env.NEXT_PUBLIC_XVERSE_REGTEST_RPC_URL?.trim() ||
      "http://127.0.0.1:18443",
    rpc_fallback_url:
      process.env.NEXT_PUBLIC_XVERSE_REGTEST_RPC_FALLBACK_URL?.trim() ||
      undefined,
    indexer_api:
      process.env.NEXT_PUBLIC_XVERSE_REGTEST_INDEXER_URL?.trim() || undefined,
    block_explorer_url:
      process.env.NEXT_PUBLIC_XVERSE_REGTEST_EXPLORER_URL?.trim() || undefined,
  };
}

export const useXverseWallet = () => {
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [starknetAddress, setStarknetAddress] = useState<string | null>(null);
  const [isBtcConnected, setIsBtcConnected] = useState(false);
  const [bitcoinNetwork, setBitcoinNetwork] =
    useState<XverseNetworkName | null>(null);

  useEffect(() => {
    const savedPayment = localStorage.getItem("xverse_payment_address");
    const savedStarknet = localStorage.getItem("xverse_starknet_address");
    const savedBtcNetwork = localStorage.getItem("xverse_bitcoin_network");

    if (savedPayment) {
      setBtcAddress(savedPayment);
      setIsBtcConnected(true);
    }
    if (savedStarknet) setStarknetAddress(savedStarknet);
    if (
      savedBtcNetwork === "Mainnet" ||
      savedBtcNetwork === "Testnet" ||
      savedBtcNetwork === "Signet" ||
      savedBtcNetwork === "Regtest"
    ) {
      setBitcoinNetwork(savedBtcNetwork);
    }
  }, []);

  const connectBtc = async (
    network: XverseNetworkName = "Regtest",
  ): Promise<string | null> => {
    try {
      const response = await Wallet.request("wallet_connect", {
        addresses: ["payment", "ordinals", "starknet"],
        message: "BTCUSD Protocol wants to connect to your wallet",
        network,
      } as any);

      if (response.status !== "success" || !response.result) {
        const message =
          response.status === "error"
            ? response.error.message
            : "Connection request was not approved";
        toast.error(message || "Failed to connect Xverse wallet");
        return null;
      }

      const result = response.result as WalletConnectResult;
      const addresses = result.addresses || result.addressses || [];

      const paymentAccount = addresses.find((acc) => acc.purpose === "payment");
      const starknetAccount = addresses.find(
        (acc) => acc.purpose === "starknet",
      );

      if (!paymentAccount) {
        toast.error("Xverse did not return a Bitcoin payment address");
        return null;
      }

      setBtcAddress(paymentAccount.address);
      setIsBtcConnected(true);
      setStarknetAddress(starknetAccount?.address || null);
      setBitcoinNetwork(
        (result.network?.bitcoin?.name as XverseNetworkName) || network,
      );

      localStorage.setItem("xverse_payment_address", paymentAccount.address);
      localStorage.setItem(
        "xverse_bitcoin_network",
        result.network?.bitcoin?.name || network,
      );
      if (starknetAccount?.address) {
        localStorage.setItem(
          "xverse_starknet_address",
          starknetAccount.address,
        );
      }

      toast.success(
        `Xverse connected (${result.network?.bitcoin?.name || network})`,
      );
      return paymentAccount.address;
    } catch (error: any) {
      console.error("Xverse wallet_connect error:", error);
      toast.error(error?.message || "Failed to connect Xverse wallet");
      return null;
    }
  };

  const getWalletNetwork = async (): Promise<XverseNetworkName | null> => {
    try {
      const response = await Wallet.request(
        "wallet_getNetwork",
        undefined as any,
      );
      if (response.status !== "success" || !response.result) return null;
      const network = (response.result as any)?.bitcoin?.name as
        | XverseNetworkName
        | undefined;
      if (network) {
        setBitcoinNetwork(network);
        localStorage.setItem("xverse_bitcoin_network", network);
        return network;
      }
      return null;
    } catch {
      return null;
    }
  };

  const addLocalRegtestNetwork = async (
    config: XverseLocalRegtestConfig = getDefaultRegtestConfig(),
  ): Promise<boolean> => {
    try {
      const params: AddNetworkParams = {
        name: config.name,
        chain: "bitcoin",
        rpc_url: config.rpc_url,
      };
      if (config.rpc_fallback_url)
        params.rpc_fallback_url = config.rpc_fallback_url;
      if (config.indexer_api) params.indexer_api = config.indexer_api;
      if (config.block_explorer_url) {
        params.block_explorer_url = config.block_explorer_url;
      }

      const response = await Wallet.request("wallet_addNetwork", params as any);
      if (response.status === "error") {
        // wallet may reject if already added; treat as soft failure and continue.
        const msg = response.error?.message || "";
        if (!/already|exists|added/i.test(msg)) {
          toast.error(msg || "Failed to add custom regtest network");
          return false;
        }
      }
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Failed to add custom regtest network");
      return false;
    }
  };

  const changeBitcoinNetwork = async (
    network: XverseNetworkName | string,
  ): Promise<boolean> => {
    try {
      const response = await Wallet.request("wallet_changeNetwork", {
        chain: "bitcoin",
        network,
      } as any);

      if (response.status === "error") {
        toast.error(
          response.error.message || "Failed to switch wallet network",
        );
        return false;
      }

      await getWalletNetwork();
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Failed to switch wallet network");
      return false;
    }
  };

  const ensureLocalRegtest = async (): Promise<boolean> => {
    // Must be connected first per docs.
    const connectedAddress = btcAddress || (await connectBtc("Regtest"));
    if (!connectedAddress) return false;

    const config = getDefaultRegtestConfig();
    const added = await addLocalRegtestNetwork(config);
    if (!added) return false;

    const switched = await changeBitcoinNetwork(config.name);
    if (!switched) return false;

    toast.success(`Using Xverse network: ${config.name}`);
    return true;
  };

  const signPsbt = async (
    psbtBase64: string,
    signingIndexes: number[],
    addressOverride?: string,
  ): Promise<SignPsbtResult> => {
    const targetAddress = addressOverride || btcAddress || (await connectBtc());
    if (!targetAddress) {
      throw new Error("Connect Xverse payment address before signing");
    }

    const response = await Wallet.request("signPsbt", {
      psbt: psbtBase64,
      signInputs: {
        [targetAddress]: signingIndexes,
      },
      broadcast: false,
    } as any);

    if (response.status !== "success" || !response.result?.psbt) {
      throw new Error(
        response.status === "error"
          ? response.error.message || "PSBT signing rejected"
          : "PSBT signing rejected",
      );
    }

    return {
      psbt: response.result.psbt,
      txid: response.result.txid,
    };
  };

  const disconnectBtc = async () => {
    try {
      await Wallet.request("wallet_disconnect", undefined as any);
    } catch {
      // Keep local disconnect regardless of wallet response.
    }

    setBtcAddress(null);
    setStarknetAddress(null);
    setIsBtcConnected(false);
    setBitcoinNetwork(null);
    localStorage.removeItem("xverse_payment_address");
    localStorage.removeItem("xverse_starknet_address");
    localStorage.removeItem("xverse_bitcoin_network");
    toast.info("Xverse wallet disconnected");
  };

  return {
    btcAddress,
    starknetAddress,
    bitcoinNetwork,
    isBtcConnected,
    connectBtc,
    disconnectBtc,
    getWalletNetwork,
    addLocalRegtestNetwork,
    changeBitcoinNetwork,
    ensureLocalRegtest,
    signPsbt,
  };
};
