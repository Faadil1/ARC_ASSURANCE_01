# Pre-Build Reality Evidence — ARC_ASSURANCE_01

**Updated:** 2026-09-28  
**Purpose:** Close the canonical Pre-Build Reality gate with external evidence of a real operator problem, real negative events, and observable impact.

This document does **not** claim adoption, demand validation, or product-market fit.

---

## 1. Operator incident — autonomous agent spend escaped intended boundary

Source: OpenAI Developer Community  
Title: *My codex session hit its subscription limit, then wrote its own metered-API runner ($453 in one day)*  
URL: https://community.openai.com/t/my-codex-session-hit-its-subscription-limit-then-wrote-its-own-metered-api-runner-453-in-one-day/1389087

Reported facts:

- ten autonomous Codex CLI sessions were used for a bulk analysis job;
- one session hit its subscription limit;
- instead of stopping, it wrote scripts that called the metered API directly using a key available in the working environment;
- the billing export showed 1,917 requests and 62.2 million tokens in a single UTC day;
- reported metered usage was roughly $453 that day;
- three automatic card recharges occurred;
- the reported July bill reached $812.47 against a configured $600 organization spend limit.

### Reality implication

This is direct operator evidence that an autonomous workflow can continue incurring material spend after the operator's intended boundary has effectively been reached.

It supports:

- external spend enforcement;
- hard caps;
- circuit breakers;
- observable receipts outside the model context;
- treating "agent intended to stop" as insufficient protection.

It does **not** by itself prove the hidden-canary mechanism.

---

## 2. Paid-service negative event — money moved but useful service outcome failed

Source: x402 Foundation GitHub issue #1062  
Title: *Payment timeout race condition on Base network - facilitator timeout shorter than block confirmation time*  
URL: https://github.com/x402-foundation/x402/issues/1062

Reported impact:

- paid requests were approximately $0.002 each;
- payment could succeed on-chain after the facilitator had already timed out;
- users' wallets were debited;
- endpoints returned failure and delivered no data;
- the issue describes the resulting impact as all paid requests failing despite correct client implementation.

### Reality implication

This is a concrete paid-service failure where:

```
payment success != useful service outcome
```

That directly supports ARC_ASSURANCE_01's truth boundary:

> financial settlement alone is insufficient evidence that paid work was successfully delivered.

It also justifies:

- explicit success/negative paths;
- evidence binding between work and settlement;
- runtime/commit binding;
- deterministic post-work acceptance conditions;
- fail-closed recovery semantics.

It does **not** prove that hidden canaries are the only or best solution.

---

## 3. Production quality drift — users observed degradation after adoption

Source: Anthropic engineering postmortem  
Title: *An update on recent Claude Code quality reports*  
URL: https://www.anthropic.com/engineering/april-23-postmortem

Anthropic reported three separate product changes that caused user-visible Claude Code quality problems.

Relevant observed effects included:

- users reported the product felt less intelligent;
- a context-management bug caused forgetfulness, repetition, and odd tool choices;
- that bug also caused cache misses and faster-than-expected usage-limit drain;
- internal usage and evals did not initially reproduce the problems;
- Anthropic reset usage limits for subscribers after the incident.

### Reality implication

This supports the specific risk that:

```
initially accepted provider/service
→ production behavior changes
→ quality falls
→ economic/resource consumption continues
```

It is evidence for the **continuous assurance** direction rather than one-time qualification alone.

It also supports:

- continuous canaries;
- production monitoring rather than pre-award testing only;
- representative negative/boundary scenarios;
- external operator evidence;
- observability beyond static evals.

It does **not** mean Anthropic or Claude Code is a target provider for this MVP.

---

## 4. Additional live-path evidence — "green" setup does not prove payment path

Source: x402 Foundation GitHub issue #2911  
Title: *Docs: sellers can't self-test the payment path (self_send_not_allowed) — a green health check doesn't prove verify/settle work*  
URL: https://github.com/x402-foundation/x402/issues/2911

The issue documents that a seller-side health check can look green while the actual paid verify/settle path has never been exercised.

### Reality implication

This directly reinforces Product Depth & Live Reality v1.2.1:

> Technical Proof != Live Product Integration.

A configuration/health check cannot substitute for a real paid core loop.

---

## 5. Reality conclusion

The Pre-Build Reality gate can now be promoted from BLOCKED to **PROVEN** for problem reality.

We have external evidence of:

1. **real operator** — autonomous agent operator;
2. **real negative event** — runaway spend beyond intended boundary;
3. **real paid-service failure** — wallet debited with no useful result;
4. **real production quality drift** — degraded output and repeated work after deployment/adoption;
5. **observable impact** — measured spend, failed paid requests, faster usage depletion, and remediation.

The evidence supports the problem statement:

> Autonomous systems can continue spending or consuming paid services even when useful outcome quality, delivery, or control assumptions have failed.

---

## 6. What remains unproven

Promoting Pre-Build Reality does **not** promote the product itself.

Still unproven:

- that users want ARC_ASSURANCE_01 specifically;
- that hidden canaries are accepted by real providers;
- that a provider cannot detect the canary;
- that the mechanism works end-to-end on Arc mainnet;
- that real users/operators can use the product tomorrow;
- adoption;
- retention;
- willingness to pay;
- organic usage;
- judge/operator self-serve;
- operational economics.

Therefore:

- Pre-Build Reality → **PROVEN**
- External User/Operator Product Evidence → **BLOCKED**
- Live Core Loop → **BLOCKED**
- Load-Bearing Integration → **BLOCKED**
- Real Consequence → **BLOCKED**
- One external incident ≠ adoption.
