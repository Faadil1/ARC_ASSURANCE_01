#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { encodeAbiParameters, getAddress, keccak256, concatHex } from "viem";

const buildPath = process.argv[2] ?? "build/reproducible-build-manifest.json";
const artifactPath = "out/AssuranceVault.sol/AssuranceVault.json";
const outPath = process.argv[3] ?? "build/deployment-manifest.pending.json";

const required = [
  "DEPLOY_AUTHORITY",
  "DEPLOYMENT_SPEND_CAP_WEI",
  "POLICY_ID",
  "POLICY_FUNDER",
  "POLICY_PROVIDER",
  "POLICY_PAYOUT_RECIPIENT",
  "POLICY_SCORER_ID_HASH",
  "POLICY_MAX_FAILURES",
  "POLICY_MAX_SPEND_CAP_WEI",
  "POLICY_UNIT_PAYOUT_WEI",
  "POLICY_EXPIRY"
];
for (const key of required) {
  if (!process.env[key]) throw new Error("MISSING_ENV_" + key);
}

const build = JSON.parse(await readFile(buildPath, "utf8"));
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const creation = artifact.bytecode.object;

const authority = getAddress(process.env.DEPLOY_AUTHORITY);
const constructorArgs = encodeAbiParameters(
  [
    { type: "address" },
    { type: "uint256" },
    { type: "address" },
    { type: "uint256" }
  ],
  [
    authority,
    5042n,
    "0x3600000000000000000000000000000000000000",
    BigInt(process.env.DEPLOYMENT_SPEND_CAP_WEI)
  ]
);

const initCode = concatHex([creation, constructorArgs]);

const manifest = {
  schema: "ARC_ASSURANCE_DEPLOYMENT_MANIFEST_V1",
  status: "PREDEPLOY_NOT_LIVE",
  build_git_sha: build.git_sha,
  chain_id: 5042,
  native_asset: "USDC",
  constructor: {
    authority,
    expected_chain_id: "5042",
    usdc_erc20_interface: "0x3600000000000000000000000000000000000000",
    deployment_spend_cap_wei: process.env.DEPLOYMENT_SPEND_CAP_WEI,
    encoded_args: constructorArgs,
    init_code_keccak256: keccak256(initCode)
  },
  expected_artifacts: {
    creation_bytecode_keccak256:
      build.artifacts.assurance_vault_creation_bytecode_keccak256,
    runtime_code_keccak256:
      process.env.EXPECTED_RUNTIME_CODE_HASH ?? null
  },
  policy_plan: {
    policy_id: process.env.POLICY_ID,
    funder: getAddress(process.env.POLICY_FUNDER),
    provider: getAddress(process.env.POLICY_PROVIDER),
    payout_recipient: getAddress(process.env.POLICY_PAYOUT_RECIPIENT),
    scorer_id_hash: process.env.POLICY_SCORER_ID_HASH,
    max_failures: process.env.POLICY_MAX_FAILURES,
    max_spend_cap_wei: process.env.POLICY_MAX_SPEND_CAP_WEI,
    unit_payout_wei: process.env.POLICY_UNIT_PAYOUT_WEI,
    expiry: process.env.POLICY_EXPIRY
  },
  live_receipts: {
    deploy_tx_hash: null,
    contract_address: null,
    observed_runtime_code_keccak256: null
  },
  promotion_blockers: [
    "expected runtime code hash must be produced from exact constructor args",
    "deploy transaction and address absent",
    "Arc mainnet receipts absent"
  ]
};

await mkdir("build", { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
