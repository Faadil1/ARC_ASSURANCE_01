# G2 PRECOMMIT — Live Arc Mainnet Receipt

**Status:** PROVEN  
**Gate:** G2 / PRECOMMIT  
**Network:** Arc Mainnet  
**Chain ID:** 5042

## Transaction

- tx: `0xbfa8dcb6b354eda7cf2cb1a428fc95e9a99e433d85e27e8b4a1cf8bf7249a65e`
- block: `23975010`
- transaction index: `2`
- from: `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`
- to: `0x6f79cdc961e30f2e1fac0f4eada6ca35e58290e4`
- nonce: `9`
- value: `0`
- gas used: `132026`
- receipt status: `1 / SUCCESS`

## Bound precommit

- policy id: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- batch id: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`

## Verification

The post-transaction read-only verifier observed:

- exact sender: PASS
- exact contract target: PASS
- transaction value `0`: PASS
- exact `commitBatch(policyId,batchId,commitment)` calldata: PASS
- `BatchCommitted` event: VERIFIED
- event policy id: exact match
- event batch id: exact match
- event commitment: exact match
- `committedAtBlock = 23975010`
- `activeBatchId = 0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- batch state: `1 / Committed`
- no new transaction was sent by the verifier

The precommit generator had already cross-checked the locally generated commitment against the deployed contract's `computeCanaryCommitment()` before the broadcast while keeping the reveal preimage off-repo and out of chat.

## Gate conclusion

`G2_PRECOMMIT = PROVEN`

A real opaque hidden-test commitment now exists on Arc Mainnet on the integrated `AssuranceVault`, before any provider output lock for this batch.

The contract state remains at `Committed`. Therefore the next causal edge has **not** occurred.

## Truth boundary

This receipt proves:

- the exact opaque commitment was recorded on Arc Mainnet;
- the transaction succeeded;
- the exact policy, batch and commitment are bound by calldata and event evidence;
- the integrated contract currently records the batch as `Committed`;
- the precommit precedes any future `ProviderOutputLocked` transition for this batch.

It does **not** prove:

- genuine provider execution;
- signed provider-output correctness;
- reveal correctness;
- deterministic PASS/FAIL resolution;
- PASS -> payout;
- FAIL -> no-pay;
- breaker -> refund;
- external-user adoption.

## Protected-action boundary

`lockProviderOutput`, `revealCanary`, `resolveBatch` and all downstream financial actions remain **NOT AUTHORIZED**.
