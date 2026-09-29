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

        _assertEip712(json);
        _assertCanaryCommitment(json);
        _assertCanaryKey(json);
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

    function _assertEip712(string memory json)
        internal
        view
    {
        address provider = vm.parseJsonAddress(
            json,
            ".evidence_packet.provider.expected_provider"
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ARC_ASSURANCE")),
                keccak256(bytes("1")),
                _chainId(json),
                _verifyingContract(json)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                PROVIDER_OUTPUT_TYPEHASH,
                provider,
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.policy_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.batch_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.work_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.input_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.output_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.scorer_id_hash"
                ),
                vm.parseUint(
                    vm.parseJsonString(
                        json,
                        ".evidence_packet.provider.nonce"
                    )
                ),
                vm.parseUint(
                    vm.parseJsonString(
                        json,
                        ".evidence_packet.provider.deadline"
                    )
                )
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

        assertEq(
            ECDSA.recover(
                digest,
                vm.parseJsonBytes(
                    json,
                    ".public_crypto_vector.signature"
                )
            ),
            provider,
            "provider recovery mismatch"
        );
    }

    function _assertCanaryCommitment(
        string memory json
    ) internal view {
        bytes32 commitment = keccak256(
            abi.encode(
                CANARY_TYPEHASH,
                _chainId(json),
                _verifyingContract(json),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.policy_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.batch_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.work_id"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.input_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.expected_output_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.scorer_id_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.salt"
                )
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
    }

    function _assertCanaryKey(
        string memory json
    ) internal view {
        bytes32 canaryKey = keccak256(
            abi.encode(
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.input_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".evidence_packet.reveal.expected_output_hash"
                ),
                vm.parseJsonBytes32(
                    json,
                    ".public_crypto_vector.scorer_id_hash"
                )
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
