// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PolicyCustody} from "../src/PolicyCustody.sol";

contract AcceptingRecipient {
    uint256 public received;
    address public lastCaller;

    receive() external payable {
        received += msg.value;
        lastCaller = msg.sender;
    }
}

contract RejectingRecipient {
    receive() external payable {
        revert("reject");
    }
}

contract ReentrantFunder {
    PolicyCustody public immutable vault;
    bytes32 public immutable policyId;
    bool public armed = true;
    uint256 public reentryAttempts;
    bool public reentryBlocked;

    constructor(PolicyCustody vault_, bytes32 policyId_) {
        vault = vault_;
        policyId = policyId_;
    }

    receive() external payable {
        if (!armed) return;
        armed = false;
        reentryAttempts += 1;
        // Re-entering a `nonReentrant` function must fail with ReentrantCall.
        (bool ok, bytes memory ret) = address(vault).call(
            abi.encodeWithSelector(PolicyCustody.refundRemaining.selector, policyId)
        );
        reentryBlocked = !ok && ret.length >= 4
            && bytes4(ret) == PolicyCustody.ReentrantCall.selector;
    }
}

contract PolicyCustodyTest is Test {
    PolicyCustody internal vault;

    address internal authority = address(this);
    address internal funder = makeAddr("funder");
    address internal stranger = makeAddr("stranger");

    address internal constant USDC = 0x3600000000000000000000000000000000000000;
    uint256 internal constant CAP = 10_000_000_000_000_000_000; // 10 native USDC
    uint256 internal constant UNIT = 1_000_000_000_000_000; // 0.001 native USDC
    uint256 internal constant CHAIN = 5042;

    bytes32 internal constant PID = keccak256("ARC_ASSURANCE_01:T0:POLICY:1");
    bytes32 internal constant PID2 = keccak256("ARC_ASSURANCE_01:T0:POLICY:2");

    AcceptingRecipient internal recipient;
    uint64 internal farFuture;

    function setUp() public {
        vm.chainId(CHAIN);
        farFuture = uint64(block.timestamp + 365 days);

        vault = new PolicyCustody(authority, CHAIN, USDC, CAP);
        recipient = new AcceptingRecipient();

        vm.deal(funder, 100 ether);

        // Policy registration is authority-only; the funder is named explicitly.
        vault.createPolicy(PID, funder, address(recipient), CAP, UNIT, farFuture);
    }

    function _fund(uint256 amount) internal {
        vm.prank(funder);
        vault.fund{value: amount}(PID);
    }

    /* ---------------- happy path ---------------- */

    function test_FundingTakesCustodyAndAccounts() public {
        uint256 amount = 5 ether;
        uint256 before = address(vault).balance;

        vm.expectEmit(true, true, true, true);
        emit PolicyCustody.PolicyFunded(PID, funder, amount, before + amount, amount, CHAIN, block.number, block.timestamp);
        _fund(amount);

        assertEq(address(vault).balance, before + amount, "custody balance");
        assertEq(vault.totalCustodyReceived(), amount, "total received");

        uint256 funded = vault.getAccounting(PID).totalFunded;
        assertEq(funded, amount, "policy funded");
        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Funded), "state Funded");
    }

    function test_ConfiguredPayoutSucceeds() public {
        _fund(5 ether);

        vm.expectEmit(true, true, true, true);
        emit PolicyCustody.PaymentReleased(
            PID, address(recipient), funder, UNIT, UNIT, 5 ether - UNIT, 5 ether - UNIT, UNIT, CHAIN, block.number, block.timestamp
        );

        vault.releaseConfiguredPayout(PID);

        assertEq(recipient.received(), UNIT, "recipient got unit payout");
        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.PaidOut), "state PaidOut");
    }

    function test_RemainingBalanceCalculatedCorrectly() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);

        assertEq(vault.remainingFor(PID), 5 ether - UNIT, "remaining");
        PolicyCustody.Snapshot memory snap = vault.snapshot(PID);
        assertEq(snap.remaining, 5 ether - UNIT, "snapshot remaining");
        assertEq(snap.chainId, CHAIN, "snapshot chainId");
    }

    function test_RefundReturnsRemainderToFunder() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);

        uint256 funderBefore = funder.balance;
        uint256 expect = 5 ether - UNIT;

        vm.expectEmit(true, true, true, true);
        emit PolicyCustody.RemainingFundsRefunded(
            PID, funder, funder, expect, 0, expect, CHAIN, block.number, block.timestamp
        );

        vm.prank(funder);
        vault.refundRemaining(PID);

        assertEq(funder.balance, funderBefore + expect, "funder received remainder");
        assertEq(address(vault).balance, 0, "custody drained");
        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Refunded), "state Refunded");
    }

    function test_FullLifecycleReachesCompleted() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);
        vm.prank(funder);
        vault.complete(PID);

        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Completed), "Completed");
    }

    function test_AccountingInvariantHoldsAcrossLifecycle() public {
        _fund(5 ether);
        PolicyCustody.Accounting memory a1 = vault.getAccounting(PID);
        assertEq(5 ether - a1.totalPaidOut, vault.remainingFor(PID), "invariant after fund");

        vault.releaseConfiguredPayout(PID);
        PolicyCustody.Accounting memory a2 = vault.getAccounting(PID);
        assertEq(5 ether - a2.totalPaidOut, vault.remainingFor(PID), "invariant after payout");

        vm.prank(funder);
        vault.refundRemaining(PID);
        PolicyCustody.Accounting memory a3 = vault.getAccounting(PID);
        assertEq(a3.totalFunded, a3.totalPaidOut + a3.totalRefunded, "funded == paid + refunded");
    }

    /* ---------------- authorization ---------------- */

    function test_RevertWhen_StrangerPayouts() public {
        _fund(5 ether);
        vm.prank(stranger);
        vm.expectRevert(PolicyCustody.NotPolicyAuthority.selector);
        vault.releaseConfiguredPayout(PID);
    }

    function test_RevertWhen_StrangerRefunds() public {
        _fund(5 ether);
        vm.prank(stranger);
        vm.expectRevert(PolicyCustody.NotPolicyOwner.selector);
        vault.refundRemaining(PID);
    }

    function test_RevertWhen_StrangerFunds() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(PolicyCustody.NotPolicyOwner.selector);
        vault.fund{value: 1 ether}(PID);
    }

    function test_RevertWhen_StrangerCompletes() public {
        _fund(1 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);
        vm.prank(stranger);
        vm.expectRevert(PolicyCustody.NotPolicyOwner.selector);
        vault.complete(PID);
    }

    function test_RevertWhen_NonAuthorityCreatesPolicy() public {
        vm.prank(stranger);
        vm.expectRevert(PolicyCustody.NotPolicyAuthority.selector);
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, farFuture);
    }

    /* ---------------- duplicates / idempotency ---------------- */

    function test_RevertWhen_DuplicatePayout() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);

        // second call is rejected by the state guard, before PayoutAlreadyReleased
        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyCustody.InvalidStateTransition.selector, PolicyCustody.State.PaidOut, PolicyCustody.State.Funded
            )
        );
        vault.releaseConfiguredPayout(PID);

        assertEq(recipient.received(), UNIT, "recipient paid exactly once");
    }

    function test_RevertWhen_DuplicateRefund() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);

        vm.prank(funder);
        vm.expectRevert(PolicyCustody.RefundAlreadyIssued.selector);
        vault.refundRemaining(PID);
    }

    function test_RevertWhen_RefundBeforePayout() public {
        // The funder must not be able to skip the configured payout and take
        // the whole position back: refund is only reachable from PaidOut.
        _fund(5 ether);

        vm.prank(funder);
        vm.expectRevert(PolicyCustody.PayoutNotYetReleased.selector);
        vault.refundRemaining(PID);

        assertEq(vault.getAccounting(PID).totalRefunded, 0, "nothing refunded");
        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Funded), "still Funded");
    }

    function test_RevertWhen_PayoutAfterRefund() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyCustody.InvalidStateTransition.selector, PolicyCustody.State.Refunded, PolicyCustody.State.Funded
            )
        );
        vault.releaseConfiguredPayout(PID);
    }

    function test_RevertWhen_FundAfterPayout() public {
        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);

        vm.prank(funder);
        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyCustody.InvalidStateTransition.selector, PolicyCustody.State.PaidOut, PolicyCustody.State.Funded
            )
        );
        vault.fund{value: 1 ether}(PID);
    }

    /* ---------------- balances / caps ---------------- */

    function test_RevertWhen_InsufficientBalance() public {
        // policy cap allows 10 but only 0.0005 funded; unit payout is 0.001
        vault.createPolicy(PID2, funder, address(recipient), CAP, 5e14, farFuture);
        vm.prank(funder);
        vault.fund{value: 1e14}(PID2);

        vm.expectRevert(
            abi.encodeWithSelector(PolicyCustody.InsufficientCustody.selector, 5e14, 1e14)
        );
        vault.releaseConfiguredPayout(PID2);
    }

    function test_RevertWhen_SpendCapExceeded() public {
        vm.expectRevert(
            abi.encodeWithSelector(PolicyCustody.SpendCapExceeded.selector, CAP + 1, CAP)
        );
        vm.prank(funder);
        vault.fund{value: CAP + 1}(PID);

        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Created), "still Created");
    }

    function test_RevertWhen_UnitPayoutExceedsCap() public {
        vm.expectRevert(
            abi.encodeWithSelector(PolicyCustody.UnitPayoutExceeded.selector, CAP + 1, CAP)
        );
        vault.createPolicy(PID2, funder, address(recipient), CAP, CAP + 1, farFuture);
    }

    /* ---------------- invalid inputs ---------------- */

    function test_RevertWhen_ZeroAddressRecipient() public {
        vm.expectRevert(PolicyCustody.ZeroAddress.selector);
        vault.createPolicy(PID2, funder, address(0), CAP, UNIT, farFuture);
    }

    function test_RevertWhen_ZeroPolicyId() public {
        vm.expectRevert(PolicyCustody.ZeroPolicyId.selector);
        vault.createPolicy(bytes32(0), funder, address(recipient), CAP, UNIT, farFuture);
    }

    function test_RevertWhen_DuplicatePolicyId() public {
        vm.expectRevert(PolicyCustody.DuplicatePolicyId.selector);
        vault.createPolicy(PID, funder, address(recipient), CAP, UNIT, farFuture);
    }

    function test_RevertWhen_ZeroAmountFunding() public {
        vm.prank(funder);
        vm.expectRevert(PolicyCustody.ZeroAmount.selector);
        vault.fund{value: 0}(PID);
    }

    function test_RevertWhen_UnknownPolicy() public {
        vm.prank(funder);
        vm.expectRevert(PolicyCustody.InvalidPolicy.selector);
        vault.fund{value: 1 ether}(keccak256("nope"));
    }

    function test_RevertWhen_ConstructorZeroAddress() public {
        vm.expectRevert(PolicyCustody.ZeroAddress.selector);
        new PolicyCustody(address(0), CHAIN, USDC, CAP);
    }

    function test_RevertWhen_DirectTransfer() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertFalse(ok, "direct transfer rejected");
    }

    function test_RevertWhen_ExpiredPolicyFunds() public {
        uint64 soon = uint64(block.timestamp + 1 hours);
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, soon);

        vm.warp(soon + 1);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(PolicyCustody.PolicyExpired.selector, soon, uint64(block.timestamp)));
        vault.fund{value: 1 ether}(PID2);
    }

    function test_ExpiredFundedPolicyCanCancelAndRecover() public {
        uint64 soon = uint64(block.timestamp + 1 hours);
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, soon);

        vm.prank(funder);
        vault.fund{value: 1 ether}(PID2);

        vm.warp(soon + 1);
        uint256 before = funder.balance;

        vm.prank(funder);
        vault.cancelExpiredAndRefund(PID2);

        assertEq(funder.balance, before + 1 ether, "full funded liability recovered");
        assertEq(address(vault).balance, 0, "custody drained");
        assertEq(vault.totalLiability(), 0, "liability cleared");
        assertEq(
            uint8(vault.stateOf(PID2)),
            uint8(PolicyCustody.State.Cancelled),
            "terminal Cancelled state"
        );
    }

    function test_RevertWhen_CancelBeforeExpiry() public {
        uint64 future = uint64(block.timestamp + 1 days);
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, future);

        vm.prank(funder);
        vault.fund{value: 1 ether}(PID2);

        vm.prank(funder);
        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyCustody.PolicyNotExpired.selector,
                future,
                uint64(block.timestamp)
            )
        );
        vault.cancelExpiredAndRefund(PID2);
    }

    function test_RevertWhen_UnknownPolicyIsReadAsState() public {
        vm.expectRevert(PolicyCustody.InvalidPolicy.selector);
        vault.stateOf(keccak256("unknown-policy"));
    }

    function test_RevertWhen_UnknownPolicyRemainingIsRead() public {
        vm.expectRevert(PolicyCustody.InvalidPolicy.selector);
        vault.remainingFor(keccak256("unknown-policy"));
    }

    function test_PolicyCapDoesNotReserveDeploymentLifetimeCapacity() public {
        _fund(1 ether);

        vault.createPolicy(
            PID2,
            funder,
            address(recipient),
            CAP,
            UNIT,
            farFuture
        );

        assertTrue(vault.policyExists(PID2), "second policy registered");
    }

    function test_RevertWhen_WrongChain() public {
        vm.chainId(1);
        vm.deal(funder, 10 ether);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(PolicyCustody.WrongChain.selector, CHAIN, 1));
        vault.fund{value: 1 ether}(PID);
    }

    /* ---------------- transfer failure / reentrancy ---------------- */

    function test_RevertWhen_RecipientRejectsValue() public {
        RejectingRecipient bad = new RejectingRecipient();
        vault.createPolicy(PID2, funder, address(bad), CAP, UNIT, farFuture);
        vm.prank(funder);
        vault.fund{value: 1 ether}(PID2);

        vm.expectRevert(abi.encodeWithSelector(PolicyCustody.NativeTransferFailed.selector, address(bad), UNIT));
        vault.releaseConfiguredPayout(PID2);

        uint256 paid = vault.getAccounting(PID2).totalPaidOut;
        assertEq(paid, 0, "failed payout rolled back accounting");
        assertEq(uint8(vault.stateOf(PID2)), uint8(PolicyCustody.State.Funded), "still Funded");
        assertEq(address(vault).balance, 1 ether, "funds preserved");
    }

    function test_ReentrancyIsBlockedOnPayout() public {
        ReentrantFunder attacker = new ReentrantFunder(vault, PID2);
        vm.deal(address(attacker), 10 ether);
        vault.createPolicy(PID2, address(attacker), address(attacker), CAP, UNIT, farFuture);

        vm.prank(address(attacker));
        vault.fund{value: 1 ether}(PID2);

        // The payout pushes value to the attacker, which re-enters
        // refundRemaining mid-transfer. The guard must block it.
        vault.releaseConfiguredPayout(PID2);

        assertEq(attacker.reentryAttempts(), 1, "reentry attempted once");
        assertTrue(attacker.reentryBlocked(), "reentrancy blocked with ReentrantCall");
        // 10 ether dealt, 1 ether funded, only the payout arrived back
        assertEq(address(attacker).balance, 9 ether + UNIT, "only the payout arrived");

        vm.prank(address(attacker));
        vault.refundRemaining(PID2);

        assertEq(attacker.reentryAttempts(), 1, "no reentry on the refund leg");
        assertEq(address(vault).balance, 0, "custody drained exactly once");
        assertEq(uint8(vault.stateOf(PID2)), uint8(PolicyCustody.State.Refunded), "Refunded");
    }

    function test_PolicyLiabilityIsIsolatedFromOtherPolicies() public {
        // PID2 is funded but PID is not. PID's payout must not be able to draw
        // on PID2's value, even though both share one native balance.
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, farFuture);
        vm.prank(funder);
        vault.fund{value: 5 ether}(PID2);

        // PID is funded with less than its own unit payout.
        _fund(1e14);
        vm.expectRevert(
            abi.encodeWithSelector(PolicyCustody.InsufficientCustody.selector, UNIT, 1e14)
        );
        vault.releaseConfiguredPayout(PID);

        assertEq(vault.totalLiability(), 5 ether + 1e14, "liabilities tracked per policy");
    }

    function test_RefundIsBoundedByPolicyLiabilityNotPooledBalance() public {
        // PID2 stays funded with 5. PID funds, pays out and refunds.
        vault.createPolicy(PID2, funder, address(recipient), CAP, UNIT, farFuture);
        vm.prank(funder);
        vault.fund{value: 5 ether}(PID2);

        _fund(5 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);

        // The refund returned only PID's remainder; PID2's funds are untouched.
        assertEq(address(vault).balance, 5 ether, "PID2 value untouched");
        assertEq(vault.totalLiability(), 5 ether, "PID2 liability intact");
        assertEq(vault.getAccounting(PID).totalRefunded, 5 ether - UNIT, "refund bounded to PID");
    }

    function test_CompleteRequiresRefundedState() public {
        _fund(1 ether);
        vm.prank(funder);
        vm.expectRevert(PolicyCustody.PolicyNotRefunded.selector);
        vault.complete(PID);
    }

    function test_CompleteSucceedsWhileUnattributedValueIsPresent() public {
        _fund(1 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);

        // Forced native value belongs to no policy and must not block closure.
        vm.deal(address(vault), 1 wei);

        vm.prank(funder);
        vault.complete(PID);

        assertEq(uint8(vault.stateOf(PID)), uint8(PolicyCustody.State.Completed), "Completed");
        assertEq(vault.unattributedValue(), 1, "forced value reported as unattributed");
    }

    function test_RevertWhen_RefundAfterCompletion() public {
        _fund(1 ether);
        vault.releaseConfiguredPayout(PID);
        vm.prank(funder);
        vault.refundRemaining(PID);
        vm.prank(funder);
        vault.complete(PID);

        // custody is drained and the policy is terminal: a further refund is refused
        vm.prank(funder);
        vm.expectRevert(PolicyCustody.RefundAlreadyIssued.selector);
        vault.refundRemaining(PID);
        assertEq(address(vault).balance, 0, "no value left to refund");
    }
}
