import { useEffect } from "react";
import { useXverseStore } from "~~/services/store/xverseStore";

/**
 * Mounts a polling loop that refreshes BTC wallet balance, vault BTC balance,
 * and vault covenant state from the local regtest node.
 *
 * Mount this once at the layout level — it updates the shared xverseStore so
 * any component can read the live values without its own fetch.
 */
export function useBitcoinMonitor(intervalMs = 15_000) {
  const { btcAddress, status, refreshBalances } = useXverseStore();

  useEffect(() => {
    if (status !== "connected") return;

    // Immediate fetch on mount / address change.
    void refreshBalances();

    const id = setInterval(() => void refreshBalances(), intervalMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btcAddress, status, intervalMs]);
}
