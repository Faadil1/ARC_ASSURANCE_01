# Chain Verification Manifest v2

**Status:** schema for chain-native verification.

This manifest contains **selectors and off-chain material only**. Canonical events, receipts, deployed bytecode, transaction status, event positions and block timestamps are fetched directly from Arc mainnet RPC.

## Example shape

```json
{
  "t0": {
    "address": "0x...",
    "policy_id": "0x...",
    "from_block": "0",
    "runtime": {
      "expected_code_hash": "0x...",
      "source_commit": "..."
    }
  },
  "assurance": {
    "address": "0x...",
    "policy_id": "0x...",
    "batch_id": "0x...",
    "from_block": "0",
    "runtime": {
      "expected_code_hash": "0x...",
      "source_commit": "..."
    },
    "offchain": {
      "input_text": "...",
      "canonical_output": "...",
      "scorer_id": "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1",
      "nonce": "1",
      "deadline": "2000000000",
      "signature": "0x..."
    }
  }
}
```

## T0 proof

The chain-native T0 verifier independently fetches:

- `PolicyCreated`;
- `PolicyFunded`;
- `PaymentReleased`;
- `RemainingFundsRefunded`;
- `PolicyCompleted`;
- transaction receipts;
- deployed runtime bytecode.

It verifies:

```text
create < fund < payout < refund < complete
```

using canonical `blockNumber + logIndex`.

It also checks:

```text
funded amount == paid amount + refunded amount
paid amount == configured unit payout
paid remaining == refunded amount
funder/recipient bindings remain stable
all transactions succeeded
chain id == 5042
```

A successful result may be labeled:

```text
T0_CUSTODY_PROVEN_FROM_ARC
```

This proves the T0 custody primitive only.

## Assurance proof

The assurance verifier independently fetches:

- assurance `PolicyCreated`;
- `BatchCommitted`;
- `ProviderOutputLocked`;
- `CanaryRevealed`;
- `BatchResolved`;
- optional `CircuitBreakerTriggered`;
- output-lock block timestamp;
- transaction receipts;
- deployed runtime bytecode.

Only these pieces remain off-chain because they are not reconstructible from the current contract logs:

- exact input text;
- exact canonical output string;
- exact scorer ID string;
- provider signature;
- provider nonce;
- provider deadline.

The verifier combines chain-fetched events with that material, then runs the strict v1 cryptographic reconstruction.

A successful result may be labeled:

```text
ASSURANCE_CORE_PROVEN_FROM_ARC
```

It still does not prove a USDC consequence because `AssuranceCoreV1` is intentionally non-custodial.

## Runtime binding

The verifier always fetches deployed bytecode and computes:

```text
keccak256(runtimeBytecode)
```

If `expected_code_hash` is supplied, it must match.

Important:

```text
on-chain code hash == manifest expected code hash
```

does not, by itself, cryptographically prove which Git commit produced that bytecode.

The `source_commit` field is therefore a provenance claim until a reproducible build/CI artifact links that exact commit to the expected deployed bytecode hash.

Current runtime status when hashes match:

```text
CODE_HASH_MATCH_MANIFEST_COMMIT_PROVENANCE_STILL_REQUIRED
```

## Integrated financial causality

If both T0 and Assurance Core prove successfully while they remain separate primitives:

```text
T0_CUSTODY_PROVEN_FROM_ARC
+
ASSURANCE_CORE_PROVEN_FROM_ARC
!=
INTEGRATED_FINANCIAL_CAUSALITY_PROVEN
```

The verifier returns:

```text
PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN
```

until the assurance decision is load-bearing on the same real custody/settlement state machine.

This prevents correlation between two successful demos from being narrated as causation.
