# T0 Read-Only Fee Budget

This gate answers one narrow question before a dedicated wallet is funded:

> Is the 5 USDC wallet ceiling comfortably sufficient for the measured T0 gas plan plus the 0.010 USDC principal?

## Proven gas input

Canonical T0 planning floor:

```text
2,925,559 gas
```

This already includes:

- PolicyCustody deployment;
- createPolicy;
- fund;
- configured payout;
- normal refund;
- complete;
- six × 21,000 transaction intrinsic floors.

Recovery reserve:

```text
cancelExpiredAndRefund max + one intrinsic floor
= 85,230 + 21,000
= 106,230 gas
```

## Safety multipliers

```text
gas units: 1.25×
gas price: 2.00× observed eth_gasPrice
```

The fee snapshot queries Arc mainnet read-only:

- `eth_chainId`
- `eth_blockNumber`
- `eth_gasPrice`

No account address or private key is needed.

## Budget outputs

Two views are produced:

1. **happy path** — canonical T0 sequence;
2. **contingency** — happy-path planning reserve plus one recovery transaction.

Both include the 0.010 USDC peak principal.

The result is compared with the hard dedicated-wallet ceiling of 5.00 USDC.

## Truth boundary

This snapshot is intentionally time-bound.

It does not prove:

- future fee prices;
- wallet balance;
- funding;
- deployment;
- custody;
- payout;
- refund.

A green result only says the **ceiling is sufficient under the observed fee snapshot and configured safety margins**.

Immediately before a protected mainnet action, the fee snapshot must be refreshed.
