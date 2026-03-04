/**
 * Deterministic attestation payload + signature generation for oracle actions.
 *
 * Uses Stark curve signatures available in `starknet` package to avoid extra deps.
 */

import { ec, hash } from "starknet";
import { appendFileSync } from "fs";
import { resolve } from "path";

export type AttestationKind = "LIQUIDATION" | "REPAYMENT_CLEARED";

export interface AttestationPayload {
  kind: AttestationKind;
  txidFelt: string;
  debt: string;
  healthFactor: string;
  timestampSec: number;
  note?: string;
}

export interface SignedAttestation {
  payload: AttestationPayload;
  messageHash: string;
  signerPublicKey: string;
  signature: {
    r: string;
    s: string;
  };
}

function kindToFelt(kind: AttestationKind): bigint {
  return kind === "LIQUIDATION" ? BigInt(1) : BigInt(2);
}

function toBigintFelt(value: string): bigint {
  if (value.startsWith("0x")) return BigInt(value);
  return BigInt(value);
}

export function signAttestation(
  payload: AttestationPayload,
): SignedAttestation | null {
  const privateKey = process.env.ORACLE_ATTESTATION_PRIVATE_KEY;
  if (!privateKey) return null;

  const messageHash = hash.computeHashOnElements([
    kindToFelt(payload.kind),
    toBigintFelt(payload.txidFelt),
    BigInt(payload.debt),
    BigInt(payload.healthFactor),
    BigInt(payload.timestampSec),
  ]);

  const signature = ec.starkCurve.sign(messageHash, privateKey);
  const signerPublicKey = ec.starkCurve.getStarkKey(privateKey);

  return {
    payload,
    messageHash,
    signerPublicKey,
    signature: {
      r: signature.r.toString(),
      s: signature.s.toString(),
    },
  };
}

export function persistAttestation(attestation: SignedAttestation): void {
  const logPath = resolve(
    process.cwd(),
    process.env.ATTESTATION_LOG_PATH ?? "attestations.jsonl",
  );
  appendFileSync(logPath, `${JSON.stringify(attestation)}\n`, "utf8");
}

