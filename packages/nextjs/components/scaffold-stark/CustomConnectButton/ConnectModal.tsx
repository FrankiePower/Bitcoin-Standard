import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useXverseStore } from "~~/services/store/xverseStore";

const ConnectModal = () => {
  const modalRef = useRef<HTMLInputElement>(null);
  const { btcAddress, starknetAddress, status, connect, disconnect, hydrate } =
    useXverseStore();
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  useEffect(() => {
    hydrate();
  }, []);

  const handleCloseModal = () => {
    if (modalRef.current) modalRef.current.checked = false;
  };

  const displayAddress = starknetAddress ?? btcAddress;
  const buttonLabel =
    isConnected && displayAddress
      ? `${displayAddress.slice(0, 4)}...${displayAddress.slice(-4)}`
      : isConnecting
        ? "Connecting..."
        : "Connect Wallet";

  return (
    <div>
      <label
        htmlFor="connect-modal"
        className="flex items-center justify-center gap-2 px-5 py-2.5 text-[15px] font-semibold text-white rounded-full transition-all hover:opacity-90 active:scale-95 shadow-sm cursor-pointer"
        style={{
          background: isConnected
            ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            : "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
        }}
      >
        {isConnected && (
          <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
        )}
        <span>{buttonLabel}</span>
      </label>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            <input
              ref={modalRef}
              type="checkbox"
              id="connect-modal"
              className="modal-toggle"
            />
            <div className="modal backdrop-blur-sm z-[9999]">
              <div className="modal-box bg-[#111111] rounded-2xl border border-white/10 flex flex-col relative w-full max-w-[420px] p-0 overflow-hidden shadow-2xl">
                <label
                  htmlFor="connect-modal"
                  className="absolute inset-0 z-[-1] cursor-pointer"
                />

                <div className="p-6 border-b border-white/5 flex flex-col items-center">
                  <label
                    htmlFor="connect-modal"
                    className="absolute right-4 top-4 text-neutral-400 hover:text-white cursor-pointer z-10 text-xl"
                  >
                    ✕
                  </label>
                  <h2 className="text-2xl font-black text-orange-500 mb-1">
                    BTCUSD
                  </h2>
                  <p className="text-neutral-400 text-sm">
                    Connect Your Wallet
                  </p>
                </div>

                <div className="p-6">
                  {isConnected ? (
                    <div className="flex flex-col gap-4">
                      {btcAddress && (
                        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                          <p className="text-neutral-400 text-xs mb-1">
                            Bitcoin
                          </p>
                          <p className="text-white text-xs font-mono break-all">
                            {btcAddress}
                          </p>
                        </div>
                      )}
                      {starknetAddress && (
                        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                          <p className="text-neutral-400 text-xs mb-1">
                            Starknet
                          </p>
                          <p className="text-white text-xs font-mono break-all">
                            {starknetAddress}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          disconnect();
                          handleCloseModal();
                        }}
                        className="w-full py-3 rounded-lg text-[15px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                        <p className="text-neutral-400 text-[13px] leading-relaxed">
                          Connect your Xverse wallet to use the Bitcoin Standard
                          protocol.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await connect();
                          handleCloseModal();
                        }}
                        disabled={isConnecting}
                        className="w-full py-3 rounded-lg text-[15px] font-semibold text-white bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isConnecting ? "Connecting..." : "Connect Xverse"}
                      </button>
                    </div>
                  )}
                  <div className="mt-6 text-center">
                    <p className="text-neutral-500 text-xs">
                      Your keys, your coins.
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
