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
} from "../../src/verifier/verify-evidence-v1.mjs";
import {
  verifyIntegratedBatchFromArc,
} from "../../src/verifier/verify-integrated-v3.mjs";

const ADDRESS =
  "0x1111111111111111111111111111111111111111";
const FUNDER =
  "0x2222222222222222222222222222222222222222";
const RECIPIENT =
  "0x3333333333333333333333333333333333333333";

const POLICY_ID =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const BATCH_ID =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const WORK_ID =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const SALT =
  "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

const FUND_AMOUNT = 10_000_000_000_000_000n;
const UNIT_PAYOUT = 2_000_000_000_000_000n;

const SCORER =
  "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";

const INPUT = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

const PASS_OUTPUT = [
  "ARC_ASSURANCE_INVOICE_V1",
  "invoice_number:A-1042",
  "subtotal_minor:18420",
  "tax_minor:2763",
  "total_minor:21183",
  "currency:CAD",
].join("\n");

const FAIL_OUTPUT = [
  "ARC_ASSURANCE_INVOICE_V1",
  "invoice_number:A-1042",
  "subtotal_minor:18420",
  "tax_minor:2764",
  "total_minor:21184",
  "currency:CAD",
].join("\n");

function tx(n) {
  return "0x" + n.toString(16).padStart(64, "0");
}

function log({
  name,
  block,
  index,
  txHash,
  args,
}) {
  return {
    address: ADDRESS,
    eventName: name,
    blockNumber: BigInt(block),
    logIndex: Number(index),
    transactionHash: txHash,
    args,
  };
}

function makeClient({ logs, bytecode = "0x60016000" }) {
  return {
    async getChainId() {
      return 5042;
    },

    async getBytecode() {
      return bytecode;
    },

    async getLogs({ event }) {
      return logs[event.name] ?? [];
    },

    async getBlock({ blockNumber }) {
      return {
        number: blockNumber,
        timestamp: 1_900_000_000n,
      };
    },

    async getTransactionReceipt({ hash }) {
      return {
        transactionHash: hash,
        blockNumber: 15n,
        status: "success",
        gasUsed: 21_000n,
        effectiveGasPrice: 1n,
      };
    },
  };
}

async function fixture(mode) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const actualOutput =
    mode === "PASS" ? PASS_OUTPUT : FAIL_OUTPUT;

  const inputHash = keccakUtf8V1(INPUT);
  const outputHash = keccakUtf8V1(actualOutput);
  const expectedOutputHash =
    keccakUtf8V1(PASS_OUTPUT);
  const scorerIdHash = keccakUtf8V1(SCORER);

  const commitment = computeCanaryCommitmentV1({
    chainId: 5042,
    verifyingContract: ADDRESS,
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
    verifyingContract: ADDRESS,
    policyId: POLICY_ID,
    batchId: BATCH_ID,
    workId: WORK_ID,
    inputText: INPUT,
    canonicalOutput: actualOutput,
    nonce: 1,
    deadline: 2_000_000_000,
  });

  const directive =
    mode === "PASS"
      ? 1
      : mode === "WITHHOLD"
        ? 2
        : 3;

  const failureCount =
    mode === "PASS"
      ? 0
      : mode === "WITHHOLD"
        ? 1
        : 2;

  const protectedRemainder =
    mode === "PASS"
      ? FUND_AMOUNT - UNIT_PAYOUT
      : FUND_AMOUNT;

  const logs = {
    AssurancePolicyCreated: [
      log({
        name: "AssurancePolicyCreated",
        block: 10,
        index: 0,
        txHash: tx(1),
        args: {
          policyId: POLICY_ID,
          funder: FUNDER,
          provider: account.address,
          payoutRecipient: RECIPIENT,
          scorerIdHash,
          maxFailures: 2,
          maxSpendCap:
            20_000_000_000_000_000n,
          unitPayout: UNIT_PAYOUT,
          expiry: 2_100_000_000n,
          chainId: 5042n,
          blockNumber: 10n,
          timestamp: 1_899_999_900n,
        },
      }),
    ],

    PolicyFunded: [
      log({
        name: "PolicyFunded",
        block: 11,
        index: 0,
        txHash: tx(2),
        args: {
          policyId: POLICY_ID,
          funder: FUNDER,
          amount: FUND_AMOUNT,
          totalFunded: FUND_AMOUNT,
          remainingLiability: FUND_AMOUNT,
          chainId: 5042n,
          blockNumber: 11n,
          timestamp: 1_899_999_910n,
        },
      }),
    ],

    BatchCommitted: [
      log({
        name: "BatchCommitted",
        block: 12,
        index: 0,
        txHash: tx(3),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          commitment,
          blockNumber: 12n,
        },
      }),
    ],

    ProviderOutputLocked: [
      log({
        name: "ProviderOutputLocked",
        block: 13,
        index: 0,
        txHash: tx(4),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          workId: WORK_ID,
          inputHash,
          outputHash,
          scorerIdHash,
          providerDigest: signed.digest,
          provider: account.address,
          blockNumber: 13n,
        },
      }),
    ],

    CanaryRevealed: [
      log({
        name: "CanaryRevealed",
        block: 14,
        index: 0,
        txHash: tx(5),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          workId: WORK_ID,
          inputHash,
          expectedOutputHash,
          scorerIdHash,
          salt: SALT,
          canaryKey,
          blockNumber: 14n,
        },
      }),
    ],

    BatchResolved: [
      log({
        name: "BatchResolved",
        block: 15,
        index: 0,
        txHash: tx(6),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          workId: WORK_ID,
          passed: mode === "PASS",
          directive,
          failureCount,
          protectedRemainder,
          blockNumber: 15n,
        },
      }),
    ],

    PaymentReleased: [],
    PaymentWithheld: [],
    CircuitBreakerTriggered: [],
    ProtectedRemainderRefunded: [],
    PolicyClosed: [],
  };

  if (mode === "PASS") {
    logs.PaymentReleased = [
      log({
        name: "PaymentReleased",
        block: 15,
        index: 1,
        txHash: tx(6),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          workId: WORK_ID,
          payoutRecipient: RECIPIENT,
          amount: UNIT_PAYOUT,
          protectedRemainder,
          totalPaidOut: UNIT_PAYOUT,
          chainId: 5042n,
          blockNumber: 15n,
          timestamp: 1_900_000_000n,
        },
      }),
    ];
  } else {
    logs.PaymentWithheld = [
      log({
        name: "PaymentWithheld",
        block: 15,
        index: 1,
        txHash: tx(6),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          workId: WORK_ID,
          directive,
          protectedRemainder,
          failureCount,
          chainId: 5042n,
          blockNumber: 15n,
        },
      }),
    ];
  }

  if (mode === "BREAKER") {
    logs.CircuitBreakerTriggered = [
      log({
        name: "CircuitBreakerTriggered",
        block: 15,
        index: 2,
        txHash: tx(6),
        args: {
          policyId: POLICY_ID,
          batchId: BATCH_ID,
          failureCount: 2,
          maxFailures: 2,
          protectedRemainder,
          blockNumber: 15n,
        },
      }),
    ];

    logs.ProtectedRemainderRefunded = [
      log({
        name: "ProtectedRemainderRefunded",
        block: 16,
        index: 0,
        txHash: tx(7),
        args: {
          policyId: POLICY_ID,
          funder: FUNDER,
          amount: protectedRemainder,
          totalRefunded: protectedRemainder,
          chainId: 5042n,
          blockNumber: 16n,
          timestamp: 1_900_000_010n,
        },
      }),
    ];

    logs.PolicyClosed = [
      log({
        name: "PolicyClosed",
        block: 16,
        index: 1,
        txHash: tx(7),
        args: {
          policyId: POLICY_ID,
          funder: FUNDER,
          totalFunded: FUND_AMOUNT,
          totalPaidOut: 0n,
          totalRefunded: FUND_AMOUNT,
          blockNumber: 16n,
        },
      }),
    ];
  }

  return {
    logs,
    config: {
      address: ADDRESS,
      policy_id: POLICY_ID,
      batch_id: BATCH_ID,
      offchain: {
        input_text: INPUT,
        canonical_output: actualOutput,
        scorer_id: SCORER,
        nonce: "1",
        deadline: "2000000000",
        signature: signed.signature,
      },
    },
  };
}

test("PASS proves atomic resolve and payout", async () => {
  const built = await fixture("PASS");

  const result =
    await verifyIntegratedBatchFromArc(
      built.config,
      { client: makeClient(built) }
    );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(
    result.deterministic_result,
    "PASS"
  );
  assert.equal(
    result.settlement_directive,
    "PAY"
  );
  assert.equal(
    result.financial_proof.status,
    "PASS_RESOLVE_AND_PAYOUT_ATOMIC_ON_ARC"
  );
});

test("FAIL proves atomic withhold and zero payment event", async () => {
  const built = await fixture("WITHHOLD");

  const result =
    await verifyIntegratedBatchFromArc(
      built.config,
      { client: makeClient(built) }
    );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(
    result.deterministic_result,
    "FAIL"
  );
  assert.equal(
    result.settlement_directive,
    "WITHHOLD"
  );
  assert.equal(
    result.financial_proof.status,
    "FAIL_RESOLVE_AND_WITHHOLD_ATOMIC_ON_ARC"
  );
});

test("BREAKER proves withhold then exact protected refund", async () => {
  const built = await fixture("BREAKER");

  const result =
    await verifyIntegratedBatchFromArc(
      built.config,
      { client: makeClient(built) }
    );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(
    result.settlement_directive,
    "BREAKER"
  );
  assert.equal(
    result.financial_proof.status,
    "BREAKER_WITHHOLD_AND_REFUND_PROVEN_ON_ARC"
  );
  assert.equal(
    result.financial_proof.protected_remainder,
    FUND_AMOUNT.toString()
  );
});

test("PASS payout must be atomic with resolve transaction", async () => {
  const built = await fixture("PASS");

  built.logs.PaymentReleased[0].transactionHash =
    tx(99);

  const result =
    await verifyIntegratedBatchFromArc(
      built.config,
      { client: makeClient(built) }
    );

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "PASS_PAYMENT_NOT_ATOMIC_WITH_RESOLVE"
  );
});

test("FAIL cannot coexist with PaymentReleased", async () => {
  const built = await fixture("WITHHOLD");

  built.logs.PaymentReleased = [
    log({
      name: "PaymentReleased",
      block: 15,
      index: 2,
      txHash: tx(6),
      args: {
        policyId: POLICY_ID,
        batchId: BATCH_ID,
        workId: WORK_ID,
        payoutRecipient: RECIPIENT,
        amount: UNIT_PAYOUT,
        protectedRemainder:
          FUND_AMOUNT - UNIT_PAYOUT,
        totalPaidOut: UNIT_PAYOUT,
        chainId: 5042n,
        blockNumber: 15n,
        timestamp: 1_900_000_000n,
      },
    }),
  ];

  const result =
    await verifyIntegratedBatchFromArc(
      built.config,
      { client: makeClient(built) }
    );

  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "FAIL_FINANCIAL_EVENT_MISMATCH"
  );
});
