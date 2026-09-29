import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProviderOutputDomain,
  buildProviderOutputMessage,
  buildProviderOutputTypedData,
  PROVIDER_OUTPUT_TYPE_STRING,
  typedDataToJsonSafe,
} from "../../src/eip712/provider-output-v1.mjs";

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

test("type string is frozen byte-for-byte", () => {
  assert.equal(
    PROVIDER_OUTPUT_TYPE_STRING,
    "ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)"
  );
});

test("Arc domain preserves chain and verifying contract", () => {
  assert.deepEqual(
    buildProviderOutputDomain({
      chainId: 5042,
      verifyingContract: A,
    }),
    {
      name: "ARC_ASSURANCE",
      version: "1",
      chainId: 5042n,
      verifyingContract: A,
    }
  );
});

test("message normalizes uint values to bigint", () => {
  const message = buildProviderOutputMessage({
    provider: A,
    policyId: H1,
    batchId: H2,
    workId: H3,
    inputHash: H4,
    outputHash: H5,
    scorerIdHash: H6,
    nonce: "7",
    deadline: "2000000000",
  });

  assert.equal(message.nonce, 7n);
  assert.equal(message.deadline, 2000000000n);
});

test("zero semantic hashes are rejected", () => {
  assert.throws(
    () =>
      buildProviderOutputMessage({
        provider: A,
        policyId: "0x" + "0".repeat(64),
        batchId: H2,
        workId: H3,
        inputHash: H4,
        outputHash: H5,
        scorerIdHash: H6,
        nonce: 1,
        deadline: 2,
      }),
    /ZERO_POLICY_ID/
  );
});

test("zero deadline is rejected", () => {
  assert.throws(
    () =>
      buildProviderOutputMessage({
        provider: A,
        policyId: H1,
        batchId: H2,
        workId: H3,
        inputHash: H4,
        outputHash: H5,
        scorerIdHash: H6,
        nonce: 1,
        deadline: 0,
      }),
    /INVALID_DEADLINE_UINT/
  );
});

test("typed data serializes bigint fields safely for evidence", () => {
  const typedData = buildProviderOutputTypedData({
    chainId: 5042,
    verifyingContract: A,
    message: {
      provider: A,
      policyId: H1,
      batchId: H2,
      workId: H3,
      inputHash: H4,
      outputHash: H5,
      scorerIdHash: H6,
      nonce: 9,
      deadline: 2000000000,
    },
  });

  const json = typedDataToJsonSafe(typedData);
  assert.equal(json.domain.chainId, "5042");
  assert.equal(json.message.nonce, "9");
  assert.equal(json.message.deadline, "2000000000");
});
