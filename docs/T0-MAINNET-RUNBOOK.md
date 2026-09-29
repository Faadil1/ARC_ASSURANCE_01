# T0 — Arc Mainnet Native USDC Custody Runbook

**Gate:** G1 / T0_MAINNET_CUSTODY
**Status:** CODE_READY_CANDIDATE — locally verified, **not** live-proven until real mainnet receipts are captured.

## Purpose

Prove only this primitive:

```
real Arc mainnet native USDC
-> PolicyCustody custody
-> configured immutable-recipient payout
-> remaining-funds refund
```

T0 does **not** prove the hidden-canary product loop, deterministic scoring, EIP-712 binding, or the circuit breaker.

## Contract under test

`src/PolicyCustody.sol` supersedes the earlier `T0NativeCustody.sol`, which has been removed.

Why it was removed:

| Old spike | Problem | `PolicyCustody` |
|---|---|---|
| `payout(address recipient, ...)` | caller-supplied recipient, so value could be redirected | `payoutRecipient` immutable at policy creation |
| `refundAll()` sends `address(this).balance` | one policy could drain another's funds | bounded by the policy's own liability |
| refund reachable before payout | funder could skip the payout and reclaim everything | `refundRemaining` requires `State.PaidOut` |
| no expiry, no caps | unbounded exposure | `expiry`, per-policy `maxSpendCap`, `deploymentSpendCap` |

## Lifecycle

```
Created -> Funded -> PaidOut -> Refunded -> Completed
```

## Asset model

Arc's native asset is USDC with **18 decimals**, so custody uses `msg.value` and the native balance. The same balance is reachable as a 6-decimal ERC-20 at `0x3600000000000000000000000000000000000000`; that address is recorded on-chain as `usdcErc20Interface()` for evidence and is never called. The two representations differ by `1e12`.

Arc mainnet chain id: **5042**.

## Truth boundary

- Contract source: **PRODUCED**
- Local Arc Foundry tests: **LOCAL VERIFIED** (35/35 on 2026-09-29)
- Mainnet deployment: **NOT_IMPLEMENTED**
- Real custody / payout / refund: **NOT_IMPLEMENTED**
- G1: **ACTIVE, NOT PROVEN**

Do not mark T0 PROVEN from source or from a green test run.

## 1. Install tooling and dependencies

```bash
arc-forge --version   # record this in the evidence file
arc-cast  --version
forge install foundry-rs/forge-std@v1.9.6
```

`lib/` is gitignored, so forge-std is not vendored. A fresh clone cannot compile until it is installed. Arc Foundry is not present in the standard container, so there is no generic-CI proof of compilation.

## 2. Configure environment

```bash
cp .env.example .env
set -a && source .env && set +a
```

Never commit `.env` or a private key.

## 3. Run tests before mainnet

```bash
arc-forge test -vv
```

Record the exact Arc Foundry version, solc version, and commit SHA in the evidence file.

## 4. Read-only preflight

Safe, signs nothing, broadcasts nothing:

```bash
./script/t0-mainnet-proof.sh preflight
```

This verifies chain id, USDC interface code, USDC decimals, that `T0_AUTHORITY_ADDRESS` matches the deployer key, and that the configured amounts are internally consistent and within the hard cap. It aborts on the first failure.

## 5. Choose bounded amounts

Use deliberately small values. The driver enforces a hard ceiling of `0.05` native USDC (`50000000000000000` wei).

`0.01` native USDC is `10000000000000000` wei. Verify the conversion and the wallet balance before sending; do not copy an amount blindly.

## 6. Deploy and register the policy

```bash
./script/t0-mainnet-proof.sh deploy --confirm
```

This requires `T0_CONFIRM_MAINNET=1` **and** the literal `--confirm` flag. It deploys and registers the policy in one broadcast, because policy registration is authority-only and must be the same account.

`script/DeployT0.s.sol` is mainnet-only by design — there is no local or fork branch, so a mistaken RPC cannot produce a record that could be mistaken for live evidence.

Capture: deploy tx hash, contract address, deployed bytecode, `authority()`, `expectedChainId()`.

## 7. Fund, pay out, refund, complete

```bash
export T0_CONTRACT_ADDRESS="0x..."
./script/t0-mainnet-proof.sh full --confirm
```

This re-verifies the contract's own `expectedChainId()` and `usdcErc20Interface()` bindings before moving value, then runs fund -> payout -> refund -> complete and prints the final snapshot.

## 8. Manual equivalent

If running steps by hand, use the contract's own ABI. Do not invent call signatures.

```bash
arc-cast send "$T0_CONTRACT_ADDRESS" "fund(bytes32)" "$T0_POLICY_ID" \
  --value "$T0_FUND_AMOUNT_WEI" --rpc-url "$ARC_MAINNET_RPC_URL" --private-key "$PRIVATE_KEY"

arc-cast send "$T0_CONTRACT_ADDRESS" "releaseConfiguredPayout(bytes32)" "$T0_POLICY_ID" \
  --rpc-url "$ARC_MAINNET_RPC_URL" --private-key "$PRIVATE_KEY"

arc-cast send "$T0_CONTRACT_ADDRESS" "refundRemaining(bytes32)" "$T0_POLICY_ID" \
  --rpc-url "$ARC_MAINNET_RPC_URL" --private-key "$PRIVATE_KEY"

arc-cast send "$T0_CONTRACT_ADDRESS" "complete(bytes32)" "$T0_POLICY_ID" \
  --rpc-url "$ARC_MAINNET_RPC_URL" --private-key "$PRIVATE_KEY"
```

## 9. Canonical snapshot

```bash
arc-cast call "$T0_CONTRACT_ADDRESS" \
  "snapshot(bytes32)((bytes32,address,address,uint8,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256,uint256,uint256))" \
  "$T0_POLICY_ID" --rpc-url "$ARC_MAINNET_RPC_URL"
```

After a clean run:

- `state` = `4` (Completed)
- `totalFunded` = chosen funding amount
- `totalPaidOut` = chosen payout amount
- `totalRefunded` = funding - payout
- `remaining` = 0
- `custodyBalance` = 0
- `poolLiability` = 0
- `unattributedValue` = 0
- `chainId` = 5042

## 10. Promotion evidence

T0 becomes **PROVEN** only when `docs/evidence/T0-MAINNET-CUSTODY.md` contains real, independently inspectable mainnet references for:

1. deployment;
2. funding;
3. payout;
4. refund;
5. the exact demonstrated commit;
6. Arc Foundry version;
7. before/after balances;
8. explorer links.

Then update:

- `docs/internal/CONDITIONAL-GATEWAY-REGISTRY.yaml`
- `docs/internal/REALITY-LEDGER.md`
- `docs/internal/CANONICAL-STATE.yaml`
- `docs/internal/HANDOVER.md`

## Protected human action

A human must control the mainnet signing key, fund the wallet, and approve the real value movements. Source preparation and a prepared script are not authorization to spend.
