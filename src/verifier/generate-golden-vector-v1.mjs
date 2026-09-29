#!/usr/bin/env node
import { keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  signProviderOutputV1,
} from "../eip712/sign-provider-output-v1.mjs";
import {
  computeCanaryCommitmentV1,
  computeCanaryKeyV1,
} from "../canary/commitment-v1.mjs";
import {
  EVIDENCE_VERSION,
  keccakUtf8V1,
} from "./verify-evidence-v1.mjs";

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

const inputText = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

const canonicalOutput = [
  "ARC_ASSURANCE_INVOICE_V1",
  "invoice_number:A-1042",
  "subtotal_minor:18420",
  "tax_minor:2763",
  "total_minor:21183",
  "currency:CAD",
].join("\n");

const scorerId =
  "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";

const privateKey = keccak256(
  stringToHex("ARC_ASSURANCE_GOLDEN_VECTOR_V1_TEST_KEY_ONLY")
);
const account = privateKeyToAccount(privateKey);

const inputHash = keccakUtf8V1(inputText);
const outputHash = keccakUtf8V1(canonicalOutput);
const scorerIdHash = keccakUtf8V1(scorerId);
const expectedOutputHash = outputHash;

const commitment = computeCanaryCommitmentV1({
  chainId: 5042,
  verifyingContract: VERIFYING_CONTRACT,
  policyId: POLICY_ID,
  batchId: BATCH_ID,
  workId: WORK_ID,
  inputHash,
  expectedOutputHash,
  scorerIdHash,
  salt: SALT,
});

const canaryKey = computeCanaryKeyV1({
  inputHash,
  expectedOutputHash,
  scorerIdHash,
});

const signed = await signProviderOutputV1({
  privateKey,
  chainId: 5042,
  verifyingContract: VERIFYING_CONTRACT,
  policyId: POLICY_ID,
  batchId: BATCH_ID,
  workId: WORK_ID,
  inputText,
  canonicalOutput,
  nonce: 1,
  deadline: 2000000000,
});

const vector = {
  vector_version: "ARC_ASSURANCE_GOLDEN_VECTOR_V1",
  evidence_class: "SIMULATED",
  warning:
    "Local cross-language vector only. Synthetic block/log positions are not Arc mainnet evidence.",
  provider_private_key_included: false,
  deterministic_test_key_derivation: "keccak256(ARC_ASSURANCE_GOLDEN_VECTOR_V1_TEST_KEY_ONLY)",
  evidence_packet: {
    version: EVIDENCE_VERSION,
    network: {
      chain_id: "5042",
      verifying_contract: VERIFYING_CONTRACT,
    },
    work: {
      input_text: inputText,
      canonical_output: canonicalOutput,
      scorer_id: scorerId,
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
      expected_output_hash: expectedOutputHash,
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
        log_index: "1",
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
        expected_output_hash: expectedOutputHash,
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
        passed: true,
        directive: "PAY",
      },
    ],
    financial_evidence: null,
  },
  public_crypto_vector: {
    provider: account.address,
    input_hash: inputHash,
    output_hash: outputHash,
    scorer_id_hash: scorerIdHash,
    commitment,
    canary_key: canaryKey,
    eip712_digest: signed.digest,
    signature: signed.signature,
    typed_data: signed.typedDataJson,
  },
};

console.log(JSON.stringify(vector, null, 2));
