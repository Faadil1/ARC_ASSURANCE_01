import test from "node:test";
import assert from "node:assert/strict";
import {
  CANARY_COMMITMENT_TYPE_STRING,
  computeCanaryCommitmentV1,
  computeCanaryKeyV1,
} from "../../src/canary/commitment-v1.mjs";

const A =
  "0x1111111111111111111111111111111111111111";
const H1 =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const H2 =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const H3 =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const H4 =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const H5 =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const H6 =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const H7 =
  "0x9999999999999999999999999999999999999999999999999999999999999999";

test("commitment type string is frozen", () => {
  assert.equal(
    CANARY_COMMITMENT_TYPE_STRING,
    "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)"
  );
});

test("commitment is a deterministic bytes32", () => {
  const args = {
    chainId: 5042,
    verifyingContract: A,
    policyId: H1,
    batchId: H2,
    workId: H3,
    inputHash: H4,
    expectedOutputHash: H5,
    scorerIdHash: H6,
    salt: H7,
  };

  const first = computeCanaryCommitmentV1(args);
  const second = computeCanaryCommitmentV1(args);

  assert.equal(first, second);
  assert.match(first, /^0x[0-9a-f]{64}$/i);
});

test("changing expected output changes commitment", () => {
  const base = {
    chainId: 5042,
    verifyingContract: A,
    policyId: H1,
    batchId: H2,
    workId: H3,
    inputHash: H4,
    expectedOutputHash: H5,
    scorerIdHash: H6,
    salt: H7,
  };

  const changed = {
    ...base,
    expectedOutputHash:
      "0x8888888888888888888888888888888888888888888888888888888888888888",
  };

  assert.notEqual(
    computeCanaryCommitmentV1(base),
    computeCanaryCommitmentV1(changed)
  );
});

test("canary key ignores salt/work and fingerprints reusable ground truth", () => {
  const key = computeCanaryKeyV1({
    inputHash: H4,
    expectedOutputHash: H5,
    scorerIdHash: H6,
  });

  assert.match(key, /^0x[0-9a-f]{64}$/i);
});

test("zero bytes32 inputs are rejected", () => {
  assert.throws(
    () =>
      computeCanaryCommitmentV1({
        chainId: 5042,
        verifyingContract: A,
        policyId: "0x" + "0".repeat(64),
        batchId: H2,
        workId: H3,
        inputHash: H4,
        expectedOutputHash: H5,
        scorerIdHash: H6,
        salt: H7,
      }),
    /INVALID_POLICY_ID/
  );
});
