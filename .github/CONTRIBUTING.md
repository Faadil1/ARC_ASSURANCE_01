# Contributing to ARC_ASSURANCE_01

ARC_ASSURANCE_01 is being built for Arc Microgrants 2026. The scope is deliberately narrow so the team can prove one real mainnet financial-control mechanism before expanding.

## Before you change code

1. Read `docs/internal/CANONICAL-STATE.yaml`.
2. Read `docs/internal/HANDOVER.md`.
3. Read `product/PRD.md`.
4. Read `docs/internal/WORKSPLIT.md`.
5. Do not change locked invariants, truth boundaries, financial semantics, or the hero proof contract without explicit product approval.

## Workflow

- Branch from current `main`.
- Keep one coherent concern per PR.
- Avoid overlapping ownership on the same contract/ABI surface.
- Do not force-push shared collaborator branches.
- Preserve canonical evidence.
- Never commit private keys, seed phrases, RPC secrets, API keys, canary secrets intended to remain hidden, or real private data.

## Pull requests

Every PR must explain:

- what problem it solves;
- which canonical gate it advances;
- financial/security impact;
- tests added or changed;
- whether Arc mainnet proof is still required;
- whether truth-boundary language changed.

After a meaningful merged milestone, update both:

- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`

so another contributor or conversation can immediately take over.

## Scope discipline

Before G5 FINANCIAL_CAUSALITY is green, do not expand into:

- marketplaces;
- bidding;
- reputation;
- tokens;
- ZK;
- subjective LLM evaluation;
- broad agent-wallet abstractions;
- unrelated UI polish.

## Mainnet truth rule

`LOCAL_STUB != TESTNET != LIVE_MAINNET`.

A real mainnet claim requires real Arc mainnet evidence.
