// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

/// @notice Produces the Solidity side of the public deterministic golden vector.
/// @dev The derived key is PUBLIC TEST MATERIAL. Never fund its address.
contract GenerateGoldenVector is Script {
    string internal constant KEY_LABEL =
        "ARC_ASSURANCE_GOLDEN_VECTOR_V1_PUBLIC_TEST_KEY";

    address internal constant VERIFYING_CONTRACT =
        0x1111111111111111111111111111111111111111;

    bytes32 internal constant POLICY_ID =
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    bytes32 internal constant BATCH_ID =
        0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;
    bytes32 internal constant WORK_ID =
        0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc;
    bytes32 internal constant SALT =
        0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd;

    bytes32 internal constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 internal constant PROVIDER_OUTPUT_TYPEHASH = keccak256(
        "ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)"
    );

    bytes32 internal constant CANARY_COMMITMENT_TYPEHASH = keccak256(
        "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)"
    );

    function run() external {
        string memory inputText = string.concat(
            "Invoice A-1042\n",
            "Subtotal: 184.20 CAD\n",
            "Tax: 27.63 CAD\n",
            "Total: 211.83 CAD"
        );

        string memory canonicalOutput = string.concat(
            "ARC_ASSURANCE_INVOICE_V1\n",
            "invoice_number:A-1042\n",
            "subtotal_minor:18420\n",
            "tax_minor:2763\n",
            "total_minor:21183\n",
            "currency:CAD"
        );

        string memory scorerId =
            "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";

        uint256 publicTestKey =
            uint256(keccak256(bytes(KEY_LABEL)));
        address provider = vm.addr(publicTestKey);

        bytes32 inputHash = keccak256(bytes(inputText));
        bytes32 outputHash = keccak256(bytes(canonicalOutput));
        bytes32 scorerIdHash = keccak256(bytes(scorerId));

        bytes32 commitment = keccak256(
            abi.encode(
                CANARY_COMMITMENT_TYPEHASH,
                uint256(5042),
                VERIFYING_CONTRACT,
                POLICY_ID,
                BATCH_ID,
                WORK_ID,
                inputHash,
                outputHash,
                scorerIdHash,
                SALT
            )
        );

        bytes32 canaryKey = keccak256(
            abi.encode(
                inputHash,
                outputHash,
                scorerIdHash
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ARC_ASSURANCE")),
                keccak256(bytes("1")),
                uint256(5042),
                VERIFYING_CONTRACT
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                PROVIDER_OUTPUT_TYPEHASH,
                provider,
                POLICY_ID,
                BATCH_ID,
                WORK_ID,
                inputHash,
                outputHash,
                scorerIdHash,
                uint256(1),
                uint256(2_000_000_000)
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                hex"1901",
                domainSeparator,
                structHash
            )
        );

        string memory objectKey = "vector";
        vm.serializeString(
            objectKey,
            "vector_version",
            "ARC_ASSURANCE_GOLDEN_VECTOR_V1"
        );
        vm.serializeString(
            objectKey,
            "evidence_class",
            "SIMULATED"
        );
        vm.serializeAddress(
            objectKey,
            "provider",
            provider
        );
        vm.serializeBytes32(
            objectKey,
            "input_hash",
            inputHash
        );
        vm.serializeBytes32(
            objectKey,
            "output_hash",
            outputHash
        );
        vm.serializeBytes32(
            objectKey,
            "scorer_id_hash",
            scorerIdHash
        );
        vm.serializeBytes32(
            objectKey,
            "commitment",
            commitment
        );
        vm.serializeBytes32(
            objectKey,
            "canary_key",
            canaryKey
        );
        vm.serializeBytes32(
            objectKey,
            "domain_separator",
            domainSeparator
        );
        vm.serializeBytes32(
            objectKey,
            "provider_output_struct_hash",
            structHash
        );
        string memory json = vm.serializeBytes32(
            objectKey,
            "eip712_digest",
            digest
        );

        vm.writeJson(
            json,
            "build/out/golden-solidity.json"
        );
    }
}
