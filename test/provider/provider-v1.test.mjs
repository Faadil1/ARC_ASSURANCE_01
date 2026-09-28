import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  extractInvoiceV1,
  parseInvoiceTextV1,
  ProviderInputError,
} from "../../src/provider/extract-invoice.mjs";
import {
  createProviderServer,
  PROVIDER_ID,
} from "../../src/provider/http-server.mjs";

const invoice = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

test("parser performs real structured extraction", () => {
  assert.deepEqual(parseInvoiceTextV1(invoice), {
    invoice_number: "A-1042",
    subtotal_minor: 18420,
    tax_minor: 2763,
    total_minor: 21183,
    currency: "CAD",
  });
});

test("normal provider output is canonicalizable", () => {
  const result = extractInvoiceV1(invoice);
  assert.equal(result.fault_injected, false);
  assert.match(
    result.canonical_output,
    /^ARC_ASSURANCE_INVOICE_V1\n/
  );
});

test("fault injection is disabled by default", () => {
  assert.throws(
    () =>
      extractInvoiceV1(invoice, {
        faultMode: "WRONG_TOTAL",
      }),
    (error) =>
      error instanceof ProviderInputError &&
      error.code === "DEMO_FAULTS_DISABLED"
  );
});

test("controlled wrong-total fault is explicit", () => {
  const result = extractInvoiceV1(invoice, {
    faultMode: "WRONG_TOTAL",
    allowDemoFaults: true,
  });

  assert.equal(result.fault_injected, true);
  assert.equal(result.fault_mode, "WRONG_TOTAL");
  assert.equal(result.result.total_minor, 21184);
  assert.equal(result.canonical_output, null);
});

test("controlled lowercase-currency fault is explicit", () => {
  const result = extractInvoiceV1(invoice, {
    faultMode: "LOWERCASE_CURRENCY",
    allowDemoFaults: true,
  });

  assert.equal(result.result.currency, "cad");
  assert.equal(result.canonical_output, null);
});

test("currency mismatch fails before output", () => {
  const bad = [
    "Invoice A-1042",
    "Subtotal: 184.20 CAD",
    "Tax: 27.63 USD",
    "Total: 211.83 CAD",
  ].join("\n");

  assert.throws(
    () => parseInvoiceTextV1(bad),
    /currencies must match/
  );
});

async function postJson(port, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            body: JSON.parse(
              Buffer.concat(chunks).toString("utf8")
            ),
          });
        });
      }
    );
    req.on("error", reject);
    req.end(payload);
  });
}

async function withServer(options, fn) {
  const server = createProviderServer(options);
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve)
  );

  try {
    const address = server.address();
    await fn(address.port);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) =>
        error ? reject(error) : resolve()
      )
    );
  }
}

test("HTTP service returns real extraction with explicit evidence metadata", async () => {
  await withServer({ allowDemoFaults: false }, async (port) => {
    const response = await postJson(
      port,
      "/v1/extract",
      { input_text: invoice }
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.provider_id, PROVIDER_ID);
    assert.equal(
      response.body.evidence.execution,
      "REAL_COMPUTE"
    );
    assert.equal(
      response.body.evidence.fault_injected,
      false
    );
    assert.equal(
      response.body.evidence.signature_status,
      "NOT_IMPLEMENTED"
    );
    assert.equal(
      response.body.result.total_minor,
      21183
    );
  });
});

test("HTTP service refuses fault mode when demo faults are disabled", async () => {
  await withServer({ allowDemoFaults: false }, async (port) => {
    const response = await postJson(
      port,
      "/v1/extract",
      { input_text: invoice },
      { "x-demo-fault": "WRONG_TOTAL" }
    );

    assert.equal(response.status, 400);
    assert.equal(
      response.body.error,
      "DEMO_FAULTS_DISABLED"
    );
  });
});

test("HTTP service exposes controlled fault only when explicitly enabled", async () => {
  await withServer({ allowDemoFaults: true }, async (port) => {
    const response = await postJson(
      port,
      "/v1/extract",
      { input_text: invoice },
      { "x-demo-fault": "WRONG_TOTAL" }
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.body.evidence.fault_injected,
      true
    );
    assert.equal(
      response.body.evidence.fault_mode,
      "WRONG_TOTAL"
    );
  });
});
