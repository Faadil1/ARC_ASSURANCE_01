# ARC_ASSURANCE_01 — Reality Ledger

Updated: 2026-09-29

This ledger records what is **OBSERVED**, **INFERRED**, or **UNKNOWN**. It is not a marketing document.

## OBSERVED

- The public repository `Faadil1/ARC_ASSURANCE_01` exists.
- PR #1 contains the draft PRD, work split, canonical state, handover, and contribution rules.
- Opeyemi accepted the collaborator invitation; GitHub reports write permission.
- The current product direction is a precommitted hidden-canary assurance mechanism for deterministic paid work.
- The critical MVP path intentionally excludes Circle Agent Wallets, Nanopayments, x402, ERC-8004, and ERC-8183.
- The T0 native-USDC custody source, tests, deploy script, proof driver, runbook, and evidence template have been produced on `feat/t0-mainnet-custody`.
- Arc Foundry test execution was verified on 2026-09-29: `35 passed; 0 failed`. This is LOCAL evidence only.
- No canonical Arc mainnet product run has been completed yet.
- No live pass→pay / fail→no-pay / breaker→refund evidence exists yet.
- No external user/operator trial has been recorded yet.

## INFERRED

- Structured document extraction is a suitable MVP domain because acceptance can be represented deterministically.
- Arc mainnet can be a load-bearing settlement layer for the mechanism if T0 and the full financial-causality loop succeed.
- Hidden one-time canaries may reduce benchmark gaming relative to public fixed tests, but canary detectability remains a real risk.
- The strongest differentiation is likely continuous hidden verification with financial consequence, not generic payments, escrow, procurement, or policy gating.

## UNKNOWN

- Whether an external operator will find the problem painful enough to use the mechanism.
- Whether a real provider can reliably be kept unaware of which work item is the canary.
- Actual mainnet gas/operational cost for the final contract lifecycle.
- Whether judge/operator self-serve can be made clear without creator narration.
- Whether the mechanism remains distinctive after the next competitive-novelty refresh.
- Whether one or more external dependencies will fail in a way that requires architecture changes.

## Evidence classes

Use only:

- `LIVE`
- `LOCAL`
- `LOCAL_STUB`
- `PRESEEDED`
- `SIMULATED`
- `PARTIAL`
- `NOT_IMPLEMENTED`

A screenshot, replay, static fixture, or recorded transaction is evidence only for what it directly demonstrates.

## Current live-reality status

- Live Core Loop: **NOT_IMPLEMENTED**
- Load-Bearing Arc Integration: **NOT_IMPLEMENTED**
- Real Consequence: **NOT_IMPLEMENTED**
- External User/Operator Evidence: **NOT_IMPLEMENTED**
- Judge/Operator Self-Serve: **NOT_IMPLEMENTED**
- Clean-Room Reproduction: **NOT_IMPLEMENTED**
- Post-Vertical-Slice Depth Review: **NOT_IMPLEMENTED**


## T0 reality delta — 2026-09-29

### OBSERVED

- `PolicyCustody.sol` replaces the removed `T0NativeCustody.sol` on `feat/t0-mainnet-custody`.
- Under `arc-forge 1.7.1-dev` (commit `d497beea7096ff2a8e583c8b307941f24a61b06b`) with solc `0.8.24`, the suite reports `35 passed; 0 failed`.
- Tests cover the lifecycle, caps, expiry, chain guard, reentrancy, transfer failure, per-policy liability isolation, and unattributed forced value.
- Read-only queries against `https://rpc.mainnet.arc.io` returned chain id `5042`, contract code at the USDC interface `0x3600000000000000000000000000000000000000`, and `decimals() == 6`.
- `script/t0-mainnet-proof.sh preflight` aborts on the missing `PRIVATE_KEY` without signing or broadcasting anything.
- No mainnet private key was used. No real value movement was executed.

### INFERRED

- Bounding payout and refund by each policy's own liability, rather than by the pooled native balance, prevents one policy from being paid out of another's funds.
- Requiring `State.PaidOut` before `refundRemaining` prevents the funder from skipping the configured payout and reclaiming the whole position.
- The 18-decimal native representation and the 6-decimal ERC-20 interface are backed by one balance; mixing them would introduce a `1e12` error.

### UNKNOWN

- Whether the contract behaves identically under live Arc mainnet runtime conditions.
- Actual mainnet gas cost for the deploy/fund/payout/refund/complete lifecycle.
- Whether any untested path on Arc mainnet behaves differently from the local Arc VM.
- Whether a second Arc-specific edge case exists that the test suite does not model.

### NOT PROVEN BY THIS DELTA

- G1 T0_MAINNET_CUSTODY remains ACTIVE. Local test success is LOCAL evidence and does not satisfy the gate.


## T0 funding-readiness reality delta — 2026-09-30

### OBSERVED

- T0 exact source revalidation is green at 40/40 tests.
- Exact-head T0 gas rehearsal measured a 2,925,559 gas planning floor after adding six transaction intrinsic floors.
- Recovery `cancelExpiredAndRefund` measured 85,230 gas max and is tracked separately.
- Arc read-only fee workflow `36682054936` observed chain id 5042, block 23,501,187 and gas price 20,000,000,000 wei/gas.
- With 1.25× gas-unit and 2× gas-price safety, the contingency peak requirement including 0.010 USDC principal was 0.16158948 USDC.
- The 5.00 USDC hard wallet ceiling is therefore sufficient for that time-bound snapshot.
- A 0.50 USDC initial top-up candidate was prepared.
- The candidate rule requires a fresh contingency peak <= 0.25 USDC.
- The latest snapshot satisfies that rule.
- CI explicitly reports funding_authorized=false.
- No wallet has been created, funded, signed with, or used by these workflows.
- No private key has entered repo, CI, issue, PR, artifact or chat.

### INFERRED

- A 0.50 USDC initial top-up provides substantial operational headroom over the current conservative contingency estimate while keeping capital exposure very small.
- The previous 5 USDC number is better treated as a hard ceiling than a funding target.

### STILL UNKNOWN / BLOCKED

- Dedicated T0 wallet public address.
- Whether that wallet is a fresh EOA with pending nonce 0.
- Wallet balance after any future funding.
- Fee state immediately before the actual protected deploy.
- Any real Arc deploy/fund/payout/refund/complete receipt.
- G1 remains NOT PROVEN.

### PROTECTED NEXT ACTION

Create a dedicated Arc mainnet EOA locally and provide only its public address for read-only inspection.

Do not provide the private key or seed phrase.


## Public wallet readiness proof — 2026-10-01

### OBSERVED

- Dedicated public address checked read-only on Arc:
  `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`.
- Arc chain id returned 5042.
- `eth_getCode` returned `0x`; the address is an EOA.
- Pending nonce returned 0.
- Native Arc balance returned 0.
- Wallet readiness verdict:
  `PUBLIC_WALLET_READY_FOR_FUNDING_REVIEW`.
- The same workflow refreshed fees at block 23,690,527.
- Observed gas price was 20,000,000,570 wei/gas.
- Conservative contingency peak was 0.16158948432030018 USDC.
- The 0.50 USDC candidate envelope passed numerical review.
- CI still records `funding_authorized = false`.

### CONSEQUENCE

The public-wallet gate is PROVEN.

The next unresolved gate is explicit human funding authorization.

No private key, signature, broadcast or funds were used to obtain this proof.


## Human funding authorization — 2026-10-01

### OBSERVED

- Faadil explicitly authorized an initial **0.50 USDC** top-up to the dedicated Arc wallet:
  `0x2ca7ba27ab8686f3a073c053fad6258c003a02bb`.
- The authorization is limited to the wallet top-up.
- It does not authorize deployment or any contract execution.
- A fresh exact-head wallet/fee validation remains required immediately before transfer.

### PROTECTED BOUNDARY

Private key and seed phrase remain human-local and must not be shared.
