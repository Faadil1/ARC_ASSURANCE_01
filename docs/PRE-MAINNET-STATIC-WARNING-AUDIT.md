# Pre-Mainnet Static Warning Audit

**Branch:** `fix/pre-mainnet-static-hardening`  
**Status:** ACTIVE / EXACT-HEAD CI REQUIRED

This audit was triggered by Foundry lint warnings observed in clean-room run `36670714112`.

A green test suite does not make static-analysis warnings disappear. Each warning class is either removed, explicitly mitigated, or documented as an intentional protocol property.

## Warning classes observed

### `non-reentrant-not-first`

**Action:** FIXED IN SOURCE.

`nonReentrant` is now the first modifier on every state-mutating external entrypoint.

The guard now covers:

- `createPolicy`
- `fund`
- `commitBatch`
- `lockProviderOutput`
- `revealCanary`
- `resolveBatch`
- `cancelExpiredBatch`
- `refundProtectedRemainder`

This closes the previous possibility that a payout-recipient callback could enter an unguarded mutation such as `commitBatch()`.

### `reentrancy-events`

**Action:** FIXED IN SOURCE.

Canonical vault events are now emitted before the external native-value interaction.

Because an EVM revert removes all logs and state from the transaction, a failed transfer cannot leave a false `PaymentReleased` or refund/close event behind.

The order is now:

```text
effects
→ canonical vault events
→ external value transfer
→ successful tx receipt
```

The chain verifier continues to require the relevant events and a successful receipt from the same transaction.

### `reentrancy-eth`

**Action:** MITIGATED AND TESTED.

The native transfer remains a low-level call because Arc native USDC is transferred as native value.

Mitigation:

- effects-before-interaction;
- global non-reentrancy guard on all state-mutating external entrypoints;
- immutable policy payout recipient;
- policy-local liability bounds;
- failed native transfer reverts the entire transaction.

A malicious recipient test now attempts `commitBatch()` from its receive callback and must observe reentry failure while the legitimate payout completes.

### `unsafe-typecast`

**Action:** FIXED IN SOURCE.

Timestamp conversion now uses OpenZeppelin `SafeCast.toUint64` rather than raw `uint64(block.timestamp)`.

### `arbitrary-send-eth`

**Action:** INTENTIONAL / BOUNDED ARCHITECTURE.

Native value is sent only to one of two policy-bound destinations:

- immutable `payoutRecipient` on deterministic PASS;
- immutable `funder` on protected refund.

The destination cannot be supplied by the caller at payout/refund time.

This warning is therefore retained as a useful reminder of the external-interaction boundary, not silently suppressed.

### `block-timestamp`

**Action:** INTENTIONAL / BOUNDED SEMANTICS.

Timestamp comparisons implement:

- provider signature deadline;
- policy expiry;
- expiry recovery.

The protocol does not use timestamp for randomness, pricing, scoring, or sub-block ordering.

The protected run requires expiry materially in the future (at least 24h in the operational package), so normal validator timestamp latitude is not a load-bearing acceptance-test mechanism.

### `environment-read-across-mutation`

**Action:** TEST-ONLY / REVIEWED.

This warning concerns test code around `vm.warp`, not production runtime behavior.

## Promotion rule

Before this audit can be PROVEN:

1. exact-head clean-room CI must compile;
2. all JS/Solidity tests must pass;
3. the new malicious-recipient reentry test must pass;
4. lint output must be re-reviewed;
5. any remaining warning must match an explicitly documented intentional category above.

Any new warning class reopens the audit.
