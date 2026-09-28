// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/T0NativeCustody.sol";

contract T0Recipient {
    uint256 public received;

    receive() external payable {
        received += msg.value;
    }
}

contract T0RejectingRecipient {
    receive() external payable {
        revert("reject");
    }
}

/// @notice Dependency-free Foundry tests.
/// @dev These tests intentionally avoid forge-std so the spike stays minimal.
///      Run with Arc Foundry: arc-forge test --network arc -vvv
contract T0NativeCustodyTest {
    receive() external payable {}

    function testFundPayoutRefundLifecycle() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid);
        T0Recipient recipient = new T0Recipient();

        uint256 funding = 3 ether;
        uint256 payoutAmount = 1 ether;

        custody.fund{value: funding}(keccak256("t0-fund"));
        _eq(address(custody).balance, funding, "custody balance after fund");
        _eq(custody.totalFunded(), funding, "total funded");

        custody.payout(
            payable(address(recipient)),
            payoutAmount,
            keccak256("t0-payout")
        );

        _eq(recipient.received(), payoutAmount, "recipient received");
        _eq(custody.totalPaid(), payoutAmount, "total paid");
        _eq(
            address(custody).balance,
            funding - payoutAmount,
            "custody balance after payout"
        );

        uint256 refund = custody.refundAll(keccak256("t0-refund"));

        _eq(refund, funding - payoutAmount, "refund amount");
        _eq(custody.totalRefunded(), refund, "total refunded");
        _eq(address(custody).balance, 0, "empty after refund");
        _true(custody.closed(), "closed after refund");
    }

    function testRejectsWrongChain() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid + 1);

        (bool ok, ) = address(custody).call{value: 1 ether}(
            abi.encodeWithSelector(custody.fund.selector, keccak256("wrong-chain"))
        );

        _false(ok, "fund must fail on wrong chain");
        _eq(address(custody).balance, 0, "wrong-chain call moved no value");
    }

    function testRejectsDirectFunding() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid);

        (bool ok, ) = address(custody).call{value: 1 ether}("");

        _false(ok, "direct send must revert");
        _eq(address(custody).balance, 0, "direct send moved no value");
    }

    function testRejectsOverpayment() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid);
        T0Recipient recipient = new T0Recipient();

        custody.fund{value: 1 ether}(keccak256("fund"));

        (bool ok, ) = address(custody).call(
            abi.encodeWithSelector(
                custody.payout.selector,
                payable(address(recipient)),
                2 ether,
                keccak256("too-much")
            )
        );

        _false(ok, "overpayment must fail");
        _eq(address(custody).balance, 1 ether, "balance preserved");
        _eq(recipient.received(), 0, "recipient got nothing");
    }

    function testFailedRecipientDoesNotAdvanceAccounting() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid);
        T0RejectingRecipient recipient = new T0RejectingRecipient();

        custody.fund{value: 1 ether}(keccak256("fund"));

        (bool ok, ) = address(custody).call(
            abi.encodeWithSelector(
                custody.payout.selector,
                payable(address(recipient)),
                0.5 ether,
                keccak256("reject")
            )
        );

        _false(ok, "rejecting recipient must fail payout");
        _eq(custody.totalPaid(), 0, "failed payout rolled back accounting");
        _eq(address(custody).balance, 1 ether, "funds remain in custody");
    }

    function testClosedContractCannotBeFundedAgain() public {
        T0NativeCustody custody =
            new T0NativeCustody(payable(address(this)), block.chainid);

        custody.fund{value: 1 ether}(keccak256("fund"));
        custody.refundAll(keccak256("refund"));

        (bool ok, ) = address(custody).call{value: 1 ether}(
            abi.encodeWithSelector(custody.fund.selector, keccak256("late-fund"))
        );

        _false(ok, "closed contract must reject funding");
        _eq(address(custody).balance, 0, "no post-close custody");
    }

    function _eq(uint256 actual, uint256 expected, string memory reason)
        private
        pure
    {
        require(actual == expected, reason);
    }

    function _true(bool value, string memory reason) private pure {
        require(value, reason);
    }

    function _false(bool value, string memory reason) private pure {
        require(!value, reason);
    }
}
