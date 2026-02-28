import { Connector, useConnect, useAccount, useDisconnect } from "@starknet-react/core";
import { useRef, useState } from "react";
import GenericModal from "./GenericModal";
import { createPortal } from "react-dom";
import { useXverseWallet } from "~~/hooks/useXverseWallet";
import { useLocalStorage } from "usehooks-ts";
import { LAST_CONNECTED_TIME_LOCALSTORAGE_KEY } from "~~/utils/Constants";
import Image from "next/image";

const ConnectModal = () => {
  const modalRef = useRef<HTMLInputElement>(null);
  
  // Starknet
  const { connectors, connect } = useConnect();
  const { address: starknetAddress, status: starknetStatus } = useAccount();
  const { disconnect: disconnectStarknet } = useDisconnect();
  const isStarknetConnected = starknetStatus === "connected";

  // Bitcoin
  const { btcAddress, isBtcConnected, connectBtc, disconnectBtc } = useXverseWallet();

  const [, setLastConnector] = useLocalStorage<{ id: string; ix?: number }>(
    "lastUsedConnector",
    { id: "" },
  );
  const [, setLastConnectionTime] = useLocalStorage<number>(
    LAST_CONNECTED_TIME_LOCALSTORAGE_KEY,
    0,
  );

  const [showStarknetWallets, setShowStarknetWallets] = useState(false);

  const handleConnectStarknetWallet = (
    e: React.MouseEvent<HTMLButtonElement>,
    connector: Connector,
  ) => {
    connect({ connector });
    setLastConnector({ id: connector.id });
    setLastConnectionTime(Date.now());
    setShowStarknetWallets(false);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.checked = false;
    }
  };

  const handleConnectBtc = async () => {
    try {
      await connectBtc();
      handleCloseModal();
    } catch (e) {
      console.error(e);
    }
  };

  const disconnectAll = () => {
    if (isStarknetConnected) disconnectStarknet();
    if (isBtcConnected) disconnectBtc();
  };

  // Filter out burner and other unwanted wallets to keep it clean (Argent, Braavos, etc.)
  const mainConnectors = connectors.filter(c => c.id !== "burner-wallet");

  const anyConnected = isStarknetConnected || isBtcConnected;

  const buttonLabel = () => {
    if (isStarknetConnected && isBtcConnected) {
      return `SN + BTC Connected`;
    }
    if (isStarknetConnected) {
      return `${starknetAddress?.slice(0, 4)}...${starknetAddress?.slice(-4)}`;
    }
    if (isBtcConnected) {
      return `BTC: ${btcAddress?.slice(0, 4)}...${btcAddress?.slice(-4)}`;
    }
    return "Connect Wallet";
  };

  return (
    <div>
      <label
        htmlFor="connect-modal"
        className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-white rounded-full transition-all hover:opacity-90 active:scale-95 shadow-sm cursor-pointer ${anyConnected ? "" : ""}`}
        style={{
          background: anyConnected
            ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            : "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
        }}
      >
        {anyConnected && (
          <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
        )}
        <span>{buttonLabel()}</span>
      </label>
      
      {typeof document !== "undefined" &&
        createPortal(
          <>
            <input
              ref={modalRef}
              type="checkbox"
              id="connect-modal"
              className="modal-toggle"
              onChange={(e) => {
                if (!e.target.checked) setShowStarknetWallets(false);
              }}
            />
            <div className="modal backdrop-blur-sm z-[9999]">
              <div 
                className="modal-box bg-[#111111] rounded-2xl border border-white/10 flex flex-col relative w-full max-w-[420px] p-0 overflow-hidden shadow-2xl" 
                style={{ minHeight: "auto" }}
              >
                <label htmlFor="connect-modal" className="absolute inset-0 z-[-1] cursor-pointer" />
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex flex-col items-center">
                  <label htmlFor="connect-modal" className="absolute right-4 top-4 text-neutral-400 hover:text-white cursor-pointer z-10 text-xl">✕</label>
                  <h2 className="text-2xl font-black text-orange-500 mb-1">BTCUSD</h2>
                  <p className="text-neutral-400 text-sm">Connect Your Wallets</p>
                </div>

                <div className="p-6">
                  {/* Info Section */}
                  <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 border border-white/5">
                    <h3 className="text-white text-[15px] font-bold mb-1.5">Two Wallets, One Protocol</h3>
                    <p className="text-neutral-400 text-[13px] leading-relaxed">
                      Connect your Starknet wallet to manage your position, and optionally connect Xverse to bridge BTC directly.
                    </p>
                  </div>

                  {!showStarknetWallets ? (
                    <div className="flex flex-col gap-4">
                      {/* Starknet Wallet Card */}
                      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 transition-all hover:border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center font-bold text-white text-sm">
                            SN
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-[15px] mb-0.5">Starknet Wallet</h4>
                            <p className="text-neutral-400 text-xs">
                              {isStarknetConnected 
                                ? `Connected: ${starknetAddress?.slice(0, 6)}...${starknetAddress?.slice(-4)}`
                                : "ArgentX, Braavos, or any Starknet wallet"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!isStarknetConnected) setShowStarknetWallets(true);
                          }}
                          disabled={isStarknetConnected}
                          className={`w-full py-3 rounded-lg text-[15px] font-semibold transition-all ${
                            isStarknetConnected 
                              ? "bg-green-500/10 text-green-500 cursor-default"
                              : "bg-[#222222] text-white hover:bg-[#333333]"
                          }`}
                        >
                          {isStarknetConnected ? "Connected" : "Connect"}
                        </button>
                      </div>

                      {/* BTC Wallet Card */}
                      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 transition-all hover:border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white p-2">
                             <Image src="/bitcoin-btc-logo.svg" alt="BTC" width={20} height={20} className="filter brightness-0 invert" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-[15px] mb-0.5">Bitcoin Wallet</h4>
                            <p className="text-neutral-400 text-xs">
                              {isBtcConnected 
                                ? `Connected: ${btcAddress?.slice(0, 6)}...${btcAddress?.slice(-4)}`
                                : "Xverse wallet for BTC bridging (optional)"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleConnectBtc}
                          disabled={isBtcConnected}
                          className={`w-full py-3 rounded-lg text-[15px] font-semibold transition-all ${
                            isBtcConnected 
                              ? "bg-green-500/10 text-green-500 cursor-default"
                              : "bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                          }`}
                        >
                          {isBtcConnected ? "Connected" : "Connect"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Native Starknet Connectors List */
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setShowStarknetWallets(false)} className="text-neutral-400 hover:text-white pb-1 flex items-center gap-1 text-sm">
                          ← Back
                        </button>
                      </div>
                      {mainConnectors.map((connector, index) => {
                        const icon = typeof connector.icon === "object" ? connector.icon.dark || connector.icon.light : connector.icon;
                        return (
                          <button
                            key={connector.id || index}
                            onClick={(e) => handleConnectStarknetWallet(e, connector)}
                            className="bg-[#222222] hover:bg-[#333333] border border-white/5 rounded-xl p-3 flex items-center gap-4 transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10">
                              {icon && (
                                <Image
                                  src={icon as string}
                                  alt={connector.name}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="text-white font-medium">{connector.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer / Disconnect All */}
                  {(isStarknetConnected || isBtcConnected) && (
                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
                      <button 
                        onClick={() => {
                          disconnectAll();
                          setShowStarknetWallets(false);
                        }}
                        className="text-red-400 text-sm hover:text-red-300 transition-colors font-medium border border-red-500/20 bg-red-500/10 px-6 py-2 rounded-full"
                      >
                        Disconnect All Wallets
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-6 text-center">
                    <p className="text-neutral-500 text-xs">
                      Your keys, your coins. We never store your private keys.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default ConnectModal;
