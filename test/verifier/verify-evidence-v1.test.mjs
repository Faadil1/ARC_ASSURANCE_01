import test from "node:test";
import assert from "node:assert/strict";
import {
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";
import {
  signProviderOutputV1,
} from "../../src/eip712/sign-provider-output-v1.mjs";
import {
  computeCanaryCommitmentV1,
  computeCanaryKeyV1,
} from "../../src/canary/commitment-v1.mjs";
import {
  keccakUtf8V1,
  verifyEvidencePacketV1,
} from "../../src/verifier/verify-evidence-v1.mjs";

const VERIFYING_CONTRACT =
  "0x1111111111111111111111111111111111111111";

const POLICY_ID =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const BATCH_ID =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const WORK_ID =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const SALT =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

const INPUT = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

const OUTPUT = [
  "ARC_ASSURANCE_INVOICE_V1",
  "invoice_number:A-1042",
  "subtotal_minor:18420",
  "tax_minor:2763",
  "total_minor:21183",
  "currency:CAD",
].join("\n");

const SCORER =
  "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";

async function buildPacket({
  actualOutput = OUTPUT,
  expectedOutputHash = null,
  directive = "PAY",
  passed = true,
} = {}) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const inputHash = keccakUtf8V1(INPUT);
  const outputHash = keccakUtf8V1(actualOutput);
  const scorerIdHash = keccakUtf8V1(SCORER);
  const expectedHash =
    expectedOutputHash ?? keccakUtf8V1(OUTPUT);

  const commitment = computeCanaryCommitmentV1({
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    policyId: POLICY_ID,
    batchId: BATCH_ID,
    workId: WORK_ID,
    inputHash,
    expectedOutputHash: expectedHash,
    scorerIdHash,
    salt: SALT,
  });

  const signed = await signProviderOutputV1({
    privateKey,
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    policyId: POLICY_ID,
    batchId: BATCH_ID,
    workId: WORK_ID,
    inputText: INPUT,
    canonicalOutput: actualOutput,
    nonce: 1,
    deadline: 2000000000,
  });

  const canaryKey = computeCanaryKeyV1({
    inputHash,
    expectedOutputHash: expectedHash,
    scorerIdHash,
  });

  return {
    version: "ARC_ASSURANCE_EVIDENCE_V1",
    network: {
      chain_id: "5042",
      verifying_contract: VERIFYING_CONTRACT,
    },
    work: {
      input_text: INPUT,
      canonical_output: actualOutput,
      scorer_id: SCORER,
    },
    provider: {
      expected_provider: account.address,
      nonce: "1",
      deadline: "2000000000",
      signature: signed.signature,
    },
    reveal: {
      policy_id: POLICY_ID,
      batch_id: BATCH_ID,
      work_id: WORK_ID,
      expected_output_hash: expectedHash,
      salt: SALT,
      commitment,
    },
    chain_events: [
      {
        name: "BatchCommitted",
        block_number: "100",
        log_index: "1",
        policy_id: POLICY_ID,
        batch_id: BATCH_ID,
        commitment,
      },
      {
        name: "ProviderOutputLocked",
        block_number: "101",
        log_index: "2",
        block_timestamp: "1900000000",
        policy_id: POLICY_ID,
        batch_id: BATCH_ID,
        work_id: WORK_ID,
        input_hash: inputHash,
        output_hash: outputHash,
        scorer_id_hash: scorerIdHash,
        provider_digest: signed.digest,
        provider: account.address,
      },
      {
        name: "CanaryRevealed",
        block_number: "102",
        log_index: "1",
        policy_id: POLICY_ID,
        batch_id: BATCH_ID,
        work_id: WORK_ID,
        input_hash: inputHash,
        expected_output_hash: expectedHash,
        scorer_id_hash: scorerIdHash,
        canary_key: canaryKey,
      },
      {
        name: "BatchResolved",
        block_number: "103",
        log_index: "1",
        policy_id: POLICY_ID,
        batch_id: BATCH_ID,
        work_id: WORK_ID,
        passed,
        directive,
      },
    ],
    financial_evidence: null,
  };
}

test("valid PASS core proof verifies but finance remains unproven", async () => {
  const packet = await buildPacket();
  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, true);
  assert.equal(result.verdict, "CORE_PROOF_VALID");
  assert.equal(result.deterministic_result, "PASS");
  assert.equal(result.settlement_directive, "PAY");
  assert.equal(
    result.financial_causality,
    "NOT_PROVEN"
  );
});

test("valid FAIL core proof verifies independently", async () => {
  const wrongOutput = OUTPUT.replace(
    "tax_minor:2763",
    "tax_minor:2764"
  ).replace(
    "total_minor:21183",
    "total_minor:21184"
  );

  const packet = await buildPacket({
    actualOutput: wrongOutput,
    directive: "WITHHOLD",
    passed: false,
  });

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, true);
  assert.equal(result.deterministic_result, "FAIL");
  assert.equal(
    result.settlement_directive,
    "WITHHOLD"
  );
});

test("wrong provider signature fails closed", async () => {
  const packet = await buildPacket();
  packet.provider.expected_provider =
    privateKeyToAccount(generatePrivateKey()).address;

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "INVALID_PROVIDER_SIGNATURE"
  );
});

test("rewritten expected answer breaks commitment", async () => {
  const packet = await buildPacket();
  packet.reveal.expected_output_hash =
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "CANARY_COMMITMENT_MISMATCH"
  );
});

test("event order is checked by block plus log index", async () => {
  const packet = await buildPacket();

  packet.chain_events[2].block_number = "101";
  packet.chain_events[2].log_index = "1";

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, false);
  assert.equal(result.error, "INVALID_EVENT_ORDER");
});

test("require-financial mode refuses to promote packet-only proof", async () => {
  const packet = await buildPacket();
  const result = await verifyEvidencePacketV1(
    packet,
    { requireFinancial: true }
  );

  assert.equal(result.ok, false);
  assert.equal(
    result.verdict,
    "CORE_PROOF_VALID_FINANCIAL_CAUSALITY_NOT_PROVEN"
  );
});


test("FAIL cannot be paired with PAY directive", async () => {
  const wrongOutput = OUTPUT.replace(
    "tax_minor:2763",
    "tax_minor:2764"
  ).replace(
    "total_minor:21183",
    "total_minor:21184"
  );

  const packet = await buildPacket({
    actualOutput: wrongOutput,
    directive: "PAY",
    passed: false,
  });

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "INVALID_SETTLEMENT_DIRECTIVE"
  );
});

test("BREAKER requires a breaker event between reveal and resolution", async () => {
  const wrongOutput = OUTPUT.replace(
    "tax_minor:2763",
    "tax_minor:2764"
  ).replace(
    "total_minor:21183",
    "total_minor:21184"
  );

  const packet = await buildPacket({
    actualOutput: wrongOutput,
    directive: "BREAKER",
    passed: false,
  });

  const result = await verifyEvidencePacketV1(packet);

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "BREAKER_DIRECTIVE_REQUIRES_CIRCUIT_BREAKER_EVENT"
  );

  packet.chain_events.splice(
    packet.chain_events.length - 1,
    0,
    {
      name: "CircuitBreakerTriggered",
      block_number: "102",
      log_index: "2",
    }
  );

  const withBreaker =
    await verifyEvidencePacketV1(packet);

  assert.equal(withBreaker.ok, true);
  assert.equal(
    withBreaker.settlement_directive,
    "BREAKER"
  );
});

test("packet cannot self-declare financial causality proven", async () => {
  const packet = await buildPacket();
  packet.financial_evidence = {
    status: "PROVEN",
    tx_hash: "0xnot-trusted-by-offline-verifier",
  };

  const result = await verifyEvidencePacketV1(
    packet,
    { requireFinancial: true }
  );

  assert.equal(result.ok, false);
  assert.equal(
    result.financial_causality,
    "NOT_PROVEN_PACKET_ONLY"
  );
});
