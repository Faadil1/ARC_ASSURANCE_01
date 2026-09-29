import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  stringToHex,
} from "viem";

export const CANARY_COMMITMENT_TYPE_STRING =
  "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";

export const CANARY_COMMITMENT_TYPEHASH =
  keccak256(stringToHex(CANARY_COMMITMENT_TYPE_STRING));

const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;

function requireBytes32(value, label) {
  if (
    typeof value !== "string" ||
    !BYTES32_RE.test(value) ||
    /^0x0{64}$/i.test(value)
  ) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return value;
}

export function computeCanaryCommitmentV1({
  chainId,
  verifyingContract,
  policyId,
  batchId,
  workId,
  inputHash,
  expectedOutputHash,
  scorerIdHash,
  salt,
}) {
  const normalizedChainId = BigInt(chainId);
  if (normalizedChainId <= 0n) {
    throw new Error("INVALID_CHAIN_ID");
  }

  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [
        CANARY_COMMITMENT_TYPEHASH,
        normalizedChainId,
        getAddress(verifyingContract),
        requireBytes32(policyId, "policy_id"),
        requireBytes32(batchId, "batch_id"),
        requireBytes32(workId, "work_id"),
        requireBytes32(inputHash, "input_hash"),
        requireBytes32(
          expectedOutputHash,
          "expected_output_hash"
        ),
        requireBytes32(
          scorerIdHash,
          "scorer_id_hash"
        ),
        requireBytes32(salt, "salt"),
      ]
    )
  );
}

export function computeCanaryKeyV1({
  inputHash,
  expectedOutputHash,
  scorerIdHash,
}) {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [
        requireBytes32(inputHash, "input_hash"),
        requireBytes32(
          expectedOutputHash,
          "expected_output_hash"
        ),
        requireBytes32(
          scorerIdHash,
          "scorer_id_hash"
        ),
      ]
    )
  );
}
