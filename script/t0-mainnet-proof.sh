#!/usr/bin/env bash
# T0 Arc mainnet proof driver — SAFE BY DEFAULT.
#
# Protected flow is intentionally two-stage:
#   1. deploy --confirm   (deploy + register)
#   2. execute --confirm  (fund + payout + refund + complete)
#
# The human copies the deployed address into T0_CONTRACT_ADDRESS between stages.
# This explicit checkpoint avoids "deploy succeeded but later parsing failed"
# ambiguity and binds value movement to the intended contract.
set -euo pipefail

EXPECTED_CHAIN_ID=5042
EXPECTED_USDC="0x3600000000000000000000000000000000000000"
HARD_SPEND_CAP_WEI="50000000000000000" # 0.05 native USDC
RPC="${ARC_MAINNET_RPC_URL:-https://rpc.mainnet.arc.io}"

die() { echo "ABORT: $*" >&2; exit 1; }
ok()  { echo "  ok  - $*"; }

require_env() {
  local missing=()
  for k in "$@"; do
    [ -n "${!k:-}" ] || missing+=("$k")
  done
  [ ${#missing[@]} -eq 0 ] || die "missing required environment variable(s): ${missing[*]}"
}

is_uint() { [[ "$1" =~ ^[0-9]+$ ]]; }

deployer_address() {
  arc-cast wallet address --private-key "$PRIVATE_KEY"
}

preflight() {
  echo "== T0 preflight (read-only; no transaction broadcast) =="

  local chain_id
  chain_id=$(arc-cast chain-id --rpc-url "$RPC" | awk '{print $1}')
  [ "$chain_id" = "$EXPECTED_CHAIN_ID" ] \
    || die "chain id mismatch: expected $EXPECTED_CHAIN_ID, got $chain_id"
  ok "chain id is $chain_id"

  local code
  code=$(arc-cast code "$EXPECTED_USDC" --rpc-url "$RPC")
  [ "$code" != "0x" ] && [ -n "$code" ] \
    || die "no contract code at USDC interface $EXPECTED_USDC"
  ok "USDC interface has code at $EXPECTED_USDC"

  local decimals
  decimals=$(arc-cast call "$EXPECTED_USDC" "decimals()(uint8)" --rpc-url "$RPC" | awk '{print $1}')
  [ "$decimals" = "6" ] \
    || die "unexpected USDC ERC-20 decimals: $decimals (expected 6)"
  ok "USDC ERC-20 decimals is 6 (native representation is 18 — never mix)"

  require_env PRIVATE_KEY T0_AUTHORITY_ADDRESS T0_POLICY_ID T0_FUNDER_ADDRESS \
             T0_PAYOUT_RECIPIENT_ADDRESS T0_FUND_AMOUNT_WEI \
             T0_UNIT_PAYOUT_WEI T0_EXPIRY

  local deployer
  deployer=$(deployer_address)
  ok "deployer: $deployer"

  [ "${T0_AUTHORITY_ADDRESS,,}" = "${deployer,,}" ] \
    || die "T0_AUTHORITY_ADDRESS must equal the PRIVATE_KEY address"
  [ "${T0_FUNDER_ADDRESS,,}" = "${deployer,,}" ] \
    || die "T0_FUNDER_ADDRESS must equal the PRIVATE_KEY address for the protected T0 run"
  ok "authority and T0 funder match the protected signer"

  is_uint "$T0_FUND_AMOUNT_WEI" || die "T0_FUND_AMOUNT_WEI must be an integer"
  is_uint "$T0_UNIT_PAYOUT_WEI" || die "T0_UNIT_PAYOUT_WEI must be an integer"
  is_uint "$T0_EXPIRY" || die "T0_EXPIRY must be an integer unix timestamp"

  [ "$T0_FUND_AMOUNT_WEI" -gt 0 ] || die "T0_FUND_AMOUNT_WEI must be > 0"
  [ "$T0_UNIT_PAYOUT_WEI" -gt 0 ] || die "T0_UNIT_PAYOUT_WEI must be > 0"
  [ "$T0_UNIT_PAYOUT_WEI" -le "$T0_FUND_AMOUNT_WEI" ] \
    || die "T0_UNIT_PAYOUT_WEI must be <= T0_FUND_AMOUNT_WEI"
  [ "$T0_FUND_AMOUNT_WEI" -le "$HARD_SPEND_CAP_WEI" ] \
    || die "T0_FUND_AMOUNT_WEI exceeds hard cap $HARD_SPEND_CAP_WEI"
  [ "$T0_EXPIRY" -gt 0 ] || die "T0_EXPIRY must be a future non-zero timestamp"

  local balance
  balance=$(arc-cast balance "$deployer" --rpc-url "$RPC" | awk '{print $1}')
  is_uint "$balance" || die "could not parse deployer native-USDC balance"
  [ "$balance" -gt "$T0_FUND_AMOUNT_WEI" ] \
    || die "deployer balance must exceed the funding amount so gas remains available"

  ok "amounts are within the 0.05 native-USDC T0 hard cap"
  ok "deployer has more than the configured funding amount"

  echo "== preflight complete: nothing was signed or broadcast =="
}

confirm_mainnet() {
  [ "${T0_CONFIRM_MAINNET:-0}" = "1" ] \
    || die "set T0_CONFIRM_MAINNET=1 to authorize this protected mainnet action"
  [ "${1:-}" = "--confirm" ] \
    || die "pass --confirm explicitly"
}

deploy() {
  preflight
  confirm_mainnet "${1:-}"

  echo "== deploy + register (LIVE_MAINNET) =="
  # Broadcast exactly once. Verification is deliberately not chained with an
  # '|| retry' because a verifier failure after a successful broadcast must
  # never cause a second deployment.
  arc-forge script script/DeployT0.s.sol:DeployT0 \
    --rpc-url "$RPC" --broadcast --slow

  echo
  echo "Protected checkpoint:"
  echo "  Copy the deployed PolicyCustody address from the output above into"
  echo "  T0_CONTRACT_ADDRESS, inspect it on the Arc explorer, then run:"
  echo "  ./script/t0-mainnet-proof.sh execute --confirm"
}

require_deployed_contract() {
  require_env T0_CONTRACT_ADDRESS

  local code
  code=$(arc-cast code "$T0_CONTRACT_ADDRESS" --rpc-url "$RPC")
  [ -n "$code" ] && [ "$code" != "0x" ] \
    || die "no code at T0_CONTRACT_ADDRESS"

  local chain_id expected_usdc authority exists
  chain_id=$(arc-cast call "$T0_CONTRACT_ADDRESS" "expectedChainId()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
  [ "$chain_id" = "$EXPECTED_CHAIN_ID" ] \
    || die "contract expects chain $chain_id, not $EXPECTED_CHAIN_ID"

  expected_usdc=$(arc-cast call "$T0_CONTRACT_ADDRESS" "usdcErc20Interface()(address)" --rpc-url "$RPC" | awk '{print $1}')
  [ "${expected_usdc,,}" = "${EXPECTED_USDC,,}" ] \
    || die "contract USDC interface mismatch: $expected_usdc"

  authority=$(arc-cast call "$T0_CONTRACT_ADDRESS" "authority()(address)" --rpc-url "$RPC" | awk '{print $1}')
  [ "${authority,,}" = "${T0_AUTHORITY_ADDRESS,,}" ] \
    || die "contract authority mismatch: $authority"

  exists=$(arc-cast call "$T0_CONTRACT_ADDRESS" "policyExists(bytes32)(bool)" "$T0_POLICY_ID" --rpc-url "$RPC" | awk '{print $1}')
  [ "$exists" = "true" ] || die "configured policy does not exist on the deployed contract"

  ok "deployed contract, chain, USDC, authority and policy binding verified"
}

expect_state() {
  local expected="$1" label="$2" actual
  actual=$(arc-cast call "$T0_CONTRACT_ADDRESS" "stateOf(bytes32)(uint8)" "$T0_POLICY_ID" --rpc-url "$RPC" | awk '{print $1}')
  [ "$actual" = "$expected" ] || die "$label: expected state $expected, got $actual"
  ok "$label -> state $actual"
}

execute() {
  preflight
  confirm_mainnet "${1:-}"
  require_deployed_contract
  expect_state 0 "before funding"

  echo "== fund -> payout -> refund -> complete (LIVE_MAINNET) =="
  echo "  contract: $T0_CONTRACT_ADDRESS"
  echo "  policy  : $T0_POLICY_ID"
  echo "  fund    : $T0_FUND_AMOUNT_WEI"
  echo "  payout  : $T0_UNIT_PAYOUT_WEI"

  arc-cast send "$T0_CONTRACT_ADDRESS" "fund(bytes32)" "$T0_POLICY_ID" \
    --value "$T0_FUND_AMOUNT_WEI" --rpc-url "$RPC" --private-key "$PRIVATE_KEY"
  expect_state 1 "after funding"

  arc-cast send "$T0_CONTRACT_ADDRESS" "releaseConfiguredPayout(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"
  expect_state 2 "after payout"

  arc-cast send "$T0_CONTRACT_ADDRESS" "refundRemaining(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"
  expect_state 3 "after refund"

  arc-cast send "$T0_CONTRACT_ADDRESS" "complete(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"
  expect_state 4 "after completion"

  echo "-- final snapshot --"
  arc-cast call "$T0_CONTRACT_ADDRESS" \
    "snapshot(bytes32)((bytes32,address,address,uint8,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256,uint256,uint256))" \
    "$T0_POLICY_ID" --rpc-url "$RPC"
}

case "${1:-preflight}" in
  preflight) preflight ;;
  deploy) deploy "${2:-}" ;;
  execute) execute "${2:-}" ;;
  *) die "unknown command: $1 (use preflight | deploy | execute)" ;;
esac
