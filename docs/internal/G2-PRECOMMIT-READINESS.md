# G2 PRECOMMIT — Live Readiness Packet

**Status:** BLOCKED_BY_G0_AND_PROTECTED_LIVE_ACTIONS  
**Gate:** G2 / PRECOMMIT  
**Target runtime:** Arc mainnet (chain 5042)  
**Target contract:** integrated `AssuranceVault`  
**Source base:** `c3aaa11bf7454e1f3afe0fb740c8c0ccd7fedd5c`  
**Base branch:** `ops/exact-predeploy-gas-snapshot`

## 1. Why this is the G2 vehicle

Do **not** deploy `AssuranceCoreV1` as a separate proof-only contract for G2.

The integrated `AssuranceVault` already makes the assurance mechanism load-bearing on the same contract that will later hold and release native Arc USDC.

Its source enforces:

```text
commitBatch()
  -> BatchState.Committed

lockProviderOutput()
  requires BatchState.Committed
  -> BatchState.OutputLocked

revealCanary()
  requires BatchState.OutputLocked
  -> BatchState.Revealed

resolveBatch()
  requires BatchState.Revealed
  -> PAY / WITHHOLD / BREAKER financial path
```

This preserves the canonical product-depth rule: G2 is proven on the future product core rather than on a throwaway proof contract.

## 2. Existing exact-source evidence

Latest integrated source base:

`c3aaa11bf7454e1f3afe0fb740c8c0ccd7fedd5c`

Clean-room workflow:

`36680776957`

Observed:

- JavaScript: **72 passed / 0 failed**
- Solidity: **29 passed / 0 failed**
- nonce-bound predeploy snapshot unit test: **PASS**
- `AssuranceVault` creation bytecode hash:
  `0xac69dd96b86b9083bf08c6ef904df7bf9ee602addaccc1938357f9cb9c75ff57`
- clean-room artifact digest:
  `sha256:a6f25839fd4861f15dcc98eeba14fdfed407b45644f05f5b2832476d7fc905a2`

This is source/build evidence only. It does **not** prove G2.

## 3. Exact G2 claim

G2 may be promoted only when the following statement is directly supported:

> A real opaque hidden-test commitment exists on Arc mainnet **before** provider execution/output lock for the same batch.

Minimum live evidence:

1. integrated `AssuranceVault` is deployed on Arc mainnet and runtime/source binding is proven;
2. one policy exists with a real provider address and scorer binding;
3. policy has enough real native-USDC liability for `commitBatch()` to be valid;
4. a commitment preimage is generated **privately after the final contract address is known**;
5. only the opaque `bytes32 commitment` is submitted in `commitBatch(policyId,batchId,commitment)`;
6. `BatchCommitted` is observed on Arc with the expected policy, batch and opaque commitment;
7. no `ProviderOutputLocked` for that batch exists before the commitment transaction;
8. provider execution/output lock begins only after the successful commitment receipt is available.

## 4. Hidden-preimage boundary

The commitment is domain-separated by chain ID and exact verifying-contract address.

Therefore the final hidden commitment MUST be generated only after the integrated Arc deployment address is fixed.

Until the later reveal step, the following material is hidden from the provider and MUST NOT be placed in:

- GitHub commits;
- public GitHub Actions inputs/logs/artifacts;
- PR comments;
- chat messages;
- screenshots;
- public issue bodies.

Hidden material includes at minimum:

- `workId`
- `inputHash`
- `expectedOutputHash`
- `scorerIdHash` when disclosure would aid canary identification
- `salt`

Only the opaque final commitment may be public before output lock.

This is a protocol secret, not a wallet secret. The wallet private key/seed remains separately human-local and must never enter the repository or chat.

## 5. Truth boundary

A successful `BatchCommitted` transaction proves:

- an opaque commitment existed onchain at a specific block;
- it preceded any later output-lock receipt for that batch;
- the integrated contract enforces `Committed -> OutputLocked -> Revealed -> Resolved`.

It does **not**, by itself, prove:

- that the provider could not infer the canary from non-contractual input features;
- genuine provider execution;
- signed output correctness;
- deterministic resolve;
- FAIL -> no-pay;
- breaker behavior;
- external-user adoption.

Those belong to G3+ and later Product Depth gates.

## 6. Protected actions still NOT authorized

Creation of this readiness packet authorizes **no mainnet transaction**.

Separate explicit human authorization remains required for each consequential action:

- integrated AssuranceVault deployment;
- policy creation;
- native-USDC funding;
- `commitBatch` broadcast;
- any later output-lock/reveal/resolve/refund transaction.

No private key or seed may be requested, stored or transmitted.

## 7. Gate sequencing

Current sequencing:

```text
G0 PRD_READY       NOT PROVEN — waiting for @opeblow review + merge
G1 T0 CUSTODY      PROVEN
G2 PRECOMMIT       READINESS ACTIVE / PROMOTION BLOCKED BY G0 + LIVE EXECUTION
```

No G2 live transaction should be initiated before G0 is proven.

## 8. Live execution plan after G0

After G0:

1. rebase/reconcile the integrated branch against the merged governance baseline;
2. rerun clean-room build/tests and prove creation-bytecode continuity or explain any delta;
3. produce a fresh Arc read-only deployer/fee/nonce snapshot;
4. select bounded constructor configuration and tiny-value policy economics;
5. request separate human deployment authorization;
6. deploy and source-bind integrated `AssuranceVault`;
7. request policy-creation authorization;
8. create the bounded policy;
9. request funding authorization;
10. fund only the minimal approved amount;
11. generate hidden commitment material privately;
12. request the one-time `commitBatch` authorization;
13. broadcast `commitBatch`;
14. independently verify the receipt and absence of prior output-lock for the batch;
15. promote **G2 PRECOMMIT = PROVEN** only if every required edge is present;
16. STOP before G3 provider execution/output lock unless separately authorized.

## 9. Exit criteria

G2 readiness is complete when:

- [x] integrated product-core vehicle selected;
- [x] source ordering reviewed;
- [x] exact-source clean-room build/test evidence exists;
- [x] bytecode hash is recorded;
- [x] hidden-preimage handling rule is explicit;
- [x] protected-action boundaries are explicit;
- [ ] G0 PRD_READY is proven;
- [ ] integrated deployment runtime/source binding is live-proven;
- [ ] bounded policy + funding are live-proven;
- [ ] hidden commitment generated privately;
- [ ] `BatchCommitted` live receipt verified;
- [ ] no earlier `ProviderOutputLocked` exists for the same batch.

Until the final five live conditions are satisfied:

`G2_PRECOMMIT = BLOCKED / NOT PROVEN`.
