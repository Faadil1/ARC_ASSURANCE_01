import {
  getAddress,
  keccak256,
  parseAbiItem,
} from "viem";
import {
  makeArcMainnetClient,
  DEFAULT_ARC_MAINNET_RPC,
  ARC_MAINNET_CHAIN_ID,
} from "./verify-arc-v2.mjs";
import {
  verifyEvidencePacketV1,
} from "./verify-evidence-v1.mjs";

const EVENTS = Object.freeze({
  AssurancePolicyCreated: parseAbiItem(
    "event AssurancePolicyCreated(bytes32 indexed policyId,address indexed funder,address indexed provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint256 chainId,uint256 blockNumber,uint256 timestamp)"
  ),
  PolicyFunded: parseAbiItem(
    "event PolicyFunded(bytes32 indexed policyId,address indexed funder,uint256 amount,uint256 totalFunded,uint256 remainingLiability,uint256 chainId,uint256 blockNumber,uint256 timestamp)"
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
    "event BatchResolved(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,bool passed,uint8 directive,uint32 failureCount,uint256 protectedRemainder,uint256 blockNumber)"
  ),
  PaymentReleased: parseAbiItem(
    "event PaymentReleased(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,address payoutRecipient,uint256 amount,uint256 protectedRemainder,uint256 totalPaidOut,uint256 chainId,uint256 blockNumber,uint256 timestamp)"
  ),
  PaymentWithheld: parseAbiItem(
    "event PaymentWithheld(bytes32 indexed policyId,bytes32 indexed batchId,bytes32 indexed workId,uint8 directive,uint256 protectedRemainder,uint32 failureCount,uint256 chainId,uint256 blockNumber)"
  ),
  CircuitBreakerTriggered: parseAbiItem(
    "event CircuitBreakerTriggered(bytes32 indexed policyId,bytes32 indexed batchId,uint32 failureCount,uint32 maxFailures,uint256 protectedRemainder,uint256 blockNumber)"
  ),
  ProtectedRemainderRefunded: parseAbiItem(
    "event ProtectedRemainderRefunded(bytes32 indexed policyId,address indexed funder,uint256 amount,uint256 totalRefunded,uint256 chainId,uint256 blockNumber,uint256 timestamp)"
  ),
  PolicyClosed: parseAbiItem(
    "event PolicyClosed(bytes32 indexed policyId,address indexed funder,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,uint256 blockNumber)"
  ),
});

const DIRECTIVE = Object.freeze({
  0: "NONE",
  1: "PAY",
  2: "WITHHOLD",
  3: "BREAKER",
});

function sameHex(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function pos(log) {
  return {
    block: BigInt(log.blockNumber),
    log: BigInt(log.logIndex),
  };
}

function before(a, b) {
  const x = pos(a);
  const y = pos(b);
  return (
    x.block < y.block ||
    (x.block === y.block && x.log < y.log)
  );
}

function requireOrdered(logs) {
  for (let i = 1; i < logs.length; i += 1) {
    if (!before(logs[i - 1], logs[i])) {
      throw new Error("INVALID_EVENT_ORDER");
    }
  }
}

function evidenceEvent(name, log, extra = {}) {
  return {
    name,
    block_number: String(log.blockNumber),
    log_index: String(log.logIndex),
    transaction_hash: log.transactionHash,
    ...extra,
  };
}

async function uniqueLog(
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
        ":" +
        logs.length
    );
  }

  return logs[0];
}

async function successfulReceipt(client, hash) {
  const receipt = await client.getTransactionReceipt({
    hash,
  });
  if (receipt.status !== "success") {
    throw new Error(
      "TRANSACTION_NOT_SUCCESSFUL:" + hash
    );
  }
  return receipt;
}

async function runtimeCheck(
  client,
  address,
  runtime = {}
) {
  const bytecode = await client.getBytecode({
    address,
  });
  if (!bytecode || bytecode === "0x") {
    throw new Error("NO_DEPLOYED_CODE");
  }

  const observed = keccak256(bytecode);
  if (
    runtime.expected_code_hash &&
    !sameHex(
      observed,
      runtime.expected_code_hash
    )
  ) {
    throw new Error("RUNTIME_CODE_HASH_MISMATCH");
  }

  let deploymentInputBinding = "NOT_CHECKED";

  if (
    runtime.deploy_tx_hash &&
    runtime.expected_init_code_hash
  ) {
    const tx = await client.getTransaction({
      hash: runtime.deploy_tx_hash,
    });
    const receipt =
      await client.getTransactionReceipt({
        hash: runtime.deploy_tx_hash,
      });

    if (receipt.status !== "success") {
      throw new Error(
        "DEPLOY_TRANSACTION_NOT_SUCCESSFUL"
      );
    }

    if (
      !receipt.contractAddress ||
      !sameHex(
        receipt.contractAddress,
        address
      )
    ) {
      throw new Error(
        "DEPLOY_RECEIPT_ADDRESS_MISMATCH"
      );
    }

    const observedInitHash = keccak256(tx.input);
    if (
      !sameHex(
        observedInitHash,
        runtime.expected_init_code_hash
      )
    ) {
      throw new Error(
        "DEPLOY_INIT_CODE_HASH_MISMATCH"
      );
    }

    deploymentInputBinding =
      "DEPLOY_TX_INPUT_MATCH_EXPECTED_INIT_CODE";
  }

  return {
    observed_code_hash: observed,
    expected_code_hash:
      runtime.expected_code_hash ?? null,
    deploy_tx_hash:
      runtime.deploy_tx_hash ?? null,
    expected_init_code_hash:
      runtime.expected_init_code_hash ?? null,
    deployment_input_binding:
      deploymentInputBinding,
    source_commit_claim:
      runtime.source_commit ?? null,
    commit_binding:
      deploymentInputBinding ===
      "DEPLOY_TX_INPUT_MATCH_EXPECTED_INIT_CODE"
        ? "DEPLOY_INPUT_BOUND_TO_EXPECTED_INIT_CODE_COMMIT_REPRODUCIBILITY_STILL_REQUIRED"
        : runtime.expected_code_hash
          ? "CODE_HASH_MATCH_COMMIT_PROVENANCE_STILL_REQUIRED"
          : "CODE_EXISTS_EXPECTED_HASH_NOT_SUPPLIED",
  };
}

export async function verifyIntegratedBatchFromArc(
  config,
  { client = null } = {}
) {
  const rpcUrl =
    config.rpc_url ?? DEFAULT_ARC_MAINNET_RPC;
  const publicClient =
    client ?? makeArcMainnetClient(rpcUrl);

  try {
    const chainId = await publicClient.getChainId();
    if (chainId !== ARC_MAINNET_CHAIN_ID) {
      throw new Error(
        "CHAIN_ID_NOT_ARC_MAINNET:" + chainId
      );
    }

    const address = getAddress(config.address);
    const policyId = config.policy_id;
    const batchId = config.batch_id;
    const fromBlock =
      config.from_block === undefined
        ? 0n
        : BigInt(config.from_block);
    const toBlock =
      config.to_block === undefined
        ? "latest"
        : BigInt(config.to_block);

    const runtime = await runtimeCheck(
      publicClient,
      address,
      config.runtime ?? {}
    );

    const policy = await uniqueLog(publicClient, {
      address,
      event: EVENTS.AssurancePolicyCreated,
      args: { policyId },
      fromBlock,
      toBlock,
      label: "AssurancePolicyCreated",
    });

    const fundedLogs = await publicClient.getLogs({
      address,
      event: EVENTS.PolicyFunded,
      args: { policyId },
      fromBlock,
      toBlock,
      strict: true,
    });

    if (fundedLogs.length === 0) {
      throw new Error("NO_POLICY_FUNDING");
    }

    const committed = await uniqueLog(publicClient, {
      address,
      event: EVENTS.BatchCommitted,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "BatchCommitted",
    });

    const locked = await uniqueLog(publicClient, {
      address,
      event: EVENTS.ProviderOutputLocked,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "ProviderOutputLocked",
    });

    const revealed = await uniqueLog(publicClient, {
      address,
      event: EVENTS.CanaryRevealed,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "CanaryRevealed",
    });

    const resolved = await uniqueLog(publicClient, {
      address,
      event: EVENTS.BatchResolved,
      args: { policyId, batchId },
      fromBlock,
      toBlock,
      label: "BatchResolved",
    });

    requireOrdered([
      policy,
      committed,
      locked,
      revealed,
      resolved,
    ]);

    const preCommitFunding = fundedLogs.filter(
      (entry) => before(entry, committed)
    );
    if (preCommitFunding.length === 0) {
      throw new Error(
        "NO_FUNDING_BEFORE_BATCH_COMMIT"
      );
    }

    preCommitFunding.sort((a, b) => {
      const pa = pos(a);
      const pb = pos(b);
      if (pa.block < pb.block) return -1;
      if (pa.block > pb.block) return 1;
      return pa.log < pb.log ? -1 : pa.log > pb.log ? 1 : 0;
    });

    let fundedSum = 0n;
    for (const funding of preCommitFunding) {
      if (
        !sameHex(
          funding.args.funder,
          policy.args.funder
        )
      ) {
        throw new Error(
          "FUNDING_FUNDER_BINDING_MISMATCH"
        );
      }
      if (
        Number(funding.args.chainId) !==
        ARC_MAINNET_CHAIN_ID
      ) {
        throw new Error(
          "FUNDING_EVENT_CHAIN_ID_MISMATCH"
        );
      }
      fundedSum += BigInt(funding.args.amount);
      if (
        BigInt(funding.args.totalFunded) !==
        fundedSum
      ) {
        throw new Error(
          "FUNDING_TOTAL_MISMATCH"
        );
      }
    }

    const lastFunding =
      preCommitFunding[preCommitFunding.length - 1];

    if (
      BigInt(lastFunding.args.remainingLiability) <
      BigInt(policy.args.unitPayout)
    ) {
      throw new Error(
        "INSUFFICIENT_LIABILITY_BEFORE_COMMIT"
      );
    }

    if (
      Number(policy.args.chainId) !==
      ARC_MAINNET_CHAIN_ID
    ) {
      throw new Error(
        "POLICY_EVENT_CHAIN_ID_MISMATCH"
      );
    }

    if (
      !sameHex(
        policy.args.provider,
        locked.args.provider
      )
    ) {
      throw new Error(
        "PROVIDER_POLICY_BINDING_MISMATCH"
      );
    }

    if (
      !sameHex(
        policy.args.scorerIdHash,
        locked.args.scorerIdHash
      ) ||
      !sameHex(
        policy.args.scorerIdHash,
        revealed.args.scorerIdHash
      )
    ) {
      throw new Error(
        "SCORER_POLICY_BINDING_MISMATCH"
      );
    }

    const lockBlock = await publicClient.getBlock({
      blockNumber: locked.blockNumber,
    });

    const directive =
      DIRECTIVE[Number(resolved.args.directive)];
    if (!directive) {
      throw new Error("UNKNOWN_DIRECTIVE");
    }

    const preCoreBreakerLogs =
      await publicClient.getLogs({
        address,
        event: EVENTS.CircuitBreakerTriggered,
        args: { policyId, batchId },
        fromBlock,
        toBlock,
        strict: true,
      });

    if (preCoreBreakerLogs.length > 1) {
      throw new Error("MULTIPLE_BREAKER_EVENTS");
    }

    const offchain = config.offchain;

    const chainEvents = [
      evidenceEvent(
        "BatchCommitted",
        committed,
        {
          policy_id: committed.args.policyId,
          batch_id: committed.args.batchId,
          commitment: committed.args.commitment,
        }
      ),
      evidenceEvent(
        "ProviderOutputLocked",
        locked,
        {
          block_timestamp: String(lockBlock.timestamp),
          policy_id: locked.args.policyId,
          batch_id: locked.args.batchId,
          work_id: locked.args.workId,
          input_hash: locked.args.inputHash,
          output_hash: locked.args.outputHash,
          scorer_id_hash: locked.args.scorerIdHash,
          provider_digest: locked.args.providerDigest,
          provider: locked.args.provider,
        }
      ),
      evidenceEvent(
        "CanaryRevealed",
        revealed,
        {
          policy_id: revealed.args.policyId,
          batch_id: revealed.args.batchId,
          work_id: revealed.args.workId,
          input_hash: revealed.args.inputHash,
          expected_output_hash: revealed.args.expectedOutputHash,
          scorer_id_hash: revealed.args.scorerIdHash,
          canary_key: revealed.args.canaryKey,
        }
      ),
    ];

    if (preCoreBreakerLogs.length === 1) {
      chainEvents.push(
        evidenceEvent(
          "CircuitBreakerTriggered",
          preCoreBreakerLogs[0],
          {
            policy_id: preCoreBreakerLogs[0].args.policyId,
            batch_id: preCoreBreakerLogs[0].args.batchId,
          }
        )
      );
    }

    chainEvents.push(
      evidenceEvent(
        "BatchResolved",
        resolved,
        {
          policy_id: resolved.args.policyId,
          batch_id: resolved.args.batchId,
          work_id: resolved.args.workId,
          passed: resolved.args.passed,
          directive,
        }
      )
    );

    const packet = {
      version: "ARC_ASSURANCE_EVIDENCE_V1",
      network: {
        chain_id: String(ARC_MAINNET_CHAIN_ID),
        verifying_contract: address,
      },
      work: {
        input_text: offchain.input_text,
        canonical_output: offchain.canonical_output,
        scorer_id: offchain.scorer_id,
      },
      provider: {
        expected_provider: policy.args.provider,
        nonce: String(offchain.nonce),
        deadline: String(offchain.deadline),
        signature: offchain.signature,
      },
      reveal: {
        policy_id: policyId,
        batch_id: batchId,
        work_id: revealed.args.workId,
        expected_output_hash: revealed.args.expectedOutputHash,
        salt: revealed.args.salt,
        commitment: committed.args.commitment,
      },
      chain_events: chainEvents,
      financial_evidence: null,
    };

    const core = await verifyEvidencePacketV1(packet);
          committed,
          {
            policy_id: committed.args.policyId,
            batch_id: committed.args.batchId,
            commitment: committed.args.commitment,
          }
        ),
        evidenceEvent(
          "ProviderOutputLocked",
          locked,
          {
            block_timestamp: String(
              lockBlock.timestamp
            ),
            policy_id: locked.args.policyId,
            batch_id: locked.args.batchId,
            work_id: locked.args.workId,
            input_hash: locked.args.inputHash,
            output_hash: locked.args.outputHash,
            scorer_id_hash:
              locked.args.scorerIdHash,
            provider_digest:
              locked.args.providerDigest,
            provider: locked.args.provider,
          }
        ),
        evidenceEvent(
          "CanaryRevealed",
          revealed,
          {
            policy_id: revealed.args.policyId,
            batch_id: revealed.args.batchId,
            work_id: revealed.args.workId,
            input_hash: revealed.args.inputHash,
            expected_output_hash:
              revealed.args.expectedOutputHash,
            scorer_id_hash:
              revealed.args.scorerIdHash,
            canary_key: revealed.args.canaryKey,
          }
        ),
        evidenceEvent(
          "BatchResolved",
          resolved,
          {
            policy_id: resolved.args.policyId,
            batch_id: resolved.args.batchId,
            work_id: resolved.args.workId,
            passed: resolved.args.passed,
            directive,
          }
        ),
      ],
      financial_evidence: null,
    };

    const core = await verifyEvidencePacketV1(packet);
    if (!core.ok) {
      throw new Error(
        "CORE_CRYPTO_PROOF_FAILED:" +
          (core.error ?? "unknown")
      );
    }

    const paymentLogs = await publicClient.getLogs({
      address,
      event: EVENTS.PaymentReleased,
      args: {
        policyId,
        batchId,
        workId: resolved.args.workId,
      },
      fromBlock,
      toBlock,
      strict: true,
    });

    const withheldLogs = await publicClient.getLogs({
      address,
      event: EVENTS.PaymentWithheld,
      args: {
        policyId,
        batchId,
        workId: resolved.args.workId,
      },
      fromBlock,
      toBlock,
      strict: true,
    });

    const breakerLogs = preCoreBreakerLogs;

    let financialProof;

    if (directive === "PAY") {
      if (
        !resolved.args.passed ||
        paymentLogs.length !== 1 ||
        withheldLogs.length !== 0 ||
        breakerLogs.length !== 0
      ) {
        throw new Error(
          "PASS_FINANCIAL_EVENT_MISMATCH"
        );
      }

      const payment = paymentLogs[0];
      if (
        payment.transactionHash !==
        resolved.transactionHash
      ) {
        throw new Error(
          "PASS_PAYMENT_NOT_ATOMIC_WITH_RESOLVE"
        );
      }
      if (!before(resolved, payment)) {
        throw new Error(
          "PASS_PAYMENT_EVENT_ORDER_INVALID"
        );
      }
      if (
        BigInt(payment.args.amount) !==
        BigInt(policy.args.unitPayout)
      ) {
        throw new Error(
          "PASS_PAYOUT_AMOUNT_MISMATCH"
        );
      }
      if (
        !sameHex(
          payment.args.payoutRecipient,
          policy.args.payoutRecipient
        )
      ) {
        throw new Error(
          "PASS_RECIPIENT_MISMATCH"
        );
      }
      if (
        BigInt(payment.args.protectedRemainder) !==
        BigInt(resolved.args.protectedRemainder)
      ) {
        throw new Error(
          "PASS_REMAINDER_MISMATCH"
        );
      }

      financialProof = {
        status:
          "PASS_RESOLVE_AND_PAYOUT_ATOMIC_ON_ARC",
        transaction_hash:
          resolved.transactionHash,
        amount: String(payment.args.amount),
        recipient:
          payment.args.payoutRecipient,
      };
    } else {
      if (
        resolved.args.passed ||
        paymentLogs.length !== 0 ||
        withheldLogs.length !== 1
      ) {
        throw new Error(
          "FAIL_FINANCIAL_EVENT_MISMATCH"
        );
      }

      const withheld = withheldLogs[0];
      if (
        withheld.transactionHash !==
        resolved.transactionHash
      ) {
        throw new Error(
          "WITHHOLD_NOT_ATOMIC_WITH_RESOLVE"
        );
      }
      if (!before(resolved, withheld)) {
        throw new Error(
          "WITHHOLD_EVENT_ORDER_INVALID"
        );
      }
      if (
        DIRECTIVE[
          Number(withheld.args.directive)
        ] !== directive
      ) {
        throw new Error(
          "WITHHOLD_DIRECTIVE_MISMATCH"
        );
      }

      if (directive === "WITHHOLD") {
        if (breakerLogs.length !== 0) {
          throw new Error(
            "WITHHOLD_HAS_BREAKER_EVENT"
          );
        }
        if (
          Number(resolved.args.failureCount) >=
          Number(policy.args.maxFailures)
        ) {
          throw new Error(
            "WITHHOLD_AT_BREAKER_THRESHOLD"
          );
        }

        financialProof = {
          status:
            "FAIL_RESOLVE_AND_WITHHOLD_ATOMIC_ON_ARC",
          transaction_hash:
            resolved.transactionHash,
          protected_remainder: String(
            resolved.args.protectedRemainder
          ),
        };
      } else if (directive === "BREAKER") {
        if (breakerLogs.length !== 1) {
          throw new Error(
            "BREAKER_EVENT_MISSING"
          );
        }

        const breaker = breakerLogs[0];
        requireOrdered([
          resolved,
          withheld,
          breaker,
        ]);

        if (
          breaker.transactionHash !==
          resolved.transactionHash
        ) {
          throw new Error(
            "BREAKER_NOT_ATOMIC_WITH_RESOLVE"
          );
        }
        if (
          Number(breaker.args.failureCount) <
            Number(breaker.args.maxFailures) ||
          Number(breaker.args.maxFailures) !==
            Number(policy.args.maxFailures)
        ) {
          throw new Error(
            "BREAKER_THRESHOLD_MISMATCH"
          );
        }

        const refundLogs =
          await publicClient.getLogs({
            address,
            event:
              EVENTS.ProtectedRemainderRefunded,
            args: { policyId },
            fromBlock: breaker.blockNumber,
            toBlock,
            strict: true,
          });

        const closedLogs =
          await publicClient.getLogs({
            address,
            event: EVENTS.PolicyClosed,
            args: { policyId },
            fromBlock: breaker.blockNumber,
            toBlock,
            strict: true,
          });

        if (
          refundLogs.length !== 1 ||
          closedLogs.length !== 1
        ) {
          throw new Error(
            "BREAKER_REFUND_OR_CLOSE_MISSING"
          );
        }

        const refund = refundLogs[0];
        const closed = closedLogs[0];

        requireOrdered([
          breaker,
          refund,
          closed,
        ]);

        if (
          refund.transactionHash !==
          closed.transactionHash
        ) {
          throw new Error(
            "REFUND_AND_CLOSE_NOT_ATOMIC"
          );
        }
        if (
          BigInt(refund.args.amount) !==
          BigInt(
            breaker.args.protectedRemainder
          )
        ) {
          throw new Error(
            "BREAKER_REFUND_AMOUNT_MISMATCH"
          );
        }
        if (
          !sameHex(
            refund.args.funder,
            policy.args.funder
          )
        ) {
          throw new Error(
            "BREAKER_REFUND_RECIPIENT_MISMATCH"
          );
        }
        if (
          BigInt(closed.args.totalFunded) !==
          BigInt(closed.args.totalPaidOut) +
            BigInt(closed.args.totalRefunded)
        ) {
          throw new Error(
            "CLOSED_POLICY_VALUE_CONSERVATION_MISMATCH"
          );
        }

        await successfulReceipt(
          publicClient,
          refund.transactionHash
        );

        financialProof = {
          status:
            "BREAKER_WITHHOLD_AND_REFUND_PROVEN_ON_ARC",
          resolve_transaction_hash:
            resolved.transactionHash,
          refund_transaction_hash:
            refund.transactionHash,
          protected_remainder: String(
            breaker.args.protectedRemainder
          ),
        };
      } else {
        throw new Error(
          "NONPAY_DIRECTIVE_UNSUPPORTED"
        );
      }
    }

    const receiptLogs = [
      policy,
      ...preCommitFunding,
      committed,
      locked,
      revealed,
      resolved,
      ...paymentLogs,
      ...withheldLogs,
      ...breakerLogs,
    ];

    const seenReceipts = new Set();
    const causalReceipts = [];
    for (const entry of receiptLogs) {
      if (
        !entry.transactionHash ||
        seenReceipts.has(entry.transactionHash)
      ) {
        continue;
      }
      seenReceipts.add(entry.transactionHash);
      const checked = await successfulReceipt(
        publicClient,
        entry.transactionHash
      );
      causalReceipts.push({
        hash: checked.transactionHash,
        block_number: String(
          checked.blockNumber
        ),
        status: checked.status,
        gas_used: String(checked.gasUsed),
        effective_gas_price:
          checked.effectiveGasPrice === undefined
            ? null
            : String(
                checked.effectiveGasPrice
              ),
      });
    }

    const receipt = await successfulReceipt(
      publicClient,
      resolved.transactionHash
    );

    return {
      ok: true,
      verdict:
        "INTEGRATED_ASSURANCE_CHAIN_PROOF_VALID",
      deterministic_result:
        core.deterministic_result,
      settlement_directive: directive,
      financial_proof: financialProof,
      runtime,
      runtime_commit_binding:
        runtime.commit_binding,
      transaction_receipt: {
        hash: receipt.transactionHash,
        block_number: String(
          receipt.blockNumber
        ),
        status: receipt.status,
        gas_used: String(receipt.gasUsed),
        effective_gas_price:
          receipt.effectiveGasPrice === undefined
            ? null
            : String(receipt.effectiveGasPrice),
      },
      causal_receipts: causalReceipts,
      gate_note:
        "Live G5/G6 promotion still requires exact-head test execution and reproducible source-commit to deployed-bytecode provenance.",
    };
  } catch (error) {
    return {
      ok: false,
      verdict:
        "INTEGRATED_ASSURANCE_CHAIN_PROOF_INVALID",
      error: error?.message ?? String(error),
    };
  }
}
