# ARC_ASSURANCE_01 — Handover

Updated: 2026-09-29

## 1. Current baseline

Repository: `Faadil1/ARC_ASSURANCE_01`

The repository has been bootstrapped on `main`. The product name remains open; `ARC_ASSURANCE_01` is an internal identifier.

Current concept is locked:

> continuous assurance for autonomous paid work

Core loop:

```
PRECOMMIT TEST
→ REAL WORK
→ HIDDEN CANARY
→ DETERMINISTIC VERIFY
→ PAY / BLOCK / CIRCUIT BREAKER
```

The original ProofTender procurement-platform direction is closed.

## 2. Why the concept changed

A five-model council (Claude, Grok, Perplexity, Gemini, Kimi) plus current ecosystem checking converged on a narrower problem:

- generic agent wallets/payment rails already exist;
- procurement/bidding/escrow/reputation are not sufficient differentiation;
- policy gates alone are crowded;
- evidence-gated payment alone is not enough;
- the strongest surviving mechanism is a test committed before execution, hidden from the provider, repeated during production, with deterministic financial consequences.

## 3. MVP boundary

MVP vertical: structured document extraction.

The system must not rely on subjective evaluation.

Mainnet critical path:

```
Arc mainnet
+ real USDC
+ assurance contract
+ real provider HTTP service
+ deterministic scorer
+ provider signature
+ verifier CLI
```

Agent Wallets, Nanopayments, x402, ERC-8004 and ERC-8183 are not required for promotion.

## 4. Current gate

**G0 — PRD_READY**

This workstream establishes:

- `product/PRD.md`
- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`
- `docs/internal/WORKSPLIT.md`
- contribution rules

No consequential product build should be treated as promoted until G0 is merged/reviewed.

## 5. Immediate blocker

The collaborator invitation is **ACCEPTED**; GitHub reports write permission for `opeblow`.

Current blocking state:

- `main` is still at the bootstrap commit `b874462`. **Nothing has been merged.**
- PR #1 (`docs/prd-v0.1`) is still open, and PRs #6, #7, #8, #10 are all stacked on top of it.
- Because nothing is merged, a merge-ordering decision is needed before any further stacked work is meaningful.

Recommended merge order: #1, then #8, then #7, then #6, then #10. Each is stacked on the previous.

## 6. Next gate

**G1 — T0_MAINNET_CUSTODY**

Owner: Opeyemi.

Before UI work, prove with a minimal contract on Arc mainnet:

```
real USDC
→ contract custody
→ configured payout
→ remaining-funds refund
```

Capture real transaction references and balances.

Do not claim the broader product is mainnet-proven merely because T0 succeeds. T0 proves only the custody/payment primitive.

## 7. Parallel work after G0

Opeyemi:
- `feat/t0-mainnet-custody`

Faadil:
- `feat/canonical-scorer`

These workstreams may proceed in parallel because they touch separate surfaces.

Do not parallelize conflicting ABI/state-machine implementations.

## 8. Hero proof target

The final demo must show:

1. real Arc mainnet budget funded;
2. hidden canary committed before execution;
3. provider output cryptographically locked;
4. PASS → real payout;
5. controlled degraded provider behavior;
6. FAIL → real no-pay;
7. configured repeated failure → breaker;
8. remaining funds protected/refunded;
9. verifier independently reconstructs the proof.

Controlled fault injection must be labeled as such.

## 9. Truth boundaries

Never say:

- “blockchain proved the result was objectively good”;
- “the agent made the right decision”;
- “Arc mainnet proof” when showing testnet/local/stub behavior;
- “third-party provider failure” when using our own controlled fault injection.

Safe claim:

> The acceptance test was committed before the provider result, the provider committed to the output before reveal, deterministic verification produced this state, and the configured USDC consequence followed.

## 10. Continuous recording rule

After any meaningful:

- accepted product decision;
- merged implementation milestone;
- real mainnet execution;
- material failure;
- invariant change;
- gate transition;

update both:

- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`

before declaring that workstream complete.


## 11. Conditional Gateway Registry — mandatory

Canonical file:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`

Reality ledger:

- `docs/internal/REALITY-LEDGER.md`

Every gate must remain explicitly `ACTIVE`, `N/A`, `BLOCKED`, or `PROVEN`.

No contributor may remove a gate because it is currently irrelevant. Use `N/A` with a rationale.

Every meaningful PR must state whether it changes any gateway status. Scope/architecture/runtime/payment/platform changes require a full registry re-evaluation.

### Current material gap

Pre-Build Reality is currently **BLOCKED**, not PROVEN:

- real external user/operator evidence is still missing;
- a concrete external negative event with observable impact is still missing.

This does not undo the current Concept Lock, but it blocks promotion into DELIVER. T0 remains permitted as a DESIGN technical-risk spike.

## 12. Product Depth & Live Reality v1.2.1

Canonical status: **ACTIVE**.

The project must not stop at a vertical slice or a technical proof. Before submission promotion it must close the relevant gaps around:

- live core loop;
- load-bearing Arc integration;
- real financial consequence;
- success/negative/boundary/recovery scenarios;
- failure/recovery;
- real user/operator surface and external evidence;
- TTFV;
- operational economics where material;
- shared product core;
- receipts/observability;
- judge/operator self-serve;
- clean-room reproducibility;
- external-dependency failure;
- post-vertical-slice depth review.

Heavy polish comes after material reality/depth gaps are closed.


## 13. T0 hardened and locally verified

Opeyemi's collaborator invitation is accepted and GitHub reports **write** permission.

### Files

- `src/PolicyCustody.sol`
- `test/PolicyCustody.t.sol`
- `script/DeployT0.s.sol`
- `script/t0-mainnet-proof.sh`
- `foundry.toml`
- `.env.example`
- `docs/T0-MAINNET-RUNBOOK.md`
- `docs/evidence/T0-MAINNET-CUSTODY.md`
- `T0-README.md`

`src/T0NativeCustody.sol` and `test/T0NativeCustody.t.sol` were **removed**. The initial spike allowed a caller-supplied payout recipient and refunded from the pooled contract balance. `PolicyCustody` fixes both. No mainnet deployment existed for the removed spike, so nothing was lost.

### T0 design correction

Arc's native asset is USDC with 18 decimals, so T0 uses `msg.value` rather than adding an ERC-20 approval dependency. The 6-decimal ERC-20 interface at `0x3600…0000` is recorded on-chain as `usdcErc20Interface()` for evidence only and is never called. The two representations differ by `1e12` and must not be mixed.

### Local verification — Arc Foundry

Arc Foundry is **not** available in the standard container and `lib/` is gitignored, so forge-std is not vendored. Install it before testing:

```bash
forge install foundry-rs/forge-std@v1.9.6
arc-forge test -vv
```

Recorded on 2026-09-29 with `arc-forge 1.7.1-dev` (commit `d497beea`), solc `0.8.24`:

```
35 passed; 0 failed
```

### Security properties established

- immutable `payoutRecipient`; no call can redirect value
- per-policy liability (`totalFunded - totalPaidOut - totalRefunded`); payout and refund are bounded by that figure, never by the pooled balance, so no policy can spend another's funds
- `refundRemaining` requires `State.PaidOut`, so the funder cannot skip the payout and reclaim the whole position
- authority-only policy registration with an explicitly named funder
- immutable `expectedChainId`; every mutator is chain-guarded
- `nonReentrant` on every state-changing entry point
- `receive`/`fallback` revert, so only `fund` accepts value
- hard `deploymentSpendCap` ceiling on lifetime custody received

### Truth status

- source: **PRODUCED**
- local/Arc Foundry tests: **LOCAL VERIFIED** (35/35)
- mainnet deployment: **NOT IMPLEMENTED**
- real custody/payout/refund: **NOT IMPLEMENTED**
- T0 gate: **ACTIVE, NOT PROVEN**

Local test success does **not** advance G1. The gate requires real mainnet receipts bound to the exact commit.

### Blocked on a protected human action

G1 cannot advance without a human-controlled funded Arc mainnet wallet. The deploy script and proof driver are fail-closed: they require chain id 5042, the canonical USDC address, authority matching the broadcaster, `T0_CONFIRM_MAINNET=1`, and a literal `--confirm` flag.

### Review queue for opeblow

PR #7 (canonical scorer) states that contract binding is blocked until opeyemi reviews the hash/commit interface and makes the on-chain commitment encoding byte-for-byte compatible with the scorer's keccak vectors. That review gates P1.1 independently of T0.


## T0 post-Opeyemi audit — 2026-09-29

Opeyemi pushed commit `18bf5d6` and reported:

- Arc Foundry 1.7.1-dev;
- solc 0.8.24;
- 35 passed / 0 failed;
- read-only Arc mainnet preflight.

Independent review confirmed the hardening was material but found mainnet blockers in the driver/lifecycle. They were patched on `feat/t0-mainnet-custody`.

Key corrections:

1. removed the broken tiny-value shell guard;
2. bound the deploy signer explicitly via `startBroadcast(privateKey)`;
3. made protected T0 authority/funder use one human-controlled signer;
4. replaced fresh `full` with two-stage `deploy` then `execute`;
5. removed `--verify || redeploy` double-broadcast risk;
6. added expiry recovery via `cancelExpiredAndRefund`;
7. unknown policy reads now revert instead of looking like default Created/zero state;
8. policy caps no longer reserve deployment capacity before value is actually funded.

**Critical truth boundary:** Opeyemi's 35/35 result applies to `18bf5d6`, not the new head. T0 is now `REVALIDATION_REQUIRED` and no mainnet execution should occur until Opeyemi/Arc Foundry re-runs the exact current head.
