#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { getAddress } from "viem";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node script/pre-mainnet-readiness.mjs <parameters.json>");
  process.exit(2);
}

const config = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const warnings = [];

function eq(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function requireValue(v, label) {
  if (v === null || v === undefined || v === "") {
    errors.push(label + " is missing");
    return false;
  }
  return true;
}

function address(v, label) {
  if (!requireValue(v, label)) return null;
  try {
    return getAddress(v);
  } catch {
    errors.push(label + " is not a valid EVM address");
    return null;
  }
}

function amount(v, label) {
  if (!requireValue(v, label)) return null;
  try {
    const n = BigInt(v);
    if (n <= 0n) errors.push(label + " must be > 0");
    return n;
  } catch {
    errors.push(label + " must be an integer string");
    return null;
  }
}

if (config.schema !== "ARC_ASSURANCE_PREMAINNET_V1") {
  errors.push("unexpected schema");
}
if (Number(config.network?.chain_id) !== 5042) {
  errors.push("chain_id must be 5042");
}
if (
  !eq(
    config.network?.usdc_erc20_interface,
    "0x3600000000000000000000000000000000000000"
  )
) {
  errors.push("Arc USDC interface mismatch");
}

const maxWallet = amount(
  config.wallet_budget?.max_wallet_topup_wei,
  "wallet_budget.max_wallet_topup_wei"
);
if (maxWallet !== null && maxWallet > 5_000_000_000_000_000_000n) {
  errors.push("wallet top-up exceeds 5 USDC ceiling");
}

const t0 = config.t0 ?? {};
const funder = address(t0.funder_address, "t0.funder_address");
const authority = address(t0.authority_address, "t0.authority_address");
const recipient = address(
  t0.payout_recipient_address,
  "t0.payout_recipient_address"
);
requireValue(t0.policy_id, "t0.policy_id");

if (funder && authority && !eq(funder, authority)) {
  errors.push("protected T0 requires authority == funder");
}
if (
  funder &&
  recipient &&
  t0.payout_recipient_must_differ_from_funder &&
  eq(funder, recipient)
) {
  errors.push("T0 payout recipient must differ from funder for proof clarity");
}

const t0Fund = amount(t0.fund_amount_wei, "t0.fund_amount_wei");
const t0Payout = amount(t0.unit_payout_wei, "t0.unit_payout_wei");
const t0Refund = amount(t0.expected_refund_wei, "t0.expected_refund_wei");
const t0Cap = amount(
  t0.hard_contract_value_cap_wei,
  "t0.hard_contract_value_cap_wei"
);

if (t0Fund !== null && t0Cap !== null && t0Fund > t0Cap) {
  errors.push("T0 fund amount exceeds hard contract cap");
}
if (t0Payout !== null && t0Fund !== null && t0Payout > t0Fund) {
  errors.push("T0 payout exceeds fund amount");
}
if (
  t0Fund !== null &&
  t0Payout !== null &&
  t0Refund !== null &&
  t0Fund !== t0Payout + t0Refund
) {
  errors.push("T0 value conservation mismatch: fund != payout + refund");
}

const integrated = config.integrated ?? {};
const iAuthority = address(
  integrated.authority_address,
  "integrated.authority_address"
);
const iFunder = address(
  integrated.funder_address,
  "integrated.funder_address"
);
const iProvider = address(
  integrated.provider_address,
  "integrated.provider_address"
);
const iRecipient = address(
  integrated.payout_recipient_address,
  "integrated.payout_recipient_address"
);

if (iAuthority && iFunder && !eq(iAuthority, iFunder)) {
  warnings.push(
    "initial bounded live proof is simpler with authority == funder; separation is allowed but requires an explicit signer plan"
  );
}
if (iProvider && iFunder && eq(iProvider, iFunder)) {
  errors.push("integrated provider signer must differ from funder");
}
if (iProvider && iRecipient && eq(iProvider, iRecipient)) {
  warnings.push("provider signer and payout recipient are the same address");
}

const deploymentCap = amount(
  integrated.deployment_spend_cap_wei,
  "integrated.deployment_spend_cap_wei"
);
const policyCap = amount(
  integrated.policy_max_spend_cap_wei,
  "integrated.policy_max_spend_cap_wei"
);
const initialFund = amount(
  integrated.initial_fund_amount_wei,
  "integrated.initial_fund_amount_wei"
);
const unitPayout = amount(
  integrated.unit_payout_wei,
  "integrated.unit_payout_wei"
);
const expectedRemainder = amount(
  integrated.expected_remainder_after_one_pass_wei,
  "integrated.expected_remainder_after_one_pass_wei"
);

if (deploymentCap !== null && policyCap !== null && policyCap > deploymentCap) {
  errors.push("integrated policy cap exceeds deployment cap");
}
if (initialFund !== null && policyCap !== null && initialFund > policyCap) {
  errors.push("integrated initial fund exceeds policy cap");
}
if (unitPayout !== null && initialFund !== null && unitPayout > initialFund) {
  errors.push("integrated payout exceeds initial fund");
}
if (
  initialFund !== null &&
  unitPayout !== null &&
  expectedRemainder !== null &&
  initialFund !== unitPayout + expectedRemainder
) {
  errors.push(
    "integrated value conservation mismatch after one PASS"
  );
}
if (Number(integrated.max_failures) !== 2) {
  errors.push("integrated max_failures must remain 2 for canonical hero run");
}

const auth = config.human_authorization ?? {};
const humanFlags = [
  "wallet_funded",
  "addresses_reviewed",
  "gas_estimate_reviewed",
  "t0_deploy_authorized",
  "t0_execute_authorized",
  "integrated_deploy_authorized",
];
for (const flag of humanFlags) {
  if (auth[flag] === true) {
    warnings.push(
      `human_authorization.${flag}=true is declarative only; this validator never performs the action`
    );
  }
}

const readyForAddressReview =
  errors.length === 0 &&
  Boolean(funder && authority && recipient) &&
  Boolean(iAuthority && iFunder && iProvider && iRecipient);

const result = {
  ok: errors.length === 0,
  verdict:
    errors.length > 0
      ? "BLOCKED_INVALID_PREMAINNET_CONFIG"
      : readyForAddressReview
        ? "CONFIG_VALID_AWAITING_HUMAN_AND_GAS_GATES"
        : "BLOCKED_MISSING_REAL_ADDRESSES",
  errors,
  warnings,
  limits: {
    wallet_topup_ceiling_wei: maxWallet?.toString() ?? null,
    t0_contract_fund_wei: t0Fund?.toString() ?? null,
    t0_unit_payout_wei: t0Payout?.toString() ?? null,
    integrated_initial_fund_wei: initialFund?.toString() ?? null,
    integrated_unit_payout_wei: unitPayout?.toString() ?? null
  },
  safety: {
    private_key_consumed: false,
    transaction_signed: false,
    transaction_broadcast: false,
    funds_moved: false
  }
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length > 0 ? 1 : 0;
