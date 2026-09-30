#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import process from "node:process";

export const GAS_EVIDENCE_SCHEMA =
  "ARC_ASSURANCE_GAS_UNIT_EVIDENCE_V1";

const REQUIRED_FUNCTIONS = Object.freeze([
  "createPolicy",
  "fund",
  "commitBatch",
  "lockProviderOutput",
  "revealCanary",
  "resolveBatch",
  "refundProtectedRemainder",
]);

const PASS_LIFECYCLE = Object.freeze([
  "createPolicy",
  "fund",
  "commitBatch",
  "lockProviderOutput",
  "revealCanary",
  "resolveBatch",
]);

const HERO_BATCH = Object.freeze([
  "commitBatch",
  "lockProviderOutput",
  "revealCanary",
  "resolveBatch",
]);

function parseInteger(value, label) {
  const compact = String(value).replaceAll(",", "").trim();
  if (!/^[0-9]+$/.test(compact)) {
    throw new Error("INVALID_" + label.toUpperCase());
  }
  return BigInt(compact);
}

function extractVaultSection(report) {
  const marker =
    "src/assurance/AssuranceVault.sol:AssuranceVault Contract";
  const start = report.indexOf(marker);
  if (start < 0) {
    throw new Error("ASSURANCE_VAULT_GAS_SECTION_NOT_FOUND");
  }

  const tail = report.slice(start);
  const nextContract = tail
    .slice(marker.length)
    .search(
      /(?:src/|test/)[^\n|]* Contract \|/
    );

  if (nextContract < 0) return tail;

  return tail.slice(0, marker.length + nextContract);
}

function parseDeployment(section) {
  const lines = section.split("\n");
  const headerIndex = lines.findIndex((line) =>
    line.includes("Deployment Cost") &&
    line.includes("Deployment Size")
  );

  if (headerIndex < 0) {
    throw new Error("DEPLOYMENT_HEADER_NOT_FOUND");
  }

  for (
    let index = headerIndex + 1;
    index < Math.min(lines.length, headerIndex + 8);
    index += 1
  ) {
    const cells = lines[index]
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (
      cells.length >= 2 &&
      /^[0-9,]+$/.test(cells[0]) &&
      /^[0-9,]+$/.test(cells[1])
    ) {
      return {
        reported_cost: parseInteger(
          cells[0],
          "deployment_cost"
        ),
        reported_size_bytes: parseInteger(
          cells[1],
          "deployment_size"
        ),
      };
    }
  }

  throw new Error("DEPLOYMENT_ROW_NOT_FOUND");
}

function parseFunctions(section) {
  const functions = {};
  for (const line of section.split("\n")) {
    if (!line.includes("|")) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 6) continue;

    const [name, min, avg, median, max, calls] = cells;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    if (
      ![min, avg, median, max, calls].every((value) =>
        /^[0-9,]+$/.test(value)
      )
    ) {
      continue;
    }

    functions[name] = {
      min: parseInteger(min, name + "_min"),
      avg: parseInteger(avg, name + "_avg"),
      median: parseInteger(
        median,
        name + "_median"
      ),
      max: parseInteger(max, name + "_max"),
      calls: parseInteger(calls, name + "_calls"),
    };
  }

  for (const name of REQUIRED_FUNCTIONS) {
    if (!functions[name]) {
      throw new Error(
        "REQUIRED_GAS_FUNCTION_MISSING:" + name
      );
    }
  }

  return functions;
}

function sumMax(functions, names) {
  return names.reduce(
    (sum, name) => sum + functions[name].max,
    0n
  );
}

export function parseAssuranceVaultGasReport(report, meta = {}) {
  const section = extractVaultSection(report);
  const deployment = parseDeployment(section);
  const functions = parseFunctions(section);

  const passExecution = sumMax(
    functions,
    PASS_LIFECYCLE
  );

  const oneBatch = sumMax(
    functions,
    HERO_BATCH
  );

  const fullHeroExecution =
    functions.createPolicy.max +
    functions.fund.max +
    3n * oneBatch +
    functions.refundProtectedRemainder.max;

  const deploymentUsable =
    deployment.reported_cost > 0n;

  return {
    schema: GAS_EVIDENCE_SCHEMA,
    evidence_class: "LOCAL_EXACT_HEAD_REHEARSAL",
    git_sha: meta.gitSha ?? null,
    workflow_run: meta.workflowRun ?? null,
    source: {
      command: "forge test --gas-report",
      contract:
        "src/assurance/AssuranceVault.sol:AssuranceVault",
    },
    deployment: {
      gas_units:
        deploymentUsable
          ? deployment.reported_cost.toString()
          : null,
      reported_gas_units:
        deployment.reported_cost.toString(),
      contract_size_bytes:
        deployment.reported_size_bytes.toString(),
      status: deploymentUsable
        ? "LOCAL_REHEARSAL_OBSERVED"
        : "BLOCKED_REPORTED_ZERO_NOT_ACCEPTED",
      blocker: deploymentUsable
        ? null
        : "Foundry gas report returned 0 deployment cost for AssuranceVault. Do not use zero as a deployment estimate; obtain an exact init-code eth_estimateGas / protected deployment rehearsal.",
    },
    function_max_gas: Object.fromEntries(
      Object.entries(functions).map(([name, row]) => [
        name,
        row.max.toString(),
      ])
    ),
    lifecycle: {
      pass_first_batch_max_sum_gas:
        passExecution.toString(),
      one_batch_max_sum_gas: oneBatch.toString(),
      full_hero_one_pass_two_fail_breaker_refund_max_sum_gas:
        fullHeroExecution.toString(),
      full_hero_sequence: [
        "createPolicy",
        "fund",
        "batch1: commit + lock + reveal + resolve(PASS)",
        "batch2: commit + lock + reveal + resolve(FAIL/WITHHOLD)",
        "batch3: commit + lock + reveal + resolve(FAIL/BREAKER)",
        "refundProtectedRemainder",
      ],
      aggregation_rule:
        "Sum of observed per-function MAX gas from the same exact-head Foundry gas report. Safety multiplier is applied later by the read-only gas-budget gate.",
    },
    truth_boundary: {
      arc_mainnet_receipt: false,
      arc_mainnet_fee_quote: false,
      deploy_gas_proven:
        deploymentUsable,
      execution_gas_rehearsal: true,
      generic_test_case_gas_used_as_tx_sum: false,
      note:
        "This evidence is exact-head local EVM gas rehearsal. It is suitable for conservative planning, not as an Arc mainnet receipt or permanent fee guarantee.",
    },
  };
}

async function main() {
  const input =
    process.argv[2] ?? "build/gas-report.txt";
  const output =
    process.argv[3] ?? "build/gas-unit-evidence.json";

  const report = await readFile(input, "utf8");
  const evidence = parseAssuranceVaultGasReport(
    report,
    {
      gitSha: process.env.GIT_COMMIT ?? null,
      workflowRun:
        process.env.GITHUB_RUN_ID ?? null,
    }
  );

  await mkdir("build", { recursive: true });
  await writeFile(
    output,
    JSON.stringify(evidence, null, 2) + "\n"
  );

  console.log(JSON.stringify(evidence, null, 2));

  if (!evidence.deployment.gas_units) {
    console.error(
      "NOTE: deployment gas remains BLOCKED; reported zero was rejected."
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    new URL("file://" + process.argv[1]).href
) {
  await main();
}
