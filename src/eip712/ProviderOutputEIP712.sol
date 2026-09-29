// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ProviderOutputEIP712
/// @notice Reusable EIP-712 binding for provider outputs in ARC_ASSURANCE_01.
/// @dev Intended to be inherited by the final assurance contract so the EIP-712
///      domain binds signatures to BOTH the active chain id and address(this).
///
///      EIP-712 itself does not provide replay protection. This module therefore
///      tracks consumed typed-data digests. The final assurance state machine
///      MUST ALSO enforce semantic uniqueness (for example one accepted output
///      per workId/batch state) before causing a financial consequence.
abstract contract ProviderOutputEIP712 is EIP712 {
    string internal constant SIGNING_DOMAIN = "ARC_ASSURANCE";
    string internal constant SIGNATURE_VERSION = "1";

    bytes32 public constant PROVIDER_OUTPUT_TYPEHASH = keccak256(
        "ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)"
    );

    struct ProviderOutput {
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

    error ZeroProvider();
    error ZeroProviderOutputField();
    error ProviderFieldMismatch(address expected, address declaredProvider);
    error ProviderSignatureMismatch(address expected, address recovered);
    error ProviderSignatureExpired(uint256 deadline, uint256 currentTimestamp);
    error ProviderOutputAlreadyConsumed(bytes32 digest);

    mapping(bytes32 => bool) private _consumedProviderOutputDigest;

    event ProviderOutputConsumed(
        bytes32 indexed digest,
        address indexed provider,
        bytes32 indexed workId,
        bytes32 policyId,
        bytes32 batchId,
        uint256 nonce
    );

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    function providerOutputStructHash(ProviderOutput memory output)
        public
        pure
        returns (bytes32)
    {
        _validateProviderOutputFields(output);

        return keccak256(
            abi.encode(
                PROVIDER_OUTPUT_TYPEHASH,
                output.provider,
                output.policyId,
                output.batchId,
                output.workId,
                output.inputHash,
                output.outputHash,
                output.scorerIdHash,
                output.nonce,
                output.deadline
            )
        );
    }

    function providerOutputDigest(ProviderOutput memory output)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(providerOutputStructHash(output));
    }

    function recoverProvider(
        ProviderOutput memory output,
        bytes memory signature
    ) public view returns (address) {
        return ECDSA.recover(providerOutputDigest(output), signature);
    }

    function providerOutputConsumed(bytes32 digest)
        public
        view
        returns (bool)
    {
        return _consumedProviderOutputDigest[digest];
    }

    /// @dev Verifies and consumes an exact provider-output digest.
    ///      The caller is responsible for enforcing policy/batch/work state.
    function _verifyAndConsumeProviderOutput(
        ProviderOutput memory output,
        bytes memory signature,
        address expectedProvider
    ) internal returns (bytes32 digest) {
        if (expectedProvider == address(0)) revert ZeroProvider();
        if (output.provider != expectedProvider) {
            revert ProviderFieldMismatch(
                expectedProvider,
                output.provider
            );
        }
        if (block.timestamp > output.deadline) {
            revert ProviderSignatureExpired(
                output.deadline,
                block.timestamp
            );
        }

        digest = providerOutputDigest(output);
        if (_consumedProviderOutputDigest[digest]) {
            revert ProviderOutputAlreadyConsumed(digest);
        }

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != expectedProvider) {
            revert ProviderSignatureMismatch(
                expectedProvider,
                recovered
            );
        }

        _consumedProviderOutputDigest[digest] = true;

        emit ProviderOutputConsumed(
            digest,
            expectedProvider,
            output.workId,
            output.policyId,
            output.batchId,
            output.nonce
        );
    }

    function _validateProviderOutputFields(ProviderOutput memory output)
        private
        pure
    {
        if (output.provider == address(0)) revert ZeroProvider();
        if (
            output.policyId == bytes32(0) ||
            output.batchId == bytes32(0) ||
            output.workId == bytes32(0) ||
            output.inputHash == bytes32(0) ||
            output.outputHash == bytes32(0) ||
            output.scorerIdHash == bytes32(0) ||
            output.deadline == 0
        ) {
            revert ZeroProviderOutputField();
        }
    }
}
