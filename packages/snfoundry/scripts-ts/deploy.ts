import {
  deployContract,
  executeDeployCalls,
  exportDeployments,
  deployer,
  assertDeployerDefined,
  assertRpcNetworkActive,
  assertDeployerSignable,
} from "./deploy-contract";
import { green, red, yellow } from "./helpers/colorize-log";

/**
 * ~4% APY VSR (per-second rate in ray, where RAY = 1e27)
 * Formula: (1 + 0.04)^(1/31536000) * RAY
 */
const VSR_4_PERCENT = BigInt("1000000001243680656318820312");

/**
 * Deploy a contract using the specified parameters.
 *
 * @example (deploy contract with constructorArgs)
 * const deployScript = async (): Promise<void> => {
 *   await deployContract(
 *     {
 *       contract: "YourContract",
 *       contractName: "YourContractExportName",
 *       constructorArgs: {
 *         owner: deployer.address,
 *       },
 *       options: {
 *         maxFee: BigInt(1000000000000)
 *       }
 *     }
 *   );
 * };
 *
 * @example (deploy contract without constructorArgs)
 * const deployScript = async (): Promise<void> => {
 *   await deployContract(
 *     {
 *       contract: "YourContract",
 *       contractName: "YourContractExportName",
 *       options: {
 *         maxFee: BigInt(1000000000000)
 *       }
 *     }
 *   );
 * };
 *
 *
 * @returns {Promise<void>}
 */
// BTSUSD token deployed on Sepolia (minted/burned by CDPCore)
const BTSUSD_ADDRESS =
  "0x075690645b6e49811b87ec11bbffb3f25aa6b00cb8070a9459983135e39cb2cd";

const deployScript = async (): Promise<void> => {
  // Deploy BTSSavingsVault with BTSUSD as the underlying asset
  console.log(yellow("\n=== Deploying BTS Savings Vault (sBTSUSD) ==="));
  const { address: savingsVaultAddress } = await deployContract({
    contract: "BTSSavingsVault",
    contractName: "BTSSavingsVault",
    constructorArgs: {
      owner: deployer.address,
      asset: BTSUSD_ADDRESS,
      name: "Savings BTSUSD",
      symbol: "sBTSUSD",
      initial_vsr: VSR_4_PERCENT,
    },
  });

  console.log(green("\n=== Deployment Summary ==="));
  console.log(green(`BTSSavingsVault (sBTSUSD): ${savingsVaultAddress}`));
};

const main = async (): Promise<void> => {
  try {
    assertDeployerDefined();

    await Promise.all([assertRpcNetworkActive(), assertDeployerSignable()]);

    await deployScript();
    await executeDeployCalls();
    exportDeployments();

    console.log(green("All Setup Done!"));
  } catch (err) {
    if (err instanceof Error) {
      console.error(red(err.message));
    } else {
      console.error(err);
    }
    process.exit(1); //exit with error so that non subsequent scripts are run
  }
};

main();
