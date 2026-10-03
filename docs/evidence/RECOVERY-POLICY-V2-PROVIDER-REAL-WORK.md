# Recovery Policy v2 — Provider Real Work Read-Only

**Status:** PROVEN / READ-ONLY  
**Workflow run:** `37128770177`  
**Exact head:** `5a19875e223d465a17e532f65b4082aeb3f915fe`  
**Network:** Arc Mainnet / chain 5042

## Proven

The protected v2 reveal packet was materialized only in the GitHub-hosted runner temporary directory and validated against the live v2 policy/batch/commitment.

The provider then executed the actual invoice extraction path:

- batch state observed: `Committed`;
- provider bound on-chain: `0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe`;
- provider transport: HTTP loopback;
- execution evidence: `REAL_COMPUTE`;
- fault mode: `NONE`;
- hidden workId unused on-chain;
- actual provider output matched the hidden expected output;
- no provider signature was created;
- no transaction was sent.

Observed block: `24061998`.

## Secret boundary

The reveal packet and local compute artifact existed only under `$RUNNER_TEMP`.

The workflow public log boundary passed, and the cleanup step deleted:
- the reveal packet;
- the sensitive local compute artifact;
- the public temp log.

No secret-bearing artifact was uploaded.

## Truth boundary

This proves **provider real work** for the committed v2 batch.

It does not prove or authorize:
- provider EIP-712 signature;
- `lockProviderOutput`;
- reveal;
- resolve;
- financial consequence.
