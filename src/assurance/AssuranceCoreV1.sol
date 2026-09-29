// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProviderOutputEIP712} from "../eip712/ProviderOutputEIP712.sol";

/// @title AssuranceCoreV1
/// @notice Non-custodial assurance state machine for the invoice-v1 MVP.
/// @dev This contract intentionally does NOT move money. It proves the ordering:
///      hidden precommit -> signed provider output lock -> reveal -> deterministic
///      resolve, and emits a settlement directive for later custody integration.
///
///      Financial causality remains unproven until a real Arc mainnet custody
///      contract consumes these directives and real USDC moves/does not move.
contract AssuranceCoreV1 is ProviderOutputEIP712 {
    enum BatchState {
        None,
        Committed,
        OutputLocked,
        Revealed,
        Resolved
    }

    enum SettlementDirective {
        NONE,
        PAY,
        WITHHOLD,
        BREAKER
    }

    struct Policy {
        address principal;
        address provider;
        bytes32 scorerIdHash;
        uint32 maxFailures;
        uint32 failureCount;
        bool paused;
        bool exists;
        bytes32 activeBatchId;
    }

    struct Batch {
        bytes32 commitment;
        bytes32 workId;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 expectedOutputHash;
        bytes32 providerDigest;
        BatchState state;
        SettlementDirective directive;
        uint256 committedAtBlock;
        uint256 outputLockedAtBlock;
        uint256 revealedAtBlock;
        uint256 resolvedAtBlock;
    }

    bytes32 public constant CANARY_COMMITMENT_TYPEHASH = keccak256(
        "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)"
    );

    mapping(bytes32 => Policy) private _policies;
    mapping(bytes32 => mapping(bytes32 => Batch)) private _batches;
    mapping(bytes32 => bool) private _usedWorkId;
    mapping(bytes32 => bool) private _usedCanaryKey;

    error ZeroIdentifier();
    error InvalidProvider();
    error InvalidScorer();
    error InvalidFailureThreshold();
    error PolicyAlreadyExists(bytes32 policyId);
    error PolicyNotFound(bytes32 policyId);
    error NotPolicyPrincipal(address expected, address actual);
    error PolicyPaused(bytes32 policyId);
    error ActiveBatchExists(bytes32 activeBatchId);
    error BatchAlreadyExists(bytes32 batchId);
    error BatchNotFound(bytes32 batchId);
    error InvalidBatchState(BatchState expected, BatchState actual);
    error OutputPolicyMismatch(bytes32 expected, bytes32 actual);
    error OutputBatchMismatch(bytes32 expected, bytes32 actual);
    error OutputScorerMismatch(bytes32 expected, bytes32 actual);
    error WorkIdAlreadyUsed(bytes32 workId);
    error WorkIdMismatch(bytes32 expected, bytes32 actual);
    error InputHashMismatch(bytes32 expected, bytes32 actual);
    error CommitmentMismatch(bytes32 expected, bytes32 actual);
    error CanaryAlreadyUsed(bytes32 canaryKey);

    event PolicyCreated(
        bytes32 indexed policyId,
        address indexed principal,
        address indexed provider,
        bytes32 scorerIdHash,
        uint32 maxFailures
    );

    event BatchCommitted(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 commitment,
        uint256 blockNumber
    );

    event ProviderOutputLocked(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 scorerIdHash,
        bytes32 providerDigest,
        address provider,
        uint256 blockNumber
    );

    event CanaryRevealed(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 scorerIdHash,
        bytes32 salt,
        bytes32 canaryKey,
        uint256 blockNumber
    );

    event BatchResolved(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        bool passed,
        SettlementDirective directive,
        uint32 failureCount,
        uint256 blockNumber
    );

    event CircuitBreakerTriggered(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        uint32 failureCount,
        uint32 maxFailures,
        uint256 blockNumber
    );

    modifier policyExists(bytes32 policyId) {
        if (!_policies[policyId].exists) {
            revert PolicyNotFound(policyId);
        }
        _;
    }

    modifier onlyPrincipal(bytes32 policyId) {
        address expected = _policies[policyId].principal;
        if (msg.sender != expected) {
            revert NotPolicyPrincipal(expected, msg.sender);
        }
        _;
    }

    function createPolicy(
        bytes32 policyId,
        address provider,
        bytes32 scorerIdHash,
        uint32 maxFailures
    ) external {
        if (policyId == bytes32(0)) revert ZeroIdentifier();
        if (provider == address(0)) revert InvalidProvider();
        if (scorerIdHash == bytes32(0)) revert InvalidScorer();
        if (maxFailures == 0) revert InvalidFailureThreshold();
        if (_policies[policyId].exists) {
            revert PolicyAlreadyExists(policyId);
        }

        _policies[policyId] = Policy({
            principal: msg.sender,
            provider: provider,
            scorerIdHash: scorerIdHash,
            maxFailures: maxFailures,
            failureCount: 0,
            paused: false,
            exists: true,
            activeBatchId: bytes32(0)
        });

        emit PolicyCreated(
            policyId,
            msg.sender,
            provider,
            scorerIdHash,
            maxFailures
        );
    }

    /// @notice Stores only the opaque hidden-canary commitment.
    /// @dev V1 deliberately permits one unresolved batch per policy so a breaker
    ///      cannot be bypassed by pre-committing many future batches.
    function commitBatch(bytes32 policyId, bytes32 batchId, bytes32 commitment)
        external
        policyExists(policyId)
        onlyPrincipal(policyId)
    {
        Policy storage policy = _policies[policyId];

        if (policy.paused) revert PolicyPaused(policyId);
        if (batchId == bytes32(0) || commitment == bytes32(0)) {
            revert ZeroIdentifier();
        }
        if (policy.activeBatchId != bytes32(0)) {
            revert ActiveBatchExists(policy.activeBatchId);
        }
        if (_batches[policyId][batchId].state != BatchState.None) {
            revert BatchAlreadyExists(batchId);
        }

        Batch storage batch = _batches[policyId][batchId];
        batch.commitment = commitment;
        batch.state = BatchState.Committed;
        batch.committedAtBlock = block.number;

        policy.activeBatchId = batchId;

        emit BatchCommitted(
            policyId,
            batchId,
            commitment,
            block.number
        );
    }

    /// @notice Locks a provider-signed canonical output before canary reveal.
    function lockProviderOutput(
        ProviderOutput calldata output,
        bytes calldata signature
    ) external returns (bytes32 digest) {
        Policy storage policy = _policies[output.policyId];
        if (!policy.exists) revert PolicyNotFound(output.policyId);
        if (policy.paused) revert PolicyPaused(output.policyId);

        bytes32 activeBatchId = policy.activeBatchId;
        if (activeBatchId == bytes32(0)) {
            revert BatchNotFound(output.batchId);
        }
        if (output.batchId != activeBatchId) {
            revert OutputBatchMismatch(activeBatchId, output.batchId);
        }

        Batch storage batch = _batches[output.policyId][output.batchId];
        if (batch.state != BatchState.Committed) {
            revert InvalidBatchState(
                BatchState.Committed,
                batch.state
            );
        }
        if (output.scorerIdHash != policy.scorerIdHash) {
            revert OutputScorerMismatch(
                policy.scorerIdHash,
                output.scorerIdHash
            );
        }
        if (_usedWorkId[output.workId]) {
            revert WorkIdAlreadyUsed(output.workId);
        }

        digest = _verifyAndConsumeProviderOutput(
            output,
            signature,
            policy.provider
        );

        _usedWorkId[output.workId] = true;

        batch.workId = output.workId;
        batch.inputHash = output.inputHash;
        batch.outputHash = output.outputHash;
        batch.providerDigest = digest;
        batch.state = BatchState.OutputLocked;
        batch.outputLockedAtBlock = block.number;

        emit ProviderOutputLocked(
            output.policyId,
            output.batchId,
            output.workId,
            output.inputHash,
            output.outputHash,
            output.scorerIdHash,
            digest,
            policy.provider,
            block.number
        );
    }

    /// @notice Reveals the previously hidden canary material after output lock.
    function revealCanary(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    )
        external
        policyExists(policyId)
        onlyPrincipal(policyId)
        returns (bytes32 canaryKey)
    {
        Policy storage policy = _policies[policyId];
        Batch storage batch = _batches[policyId][batchId];

        if (batch.state == BatchState.None) {
            revert BatchNotFound(batchId);
        }
        if (batch.state != BatchState.OutputLocked) {
            revert InvalidBatchState(
                BatchState.OutputLocked,
                batch.state
            );
        }
        if (workId != batch.workId) {
            revert WorkIdMismatch(batch.workId, workId);
        }
        if (inputHash != batch.inputHash) {
            revert InputHashMismatch(batch.inputHash, inputHash);
        }
        if (
            expectedOutputHash == bytes32(0) ||
            salt == bytes32(0)
        ) {
            revert ZeroIdentifier();
        }

        bytes32 revealedCommitment = computeCanaryCommitment(
            policyId,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            policy.scorerIdHash,
            salt
        );

        if (revealedCommitment != batch.commitment) {
            revert CommitmentMismatch(
                batch.commitment,
                revealedCommitment
            );
        }

        canaryKey = computeCanaryKey(
            inputHash,
            expectedOutputHash,
            policy.scorerIdHash
        );

        if (_usedCanaryKey[canaryKey]) {
            revert CanaryAlreadyUsed(canaryKey);
        }
        _usedCanaryKey[canaryKey] = true;

        batch.expectedOutputHash = expectedOutputHash;
        batch.state = BatchState.Revealed;
        batch.revealedAtBlock = block.number;

        emit CanaryRevealed(
            policyId,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            policy.scorerIdHash,
            salt,
            canaryKey,
            block.number
        );
    }

    /// @notice Deterministically resolves a revealed batch.
    /// @dev This records a directive only. No value is transferred here.
    function resolveBatch(bytes32 policyId, bytes32 batchId)
        external
        policyExists(policyId)
        returns (SettlementDirective directive)
    {
        Policy storage policy = _policies[policyId];
        Batch storage batch = _batches[policyId][batchId];

        if (batch.state == BatchState.None) {
            revert BatchNotFound(batchId);
        }
        if (batch.state != BatchState.Revealed) {
            revert InvalidBatchState(
                BatchState.Revealed,
                batch.state
            );
        }

        bool passed =
            batch.outputHash == batch.expectedOutputHash;

        if (passed) {
            directive = SettlementDirective.PAY;
        } else {
            unchecked {
                policy.failureCount += 1;
            }

            if (policy.failureCount >= policy.maxFailures) {
                policy.paused = true;
                directive = SettlementDirective.BREAKER;

                emit CircuitBreakerTriggered(
                    policyId,
                    batchId,
                    policy.failureCount,
                    policy.maxFailures,
                    block.number
                );
            } else {
                directive = SettlementDirective.WITHHOLD;
            }
        }

        batch.directive = directive;
        batch.state = BatchState.Resolved;
        batch.resolvedAtBlock = block.number;
        policy.activeBatchId = bytes32(0);

        emit BatchResolved(
            policyId,
            batchId,
            batch.workId,
            passed,
            directive,
            policy.failureCount,
            block.number
        );
    }

    /// @notice Computes the opaque commitment before work begins.
    function computeCanaryCommitment(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 scorerIdHash,
        bytes32 salt
    ) public view returns (bytes32) {
        if (
            policyId == bytes32(0) ||
            batchId == bytes32(0) ||
            workId == bytes32(0) ||
            inputHash == bytes32(0) ||
            expectedOutputHash == bytes32(0) ||
            scorerIdHash == bytes32(0) ||
            salt == bytes32(0)
        ) {
            revert ZeroIdentifier();
        }

        return keccak256(
            abi.encode(
                CANARY_COMMITMENT_TYPEHASH,
                block.chainid,
                address(this),
                policyId,
                batchId,
                workId,
                inputHash,
                expectedOutputHash,
                scorerIdHash,
                salt
            )
        );
    }

    /// @notice Fingerprint used to prevent exact canary reuse after reveal.
    function computeCanaryKey(
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 scorerIdHash
    ) public pure returns (bytes32) {
        if (
            inputHash == bytes32(0) ||
            expectedOutputHash == bytes32(0) ||
            scorerIdHash == bytes32(0)
        ) {
            revert ZeroIdentifier();
        }

        return keccak256(
            abi.encode(
                inputHash,
                expectedOutputHash,
                scorerIdHash
            )
        );
    }

    function getPolicy(bytes32 policyId)
        external
        view
        policyExists(policyId)
        returns (Policy memory)
    {
        return _policies[policyId];
    }

    function getBatch(bytes32 policyId, bytes32 batchId)
        external
        view
        policyExists(policyId)
        returns (Batch memory)
    {
        Batch memory batch = _batches[policyId][batchId];
        if (batch.state == BatchState.None) {
            revert BatchNotFound(batchId);
        }
        return batch;
    }

    function workIdUsed(bytes32 workId)
        external
        view
        returns (bool)
    {
        return _usedWorkId[workId];
    }

    function canaryKeyUsed(bytes32 canaryKey)
        external
        view
        returns (bool)
    {
        return _usedCanaryKey[canaryKey];
    }
}
