# Recovery Policy v2 — Funding Read-Only Readiness

This gate validates one proposed `fund(policyId)` call for exactly **0.010 native USDC**.

It requires:
- v2 policy exists, remains unfunded and has no active batch;
- all v2 immutable/bound parameters match the reviewed createPolicy plan;
- v1 remains exactly Committed with the original batch and commitment;
- vault state remains 0.010 liability / custody / balance and 0 released;
- deployment cap remains 0.050;
- projected custody after funding is 0.020, leaving 0.030 capacity;
- funder balance covers principal plus estimated fee;
- live Arc `eth_estimateGas` passes.

The workflow is read-only. It has no signer, no private key and cannot broadcast.

A green result does **not** authorize funding. Funding requires a separate one-shot human authorization bound to the exact policy, value, calldata, nonce and fresh gas check.
