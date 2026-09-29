#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  verifyArcRunV2,
} from "./verify-arc-v2.mjs";

function usage() {
  return [
    "Usage:",
    "  node src/verifier/chain-cli-v2.mjs verify-chain <manifest.json>",
    "",
    "Environment:",
    "  ARC_MAINNET_RPC_URL may override the default public Arc RPC.",
    "",
    "Exit codes:",
    "  0 = requested chain-native primitive proof(s) valid",
    "  1 = chain/RPC/runtime/event/receipt verification failure",
    "  2 = primitives valid but integrated financial causality not proven",
  ].join("\n");
}

async function main() {
  const [, , command, file] = process.argv;

  if (command !== "verify-chain" || !file) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(file, "utf8")
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          verdict: "INVALID_MANIFEST",
          error:
            "MANIFEST_READ_FAILED:" +
            (error?.message ?? String(error)),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const rpc =
    process.env.ARC_MAINNET_RPC_URL?.trim();

  if (rpc) {
    if (manifest.t0) manifest.t0.rpc_url = rpc;
    if (manifest.assurance) {
      manifest.assurance.rpc_url = rpc;
    }
  }

  const result = await verifyArcRunV2(manifest);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
    return;
  }

  if (
    result.verdict ===
    "PRIMITIVES_PROVEN_INTEGRATION_NOT_PROVEN"
  ) {
    process.exitCode = 2;
    return;
  }

  process.exitCode = 0;
}

await main();
