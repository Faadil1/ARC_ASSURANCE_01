// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PolicyCustody
/// @notice Arc-native USDC custody foundation for ARC_ASSURANCE_01 gate
///         G1 / T0_MAINNET_CUSTODY.
///
/// @dev This contract proves ONLY the custody/payment primitive:
///
///         real Arc mainnet native USDC
///         -> contract custody
///         -> configured payout
///         -> remaining-funds refund
///
///      It establishes the accounting, authorization, event and state-model
///      foundation that the later assurance state machine (policy -> funding ->
///      batch commitment -> output lock -> canary reveal -> resolve) builds on.
///      It deliberately does NOT implement canary commitment, provider output
///      locking, EIP-712 binding, scoring, circuit breaking or payout triggers.
///
///      ASSET MODEL
///      Arc's native asset IS USDC (18 decimals). Custody therefore uses
///      `msg.value` / native balance rather than ERC-20 allowances. The same
///      asset is reachable as a 6-decimal ERC-20 at the Arc USDC interface; the
///      two representations are backed by one balance. Mixing them is forbidden
///      because the raw values differ by 1e12.
contract PolicyCustody {
    /* ---------------------------------------------------------------------
     * Types
     * ------------------------------------------------------------------ */

    /// @notice Explicit custody lifecycle for a single policy.
    /// @dev T0 keeps exactly the states required by the canonical T0 gate:
    ///      created -> funded -> payout -> refund -> completed.
    ///      `PaidOut` and `Refunded` are distinct so a verifier can prove from
    ///      chain state that value was released before any remainder returned.
    enum State {
        Created,
        Funded,
        PaidOut,
        Refunded,
        Completed
    }

    /// @notice Immutable configuration bound at policy creation.
    /// @dev `payoutRecipient` is fixed here and cannot be redirected later, so
    ///      no state-changing call can move funds to an arbitrary address.
    struct Policy {
        bytes32 policyId;
        address funder;
        address payoutRecipient;
        uint256 maxSpendCap;
        uint256 unitPayout;
        uint64 expiry;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 resolvedAt;
        uint256 totalFunded;
        uint256 totalPaidOut;
        uint256 totalRefunded;
        bool payoutReleased;
        bool refundIssued;
        State state;
    }

    /// @notice Accounting for one policy. All values are 18-decimal native USDC.
    struct Accounting {
        uint256 totalFunded;
        uint256 totalPaidOut;
        uint256 totalRefunded;
    }

    /// @notice Flat canonical view used by the T0 evidence run.
    struct Snapshot {
        bytes32 policyId;
        address funder;
        address payoutRecipient;
        State state;
        uint256 custodyBalance;
        uint256 totalFunded;
        uint256 totalPaidOut;
        uint256 totalRefunded;
        uint256 remaining;
        bool payoutReleased;
        bool refundIssued;
        uint256 chainId;
        uint256 poolLiability;
        uint256 unattributedValue;
    }

    /* ---------------------------------------------------------------------
     * Errors
     * ------------------------------------------------------------------ */

    error NotPolicyAuthority();
    error NotPolicyOwner();
    error ZeroAddress();
    error ZeroPolicyId();
    error ZeroAmount();
    error InvalidPolicy();
    error DuplicatePolicyId();
    error InvalidStateTransition(State current, State expected);
    error PolicyExpired(uint64 expiry, uint64 nowTs);
    error SpendCapExceeded(uint256 requested, uint256 cap);
    error UnitPayoutExceeded(uint256 unitPayout, uint256 cap);
    error InsufficientCustody(uint256 requested, uint256 available);
    error PayoutAlreadyReleased();
    error RefundAlreadyIssued();
    error CustodyNotDrained(uint256 remaining);
    error PolicyNotRefunded();
    error WrongChain(uint256 expected, uint256 actual);
    error DirectFundingDisabled();
    error NativeTransferFailed(address to, uint256 amount);
    error ReentrantCall();
    error NotAuthorizedFunder();
    error PayoutNotYetReleased();
    error NothingToRefund();

    /* ---------------------------------------------------------------------
     * Events
     *
     * Every consequential transition emits enough data for an independent
     * verifier to reconstruct custody from chain state alone. Block number and
     * timestamp are included because Arc block timestamps are non-decreasing
     * rather than strictly increasing: ordering must use block number, and the
     * timestamp is recorded only as supplementary context.
     * ------------------------------------------------------------------ */

    event PolicyCreated(
        bytes32 indexed policyId,
        address indexed funder,
        address indexed payoutRecipient,
        uint256 maxSpendCap,
        uint256 unitPayout,
        uint64 expiry,
        uint256 chainId,
        uint256 createdAtBlock,
        uint256 createdAtTimestamp
    );

    event PolicyFunded(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 amount,
        uint256 custodyBalance,
        uint256 totalFunded,
        uint256 chainId,
        uint256 fundedAtBlock,
        uint256 fundedAtTimestamp
    );

    event PaymentReleased(
        bytes32 indexed policyId,
        address indexed payoutRecipient,
        address indexed funder,
        uint256 amount,
        uint256 unitPayout,
        uint256 custodyBalance,
        uint256 remaining,
        uint256 totalPaidOut,
        uint256 chainId,
        uint256 paidAtBlock,
        uint256 paidAtTimestamp
    );

    event RemainingFundsRefunded(
        bytes32 indexed policyId,
        address indexed recipient,
        address indexed funder,
        uint256 amount,
        uint256 custodyBalance,
        uint256 totalRefunded,
        uint256 chainId,
        uint256 refundedAtBlock,
        uint256 refundedAtTimestamp
    );

    event PolicyRefunded(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 amount,
        uint256 chainId,
        uint256 refundedAtBlock
    );

    event PolicyCompleted(
        bytes32 indexed policyId,
        address indexed funder,
        uint256 finalBalance,
        uint256 chainId,
        uint256 completedAtBlock,
        uint256 completedAtTimestamp
    );

    event PolicyStateChanged(
        bytes32 indexed policyId,
        State previousState,
        State newState,
        uint256 chainId,
        uint256 blockNumber
    );

    /* ---------------------------------------------------------------------
     * Immutables
     * ------------------------------------------------------------------ */

    /// @notice Global authority permitted to create policies.
    address public immutable authority;

    /// @notice Chain this deployment is valid on. Guards against cross-chain replay.
    uint256 public immutable expectedChainId;

    /// @notice Arc unified USDC ERC-20 interface (6 decimals) for the SAME balance
    ///         held natively here. Recorded for evidence only; T0 never calls it.
    address public immutable usdcErc20Interface;

    /// @notice Hard ceiling on total value this deployment may ever take custody of.
    uint256 public immutable deploymentSpendCap;

    /* ---------------------------------------------------------------------
     * Storage
     * ------------------------------------------------------------------ */

    mapping(bytes32 => Policy) private _policies;
    mapping(bytes32 => bool) public policyExists;

    uint256 public totalCustodyReceived;
    uint256 public totalValueReleased;
    uint256 public policyCount;

    /// @notice Sum of every policy's outstanding liability.
    /// @dev This is the authoritative pool figure, NOT `address(this).balance`.
    ///      Payouts and refunds are bounded by a single policy's liability, so no
    ///      policy can ever consume another policy's value even though the
    ///      native balance is pooled in one account. Any excess between this
    ///      value and the native balance is unattributed forced value
    ///      (SELFDESTRUCT) and is never paid out or refunded.
    uint256 public totalLiability;

    uint256 private _lock = 1;

    /* ---------------------------------------------------------------------
     * Modifiers
     * ------------------------------------------------------------------ */

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotPolicyAuthority();
        _;
    }

    modifier onExpectedChain() {
        if (block.chainid != expectedChainId) {
            revert WrongChain(expectedChainId, block.chainid);
        }
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert ReentrantCall();
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier policyMustExist(bytes32 policyId) {
        if (!policyExists[policyId]) revert InvalidPolicy();
        _;
    }

    modifier inState(bytes32 policyId, State expected) {
        Policy storage p = _policies[policyId];
        if (p.state != expected) {
            revert InvalidStateTransition(p.state, expected);
        }
        _;
    }

    /* ---------------------------------------------------------------------
     * Construction
     * ------------------------------------------------------------------ */

    constructor(
        address authority_,
        uint256 expectedChainId_,
        address usdcErc20Interface_,
        uint256 deploymentSpendCap_
    ) {
        if (authority_ == address(0)) revert ZeroAddress();
        if (usdcErc20Interface_ == address(0)) revert ZeroAddress();
        if (deploymentSpendCap_ == 0) revert ZeroAmount();
        if (expectedChainId_ == 0) revert InvalidPolicy();

        authority = authority_;
        expectedChainId = expectedChainId_;
        usdcErc20Interface = usdcErc20Interface_;
        deploymentSpendCap = deploymentSpendCap_;
    }

    /* ---------------------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------------------ */

    /// @notice Create a custody policy with an immutable payout recipient.
    /// @dev Only `authority` may create policies, and it names the `funder_`
    ///      explicitly. Separating creator from funder keeps operational
    ///      authority over the policy registry from being the same key that
    ///      custodies and refunds value.
    /// @param policyId_ Unique operator-chosen identifier.
    /// @param funder_ Address permitted to fund and to receive refunds.
    /// @param payoutRecipient_ Address the configured payout is released to.
    /// @param maxSpendCap_ Maximum total value this policy may ever hold.
    /// @param unitPayout_ Configured payout amount released on the PASS path.
    /// @param expiry_ Unix timestamp after which funding and payout are refused.
    function createPolicy(
        bytes32 policyId_,
        address funder_,
        address payoutRecipient_,
        uint256 maxSpendCap_,
        uint256 unitPayout_,
        uint64 expiry_
    ) external onlyAuthority onExpectedChain returns (Policy memory) {
        if (policyId_ == bytes32(0)) revert ZeroPolicyId();
        if (policyExists[policyId_]) revert DuplicatePolicyId();
        if (funder_ == address(0)) revert ZeroAddress();
        if (payoutRecipient_ == address(0) || payoutRecipient_ == address(this)) revert ZeroAddress();
        if (maxSpendCap_ == 0) revert ZeroAmount();
        if (unitPayout_ == 0 || unitPayout_ > maxSpendCap_) {
            revert UnitPayoutExceeded(unitPayout_, maxSpendCap_);
        }
        if (expiry_ != 0 && expiry_ <= block.timestamp) {
            revert PolicyExpired(expiry_, uint64(block.timestamp));
        }
        if (totalCustodyReceived + maxSpendCap_ > deploymentSpendCap) {
            revert SpendCapExceeded(totalCustodyReceived + maxSpendCap_, deploymentSpendCap);
        }

        policyExists[policyId_] = true;
        unchecked {
            ++policyCount;
        }

        _policies[policyId_] = Policy({
            policyId: policyId_,
            funder: funder_,
            payoutRecipient: payoutRecipient_,
            maxSpendCap: maxSpendCap_,
            unitPayout: unitPayout_,
            expiry: expiry_,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            resolvedAt: 0,
            totalFunded: 0,
            totalPaidOut: 0,
            totalRefunded: 0,
            payoutReleased: false,
            refundIssued: false,
            state: State.Created
        });

        emit PolicyCreated(
            policyId_,
            funder_,
            payoutRecipient_,
            maxSpendCap_,
            unitPayout_,
            expiry_,
            block.chainid,
            block.number,
            block.timestamp
        );
        // `PolicyCreated` is the record of entry into `State.Created`; no
        // `PolicyStateChanged` is emitted because there is no prior state to
        // transition from.

        return _policies[policyId_];
    }

    /// @notice Take native USDC custody of a policy.
    /// @dev The funder is the policy creator. Funding is additive; cumulative
    ///      funding is capped at `maxSpendCap`.
    function fund(bytes32 policyId_)
        external
        payable
        onExpectedChain
        nonReentrant
        policyMustExist(policyId_)
    {
        Policy storage p = _policies[policyId_];
        if (msg.sender != p.funder) revert NotPolicyOwner();
        if (p.state != State.Created && p.state != State.Funded) {
            revert InvalidStateTransition(p.state, State.Funded);
        }
        if (p.expiry != 0 && block.timestamp > p.expiry) {
            revert PolicyExpired(p.expiry, uint64(block.timestamp));
        }
        if (msg.value == 0) revert ZeroAmount();

        uint256 fundedTotal = p.totalFunded + msg.value;
        if (fundedTotal > p.maxSpendCap) {
            revert SpendCapExceeded(fundedTotal, p.maxSpendCap);
        }
        if (totalCustodyReceived + msg.value > deploymentSpendCap) {
            revert SpendCapExceeded(totalCustodyReceived + msg.value, deploymentSpendCap);
        }

        State previous = p.state;

        p.totalFunded = fundedTotal;
        totalCustodyReceived += msg.value;
        totalLiability += msg.value;
        p.fundedAt = uint64(block.timestamp);
        p.state = State.Funded;

        emit PolicyFunded(
            policyId_,
            msg.sender,
            msg.value,
            address(this).balance,
            fundedTotal,
            block.chainid,
            block.number,
            block.timestamp
        );
        if (previous != State.Funded) {
            emit PolicyStateChanged(policyId_, previous, State.Funded, block.chainid, block.number);
        }
    }

    /// @notice Release the configured payout to the policy's configured recipient.
    /// @dev Reverts if the recipient is not the policy's own configured address,
    ///      so no caller can redirect value to an arbitrary destination.
    function releaseConfiguredPayout(bytes32 policyId_)
        external
        onlyAuthority
        onExpectedChain
        nonReentrant
        policyMustExist(policyId_)
        inState(policyId_, State.Funded)
    {
        Policy storage p = _policies[policyId_];

        if (p.payoutReleased) revert PayoutAlreadyReleased();
        if (msg.sender != p.funder && msg.sender != authority) revert NotPolicyOwner();
        if (p.expiry != 0 && block.timestamp > p.expiry) {
            revert PolicyExpired(p.expiry, uint64(block.timestamp));
        }

        address recipient = p.payoutRecipient;
        uint256 amount = p.unitPayout;

        // Bound the payout by THIS policy's liability, not the pooled native
        // balance, so one policy can never be paid out of another's funds.
        uint256 owed = p.totalFunded - p.totalPaidOut - p.totalRefunded;
        if (amount > owed) revert InsufficientCustody(amount, owed);
        if (amount > address(this).balance) revert InsufficientCustody(amount, address(this).balance);

        // Effects before interaction.
        p.payoutReleased = true;
        p.totalPaidOut += amount;
        p.state = State.PaidOut;
        p.resolvedAt = uint64(block.timestamp);
        totalValueReleased += amount;
        totalLiability -= amount;

        _send(recipient, amount);

        emit PaymentReleased(
            policyId_,
            recipient,
            p.funder,
            amount,
            p.unitPayout,
            address(this).balance,
            owed - amount,
            p.totalPaidOut,
            block.chainid,
            block.number,
            block.timestamp
        );
        emit PolicyStateChanged(policyId_, State.Funded, State.PaidOut, block.chainid, block.number);
    }

    /// @notice Return this policy's remaining custody to its funder.
    /// @dev Bound to the funder, so the protected remainder can never be
    ///      withdrawn by an unauthorized party. Refund is only reachable after
    ///      the configured payout has been released, which enforces the
    ///      required `funded -> payout -> refund` ordering: the funder can never
    ///      skip the payout and take the whole position back. The amount is the
    ///      policy's own outstanding liability, never the pooled balance.
    function refundRemaining(bytes32 policyId_)
        external
        onExpectedChain
        nonReentrant
        policyMustExist(policyId_)
    {
        Policy storage p = _policies[policyId_];
        if (msg.sender != p.funder) revert NotPolicyOwner();
        if (p.refundIssued) revert RefundAlreadyIssued();
        if (p.state != State.PaidOut) revert PayoutNotYetReleased();

        uint256 amount = p.totalFunded - p.totalPaidOut - p.totalRefunded;
        if (amount == 0) revert NothingToRefund();
        if (amount > address(this).balance) {
            revert InsufficientCustody(amount, address(this).balance);
        }

        State previous = p.state;

        p.refundIssued = true;
        p.totalRefunded += amount;
        p.state = State.Refunded;
        p.resolvedAt = uint64(block.timestamp);
        totalLiability -= amount;

        _send(p.funder, amount);

        emit RemainingFundsRefunded(
            policyId_,
            p.funder,
            p.funder,
            amount,
            address(this).balance,
            p.totalRefunded,
            block.chainid,
            block.number,
            block.timestamp
        );
        emit PolicyRefunded(policyId_, p.funder, amount, block.chainid, block.number);
        emit PolicyStateChanged(policyId_, previous, State.Refunded, block.chainid, block.number);
    }

    /// @notice Terminate a fully drained, refunded policy.
    /// @dev Completion requires the POLICY's liability to be zero, not that the
    ///      whole contract is empty. Unattributed forced value, if any, must not
    ///      be able to keep a completed policy from closing.
    function complete(bytes32 policyId_)
        external
        onExpectedChain
        nonReentrant
        policyMustExist(policyId_)
    {
        Policy storage p = _policies[policyId_];
        if (msg.sender != p.funder) revert NotPolicyOwner();
        if (p.state != State.Refunded) revert PolicyNotRefunded();
        uint256 outstanding = p.totalFunded - p.totalPaidOut - p.totalRefunded;
        if (outstanding != 0) revert CustodyNotDrained(outstanding);

        p.state = State.Completed;

        emit PolicyCompleted(
            policyId_,
            p.funder,
            address(this).balance,
            block.chainid,
            block.number,
            block.timestamp
        );
        emit PolicyStateChanged(policyId_, State.Refunded, State.Completed, block.chainid, block.number);
    }

    /* ---------------------------------------------------------------------
     * Views
     * ------------------------------------------------------------------ */

    function getPolicy(bytes32 policyId_)
        external
        view
        policyMustExist(policyId_)
        returns (Policy memory)
    {
        return _policies[policyId_];
    }

    function getAccounting(bytes32 policyId_)
        external
        view
        policyMustExist(policyId_)
        returns (Accounting memory)
    {
        Policy storage p = _policies[policyId_];
        return
            Accounting({
                totalFunded: p.totalFunded,
                totalPaidOut: p.totalPaidOut,
                totalRefunded: p.totalRefunded
            });
    }

    function stateOf(bytes32 policyId_) external view returns (State) {
        return _policies[policyId_].state;
    }

    /// @notice Remaining custody attributable to a policy.
    function remainingFor(bytes32 policyId_) external view returns (uint256) {
        Policy storage p = _policies[policyId_];
        if (p.state == State.Created) return 0;
        return p.totalFunded - p.totalPaidOut - p.totalRefunded;
    }

    /// @notice Canonical snapshot for independent verification of a T0 run.
    function snapshot(bytes32 policyId_)
        external
        view
        policyMustExist(policyId_)
        returns (Snapshot memory s)
    {
        Policy storage p = _policies[policyId_];
        s.policyId = policyId_;
        s.funder = p.funder;
        s.payoutRecipient = p.payoutRecipient;
        s.state = p.state;
        s.custodyBalance = address(this).balance;
        s.totalFunded = p.totalFunded;
        s.totalPaidOut = p.totalPaidOut;
        s.totalRefunded = p.totalRefunded;
        s.remaining = p.totalFunded - p.totalPaidOut - p.totalRefunded;
        s.payoutReleased = p.payoutReleased;
        s.refundIssued = p.refundIssued;
        s.chainId = block.chainid;
        s.poolLiability = totalLiability;
        s.unattributedValue = unattributedValue();
    }

    /// @notice Value held by this contract that belongs to no policy.
    /// @dev Only reachable via SELFDESTRUCT. Never paid out or refunded.
    function unattributedValue() public view returns (uint256) {
        uint256 held = address(this).balance;
        uint256 owed = totalLiability;
        return held > owed ? held - owed : 0;
    }

    /* ---------------------------------------------------------------------
     * Internal
     * ------------------------------------------------------------------ */

    /// @dev Push native USDC, reverting the whole call on failure.
    ///      On Arc, a value transfer can revert for reasons beyond a reverted
    ///      fallback (blocklist, zero-address burn, value to a self-destructed
    ///      account). All of those surface as a failed low-level call, so the
    ///      single check below covers them and accounting stays fail-closed.
    function _send(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed(to, amount);
    }

    /* ---------------------------------------------------------------------
     * Fallback
     * ------------------------------------------------------------------ */

    /// @dev Direct transfers are refused so every intentional deposit produces a
    ///      correlation event and is accounted for. Forced native deposits
    ///      (SELFDESTRUCT) cannot be blocked on Arc; such value is not counted in
    ///      `totalCustodyReceived` and is not attributable to any policy.
    receive() external payable {
        revert DirectFundingDisabled();
    }

    fallback() external payable {
        revert DirectFundingDisabled();
    }
}
