# Recovery Policy v2 — Post-Live Audit

**Status:** PASS / PROVEN_END_TO_END  
**Workflow run:** `37152400894`  
**Exact head:** `c816117db3cde27df84d6d2be778e80ed5735241`  
**Network:** Arc Mainnet / chain `5042`

## Consolidated chain verification

The audit re-read and decoded the complete v2 live transaction sequence directly from Arc:

| Step | Nonce | Block | Receipt |
| --- | ---: | ---: | --- |
| createPolicy | 10 | 24052629 | PASS |
| fund | 11 | 24055978 | PASS |
| commitBatch | 12 | 24060767 | PASS |
| lockProviderOutput | 13 | 24099169 | PASS |
| revealCanary | 14 | 24104229 | PASS |
| resolveBatch | 15 | 24106680 | PASS |

The decoded arguments, values, selectors and protected calldata bindings matched the canonical v2 policy/batch/work/provider/scorer data.

## End-to-end verdict

- create policy: **PROVEN**
- funding: **PROVEN**
- hidden precommit: **PROVEN**
- real provider work: **PROVEN** by its dedicated evidence/run
- provider EIP-712 binding: **PROVEN**
- provider output lock: **PROVEN**
- reveal commitment reconstruction: **PROVEN**
- deterministic provider-output = expected-output match: **PROVEN**
- settlement directive: **PAY**
- exact real payout delta: **0.002 native USDC**
- real financial consequence: **PROVEN**

## Final v2 state

- batch: `Resolved`
- directive: `PAY`
- active batch: zero
- total funded: `0.010 native USDC`
- total paid out: `0.002 native USDC`
- protected remainder: `0.008 native USDC`
- failure count: `0`
- policy paused: `false`
- workId consumed: `true`
- provider digest consumed: `true`
- canary key consumed: `true`
- provider signature recovery: exact provider

## Final vault accounting

- total liability: `0.018 native USDC`
- total custody received: `0.020 native USDC`
- total value released: `0.002 native USDC`
- vault balance: `0.018 native USDC`

Recipient transfer proof:
- recipient: `0x6B8ad09233dF44eD57B99aF8839129303955590C`
- balance immediately before settlement block: `0`
- balance at settlement block: `0.002 native USDC`
- exact delta: `+0.002 native USDC`

## v1 continuity

The original lost-secret v1 recovery obligation remains separate:

- v1 batch state: `Committed`
- v1 funding: `0.010 native USDC`
- original v1 commitment unchanged

No v1 cancellation/refund action was taken as part of v2.

## Audit execution note

The first consolidated audit attempt (`37152302353`) stopped on an Arc RPC rate-limit response `-32005`. No product/state assertion failed. The audit was hardened with bounded retry/backoff and sequential final reads, then passed as run `37152400894`.

## Final truth boundary

The v2 live success path is **PROVEN END-TO-END**, including a real payout.

There are no remaining protected v2 live actions for this cycle.

PR merge remains a separate human decision. The v1 expiry-bound cleanup remains a separate future obligation.
