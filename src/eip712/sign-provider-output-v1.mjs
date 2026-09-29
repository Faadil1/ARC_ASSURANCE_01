import {
  getAddress,
  hashTypedData,
  keccak256,
  stringToHex,
  verifyTypedData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SCORER_ID } from "../scorer/invoice-v1.mjs";
import {
  buildProviderOutputTypedData,
  typedDataToJsonSafe,
} from "./provider-output-v1.mjs";

export function keccakUtf8(value) {
  if (typeof value !== "string") {
    throw new TypeError("KECCAK_UTF8_REQUIRES_STRING");
  }
  return keccak256(stringToHex(value));
}

export function buildProviderOutputHashes({
  inputText,
  canonicalOutput,
  scorerId = SCORER_ID,
}) {
  if (typeof canonicalOutput !== "string") {
    throw new Error("CANONICAL_OUTPUT_REQUIRED_FOR_SIGNING");
  }

  return {
    inputHash: keccakUtf8(inputText),
    outputHash: keccakUtf8(canonicalOutput),
    scorerIdHash: keccakUtf8(scorerId),
  };
}

export async function signProviderOutputV1({
  privateKey,
  chainId,
  verifyingContract,
  policyId,
  batchId,
  workId,
  inputText,
  canonicalOutput,
  nonce,
  deadline,
  scorerId = SCORER_ID,
}) {
  const account = privateKeyToAccount(privateKey);
  const hashes = buildProviderOutputHashes({
    inputText,
    canonicalOutput,
    scorerId,
  });

  const typedData = buildProviderOutputTypedData({
    chainId,
    verifyingContract,
    message: {
      provider: account.address,
      policyId,
      batchId,
      workId,
      ...hashes,
      nonce,
      deadline,
    },
  });

  const signature = await account.signTypedData(typedData);
  const digest = hashTypedData(typedData);

  const verified = await verifyTypedData({
    address: account.address,
    ...typedData,
    signature,
  });

  if (!verified) {
    throw new Error("SELF_VERIFICATION_FAILED");
  }

  return {
    signature,
    digest,
    signer: getAddress(account.address),
    hashes,
    typedData,
    typedDataJson: typedDataToJsonSafe(typedData),
  };
}

export async function verifyProviderOutputV1({
  expectedProvider,
  signature,
  typedData,
}) {
  return verifyTypedData({
    address: getAddress(expectedProvider),
    ...typedData,
    signature,
  });
}
