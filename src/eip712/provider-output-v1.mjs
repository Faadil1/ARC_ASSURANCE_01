export const EIP712_DOMAIN_NAME = "ARC_ASSURANCE";
export const EIP712_DOMAIN_VERSION = "1";
export const PROVIDER_OUTPUT_PRIMARY_TYPE = "ProviderOutput";

export const PROVIDER_OUTPUT_TYPES = Object.freeze({
  ProviderOutput: Object.freeze([
    { name: "provider", type: "address" },
    { name: "policyId", type: "bytes32" },
    { name: "batchId", type: "bytes32" },
    { name: "workId", type: "bytes32" },
    { name: "inputHash", type: "bytes32" },
    { name: "outputHash", type: "bytes32" },
    { name: "scorerIdHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ]),
});

export const PROVIDER_OUTPUT_TYPE_STRING =
  "ProviderOutput(address provider,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 scorerIdHash,uint256 nonce,uint256 deadline)";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

function requireAddress(value, label) {
  if (typeof value !== "string" || !ADDRESS_RE.test(value)) {
    throw new Error(`INVALID_${label.toUpperCase()}_ADDRESS`);
  }
  return value;
}

function requireBytes32(value, label) {
  if (typeof value !== "string" || !BYTES32_RE.test(value)) {
    throw new Error(`INVALID_${label.toUpperCase()}_BYTES32`);
  }
  if (/^0x0{64}$/i.test(value)) {
    throw new Error(`ZERO_${label.toUpperCase()}`);
  }
  return value;
}

function requireUint(value, label, { allowZero = true } = {}) {
  let normalized;

  if (typeof value === "bigint") {
    normalized = value;
  } else if (typeof value === "number" && Number.isSafeInteger(value)) {
    normalized = BigInt(value);
  } else if (typeof value === "string" && UINT_RE.test(value)) {
    normalized = BigInt(value);
  } else {
    throw new Error(`INVALID_${label.toUpperCase()}_UINT`);
  }

  if (normalized < 0n || (!allowZero && normalized === 0n)) {
    throw new Error(`INVALID_${label.toUpperCase()}_UINT`);
  }

  return normalized;
}

export function buildProviderOutputDomain({
  chainId,
  verifyingContract,
}) {
  const normalizedChainId = requireUint(chainId, "chain_id", {
    allowZero: false,
  });

  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: normalizedChainId,
    verifyingContract: requireAddress(
      verifyingContract,
      "verifying_contract"
    ),
  };
}

export function buildProviderOutputMessage({
  provider,
  policyId,
  batchId,
  workId,
  inputHash,
  outputHash,
  scorerIdHash,
  nonce,
  deadline,
}) {
  return {
    provider: requireAddress(provider, "provider"),
    policyId: requireBytes32(policyId, "policy_id"),
    batchId: requireBytes32(batchId, "batch_id"),
    workId: requireBytes32(workId, "work_id"),
    inputHash: requireBytes32(inputHash, "input_hash"),
    outputHash: requireBytes32(outputHash, "output_hash"),
    scorerIdHash: requireBytes32(scorerIdHash, "scorer_id_hash"),
    nonce: requireUint(nonce, "nonce"),
    deadline: requireUint(deadline, "deadline", {
      allowZero: false,
    }),
  };
}

export function buildProviderOutputTypedData({
  chainId,
  verifyingContract,
  message,
}) {
  return {
    domain: buildProviderOutputDomain({
      chainId,
      verifyingContract,
    }),
    types: PROVIDER_OUTPUT_TYPES,
    primaryType: PROVIDER_OUTPUT_PRIMARY_TYPE,
    message: buildProviderOutputMessage(message),
  };
}

export function typedDataToJsonSafe(typedData) {
  return JSON.parse(
    JSON.stringify(typedData, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
