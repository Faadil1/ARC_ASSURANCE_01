#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  verifyEvidencePacketV1,
} from "./verify-evidence-v1.mjs";

function usage() {
  return [
    "Usage:",
    "  node src/verifier/cli.mjs verify <evidence.json> [--require-financial]",
    "",
    "Exit codes:",
    "  0 = requested verification level satisfied",
    "  1 = invalid evidence / cryptographic or ordering failure",
    "  2 = core proof valid but required financial causality not proven",
  ].join("\n");
}

async function main() {
  const [, , command, file, ...flags] = process.argv;

  if (command !== "verify" || !file) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const requireFinancial =
    flags.includes("--require-financial");

  let packet;
  try {
    packet = JSON.parse(
      await readFile(file, "utf8")
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          verdict: "INVALID_EVIDENCE",
          error:
            "EVIDENCE_FILE_READ_FAILED:" +
            (error?.message ?? String(error)),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const result = await verifyEvidencePacketV1(
    packet,
    { requireFinancial }
  );

  console.log(JSON.stringify(result, null, 2));

  if (result.ok) {
    process.exitCode = 0;
    return;
  }

  if (
    result.verdict ===
    "CORE_PROOF_VALID_FINANCIAL_CAUSALITY_NOT_PROVEN"
  ) {
    process.exitCode = 2;
    return;
  }

  process.exitCode = 1;
}

await main();
