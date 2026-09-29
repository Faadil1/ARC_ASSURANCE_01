import http from "node:http";
import { randomUUID } from "node:crypto";
import {
  extractInvoiceV1,
  ProviderInputError,
  PROVIDER_SCHEMA_VERSION,
} from "./extract-invoice.mjs";

export const PROVIDER_ID = "ARC_ASSURANCE_PROVIDER_V1";
export const ARC_MAINNET_CHAIN_ID = 5042;

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  const hardLimit = 70 * 1024;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > hardLimit) {
      throw new ProviderInputError("REQUEST_TOO_LARGE", "Request body exceeds service limit");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) throw new ProviderInputError("EMPTY_BODY", "JSON request body is required");
  try { return JSON.parse(raw); }
  catch { throw new ProviderInputError("INVALID_JSON", "Request body must be valid JSON"); }
}

function requireSigningBinding(body) {
  if (typeof body.binding !== "object" || body.binding === null || Array.isArray(body.binding)) {
    throw new ProviderInputError("SIGNING_BINDING_REQUIRED", "Signed mode requires binding metadata");
  }
  const required = ["policy_id","batch_id","work_id","nonce","deadline"];
  const missing = required.filter((key) => body.binding[key] === undefined || body.binding[key] === null || body.binding[key] === "");
  if (missing.length) {
    throw new ProviderInputError("SIGNING_BINDING_REQUIRED", "Missing signing binding field(s): " + missing.join(","));
  }
  let deadline;
  try { deadline = BigInt(String(body.binding.deadline)); }
  catch { throw new ProviderInputError("INVALID_SIGNING_DEADLINE", "deadline must be an unsigned integer unix timestamp"); }
  if (deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new ProviderInputError("SIGNING_DEADLINE_EXPIRED", "deadline must be in the future");
  }
  return body.binding;
}

async function maybeSignExtraction({ body, binding, extraction, signing }) {
  if (!signing) return { status: "DISABLED", envelope: null };
  if (extraction.canonical_output === null) return { status: "ABSTAIN_MALFORMED", envelope: null };
  const { signProviderOutputV1 } = await import("../eip712/sign-provider-output-v1.mjs");
  try {
    const signed = await signProviderOutputV1({
      privateKey: signing.privateKey,
      chainId: signing.chainId,
      verifyingContract: signing.verifyingContract,
      policyId: binding.policy_id,
      batchId: binding.batch_id,
      workId: binding.work_id,
      inputText: body.input_text,
      canonicalOutput: extraction.canonical_output,
      nonce: binding.nonce,
      deadline: binding.deadline,
    });
    return {
      status: "SIGNED_EIP712_V1",
      envelope: { signer: signed.signer, signature: signed.signature, digest: signed.digest, typed_data: signed.typedDataJson },
    };
  } catch (error) {
    if (typeof error?.message === "string" && (error.message.startsWith("INVALID_") || error.message.startsWith("ZERO_"))) {
      throw new ProviderInputError("INVALID_SIGNING_BINDING", error.message);
    }
    throw error;
  }
}

export function createProviderServer(options = {}) {
  const { allowDemoFaults = false, signing = null } = options;
  if (signing) {
    if (signing.chainId !== ARC_MAINNET_CHAIN_ID) throw new Error("SIGNING_CHAIN_MUST_BE_" + ARC_MAINNET_CHAIN_ID);
    if (typeof signing.verifyingContract !== "string" || signing.verifyingContract.length === 0) throw new Error("SIGNING_VERIFYING_CONTRACT_REQUIRED");
    if (typeof signing.privateKey !== "string" || signing.privateKey.length === 0) throw new Error("SIGNING_PRIVATE_KEY_REQUIRED");
  }
  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const requestId = randomUUID();
    let computeStarted = false;
    try {
      if (req.method === "GET" && req.url === "/health") {
        return json(res, 200, {
          status: "ok", provider_id: PROVIDER_ID, schema_version: PROVIDER_SCHEMA_VERSION,
          demo_faults_enabled: allowDemoFaults,
          signature_status: signing ? "EIP712_V1_ENABLED" : "DISABLED",
          signing_chain_id: signing?.chainId ?? null,
          verifying_contract: signing?.verifyingContract ?? null,
        });
      }
      if (req.method !== "POST" || req.url !== "/v1/extract") {
        return json(res, 404, { error: "NOT_FOUND", request_id: requestId });
      }
      const body = await readJsonBody(req);
      if (typeof body !== "object" || body === null || Array.isArray(body) || typeof body.input_text !== "string") {
        throw new ProviderInputError("INVALID_REQUEST", "Expected JSON object with input_text string");
      }
      const binding = signing ? requireSigningBinding(body) : null;
      const requestedFault = String(req.headers["x-demo-fault"] ?? "NONE").toUpperCase();
      computeStarted = true;
      const extraction = extractInvoiceV1(body.input_text, { faultMode: requestedFault, allowDemoFaults });
      const signed = await maybeSignExtraction({ body, binding, extraction, signing });
      return json(res, 200, {
        request_id: requestId, provider_id: PROVIDER_ID, schema_version: PROVIDER_SCHEMA_VERSION,
        binding, result: extraction.result, canonical_output: extraction.canonical_output, signature: signed.envelope,
        evidence: { execution: "REAL_COMPUTE", fault_mode: extraction.fault_mode, fault_injected: extraction.fault_injected, signature_status: signed.status },
        timing: { duration_ms: Date.now() - startedAt },
      });
    } catch (error) {
      if (error instanceof ProviderInputError) {
        return json(res, 400, {
          request_id: requestId, error: error.code, message: error.message,
          evidence: { execution: computeStarted ? "REAL_COMPUTE" : "NOT_RUN", signature_status: signing ? "EIP712_V1_NOT_SIGNED" : "DISABLED" },
        });
      }
      return json(res, 500, {
        request_id: requestId, error: "INTERNAL_ERROR", message: "Unexpected provider error",
        evidence: { signature_status: signing ? "EIP712_V1_FAILED" : "DISABLED" },
      });
    }
  });
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8787);
  const allowDemoFaults = process.env.ALLOW_DEMO_FAULTS === "true";
  const signingKey = process.env.PROVIDER_SIGNING_KEY?.trim() || null;
  const verifyingContract = process.env.PROVIDER_VERIFYING_CONTRACT?.trim() || null;
  const signing = signingKey ? {
    privateKey: signingKey,
    chainId: Number(process.env.PROVIDER_CHAIN_ID ?? ARC_MAINNET_CHAIN_ID),
    verifyingContract,
  } : null;
  const server = createProviderServer({ allowDemoFaults, signing });
  server.listen(port, "0.0.0.0", () => {
    console.log(JSON.stringify({
      event: "provider_started", port, allow_demo_faults: allowDemoFaults, provider_id: PROVIDER_ID,
      signature_status: signing ? "EIP712_V1_ENABLED" : "DISABLED",
      signing_chain_id: signing?.chainId ?? null, verifying_contract: signing?.verifyingContract ?? null,
    }));
  });
}
