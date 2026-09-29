import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  keccak256,
  parseAbiItem,
} from "viem";
import {
  verifyEvidencePacketV1,
} from "./verify-evidence-v1.mjs";

export const ARC_MAINNET_CHAIN_ID = 5042;
export const DEFAULT_ARC_MAINNET_RPC =
  "https://rpc.mainnet.arc.io";

const T0_EVENTS = Object.freeze({
  PolicyCreated: parseAbiItem(
    "event PolicyCreated(bytes32 indexed policyId,address indexed funder,address indexed payoutRecipient,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint256 chainId,uint256 createdAtBlock,uint256 createdAtTimestamp)"
  ),
  PolicyFunded: parseAbiItem(
    "event PolicyFunded(bytes32 indexed policyId,address indexed funder,uint256 amount,uint256 custodyBalance,uint256 totalFunded,uint256 chainId,uint256 fundedAtBlock,uint256 fundedAtTimestamp)"
  ),
  PaymentReleased: parseAbiItem(
    "event PaymentReleased(bytes32 indexed policyId,address indexed payoutRecipient,address indexed funder,uint256 amount,uint256 unitPayout,uint256 custodyBalance,uint256 remaining,uint256 totalPaidOut,uint256 chainId,uint256 paidAtBlock,uint256 paidAtTimestamp)"
  ),
  RemainingFundsRefunded: parseAbiItem(
    "event RemainingFundsRefunded(bytes32 indexed policyId,address indexed recipient,address indexed funder,uint256 amount,uint256 custodyBalance,uint256 totalRefunded,uint256 chainId,uint256 refundedAtBlock,uint256 refundedAtTimestamp)"
  ),
  PolicyCompleted: parseAbiItem(
    "event PolicyCompleted(bytes32 indexed policyId,address indexed funder,uint256 finalBalance,uint256 chainId,uint256 completedAtBlock,uint256 completedAtTimestamp)"
  ),
  PolicyCancelled: parseAbiItem(
    "event PolicyCancelled(bytes32 indexed policyId,address indexed funder,uint256 refundedAmount,uint256 chainId,uint256 cancelledAtBlock,uint256 cancelledAtTimestamp)"
  ),
});

const ASSURANCE_EVENTS = Object.freeze({
  PolicyCreated: parseAbiItem(
    "event PolicyCreated(bytes32 indexed policyId,address indexed principal,address indexed provider,bytes32 scorerIdHash,uint32 maxFailures)"
  ),
  BatchCommitted: parseAbiItem(
    "event BatchCommitted(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 commitment,uint256 blockNumber)"
  ),
  ProviderOutputLocked: parseAbiItem(
    "event ProviderOutputLocked(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,bytes32 providerDigest,address provider,uint256 blockNumber)"
  ),
  CanaryRevealed: parseAbiItem(
    "event CanaryRevealed(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt,bytes32 canaryKey,uint256 blockNumber)"
  ),
  BatchResolved: parseAbiItem(
    "event BatchResolved(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,bool passed,uint8 directive,uint32 failureCount,uint256 blockNumber)"
  ),
  CircuitBreakerTriggered: parseAbiItem(
    "event CircuitBreakerTriggered(bytes32 indexed policyId,bytes32 indexed batchId,uint32 failureCount,uint32 maxFailures,uint256 blockNumber)"
  ),
});

const DIRECTIVE = Object.freeze({
  0: "NONE",
  1: "PAY",
  2: "WITHHOLD",
  3: "BREAKER",
});

function fail(code, detail = null) {
  return { ok: false, code, detail };
}

function pass(detail = null) {
  return { ok: true, code: "PASS", detail };
}

function requireObject(value, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return value;
}

function toBlock(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return BigInt(value);
}

function lower(value) {
  return String(value).toLowerCase();
}

function sameHex(a, b) {
  return lower(a) === lower(b);
}

function position(log) {
  if (
    log.blockNumber === null ||
    log.blockNumber === undefined ||
    log.logIndex === null ||
    log.logIndex === undefined
  ) {
    throw new Error("LOG_POSITION_MISSING");
  }

  return {
    block: BigInt(log.blockNumber),
    log: BigInt(log.logIndex),
  };
}

function isBefore(a, b) {
  return (
    a.block < b.block ||
    (a.block === b.block && a.log < b.log)
  );
}

function assertOrdered(logs) {
  for (let i = 1; i < logs.length; i += 1) {
    if (!isBefore(position(logs[i - 1]), position(logs[i]))) {
      throw new Error("INVALID_CHAIN_EVENT_ORDER");
    }
  }
}

function jsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, inner) =>
      typeof inner === "bigint" ? inner.toString() : inner
    )
  );
}

function eventToEvidence(name, log, extra = {}) {
  return {
    name,
    block_number: String(log.blockNumber),
    log_index: String(log.logIndex),
    transaction_hash: log.transactionHash,
    ...extra,
  };
}

async function getUniqueLog(
  client,
  {
    address,
    event,
    args,
    fromBlock,
    toBlock,
    label,
  }
) {
  const logs = await client.getLogs({
    address,
    event,
    args,
    fromBlock,
    toBlock,
    strict: true,
  });

  if (logs.length !== 1) {
    throw new Error(
      "EXPECTED_EXACTLY_ONE_" +
        label.toUpperCase() +
        "_LOG:" +
        logs.length
    );
  }

  return logs[0];
}

async function assertReceiptsSuccessful(client, logs) {
  const seen = new Set();
  const receipts = [];

  for (const log of logs) {
    const hash = log.transactionHash;
    if (!hash || seen.has(hash)) continue;
    seen.add(hash);

    const receipt = await client.getTransactionReceipt({
      hash,
    });

    if (receipt.status !== "success") {
      throw new Error(
        "TRANSACTION_NOT_SUCCESSFUL:" + hash
      );
    }

    receipts.push({
      transaction_hash: hash,
      block_number: String(receipt.blockNumber),
      status: receipt.status,
      gas_used: String(receipt.gasUsed),
      effective_gas_price:
        receipt.effectiveGasPrice === undefined
          ? null
          : String(receipt.effectiveGasPrice),
    });
  }

  return receipts;
}

async function verifyNetwork(client) {
  const chainId = await client.getChainId();
  if (chainId !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(
      "CHAIN_ID_NOT_ARC_MAINNET:" + chainId
    );
  }

  return pass({ chain_id: chainId });
}

async function verifyRuntimeCode(
  client,
  address,
  runtime = {}
) {
  const normalized = getAddress(address);
  const bytecode = await client.getBytecode({
    address: normalized,
  });

  if (!bytecode || bytecode === "0x") {
    return fail("NO_DEPLOYED_CODE", {
      address: normalized,
    });
  }

  const codeHash = keccak256(bytecode);
  const expected = runtime.expected_code_hash ?? null;

  if (expected && !sameHex(codeHash, expected)) {
    return fail("RUNTIME_CODE_HASH_MISMATCH", {
      address: normalized,
      observed_code_hash: codeHash,
      expected_code_hash: expected,
      source_commit_claim:
        runtime.source_commit ?? null,
    });
  }

  return pass({
    address: normalized,
    observed_code_hash: codeHash,
    expected_code_hash: expected,
    source_commit_claim:
      runtime.source_commit ?? null,
    commit_binding:
      expected
        ? "CODE_HASH_MATCH_MANIFEST_COMMIT_PROVENANCE_STILL_REQUIRED"
        : "CODE_EXISTS_EXPECTED_HASH_NOT_SUPPLIED",
  });
}

export function makeArcMainnetClient(
  rpcUrl = DEFAULT_ARC_MAINNET_RPC
) {
  const arc = defineChain({
    id: ARC_MAINNET_CHAIN_ID,
    name: "Arc Mainnet",
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  });

  return createPublicClient({
    chain: arc,
    transport: http(rpcUrl),
  });
}

export async function verifyT0CustodyFromArc(
  config,
  { client = null } = {}
) {
  const checks = {};
  const warnings = [];

  try {
    requireObject(config, "t0_config");
    const rpcUrl =
      config.rpc_url ?? DEFAULT_ARC_MAINNET_RPC;
    const publicClient =
      client ?? makeArcMainnetClient(rpcUrl);

    checks.network = await verifyNetwork(publicClient);
    const address = getAddress(
      requireString(config.address, "t0_address")
    );
    const policyId = requireString(
      config.policy_id,
      "t0_policy_id"
    );

    checks.runtime = await verifyRuntimeCode(
      publicClient,
      address,
      config.runtime ?? {}
    );
    if (!checks.runtime.ok) {
      return {
        ok: false,
        verdict: "T0_CUSTODY_INVALID",
        checks,
        warnings,
        error: checks.runtime.code,
      };
    }

    const fromBlock = toBlock(config.from_block, 0n);
    const toBlock = toBlock(config.to_block, "latest");

    const created = await getUniqueLog(publicClient, {
      address,
      event: T0_EVENTS.PolicyCreated,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "PolicyCreated",
    });
    const funded = await getUniqueLog(publicClient, {
      address,
      event: T0_EVENTS.PolicyFunded,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "PolicyFunded",
    });
    const paid = await getUniqueLog(publicClient, {
      address,
      event: T0_EVENTS.PaymentReleased,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "PaymentReleased",
    });
    const refunded = await getUniqueLog(publicClient, {
      address,
      event: T0_EVENTS.RemainingFundsRefunded,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "RemainingFundsRefunded",
    });
    const completed = await getUniqueLog(publicClient, {
      address,
      event: T0_EVENTS.PolicyCompleted,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "PolicyCompleted",
    });

    assertOrdered([
      created,
      funded,
      paid,
      refunded,
      completed,
    ]);

    const args = {
      created: created.args,
      funded: funded.args,
      paid: paid.args,
      refunded: refunded.args,
      completed: completed.args,
    };

    for (const [name, eventArgs] of Object.entries(args)) {
      if (Number(eventArgs.chainId) !== ARC_MAINNET_CHAIN_ID) {
        throw new Error(
          "EVENT_CHAIN_ID_MISMATCH:" + name
        );
      }
    }

    if (
      !sameHex(
        args.created.funder,
        args.funded.funder
      ) ||
      !sameHex(
        args.created.funder,
        args.paid.funder
      ) ||
      !sameHex(
        args.created.funder,
        args.refunded.funder
      ) ||
      !sameHex(
        args.created.funder,
        args.completed.funder
      )
    ) {
      throw new Error("T0_FUNDER_BINDING_MISMATCH");
    }

    if (
      !sameHex(
        args.created.payoutRecipient,
        args.paid.payoutRecipient
      )
    ) {
      throw new Error(
        "T0_PAYOUT_RECIPIENT_BINDING_MISMATCH"
      );
    }

    const fundedAmount = BigInt(args.funded.amount);
    const paidAmount = BigInt(args.paid.amount);
    const refundedAmount = BigInt(args.refunded.amount);

    if (paidAmount !== BigInt(args.created.unitPayout)) {
      throw new Error(
        "T0_PAYOUT_DOES_NOT_MATCH_CONFIGURED_UNIT"
      );
    }

    if (fundedAmount !== paidAmount + refundedAmount) {
      throw new Error(
        "T0_VALUE_CONSERVATION_MISMATCH"
      );
    }

    if (BigInt(args.paid.remaining) !== refundedAmount) {
      throw new Error(
        "T0_REMAINING_REFUND_MISMATCH"
      );
    }

    checks.value_conservation = pass({
      funded: fundedAmount.toString(),
      paid: paidAmount.toString(),
      refunded: refundedAmount.toString(),
    });

    const receipts = await assertReceiptsSuccessful(
      publicClient,
      [created, funded, paid, refunded, completed]
    );
    checks.receipts = pass(receipts);

    return {
      ok: true,
      verdict: "T0_CUSTODY_PROVEN_FROM_ARC",
      chain_id: ARC_MAINNET_CHAIN_ID,
      contract: address,
      policy_id: policyId,
      runtime_binding: checks.runtime.detail.commit_binding,
      checks,
      warnings,
      events: jsonSafe({
        PolicyCreated: created,
        PolicyFunded: funded,
        PaymentReleased: paid,
        RemainingFundsRefunded: refunded,
        PolicyCompleted: completed,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      verdict: "T0_CUSTODY_INVALID",
      checks,
      warnings,
      error: error?.message ?? String(error),
    };
  }
}

export async function verifyAssuranceCoreFromArc(
  config,
  { client = null } = {}
) {
  const checks = {};
  const warnings = [];

  try {
    requireObject(config, "assurance_config");
    const rpcUrl =
      config.rpc_url ?? DEFAULT_ARC_MAINNET_RPC;
    const publicClient =
      client ?? makeArcMainnetClient(rpcUrl);

    checks.network = await verifyNetwork(publicClient);

    const address = getAddress(
      requireString(
        config.address,
        "assurance_address"
      )
    );
    const policyId = requireString(
      config.policy_id,
      "policy_id"
    );
    const batchId = requireString(
      config.batch_id,
      "batch_id"
    );

    checks.runtime = await verifyRuntimeCode(
      publicClient,
      address,
      config.runtime ?? {}
    );

    if (!checks.runtime.ok) {
      return {
        ok: false,
        verdict: "ASSURANCE_CORE_INVALID",
        checks,
        warnings,
        error: checks.runtime.code,
      };
    }

    const fromBlock = toBlock(config.from_block, 0n);
    const toBlock = toBlock(config.to_block, "latest");

    const policyCreated = await getUniqueLog(publicClient, {
      address,
      event: ASSURANCE_EVENTS.PolicyCreated,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "PolicyCreated",
    });
    const committed = await getUniqueLog(publicClient, {
      address,
      event: ASSURANCE_EVENTS.BatchCommitted,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "BatchCommitted",
    });
    const locked = await getUniqueLog(publicClient, {
      address,
      event: ASSURANCE_EVENTS.ProviderOutputLocked,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "ProviderOutputLocked",
    });
    const revealed = await getUniqueLog(publicClient, {
      address,
      event: ASSURANCE_EVENTS.CanaryRevealed,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "CanaryRevealed",
    });
    const resolved = await getUniqueLog(publicClient, {
      address,
      event: ASSURANCE_EVENTS.BatchResolved,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "BatchResolved",
    });

    assertOrdered([
      committed,
      locked,
      revealed,
      resolved,
    ]);

    const breakerLogs = await publicClient.getLogs({
      address,
      event: ASSURANCE_EVENTS.CircuitBreakerTriggered,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      strict: true,
    });

    if (breakerLogs.length > 1) {
      throw new Error(
        "MULTIPLE_CIRCUIT_BREAKER_EVENTS"
      );
    }

    const lockBlock = await publicClient.getBlock({
      blockNumber: locked.blockNumber,
    });

    const directive =
      DIRECTIVE[Number(resolved.args.directive)];

    if (!directive) {
      throw new Error("UNKNOWN_SETTLEMENT_DIRECTIVE");
    }

    const chainEvents = [
      eventToEvidence("BatchCommitted", committed, {
        policy_id: committed.args.policyId,
        batch_id: committed.args.batchId,
        commitment: committed.args.commitment,
      }),
      eventToEvidence("ProviderOutputLocked", locked, {
        block_timestamp: String(lockBlock.timestamp),
        policy_id: locked.args.policyId,
        batch_id: locked.args.batchId,
        work_id: locked.args.workId,
        input_hash: locked.args.inputHash,
        output_hash: locked.args.outputHash,
        scorer_id_hash: locked.args.scorerIdHash,
        provider_digest: locked.args.providerDigest,
        provider: locked.args.provider,
      }),
      eventToEvidence("CanaryRevealed", revealed, {
        policy_id: revealed.args.policyId,
        batch_id: revealed.args.batchId,
        work_id: revealed.args.workId,
        input_hash: revealed.args.inputHash,
        expected_output_hash:
          revealed.args.expectedOutputHash,
        scorer_id_hash: revealed.args.scorerIdHash,
        salt: revealed.args.salt,
        canary_key: revealed.args.canaryKey,
      }),
    ];

    if (breakerLogs.length === 1) {
      const breaker = breakerLogs[0];
      chainEvents.push(
        eventToEvidence(
          "CircuitBreakerTriggered",
          breaker,
          {
            policy_id: breaker.args.policyId,
            batch_id: breaker.args.batchId,
            failure_count: breaker.args.failureCount,
            max_failures: breaker.args.maxFailures,
          }
        )
      );
    }

    chainEvents.push(
      eventToEvidence("BatchResolved", resolved, {
        policy_id: resolved.args.policyId,
        batch_id: resolved.args.batchId,
        work_id: resolved.args.workId,
        passed: resolved.args.passed,
        directive,
        failure_count: resolved.args.failureCount,
      })
    );

    const offchain = requireObject(
      config.offchain,
      "offchain"
    );

    const packet = {
      version: "ARC_ASSURANCE_EVIDENCE_V1",
      network: {
        chain_id: String(ARC_MAINNET_CHAIN_ID),
        verifying_contract: address,
      },
      work: {
        input_text: requireString(
          offchain.input_text,
          "input_text"
        ),
        canonical_output: requireString(
          offchain.canonical_output,
          "canonical_output"
        ),
        scorer_id: requireString(
          offchain.scorer_id,
          "scorer_id"
        ),
      },
      provider: {
        expected_provider: policyCreated.args.provider,
        nonce: requireString(
          String(offchain.nonce),
          "nonce"
        ),
        deadline: requireString(
          String(offchain.deadline),
          "deadline"
        ),
        signature: requireString(
          offchain.signature,
          "signature"
        ),
      },
      reveal: {
        policy_id: policyId,
        batch_id: batchId,
        work_id: revealed.args.workId,
        expected_output_hash:
          revealed.args.expectedOutputHash,
        salt: revealed.args.salt,
        commitment: committed.args.commitment,
      },
      chain_events: chainEvents,
      financial_evidence: null,
    };

    const coreProof = await verifyEvidencePacketV1(
      packet
    );

    checks.core_proof = coreProof.ok
      ? pass(coreProof)
      : fail(
          coreProof.error ??
            "OFFLINE_CORE_RECONSTRUCTION_FAILED",
          coreProof
        );

    if (!coreProof.ok) {
      return {
        ok: false,
        verdict: "ASSURANCE_CORE_INVALID",
        checks,
        warnings,
        error:
          coreProof.error ??
          "OFFLINE_CORE_RECONSTRUCTION_FAILED",
      };
    }

    const receiptLogs = [
      policyCreated,
      committed,
      locked,
      revealed,
      resolved,
      ...breakerLogs,
    ];

    checks.receipts = pass(
      await assertReceiptsSuccessful(
        publicClient,
        receiptLogs
      )
    );

    return {
      ok: true,
      verdict: "ASSURANCE_CORE_PROVEN_FROM_ARC",
      chain_id: ARC_MAINNET_CHAIN_ID,
      contract: address,
      policy_id: policyId,
      batch_id: batchId,
      deterministic_result:
        coreProof.deterministic_result,
      settlement_directive:
        coreProof.settlement_directive,
      runtime_binding: checks.runtime.detail.commit_binding,
      financial_causality:
        "NOT_PROVEN_ASSURANCE_CORE_IS_NON_CUSTODIAL",
      checks,
      warnings,
      chain_events: jsonSafe(chainEvents),
    };
  } catch (error) {
    return {
      ok: false,
      verdict: "ASSURANCE_CORE_INVALID",
      checks,
      warnings,
      error: error?.message ?? String(error),
    };
  }
}

export async function verifyArcRunV2(
  manifest,
  { client = null } = {}
) {
  const result = {
    version: "ARC_ASSURANCE_CHAIN_VERIFY_V2",
    t0: null,
    assurance: null,
    integrated_financial_causality:
      "NOT_PROVEN_SEPARATE_PRIMITIVES",
  };

  if (manifest.t0) {
    result.t0 = await verifyT0CustodyFromArc(
      manifest.t0,
      { client }
    );
  }

  if (manifest.assurance) {
    result.assurance =
      await verifyAssuranceCoreFromArc(
        manifest.assurance,
        { client }
      );
  }

  const requested = [
    manifest.t0 ? result.t0?.ok : true,
    manifest.assurance
      ? result.assurance?.ok
      : true,
  ];

  result.ok =
    (manifest.t0 || manifest.assurance) &&
    requested.every(Boolean);

  if (!result.ok) {
    result.verdict = "CHAIN_VERIFY_FAILED";
    return result;
  }

  if (result.t0 && result.assurance) {
    result.verdict =
      "PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN";
  } else if (result.t0) {
    result.verdict = result.t0.verdict;
  } else {
    result.verdict = result.assurance.verdict;
  }

  return result;
}
