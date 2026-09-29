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

    struct ProviderVector {
        address provider;
        bytes32 policyId;
        bytes32 batchId;
        bytes32 workId;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 scorerIdHash;
        uint256 nonce;
        uint256 deadline;
    }

    struct CanaryVector {
        bytes32 policyId;
        bytes32 batchId;
        bytes32 workId;
        bytes32 inputHash;
        bytes32 expectedOutputHash;
        bytes32 scorerIdHash;
        bytes32 salt;
    }

    function test_JSAndSolidityGoldenVectorMatch() public {
        string memory json =
            vm.readFile("fixtures/golden/provider-output-pass-v1.json");

        uint256 chainId = _chainId(json);
        address verifyingContract = _verifyingContract(json);
        ProviderVector memory providerVector =
            _loadProviderVector(json);
        CanaryVector memory canaryVector =
            _loadCanaryVector(json);

        bytes32 digest = _typedDigest(
            chainId,
            verifyingContract,
            providerVector
        );

        assertEq(
            digest,
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.eip712_digest"
            ),
            "EIP-712 digest mismatch"
        );

        assertEq(
            ECDSA.recover(
                digest,
                vm.parseJsonBytes(
                    json,
                    ".public_crypto_vector.signature"
                )
            ),
            providerVector.provider,
            "provider recovery mismatch"
        );

        assertEq(
            _canaryCommitment(
                chainId,
                verifyingContract,
                canaryVector
            ),
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.commitment"
            ),
            "canary commitment mismatch"
        );

        assertEq(
            _canaryKey(canaryVector),
            vm.parseJsonBytes32(
                json,
                ".public_crypto_vector.canary_key"
            ),
            "canary key mismatch"
        );
    }

    function _loadProviderVector(
        string memory json
    ) internal view returns (ProviderVector memory v) {
        v.provider = vm.parseJsonAddress(
            json,
            ".evidence_packet.provider.expected_provider"
        );
        v.policyId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.policy_id"
        );
        v.batchId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.batch_id"
        );
        v.workId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.work_id"
        );
        v.inputHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.input_hash"
        );
        v.outputHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.output_hash"
        );
        v.scorerIdHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.scorer_id_hash"
        );
        v.nonce = vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.provider.nonce"
            )
        );
        v.deadline = vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.provider.deadline"
            )
        );
    }

    function _loadCanaryVector(
        string memory json
    ) internal view returns (CanaryVector memory v) {
        v.policyId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.policy_id"
        );
        v.batchId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.batch_id"
        );
        v.workId = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.work_id"
        );
        v.inputHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.input_hash"
        );
        v.expectedOutputHash = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.expected_output_hash"
        );
        v.scorerIdHash = vm.parseJsonBytes32(
            json,
            ".public_crypto_vector.scorer_id_hash"
        );
        v.salt = vm.parseJsonBytes32(
            json,
            ".evidence_packet.reveal.salt"
        );
    }

    function _typedDigest(
        uint256 chainId,
        address verifyingContract,
        ProviderVector memory v
    ) internal pure returns (bytes32) {
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
                v.provider,
                v.policyId,
                v.batchId,
                v.workId,
                v.inputHash,
                v.outputHash,
                v.scorerIdHash,
                v.nonce,
                v.deadline
            )
        );

        return keccak256(
            abi.encodePacked(
                hex"1901",
                domainSeparator,
                structHash
            )
        );
    }

    function _canaryCommitment(
        uint256 chainId,
        address verifyingContract,
        CanaryVector memory v
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                CANARY_TYPEHASH,
                chainId,
                verifyingContract,
                v.policyId,
                v.batchId,
                v.workId,
                v.inputHash,
                v.expectedOutputHash,
                v.scorerIdHash,
                v.salt
            )
        );
    }

    function _canaryKey(
        CanaryVector memory v
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                v.inputHash,
                v.expectedOutputHash,
                v.scorerIdHash
            )
        );
    }

    function _chainId(string memory json)
        internal
        view
        returns (uint256)
    {
        return vm.parseUint(
            vm.parseJsonString(
                json,
                ".evidence_packet.network.chain_id"
            )
        );
    }

    function _verifyingContract(string memory json)
        internal
        view
        returns (address)
    {
        return vm.parseJsonAddress(
            json,
            ".evidence_packet.network.verifying_contract"
        );
    }
}
