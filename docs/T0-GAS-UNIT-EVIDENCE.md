# T0 Gas Unit Evidence

**Scope:** PolicyCustody T0 mainnet proof  
**Evidence class:** LOCAL_EXACT_HEAD_REHEARSAL

The T0 gas report is parsed into a machine-readable evidence file before any wallet funding.

## Canonical T0 sequence

```text
deploy PolicyCustody
→ createPolicy
→ fund
→ releaseConfiguredPayout
→ refundRemaining
→ complete
```

Observed max gas from the exact-head Arc Foundry gas report:

| Step | Gas |
|---|---:|
| deploy PolicyCustody | 2,160,427 |
| createPolicy | 217,532 |
| fund | 131,090 |
| releaseConfiguredPayout | 160,713 |
| refundRemaining | 84,222 |
| complete | 45,575 |

Function execution max-sum:

```text
639,132 gas
```

Because Foundry function gas reports do not represent the full intrinsic cost of six independent mainnet transactions, the planning evidence adds:

```text
6 × 21,000 = 126,000 gas
```

Canonical T0 planning floor before the separate safety multiplier:

```text
2,160,427
+ 639,132
+ 126,000
= 2,925,559 gas
```

The later wallet-budget gate still applies the gas-unit safety multiplier. This intrinsic floor does not attempt to exactly model calldata intrinsic gas; that residual is part of the safety margin.

## Recovery

`cancelExpiredAndRefund` is tracked separately at an observed max of 85,230 gas. It is not part of the happy-path T0 sequence.

## Truth boundary

This evidence is not:

- an Arc mainnet receipt;
- a live fee quote;
- a guarantee of transaction cost;
- funding authorization;
- deployment authorization.

It is a conservative local planning input produced from the exact T0 source under pinned Arc Foundry.
