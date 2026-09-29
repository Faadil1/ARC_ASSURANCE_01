// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProviderOutputEIP712} from "../eip712/ProviderOutputEIP712.sol";

/// @title AssuranceVault
/// @notice Integrated Arc-native custody + hidden-canary assurance state machine.
/// @dev Native Arc USDC (18-decimal msg.value units) is the custody asset.
///      The ONLY provider payout path is resolveBatch() after:
///
///      precommit -> signed output lock -> reveal -> deterministic PASS.
///
///      A FAIL has no payout path for that batch. Repeated configured failures
///      trigger a breaker that blocks new batches and makes the protected
///      remainder refundable to the immutable funder.
///
///      This is a BUILD CANDIDATE until exact-head tests and real Arc mainnet
///      receipts prove the behavior.
contract AssuranceVault is ProviderOutputEIP712 {
    enum BatchState {
        None,
        Committed,
        OutputLocked,
        Revealed,
        Resolved,
        Cancelled
    }

    enum SettlementDirective {
        NONE,
        PAY,
        WITHHOLD,
        BREAKER
    }

    struct Policy {
        address funder;
        address provider;
        address payoutRecipient;
        bytes32 scorerIdHash;
        uint32 maxFailures;
        uint32 failureCount;
        uint256 maxSpendCap;
        uint256 unitPayout;
        uint64 expiry;
        uint64 createdAt;
        uint64 fundedAt;
        uint256 totalFunded;
        uint256 totalPaidOut;
        uint256 totalRefunded;
        bool paused;
        bool closed;
        bool refundIssued;
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

    address public immutable authority;
    uint256 public immutable expectedChainId;
    address public immutable usdcErc20Interface;
    uint256 public immutable deploymentSpendCap;

    mapping(bytes32 => Policy) private _policies;
    mapping(bytes32 => mapping(bytes32 => Batch)) private _batches;
    mapping(bytes32 => bool) private _usedWorkId;
    mapping(bytes32 => bool) private _usedCanaryKey;

    uint256 public totalCustodyReceived;
    uint256 public totalValueReleased;
    uint256 public totalLiability;
    uint256 public policyCount;

    uint256 private _lock = 1;

    error NotAuthority();
    error NotFunder(address expected, address actual);
    error WrongChain(uint256 expected, uint256 actual);
    error ZeroAddress();
    error ZeroIdentifier();
    error ZeroAmount();
    error InvalidScorer();
    error InvalidFailureThreshold();
    error PolicyAlreadyExists(bytes32 policyId);
    error PolicyNotFound(bytes32 policyId);
    error PolicyPaused(bytes32 policyId);
    error PolicyClosed(bytes32 policyId);
    error PolicyExpired(uint64 expiry, uint64 nowTs);
    error PolicyNotExpired(uint64 expiry, uint64 nowTs);
    error ActiveBatchExists(bytes32 activeBatchId);
    error BatchAlreadyExists(bytes32 batchId);
    error BatchNotFound(bytes32 batchId);
    error InvalidBatchState(BatchState expected, BatchState actual);
    error OutputBatchMismatch(bytes32 expected, bytes32 actual);
    error OutputScorerMismatch(bytes32 expected, bytes32 actual);
    error WorkIdAlreadyUsed(bytes32 workId);
    error WorkIdMismatch(bytes32 expected, bytes32 actual);
    error InputHashMismatch(bytes32 expected, bytes32 actual);
    error CommitmentMismatch(bytes32 expected, bytes32 actual);
    error CanaryAlreadyUsed(bytes32 canaryKey);
    error SpendCapExceeded(uint256 requested, uint256 cap);
    error UnitPayoutExceeded(uint256 unitPayout, uint256 cap);
    error InsufficientPolicyLiability(uint256 requested, uint256 available);
    error InsufficientVaultBalance(uint256 requested, uint256 available);
    error DirectFundingDisabled();
    error NativeTransferFailed(address to, uint256 amount);
    error ReentrantCall();
    error NothingToRefund();
    error RefundNotAvailable();
    error RefundAlreadyIssued();

    event AssurancePolicyCreated(
        bytes32 indexed policyId,
        address indexed funder,
        address indexed provider,
        address payoutRecipient,
        bytes32 scorerIdHash,
        uint32 maxFailures,
        uint256 maxSpendCap,
        uint256 unitPayout,
        uint64 expiry,
        uint256 chainId,
        uint256 blockNumber,
        uint256 timestamp
    );

    event PolicyFunded(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 amount,
        uint256 totalFunded,
        uint256 remainingLiability,
        uint256 chainId,
        uint256 blockNumber,
        uint256 timestamp
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
        uint256 protectedRemainder,
        uint256 blockNumber
    );

    event PaymentReleased(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        address payoutRecipient,
        uint256 amount,
        uint256 protectedRemainder,
        uint256 totalPaidOut,
        uint256 chainId,
        uint256 blockNumber,
        uint256 timestamp
    );

    event PaymentWithheld(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        SettlementDirective directive,
        uint256 protectedRemainder,
        uint32 failureCount,
        uint256 chainId,
        uint256 blockNumber
    );

    event CircuitBreakerTriggered(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        uint32 failureCount,
        uint32 maxFailures,
        uint256 protectedRemainder,
        uint256 blockNumber
    );

    event ExpiredBatchCancelled(
        bytes32 indexed policyId,
        bytes32 indexed batchId,
        bytes32 indexed workId,
        BatchState previousState,
        uint256 protectedRemainder,
        uint256 blockNumber
    );

    event ProtectedRemainderRefunded(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 amount,
        uint256 totalRefunded,
        uint256 chainId,
        uint256 blockNumber,
        uint256 timestamp
    );

    event PolicyClosed(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 totalFunded,
        uint256 totalPaidOut,
        uint256 totalRefunded,
        uint256 blockNumber
    );

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    modifier onExpectedChain() {
        if (block.chainid != expectedChainId) {
            revert WrongChain(expectedChainId, block.chainid);
        }
        _;
    }

    modifier policyExists(bytes32 policyId) {
        if (!_policies[policyId].exists) {
            revert PolicyNotFound(policyId);
        }
        _;
    }

    modifier onlyFunder(bytes32 policyId) {
        address expected = _policies[policyId].funder;
        if (msg.sender != expected) {
            revert NotFunder(expected, msg.sender);
        }
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert ReentrantCall();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(
        address authority_,
        uint256 expectedChainId_,
        address usdcErc20Interface_,
        uint256 deploymentSpendCap_
    ) {
        if (
            authority_ == address(0) ||
            usdcErc20Interface_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (expectedChainId_ == 0 || deploymentSpendCap_ == 0) {
            revert ZeroAmount();
        }

        authority = authority_;
        expectedChainId = expectedChainId_;
        usdcErc20Interface = usdcErc20Interface_;
        deploymentSpendCap = deploymentSpendCap_;
    }

    function createPolicy(
        bytes32 policyId,
        address funder,
        address provider,
        address payoutRecipient,
        bytes32 scorerIdHash,
        uint32 maxFailures,
        uint256 maxSpendCap,
        uint256 unitPayout,
        uint64 expiry
    ) external onlyAuthority onExpectedChain {
        if (policyId == bytes32(0)) revert ZeroIdentifier();
        if (_policies[policyId].exists) {
            revert PolicyAlreadyExists(policyId);
        }
        if (
            funder == address(0) ||
            provider == address(0) ||
            payoutRecipient == address(0) ||
            payoutRecipient == address(this)
        ) {
            revert ZeroAddress();
        }
        if (scorerIdHash == bytes32(0)) revert InvalidScorer();
        if (maxFailures == 0) revert InvalidFailureThreshold();
        if (maxSpendCap == 0 || unitPayout == 0) revert ZeroAmount();
        if (unitPayout > maxSpendCap) {
            revert UnitPayoutExceeded(unitPayout, maxSpendCap);
        }
        if (maxSpendCap > deploymentSpendCap) {
            revert SpendCapExceeded(maxSpendCap, deploymentSpendCap);
        }
        if (expiry == 0 || expiry <= block.timestamp) {
            revert PolicyExpired(expiry, uint64(block.timestamp));
        }

        _policies[policyId] = Policy({
            funder: funder,
            provider: provider,
            payoutRecipient: payoutRecipient,
            scorerIdHash: scorerIdHash,
            maxFailures: maxFailures,
            failureCount: 0,
            maxSpendCap: maxSpendCap,
            unitPayout: unitPayout,
            expiry: expiry,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            totalFunded: 0,
            totalPaidOut: 0,
            totalRefunded: 0,
            paused: false,
            closed: false,
            refundIssued: false,
            exists: true,
            activeBatchId: bytes32(0)
        });

        unchecked {
            ++policyCount;
        }

        emit AssurancePolicyCreated(
            policyId,
            funder,
            provider,
            payoutRecipient,
            scorerIdHash,
            maxFailures,
            maxSpendCap,
            unitPayout,
            expiry,
            block.chainid,
            block.number,
            block.timestamp
        );
    }

    function fund(bytes32 policyId)
        external
        payable
        onExpectedChain
        nonReentrant
        policyExists(policyId)
        onlyFunder(policyId)
    {
        Policy storage policy = _policies[policyId];

        _assertPolicyUsable(policyId, policy);
        if (msg.value == 0) revert ZeroAmount();

        uint256 fundedTotal = policy.totalFunded + msg.value;
        if (fundedTotal > policy.maxSpendCap) {
            revert SpendCapExceeded(
                fundedTotal,
                policy.maxSpendCap
            );
        }

        uint256 deploymentTotal =
            totalCustodyReceived + msg.value;
        if (deploymentTotal > deploymentSpendCap) {
            revert SpendCapExceeded(
                deploymentTotal,
                deploymentSpendCap
            );
        }

        policy.totalFunded = fundedTotal;
        policy.fundedAt = uint64(block.timestamp);
        totalCustodyReceived = deploymentTotal;
        totalLiability += msg.value;

        emit PolicyFunded(
            policyId,
            msg.sender,
            msg.value,
            fundedTotal,
            _remaining(policy),
            block.chainid,
            block.number,
            block.timestamp
        );
    }

    function commitBatch(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 commitment
    )
        external
        onExpectedChain
        policyExists(policyId)
        onlyFunder(policyId)
    {
        Policy storage policy = _policies[policyId];
        _assertPolicyUsable(policyId, policy);

        if (batchId == bytes32(0) || commitment == bytes32(0)) {
            revert ZeroIdentifier();
        }
        if (policy.activeBatchId != bytes32(0)) {
            revert ActiveBatchExists(policy.activeBatchId);
        }
        if (_batches[policyId][batchId].state != BatchState.None) {
            revert BatchAlreadyExists(batchId);
        }

        uint256 remaining = _remaining(policy);
        if (remaining < policy.unitPayout) {
            revert InsufficientPolicyLiability(
                policy.unitPayout,
                remaining
            );
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

    function lockProviderOutput(
        ProviderOutput calldata output,
        bytes calldata signature
    )
        external
        onExpectedChain
        policyExists(output.policyId)
        returns (bytes32 digest)
    {
        Policy storage policy = _policies[output.policyId];
        _assertPolicyUsable(output.policyId, policy);

        if (policy.activeBatchId == bytes32(0)) {
            revert BatchNotFound(output.batchId);
        }
        if (output.batchId != policy.activeBatchId) {
            revert OutputBatchMismatch(
                policy.activeBatchId,
                output.batchId
            );
        }

        Batch storage batch =
            _batches[output.policyId][output.batchId];
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

    function revealCanary(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    )
        external
        onExpectedChain
        policyExists(policyId)
        onlyFunder(policyId)
        returns (bytes32 canaryKey)
    {
        Policy storage policy = _policies[policyId];
        _assertPolicyUsable(policyId, policy);

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
            revert InputHashMismatch(
                batch.inputHash,
                inputHash
            );
        }
        if (
            expectedOutputHash == bytes32(0) ||
            salt == bytes32(0)
        ) {
            revert ZeroIdentifier();
        }

        bytes32 revealedCommitment =
            computeCanaryCommitment(
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

    /// @notice Resolve one revealed batch and apply its financial consequence.
    /// @dev This is the ONLY provider payout path in the contract.
    function resolveBatch(bytes32 policyId, bytes32 batchId)
        external
        onExpectedChain
        nonReentrant
        policyExists(policyId)
        returns (SettlementDirective directive)
    {
        Policy storage policy = _policies[policyId];
        _assertPolicyUsable(policyId, policy);

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
        uint256 remainingBefore = _remaining(policy);

        if (passed) {
            uint256 amount = policy.unitPayout;
            if (amount > remainingBefore) {
                revert InsufficientPolicyLiability(
                    amount,
                    remainingBefore
                );
            }
            if (amount > address(this).balance) {
                revert InsufficientVaultBalance(
                    amount,
                    address(this).balance
                );
            }

            directive = SettlementDirective.PAY;

            policy.totalPaidOut += amount;
            totalValueReleased += amount;
            totalLiability -= amount;

            batch.directive = directive;
            batch.state = BatchState.Resolved;
            batch.resolvedAtBlock = block.number;
            policy.activeBatchId = bytes32(0);

            uint256 protectedRemainder = _remaining(policy);

            emit BatchResolved(
                policyId,
                batchId,
                batch.workId,
                true,
                directive,
                policy.failureCount,
                protectedRemainder,
                block.number
            );

            _send(policy.payoutRecipient, amount);

            emit PaymentReleased(
                policyId,
                batchId,
                batch.workId,
                policy.payoutRecipient,
                amount,
                protectedRemainder,
                policy.totalPaidOut,
                block.chainid,
                block.number,
                block.timestamp
            );
        } else {
            unchecked {
                policy.failureCount += 1;
            }

            if (policy.failureCount >= policy.maxFailures) {
                policy.paused = true;
                directive = SettlementDirective.BREAKER;
            } else {
                directive = SettlementDirective.WITHHOLD;
            }

            batch.directive = directive;
            batch.state = BatchState.Resolved;
            batch.resolvedAtBlock = block.number;
            policy.activeBatchId = bytes32(0);

            uint256 protectedRemainder = _remaining(policy);

            emit BatchResolved(
                policyId,
                batchId,
                batch.workId,
                false,
                directive,
                policy.failureCount,
                protectedRemainder,
                block.number
            );

            emit PaymentWithheld(
                policyId,
                batchId,
                batch.workId,
                directive,
                protectedRemainder,
                policy.failureCount,
                block.chainid,
                block.number
            );

            if (directive == SettlementDirective.BREAKER) {
                emit CircuitBreakerTriggered(
                    policyId,
                    batchId,
                    policy.failureCount,
                    policy.maxFailures,
                    protectedRemainder,
                    block.number
                );
            }
        }
    }

    /// @notice Recover an unresolved batch after policy expiry.
    /// @dev Handles failed payout recipients or abandoned execution without
    ///      silently allowing a post-expiry payout.
    function cancelExpiredBatch(
        bytes32 policyId,
        bytes32 batchId
    )
        external
        onExpectedChain
        policyExists(policyId)
        onlyFunder(policyId)
    {
        Policy storage policy = _policies[policyId];

        if (block.timestamp <= policy.expiry) {
            revert PolicyNotExpired(
                policy.expiry,
                uint64(block.timestamp)
            );
        }
        if (policy.activeBatchId != batchId) {
            revert OutputBatchMismatch(
                policy.activeBatchId,
                batchId
            );
        }

        Batch storage batch = _batches[policyId][batchId];
        if (
            batch.state == BatchState.None ||
            batch.state == BatchState.Resolved ||
            batch.state == BatchState.Cancelled
        ) {
            revert InvalidBatchState(
                BatchState.Revealed,
                batch.state
            );
        }

        BatchState previous = batch.state;
        batch.state = BatchState.Cancelled;
        batch.resolvedAtBlock = block.number;
        policy.activeBatchId = bytes32(0);
        policy.paused = true;

        emit ExpiredBatchCancelled(
            policyId,
            batchId,
            batch.workId,
            previous,
            _remaining(policy),
            block.number
        );
    }

    /// @notice Refund all remaining policy liability after breaker or expiry.
    function refundProtectedRemainder(bytes32 policyId)
        external
        onExpectedChain
        nonReentrant
        policyExists(policyId)
        onlyFunder(policyId)
    {
        Policy storage policy = _policies[policyId];

        if (policy.refundIssued) revert RefundAlreadyIssued();
        if (policy.activeBatchId != bytes32(0)) {
            revert ActiveBatchExists(policy.activeBatchId);
        }

        bool expired = block.timestamp > policy.expiry;
        if (!policy.paused && !expired) {
            revert RefundNotAvailable();
        }

        _refundAndClose(policyId, policy);
    }

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

    function remainingFor(bytes32 policyId)
        external
        view
        policyExists(policyId)
        returns (uint256)
    {
        return _remaining(_policies[policyId]);
    }

    function unattributedValue()
        external
        view
        returns (uint256)
    {
        uint256 balance = address(this).balance;
        return balance > totalLiability
            ? balance - totalLiability
            : 0;
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

    function _assertPolicyUsable(
        bytes32 policyId,
        Policy storage policy
    ) internal view {
        if (policy.closed) revert PolicyClosed(policyId);
        if (policy.paused) revert PolicyPaused(policyId);
        if (block.timestamp > policy.expiry) {
            revert PolicyExpired(
                policy.expiry,
                uint64(block.timestamp)
            );
        }
    }

    function _remaining(Policy storage policy)
        internal
        view
        returns (uint256)
    {
        return
            policy.totalFunded -
            policy.totalPaidOut -
            policy.totalRefunded;
    }

    function _refundAndClose(
        bytes32 policyId,
        Policy storage policy
    ) internal {
        uint256 amount = _remaining(policy);
        if (amount == 0) revert NothingToRefund();
        if (amount > address(this).balance) {
            revert InsufficientVaultBalance(
                amount,
                address(this).balance
            );
        }

        policy.refundIssued = true;
        policy.closed = true;
        policy.paused = true;
        policy.totalRefunded += amount;
        totalLiability -= amount;

        _send(policy.funder, amount);

        emit ProtectedRemainderRefunded(
            policyId,
            policy.funder,
            amount,
            policy.totalRefunded,
            block.chainid,
            block.number,
            block.timestamp
        );

        emit PolicyClosed(
            policyId,
            policy.funder,
            policy.totalFunded,
            policy.totalPaidOut,
            policy.totalRefunded,
            block.number
        );
    }

    function _send(address recipient, uint256 amount)
        internal
    {
        (bool success, ) = payable(recipient).call{
            value: amount
        }("");
        if (!success) {
            revert NativeTransferFailed(recipient, amount);
        }
    }

    receive() external payable {
        revert DirectFundingDisabled();
    }

    fallback() external payable {
        revert DirectFundingDisabled();
    }
}
