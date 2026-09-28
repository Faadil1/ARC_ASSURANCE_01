import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeInvoiceV1,
  scoreInvoiceV1,
  validateInvoiceV1,
  SCORER_ID,
} from "../../src/scorer/invoice-v1.mjs";

const expected = {
  invoice_number: "A-1042",
  subtotal_minor: 18420,
  tax_minor: 2763,
  total_minor: 21183,
  currency: "CAD",
};

test("scorer id is frozen", () => {
  assert.equal(
    SCORER_ID,
    "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1"
  );
});

test("canonical form is fixed-order ASCII", () => {
  assert.equal(
    canonicalizeInvoiceV1(expected),
    "ARC_ASSURANCE_INVOICE_V1\n" +
      "invoice_number:A-1042\n" +
      "subtotal_minor:18420\n" +
      "tax_minor:2763\n" +
      "total_minor:21183\n" +
      "currency:CAD"
  );
});

test("exact expected output passes", () => {
  const result = scoreInvoiceV1({ ...expected }, expected);

  assert.equal(result.pass, true);
  assert.equal(result.code, "PASS");
  assert.deepEqual(result.mismatches, []);
});

test("valid but wrong fields fail deterministically", () => {
  const actual = {
    ...expected,
    subtotal_minor: 18419,
    tax_minor: 2764,
  };

  const result = scoreInvoiceV1(actual, expected);

  assert.equal(result.pass, false);
  assert.equal(result.code, "FIELD_MISMATCH");
  assert.deepEqual(result.mismatches, [
    "subtotal_minor",
    "tax_minor",
  ]);
});

test("lowercase currency is malformed, not normalized silently", () => {
  const actual = { ...expected, currency: "cad" };

  const result = scoreInvoiceV1(actual, expected);

  assert.equal(result.pass, false);
  assert.equal(result.code, "MALFORMED_ACTUAL");
  assert.ok(result.mismatches.includes("INVALID_CURRENCY"));
});

test("extra fields are rejected", () => {
  const actual = { ...expected, confidence: 0.99 };

  const result = scoreInvoiceV1(actual, expected);

  assert.equal(result.pass, false);
  assert.ok(result.mismatches.includes("FIELD_SET_MISMATCH"));
});

test("unsafe or negative minor-unit values are rejected", () => {
  assert.equal(
    validateInvoiceV1({ ...expected, total_minor: -1 }).ok,
    false
  );

  assert.equal(
    validateInvoiceV1({
      ...expected,
      total_minor: Number.MAX_SAFE_INTEGER + 1,
    }).ok,
    false
  );
});

test("broken ground truth throws instead of silently failing provider", () => {
  assert.throws(
    () =>
      scoreInvoiceV1(
        expected,
        { ...expected, total_minor: 999 }
      ),
    /INVALID_EXPECTED_INVOICE_V1/
  );
});
