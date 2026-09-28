# Provider Service v1

**Status:** LOCAL implementation candidate  
**Evidence target:** REAL_WORK gate, not financial settlement.

## Purpose

Provide a real, deterministic HTTP service that performs structured invoice extraction for the MVP.

This service deliberately avoids an LLM or third-party API on the critical path.

## Endpoint

### POST /v1/extract

Request:

```json
{
  "input_text": "Invoice A-1042\nSubtotal: 184.20 CAD\nTax: 27.63 CAD\nTotal: 211.83 CAD"
}
```

Normal response:

```json
{
  "provider_id": "ARC_ASSURANCE_PROVIDER_V1",
  "schema_version": "invoice-v1",
  "result": {
    "invoice_number": "A-1042",
    "subtotal_minor": 18420,
    "tax_minor": 2763,
    "total_minor": 21183,
    "currency": "CAD"
  },
  "evidence": {
    "execution": "REAL_COMPUTE",
    "fault_mode": "NONE",
    "fault_injected": false,
    "signature_status": "NOT_IMPLEMENTED"
  }
}
```

## What "REAL_COMPUTE" means

The service actually parses the supplied invoice text at request time.

It does **not** mean:

- third-party provider;
- external-user evidence;
- signed provider output;
- Arc mainnet integration;
- live financial consequence.

Those remain separate gates.

## Controlled fault injection

Fault injection is OFF by default.

It is enabled only when:

```
ALLOW_DEMO_FAULTS=true
```

and the request explicitly sends:

```
x-demo-fault: WRONG_TOTAL
```

Supported demo modes:

- NONE
- WRONG_AMOUNT_VALID — **preferred hero negative path**; wrong result remains schema-valid/canonicalizable
- WRONG_TOTAL
- LOWERCASE_CURRENCY
- DROP_FIELD
- WRONG_INVOICE_NUMBER

Every injected response declares:

```json
{
  "fault_mode": "...",
  "fault_injected": true
}
```

A controlled fault must never be described as an organic provider failure.

For the final signed hero path, prefer `WRONG_AMOUNT_VALID`. It changes tax and total together, so the result remains structurally valid and can be canonically hashed/signed while still failing exact-match scoring.

Malformed modes such as `WRONG_TOTAL`, `LOWERCASE_CURRENCY`, and `DROP_FIELD` are boundary tests. Until a signed raw-envelope protocol exists, they should route to REVIEW/ABSTAIN rather than being silently converted into a financially counted provider failure.

## Signature boundary

The service currently returns:

```
signature_status: NOT_IMPLEMENTED
```

EIP-712 provider binding belongs to the contract/provider integration surface and must be reviewed with Opeyemi.

No unsigned output can satisfy the final SIGNED OUTPUT invariant.

## Parser boundary

The current parser expects:

- one invoice identifier;
- Subtotal line;
- Tax line;
- Total line;
- exactly one matching 3-letter currency.

This is a narrow MVP parser, not a general OCR engine.

## Failure semantics

Malformed input returns 400 and no result.

The service never fabricates a best-effort output when required fields are absent.

## Local test command

```bash
node --test \
  test/scorer/invoice-v1.test.mjs \
  test/provider/provider-v1.test.mjs
```

The final provider deployment must later prove:

- deployed runtime;
- exact commit binding;
- clean-room startup;
- external dependency failure behavior;
- real request/response capture.
