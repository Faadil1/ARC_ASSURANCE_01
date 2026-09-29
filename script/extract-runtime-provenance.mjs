#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const artifactPath = process.argv[2];
if (!artifactPath) {
  console.error(
    "Usage: node script/extract-runtime-provenance.mjs <AssuranceVault.json>"
  );
  process.exit(1);
}

const artifact = JSON.parse(
  await readFile(artifactPath, "utf8")
);

const runtime =
  artifact.deployedBytecode?.object ?? null;

if (
  typeof runtime !== "string" ||
  !/^0x[0-9a-fA-F]+$/.test(runtime)
) {
  throw new Error("INVALID_DEPLOYED_BYTECODE");
}

const references =
  artifact.deployedBytecode?.immutableReferences ??
  artifact.immutableReferences ??
  {};

const linkReferences =
  artifact.deployedBytecode?.linkReferences ?? {};

if (
  Object.keys(linkReferences).length > 0
) {
  throw new Error(
    "UNSUPPORTED_RUNTIME_LINK_REFERENCES"
  );
}

const ranges = [];

for (const entries of Object.values(references)) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    const start = Number(entry.start);
    const length = Number(entry.length);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(length) ||
      start < 0 ||
      length <= 0
    ) {
      throw new Error("INVALID_IMMUTABLE_REFERENCE");
    }
    ranges.push({ start, length });
  }
}

ranges.sort(
  (a, b) => a.start - b.start || a.length - b.length
);

for (let i = 1; i < ranges.length; i += 1) {
  const previous = ranges[i - 1];
  if (
    previous.start + previous.length >
    ranges[i].start
  ) {
    throw new Error(
      "OVERLAPPING_IMMUTABLE_REFERENCES"
    );
  }
}

const bytes = runtime.slice(2).match(/.{2}/g) ?? [];

for (const range of ranges) {
  if (range.start + range.length > bytes.length) {
    throw new Error(
      "IMMUTABLE_REFERENCE_OUT_OF_BOUNDS"
    );
  }

  for (
    let i = range.start;
    i < range.start + range.length;
    i += 1
  ) {
    bytes[i] = "00";
  }
}

const normalized = "0x" + bytes.join("");

console.log(
  JSON.stringify(
    {
      runtime_template_bytecode: runtime,
      normalized_runtime_bytecode: normalized,
      runtime_length_bytes: bytes.length,
      immutable_references: ranges,
      immutable_reference_count: ranges.length,
    },
    null,
    2
  )
);
