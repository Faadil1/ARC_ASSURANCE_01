#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const buildPath =
  process.argv[2] ??
  "build/out/AssuranceVault.build-manifest.json";
const outPath =
  process.argv[3] ??
  "build/out/AssuranceVault.deployment-manifest.json";

const build = JSON.parse(await readFile(buildPath, "utf8"));

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

function optionalAddress(value, label) {
  if (!value) return null;
  if (!ADDRESS_RE.test(value)) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return value;
}

function optionalUint(value, label) {
  if (!value) return null;
  if (!UINT_RE.test(value) || BigInt(value) <= 0n) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return String(value);
}

const authority = optionalAddress(
  process.env.AUTHORITY_ADDRESS,
  "authority_address"
);
const deployer = optionalAddress(
  process.env.DEPLOYER_ADDRESS,
  "deployer_address"
);
const spendCap = optionalUint(
  process.env.DEPLOYMENT_SPEND_CAP_WEI,
  "deployment_spend_cap_wei"
);
const deployedAddress = optionalAddress(
  process.env.DEPLOYED_ADDRESS,
  "deployed_address"
);
const deployTxHash =
  process.env.DEPLOY_TX_HASH?.trim() || null;
const deployBlock = optionalUint(
  process.env.DEPLOY_BLOCK,
  "deploy_block"
);

if (
  deployTxHash &&
  !/^0x[0-9a-fA-F]{64}$/.test(deployTxHash)
) {
  throw new Error("INVALID_DEPLOY_TX_HASH");
}

let status = "PREDEPLOY_TEMPLATE";
if (authority && spendCap) status = "PREDEPLOY_READY";
if (
  authority &&
  spendCap &&
  deployedAddress &&
  deployTxHash &&
  deployBlock
) {
  status = "DEPLOYED_UNVERIFIED";
}

const manifest = {
  version: "ARC_ASSURANCE_DEPLOYMENT_MANIFEST_V1",
  status,
  network: {
    name: "Arc Mainnet",
    chain_id: "5042",
    rpc_hint: "https://rpc.mainnet.arc.io",
  },
  source: {
    commit: build.source.commit,
    tree: build.source.tree,
    contract: build.contract,
  },
  reproducible_build: {
    manifest_version: build.version,
    runtime_template_hash:
      build.runtime.template_hash,
    expected_normalized_runtime_hash:
      build.runtime.normalized_hash,
    immutable_references:
      build.runtime.immutable_references,
    creation_bytecode_hash:
      build.creation_bytecode_hash,
    solc: build.toolchain.solc,
    arc_foundry_commit:
      build.toolchain.arc_foundry.commit,
    forge_std_commit:
      build.toolchain.forge_std_commit,
    openzeppelin_contracts_commit:
      build.toolchain.openzeppelin_contracts_commit,
  },
  constructor: {
    authority,
    expected_chain_id: "5042",
    usdc_erc20_interface:
      "0x3600000000000000000000000000000000000000",
    deployment_spend_cap_wei: spendCap,
    immutable_binding_verification:
      "REQUIRED_ON_CHAIN",
  },
  operator: {
    deployer,
  },
  verifier_runtime_config: {
    source_commit: build.source.commit,
    expected_normalized_code_hash:
      build.runtime.normalized_hash,
    immutable_references:
      build.runtime.immutable_references,
    constructor:
      authority && spendCap
        ? {
            authority,
            expected_chain_id: "5042",
            usdc_erc20_interface:
              "0x3600000000000000000000000000000000000000",
            deployment_spend_cap_wei: spendCap,
          }
        : null,
  },
  deployment: {
    contract_address: deployedAddress,
    transaction_hash: deployTxHash,
    block_number: deployBlock,
    chain_verification: "NOT_RUN",
  },
  sensitive_material_included: false,
  truth_boundary:
    "This manifest never proves deployment by itself. A chain-native verifier must fetch Arc bytecode/receipt and match the expected runtime code hash.",
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(JSON.stringify(manifest, null, 2));
