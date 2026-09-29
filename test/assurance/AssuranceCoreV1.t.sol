// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssuranceCoreV1} from "../../src/assurance/AssuranceCoreV1.sol";
import {ProviderOutputEIP712} from "../../src/eip712/ProviderOutputEIP712.sol";

contract AssuranceCoreV1Test is Test {
    uint256 internal constant PROVIDER_PK = 0xA11CE;
    uint256 internal constant WRONG_PROVIDER_PK = 0xB0B;

    bytes32 internal constant POLICY_ID = keccak256("policy-1");
    bytes32 internal constant BATCH_1 = keccak256("batch-1");
    bytes32 internal constant BATCH_2 = keccak256("batch-2");
    bytes32 internal constant WORK_1 = keccak256("work-1");
    bytes32 internal constant WORK_2 = keccak256("work-2");
    bytes32 internal constant INPUT_1 = keccak256("input-1");
    bytes32 internal constant INPUT_2 = keccak256("input-2");
    bytes32 internal constant EXPECTED_1 = keccak256("expected-1");
    bytes32 internal constant EXPECTED_2 = keccak256("expected-2");
    bytes32 internal constant WRONG_OUTPUT = keccak256("wrong-output");
    bytes32 internal constant SALT_1 = keccak256("salt-1");
    bytes32 internal constant SALT_2 = keccak256("salt-2");
    bytes32 internal constant SCORER_ID_HASH = keccak256(
        "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1"
    );

    address internal provider;
    address internal wrongProvider;

    AssuranceCoreV1 internal core;

    function setUp() public {
        vm.chainId(5042);
        provider = vm.addr(PROVIDER_PK);
        wrongProvider = vm.addr(WRONG_PROVIDER_PK);

        core = new AssuranceCoreV1();
        core.createPolicy(
            POLICY_ID,
            provider,
            SCORER_ID_HASH,
            2
        );
    }

    function _commit(
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    ) internal returns (bytes32 commitment) {
        commitment = core.computeCanaryCommitment(
            POLICY_ID,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            SCORER_ID_HASH,
            salt
        );

        core.commitBatch(
            POLICY_ID,
            batchId,
            commitment
        );
    }

    function _output(
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
            policyId: POLICY_ID,
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
        bytes32 digest = core.providerOutputDigest(output);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            digest
        );
        return abi.encodePacked(r, s, v);
    }

    function _lock(
        ProviderOutputEIP712.ProviderOutput memory output
    ) internal {
        core.lockProviderOutput(
            output,
            _sign(output, PROVIDER_PK)
        );
    }

    function _reveal(
        bytes32 batchId,
        bytes32 workId,
        bytes32 inputHash,
        bytes32 expectedOutputHash,
        bytes32 salt
    ) internal {
        core.revealCanary(
            POLICY_ID,
            batchId,
            workId,
            inputHash,
            expectedOutputHash,
            salt
        );
    }

    function test_PassProducesPayDirectiveOnly() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                1
            );

        _lock(output);
        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        AssuranceCoreV1.SettlementDirective directive =
            core.resolveBatch(POLICY_ID, BATCH_1);

        assertEq(
            uint8(directive),
            uint8(AssuranceCoreV1.SettlementDirective.PAY)
        );

        AssuranceCoreV1.Policy memory policy =
            core.getPolicy(POLICY_ID);
        assertEq(policy.failureCount, 0);
        assertFalse(policy.paused);
        assertEq(policy.activeBatchId, bytes32(0));
    }

    function test_FirstFailureWithholdsWithoutBreaker() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                WRONG_OUTPUT,
                1
            );

        _lock(output);
        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        AssuranceCoreV1.SettlementDirective directive =
            core.resolveBatch(POLICY_ID, BATCH_1);

        assertEq(
            uint8(directive),
            uint8(
                AssuranceCoreV1
                    .SettlementDirective
                    .WITHHOLD
            )
        );

        AssuranceCoreV1.Policy memory policy =
            core.getPolicy(POLICY_ID);
        assertEq(policy.failureCount, 1);
        assertFalse(policy.paused);
    }

    function test_SecondFailureTriggersBreaker() public {
        test_FirstFailureWithholdsWithoutBreaker();

        _commit(
            BATCH_2,
            WORK_2,
            INPUT_2,
            EXPECTED_2,
            SALT_2
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                BATCH_2,
                WORK_2,
                INPUT_2,
                WRONG_OUTPUT,
                2
            );

        _lock(output);
        _reveal(
            BATCH_2,
            WORK_2,
            INPUT_2,
            EXPECTED_2,
            SALT_2
        );

        AssuranceCoreV1.SettlementDirective directive =
            core.resolveBatch(POLICY_ID, BATCH_2);

        assertEq(
            uint8(directive),
            uint8(
                AssuranceCoreV1
                    .SettlementDirective
                    .BREAKER
            )
        );

        AssuranceCoreV1.Policy memory policy =
            core.getPolicy(POLICY_ID);
        assertEq(policy.failureCount, 2);
        assertTrue(policy.paused);

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.PolicyPaused.selector,
                POLICY_ID
            )
        );
        core.commitBatch(
            POLICY_ID,
            keccak256("batch-3"),
            keccak256("commitment-3")
        );
    }

    function test_RevealBeforeOutputLockIsRejected() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.InvalidBatchState.selector,
                AssuranceCoreV1.BatchState.OutputLocked,
                AssuranceCoreV1.BatchState.Committed
            )
        );

        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );
    }

    function test_WrongRevealCannotRewriteExpectedAnswer() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                WRONG_OUTPUT,
                1
            );

        _lock(output);

        bytes32 falseExpected = keccak256("buyer-rewrite");
        bytes32 actualCommitment = core.computeCanaryCommitment(
            POLICY_ID,
            BATCH_1,
            WORK_1,
            INPUT_1,
            falseExpected,
            SCORER_ID_HASH,
            SALT_1
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.CommitmentMismatch.selector,
                core.getBatch(POLICY_ID, BATCH_1).commitment,
                actualCommitment
            )
        );

        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            falseExpected,
            SALT_1
        );
    }

    function test_SameCanaryCannotBeReusedAfterReveal() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );
        ProviderOutputEIP712.ProviderOutput memory first =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                1
            );
        _lock(first);
        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );
        core.resolveBatch(POLICY_ID, BATCH_1);

        bytes32 newSalt = keccak256("different-salt");
        _commit(
            BATCH_2,
            WORK_2,
            INPUT_1,
            EXPECTED_1,
            newSalt
        );

        ProviderOutputEIP712.ProviderOutput memory second =
            _output(
                BATCH_2,
                WORK_2,
                INPUT_1,
                EXPECTED_1,
                2
            );
        _lock(second);

        bytes32 key = core.computeCanaryKey(
            INPUT_1,
            EXPECTED_1,
            SCORER_ID_HASH
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.CanaryAlreadyUsed.selector,
                key
            )
        );

        _reveal(
            BATCH_2,
            WORK_2,
            INPUT_1,
            EXPECTED_1,
            newSalt
        );
    }

    function test_WorkIdCannotBeLockedTwice() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );
        ProviderOutputEIP712.ProviderOutput memory first =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                1
            );
        _lock(first);
        _reveal(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );
        core.resolveBatch(POLICY_ID, BATCH_1);

        _commit(
            BATCH_2,
            WORK_1,
            INPUT_2,
            EXPECTED_2,
            SALT_2
        );
        ProviderOutputEIP712.ProviderOutput memory second =
            _output(
                BATCH_2,
                WORK_1,
                INPUT_2,
                EXPECTED_2,
                2
            );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.WorkIdAlreadyUsed.selector,
                WORK_1
            )
        );
        _lock(second);
    }

    function test_WrongProviderSignatureIsRejected() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        ProviderOutputEIP712.ProviderOutput memory output =
            _output(
                BATCH_1,
                WORK_1,
                INPUT_1,
                EXPECTED_1,
                1
            );

        bytes memory wrongSignature =
            _sign(output, WRONG_PROVIDER_PK);

        vm.expectRevert(
            ProviderOutputEIP712
                .ProviderSignatureMismatch
                .selector
        );

        core.lockProviderOutput(
            output,
            wrongSignature
        );
    }

    function test_OnlyOneUnresolvedBatchPerPolicy() public {
        _commit(
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SALT_1
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.ActiveBatchExists.selector,
                BATCH_1
            )
        );

        core.commitBatch(
            POLICY_ID,
            BATCH_2,
            keccak256("some-commitment")
        );
    }

    function test_OnlyPrincipalCanCommitOrReveal() public {
        address stranger = makeAddr("stranger");

        bytes32 commitment = core.computeCanaryCommitment(
            POLICY_ID,
            BATCH_1,
            WORK_1,
            INPUT_1,
            EXPECTED_1,
            SCORER_ID_HASH,
            SALT_1
        );

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssuranceCoreV1.NotPolicyPrincipal.selector,
                address(this),
                stranger
            )
        );
        core.commitBatch(
            POLICY_ID,
            BATCH_1,
            commitment
        );
    }
}
