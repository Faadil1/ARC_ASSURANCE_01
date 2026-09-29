// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProviderOutputEIP712} from "../../src/eip712/ProviderOutputEIP712.sol";

contract ProviderOutputHarness is ProviderOutputEIP712 {
    function verifyAndConsume(
        ProviderOutput memory output,
        bytes memory signature,
        address expectedProvider
    ) external returns (bytes32) {
        return _verifyAndConsumeProviderOutput(
            output,
            signature,
            expectedProvider
        );
    }
}

contract ProviderOutputEIP712Test is Test {
    uint256 internal constant PROVIDER_PK = 0xA11CE;
    address internal provider;

    ProviderOutputHarness internal harness;

    function setUp() public {
        vm.chainId(5042);
        provider = vm.addr(PROVIDER_PK);
        harness = new ProviderOutputHarness();
    }

    function _message()
        internal
        view
        returns (ProviderOutputEIP712.ProviderOutput memory)
    {
        return ProviderOutputEIP712.ProviderOutput({
            provider: provider,
            policyId: keccak256("policy-1"),
            batchId: keccak256("batch-1"),
            workId: keccak256("work-1"),
            inputHash: keccak256("input"),
            outputHash: keccak256("output"),
            scorerIdHash: keccak256(
                "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1"
            ),
            nonce: 1,
            deadline: block.timestamp + 1 hours
        });
    }

    function _signature(
        ProviderOutputEIP712.ProviderOutput memory output
    ) internal returns (bytes memory) {
        bytes32 digest = harness.providerOutputDigest(output);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            PROVIDER_PK,
            digest
        );
        return abi.encodePacked(r, s, v);
    }

    function test_ValidSignatureRecoversAndConsumes() public {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);

        assertEq(
            harness.recoverProvider(output, signature),
            provider
        );

        bytes32 digest = harness.verifyAndConsume(
            output,
            signature,
            provider
        );

        assertTrue(harness.providerOutputConsumed(digest));
    }

    function test_ReplayOfSameDigestIsRejected() public {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);

        harness.verifyAndConsume(output, signature, provider);

        vm.expectRevert(
            abi.encodeWithSelector(
                ProviderOutputEIP712
                    .ProviderOutputAlreadyConsumed
                    .selector,
                harness.providerOutputDigest(output)
            )
        );
        harness.verifyAndConsume(output, signature, provider);
    }

    function test_MutatingOutputHashBreaksSignature() public {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);

        output.outputHash = keccak256("different-output");

        address recovered = harness.recoverProvider(
            output,
            signature
        );
        assertTrue(recovered != provider);
    }

    function test_CrossContractReplayFails() public {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);

        ProviderOutputHarness other =
            new ProviderOutputHarness();

        address recovered = other.recoverProvider(
            output,
            signature
        );
        assertTrue(recovered != provider);
    }

    function test_ExpiredSignatureIsRejected() public {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);

        vm.warp(output.deadline + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                ProviderOutputEIP712
                    .ProviderSignatureExpired
                    .selector,
                output.deadline,
                block.timestamp
            )
        );
        harness.verifyAndConsume(output, signature, provider);
    }

    function test_DeclaredProviderMustMatchExpectedProvider()
        public
    {
        ProviderOutputEIP712.ProviderOutput memory output =
            _message();
        bytes memory signature = _signature(output);
        address wrong = makeAddr("wrong-provider");

        vm.expectRevert(
            abi.encodeWithSelector(
                ProviderOutputEIP712
                    .ProviderFieldMismatch
                    .selector,
                wrong,
                provider
            )
        );
        harness.verifyAndConsume(output, signature, wrong);
    }
}
