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

## 5. Immediate structural state

The collaborator invitation is **ACCEPTED**; GitHub reports write permission for `opeblow`.

Current repository reality:

- `main` is still the bootstrap line at `b874462`; it is **not** the current project-state surface.
- formal G0 remains unproven because PR #1 is still open/unmerged.
- active operational state is carried by PR #44 on `ops/t0-funding-readiness`.
- stacked PR history remains relevant, but a reader must resolve the active PR branch before interpreting current state.

This does not block the already-approved DESIGN technical spike. It does block treating `main` as canonical current state or promoting formal G0/DELIVER. Merge ordering remains an administrative integration task before mainline promotion.

## 6. Next gates — operational vs product

**Operational next gate: `T0_WALLET_TOPUP` — ACTIVE / HUMAN / PROTECTED.**

`T0_FINAL_PRE_TRANSFER_REVALIDATION` is already PROVEN on execution head `4f7f3b254a29e6023d539a85e5b126a7f21e1955`.

Automation must not move funds. After the external human top-up, the next machine action is only the read-only `POST_FUNDING_WALLET_RECEIPT` check, evidence recording, then STOP for separate deployment authorization.

**Product-level gate: G1 — T0_MAINNET_CUSTODY — ACTIVE / NOT PROVEN.**

Owner for contract/runtime work: Opeyemi.

G1 still requires real Arc receipts for deploy → custody → configured payout → remaining-funds refund → completion, bound to the approved source/runtime.

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

Pre-Build Reality problem evidence is **PROVEN** via PR #8 and `docs/research/PRE-BUILD-REALITY-EVIDENCE.md`.

That proof covers a real external operator problem, concrete negative events, and observable impact. It does **not** prove product demand or adoption.

The separate `External User/Operator Product Evidence` gate remains **BLOCKED** because no external product trial/evidence exists yet. DELIVER also remains blocked by formal G0 and live product-depth/runtime gates. Do not conflate these gates.

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


## T0 funding readiness — 2026-09-30

The pre-funding technical work is now complete enough to reach a protected human checkpoint.

### Exact source proof

T0 source head:

`f7fdf4e1b592c9122d4680d5272635baa2afff3f`

Arc Foundry source revalidation:

```
40 passed / 0 failed / 0 skipped
```

### Gas evidence

Machine-readable exact-head gas evidence is green on:

`46cd44ef0cc11e84bfed97900180318dc7342349`

Canonical planning floor:

```text
deploy PolicyCustody                2,160,427
createPolicy                          217,532
fund                                  131,090
releaseConfiguredPayout               160,713
refundRemaining                        84,222
complete                               45,575
6 × tx intrinsic floor                126,000
---------------------------------------------
T0 planning floor                   2,925,559 gas
```

Recovery `cancelExpiredAndRefund` is tracked separately at 85,230 gas max observed.

### Live read-only Arc fee snapshot

Workflow `36682054936` observed:

- Arc chain id 5042;
- block 23,501,187;
- gas price 20,000,000,000 wei/gas.

After 1.25× gas-unit safety and 2× gas-price safety:

- happy-path peak incl. 0.010 USDC principal: **0.15627796 USDC**;
- contingency peak incl. recovery reserve: **0.16158948 USDC**.

Therefore the **5 USDC hard ceiling is proven sufficient for this time-bound snapshot**.

### Candidate funding envelope

Prepared but not authorized:

```text
candidate initial top-up = 0.50 USDC
hard ceiling             = 5.00 USDC
fresh contingency rule   = <= 0.25 USDC
```

The latest fresh snapshot satisfies the rule and CI returns:

`CANDIDATE_ENVELOPE_READY_FOR_HUMAN_REVIEW`

with `funding_authorized = false`.

### Next protected human checkpoint

Faadil creates a **dedicated Arc mainnet EOA** and shares **only the public address**.

Before any funding, the address will be checked read-only for:

- chain 5042;
- no contract bytecode;
- pending nonce 0;
- current balance.

Never share the private key or seed phrase.

After the public-wallet gate passes, refresh the fee snapshot once more and request explicit human approval before funding 0.50 USDC.

G1 remains ACTIVE / NOT PROVEN until real deploy → fund → payout → refund → complete receipts exist.


## 31. Dedicated T0 wallet — public readiness PROVEN

Public wallet:

`0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`

Read-only Arc workflow:

`36845314961`

Observed on Arc mainnet:

```text
chain id      = 5042
bytecode      = 0x
EOA           = true
pending nonce = 0
balance       = 0
```

Verdict:

`PUBLIC_WALLET_READY_FOR_FUNDING_REVIEW`

Fresh fee snapshot in the same run:

- block: 23,690,527;
- gas price: 20,000,000,570 wei/gas;
- 2x safe gas price: 40,000,001,140 wei/gas;
- happy peak: 0.15627796416892186 USDC;
- contingency peak: 0.16158948432030018 USDC;
- 5 USDC ceiling: sufficient.

Candidate envelope remains:

```text
0.50 USDC initial top-up
5.00 USDC hard ceiling
```

and the machine-readable result remains:

`funding_authorized = false`.

The next state transition is a protected human action: explicit approval to fund the dedicated wallet. No private key or seed phrase should ever be shared.


## 32. Human funding authorization — 0.50 USDC

Faadil explicitly approved funding the dedicated Arc T0 wallet with:

```text
0.50 USDC
```

Destination:

`0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`

This authorization is narrow.

It authorizes only the initial wallet top-up after one final fresh read-only validation.

It does **not** authorize:

- contract deployment;
- createPolicy;
- fund-to-contract;
- payout;
- refund;
- complete;
- any private-key disclosure.

A new exact head is intentionally created so CI refreshes wallet state and Arc fees immediately before the transfer instruction is issued.


## 33. System Control Plane reconciliation — 2026-10-01

Central canon was re-read from `Faadil1/faadil-agent-system@main` before
continuing. Adoption starts at this material touch; no earlier artifact is
backdated.

### Actual state

- project: **ACTIVE**
- macro stage: **DESIGN**
- operational track: **T0_MAINNET_CUSTODY**
- G0 PRD_READY: **not proven**; PR #1 remains open/unmerged
- G1 T0_MAINNET_CUSTODY: **ACTIVE / NOT PROVEN**
- DELIVER: **BLOCKED**

The current T0 spike may continue inside DESIGN. Pre-Build Reality problem
evidence is PROVEN; DELIVER remains blocked by formal G0 plus live
product-depth/runtime gates.

### Last genuinely proven state

- T0 exact-source local revalidation: 40/40 Arc Foundry tests;
- dedicated Arc wallet readiness: PROVEN read-only;
- human authorization for a **0.50 USDC initial wallet top-up only**: PROVEN;
- local gas rehearsal and time-bound fee ceiling: proven only in their actual
  evidence classes.

No real contract deployment or T0 custody/payout/refund/complete receipt exists.

### New prospective control-plane artifacts

- lifecycle coverage:
  `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`
- claim/runtime/evidence graph:
  `docs/internal/CLAIM-RUNTIME-EVIDENCE-GRAPH.yaml`
- Reference Intelligence packet:
  `docs/internal/REFERENCE-INTELLIGENCE-PACKET.yaml`
- T0 Engineering Quality receipt:
  `docs/internal/ENGINEERING-QUALITY-RECEIPT-T0.json`
- reconciliation record:
  `docs/internal/SYSTEM-RECONCILIATION-2026-10-01.md`

### Product Reality v1.3

Integration-First / Maximum Product Exploitation v1.3 is active prospectively.

The PRD does not require a product-scope rewrite: it already requires real Arc
financial causality, load-bearing integration, negative consequence, recovery
and independent verification.

The Product Exploitation Loop is **not triggered yet** because T0 is not the
first live integrated product vertical slice. It activates after that slice.

### Engineering Quality backfill

Current T0 scope verdict:

`PASS_WITH_ACCEPTED_DEBT`

The accepted debt is bounded and non-terminal: formatting drift plus absence of
a separate external Solidity-analyzer receipt on this narrow T0 spike. No
behavioral, security, evidence, or human-authority contract was relaxed.

The separate integrated AssuranceVault line still needs its own current
Engineering Quality receipt before its next integrated deployment or
BUILD_CANDIDATE_READY-sensitive transition.

### Reference Intelligence

The registered AI-ABC human-approval/risk-tier pattern is relevant but remains
`CLASSIFIED / REFERENCE_ONLY / authority NONE`.

Decision: `use_as_reference`, no durable adoption and no project/global rule
change.

### Contradictions preserved explicitly

1. Downstream code success does not retroactively prove G0.
2. Pre-Build Reality problem evidence is PROVEN in PR #8; External User/Operator
   Product Evidence remains separately BLOCKED.
3. T0 and integrated AssuranceVault are separate open PR stacks; T0 receipts
   cannot promote integrated product claims.
4. The old T0 post-audit revalidation blocker is stale versus the later 40/40
   exact-source proof.
5. Historical machine snapshots with `funding_authorized=false` remain true;
   the later human authorization is a separate protected decision.

### Exact next gate — corrected after final revalidation

`T0_FINAL_PRE_TRANSFER_REVALIDATION` is **PROVEN** on execution head
`4f7f3b254a29e6023d539a85e5b126a7f21e1955` with runs `36891632445` and
`36891632622`.

Operational next gate:

`T0_WALLET_TOPUP` — **ACTIVE / HUMAN / PROTECTED**.

After the external human action, automation performs only the read-only
`POST_FUNDING_WALLET_RECEIPT` check, records the Evidence Graph receipt, and
stops. Contract deployment remains a separate protected authorization.

G1 remains **ACTIVE / NOT PROVEN**.


## 34. Ambiguity resolution — canonical precedence

This section supersedes older contradictory current-state prose without rewriting
historical receipts.

### State source

- active state branch: `ops/t0-funding-readiness`
- active state PR: **#44**
- default branch `main`: bootstrap-only until formal G0 is merged
- current branch head: resolve dynamically from PR #44

### Head semantics

- **execution evidence head:** `4f7f3b254a29e6023d539a85e5b126a7f21e1955`
- **first state-recording commit after execution:** `90d79ee7d2f891366a9962af90f440768b4347e3`
- later documentation-only commits do not become the execution evidence head unless executable T0 inputs change

### Gate semantics

- Pre-Build Reality: **PROVEN**
- External User/Operator Product Evidence: **BLOCKED**
- T0_FINAL_PRE_TRANSFER_REVALIDATION: **PROVEN**
- operational next gate: **T0_WALLET_TOPUP**
- G1 T0_MAINNET_CUSTODY: **ACTIVE / NOT PROVEN**
- DELIVER: **BLOCKED**
- Product Exploitation Loop: **NOT YET TRIGGERED**

### Reading order

1. `docs/internal/CANONICAL-STATE.yaml`
2. `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`
3. `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
4. this HANDOVER
5. `docs/internal/REALITY-LEDGER.md`

If an older section conflicts with the state above, treat the older statement as
historical context, not current state.
