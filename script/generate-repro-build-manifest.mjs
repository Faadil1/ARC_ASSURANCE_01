#!/usr/bin/env node
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { keccak256 } from "viem";

const artifactPath = "out/AssuranceVault.sol/AssuranceVault.json";
const outPath = process.argv[2] ?? "build/reproducible-build-manifest.json";

function cmd(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeHex(hex) {
  if (typeof hex !== "string" || !hex.startsWith("0x")) {
    throw new Error("INVALID_BYTECODE_HEX");
  }
  return hex;
}

async function hashFile(path) {
  const content = await readFile(path);
  return "sha256:" + sha256(content);
}

const gitSha = process.env.GIT_COMMIT ?? cmd("git", ["rev-parse", "HEAD"]);
if (!gitSha) throw new Error("GIT_SHA_UNAVAILABLE");

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const creation = normalizeHex(artifact.bytecode.object);
const runtimeTemplate = normalizeHex(artifact.deployedBytecode.object);

let lockfile = null;
try {
  await stat("package-lock.json");
  lockfile = await hashFile("package-lock.json");
} catch {}

const manifest = {
  schema: "ARC_ASSURANCE_REPRO_BUILD_V1",
  status: lockfile ? "CANDIDATE_REPRODUCIBLE" : "BLOCKED_NODE_TRANSITIVE_LOCK",
  git_sha: gitSha,
  node: process.version,
  forge_version: cmd("forge", ["--version"]),
  solc_version: "0.8.24",
  settings: {
    optimizer: true,
    optimizer_runs: 200
  },
  dependencies: {
    viem: "2.56.9",
    forge_std: "v1.16.1",
    openzeppelin_contracts: "v5.6.1",
    package_lock_sha256: lockfile
  },
  artifacts: {
    assurance_vault_creation_bytecode_keccak256: keccak256(creation),
    assurance_vault_runtime_template_keccak256: keccak256(runtimeTemplate),
    assurance_vault_creation_bytecode_bytes: (creation.length - 2) / 2,
    assurance_vault_runtime_template_bytes: (runtimeTemplate.length - 2) / 2
  },
  source_fingerprints: {
    assurance_vault_sol: await hashFile("src/assurance/AssuranceVault.sol"),
    provider_output_eip712_sol: await hashFile("src/eip712/ProviderOutputEIP712.sol"),
    foundry_toml: await hashFile("foundry.toml"),
    remappings_txt: await hashFile("remappings.txt"),
    package_json: await hashFile("package.json"),
    dependency_pins_json: await hashFile("build/DEPENDENCY-PINS.json")
  },
  truth_boundary: {
    creation_bytecode_reproducible_from_commit: Boolean(lockfile),
    deployed_runtime_hash_proven: false,
    reason: "AssuranceVault contains constructor immutables; final runtime hash depends on exact constructor arguments and must be fingerprinted in a deterministic local deployment before mainnet."
  }
};

await mkdir("build", { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
