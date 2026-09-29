import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const base = {
  schema: "ARC_ASSURANCE_PREMAINNET_V1",
  network: {
    chain_id: 5042,
    usdc_erc20_interface:
      "0x3600000000000000000000000000000000000000"
  },
  wallet_budget: {
    max_wallet_topup_wei: "5000000000000000000"
  },
  t0: {
    authority_address:
      "0x1111111111111111111111111111111111111111",
    funder_address:
      "0x1111111111111111111111111111111111111111",
    payout_recipient_address:
      "0x2222222222222222222222222222222222222222",
    payout_recipient_must_differ_from_funder: true,
    policy_id:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    fund_amount_wei: "10000000000000000",
    unit_payout_wei: "2000000000000000",
    expected_refund_wei: "8000000000000000",
    hard_contract_value_cap_wei: "50000000000000000"
  },
  integrated: {
    authority_address:
      "0x1111111111111111111111111111111111111111",
    funder_address:
      "0x1111111111111111111111111111111111111111",
    provider_address:
      "0x3333333333333333333333333333333333333333",
    payout_recipient_address:
      "0x2222222222222222222222222222222222222222",
    max_failures: 2,
    deployment_spend_cap_wei: "50000000000000000",
    policy_max_spend_cap_wei: "20000000000000000",
    initial_fund_amount_wei: "10000000000000000",
    unit_payout_wei: "2000000000000000",
    expected_remainder_after_one_pass_wei: "8000000000000000"
  },
  human_authorization: {}
};

async function run(config) {
  const dir = await mkdtemp(join(tmpdir(), "arc-premainnet-"));
  const file = join(dir, "config.json");
  await writeFile(file, JSON.stringify(config));
  try {
    const stdout = execFileSync(
      process.execPath,
      ["script/pre-mainnet-readiness.mjs", file],
      { encoding: "utf8" }
    );
    return { code: 0, result: JSON.parse(stdout) };
  } catch (error) {
    return {
      code: error.status,
      result: JSON.parse(error.stdout)
    };
  }
}

test("canonical bounded configuration validates without signing", async () => {
  const { code, result } = await run(base);
  assert.equal(code, 0);
  assert.equal(result.ok, true);
  assert.equal(
    result.verdict,
    "CONFIG_VALID_AWAITING_HUMAN_AND_GAS_GATES"
  );
  assert.equal(result.safety.transaction_broadcast, false);
  assert.equal(result.safety.funds_moved, false);
});

test("T0 value mismatch fails closed", async () => {
  const config = structuredClone(base);
  config.t0.expected_refund_wei = "7000000000000000";
  const { code, result } = await run(config);
  assert.equal(code, 1);
  assert.equal(result.ok, false);
  assert.match(
    result.errors.join("\n"),
    /T0 value conservation mismatch/
  );
});

test("wallet ceiling above 5 USDC fails closed", async () => {
  const config = structuredClone(base);
  config.wallet_budget.max_wallet_topup_wei =
    "5000000000000000001";
  const { code, result } = await run(config);
  assert.equal(code, 1);
  assert.match(
    result.errors.join("\n"),
    /wallet top-up exceeds 5 USDC ceiling/
  );
});

test("provider signer cannot equal funder", async () => {
  const config = structuredClone(base);
  config.integrated.provider_address =
    config.integrated.funder_address;
  const { code, result } = await run(config);
  assert.equal(code, 1);
  assert.match(
    result.errors.join("\n"),
    /provider signer must differ from funder/
  );
});
