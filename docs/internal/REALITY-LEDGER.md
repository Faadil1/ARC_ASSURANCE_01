# ARC_ASSURANCE_01 — Reality Ledger

Updated: 2026-10-01

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


## Control-plane reconciliation pointer — 2026-10-01

Current reconciliation details are recorded in
`docs/internal/SYSTEM-RECONCILIATION-2026-10-01.md`,
`docs/internal/BUILD-LIFECYCLE-COVERAGE.yaml`, and
`docs/internal/CLAIM-RUNTIME-EVIDENCE-GRAPH.yaml`.

Historical evidence classes remain unchanged.


## Pre-Build Reality / product-evidence separation — 2026-10-01

### OBSERVED

PR #8 and `docs/research/PRE-BUILD-REALITY-EVIDENCE.md` contain external
problem evidence covering:

- a real external operator problem;
- concrete negative events;
- observable financial/operational impact.

Therefore **Pre-Build Reality = PROVEN** for problem reality.

### STILL UNKNOWN / BLOCKED

This does not prove that an external user has used ARC_ASSURANCE_01, that a real
provider accepts the mechanism, product demand, willingness to pay, adoption, or
retention.

Therefore **External User/Operator Product Evidence = BLOCKED**.

These two gates must not be collapsed into one another.


## Final pre-transfer revalidation — 2026-10-01

### OBSERVED

Execution evidence head:

`4f7f3b254a29e6023d539a85e5b126a7f21e1955`

GitHub Actions:

- T0 Revalidation `36891632445` — SUCCESS — 40/40 tests;
- T0 Read-Only Fee Budget `36891632622` — SUCCESS.

The run observed the dedicated wallet as an EOA with pending nonce 0 and balance
0 before top-up, and the fresh contingency estimate remained below the configured
0.25 USDC threshold.

### CONSEQUENCE

`T0_FINAL_PRE_TRANSFER_REVALIDATION = PROVEN`.

Operational next gate:

`T0_WALLET_TOPUP = ACTIVE / HUMAN / PROTECTED`.

Automation must not move value. After the external human action, only the
read-only `POST_FUNDING_WALLET_RECEIPT` check may run before stopping for a
separate deployment authorization.

### HEAD BOUNDARY

The execution evidence head is not the same thing as the mutable branch head.
The first state-recording commit after the proven execution was
`90d79ee7d2f891366a9962af90f440768b4347e3`. Current branch head must be
resolved dynamically from PR #44. Documentation-only commits do not become
execution evidence unless executable T0 inputs change.


## Real T0 wallet funding — 2026-10-01

### OBSERVED

- The dedicated Arc wallet UI shows **0.51 USDC** after the human top-up.
- The prior explicit authorization was **0.50 USDC**.
- The resulting **+0.01 USDC** difference is an execution variance; it is not rewritten as retroactively preauthorized.
- Read-only Arc verification after funding succeeded on workflow head `220a61576cab23665483d67ebca25e44590b35ac`.
- T0 Revalidation run `36938183550`: SUCCESS.
- T0 Read-Only Fee Budget run `36938183671`: SUCCESS.
- The live checker proves the wallet is an EOA, pending nonce is 0, and the native-USDC balance is at least 0.50 USDC and no more than the 5.00 USDC hard ceiling.

### STILL MISSING

- The concrete Arc transaction hash/reference for the top-up has not yet been captured into canonical evidence.
- No contract deployment, custody, payout, refund or completion is proven or authorized.

### CURRENT BOUNDARY

`POST_FUNDING_WALLET_RECEIPT = ACTIVE` until the transaction reference is bound to the funded-wallet state. After that, STOP for a separate deployment authorization.


## Post-funding Arc receipt closure — 2026-10-01

### OBSERVED

- Transaction hash: `0x022bcfbb11215afdb6226a1b6e5a11b339a23e52e1b29676d6ae932df0d5822d`.
- Wallet UI reports Confirmed on Arc, 0.51 USDC sent to the dedicated T0 wallet.
- Arc RPC verification succeeded in GitHub Actions run `36938737314`.
- Companion read-only and T0 revalidation runs `36938737292` and `36938737258` also succeeded on the same head `4a81dd80edb9e4408b04f70d73ebe43163f34d5f`.

### CONSEQUENCE

`POST_FUNDING_WALLET_RECEIPT = PROVEN`.

The next state is `T0_DEPLOYMENT_AUTHORIZATION`. No deployment is authorized yet.


## Real Arc PolicyCustody deployment — 2026-10-02

### OBSERVED

- Deployment tx: `0x7363a99abfe7293ccd2b47cf6e8df41d135ad0db0a39b6745b753082ead47f24`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Arc receipt verification run `36975671614`: SUCCESS.
- Transaction is a successful zero-value contract creation from the dedicated T0 wallet at nonce 0.
- Runtime code exists at the expected contract address.
- Runtime getters match the locked authority, chain 5042, Arc USDC interface and 0.05-USDC deployment spend cap.
- Before policy registration: policyCount = 0, totalLiability = 0, totalCustodyReceived = 0.
- Executable runtime bytecode matches the canonical source build after stripping only Solidity CBOR metadata.

### CONSEQUENCE

`T0_DEPLOYMENT_EXECUTION = PROVEN`.

Next: exactly one authorized `createPolicy` registration using the locked T0 policy config. Contract funding remains unauthorized.


## Real Arc policy registration — 2026-10-02

### OBSERVED

- createPolicy tx: `0x2ed1083c31dda72dc8b9934c44ab617adebcce1e9223e9d4f4162ff9371db9d7`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Verification run `36976421698`: SUCCESS.
- Transaction is successful, zero-value, nonce 1, from the dedicated T0 wallet.
- Function selector and decoded calldata match the locked policy configuration.
- The emitted `PolicyCreated` event matches the same policy configuration.
- Read-only chain state after registration: policyCount 1, policy exists, state Created, zero remaining, zero liability, zero custody received, zero value released.

### CONSEQUENCE

`T0_POLICY_REGISTRATION_EXECUTION = PROVEN`.

This proves policy registration only. It does **not** prove custody or settlement.

### CURRENT BOUNDARY

`T0_CONTRACT_FUNDING_AUTHORIZATION = ACTIVE / HUMAN / PROTECTED / NOT GRANTED`.

No contract funding, payout, refund or completion is authorized by prior approvals.


## Real Arc contract funding — 2026-10-02

### OBSERVED

- Funding tx: `0xa1f49555ec3cf858372e180162e6e151949d17cd196d7f39656a31942baa21f1`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Verification run `36982128480`: SUCCESS.
- Transaction is a successful `fund(bytes32)` call from the dedicated T0 wallet at nonce 2.
- Transaction value is exactly `10000000000000000` native units = **0.010 USDC**.
- The emitted `PolicyFunded` event records the same amount.
- Immediately after the verified funding transaction: state = Funded, remaining = 0.010, totalLiability = 0.010, totalCustodyReceived = 0.010, contract balance = 0.010, totalValueReleased = 0.

### CONSEQUENCE

`T0_CONTRACT_FUNDING_EXECUTION = PROVEN`.

This proves real Arc-native custody of the bounded T0 principal. It does **not** prove payout, refund or completion.

### CURRENT BOUNDARY

`T0_PAYOUT_AUTHORIZATION = ACTIVE / HUMAN / PROTECTED / NOT GRANTED`.

No configured payout transaction is authorized by the prior funding approval.


## Real Arc configured payout — 2026-10-02

### OBSERVED

- Payout tx: `0x9dc11ee465b2c8afc354bdad9e3825e5a0c6a97499bae907e72ea1a677f32d34`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Verification run `36983144079`: SUCCESS.
- Transaction is a successful `releaseConfiguredPayout(bytes32)` call from the dedicated T0 wallet at nonce 3.
- Transaction value is zero.
- The emitted `PaymentReleased` event records exactly **0.001 native USDC**.
- Immediately after payout verification: state = PaidOut, remaining = 0.009, totalLiability = 0.009, totalCustodyReceived = 0.010, totalValueReleased = 0.001, contract balance = 0.009 native USDC.

### CONSEQUENCE

`T0_PAYOUT_EXECUTION = PROVEN`.

This proves the configured payout leg. It does **not** prove refund or completion.

### CURRENT BOUNDARY

`T0_REFUND_AUTHORIZATION = ACTIVE / HUMAN / PROTECTED / NOT GRANTED`.

No refund transaction is authorized by the payout approval.


## Real Arc remaining-funds refund — 2026-10-02

### OBSERVED

- Refund tx: `0x079ca3985529ac088aa50ba5a3ed4406de3c4667502780b06691ca15b07d4024`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Verification run `36984307453`: SUCCESS.
- Transaction is a successful `refundRemaining(bytes32)` call from the dedicated T0 wallet at nonce 4.
- Transaction value is zero.
- `RemainingFundsRefunded` records exactly **0.009 native USDC**.
- Immediately after refund verification: state = Refunded, remaining = 0, totalLiability = 0, totalCustodyReceived = 0.010, totalValueReleased = 0.001, contract balance = 0.

### CONSEQUENCE

`T0_REFUND_EXECUTION = PROVEN`.

This proves the remaining-funds refund leg. It does **not** prove completion.

### CURRENT BOUNDARY

`T0_COMPLETION_AUTHORIZATION = ACTIVE / HUMAN / PROTECTED / NOT GRANTED`.

No completion transaction is authorized by the refund approval.


## Real Arc completion + T0/G1 close — 2026-10-02

### OBSERVED

- Completion tx: `0xb657c1de8c397d2606cd4f41ccccf556f65f0f12f2ff195f6d5a6fda1e3d1932`.
- Contract: `0x0377D371d6981c98CE9C650338D7E1E80819B572`.
- Verification run `36985388199`: SUCCESS.
- Transaction is a successful `complete(bytes32)` call from the dedicated T0 wallet at nonce 5.
- Transaction value is zero.
- `PolicyCompleted` records final contract balance = 0.
- `PolicyStateChanged` proves `Refunded -> Completed`.
- Final observed chain state: state = Completed, remaining = 0, totalLiability = 0, totalCustodyReceived = 0.010 native USDC, totalValueReleased = 0.001 native USDC, contract balance = 0.

### CONSEQUENCE

`T0_COMPLETION_EXECUTION = PROVEN`.

`G1_T0_MAINNET_CUSTODY = PROVEN`.

The full bounded T0 Arc lifecycle is now live and receipt-backed:
deployment -> policy registration -> 0.010 custody -> 0.001 configured payout ->
0.009 remaining-funds refund -> completion.

### TRUTH BOUNDARY

This G1 promotion proves the Arc-native custody/payment primitive only. It does
not prove G2+ behavior: hidden-test precommitment, genuine provider execution,
signed provider output, deterministic canary scoring, FAIL -> no-pay causality,
circuit breaking, the integrated live product loop, or external-user adoption.

### CURRENT PRODUCT BOUNDARY

`G0_PRD_READY = PROVEN` via PR #1 merged to `main` at
`1220fc5d39b2262f0b66d0ae4713629b10f3ca29`.

`G1_T0_MAINNET_CUSTODY = PROVEN`.

Current product promotion gate: `G2_PRECOMMIT` — readiness active, live proof not proven.
The integrated AssuranceVault line must first be reconciled with the merged G0 mainline.



## G0 governance correction + merge — 2026-10-02

### OBSERVED

- GitHub reports no repository ruleset requiring PR approval for this merge.
- PR #1 was technically clean / mergeable.
- `opeblow` has write permission.
- The project-local G0 rule was corrected so collaborator review is recommended/non-blocking.
- Faadil explicitly owner-signed the correction and authorized proceeding.
- PR #1 merged to `main` at `1220fc5d39b2262f0b66d0ae4713629b10f3ca29`.

### CONSEQUENCE

`G0_PRD_READY = PROVEN`.

This does not weaken later technical review gates. A technical-owner review can still be mandatory when a later change materially affects that owner's explicit contract/settlement surface.

### NEXT

`G2_PRECOMMIT` becomes the active product gate. The remaining immediate blocker is structural reconciliation of the integrated AssuranceVault line with merged G0 before any protected mainnet G2 action.


## G2 post-G0 readiness reconciliation — 2026-10-02

### OBSERVED

- G0 / PRD_READY is PROVEN on `main`.
- G1 / T0_MAINNET_CUSTODY is PROVEN.
- G2 readiness PR #45 uses the integrated `AssuranceVault`.
- Readiness head: `21ff1ac9b138e2271018bae696de744268bfc223`.
- Clean-room run `37006382193` succeeded on parent `ccbf1aa...`.
- The only parent→head change after that green run is `docs/internal/G2-PRECOMMIT-READINESS.yaml`.
- Compare from executable source `c3aaa11...` to readiness head touches governance/readiness documents only; executable source is unchanged.

### CONSEQUENCE

The earlier G0 blocker is cleared and G2 engineering readiness is green.

### CURRENT BOUNDARY

G2 remains **NOT PROVEN LIVE**.

Before exact predeploy estimation and any protected mainnet action, the public
integrated role addresses must be finalized:
- authority/funder;
- provider signer;
- payout recipient.

No mainnet action is authorized by this readiness state.


## G2 integrated Arc read-only predeploy — 2026-10-02

### OBSERVED

- executable/readiness head: `1933b9d5bfd9722450b099f7e054fe610ab017dc`;
- reproducible build run `37022813711`: SUCCESS;
- G2 read-only predeploy run `37022813189`: SUCCESS;
- all three configured role addresses are distinct EOAs;
- authority/funder nonce = 6 and balance = **0.450904799 native USDC**;
- provider signer nonce = 0, balance = 0;
- payout recipient nonce = 0, balance = 0;
- exact init-code hash = `0x40792e0e0b7c8d2d213b318332e7aea59a5e87bed386e76054ee9164d3cd1e93`;
- predicted CREATE address at nonce 6 =
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`;
- Arc `eth_estimateGas` for exact creation = **3,493,605 gas**;
- observed gas price = 20,000,000,000 wei/gas;
- observed deployment estimate = **0.0698721 USDC**;
- conservative full-hero budget with safety multipliers = **0.3060238 USDC** peak;
- current authority wallet balance exceeds that conservative peak by **0.144880999 USDC**.

### CONSEQUENCE

`G2_READONLY_PREDEPLOY = PROVEN`.

The current wallet is sufficient under the observed conservative budget; no
additional wallet top-up is presently required.

### TRUTH BOUNDARY

This is read-only evidence only. No private key was consumed, no transaction was
signed or broadcast, and no funds moved. The predicted contract address is valid
only while deployer nonce remains 6 and the exact init code remains unchanged.

### CURRENT PROTECTED BOUNDARY

`G2_INTEGRATED_DEPLOYMENT_AUTHORIZATION = ACTIVE / HUMAN / NOT GRANTED`.

A deployment authorization, if granted, covers deployment only. Policy creation,
funding, `commitBatch`, provider output lock, reveal and resolve remain separate
protected actions.


## G2 protected deployment authorization — 2026-10-02

### AUTHORIZATION OBSERVED

The human owner explicitly authorized **only** deployment of the integrated
`AssuranceVault` on Arc Mainnet.

### SCOPE BOUNDARY

Allowed: one integrated AssuranceVault deployment.

Not authorized: `createPolicy`, funding, `commitBatch`, provider output lock,
canary reveal, resolve, refund, or any additional wallet top-up.

The assistant must not consume or request a private key. Final signing/broadcast
remains a human MetaMask action.

### PRE-BROADCAST CONDITION

Re-run the exact read-only Arc predeploy gate on head
`1933b9d5bfd9722450b099f7e054fe610ab017dc` immediately before broadcast.


## Integrated AssuranceVault deployment — 2026-10-02

### OBSERVED

- Arc transaction:
  `0x00b06502ac70a1238b1127eab59a59253188d91af32606b701d38cda3a607272`
- block: **23909824**
- deployer: `0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb`
- nonce: **6**, consumed; current pending nonce after receipt = **7**
- contract:
  `0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4`
- transaction value: **0**
- exact transaction init code matches canonical build: **true**
- init-code hash:
  `0x40792e0e0b7c8d2d213b318332e7aea59a5e87bed386e76054ee9164d3cd1e93`
- runtime code size: **15,618 bytes**
- constructor bindings:
  - authority = dedicated human Arc wallet;
  - expectedChainId = 5042;
  - Arc USDC interface = `0x3600...0000`;
  - deployment spend cap = **0.05 native USDC**.
- initial contract state:
  - policyCount = 0;
  - liability = 0;
  - custody received = 0;
  - value released = 0;
  - native contract balance = 0.
- gas used = **3,464,938**
- effective gas price = **21.5 gwei**
- effective deployment cost = **0.074496167 native USDC**

Independent verification:
- G2 Deployment Receipt run `37036958146` — **SUCCESS**
- verification head `84efcb9d67085f12f171988fa21e5ebff7c79b76`
- artifact `11241455626`
- artifact digest
  `sha256:a502c42de338950a9f526c8ca1aeb37935a8d47ee7d7bfa8566fb99f316922d4`
- same-head reproducible build `37036958053` — **SUCCESS**

### CONSEQUENCE

`G2_INTEGRATED_DEPLOYMENT = PROVEN`.

The integrated product core is now physically deployed and exact-init-code bound
on Arc Mainnet.

### TRUTH BOUNDARY

This does **not** prove G2 / PRECOMMIT. No policy exists yet and no real batch
commitment has been submitted. It also does not prove funding, provider output,
reveal, deterministic resolve, PASS -> pay, FAIL -> no-pay, breaker -> refund,
or external-user adoption.

### CURRENT PROTECTED BOUNDARY

`G2_POLICY_CREATION_AUTHORIZATION = ACTIVE / HUMAN / NOT GRANTED`.

No downstream transaction is authorized by the deployment receipt.


## G2 policy creation preflight — 2026-10-02

### OBSERVED

Read-only run `37038419742` succeeded.

The integrated vault remains empty and unconfigured:
- policyCount = 0;
- liability = 0;
- custody = 0;
- released value = 0;
- contract balance = 0.

The locked `createPolicy` transaction estimates at **272,515 gas** with
observed fee **~0.00545030000981054 native USDC**, while the authority wallet
holds **0.376408632 native USDC**.

### CONSEQUENCE

Policy creation is technically ready but **not authorized**.

### CURRENT PROTECTED BOUNDARY

`G2_POLICY_CREATION_AUTHORIZATION = ACTIVE / HUMAN / NOT GRANTED`.

No downstream funding or batch action is implied by a future policy-creation
authorization.


## G2 policy creation receipt + funding boundary — 2026-10-02

### POLICY CREATION — OBSERVED

Transaction
`0x5713b214d517b681f7d266ed8eb7173611acf4833c71940932003d2e0c93c162`
succeeded on Arc mainnet and independently verifies as the exact authorized
`createPolicy` call.

The resulting policy exists with the locked role topology and economic limits.
No value has entered the vault yet.

### FUNDING PREFLIGHT — OBSERVED

Read-only run `37084047411` proves the first funding call is currently viable
for **0.010 native USDC**, with estimated gas **116,049** and estimated fee
**~0.00232098116049 USDC**. No funds moved during the preflight.

### CURRENT PROTECTED BOUNDARY

`G2_FUNDING_AUTHORIZATION = ACTIVE / HUMAN / NOT GRANTED`.

A future funding authorization covers one exact 0.010-USDC `fund(policyId)`
call only. It does not authorize `commitBatch` or any later lifecycle action.


## G2 funding authorization — 2026-10-02

### AUTHORIZATION OBSERVED

The human owner explicitly authorized one exact `fund(policyId)` call with
**0.010 native USDC** on the deployed integrated AssuranceVault.

### SCOPE BOUNDARY

Allowed: one exact first funding transaction for the locked G2 policy.

Not authorized: additional funding, `commitBatch`, provider output lock,
canary reveal, resolve, refund, or any later action.

Final signing remains a human MetaMask action. A fresh read-only funding
preflight must pass immediately before broadcast.


## G2 live funding receipt — 2026-10-02

### OBSERVED

Transaction
`0xf5233124f02d03b5396386a570bd55d4994e36afa8a02e6a56ef0cc0881c8edf`
succeeded on Arc mainnet.

Post-state:
- policy total funded = **0.010 native USDC**;
- vault liability = **0.010 native USDC**;
- total custody received = **0.010 native USDC**;
- contract balance = **0.010 native USDC**;
- value released = 0;
- no active batch exists.

### CONSEQUENCE

`G2_FUNDING = PROVEN`.

The integrated product now has real Arc custody behind the live G2 policy.

### TRUTH BOUNDARY

Funding does not prove precommitment or financial causality. No batch commitment,
provider output lock, reveal or resolve has yet occurred.

### CURRENT PROTECTED BOUNDARY

`G2_PRECOMMIT_AUTHORIZATION = ACTIVE / HUMAN / NOT GRANTED`.

The canary preimage must remain hidden from the provider and out of public repo
history until the reveal stage.
