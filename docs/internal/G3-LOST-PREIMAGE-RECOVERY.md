# G3 Lost Preimage Recovery — 2026-10-03

## Status

The original G2 hidden-canary reveal packet for the live committed batch is no longer available after the managed endpoint security incident.

This does **not** invalidate the proven G2 transaction. It prevents completion of the reveal path for that exact commitment because the hidden preimage cannot be reconstructed from the commitment.

## Existing live batch

- Chain: Arc Mainnet / 5042
- AssuranceVault: `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- Policy: `0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30`
- Batch: `0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7`
- Commitment: `0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9`
- Current known state: `Committed`
- Policy expiry: `1792033200` / 2026-10-15T03:00:00Z

## Mandatory truth boundary

Do not:
- regenerate a new canary and represent it as the original preimage;
- attempt revealCanary with replacement values;
- claim G3 against this batch;
- use brute-force or guesswork;
- alter the G2 evidence.

The commitment remains valid evidence that a precommit occurred. The missing preimage means the committed batch cannot complete the normal lock/reveal/resolve path.

## Contract-native recovery after expiry

`AssuranceVault.cancelExpiredBatch(policyId, batchId)` is explicitly available to the funder after policy expiry for an unresolved active batch.

After cancellation clears `activeBatchId` and pauses the policy, `refundProtectedRemainder(policyId)` can refund the protected remainder to the immutable funder.

These are protected live transactions and require fresh read-only preflights and separate human authorization when the expiry condition is satisfied.

## Immediate continuation before expiry

The deployed contract supports multiple independent policies. `activeBatchId` is policy-scoped, not deployment-global.

Deployment spend cap:
- 0.05 native USDC cumulative.

Already funded:
- 0.01 native USDC cumulative.

Therefore a second policy funded at 0.01 native USDC would bring cumulative custody received to 0.02 native USDC, still below the 0.05 deployment cap, subject to a fresh live read-only preflight.

Continuation plan:

```
new policy id
→ fresh expiry
→ fund new policy
→ generate NEW hidden canary in browser
→ immediately store reveal packet in protected GitHub Environment secret
→ commit NEW batch
→ G3 read-only compute via GitHub Actions
→ provider EIP-712 signing
→ lockProviderOutput
→ reveal
→ resolve
```

No new policy creation, funding, commit, signature, lock, reveal, resolve, cancellation or refund is authorized by this document.
