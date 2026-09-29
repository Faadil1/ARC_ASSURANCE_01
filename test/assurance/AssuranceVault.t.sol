// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssuranceVault} from "../../src/assurance/AssuranceVault.sol";
import {ProviderOutputEIP712} from "../../src/eip712/ProviderOutputEIP712.sol";

contract RejectingRecipient {
    receive() external payable {
        revert("reject");
    }
}

contract AssuranceVaultTest is Test {
    uint256 internal constant PROVIDER_PK = 0xA11CE;
    uint256 internal constant WRONG_PROVIDER_PK = 0xB0B;

    uint256 internal constant DEPLOYMENT_CAP =
        50_000_000_000_000_000; // 0.05 native USDC
    uint256 internal constant POLICY_CAP =
        20_000_000_000_000_000; // 0.02
    uint256 internal constant FUND_AMOUNT =
        10_000_000_000_000_000; // 0.01
    uint256 internal constant UNIT_PAYOUT =
        2_000_000_000_000_000; // 0.002

    address internal constant ARC_USDC =
        0x3600000000000000000000000000000000000000;

    bytes32 internal constant POLICY_ID =
        keccak256("policy-1");
    bytes32 internal constant BATCH_1 =
        keccak256("batch-1");
    bytes32 internal constant BATCH_2 =
        keccak256("batch-2");
    bytes32 internal constant BATCH_3 =
        keccak256("batch-3");
    bytes32 internal constant WORK_1 =
        keccak256("work-1");
    bytes32 internal constant WORK_2 =
        keccak256("work-2");
    bytes32 internal constant WORK_3 =
        keccak256("work-3");
    bytes32 internal constant INPUT_1 =
        keccak256("input-1");
    bytes32 internal constant INPUT_2 =
        keccak256("input-2");
    bytes32 internal constant INPUT_3 =
        keccak256("input-3");
    bytes32 internal constant EXPECTED_1 =
        keccak256("expected-1");
    bytes32 internal constant EXPECTED_2 =
        keccak256("expected-2");
    bytes32 internal constant EXPECTED_3 =
        keccak256("expected-3");
    bytes32 internal constant WRONG_OUTPUT =
        keccak256("wrong-output");
    bytes32 internal constant SALT_1 =
        keccak256("salt-1");
    bytes32 internal constant SALT_2 =
        keccak256("salt-2");
    bytes32 internal constant SALT_3 =
        keccak256("salt-3");
    bytes32 internal constant SCORER_ID_HASH =
        keccak256(
            "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1"
        );

    address internal funder;
    address internal provider;
    address internal payoutRecipient;

    uint64 internal expiry;
    AssuranceVault internal vault;

    function setUp() public {
        vm.chainId(5042);

        funder = makeAddr("funder");
        provider = vm.addr(PROVIDER_PK);
        payoutRecipient = makeAddr("payout-recipient");
        expiry = uint64(block.timestamp + 7 days);

        vm.deal(funder, 1 ether);

        vault = new AssuranceVault(
            address(this),
            5042,
            ARC_USDC,
            DEPLOYMENT_CAP
        );

        vault.createPolicy(
            POLICY_ID,
            funder,
            provider,
            payoutRecipient,
            SCORER_ID_HASH,
            2,
            POLICY_CAP,
            UNIT_PAYOUT,
            expiry
        );
    }

    function _fund(bytes32 policyId, uint256 amount)
        internal
    {
        vm.prank(funder);
        vault.fund{value: amount}(policyId);
    }

    function _commit(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    ) internal returns (bytes32 commitment) {
        commitment = vault.computeCanaryCommitment(
            policyId,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            SCORER_ID_HASH,
            salt
        );

        vm.prank(funder);
        vault.commitBatch(
            policyId,
            batchId,
            commitment
        );
    }

    function _output(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 outputHash,
        uint256 nonce
    )
        internal
        view
        returns (ProviderOutputEIP712.ProviderOutput memory)
    {
        return ProviderOutputEIP712.ProviderOutput({
            provider: provider,
            policyId: policyId,
            batchId: batchId,
            workId: workId,
            inputHash: inputHash,
            outputHash: outputHash,
            scorerIdHash: SCORER_ID_HASH,
            nonce: nonce,
            deadline: block.timestamp + 1 hours
        });
    }

    function _sign(
        ProviderOutputEIP712.ProviderOutput memory output,
        uint256 privateKey
    ) internal returns (bytes memory) {
        bytes32 digest =
            vault.providerOutputDigest(output);
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _lock(
        ProviderOutputEIP712.ProviderOutput memory output
    ) internal {
        vault.lockProviderOutput(
            output,
            _sign(output, PROVIDER_PK)
        );
    }

    function _reveal(
        bytes32 policyId,
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    ) internal {
        vm.prank(funder);
        vault.revealCanary(
            policyId,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            salt
        );
    }

    function _prepare(
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 actualOutputHash,
        bytes32 salt,
        uint256 nonce
    ) internal {
        _commit(
            POLICY_ID,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            salt
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                POLICY_ID,
                batchId,
                workId,
                inputHash,
                actualOutputHash,
                nonce
            );

        _lock(output);
        _reveal(
            POLICY_ID,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            salt
        );
    }

    function test_PASS_ReleasesExactConfiguredPayout()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);

        _prepare(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            EXPECTED_1,
            SALT_1,
            1
        );

        uint256 recipientBefore =
            payoutRecipient.balance;

        AssuranceVault.SettlementDirective directive =
            vault.resolveBatch(POLICY_ID, BATCH_1);

        assertEq(
            uint8(directive),
            uint8(
                AssuranceVault
                    .SettlementDirective
                    .PAY
            )
        );
        assertEq(
            payoutRecipient.balance,
            recipientBefore + UNIT_PAYOUT
        );
        assertEq(
            vault.totalLiability(),
            FUND_AMOUNT - UNIT_PAYOUT
        );
        assertEq(
            vault.totalValueReleased(),
            UNIT_PAYOUT
        );

        AssuranceVault.Policy memory policy =
            vault.getPolicy(POLICY_ID);
        assertEq(policy.totalPaidOut, UNIT_PAYOUT);
        assertEq(policy.failureCount, 0);
        assertFalse(policy.paused);
        assertEq(policy.activeBatchId, bytes32(0));
    }

    function test_FAIL_WithholdsAndCannotLaterPaySameBatch()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);

        _prepare(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            WRONG_OUTPUT,
            SALT_1,
            1
        );

        uint256 recipientBefore =
            payoutRecipient.balance;

        AssuranceVault.SettlementDirective directive =
            vault.resolveBatch(POLICY_ID, BATCH_1);

        assertEq(
            uint8(directive),
            uint8(
                AssuranceVault
                    .SettlementDirective
                    .WITHHOLD
            )
        );
        assertEq(
            payoutRecipient.balance,
            recipientBefore
        );
        assertEq(vault.totalLiability(), FUND_AMOUNT);
        assertEq(vault.totalValueReleased(), 0);

        AssuranceVault.Policy memory policy =
            vault.getPolicy(POLICY_ID);
        assertEq(policy.failureCount, 1);
        assertFalse(policy.paused);

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault.InvalidBatchState.selector,
                AssuranceVault.BatchState.Revealed,
                AssuranceVault.BatchState.Resolved
            )
        );
        vault.resolveBatch(POLICY_ID, BATCH_1);
    }

    function test_SecondFAIL_TriggersBreakerAndRefundsProtectedRemainder()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);

        _prepare(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            WRONG_OUTPUT,
            SALT_1,
            1
        );
        vault.resolveBatch(POLICY_ID, BATCH_1);

        _prepare(
            BATCH_2,
            WORK_2,
            INPUT_2,
            EXPECTED_2,
            WRONG_OUTPUT,
            SALT_2,
            2
        );

        AssuranceVault.SettlementDirective directive =
            vault.resolveBatch(POLICY_ID, BATCH_2);

        assertEq(
            uint8(directive),
            uint8(
                AssuranceVault
                    .SettlementDirective
                    .BREAKER
            )
        );

        AssuranceVault.Policy memory policy =
            vault.getPolicy(POLICY_ID);
        assertEq(policy.failureCount, 2);
        assertTrue(policy.paused);
        assertEq(vault.totalValueReleased(), 0);

        bytes32 nextCommitment =
            vault.computeCanaryCommitment(
                POLICY_ID,
                BATCH_3,
                WORK_3,
                INPUT_3,
                EXPECTED_3,
                SCORER_ID_HASH,
                SALT_3
            );

        vm.prank(funder);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault.PolicyPaused.selector,
                POLICY_ID
            )
        );
        vault.commitBatch(
            POLICY_ID,
            BATCH_3,
            nextCommitment
        );

        uint256 beforeRefund = funder.balance;

        vm.prank(funder);
        vault.refundProtectedRemainder(POLICY_ID);

        assertEq(
            funder.balance,
            beforeRefund + FUND_AMOUNT
        );
        assertEq(vault.totalLiability(), 0);

        policy = vault.getPolicy(POLICY_ID);
        assertTrue(policy.closed);
        assertEq(policy.totalRefunded, FUND_AMOUNT);
    }

    function test_PASS_ThenBreaker_RefundsOnlyRemainingLiability()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);

        _prepare(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            EXPECTED_1,
            SALT_1,
            1
        );
        vault.resolveBatch(POLICY_ID, BATCH_1);

        _prepare(
            BATCH_2,
            WORK_2,
            INPUT_2,
            EXPECTED_2,
            WRONG_OUTPUT,
            SALT_2,
            2
        );
        vault.resolveBatch(POLICY_ID, BATCH_2);

        _prepare(
            BATCH_3,
            WORK_3,
            INPUT_3,
            EXPECTED_3,
            WRONG_OUTPUT,
            SALT_3,
            3
        );
        vault.resolveBatch(POLICY_ID, BATCH_3);

        uint256 expectedRemainder =
            FUND_AMOUNT - UNIT_PAYOUT;
        assertEq(
            vault.remainingFor(POLICY_ID),
            expectedRemainder
        );

        uint256 beforeRefund = funder.balance;
        vm.prank(funder);
        vault.refundProtectedRemainder(POLICY_ID);

        assertEq(
            funder.balance,
            beforeRefund + expectedRemainder
        );

        AssuranceVault.Policy memory policy =
            vault.getPolicy(POLICY_ID);
        assertEq(
            policy.totalPaidOut,
            UNIT_PAYOUT
        );
        assertEq(
            policy.totalRefunded,
            expectedRemainder
        );
        assertEq(
            policy.totalFunded,
            policy.totalPaidOut + policy.totalRefunded
        );
    }

    function test_WrongProviderSignatureCannotReachResolve()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);
        _commit(
            POLICY_ID,
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                POLICY_ID,
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                1
            );

        bytes memory wrongSignature =
            _sign(output, WRONG_PROVIDER_PK);

        address wrongProvider =
            vm.addr(WRONG_PROVIDER_PK);

        vm.expectRevert(
            abi.encodeWithSelector(
                ProviderOutputEIP712
                    .ProviderSignatureMismatch
                    .selector,
                provider,
                wrongProvider
            )
        );
        vault.lockProviderOutput(
            output,
            wrongSignature
        );

        AssuranceVault.Batch memory batch =
            vault.getBatch(POLICY_ID, BATCH_1);
        assertEq(
            uint8(batch.state),
            uint8(
                AssuranceVault.BatchState.Committed
            )
        );
        assertEq(vault.totalValueReleased(), 0);
    }

    function test_RewrittenExpectedAnswerCannotUnlockPayment()
        public
    {
        _fund(POLICY_ID, FUND_AMOUNT);

        _commit(
            POLICY_ID,
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                POLICY_ID,
                BATCH_1,
                WORK_1,
                INPUT_1,
                WRONG_OUTPUT,
                1
            );
        _lock(output);

        bytes32 rewritten =
            keccak256("rewritten-ground-truth");

        bytes32 originalCommitment =
            vault.computeCanaryCommitment(
                POLICY_ID,
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                SCORER_ID_HASH,
                SALT_1
            );

        bytes32 rewrittenCommitment =
            vault.computeCanaryCommitment(
                POLICY_ID,
                BATCH_1,
                WORK_1,
                INPUT_1,
                rewritten,
                SCORER_ID_HASH,
                SALT_1
            );

        vm.prank(funder);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault
                    .CommitmentMismatch
                    .selector,
                originalCommitment,
                rewrittenCommitment
            )
        );
        vault.revealCanary(
            POLICY_ID,
            BATCH_1,
            WORK_1,
            INPUT_1,
            rewritten,
            SALT_1
        );

        assertEq(vault.totalValueReleased(), 0);
    }

    function test_RejectingRecipientCannotLoseFundsAndExpiryRecovers()
        public
    {
        bytes32 policy2 = keccak256("policy-reject");
        bytes32 batch2 = keccak256("batch-reject");
        bytes32 work2 = keccak256("work-reject");
        bytes32 input2 = keccak256("input-reject");
        bytes32 expected2 = keccak256("expected-reject");
        bytes32 salt2 = keccak256("salt-reject");

        RejectingRecipient rejecting =
            new RejectingRecipient();

        uint64 policy2Expiry =
            uint64(block.timestamp + 1 days);

        vault.createPolicy(
            policy2,
            funder,
            provider,
            address(rejecting),
            SCORER_ID_HASH,
            2,
            POLICY_CAP,
            UNIT_PAYOUT,
            policy2Expiry
        );

        _fund(policy2, FUND_AMOUNT);

        bytes32 commitment =
            vault.computeCanaryCommitment(
                policy2,
                batch2,
                work2,
                input2,
                expected2,
                SCORER_ID_HASH,
                salt2
            );

        vm.prank(funder);
        vault.commitBatch(
            policy2,
            batch2,
            commitment
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                policy2,
                batch2,
                work2,
                input2,
                expected2,
                10
            );

        vault.lockProviderOutput(
            output,
            _sign(output, PROVIDER_PK)
        );

        vm.prank(funder);
        vault.revealCanary(
            policy2,
            batch2,
            work2,
            input2,
            expected2,
            salt2
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault.NativeTransferFailed.selector,
                address(rejecting),
                UNIT_PAYOUT
            )
        );
        vault.resolveBatch(policy2, batch2);

        AssuranceVault.Policy memory policy =
            vault.getPolicy(policy2);
        assertEq(policy.totalPaidOut, 0);
        assertEq(
            vault.remainingFor(policy2),
            FUND_AMOUNT
        );

        AssuranceVault.Batch memory batch =
            vault.getBatch(policy2, batch2);
        assertEq(
            uint8(batch.state),
            uint8(AssuranceVault.BatchState.Revealed)
        );

        vm.warp(uint256(policy2Expiry) + 1);

        vm.prank(funder);
        vault.cancelExpiredBatch(policy2, batch2);

        uint256 beforeRefund = funder.balance;
        vm.prank(funder);
        vault.refundProtectedRemainder(policy2);

        assertEq(
            funder.balance,
            beforeRefund + FUND_AMOUNT
        );
        assertEq(vault.remainingFor(policy2), 0);
    }

    function test_PooledBalanceCannotSubsidizeUnderfundedPolicy()
        public
    {
        bytes32 richPolicy = keccak256("rich-policy");
        bytes32 smallPolicy = keccak256("small-policy");

        vault.createPolicy(
            richPolicy,
            funder,
            provider,
            payoutRecipient,
            SCORER_ID_HASH,
            2,
            POLICY_CAP,
            UNIT_PAYOUT,
            expiry
        );

        uint256 largeUnit =
            8_000_000_000_000_000;

        vault.createPolicy(
            smallPolicy,
            funder,
            provider,
            payoutRecipient,
            SCORER_ID_HASH,
            2,
            POLICY_CAP,
            largeUnit,
            expiry
        );

        _fund(richPolicy, FUND_AMOUNT);
        _fund(
            smallPolicy,
            5_000_000_000_000_000
        );

        bytes32 commitment =
            vault.computeCanaryCommitment(
                smallPolicy,
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                SCORER_ID_HASH,
                SALT_1
            );

        vm.prank(funder);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault
                    .InsufficientPolicyLiability
                    .selector,
                largeUnit,
                5_000_000_000_000_000
            )
        );
        vault.commitBatch(
            smallPolicy,
            BATCH_1,
            commitment
        );
    }

    function test_DirectFundingIsRejected() public {
        vm.deal(address(this), 1 ether);

        (bool ok, bytes memory data) =
            address(vault).call{value: 1}("");

        assertFalse(ok);

        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }

        assertEq(
            selector,
            AssuranceVault.DirectFundingDisabled.selector
        );
    }
}


contract AssuranceVaultWrongChainTest is Test {
    function test_ConstructorRejectsWrongChainBinding() public {
        vm.chainId(5042);

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceVault.WrongChain.selector,
                1,
                5042
            )
        );

        new AssuranceVault(
            address(this),
            1,
            0x3600000000000000000000000000000000000000,
            50_000_000_000_000_000
        );
    }
}
