import test from "node:test";
import assert from "node:assert/strict";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  signProviderOutputV1,
  verifyProviderOutputV1,
} from "../../src/eip712/sign-provider-output-v1.mjs";
import {
  buildProviderOutputTypedData,
} from "../../src/eip712/provider-output-v1.mjs";

const VERIFYING_CONTRACT =
  "0x1111111111111111111111111111111111111111";

const binding = {
  policyId:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  batchId:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  workId:
    "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  nonce: 1,
  deadline: 2000000000,
};

const inputText = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

const canonicalOutput = [
  "ARC_ASSURANCE_INVOICE_V1",
  "invoice_number:A-1042",
  "subtotal_minor:18420",
  "tax_minor:2763",
  "total_minor:21183",
  "currency:CAD",
].join("\n");

test("provider output signs and verifies under Arc domain", async () => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const signed = await signProviderOutputV1({
    privateKey,
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    ...binding,
    inputText,
    canonicalOutput,
  });

  assert.equal(signed.signer, account.address);
  assert.match(signed.signature, /^0x[0-9a-f]{130}$/i);
  assert.match(signed.digest, /^0x[0-9a-f]{64}$/i);

  assert.equal(
    await verifyProviderOutputV1({
      expectedProvider: account.address,
      signature: signed.signature,
      typedData: signed.typedData,
    }),
    true
  );
});

test("changing output hash invalidates the signature", async () => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const signed = await signProviderOutputV1({
    privateKey,
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    ...binding,
    inputText,
    canonicalOutput,
  });

  const mutated = buildProviderOutputTypedData({
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    message: {
      ...signed.typedData.message,
      outputHash:
        "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    },
  });

  assert.equal(
    await verifyProviderOutputV1({
      expectedProvider: account.address,
      signature: signed.signature,
      typedData: mutated,
    }),
    false
  );
});

test("changing verifying contract invalidates the signature", async () => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const signed = await signProviderOutputV1({
    privateKey,
    chainId: 5042,
    verifyingContract: VERIFYING_CONTRACT,
    ...binding,
    inputText,
    canonicalOutput,
  });

  const otherDomain = buildProviderOutputTypedData({
    chainId: 5042,
    verifyingContract:
      "0x2222222222222222222222222222222222222222",
    message: signed.typedData.message,
  });

  assert.equal(
    await verifyProviderOutputV1({
      expectedProvider: account.address,
      signature: signed.signature,
      typedData: otherDomain,
    }),
    false
  );
});
