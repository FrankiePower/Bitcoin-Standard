/**
 * POST /api/bitcoin/fund
 * Body: { address: string, amount?: number }
 *
 * Sends regtest BTC from the miner wallet to the given address and mines
 * 1 block to confirm. Returns the txid and the new block hash.
 */
import { callBitcoinApi } from "~~/lib/bitcoinApiBridge";
import { spawn } from "child_process";
import path from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

function findBitcoinCli(): string | null {
  const candidates = [
    path.resolve(
      process.cwd(),
      "../../standard_vault/bitcoin-core-cat/src/bitcoin-cli",
    ),
    path.resolve(
      process.cwd(),
      "../../../standard_vault/bitcoin-core-cat/src/bitcoin-cli",
    ),
  ];
  return candidates.find(existsSync) ?? null;
}

function runCli(
  cli: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      cli,
      ["-regtest", "-rpcuser=user", "-rpcpassword=password", ...args],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("close", (code) =>
      resolve({
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      }),
    );
  });
}

export async function POST(request: Request) {
  try {
    const { address, amount = 1 } = await request.json().catch(() => ({}));
    if (!address) {
      return Response.json(
        { ok: false, error: "address required" },
        { status: 400 },
      );
    }

    const cli = findBitcoinCli();
    if (!cli) {
      return Response.json(
        { ok: false, error: "bitcoin-cli not found" },
        { status: 500 },
      );
    }

    // Send from miner wallet
    const sendRes = await runCli(cli, [
      "-rpcwallet=miner",
      "sendtoaddress",
      address,
      String(amount),
    ]);
    if (sendRes.code !== 0) {
      return Response.json(
        { ok: false, error: sendRes.stderr || sendRes.stdout },
        { status: 500 },
      );
    }
    const txid = sendRes.stdout;

    // Mine 1 block to confirm
    const minerAddrRes = await runCli(cli, [
      "-rpcwallet=miner",
      "getnewaddress",
    ]);
    const minerAddr = minerAddrRes.stdout;
    const mineRes = await runCli(cli, ["generatetoaddress", "1", minerAddr]);
    const blockHash = mineRes.stdout.replace(/[\[\]"\s\n]/g, "").split(",")[0];

    return Response.json(
      { ok: true, txid, blockHash, address, amount },
      { status: 200 },
    );
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message ?? "Fund failed" },
      { status: 500 },
    );
  }
}
