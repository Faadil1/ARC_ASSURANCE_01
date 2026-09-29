#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const file =
  process.argv[2] ??
  "build/out/AssuranceVault.deployment-manifest.json";

const manifest = JSON.parse(await readFile(file, "utf8"));

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

const forbiddenKeyPattern =
  /(private.?key|mnemonic|seed.?phrase|secret|password)/i;

function scan(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((v, i) => scan(v, path + "[" + i + "]"));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error("FORBIDDEN_SECRET_FIELD:" + path + "." + key);
    }
    scan(child, path + "." + key);
  }
}

scan(manifest);

if (
  manifest.version !==
  "ARC_ASSURANCE_DEPLOYMENT_MANIFEST_V1"
) {
  throw new Error("INVALID_MANIFEST_VERSION");
}

if (String(manifest.network?.chain_id) !== "5042") {
  throw new Error("CHAIN_ID_NOT_ARC_MAINNET");
}

if (!SHA_RE.test(manifest.source?.commit ?? "")) {
  throw new Error("INVALID_SOURCE_COMMIT");
}

if (
  !HASH_RE.test(
    manifest.reproducible_build?.runtime_code_hash ?? ""
  ) ||
  !HASH_RE.test(
    manifest.reproducible_build?.creation_bytecode_hash ?? ""
  )
) {
  throw new Error("INVALID_BYTECODE_HASH");
}

if (
  String(manifest.reproducible_build?.solc) !==
  "0.8.24"
) {
  throw new Error("UNEXPECTED_SOLC");
}

if (
  manifest.constructor?.expected_chain_id !== "5042" ||
  String(
    manifest.constructor?.usdc_erc20_interface ?? ""
  ).toLowerCase() !==
    "0x3600000000000000000000000000000000000000"
) {
  throw new Error("INVALID_CONSTRUCTOR_CHAIN_OR_USDC");
}

const status = manifest.status;

if (status === "PREDEPLOY_READY") {
  if (
    !ADDRESS_RE.test(manifest.constructor?.authority ?? "") ||
    BigInt(
      manifest.constructor?.deployment_spend_cap_wei ?? "0"
    ) <= 0n
  ) {
    throw new Error("PREDEPLOY_CONFIG_INCOMPLETE");
  }
}

if (status === "DEPLOYED_UNVERIFIED") {
  if (
    !ADDRESS_RE.test(
      manifest.deployment?.contract_address ?? ""
    ) ||
    !HASH_RE.test(
      manifest.deployment?.transaction_hash ?? ""
    ) ||
    BigInt(
      manifest.deployment?.block_number ?? "0"
    ) <= 0n
  ) {
    throw new Error("DEPLOYMENT_FIELDS_INCOMPLETE");
  }

  if (
    manifest.deployment?.chain_verification !== "NOT_RUN"
  ) {
    throw new Error(
      "MANIFEST_CANNOT_SELF_PROMOTE_CHAIN_VERIFICATION"
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verdict: "DEPLOYMENT_MANIFEST_STRUCTURALLY_VALID",
      status,
      chain_verification_required:
        status === "DEPLOYED_UNVERIFIED",
      secrets_included: false,
    },
    null,
    2
  )
);
