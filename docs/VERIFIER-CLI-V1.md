# Verifier CLI v1

**Status:** PRODUCED / REVALIDATION_REQUIRED  
**Branch:** `feat/verifier-cli-v1`

The verifier is the independent-consumption surface for the assurance proof.

## Goal

A reviewer should be able to verify, without trusting the frontend:

```text
commit existed first
→ provider signed this exact result
→ output was locked
→ hidden expected answer was revealed
→ reveal matched the earlier commitment
→ deterministic verdict followed
```

## Current verification mode

v1 is an **offline evidence-packet verifier**.

It independently recomputes cryptographic material inside the packet, but does not yet fetch Arc logs from RPC.

Therefore:

```text
CORE_PROOF_VALID
!=
ARC_MAINNET_PROOF
```

and:

```text
settlement directive
!=
financial causality
```

## What is recomputed

The verifier does not trust copied hash fields.

It recomputes:

- `inputHash` from exact input text bytes;
- `outputHash` from exact canonical output bytes;
- `scorerIdHash`;
- EIP-712 typed data;
- EIP-712 digest;
- provider signature validity;
- hidden-canary commitment;
- canary reuse fingerprint;
- deterministic PASS/FAIL.

It verifies event bindings and canonical event ordering using:

```text
(blockNumber, logIndex)
```

## Event ordering

Required:

```text
BatchCommitted
<
ProviderOutputLocked
<
CanaryRevealed
<
BatchResolved
```

For `BREAKER`:

```text
CanaryRevealed
<
CircuitBreakerTriggered
<
BatchResolved
```

## Fail-closed checks

Examples:

- wrong provider signature → invalid evidence;
- rewritten expected answer → commitment mismatch;
- reveal before lock / wrong event order → invalid evidence;
- FAIL paired with PAY → invalid evidence;
- BREAKER without breaker event → invalid evidence;
- packet self-declaring financial proof → ignored/untrusted.

## Financial mode

Normal:

```bash
node src/verifier/cli.mjs verify evidence.json
```

A valid core packet may return exit code 0 while clearly reporting:

```text
financial_causality = NOT_PROVEN_PACKET_ONLY
```

Strict:

```bash
node src/verifier/cli.mjs verify evidence.json --require-financial
```

Current v1 returns exit code 2 because packet-only evidence can never independently prove financial causality.

This prevents a JSON field from promoting itself to live financial proof.

## Golden vector

Generate a local public cryptographic vector:

```bash
npm run golden:generate > fixtures/golden/provider-output-pass-v1.json
```

The generator:

- creates an ephemeral provider key in memory;
- outputs only the public provider address/signature/digest;
- never outputs the generated private key;
- marks the vector `SIMULATED`;
- uses synthetic block/log positions.

The resulting vector is suitable for cross-language JS/Solidity equality testing, not for a LIVE claim.

## G6 boundary

G6 Independent Verify remains BLOCKED.

To promote G6, the next verifier version must:

1. connect to Arc mainnet RPC;
2. identify the deployed assurance/custody contracts;
3. fetch canonical logs/receipts itself;
4. bind evidence to the exact deployed bytecode/commit;
5. verify USDC custody/payment/no-pay/breaker/refund consequences;
6. reconstruct the hero run from public chain data + public repo artifacts.

That is the difference between an internally consistent evidence packet and an independently reconstructed live proof.
