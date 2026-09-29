import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { generatePrivateKey } from "viem/accounts";
import {
  createProviderServer,
} from "../../src/provider/http-server.mjs";

const VERIFYING_CONTRACT =
  "0x1111111111111111111111111111111111111111";

const invoice = [
  "Invoice A-1042",
  "Subtotal: 184.20 CAD",
  "Tax: 27.63 CAD",
  "Total: 211.83 CAD",
].join("\n");

function futureDeadline() {
  return String(Math.floor(Date.now() / 1000) + 3600);
}

function binding(nonce = "1") {
  return {
    policy_id:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    batch_id:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    work_id:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    nonce,
    deadline: futureDeadline(),
  };
}

async function postJson(port, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/v1/extract",
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
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: JSON.parse(
              Buffer.concat(chunks).toString("utf8")
            ),
          })
        );
      }
    );
    req.on("error", reject);
    req.end(payload);
  });
}

async function withServer(fn) {
  const server = createProviderServer({
    allowDemoFaults: true,
    signing: {
      privateKey: generatePrivateKey(),
      chainId: 5042,
      verifyingContract: VERIFYING_CONTRACT,
    },
  });

  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve)
  );

  try {
    await fn(server.address().port);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) =>
        error ? reject(error) : resolve()
      )
    );
  }
}

test("valid output returns an EIP-712 envelope", async () => {
  await withServer(async (port) => {
    const response = await postJson(port, {
      input_text: invoice,
      binding: binding("1"),
    });

    assert.equal(response.status, 200);
    assert.equal(
      response.body.evidence.signature_status,
      "SIGNED_EIP712_V1"
    );
    assert.match(
      response.body.signature.signature,
      /^0x[0-9a-f]{130}$/i
    );
    assert.equal(
      response.body.signature.typed_data.domain.chainId,
      "5042"
    );
  });
});

test("schema-valid controlled wrong result is still signed", async () => {
  await withServer(async (port) => {
    const response = await postJson(
      port,
      {
        input_text: invoice,
        binding: binding("2"),
      },
      {
        "x-demo-fault": "WRONG_AMOUNT_VALID",
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.evidence.fault_injected, true);
    assert.equal(
      response.body.evidence.signature_status,
      "SIGNED_EIP712_V1"
    );
  });
});

test("malformed controlled result abstains from signing", async () => {
  await withServer(async (port) => {
    const response = await postJson(
      port,
      {
        input_text: invoice,
        binding: binding("3"),
      },
      {
        "x-demo-fault": "DROP_FIELD",
      }
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.body.evidence.signature_status,
      "ABSTAIN_MALFORMED"
    );
    assert.equal(response.body.signature, null);
  });
});

test("signed mode refuses missing binding", async () => {
  await withServer(async (port) => {
    const response = await postJson(port, {
      input_text: invoice,
    });

    assert.equal(response.status, 400);
    assert.equal(
      response.body.error,
      "SIGNING_BINDING_REQUIRED"
    );
  });
});
