// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GoldenVectorCrossLanguageTest is Test {
    bytes32 internal constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 internal constant PROVIDER_OUTPUT_TYPEHASH = keccak256(
        "ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)"
    );

    bytes32 internal constant CANARY_TYPEHASH = keccak256(
        "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)"
    );

    function test_JSAndSolidityGoldenVectorMatch() public {
        string memory json =
            vm.readFile("fixtures/golden/provider-output-pass-v1.json");

        uint256 chainId = vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.network.chain_id"
            )
        );
        address verifyingContract = vm.parseJsonAddress(
            json,
            ".evidence_packet.network.verifying_contract"
        );
        address provider = vm.parseJsonAddress(
            json,
            ".evidence_packet.provider.expected_provider"
        );

        bytes32 policyId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.policy_id"
        );
        bytes32 batchId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.batch_id"
        );
        bytes32 workId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.work_id"
        );
        bytes32 inputHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.input_hash"
        );
        bytes32 outputHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.output_hash"
        );
        bytes32 scorerIdHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.scorer_id_hash"
        );
        bytes32 expectedOutputHash = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.expected_output_hash"
        );
        bytes32 salt = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.salt"
        );
        uint256 nonce = vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.provider.nonce"
            )
        );
        uint256 deadline = vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.provider.deadline"
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ARC_ASSURANCE")),
                keccak256(bytes("1")),
                chainId,
                verifyingContract
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                PROVIDER_OUTPUT_TYPEHASH,
                provider,
                policyId,
                batchId,
                workId,
                inputHash,
                outputHash,
                scorerIdHash,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                hex"1901",
                domainSeparator,
                structHash
            )
        );

        assertEq(
            digest,
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.eip712_digest"
            ),
            "EIP-712 digest mismatch"
        );

        bytes memory signature = vm.parseJsonBytes(
            json,
            ".public_crypto_vector.signature"
        );

        assertEq(
            ECDSA.recover(digest, signature),
            provider,
            "provider recovery mismatch"
        );

        bytes32 commitment = keccak256(
            abi.encode(
                CANARY_TYPEHASH,
                chainId,
                verifyingContract,
                policyId,
                batchId,
                workId,
                inputHash,
                expectedOutputHash,
                scorerIdHash,
                salt
            )
        );

        assertEq(
            commitment,
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.commitment"
            ),
            "canary commitment mismatch"
        );

        bytes32 canaryKey = keccak256(
            abi.encode(
                inputHash,
                expectedOutputHash,
                scorerIdHash
            )
        );

        assertEq(
            canaryKey,
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.canary_key"
            ),
            "canary key mismatch"
        );
    }
}
