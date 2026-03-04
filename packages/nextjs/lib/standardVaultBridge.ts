import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";

type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
  output: string;
};

export type StandardVaultStatus = {
  available: boolean;
  bridgeUrl: string;
  repoRoot: string;
  standardVaultDir: string;
  bridgeMode: "direct";
  vaultFilePath: string;
  vaultFileExists: boolean;
  vaultState?: string;
  currentOutpoint?: { txid?: string; vout?: number };
  oraclePubKey?: string;
  lastCommand?: {
    action: string;
    code: number;
  };
  error?: string;
};

export type StandardVaultActionResult = {
  ok: boolean;
  action: string;
  code: number;
  txid?: string;
  state?: string;
  oraclePubKey?: string;
  vaultTaprootAddress?: string;
  liquidationPoolAddress?: string;
  outpointTxid?: string;
  outpointVout?: number;
  destinationAddress?: string;
  output: string;
  error?: string;
};

function maybeExtract(
  output: string,
  regex: RegExp,
  group: number = 1,
): string | undefined {
  const m = output.match(regex);
  return m?.[group];
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  for (let i = 0; i < 8; i += 1) {
    const maybe = path.join(current, "standard_vault");
    if (existsSync(maybe)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Could not locate repo root containing standard_vault/");
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string | undefined>,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        output: `${stdout}\n${stderr}`.trim(),
      });
    });
  });
}

async function getPaths() {
  const repoRoot = findRepoRoot(process.cwd());
  const standardVaultDir = path.join(repoRoot, "standard_vault");
  const vaultFilePath = path.join(standardVaultDir, "vault_covenant.json");
  return { repoRoot, standardVaultDir, vaultFilePath };
}

async function resolveStandardVaultCommand(standardVaultDir: string) {
  const releaseBin = path.join(
    standardVaultDir,
    "target",
    "release",
    "standard_vault",
  );
  const debugBin = path.join(
    standardVaultDir,
    "target",
    "debug",
    "standard_vault",
  );

  try {
    await fs.access(releaseBin);
    return { command: releaseBin, prefixArgs: [] as string[] };
  } catch {
    // fall through
  }

  try {
    await fs.access(debugBin);
    return { command: debugBin, prefixArgs: [] as string[] };
  } catch {
    // fall through
  }

  return { command: "cargo", prefixArgs: ["run", "--release", "--"] };
}

async function runStandardVaultAction(
  action: string,
  extraArgs: string[] = [],
): Promise<CommandResult> {
  const { standardVaultDir } = await getPaths();
  const { command, prefixArgs } =
    await resolveStandardVaultCommand(standardVaultDir);
  const args = [
    ...prefixArgs,
    "--settings-file",
    "settings.toml",
    action,
    ...extraArgs,
  ];
  return runCommand(command, args, standardVaultDir, { RUST_LOG: "info" });
}

async function getMinerAddress(): Promise<string> {
  const { standardVaultDir } = await getPaths();
  const cli = path.join(
    standardVaultDir,
    "bitcoin-core-cat",
    "src",
    "bitcoin-cli",
  );
  const result = await runCommand(
    cli,
    [
      "-regtest",
      "-rpcuser=user",
      "-rpcpassword=password",
      "-rpcwallet=miner",
      "getnewaddress",
    ],
    standardVaultDir,
  );
  if (result.code !== 0) {
    throw new Error(`Failed to fetch miner address: ${result.output}`);
  }
  return result.stdout.trim();
}

async function readVaultFile() {
  const { vaultFilePath } = await getPaths();
  try {
    const raw = await fs.readFile(vaultFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return { exists: true, parsed };
  } catch {
    return { exists: false, parsed: null };
  }
}

export async function getStandardVaultStatus(): Promise<StandardVaultStatus> {
  const { repoRoot, standardVaultDir, vaultFilePath } = await getPaths();
  const vaultInfo = await readVaultFile();
  const result = await runStandardVaultAction("status");

  const oraclePubKey = maybeExtract(
    result.output,
    /Oracle public key .*?:\s*([0-9a-fA-F]{64})/i,
  );

  if (result.code !== 0) {
    return {
      available: false,
      bridgeUrl: "local://standard_vault_cli",
      repoRoot,
      standardVaultDir,
      bridgeMode: "direct",
      vaultFilePath,
      vaultFileExists: vaultInfo.exists,
      vaultState: vaultInfo.parsed?.state,
      currentOutpoint: {
        txid: vaultInfo.parsed?.current_outpoint?.txid,
        vout: vaultInfo.parsed?.current_outpoint?.vout,
      },
      oraclePubKey: oraclePubKey,
      lastCommand: { action: "status", code: result.code },
      error: result.output || "standard_vault status failed",
    };
  }

  return {
    available: true,
    bridgeUrl: "local://standard_vault_cli",
    repoRoot,
    standardVaultDir,
    bridgeMode: "direct",
    vaultFilePath,
    vaultFileExists: vaultInfo.exists,
    vaultState: vaultInfo.parsed?.state,
    currentOutpoint: {
      txid: vaultInfo.parsed?.current_outpoint?.txid,
      vout: vaultInfo.parsed?.current_outpoint?.vout,
    },
    oraclePubKey,
    lastCommand: { action: "status", code: result.code },
  };
}

export async function depositVault(): Promise<StandardVaultActionResult> {
  const result = await runStandardVaultAction("deposit");
  const txid = maybeExtract(
    result.output,
    /Deposit outpoint:\s*([0-9a-f]{64}):\d+/i,
  );
  const voutRaw = maybeExtract(
    result.output,
    /Deposit outpoint:\s*[0-9a-f]{64}:(\d+)/i,
  );
  const oraclePubKey = maybeExtract(
    result.output,
    /Oracle public key .*?:\s*([0-9a-fA-F]{64})/i,
  );
  const vaultTaprootAddress = maybeExtract(
    result.output,
    /Vault Taproot address:\s*([a-z0-9]+)\s*$/im,
  );
  const liquidationPoolAddress = maybeExtract(
    result.output,
    /Liquidation pool address:\s*([a-z0-9]+)\s*$/im,
  );

  return {
    ok: result.code === 0,
    action: "deposit",
    code: result.code,
    txid,
    outpointTxid: txid,
    outpointVout: voutRaw ? Number(voutRaw) : undefined,
    oraclePubKey,
    vaultTaprootAddress,
    liquidationPoolAddress,
    state: result.code === 0 ? "Active" : undefined,
    output: result.output,
    error: result.code === 0 ? undefined : result.output,
  };
}

export async function liquidateVault(): Promise<StandardVaultActionResult> {
  const result = await runStandardVaultAction("liquidate");
  const txid = maybeExtract(result.output, /liquidate txid:\s*([0-9a-f]{64})/i);
  return {
    ok: result.code === 0,
    action: "liquidate",
    code: result.code,
    txid,
    state: result.code === 0 ? "Liquidated" : undefined,
    output: result.output,
    error: result.code === 0 ? undefined : result.output,
  };
}

export async function repayVault(
  destination?: string,
): Promise<StandardVaultActionResult> {
  const dst = destination || (await getMinerAddress());
  const result = await runStandardVaultAction("repay", [dst]);
  const txid = maybeExtract(result.output, /repay txid:\s*([0-9a-f]{64})/i);
  return {
    ok: result.code === 0,
    action: "repay",
    code: result.code,
    txid,
    destinationAddress: dst,
    state: result.code === 0 ? "Repaid" : undefined,
    output: result.output,
    error: result.code === 0 ? undefined : result.output,
  };
}

export async function timeoutVault(
  destination?: string,
): Promise<StandardVaultActionResult> {
  const dst = destination || (await getMinerAddress());
  const result = await runStandardVaultAction("timeout", [dst]);
  const txid = maybeExtract(result.output, /timeout txid:\s*([0-9a-f]{64})/i);
  return {
    ok: result.code === 0,
    action: "timeout",
    code: result.code,
    txid,
    destinationAddress: dst,
    state: result.code === 0 ? "Repaid" : undefined,
    output: result.output,
    error: result.code === 0 ? undefined : result.output,
  };
}
