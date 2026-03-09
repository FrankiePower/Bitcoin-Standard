import {
  UseAccountResult,
  useAccount as useStarknetReactAccount,
} from "@starknet-react/core";
import { useMemo } from "react";
import { useXverseStore } from "~~/services/store/xverseStore";

/**
 * Wrapper that returns the Xverse wallet state (via sats-connect) as the
 * primary account source. Falls back to starknet-react only when explicitly
 * needed by internal scaffold tooling.
 */
export function useAccount(): UseAccountResult {
  const starknetAccount = useStarknetReactAccount();
  const { starknetAddress, status: xverseStatus } = useXverseStore();

  const xverseConnected = xverseStatus === "connected";

  const address = useMemo(() => {
    if (xverseConnected && starknetAddress) {
      return starknetAddress as `0x${string}`;
    }
    return starknetAccount.address;
  }, [xverseConnected, starknetAddress, starknetAccount.address]);

  const status = useMemo(() => {
    if (xverseConnected) return "connected" as const;
    if (xverseStatus === "connecting") return "connecting" as const;
    return starknetAccount.status;
  }, [xverseConnected, xverseStatus, starknetAccount.status]);

  return {
    ...starknetAccount,
    address,
    status,
  } as UseAccountResult;
}
