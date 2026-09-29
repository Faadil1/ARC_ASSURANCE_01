#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const [, , jsPath, solidityPath] = process.argv;

if (!jsPath || !solidityPath) {
  console.error(
    "Usage: node script/compare-golden-vectors.mjs <js.json> <solidity.json>"
  );
  process.exit(1);
}

const js = JSON.parse(await readFile(jsPath, "utf8"));
const sol = JSON.parse(await readFile(solidityPath, "utf8"));

const left = js.public_crypto_vector;
const fields = [
  "provider",
  "input_hash",
  "output_hash",
  "scorer_id_hash",
  "commitment",
  "canary_key",
  "eip712_digest",
];

const mismatches = [];

for (const field of fields) {
  const a = String(left[field] ?? "").toLowerCase();
  const b = String(sol[field] ?? "").toLowerCase();
  if (!a || !b || a !== b) {
    mismatches.push({
      field,
      javascript: left[field] ?? null,
      solidity: sol[field] ?? null,
    });
  }
}

if (mismatches.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        verdict: "GOLDEN_VECTOR_MISMATCH",
        mismatches,
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      verdict: "CROSS_LANGUAGE_GOLDEN_VECTOR_MATCH",
      compared_fields: fields,
      evidence_class: "LOCAL",
      live_claim: false,
    },
    null,
    2
  )
);
