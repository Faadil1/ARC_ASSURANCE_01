# T0 — Arc Mainnet Native USDC Custody Runbook

**Gate:** G1 / T0_MAINNET_CUSTODY  
**Status:** CODE_READY_CANDIDATE — not live-proven until real mainnet receipts are captured.

## Purpose

Prove only this primitive:

```
real Arc mainnet native USDC
→ minimal contract custody
→ configured native USDC payout
→ remaining-funds refund
```

T0 does **not** prove the hidden-canary product loop.

## Why native value

Arc uses USDC as its native gas/value asset. T0 therefore uses `msg.value` and native balance directly rather than adding an unnecessary ERC-20 approval dependency.

The contract still records explicit correlation events for intentional funding, payout, and refund.

## Truth boundary

Before a real run:

- Contract source: **PRODUCED**
- Tests: **NOT VERIFIED until Arc Foundry is run**
- Mainnet deployment: **NOT_IMPLEMENTED**
- Real custody: **NOT_IMPLEMENTED**
- Real payout: **NOT_IMPLEMENTED**
- Real refund: **NOT_IMPLEMENTED**

Do not mark T0 PROVEN from source code alone.

## 1. Install Arc Foundry

Follow the current Arc documentation and verify:

```bash
arc-forge --version
arc-cast --version
```

Use Arc Foundry, not generic local EVM tooling, for the Arc-specific runtime test.

## 2. Configure environment

```bash
cp .env.example .env
source .env

arc-cast chain-id --rpc-url "$ARC_MAINNET_RPC_URL"
# MUST return 5042
```

Never commit `.env` or a private key.

## 3. Run tests before mainnet

```bash
arc-forge test --network arc -vvv
```

Record the exact Arc Foundry version and commit SHA in the evidence file.

## 4. Deploy T0 contract

Set the deployer/owner address:

```bash
export DEPLOYER_ADDRESS="0x..."
```

Deploy to Arc mainnet:

```bash
arc-forge create src/T0NativeCustody.sol:T0NativeCustody \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$DEPLOYER_ADDRESS" 5042 \
  --broadcast
```

Capture:

- deploy transaction hash;
- contract address;
- deployed bytecode exists;
- owner;
- expectedChainId = 5042.

## 5. Choose bounded amounts

Use deliberately small values.

Arc native value uses 18 decimals. For example, `0.01` native USDC is:

```
10000000000000000
```

Do not copy an amount blindly. Verify the decimal conversion and wallet balance first.

## 6. Fund

Create a correlation reference:

```bash
export FUND_REF=$(arc-cast keccak "ARC_ASSURANCE_01:T0:FUND:1")
```

Then:

```bash
arc-cast send "$T0_CONTRACT_ADDRESS" \
  "fund(bytes32)" "$FUND_REF" \
  --value "$T0_FUND_AMOUNT_WEI" \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Capture the receipt and contract balance.

## 7. Payout

```bash
export PAYOUT_REF=$(arc-cast keccak "ARC_ASSURANCE_01:T0:PAYOUT:1")

arc-cast send "$T0_CONTRACT_ADDRESS" \
  "payout(address,uint256,bytes32)" \
  "$T0_RECIPIENT_ADDRESS" "$T0_PAYOUT_AMOUNT_WEI" "$PAYOUT_REF" \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Capture:

- receipt;
- `Paid` event;
- recipient balance delta;
- contract balance delta.

## 8. Refund remainder

```bash
export REFUND_REF=$(arc-cast keccak "ARC_ASSURANCE_01:T0:REFUND:1")

arc-cast send "$T0_CONTRACT_ADDRESS" \
  "refundAll(bytes32)" "$REFUND_REF" \
  --rpc-url "$ARC_MAINNET_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Capture:

- receipt;
- `Refunded` + `Closed` events;
- contract balance = 0;
- owner balance delta, accounting for gas.

## 9. Read canonical snapshot

Before refund:

```bash
arc-cast call "$T0_CONTRACT_ADDRESS" \
  "snapshot()(uint256,uint256,uint256,uint256,bool,uint256)" \
  --rpc-url "$ARC_MAINNET_RPC_URL"
```

After refund, it should report:

- balance = 0;
- funded = chosen funding amount;
- paid = chosen payout amount;
- refunded = funding - payout;
- closed = true;
- chainId = 5042.

## 10. Promotion evidence

T0 becomes **PROVEN** only when `docs/evidence/T0-MAINNET-CUSTODY.md` contains real, independently inspectable mainnet references for:

1. deployment;
2. funding;
3. payout;
4. refund;
5. exact demonstrated commit;
6. Arc Foundry version;
7. before/after balances;
8. explorer links.

Then update:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`;
- `docs/internal/REALITY-LEDGER.md`;
- `docs/internal/CANONICAL-STATE.yaml`;
- `docs/internal/HANDOVER.md`.

## Protected human action

A human must control the mainnet signing key and approve the real value movements. Source preparation is not authorization to spend.
