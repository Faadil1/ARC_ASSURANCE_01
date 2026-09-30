import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseAssuranceVaultGasReport,
} from "../../script/parse-gas-unit-evidence.mjs";

const fixtureUrl = new URL(
  "../../fixtures/gas/assurance-vault-gas-report.txt",
  import.meta.url
);

test("extracts AssuranceVault per-function max gas", async () => {
  const report = await readFile(fixtureUrl, "utf8");
  const evidence = parseAssuranceVaultGasReport(
    report,
    {
      gitSha: "abc123",
      workflowRun: "42",
    }
  );

  assert.equal(evidence.git_sha, "abc123");
  assert.equal(evidence.workflow_run, "42");
  assert.equal(
    evidence.function_max_gas.createPolicy,
    "268246"
  );
  assert.equal(
    evidence.function_max_gas.lockProviderOutput,
    "216639"
  );
  assert.equal(
    evidence.function_max_gas.resolveBatch,
    "179956"
  );
});

test("derives conservative PASS and full hero sums", async () => {
  const report = await readFile(fixtureUrl, "utf8");
  const evidence =
    parseAssuranceVaultGasReport(report);

  assert.equal(
    evidence.lifecycle.pass_first_batch_max_sum_gas,
    "1035420"
  );
  assert.equal(
    evidence.lifecycle.one_batch_max_sum_gas,
    "653529"
  );
  assert.equal(
    evidence.lifecycle
      .full_hero_one_pass_two_fail_breaker_refund_max_sum_gas,
    "2426871"
  );
});

test("rejects zero deployment cost as usable deploy gas", async () => {
  const report = await readFile(fixtureUrl, "utf8");
  const evidence =
    parseAssuranceVaultGasReport(report);

  assert.equal(
    evidence.deployment.reported_gas_units,
    "0"
  );
  assert.equal(evidence.deployment.gas_units, null);
  assert.equal(
    evidence.deployment.status,
    "BLOCKED_REPORTED_ZERO_NOT_ACCEPTED"
  );
  assert.equal(
    evidence.truth_boundary.deploy_gas_proven,
    false
  );
});

test("fails closed if a required lifecycle function is missing", async () => {
  const report = (
    await readFile(fixtureUrl, "utf8")
  ).replace(
    "| resolveBatch                                             |           35009 | 118239 |  97065 | 179956 |      10 |",
    ""
  );

  assert.throws(
    () => parseAssuranceVaultGasReport(report),
    /REQUIRED_GAS_FUNCTION_MISSING:resolveBatch/
  );
});
