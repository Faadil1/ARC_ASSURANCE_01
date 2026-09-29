import test from "node:test";
import assert from "node:assert/strict";
import {
  keccak256,
} from "viem";
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
} from "../../src/verifier/verify-evidence-v1.mjs";
import {
  verifyAssuranceCoreFromArc,
  verifyArcRunV2,
  verifyT0CustodyFromArc,
} from "../../src/verifier/verify-arc-v2.mjs";

const T0_ADDRESS =
  "0x1111111111111111111111111111111111111111";
const ASSURANCE_ADDRESS =
  "0x2222222222222222222222222222222222222222";

const T0_POLICY =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ASSURANCE_POLICY =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const BATCH =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const WORK =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const SALT =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const SCORER =
  "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";

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

function log({
  address,
  name,
  block,
  index,
  tx,
  args,
}) {
  return {
    address,
    eventName: name,
    blockNumber: BigInt(block),
    logIndex: Number(index),
    transactionHash: tx,
    args,
  };
}

function receipt(hash, block) {
  return {
    transactionHash: hash,
    blockNumber: BigInt(block),
    status: "success",
    gasUsed: 21000n,
    effectiveGasPrice: 1n,
  };
}

function makeMockClient({
  bytecodes,
  logs,
  blocks = {},
}) {
  return {
    async getChainId() {
      return 5042;
    },

    async getBytecode({ address }) {
      return bytecodes[address.toLowerCase()] ?? "0x";
    },

    async getLogs({ address, event }) {
      return (
        logs[
          address.toLowerCase() + ":" + event.name
        ] ?? []
      );
    },

    async getTransactionReceipt({ hash }) {
      for (const value of Object.values(logs)) {
        const match = value.find(
          (entry) => entry.transactionHash === hash
        );
        if (match) {
          return receipt(hash, match.blockNumber);
        }
      }
      throw new Error("missing receipt");
    },

    async getBlock({ blockNumber }) {
      return {
        number: blockNumber,
        timestamp:
          blocks[String(blockNumber)] ?? 1900000000n,
      };
    },
  };
}

function t0Fixture(bytecode = "0x60016000") {
  const funder =
    "0x3333333333333333333333333333333333333333";
  const recipient =
    "0x4444444444444444444444444444444444444444";

  const map = {};
  const add = (name, entry) => {
    map[T0_ADDRESS.toLowerCase() + ":" + name] = [
      entry,
    ];
  };

  add(
    "PolicyCreated",
    log({
      address: T0_ADDRESS,
      name: "PolicyCreated",
      block: 10,
      index: 0,
      tx: "0x01",
      args: {
        policyId: T0_POLICY,
        funder,
        payoutRecipient: recipient,
        maxSpendCap: 50000000000000000n,
        unitPayout: 2000000000000000n,
        expiry: 2000000000n,
        chainId: 5042n,
        createdAtBlock: 10n,
        createdAtTimestamp: 1900000000n,
      },
    })
  );

  add(
    "PolicyFunded",
    log({
      address: T0_ADDRESS,
      name: "PolicyFunded",
      block: 11,
      index: 0,
      tx: "0x02",
      args: {
        policyId: T0_POLICY,
        funder,
        amount: 10000000000000000n,
        custodyBalance: 10000000000000000n,
        totalFunded: 10000000000000000n,
        chainId: 5042n,
        fundedAtBlock: 11n,
        fundedAtTimestamp: 1900000001n,
      },
    })
  );

  add(
    "PaymentReleased",
    log({
      address: T0_ADDRESS,
      name: "PaymentReleased",
      block: 12,
      index: 0,
      tx: "0x03",
      args: {
        policyId: T0_POLICY,
        payoutRecipient: recipient,
        funder,
        amount: 2000000000000000n,
        unitPayout: 2000000000000000n,
        custodyBalance: 8000000000000000n,
        remaining: 8000000000000000n,
        totalPaidOut: 2000000000000000n,
        chainId: 5042n,
        paidAtBlock: 12n,
        paidAtTimestamp: 1900000002n,
      },
    })
  );

  add(
    "RemainingFundsRefunded",
    log({
      address: T0_ADDRESS,
      name: "RemainingFundsRefunded",
      block: 13,
      index: 0,
      tx: "0x04",
      args: {
        policyId: T0_POLICY,
        recipient: funder,
        funder,
        amount: 8000000000000000n,
        custodyBalance: 0n,
        totalRefunded: 8000000000000000n,
        chainId: 5042n,
        refundedAtBlock: 13n,
        refundedAtTimestamp: 1900000003n,
      },
    })
  );

  add(
    "PolicyCompleted",
    log({
      address: T0_ADDRESS,
      name: "PolicyCompleted",
      block: 14,
      index: 0,
      tx: "0x05",
      args: {
        policyId: T0_POLICY,
        funder,
        finalBalance: 0n,
        chainId: 5042n,
        completedAtBlock: 14n,
        completedAtTimestamp: 1900000004n,
      },
    })
  );

  return {
    bytecodes: {
      [T0_ADDRESS.toLowerCase()]: bytecode,
    },
    logs: map,
  };
}

async function assuranceFixture(
  bytecode = "0x60026000"
) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const inputHash = keccakUtf8V1(INPUT);
  const outputHash = keccakUtf8V1(OUTPUT);
  const scorerIdHash = keccakUtf8V1(SCORER);

  const commitment = computeCanaryCommitmentV1({
    chainId: 5042,
    verifyingContract: ASSURANCE_ADDRESS,
    policyId: ASSURANCE_POLICY,
    batchId: BATCH,
    workId: WORK,
    inputHash,
    expectedOutputHash: outputHash,
    scorerIdHash,
    salt: SALT,
  });

  const canaryKey = computeCanaryKeyV1({
    inputHash,
    expectedOutputHash: outputHash,
    scorerIdHash,
  });

  const signed = await signProviderOutputV1({
    privateKey,
    chainId: 5042,
    verifyingContract: ASSURANCE_ADDRESS,
    policyId: ASSURANCE_POLICY,
    batchId: BATCH,
    workId: WORK,
    inputText: INPUT,
    canonicalOutput: OUTPUT,
    nonce: 1,
    deadline: 2000000000,
  });

  const map = {};
  const add = (name, entry) => {
    map[
      ASSURANCE_ADDRESS.toLowerCase() + ":" + name
    ] = [entry];
  };

  add(
    "PolicyCreated",
    log({
      address: ASSURANCE_ADDRESS,
      name: "PolicyCreated",
      block: 20,
      index: 0,
      tx: "0x11",
      args: {
        policyId: ASSURANCE_POLICY,
        principal:
          "0x5555555555555555555555555555555555555555",
        provider: account.address,
        scorerIdHash,
        maxFailures: 2,
      },
    })
  );

  add(
    "BatchCommitted",
    log({
      address: ASSURANCE_ADDRESS,
      name: "BatchCommitted",
      block: 21,
      index: 0,
      tx: "0x12",
      args: {
        policyId: ASSURANCE_POLICY,
        batchId: BATCH,
        commitment,
        blockNumber: 21n,
      },
    })
  );

  add(
    "ProviderOutputLocked",
    log({
      address: ASSURANCE_ADDRESS,
      name: "ProviderOutputLocked",
      block: 22,
      index: 0,
      tx: "0x13",
      args: {
        policyId: ASSURANCE_POLICY,
        batchId: BATCH,
        workId: WORK,
        inputHash,
        outputHash,
        scorerIdHash,
        providerDigest: signed.digest,
        provider: account.address,
        blockNumber: 22n,
      },
    })
  );

  add(
    "CanaryRevealed",
    log({
      address: ASSURANCE_ADDRESS,
      name: "CanaryRevealed",
      block: 23,
      index: 0,
      tx: "0x14",
      args: {
        policyId: ASSURANCE_POLICY,
        batchId: BATCH,
        workId: WORK,
        inputHash,
        expectedOutputHash: outputHash,
        scorerIdHash,
        salt: SALT,
        canaryKey,
        blockNumber: 23n,
      },
    })
  );

  add(
    "BatchResolved",
    log({
      address: ASSURANCE_ADDRESS,
      name: "BatchResolved",
      block: 24,
      index: 0,
      tx: "0x15",
      args: {
        policyId: ASSURANCE_POLICY,
        batchId: BATCH,
        workId: WORK,
        passed: true,
        directive: 1,
        failureCount: 0,
        blockNumber: 24n,
      },
    })
  );

  map[
    ASSURANCE_ADDRESS.toLowerCase() +
      ":CircuitBreakerTriggered"
  ] = [];

  return {
    privateKey,
    account,
    signed,
    bytecodes: {
      [ASSURANCE_ADDRESS.toLowerCase()]: bytecode,
    },
    logs: map,
    config: {
      address: ASSURANCE_ADDRESS,
      policy_id: ASSURANCE_POLICY,
      batch_id: BATCH,
      offchain: {
        input_text: INPUT,
        canonical_output: OUTPUT,
        scorer_id: SCORER,
        nonce: "1",
        deadline: "2000000000",
        signature: signed.signature,
      },
    },
  };
}

test("T0 chain verifier proves bounded custody sequence", async () => {
  const fixture = t0Fixture();
  const client = makeMockClient(fixture);

  const result = await verifyT0CustodyFromArc(
    {
      address: T0_ADDRESS,
      policy_id: T0_POLICY,
      runtime: {
        expected_code_hash: keccak256(
          fixture.bytecodes[
            T0_ADDRESS.toLowerCase()
          ]
        ),
        source_commit: "example",
      },
    },
    { client }
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.verdict,
    "T0_CUSTODY_PROVEN_FROM_ARC"
  );
});

test("runtime code mismatch fails closed", async () => {
  const fixture = t0Fixture();
  const client = makeMockClient(fixture);

  const result = await verifyT0CustodyFromArc(
    {
      address: T0_ADDRESS,
      policy_id: T0_POLICY,
      runtime: {
        expected_code_hash:
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    },
    { client }
  );

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "RUNTIME_CODE_HASH_MISMATCH"
  );
});

test("assurance chain verifier reconstructs signed PASS", async () => {
  const fixture = await assuranceFixture();
  const client = makeMockClient(fixture);

  const result = await verifyAssuranceCoreFromArc(
    fixture.config,
    { client }
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.verdict,
    "ASSURANCE_CORE_PROVEN_FROM_ARC"
  );
  assert.equal(
    result.deterministic_result,
    "PASS"
  );
  assert.equal(
    result.settlement_directive,
    "PAY"
  );
  assert.equal(
    result.financial_causality,
    "NOT_PROVEN_ASSURANCE_CORE_IS_NON_CUSTODIAL"
  );
});

test("both proven primitives do not become integrated causality", async () => {
  const t0 = t0Fixture();
  const assurance = await assuranceFixture();

  const merged = {
    bytecodes: {
      ...t0.bytecodes,
      ...assurance.bytecodes,
    },
    logs: {
      ...t0.logs,
      ...assurance.logs,
    },
  };

  const client = makeMockClient(merged);

  const result = await verifyArcRunV2(
    {
      t0: {
        address: T0_ADDRESS,
        policy_id: T0_POLICY,
      },
      assurance: assurance.config,
    },
    { client }
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.verdict,
    "PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN"
  );
  assert.equal(
    result.integrated_financial_causality,
    "NOT_PROVEN_SEPARATE_PRIMITIVES"
  );
});
