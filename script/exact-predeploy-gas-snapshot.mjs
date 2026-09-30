#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import process from "node:process";
import {
  concatHex,
  createPublicClient,
  defineChain,
  getAddress,
  getContractAddress,
  http,
  keccak256,
} from "viem";

export const ARC_MAINNET_CHAIN_ID = 5042;
export const DEFAULT_ARC_RPC = "https://rpc.mainnet.arc.io";
export const SNAPSHOT_SCHEMA =
  "ARC_ASSURANCE_PREDEPLOY_GAS_SNAPSHOT_V1";

function byteLength(hex) {
  if (typeof hex !== "string" || !/^0x[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("INVALID_HEX");
  }
  return (hex.length - 2) / 2;
}

export function reconstructInitCodeV1({
  manifest,
  artifact,
}) {
  if (
    manifest?.schema !==
    "ARC_ASSURANCE_DEPLOYMENT_MANIFEST_V1"
  ) {
    throw new Error("UNEXPECTED_DEPLOYMENT_MANIFEST_SCHEMA");
  }

  const creation = artifact?.bytecode?.object;
  if (!creation || creation === "0x") {
    throw new Error("MISSING_CREATION_BYTECODE");
  }

  const creationHash = keccak256(creation);
  const expectedCreationHash =
    manifest.expected_artifacts
      ?.creation_bytecode_keccak256;

  if (
    !expectedCreationHash ||
    creationHash.toLowerCase() !==
      expectedCreationHash.toLowerCase()
  ) {
    throw new Error(
      "CREATION_BYTECODE_HASH_MISMATCH"
    );
  }

  const encodedArgs =
    manifest.constructor?.encoded_args;
  if (!encodedArgs) {
    throw new Error("MISSING_CONSTRUCTOR_ARGS");
  }

  const initCode = concatHex([
    creation,
    encodedArgs,
  ]);
  const initCodeHash = keccak256(initCode);
  const expectedInitCodeHash =
    manifest.constructor?.init_code_keccak256;

  if (
    !expectedInitCodeHash ||
    initCodeHash.toLowerCase() !==
      expectedInitCodeHash.toLowerCase()
  ) {
    throw new Error("INIT_CODE_HASH_MISMATCH");
  }

  return {
    creation_bytecode_keccak256: creationHash,
    creation_bytecode_bytes: byteLength(creation),
    constructor_args_keccak256:
      keccak256(encodedArgs),
    constructor_args_bytes: byteLength(encodedArgs),
    init_code: initCode,
    init_code_keccak256: initCodeHash,
    init_code_bytes: byteLength(initCode),
  };
}

export function makeArcClient(
  rpcUrl = DEFAULT_ARC_RPC
) {
  const arc = defineChain({
    id: ARC_MAINNET_CHAIN_ID,
    name: "Arc Mainnet",
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });

  return createPublicClient({
    chain: arc,
    transport: http(rpcUrl),
  });
}

export async function buildPredeployGasSnapshotV1({
  client,
  manifest,
  artifact,
  deployerAddress,
}) {
  const deployer = getAddress(deployerAddress);
  const reconstructed =
    reconstructInitCodeV1({
      manifest,
      artifact,
    });

  const [
    chainId,
    blockNumber,
    gasPrice,
    pendingNonce,
    balance,
  ] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getGasPrice(),
    client.getTransactionCount({
      address: deployer,
      blockTag: "pending",
    }),
    client.getBalance({
      address: deployer,
      blockTag: "latest",
    }),
  ]);

  if (chainId !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      "CHAIN_ID_NOT_ARC_MAINNET:" + chainId
    );
  }

  const estimatedGas = await client.estimateGas({
    account: deployer,
    data: reconstructed.init_code,
    value: 0n,
  });

  if (estimatedGas <= 0n) {
    throw new Error(
      "DEPLOY_GAS_ESTIMATE_NOT_POSITIVE"
    );
  }

  const predictedContractAddress =
    getContractAddress({
      from: deployer,
      nonce: BigInt(pendingNonce),
      opcode: "CREATE",
    });

  const authority = getAddress(
    manifest.constructor.authority
  );

  return {
    schema: SNAPSHOT_SCHEMA,
    status:
      "READ_ONLY_TIME_BOUND_PREDEPLOY_SNAPSHOT",
    chain_id: chainId,
    block_number: blockNumber.toString(),
    gas_price_wei: gasPrice.toString(),
    deployer: {
      address: deployer,
      pending_nonce: pendingNonce.toString(),
      balance_wei: balance.toString(),
      matches_constructor_authority:
        deployer.toLowerCase() ===
        authority.toLowerCase(),
    },
    predicted_contract_address:
      predictedContractAddress,
    constructor_authority: authority,
    build_git_sha:
      manifest.build_git_sha ?? null,
    init_code: {
      keccak256:
        reconstructed.init_code_keccak256,
      bytes: reconstructed.init_code_bytes,
      creation_bytecode_keccak256:
        reconstructed
          .creation_bytecode_keccak256,
      constructor_args_keccak256:
        reconstructed
          .constructor_args_keccak256,
    },
    deployment_gas: {
      eth_estimateGas_units:
        estimatedGas.toString(),
      estimate_cost_at_observed_gas_price_wei:
        (estimatedGas * gasPrice).toString(),
    },
    safety: {
      private_key_consumed: false,
      transaction_signed: false,
      transaction_broadcast: false,
      funds_moved: false,
    },
    invalidation_rules: [
      "deployer pending nonce changes",
      "init-code hash changes",
      "deployment manifest changes",
      "creation bytecode changes",
      "constructor arguments change",
      "Arc chain id changes",
      "gas-price snapshot becomes stale for wallet budgeting",
    ],
    truth_boundary:
      "eth_estimateGas is a read-only, time-bound simulation. It is not a receipt, fee guarantee, deployment authorization, or proof that the predicted address was actually deployed.",
  };
}

async function main() {
  const manifestPath =
    process.argv[2] ??
    "build/deployment-manifest.pending.json";
  const artifactPath =
    process.argv[3] ??
    "out/AssuranceVault.sol/AssuranceVault.json";
  const outputPath =
    process.argv[4] ??
    "build/predeploy-gas-snapshot.json";

  const deployer =
    process.env.DEPLOYER_ADDRESS?.trim();

  if (!deployer) {
    console.error(
      "Missing DEPLOYER_ADDRESS (public address only)."
    );
    process.exitCode = 2;
    return;
  }

  const rpc =
    process.env.ARC_MAINNET_RPC_URL?.trim() ||
    DEFAULT_ARC_RPC;

  try {
    const [manifest, artifact] =
      await Promise.all([
        readFile(manifestPath, "utf8").then(JSON.parse),
        readFile(artifactPath, "utf8").then(JSON.parse),
      ]);

    const snapshot =
      await buildPredeployGasSnapshotV1({
        client: makeArcClient(rpc),
        manifest,
        artifact,
        deployerAddress: deployer,
      });

    await mkdir("build", { recursive: true });
    await writeFile(
      outputPath,
      JSON.stringify(snapshot, null, 2) + "\n"
    );

    console.log(
      JSON.stringify(snapshot, null, 2)
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          schema: SNAPSHOT_SCHEMA,
          status:
            "BLOCKED_PREDEPLOY_GAS_SNAPSHOT_FAILED",
          error:
            error?.message ?? String(error),
          safety: {
            private_key_consumed: false,
            transaction_signed: false,
            transaction_broadcast: false,
            funds_moved: false,
          },
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    new URL("file://" + process.argv[1]).href
) {
  await main();
}
