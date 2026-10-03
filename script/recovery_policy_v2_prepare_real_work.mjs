#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  createPublicClient,
  encodeAbiParameters,
  getAddress,
  http,
  keccak256,
  parseAbiParameters,
  stringToHex,
} from "viem";

import { createProviderServer } from "../src/provider/http-server.mjs";
import { canonicalizeInvoiceV1, SCORER_ID } from "../src/scorer/invoice-v1.mjs";

const CHAIN_ID = 5042;
const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
const EXPECTED_FUNDER = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";
const EXPECTED_PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
const POLICY_ID =
  "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
const BATCH_ID =
  "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
const COMMITMENT =
  "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";
const ZERO32 = "0x" + "00".repeat(32);
const TYPE_STRING =
  "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";

const ABI = [
  {
    type: "function",
    name: "getPolicy",
    stateMutability: "view",
    inputs: [{ name: "policyId", type: "bytes32" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "funder", type: "address" },
        { name: "provider", type: "address" },
        { name: "payoutRecipient", type: "address" },
        { name: "scorerIdHash", type: "bytes32" },
        { name: "maxFailures", type: "uint32" },
        { name: "failureCount", type: "uint32" },
        { name: "maxSpendCap", type: "uint256" },
        { name: "unitPayout", type: "uint256" },
        { name: "expiry", type: "uint64" },
        { name: "createdAt", type: "uint64" },
        { name: "fundedAt", type: "uint64" },
        { name: "totalFunded", type: "uint256" },
        { name: "totalPaidOut", type: "uint256" },
        { name: "totalRefunded", type: "uint256" },
        { name: "paused", type: "bool" },
        { name: "closed", type: "bool" },
        { name: "refundIssued", type: "bool" },
        { name: "exists", type: "bool" },
        { name: "activeBatchId", type: "bytes32" },
      ],
    }],
  },
  {
    type: "function",
    name: "getBatch",
    stateMutability: "view",
    inputs: [
      { name: "policyId", type: "bytes32" },
      { name: "batchId", type: "bytes32" },
    ],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "commitment", type: "bytes32" },
        { name: "workId", type: "bytes32" },
        { name: "inputHash", type: "bytes32" },
        { name: "outputHash", type: "bytes32" },
        { name: "expectedOutputHash", type: "bytes32" },
        { name: "providerDigest", type: "bytes32" },
        { name: "state", type: "uint8" },
        { name: "directive", type: "uint8" },
        { name: "committedAtBlock", type: "uint256" },
        { name: "outputLockedAtBlock", type: "uint256" },
        { name: "revealedAtBlock", type: "uint256" },
        { name: "resolvedAtBlock", type: "uint256" },
      ],
    }],
  },
  {
    type: "function",
    name: "workIdUsed",
    stateMutability: "view",
    inputs: [{ name: "workId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "remainingFor",
    stateMutability: "view",
    inputs: [{ name: "policyId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

function stop(message) {
  throw new Error(message);
}

function eqHex(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function readJsonObjectFromText(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) stop("SECRET_PACKET_JSON_NOT_FOUND");
  try {
    return JSON.parse(raw.slice(first, last + 1));
  } catch {
    stop("SECRET_PACKET_JSON_INVALID");
  }
}

function gitRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function isInside(parent, candidate) {
  const root = path.resolve(parent).toLowerCase();
  const target = path.resolve(candidate).toLowerCase();
  return target === root || target.startsWith(root + path.sep);
}

function assertSensitiveFilesOutsideRepo(secretPath, outputPath) {
  const root = gitRoot();
  if (!root) return;
  if (isInside(root, secretPath)) stop("SECRET_PACKET_MUST_BE_OUTSIDE_GIT_REPO");
  if (isInside(root, outputPath)) stop("G3_LOCAL_ARTIFACT_MUST_BE_OUTSIDE_GIT_REPO");
}

function requireString(packet, key) {
  if (typeof packet[key] !== "string" || packet[key].length === 0) {
    stop("SECRET_PACKET_MISSING_" + key.toUpperCase());
  }
  return packet[key];
}

function validateSecretPacket(packet) {
  if (Number(packet.chain_id) !== CHAIN_ID) stop("SECRET_PACKET_WRONG_CHAIN");
  if (!eqHex(packet.verifying_contract, CONTRACT)) stop("SECRET_PACKET_WRONG_CONTRACT");
  if (!eqHex(packet.policy_id, POLICY_ID)) stop("SECRET_PACKET_WRONG_POLICY");
  if (!eqHex(packet.batch_id, BATCH_ID)) stop("SECRET_PACKET_WRONG_BATCH");
  if (!eqHex(packet.commitment, COMMITMENT)) stop("SECRET_PACKET_WRONG_COMMITMENT");

  const workId = requireString(packet, "work_id");
  const inputText = requireString(packet, "input_text");
  const expectedCanonicalOutput = requireString(packet, "expected_canonical_output");
  const inputHash = requireString(packet, "input_hash");
  const expectedOutputHash = requireString(packet, "expected_output_hash");
  const scorerId = requireString(packet, "scorer_id");
  const scorerIdHash = requireString(packet, "scorer_id_hash");
  const salt = requireString(packet, "salt");
  const canaryKey = requireString(packet, "canary_key");

  if (scorerId !== SCORER_ID) stop("SECRET_PACKET_SCORER_ID_MISMATCH");

  const recomputedInputHash = keccak256(stringToHex(inputText));
  const recomputedExpectedOutputHash = keccak256(stringToHex(expectedCanonicalOutput));
  const recomputedScorerIdHash = keccak256(stringToHex(scorerId));

  if (!eqHex(recomputedInputHash, inputHash)) stop("SECRET_PACKET_INPUT_HASH_MISMATCH");
  if (!eqHex(recomputedExpectedOutputHash, expectedOutputHash)) {
    stop("SECRET_PACKET_EXPECTED_OUTPUT_HASH_MISMATCH");
  }
  if (!eqHex(recomputedScorerIdHash, scorerIdHash)) {
    stop("SECRET_PACKET_SCORER_HASH_MISMATCH");
  }

  const typeHash = keccak256(stringToHex(TYPE_STRING));
  const encoded = encodeAbiParameters(
    parseAbiParameters(
      "bytes32,uint256,address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32"
    ),
    [
      typeHash,
      BigInt(CHAIN_ID),
      getAddress(CONTRACT),
      POLICY_ID,
      BATCH_ID,
      workId,
      inputHash,
      expectedOutputHash,
      scorerIdHash,
      salt,
    ]
  );
  const recomputedCommitment = keccak256(encoded);
  if (!eqHex(recomputedCommitment, COMMITMENT)) {
    stop("SECRET_PACKET_COMMITMENT_RECONSTRUCTION_FAILED");
  }

  const recomputedCanaryKey = keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32,bytes32,bytes32"),
      [inputHash, expectedOutputHash, scorerIdHash]
    )
  );
  if (!eqHex(recomputedCanaryKey, canaryKey)) {
    stop("SECRET_PACKET_CANARY_KEY_MISMATCH");
  }

  return {
    workId,
    inputText,
    inputHash,
    expectedOutputHash,
    scorerId,
    scorerIdHash,
  };
}

async function runProviderCompute(inputText) {
  const server = createProviderServer({
    allowDemoFaults: false,
    signing: null,
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  if (!port) {
    await new Promise((resolve) => server.close(resolve));
    stop("PROVIDER_LOCAL_PORT_UNAVAILABLE");
  }

  try {
    const healthResponse = await fetch("http://127.0.0.1:" + port + "/health");
    const health = await healthResponse.json();
    if (!healthResponse.ok || health.status !== "ok") stop("PROVIDER_HEALTH_FAILED");
    if (health.signature_status !== "DISABLED") stop("PROVIDER_PREP_MUST_NOT_SIGN");

    const requestBody = { input_text: inputText };
    const response = await fetch("http://127.0.0.1:" + port + "/v1/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const body = await response.json();

    if (!response.ok) {
      stop("PROVIDER_COMPUTE_FAILED_" + String(body?.error ?? response.status));
    }
    if (body?.evidence?.execution !== "REAL_COMPUTE") {
      stop("PROVIDER_EXECUTION_NOT_REAL_COMPUTE");
    }
    if (body?.evidence?.fault_injected !== false || body?.evidence?.fault_mode !== "NONE") {
      stop("PROVIDER_UNEXPECTED_FAULT_MODE");
    }
    if (body?.evidence?.signature_status !== "DISABLED" || body?.signature !== null) {
      stop("PROVIDER_PREP_CREATED_UNEXPECTED_SIGNATURE");
    }
    if (typeof body?.canonical_output !== "string") {
      stop("PROVIDER_CANONICAL_OUTPUT_MISSING");
    }

    const recanonicalized = canonicalizeInvoiceV1(body.result);
    if (recanonicalized !== body.canonical_output) {
      stop("PROVIDER_CANONICALIZATION_MISMATCH");
    }

    return {
      requestBody,
      response: body,
      outputHash: keccak256(stringToHex(body.canonical_output)),
    };
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

async function main() {
  const secretArg = process.argv[2];
  const outputArg = process.argv[3];

  if (!secretArg || !outputArg) {
    console.error(
      "Usage: node script/recovery_policy_v2_prepare_real_work.mjs <SECRET_REVEAL_PACKET.txt> <G3_LOCAL_COMPUTE.json>"
    );
    process.exitCode = 2;
    return;
  }

  const secretPath = path.resolve(secretArg);
  const outputPath = path.resolve(outputArg);

  if (!fs.existsSync(secretPath)) stop("SECRET_PACKET_FILE_NOT_FOUND");
  if (secretPath === outputPath) stop("OUTPUT_MUST_DIFFER_FROM_SECRET_PACKET");

  assertSensitiveFilesOutsideRepo(secretPath, outputPath);

  const packet = readJsonObjectFromText(secretPath);
  const secret = validateSecretPacket(packet);

  const rpcUrl = process.env.ARC_RPC_URL?.trim() || "https://rpc.mainnet.arc.io";
  const client = createPublicClient({ transport: http(rpcUrl) });

  const chainId = await client.getChainId();
  if (chainId !== CHAIN_ID) stop("ARC_RPC_WRONG_CHAIN_" + chainId);

  const [block, policy, batch, workIdUsed, remaining, vaultBalance] =
    await Promise.all([
      client.getBlock({ blockTag: "latest" }),
      client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: "getPolicy",
        args: [POLICY_ID],
      }),
      client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: "getBatch",
        args: [POLICY_ID, BATCH_ID],
      }),
      client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: "workIdUsed",
        args: [secret.workId],
      }),
      client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: "remainingFor",
        args: [POLICY_ID],
      }),
      client.getBalance({ address: CONTRACT }),
    ]);

  if (!policy.exists) stop("ONCHAIN_POLICY_MISSING");
  if (!eqHex(policy.funder, EXPECTED_FUNDER)) stop("ONCHAIN_FUNDER_CHANGED");
  if (!eqHex(policy.provider, EXPECTED_PROVIDER)) stop("ONCHAIN_PROVIDER_CHANGED");
  if (!eqHex(policy.scorerIdHash, secret.scorerIdHash)) stop("ONCHAIN_SCORER_CHANGED");
  if (!eqHex(policy.activeBatchId, BATCH_ID)) stop("ONCHAIN_ACTIVE_BATCH_CHANGED");
  if (policy.paused || policy.closed || policy.refundIssued) stop("ONCHAIN_POLICY_UNUSABLE");
  if (block.timestamp > policy.expiry) stop("ONCHAIN_POLICY_EXPIRED");

  if (!eqHex(batch.commitment, COMMITMENT)) stop("ONCHAIN_COMMITMENT_CHANGED");
  if (Number(batch.state) !== 1) stop("ONCHAIN_BATCH_NOT_COMMITTED");
  if (!eqHex(batch.workId, ZERO32)) stop("ONCHAIN_WORK_ALREADY_LOCKED");
  if (!eqHex(batch.inputHash, ZERO32)) stop("ONCHAIN_INPUT_ALREADY_LOCKED");
  if (!eqHex(batch.outputHash, ZERO32)) stop("ONCHAIN_OUTPUT_ALREADY_LOCKED");
  if (!eqHex(batch.providerDigest, ZERO32)) stop("ONCHAIN_PROVIDER_DIGEST_ALREADY_SET");
  if (workIdUsed) stop("WORK_ID_ALREADY_USED");
  if (remaining < policy.unitPayout) stop("INSUFFICIENT_POLICY_LIABILITY");
  if (vaultBalance < policy.unitPayout) stop("INSUFFICIENT_VAULT_BALANCE");

  const provider = await runProviderCompute(secret.inputText);
  const providerOutputMatchesHiddenExpected = eqHex(
    provider.outputHash,
    secret.expectedOutputHash
  );

  if (!providerOutputMatchesHiddenExpected) {
    stop("PROVIDER_OUTPUT_DOES_NOT_MATCH_HIDDEN_EXPECTED_OUTPUT");
  }

  const artifact = {
    schema: "ARC_ASSURANCE_RECOVERY_V2_G3_LOCAL_COMPUTE_V1",
    classification: "SENSITIVE_LOCAL_OFF_REPO",
    created_at: new Date().toISOString(),
    source: {
      git_head: gitHead(),
      script: "script/recovery_policy_v2_prepare_real_work.mjs",
    },
    chain: {
      chain_id: chainId,
      rpc_read_only: true,
      observed_block: block.number.toString(),
      observed_timestamp: block.timestamp.toString(),
      contract: CONTRACT,
    },
    public_binding: {
      policy_id: POLICY_ID,
      batch_id: BATCH_ID,
      commitment: COMMITMENT,
      provider: getAddress(policy.provider),
      scorer_id: secret.scorerId,
    },
    sensitive_binding: {
      work_id: secret.workId,
      input_text: secret.inputText,
      input_hash: secret.inputHash,
      output_hash: provider.outputHash,
      scorer_id_hash: secret.scorerIdHash,
    },
    provider_execution: {
      transport: "HTTP_LOOPBACK",
      endpoint: "/v1/extract",
      request_body: provider.requestBody,
      response: {
        request_id: provider.response.request_id,
        provider_id: provider.response.provider_id,
        schema_version: provider.response.schema_version,
        result: provider.response.result,
        canonical_output: provider.response.canonical_output,
        evidence: provider.response.evidence,
        timing: provider.response.timing,
      },
    },
    checks: {
      secret_commitment_reconstructed: true,
      onchain_batch_state_committed: true,
      active_batch_exact_match: true,
      work_id_unused: true,
      provider_execution_real_compute: true,
      fault_injected: false,
      provider_output_matches_hidden_expected: true,
      signature_created: false,
      transaction_sent: false,
    },
    next_step_boundary: {
      provider_signature_required: true,
      lockProviderOutput_authorized: false,
      revealCanary_authorized: false,
      resolveBatch_authorized: false,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + os.EOL, {
    encoding: "utf8",
    mode: 0o600,
  });

  console.log("======================================");
  console.log("RECOVERY V2 G3 REAL WORK — READ-ONLY PREP");
  console.log("RESULT: PASS ✅");
  console.log("chain_id:", chainId);
  console.log("observed_block:", block.number.toString());
  console.log("policy_id:", POLICY_ID);
  console.log("batch_id:", BATCH_ID);
  console.log("commitment:", COMMITMENT);
  console.log("onchain_batch_state:", "1 (Committed)");
  console.log("provider_bound:", getAddress(policy.provider));
  console.log("provider_transport:", "HTTP_LOOPBACK");
  console.log("provider_execution:", "REAL_COMPUTE");
  console.log("provider_fault_mode:", "NONE");
  console.log("work_id_unused:", true);
  console.log("provider_output_matches_hidden_expected:", true);
  console.log("signature_created:", false);
  console.log("transaction_sent:", false);
  console.log("local_sensitive_artifact:", outputPath);
  console.log("======================================");
  console.log(
    "STOP. Do not share the local artifact. No provider signature and no lockProviderOutput transaction are authorized by this step."
  );
}

main().catch((error) => {
  console.error(
    "RECOVERY V2 G3 READ-ONLY PREP: STOP / FAIL ❌",
    error?.message || String(error)
  );
  process.exitCode = 1;
});
