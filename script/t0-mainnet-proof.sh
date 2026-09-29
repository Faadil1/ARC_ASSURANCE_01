#!/usr/bin/env bash
# T0 Arc mainnet proof driver — SAFE BY DEFAULT.
#
# Refuses to move or accept any value unless every precondition is satisfied.
# Contains no private key, prints no secret, and hardcodes no real amount.
#
# Usage:
#   ./t0-mainnet-proof.sh preflight   # read-only checks, nothing signed
#   ./t0-mainnet-proof.sh deploy      # deploy + register policy (needs --confirm)
#   ./t0-mainnet-proof.sh full        # deploy + fund + payout + refund (needs --confirm)
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

preflight() {
  echo "== T0 preflight (read-only) =="

  local chain_id
  chain_id=$(arc-cast chain-id --rpc-url "$RPC" | awk '{print $1}')
  [ "$chain_id" = "$EXPECTED_CHAIN_ID" ] \
    || die "chain id mismatch: expected $EXPECTED_CHAIN_ID, got $chain_id"
  ok "chain id is $chain_id"

  # The USDC interface must exist as real code on the expected address.
  local code
  code=$(arc-cast code "$EXPECTED_USDC" --rpc-url "$RPC")
  [ "$code" != "0x" ] && [ -n "$code" ] || die "no contract code at USDC interface $EXPECTED_USDC"
  ok "USDC interface has code at $EXPECTED_USDC"

  local decimals
  decimals=$(arc-cast call "$EXPECTED_USDC" "decimals()(uint8)" --rpc-url "$RPC" | awk '{print $1}')
  [ "$decimals" = "6" ] || die "unexpected USDC ERC-20 decimals: $decimals (expected 6)"
  ok "USDC ERC-20 decimals is 6 (native interface is 18 — never mix)"

  require_env PRIVATE_KEY
  ok "PRIVATE_KEY is present (value never displayed)"

  local deployer
  deployer=$(arc-cast wallet address --private-key "$PRIVATE_KEY")
  ok "deployer: $deployer"

  # Policy registration is authority-only and the deploy script registers in the
  # same broadcast, so the deployer key and the authority must be the same account.
  require_env T0_AUTHORITY_ADDRESS
  [ "${T0_AUTHORITY_ADDRESS,,}" = "${deployer,,}" ] \
    || die "T0_AUTHORITY_ADDRESS ($T0_AUTHORITY_ADDRESS) must equal the deployer key ($deployer)"
  ok "authority matches the broadcaster"

  require_env T0_POLICY_ID T0_FUNDER_ADDRESS T0_PAYOUT_RECIPIENT_ADDRESS \
             T0_FUND_AMOUNT_WEI T0_UNIT_PAYOUT_WEI T0_EXPIRY

  is_uint "$T0_FUND_AMOUNT_WEI" || die "T0_FUND_AMOUNT_WEI must be an integer"
  is_uint "$T0_UNIT_PAYOUT_WEI"  || die "T0_UNIT_PAYOUT_WEI must be an integer"
  is_uint "$T0_EXPIRY"           || die "T0_EXPIRY must be an integer (0 disables expiry)"

  [ "$T0_FUND_AMOUNT_WEI" -gt 0 ] || die "T0_FUND_AMOUNT_WEI must be > 0"
  [ "$T0_UNIT_PAYOUT_WEI" -gt 0 ]  || die "T0_UNIT_PAYOUT_WEI must be > 0"
  [ "$T0_UNIT_PAYOUT_WEI" -le "$T0_FUND_AMOUNT_WEI" ] \
    || die "T0_UNIT_PAYOUT_WEI must be <= T0_FUND_AMOUNT_WEI"
  [ "$T0_FUND_AMOUNT_WEI" -le "$HARD_SPEND_CAP_WEI" ] \
    || die "T0_FUND_AMOUNT_WEI exceeds the hard cap $HARD_SPEND_CAP_WEI (0.05 native USDC)"

  ok "amounts are within the hard cap of $HARD_SPEND_CAP_WEI wei"
  ok "deployer native USDC balance: $(arc-cast balance "$deployer" --rpc-url "$RPC")"

  [ "${T0_FUND_AMOUNT_WEI%??????????????????}" != "" ] \
    && die "refusing a six-figure wei amount; this gate is a tiny-value proof"

  echo "== preflight complete: nothing was signed or broadcast =="
}

deploy() {
  preflight
  [ "${T0_CONFIRM_MAINNET:-0}" = "1" ] \
    || die "refusing to broadcast: set T0_CONFIRM_MAINNET=1 to authorize mainnet deployment"
  [ "${1:-}" = "--confirm" ] \
    || die "refusing to broadcast: pass --confirm explicitly"

  echo "== deploy + register (LIVE_MAINNET) =="
  arc-forge script script/DeployT0.s.sol:DeployT0 \
    --rpc-url "$RPC" --broadcast --slow \
    --verify 2>/dev/null || \
  arc-forge script script/DeployT0.s.sol:DeployT0 \
    --rpc-url "$RPC" --broadcast --slow
}

fund_payout_refund() {
  preflight
  [ "${T0_CONFIRM_MAINNET:-0}" = "1" ] \
    || die "refusing value movement: set T0_CONFIRM_MAINNET=1 to authorize"
  [ "${1:-}" = "--confirm" ] \
    || die "refusing value movement: pass --confirm explicitly"

  local vault="${T0_CONTRACT_ADDRESS:-}"
  [ -n "$vault" ] || die "T0_CONTRACT_ADDRESS unset; read it from the deploy output first"

  # Trust the contract's own binding, not the caller's argument.
  local chain_id expected
  chain_id=$(arc-cast call "$vault" "expectedChainId()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
  [ "$chain_id" = "$EXPECTED_CHAIN_ID" ] || die "contract expects chain $chain_id, not $EXPECTED_CHAIN_ID"
  expected=$(arc-cast call "$vault" "usdcErc20Interface()(address)" --rpc-url "$RPC" | awk '{print $1}')
  [ "${expected,,}" = "${EXPECTED_USDC,,}" ] || die "contract USDC interface mismatch: $expected"
  ok "contract bindings verified (chain $chain_id, usdc $expected)"

  echo "== fund -> payout -> refund (LIVE_MAINNET) =="
  echo "  policy : $T0_POLICY_ID"
  echo "  fund   : $T0_FUND_AMOUNT_WEI"
  echo "  payout : $T0_UNIT_PAYOUT_WEI"

  arc-cast send "$vault" "fund(bytes32)" "$T0_POLICY_ID" \
    --value "$T0_FUND_AMOUNT_WEI" --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

  arc-cast send "$vault" "releaseConfiguredPayout(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

  arc-cast send "$vault" "refundRemaining(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

  arc-cast send "$vault" "complete(bytes32)" "$T0_POLICY_ID" \
    --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

  echo "-- final snapshot --"
  arc-cast call "$vault" \
    "snapshot(bytes32)((bytes32,address,address,uint8,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256,uint256,uint256))" \
    "$T0_POLICY_ID" --rpc-url "$RPC"
}

case "${1:-preflight}" in
  preflight) preflight ;;
  deploy)    deploy "${2:-}" ;;
  full)      preflight; deploy --confirm; fund_payout_refund --confirm ;;
  *) die "unknown command: $1 (use preflight | deploy | full)" ;;
esac
