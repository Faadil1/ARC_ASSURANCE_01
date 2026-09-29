# Integrated AssuranceVault — Build Candidate

**Status:** PRODUCED / REVALIDATION_REQUIRED  
**Branch:** `feat/integrated-assurance-vault`

## Core claim

The integrated contract removes the non-load-bearing gap between assurance and custody.

There is no independent provider payout function.

The only provider payout path is:

```text
funded policy
→ hidden commitment
→ signed provider output
→ canary reveal
→ deterministic PASS
→ resolveBatch()
→ native Arc USDC payout
```

If the deterministic result is FAIL, that same batch becomes terminal without provider payout.

## Policy configuration

Each policy binds immutably:

- funder/principal;
- provider signer;
- payout recipient;
- scorer ID hash;
- cumulative failure threshold;
- maximum custody cap;
- per-PASS unit payout;
- future expiry.

## Financial invariants

### PASS

```text
outputHash == expectedOutputHash
→ directive PAY
→ totalPaidOut += unitPayout
→ totalLiability -= unitPayout
→ native USDC sent to immutable payoutRecipient
```

`BatchResolved(PAY)` is emitted before `PaymentReleased` in the same transaction.

If the native transfer fails, the entire transaction reverts. The batch remains `Revealed`, no paid accounting persists, and no PaymentReleased event persists.

### FAIL below threshold

```text
outputHash != expectedOutputHash
→ failureCount += 1
→ directive WITHHOLD
→ batch terminal
→ no native transfer
→ liability remains protected
```

There is no later payout path for the resolved batch.

### FAIL reaching threshold

```text
FAIL
→ failureCount >= maxFailures
→ directive BREAKER
→ policy paused
→ future batch commits blocked
→ remainder remains protected
→ funder may refundProtectedRemainder()
→ policy closed
```

## Recovery

Every policy requires a future non-zero expiry.

If a batch is unresolved at expiry — including a PASS whose payout recipient permanently rejects native value — the funder can:

```text
cancelExpiredBatch()
→ policy paused
→ refundProtectedRemainder()
```

No post-expiry payout is allowed.

## Pool isolation

Payout and refund amounts are bounded by each policy's own liability:

```text
remaining =
totalFunded
- totalPaidOut
- totalRefunded
```

A large pooled contract balance cannot subsidize an underfunded policy.

## Arc asset model

The vault uses Arc native USDC through `msg.value` and native sends.

Raw custody values therefore use Arc's 18-decimal native representation.

The ERC-20 interface address is recorded for evidence but is not used for custody arithmetic in this contract.

Never add the native and ERC-20 views together; they are two interfaces over one underlying USDC balance.

## Direct-funding boundary

Plain native sends to the vault revert.

All attributed custody must enter through:

```solidity
fund(policyId)
```

Forced native value, if any, is excluded from policy liability and surfaced by `unattributedValue()`.

## Current test source

`test/assurance/AssuranceVault.t.sol` covers:

- PASS releases exact configured payout;
- FAIL withholds and same batch cannot later resolve/pay;
- second FAIL triggers breaker;
- breaker blocks future work and permits protected refund;
- prior PASS + later breaker refunds only remaining liability;
- wrong provider signature cannot reach resolve;
- rewritten expected answer cannot unlock payment;
- rejecting payout recipient causes full revert then expiry recovery;
- pooled vault balance cannot subsidize underfunded policy;
- direct un-attributed funding is rejected.

## Current truth boundary

The source now contains the required load-bearing integration.

That does **not** mean the integration is verified or live.

Current state:

```text
source integration = PRODUCED
exact-head compile/tests = NOT_YET_PROVEN
Arc mainnet deployment = NOT_IMPLEMENTED
PASS -> real payout receipt = NOT_IMPLEMENTED
FAIL -> real no-pay receipt = NOT_IMPLEMENTED
BREAKER -> real refund receipt = NOT_IMPLEMENTED
```

## Promotion sequence

Before deploying this candidate:

1. exact-head Arc Foundry compile/tests;
2. EIP-712 + canary cross-language golden vectors;
3. Opeyemi technical review;
4. reproduce build artifact / runtime bytecode hash;
5. deploy with tiny bounded mainnet value;
6. PASS run;
7. controlled `WRONG_AMOUNT_VALID` FAIL run;
8. second configured FAIL -> breaker;
9. protected remainder refund;
10. chain-native verifier reconstructs all consequences.

Only after those receipts exist can G5 Financial Causality or Live Core Loop be considered for promotion.
