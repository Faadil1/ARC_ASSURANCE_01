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

**G2 — PRECOMMIT — READINESS ACTIVE / LIVE PROOF NOT PROVEN**

G0 / PRD_READY is **PROVEN**. PR #1 was owner-signed off and merged to `main`
at `1220fc5d39b2262f0b66d0ae4713629b10f3ca29`.

G1 / T0_MAINNET_CUSTODY is also **PROVEN** from the complete live Arc receipt chain.

## 5. Immediate structural state

- `main` now contains the G0 governance baseline.
- `opeblow` has write permission.
- Opeyemi review is recommended but non-blocking for G0; technical-owner review is mandatory only at later gates where the affected surface falls under that owner's explicit accountability.
- active operational state remains on PR #44 / `ops/t0-funding-readiness` until stacked state is integrated.
- the integrated AssuranceVault line currently diverges from the new `main` because the G0 policy-correction commits landed after that stack was created.

## 6. Next gates — operational vs product

**T0 operational cycle: `CLOSED / PROVEN`.**

**Product-level gate: G2 — PRECOMMIT — READINESS ACTIVE / LIVE PROOF NOT PROVEN.**

G2 uses the integrated `AssuranceVault` product core, not a proof-only standalone contract.
Before any live G2 action, reconcile the integrated line with merged G0, rerun exact-source readiness, and preserve the protected-action boundary for deployment/policy/funding/commit calls.

Do not promote G2 until a real opaque commitment exists on Arc mainnet before provider execution/output lock for the same batch.

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

### Historical state at this checkpoint

- project: **ACTIVE**
- macro stage: **DESIGN**
- operational track at that time: **T0_MAINNET_CUSTODY**
- G0 PRD_READY: **not proven**; PR #1 remains open/unmerged
- G1 T0_MAINNET_CUSTODY at that time: **ACTIVE / NOT PROVEN**
- DELIVER: **BLOCKED**

This subsection is historical and is superseded by §46 for current T0/G1 state.

The current T0 spike may continue inside DESIGN. Pre-Build Reality problem
evidence is PROVEN; DELIVER remains blocked by formal G0 plus live
product-depth/runtime gates.

### Last genuinely proven state

- T0 exact-source local revalidation: 40/40 Arc Foundry tests;
- dedicated Arc wallet readiness: PROVEN read-only;
- human authorization for a **0.50 USDC initial wallet top-up only**: PROVEN;
- local gas rehearsal and time-bound fee ceiling: proven only in their actual
  evidence classes.

At this historical checkpoint, no real contract deployment or T0 custody/payout/refund/complete receipt existed.

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

`T0_WALLET_TOPUP` — **PROVEN EXECUTED WITH +0.01 USDC VARIANCE**.

The funded-wallet state is now proven read-only. `POST_FUNDING_WALLET_RECEIPT` remains ACTIVE only because the concrete Arc top-up transaction hash/reference has not yet been captured. Once bound, stop. Contract deployment remains a separate protected authorization.

At that checkpoint, G1 remained **ACTIVE / NOT PROVEN**. This is superseded by §46.


## 34. Ambiguity resolution — canonical precedence

This section supersedes older contradictory current-state prose without rewriting
historical receipts.

### State source

- active state branch: `ops/t0-funding-readiness`
- active state PR: **#44**
- default branch `main`: G0 governance baseline is now merged/proven; latest operational state still lives ahead on stacked branches
- current branch head: resolve dynamically from PR #44

### Head semantics

- **execution evidence head:** `4f7f3b254a29e6023d539a85e5b126a7f21e1955`
- **first state-recording commit after execution:** `90d79ee7d2f891366a9962af90f440768b4347e3`
- later documentation-only commits do not become the execution evidence head unless executable T0 inputs change

### Gate semantics

- Pre-Build Reality: **PROVEN**
- External User/Operator Product Evidence: **BLOCKED**
- T0_FINAL_PRE_TRANSFER_REVALIDATION: **PROVEN**
- operational next gate: **T0_CYCLE_CLOSED — PROVEN**
- G1 T0_MAINNET_CUSTODY: **PROVEN**
- G0 PRD_READY: **PROVEN**
- current PRD product gate: **G2 PRECOMMIT — READINESS ACTIVE / LIVE PROOF NOT PROVEN**
- DELIVER: **BLOCKED** on integrated live product-depth evidence and external product evidence
- Product Exploitation Loop: **NOT YET TRIGGERED** because T0 is a live custody primitive, not the first live integrated product vertical slice

### Reading order

1. `docs/internal/CANONICAL-STATE.yaml`
2. `docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`
3. `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
4. this HANDOVER
5. `docs/internal/REALITY-LEDGER.md`

If an older section conflicts with the state above, treat the older statement as
historical context, not current state.


## 35. Real wallet funding — 2026-10-01

The dedicated Arc wallet now shows **0.51 USDC** in the user wallet UI. The prior explicit authorization was **0.50 USDC**, so the additional **+0.01 USDC** is recorded as an execution variance and is not retroactively described as authorized.

Independent read-only verification on Arc succeeded after funding:

- T0 Revalidation run `36938183550` — SUCCESS
- T0 Read-Only Fee Budget run `36938183671` — SUCCESS
- workflow head: `220a61576cab23665483d67ebca25e44590b35ac`
- wallet remains an EOA
- pending nonce remains 0
- balance is at least 0.50 USDC and below the 5.00 USDC hard ceiling

Still missing for the post-funding receipt: the concrete Arc transaction hash/reference for the top-up.

No deployment, createPolicy, contract funding, payout, refund or completion is authorized by this state transition.


## 36. Post-funding receipt closure — 2026-10-01

Transaction:
`0x022bcfbb11215afdb6226a1b6e5a11b339a23e52e1b29676d6ae932df0d5822d`

GitHub Actions verification on Arc:
- Post-Funding Receipt run `36938737314` — SUCCESS
- Read-Only Fee Budget run `36938737292` — SUCCESS
- T0 Revalidation run `36938737258` — SUCCESS
- verification head `4a81dd80edb9e4408b04f70d73ebe43163f34d5f`

Result: `POST_FUNDING_WALLET_RECEIPT = PROVEN`.

Next checkpoint: `T0_DEPLOYMENT_AUTHORIZATION` — HUMAN / PROTECTED / NOT YET GRANTED.

No deployment or contract execution is authorized by the wallet-funding approval.


## 37. T0 deployment authorization — 2026-10-01

The human repo owner explicitly authorized the next protected checkpoint.

Scope authorized:
- deploy `PolicyCustody` once on Arc mainnet;
- register the single configured T0 policy in that same deployment broadcast.

Still not authorized:
- contract funding;
- payout;
- refund;
- complete;
- any second/retry deployment without review.

Public config is locked in:
- `ops/t0-deployment-config.json`
- `ops/t0-deployment-public.env`

The signer remains `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`; the private key remains human-local only.

Next: `T0_DEPLOYMENT_EXECUTION`. After deployment, capture receipts and STOP before any value-movement leg.


## 38. T0 deployment readiness — PROVEN

Exact readiness head: `bface52ed8611ebc9e4e09f09613230985086d00`.

All green:
- Deployment Readiness `36939576285`
- T0 Revalidation `36939576194`
- Read-Only Fee Budget `36939576189`
- Post-Funding Receipt `36939576310`

The next action is the human-local signing/broadcast of
`./script/t0-mainnet-proof.sh deploy --confirm`.

This authorization covers deployment + the one configured policy registration only.
STOP immediately after deployment evidence capture; contract funding and the
payout/refund/complete leg remain unauthorized.


## 39. Deployment execution method delta — Remix fallback

The human workstation has no admin rights, so WSL/Arc Foundry cannot be installed
locally. The protected mainnet execution will therefore use Remix + the MetaMask
browser extension, without exporting the private key.

To preserve evidence quality:
- compile the unchanged `PolicyCustody.sol` with exact solc `0.8.24`;
- connect Remix to Arc mainnet through MetaMask, never Remix VM;
- deploy `PolicyCustody` with the locked constructor parameters;
- verify the deployment receipt before the separate `createPolicy` transaction;
- use the already-locked policy values;
- stop before any contract funding.

The authorization scope is unchanged: deployment + one policy registration only.


## 40. Real Arc deployment — PROVEN

Deployment transaction:
`0x7363a99abfe7293ccd2b47cf6e8df41d135ad0db0a39b6745b753082ead47f24`

PolicyCustody:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36975671614` on head
`872975bc1c5428222d063a0ac9f5dc9b7d327c33` succeeded.

Verified:
- Arc chain 5042;
- successful contract-creation receipt from the dedicated T0 wallet at nonce 0;
- zero transaction value;
- deployed runtime code present;
- authority, chain binding, USDC interface and spend cap match the locked config;
- policyCount, totalLiability and totalCustodyReceived are still zero before policy registration;
- deployed executable runtime matches the canonical compiled executable runtime after stripping Solidity CBOR metadata.

Next protected action: exactly one `createPolicy` call using the locked T0 policy values.
STOP after its receipt is captured and verified. Contract funding remains unauthorized.


## 41. Real Arc policy registration — PROVEN

createPolicy transaction:
`0x2ed1083c31dda72dc8b9934c44ab617adebcce1e9223e9d4f4162ff9371db9d7`

Contract:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36976421698` on head
`c4c923455ba2caf9a04a372c213f3339dfcbbfe8` succeeded.

Verified:
- Arc chain 5042;
- sender is the dedicated T0 wallet;
- nonce = 1;
- transaction value = 0;
- selector is exactly `createPolicy(bytes32,address,address,uint256,uint256,uint64)`;
- calldata matches the locked policy id, funder, payout recipient, max spend cap, unit payout and expiry;
- `PolicyCreated` event matches the locked configuration;
- `policyCount = 1`;
- `policyExists = true`;
- state = `Created`;
- `remaining = 0`;
- `totalLiability = 0`;
- `totalCustodyReceived = 0`;
- `totalValueReleased = 0`.

The deployment+registration authorization is now consumed.

**Next protected checkpoint: `T0_CONTRACT_FUNDING_AUTHORIZATION`.**
No native USDC may enter the contract until the human explicitly authorizes the
bounded 0.010-USDC funding transaction. Payout, refund and completion remain
separately unauthorized.


## 43. Real Arc contract funding — PROVEN

Funding transaction:
`0xa1f49555ec3cf858372e180162e6e151949d17cd196d7f39656a31942baa21f1`

Contract:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36982128480` on head
`593acc5b016a0fccfadc2f012a7e787dbd4256f8` succeeded.

Verified:
- Arc chain 5042;
- sender is the dedicated T0 wallet;
- nonce = 2;
- function selector = `fund(bytes32)`;
- policy id matches the locked T0 policy;
- `msg.value = 10000000000000000` native units = **0.010 USDC**;
- `PolicyFunded` event records the same exact amount;
- state observed immediately after funding = `Funded`;
- remaining/liability/custody received/contract balance each observed at **0.010 USDC** immediately after funding;
- totalValueReleased remained 0 immediately after funding.

The one-time funding authorization is now consumed.

**Next protected checkpoint: `T0_PAYOUT_AUTHORIZATION`.**
No `releaseConfiguredPayout` transaction may be signed or broadcast until separate
explicit human authorization. Refund and completion remain separately unauthorized.


## 44. Real Arc configured payout — PROVEN

Payout transaction:
`0x9dc11ee465b2c8afc354bdad9e3825e5a0c6a97499bae907e72ea1a677f32d34`

Contract:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36983144079` on head
`6e136f670b69a7a1248fff92af4e13c5185e2fac` succeeded.

Verified:
- Arc chain 5042;
- sender is the dedicated T0 wallet;
- nonce = 3;
- function selector = `releaseConfiguredPayout(bytes32)`;
- policy id matches the locked T0 policy;
- transaction `msg.value = 0`;
- `PaymentReleased` emitted exactly **0.001 native USDC**;
- state observed immediately after payout = `PaidOut`;
- remaining/liability/contract balance observed immediately after payout = **0.009 native USDC**;
- totalCustodyReceived remains **0.010 native USDC**;
- totalValueReleased observed immediately after payout = **0.001 native USDC**.

The one-time payout authorization is now consumed.

**Next protected checkpoint: `T0_REFUND_AUTHORIZATION`.**
No `refundRemaining` transaction may be signed or broadcast until separate
explicit human authorization. Completion remains separately unauthorized.


## 45. Real Arc remaining-funds refund — PROVEN

Refund transaction:
`0x079ca3985529ac088aa50ba5a3ed4406de3c4667502780b06691ca15b07d4024`

Contract:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36984307453` on head
`0ca236dc7826481b3f8ecbcf4d2f06852d30c24a` succeeded.

Verified:
- Arc chain 5042;
- sender is the dedicated T0 wallet;
- nonce = 4;
- function selector = `refundRemaining(bytes32)`;
- policy id matches the locked T0 policy;
- transaction `msg.value = 0`;
- `RemainingFundsRefunded` emitted exactly **0.009 native USDC**;
- post-refund custody balance = 0;
- totalRefunded observed at **0.009 native USDC**;
- state observed immediately after refund = `Refunded`;
- remaining = 0;
- totalLiability = 0;
- totalCustodyReceived remains **0.010 native USDC**;
- totalValueReleased remains **0.001 native USDC**;
- contract balance = 0.

The one-time refund authorization is now consumed.

**Historical next checkpoint at that moment:** `T0_COMPLETION_AUTHORIZATION`.
That authorization was later granted, consumed, and the completion receipt is now PROVEN in §46.


## 46. Real Arc completion + G1 close — PROVEN

Completion transaction:
`0xb657c1de8c397d2606cd4f41ccccf556f65f0f12f2ff195f6d5a6fda1e3d1932`

Contract:
`0x0377D371d6981c98CE9C650338D7E1E80819B572`

Verification run `36985388199` on head
`6cae32c7b891bb0db296f37020343e6afccda692` succeeded.

Verified:
- Arc chain 5042;
- sender is the dedicated T0 wallet;
- nonce = 5;
- function selector = `complete(bytes32)`;
- policy id matches the locked T0 policy;
- transaction `msg.value = 0`;
- `PolicyCompleted.finalBalance = 0`;
- `PolicyStateChanged` proves `Refunded -> Completed`;
- final state = `Completed`;
- final remaining = 0;
- final totalLiability = 0;
- final contract native balance = 0.

The one-time completion authorization is consumed. No additional T0 financial
action is authorized or required.

### T0 / G1 result

`G1_T0_MAINNET_CUSTODY = PROVEN`.

Live Arc receipt chain:
1. deploy;
2. register policy;
3. fund 0.010 native USDC;
4. release configured payout 0.001;
5. refund remaining 0.009;
6. complete with zero remaining liability.

Truth boundary: this does not promote G2+ assurance behavior. Hidden-canary
precommit, genuine provider work/signing, deterministic scoring, fail->no-pay,
circuit breaker, integrated live core loop and external-user product evidence
remain separate.

G0 / PRD_READY is now PROVEN via merged PR #1. The current PRD promotion gate
is G2 / PRECOMMIT.


## 47. G0 governance correction + G2 integrated readiness — 2026-10-02

### G0

The earlier project-local rule requiring Opeyemi approval for G0 was corrected.

Final G0 rule:
- Faadil owner sign-off + technically clean merge is sufficient for PRD_READY;
- collaborator review is recommended / non-blocking;
- technical-owner review becomes mandatory only at later surface-specific gates where that owner is explicitly accountable.

Observed:
- `opeblow` permission: **write**
- PR #1: **MERGED**
- merge SHA: `1220fc5d39b2262f0b66d0ae4713629b10f3ca29`
- G0 / PRD_READY: **PROVEN**

### G2 vehicle decision

Do **not** deploy the standalone `AssuranceCoreV1` merely to obtain a G2 proof.

Use the integrated `AssuranceVault` product core so that the precommit proven
at G2 is the same mechanism that later carries provider output lock, reveal,
deterministic resolution and financial consequence.

Integrated base:
- branch: `ops/exact-predeploy-gas-snapshot`
- SHA: `c3aaa11bf7454e1f3afe0fb740c8c0ccd7fedd5c`
- clean-room workflow: `36680776957`
- JavaScript: **72 passed / 0 failed**
- Solidity: **29 passed / 0 failed**
- AssuranceVault creation bytecode:
  `0xac69dd96b86b9083bf08c6ef904df7bf9ee602addaccc1938357f9cb9c75ff57`

Readiness workstream:
- branch: `ops/g2-precommit-readiness`
- PR: **#45**
- files:
  - `docs/internal/G2-PRECOMMIT-READINESS.md`
  - `docs/internal/G2-PRECOMMIT-READINESS.yaml`

### G2 truth boundary

Required live G2 claim:

> A real opaque hidden-test commitment exists on Arc mainnet before provider
> execution/output lock for the same batch.

Before provider output lock, only the opaque commitment may be public. The
commitment preimage must remain private until reveal; do not place it in GitHub,
Actions artifacts/logs, PR comments, chat or screenshots.

No integrated deployment, policy creation, funding, `commitBatch`, output-lock,
reveal or resolve action is currently authorized.

Current order:
`reconcile integrated line with merged G0 -> rerun readiness -> protected live G2 execution`.


## 48. G0 merge receipt + current G2 blocker — 2026-10-02

PR #1 merged successfully into `main` with merge commit:

`1220fc5d39b2262f0b66d0ae4713629b10f3ca29`

The merge includes the corrected review policy:
- owner sign-off is sufficient for G0;
- collaborator review is recommended/non-blocking at G0;
- later technical-owner review remains surface-specific.

Current G2 status:
- G0: **PROVEN**
- G1: **PROVEN**
- PR #45 readiness: **clean-room SUCCESS**
- live G2 proof: **NOT PROVEN**
- remaining structural blocker: the integrated AssuranceVault branch must absorb/reconcile the new G0 mainline commits before any live protected action.
