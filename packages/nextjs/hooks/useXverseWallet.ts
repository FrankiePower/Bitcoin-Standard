import { useState, useEffect } from "react";
import { AddressPurpose } from "sats-connect";
import * as satsConnect from "sats-connect";
import { toast } from "sonner";

export interface BitcoinAddress {
  address: string;
  publicKey: string;
  purpose: AddressPurpose;
  addressType?: "p2wpkh" | "p2tr" | "p2sh" | "p2pkh" | string;
}

export const useXverseWallet = () => {
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [isBtcConnected, setIsBtcConnected] = useState(false);

  // Rehydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("xverse_payment_address");
    if (saved) {
      setBtcAddress(saved);
      setIsBtcConnected(true);
    }
  }, []);

  const connectBtc = async () => {
    try {
      const response = await satsConnect.request('getAccounts', {
        purposes: [AddressPurpose.Payment],
        message: 'BTCUSD Protocol wants to connect to your wallet',
      });

      if (response.status === 'success' && response.result) {
        const paymentAccount = response.result.find(
          (acc: any) => acc.purpose === AddressPurpose.Payment
        );

        if (paymentAccount) {
          setBtcAddress(paymentAccount.address);
          setIsBtcConnected(true);
          localStorage.setItem("xverse_payment_address", paymentAccount.address);
          toast.success("Bitcoin wallet connected!");
        }
      } else {
        toast.error("User canceled connection or an error occurred.");
      }
    } catch (error) {
      console.error('Xverse connect error:', error);
      toast.error("Failed to connect to Xverse");
    }
  };

  const disconnectBtc = () => {
    setBtcAddress(null);
    setIsBtcConnected(false);
    localStorage.removeItem("xverse_payment_address");
    toast.info("Bitcoin wallet disconnected");
  };

  return {
    btcAddress,
    isBtcConnected,
    connectBtc,
    disconnectBtc
  };
};
