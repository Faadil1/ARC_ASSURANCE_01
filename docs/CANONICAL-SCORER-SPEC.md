# Canonical Scorer Specification — Invoice Exact v1

**Scorer ID:** `ARC_ASSURANCE_SCORER_V1:invoice-exact-v1`  
**Status:** LOCAL_VERIFIED / hash vectors require independent Arc-tool cross-check before contract binding.

## Purpose

Provide the smallest deterministic scorer for the ARC_ASSURANCE_01 MVP.

The scorer does not estimate semantic quality. It answers one narrow question:

> Does the provider's structured invoice result exactly match the prevalidated known-answer canary under a fixed schema?

## Schema

Exactly five fields are permitted:

```json
{
  "invoice_number": "A-1042",
  "subtotal_minor": 18420,
  "tax_minor": 2763,
  "total_minor": 21183,
  "currency": "CAD"
}
```

Rules:

- `invoice_number`: uppercase ASCII pattern `[A-Z0-9][A-Z0-9._/-]{0,63}`
- `subtotal_minor`, `tax_minor`, `total_minor`: non-negative JavaScript-safe integers
- `subtotal_minor + tax_minor == total_minor`
- `currency`: exactly three uppercase ASCII letters
- no extra fields
- no implicit trim
- no implicit case conversion
- no floating point monetary values

For MVP fixtures we use currencies represented with two minor decimal places. General ISO-4217 exponent handling is outside v1.

## Canonical form

Fields are serialized in this exact order as UTF-8 ASCII-compatible text:

```
ARC_ASSURANCE_INVOICE_V1
invoice_number:<value>
subtotal_minor:<value>
tax_minor:<value>
total_minor:<value>
currency:<value>
```

No trailing newline is added.

Expected output commitment:

```
expectedOutputHash = keccak256(bytes(canonicalOutput))
```

Scorer identity commitment:

```
scorerIdHash = keccak256(
  bytes("ARC_ASSURANCE_SCORER_V1:invoice-exact-v1")
)
```

The supplied keccak vectors are development vectors and must be independently cross-checked using the Arc/EVM toolchain before they become contract-bound evidence.

## Verdict semantics

### PASS

All five fields are valid and exactly equal.

### FIELD_MISMATCH

The provider returned a structurally valid result but one or more fields differ.

### MALFORMED_ACTUAL

The provider result violates the schema or arithmetic invariant.

### INVALID_EXPECTED_INVOICE_V1

This is a **configuration error**, not a provider failure.

If the canary ground truth itself is invalid, resolution must abort/review rather than silently withholding payment from the provider.

This is a required Negative Path behavior.

## Why integer minor units

Using `18420` instead of `184.20` avoids:

- floating-point differences;
- decimal-string normalization ambiguity;
- locale-specific separators;
- cross-runtime rounding disagreement.

## Hidden-canary lifecycle

Public fixtures in `fixtures/canaries/` are **PRESEEDED test vectors** only.

They are intentionally not eligible for a live hidden-canary run.

A live canary must:

1. be generated/selected outside the public repo;
2. have ground truth validated before commitment;
3. receive a fresh salt;
4. be committed before provider output lock;
5. remain undisclosed until reveal;
6. never be reused after reveal.

## Evidence boundary

This scorer can prove deterministic equality against a known answer.

It cannot prove:

- the known answer is philosophically correct;
- the task represents all real provider work;
- the provider did not recognize the canary;
- the provider is generally high-quality.

Those remain separate Product Depth / Reality gates.

## Local verification

Run:

```bash
node --test test/scorer/invoice-v1.test.mjs
```

Current local authoring result on 2026-09-28:

```
tests: 8
pass: 8
fail: 0
```

This is LOCAL evidence only, not Arc mainnet proof.
