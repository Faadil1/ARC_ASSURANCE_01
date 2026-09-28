import http from "node:http";
import { randomUUID } from "node:crypto";
import {
  extractInvoiceV1,
  ProviderInputError,
  PROVIDER_SCHEMA_VERSION,
} from "./extract-invoice.mjs";

export const PROVIDER_ID = "ARC_ASSURANCE_PROVIDER_V1";

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
      throw new ProviderInputError(
        "REQUEST_TOO_LARGE",
        "Request body exceeds service limit"
      );
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    throw new ProviderInputError(
      "EMPTY_BODY",
      "JSON request body is required"
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ProviderInputError(
      "INVALID_JSON",
      "Request body must be valid JSON"
    );
  }
}

export function createProviderServer(options = {}) {
  const {
    allowDemoFaults = false,
  } = options;

  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const requestId = randomUUID();

    try {
      if (req.method === "GET" && req.url === "/health") {
        return json(res, 200, {
          status: "ok",
          provider_id: PROVIDER_ID,
          schema_version: PROVIDER_SCHEMA_VERSION,
          demo_faults_enabled: allowDemoFaults,
          signature_status: "NOT_IMPLEMENTED",
        });
      }

      if (req.method !== "POST" || req.url !== "/v1/extract") {
        return json(res, 404, {
          error: "NOT_FOUND",
          request_id: requestId,
        });
      }

      const body = await readJsonBody(req);

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        typeof body.input_text !== "string"
      ) {
        throw new ProviderInputError(
          "INVALID_REQUEST",
          "Expected JSON object with input_text string"
        );
      }

      const requestedFault = String(
        req.headers["x-demo-fault"] ?? "NONE"
      ).toUpperCase();

      const extraction = extractInvoiceV1(body.input_text, {
        faultMode: requestedFault,
        allowDemoFaults,
      });

      return json(res, 200, {
        request_id: requestId,
        provider_id: PROVIDER_ID,
        schema_version: PROVIDER_SCHEMA_VERSION,
        result: extraction.result,
        canonical_output: extraction.canonical_output,
        evidence: {
          execution: "REAL_COMPUTE",
          fault_mode: extraction.fault_mode,
          fault_injected: extraction.fault_injected,
          signature_status: "NOT_IMPLEMENTED",
        },
        timing: {
          duration_ms: Date.now() - startedAt,
        },
      });
    } catch (error) {
      if (error instanceof ProviderInputError) {
        return json(res, 400, {
          request_id: requestId,
          error: error.code,
          message: error.message,
          evidence: {
            execution: "REAL_COMPUTE",
            signature_status: "NOT_IMPLEMENTED",
          },
        });
      }

      return json(res, 500, {
        request_id: requestId,
        error: "INTERNAL_ERROR",
        message: "Unexpected provider error",
      });
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT ?? 8787);
  const allowDemoFaults =
    process.env.ALLOW_DEMO_FAULTS === "true";

  const server = createProviderServer({ allowDemoFaults });
  server.listen(port, "0.0.0.0", () => {
    console.log(
      JSON.stringify({
        event: "provider_started",
        port,
        allow_demo_faults: allowDemoFaults,
        provider_id: PROVIDER_ID,
      })
    );
  });
}
