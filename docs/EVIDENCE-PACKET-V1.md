# Evidence Packet v1

The verifier consumes a JSON evidence packet.

This is an **offline evidence format**, not yet a direct Arc RPC reconstruction.

Required top-level fields:

```json
{
  "version": "ARC_ASSURANCE_EVIDENCE_V1",
  "network": {},
  "work": {},
  "provider": {},
  "reveal": {},
  "chain_events": [],
  "financial_evidence": null
}
```

## Network

```json
{
  "chain_id": "5042",
  "verifying_contract": "0x..."
}
```

## Work

```json
{
  "input_text": "...",
  "canonical_output": "...",
  "scorer_id": "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1"
}
```

The verifier recomputes:

- `inputHash`
- `outputHash`
- `scorerIdHash`

It does not trust supplied copies of those hashes.

## Provider

```json
{
  "expected_provider": "0x...",
  "nonce": "1",
  "deadline": "2000000000",
  "signature": "0x..."
}
```

The verifier reconstructs the EIP-712 typed data from trusted packet fields, recomputes the digest, and verifies the signature.

## Reveal

```json
{
  "policy_id": "0x...",
  "batch_id": "0x...",
  "work_id": "0x...",
  "expected_output_hash": "0x...",
  "salt": "0x...",
  "commitment": "0x..."
}
```

The verifier recomputes the commitment using:

- Arc chain id;
- exact verifying contract;
- policy/batch/work;
- recomputed input hash;
- revealed expected output hash;
- recomputed scorer id hash;
- salt.

## Chain events

Exactly one of each is required:

1. `BatchCommitted`
2. `ProviderOutputLocked`
3. `CanaryRevealed`
4. `BatchResolved`

Each event must include:

- `block_number`
- `log_index`

and its relevant event fields.

Ordering is checked lexicographically by:

```text
(block_number, log_index)
```

not by application timestamp.

For `ProviderOutputLocked`, supplying `block_timestamp` allows the verifier to independently check that the signed deadline had not expired at output lock.

## Financial evidence

Current verifier v1 does **not** query Arc RPC or independently verify custody/payment logs.

Therefore:

```json
"financial_evidence": null
```

produces:

```text
financial_causality = NOT_PROVEN
```

Even if a packet claims:

```json
{
  "status": "LIVE_ARC_MAINNET_VERIFIED"
}
```

the packet-only verifier will not promote that claim.

A later chain-native verifier must independently fetch and validate the custody/payment/refund receipts.

## CLI

```bash
node src/verifier/cli.mjs verify evidence.json
```

This can succeed for the cryptographic/core proof while still reporting:

```text
financial_causality = NOT_PROVEN
```

Stricter mode:

```bash
node src/verifier/cli.mjs verify evidence.json --require-financial
```

Until chain-native financial verification exists, that mode exits non-zero.

## Truth boundary

A valid evidence packet can prove that its supplied event data is internally consistent with the cryptographic commitment/signature and deterministic verdict.

It does **not** yet prove that the packet's event data came from Arc mainnet.

G6 Independent Verify remains BLOCKED until the verifier independently reads public chain data and binds it to the exact runtime/commit.
