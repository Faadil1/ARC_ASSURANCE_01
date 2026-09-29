import {
  getAddress,
  hashTypedData,
  keccak256,
  stringToHex,
  verifyTypedData,
} from "viem";
import {
  buildProviderOutputTypedData,
} from "../eip712/provider-output-v1.mjs";
import {
  computeCanaryCommitmentV1,
  computeCanaryKeyV1,
} from "../canary/commitment-v1.mjs";

export const EVIDENCE_VERSION = "ARC_ASSURANCE_EVIDENCE_V1";

const REQUIRED_EVENT_ORDER = Object.freeze([
  "BatchCommitted",
  "ProviderOutputLocked",
  "CanaryRevealed",
  "BatchResolved",
]);

function fail(code, detail = null) {
  return {
    ok: false,
    code,
    detail,
  };
}

function pass(detail = null) {
  return {
    ok: true,
    code: "PASS",
    detail,
  };
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

function toBigInt(value, label) {
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error("INVALID_" + label.toUpperCase());
  }
}

function positionOf(event) {
  return {
    block: toBigInt(event.block_number, "block_number"),
    log: toBigInt(event.log_index, "log_index"),
  };
}

function before(left, right) {
  return (
    left.block < right.block ||
    (left.block === right.block && left.log < right.log)
  );
}

function findUniqueEvent(events, name) {
  const matches = events.filter((event) => event.name === name);
  if (matches.length !== 1) {
    throw new Error(
      "EXPECTED_EXACTLY_ONE_" + name.toUpperCase()
    );
  }
  return matches[0];
}

function normalizeAddress(value) {
  return getAddress(requireString(value, "address"));
}

export function keccakUtf8V1(value) {
  return keccak256(stringToHex(requireString(value, "utf8")));
}

export function verifyEventOrderingV1(events) {
  if (!Array.isArray(events)) {
    return fail("CHAIN_EVENTS_REQUIRED");
  }

  let previous = null;
  const positions = {};

  try {
    for (const name of REQUIRED_EVENT_ORDER) {
      const event = findUniqueEvent(events, name);
      const position = positionOf(event);

      if (previous && !before(previous, position)) {
        return fail("INVALID_EVENT_ORDER", {
          previous: positions[
            REQUIRED_EVENT_ORDER[
              REQUIRED_EVENT_ORDER.indexOf(name) - 1
            ]
          ],
          current: {
            name,
            ...position,
          },
        });
      }

      positions[name] = {
        name,
        block: position.block.toString(),
        log: position.log.toString(),
      };
      previous = position;
    }
  } catch (error) {
    return fail(error.message);
  }

  return pass(positions);
}

function getEvent(events, name) {
  return findUniqueEvent(events, name);
}

export async function verifyEvidencePacketV1(
  packet,
  options = {}
) {
  const checks = {};
  const warnings = [];

  try {
    requireObject(packet, "packet");

    if (packet.version !== EVIDENCE_VERSION) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: "UNSUPPORTED_EVIDENCE_VERSION",
      };
    }

    const network = requireObject(packet.network, "network");
    const work = requireObject(packet.work, "work");
    const provider = requireObject(packet.provider, "provider");
    const reveal = requireObject(packet.reveal, "reveal");

    const chainId = toBigInt(network.chain_id, "chain_id");
    const verifyingContract = normalizeAddress(
      network.verifying_contract
    );
    const expectedProvider = normalizeAddress(
      provider.expected_provider
    );

    if (chainId !== 5042n) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: "CHAIN_ID_NOT_ARC_MAINNET",
      };
    }

    const inputText = requireString(
      work.input_text,
      "input_text"
    );
    const canonicalOutput = requireString(
      work.canonical_output,
      "canonical_output"
    );
    const scorerId = requireString(
      work.scorer_id,
      "scorer_id"
    );

    const computedInputHash = keccakUtf8V1(inputText);
    const computedOutputHash = keccakUtf8V1(
      canonicalOutput
    );
    const computedScorerIdHash = keccakUtf8V1(scorerId);

    checks.input_hash = pass(computedInputHash);
    checks.output_hash = pass(computedOutputHash);
    checks.scorer_id_hash = pass(computedScorerIdHash);

    const message = {
      provider: expectedProvider,
      policyId: requireString(
        reveal.policy_id,
        "policy_id"
      ),
      batchId: requireString(
        reveal.batch_id,
        "batch_id"
      ),
      workId: requireString(
        reveal.work_id,
        "work_id"
      ),
      inputHash: computedInputHash,
      outputHash: computedOutputHash,
      scorerIdHash: computedScorerIdHash,
      nonce: provider.nonce,
      deadline: provider.deadline,
    };

    const typedData = buildProviderOutputTypedData({
      chainId,
      verifyingContract,
      message,
    });

    const digest = hashTypedData(typedData);
    const signature = requireString(
      provider.signature,
      "signature"
    );

    const signatureValid = await verifyTypedData({
      address: expectedProvider,
      ...typedData,
      signature,
    });

    checks.provider_signature = signatureValid
      ? pass({
          provider: expectedProvider,
          digest,
        })
      : fail("INVALID_PROVIDER_SIGNATURE");

    if (!signatureValid) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: "INVALID_PROVIDER_SIGNATURE",
      };
    }

    const expectedOutputHash = requireString(
      reveal.expected_output_hash,
      "expected_output_hash"
    );
    const salt = requireString(reveal.salt, "salt");

    const commitment = computeCanaryCommitmentV1({
      chainId,
      verifyingContract,
      policyId: message.policyId,
      batchId: message.batchId,
      workId: message.workId,
      inputHash: computedInputHash,
      expectedOutputHash,
      scorerIdHash: computedScorerIdHash,
      salt,
    });

    const suppliedCommitment = requireString(
      reveal.commitment,
      "commitment"
    );

    checks.canary_commitment =
      commitment.toLowerCase() ===
      suppliedCommitment.toLowerCase()
        ? pass(commitment)
        : fail("CANARY_COMMITMENT_MISMATCH", {
            computed: commitment,
            supplied: suppliedCommitment,
          });

    if (!checks.canary_commitment.ok) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: "CANARY_COMMITMENT_MISMATCH",
      };
    }

    const canaryKey = computeCanaryKeyV1({
      inputHash: computedInputHash,
      expectedOutputHash,
      scorerIdHash: computedScorerIdHash,
    });

    checks.canary_key = pass(canaryKey);

    const ordering = verifyEventOrderingV1(
      packet.chain_events
    );
    checks.event_order = ordering;

    if (!ordering.ok) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: ordering.code,
      };
    }

    const committedEvent = getEvent(
      packet.chain_events,
      "BatchCommitted"
    );
    const lockedEvent = getEvent(
      packet.chain_events,
      "ProviderOutputLocked"
    );
    const revealedEvent = getEvent(
      packet.chain_events,
      "CanaryRevealed"
    );
    const resolvedEvent = getEvent(
      packet.chain_events,
      "BatchResolved"
    );

    const eventBindings = [
      [
        "BatchCommitted.commitment",
        committedEvent.commitment,
        commitment,
      ],
      [
        "ProviderOutputLocked.policy_id",
        lockedEvent.policy_id,
        message.policyId,
      ],
      [
        "ProviderOutputLocked.batch_id",
        lockedEvent.batch_id,
        message.batchId,
      ],
      [
        "ProviderOutputLocked.work_id",
        lockedEvent.work_id,
        message.workId,
      ],
      [
        "ProviderOutputLocked.input_hash",
        lockedEvent.input_hash,
        computedInputHash,
      ],
      [
        "ProviderOutputLocked.output_hash",
        lockedEvent.output_hash,
        computedOutputHash,
      ],
      [
        "ProviderOutputLocked.scorer_id_hash",
        lockedEvent.scorer_id_hash,
        computedScorerIdHash,
      ],
      [
        "ProviderOutputLocked.provider_digest",
        lockedEvent.provider_digest,
        digest,
      ],
      [
        "CanaryRevealed.expected_output_hash",
        revealedEvent.expected_output_hash,
        expectedOutputHash,
      ],
      [
        "CanaryRevealed.canary_key",
        revealedEvent.canary_key,
        canaryKey,
      ],
    ];

    const mismatches = eventBindings
      .filter(([, actual, expected]) => {
        if (
          typeof actual !== "string" ||
          typeof expected !== "string"
        ) {
          return actual !== expected;
        }
        return actual.toLowerCase() !== expected.toLowerCase();
      })
      .map(([field, actual, expected]) => ({
        field,
        actual,
        expected,
      }));

    checks.event_bindings =
      mismatches.length === 0
        ? pass()
        : fail("EVENT_BINDING_MISMATCH", mismatches);

    if (!checks.event_bindings.ok) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: "EVENT_BINDING_MISMATCH",
      };
    }

    const passed =
      computedOutputHash.toLowerCase() ===
      expectedOutputHash.toLowerCase();

    const expectedDirective = passed
      ? "PAY"
      : String(resolvedEvent.directive);

    if (
      Boolean(resolvedEvent.passed) !== passed
    ) {
      checks.deterministic_verdict = fail(
        "RESOLVED_PASS_FLAG_MISMATCH",
        {
          computed_passed: passed,
          chain_passed: resolvedEvent.passed,
        }
      );
    } else {
      checks.deterministic_verdict = pass({
        passed,
        expected_output_hash: expectedOutputHash,
        actual_output_hash: computedOutputHash,
        directive: expectedDirective,
      });
    }

    if (!checks.deterministic_verdict.ok) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: checks.deterministic_verdict.code,
      };
    }

    const lockedTimestamp =
      lockedEvent.block_timestamp === undefined
        ? null
        : toBigInt(
            lockedEvent.block_timestamp,
            "locked_block_timestamp"
          );

    const deadline = toBigInt(
      provider.deadline,
      "deadline"
    );

    if (lockedTimestamp !== null) {
      checks.signature_deadline =
        lockedTimestamp <= deadline
          ? pass({
              locked_timestamp:
                lockedTimestamp.toString(),
              deadline: deadline.toString(),
            })
          : fail("OUTPUT_LOCKED_AFTER_SIGNATURE_DEADLINE");
    } else {
      checks.signature_deadline = pass({
        status: "NOT_RECHECKED_NO_BLOCK_TIMESTAMP",
        note:
          "The on-chain contract is expected to have enforced deadline at lock time.",
      });
      warnings.push(
        "ProviderOutputLocked.block_timestamp missing; deadline not independently rechecked."
      );
    }

    if (!checks.signature_deadline.ok) {
      return {
        ok: false,
        verdict: "INVALID_EVIDENCE",
        checks,
        warnings,
        error: checks.signature_deadline.code,
      };
    }

    const financial = packet.financial_evidence ?? null;
    let financialCausality = "NOT_PROVEN";

    if (financial === null) {
      warnings.push(
        "No financial evidence supplied. Settlement directive is not a USDC receipt."
      );
    } else if (
      financial.status === "LIVE_ARC_MAINNET_VERIFIED"
    ) {
      financialCausality =
        "CLAIMED_LIVE_REQUIRES_CHAIN_VERIFIER";
      warnings.push(
        "Packet-only verifier does not independently query Arc RPC yet; financial claim remains unpromoted."
      );
    } else {
      financialCausality = String(
        financial.status ?? "NOT_PROVEN"
      );
    }

    const requireFinancial =
      options.requireFinancial === true;

    const proofVerdict = passed ? "PASS" : "FAIL";

    return {
      ok:
        !requireFinancial ||
        financialCausality === "PROVEN",
      verdict:
        requireFinancial &&
        financialCausality !== "PROVEN"
          ? "CORE_PROOF_VALID_FINANCIAL_CAUSALITY_NOT_PROVEN"
          : "CORE_PROOF_VALID",
      deterministic_result: proofVerdict,
      settlement_directive: String(
        resolvedEvent.directive
      ),
      financial_causality: financialCausality,
      provider_digest: digest,
      commitment,
      canary_key: canaryKey,
      checks,
      warnings,
    };
  } catch (error) {
    return {
      ok: false,
      verdict: "INVALID_EVIDENCE",
      checks,
      warnings,
      error: error?.message ?? String(error),
    };
  }
}
