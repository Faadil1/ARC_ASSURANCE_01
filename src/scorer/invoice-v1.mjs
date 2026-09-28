export const INVOICE_V1_FIELDS = Object.freeze([
  "invoice_number",
  "subtotal_minor",
  "tax_minor",
  "total_minor",
  "currency",
]);

export const SCORER_ID = "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";
export const CANONICAL_PREFIX = "ARC_ASSURANCE_INVOICE_V1";

const INVOICE_NUMBER_RE = /^[A-Z0-9][A-Z0-9._\/-]{0,63}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateInvoiceV1(value) {
  const errors = [];

  if (!isPlainObject(value)) {
    return { ok: false, errors: ["NOT_OBJECT"] };
  }

  const keys = Object.keys(value).sort();
  const expectedKeys = [...INVOICE_V1_FIELDS].sort();

  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, i) => key !== expectedKeys[i])
  ) {
    errors.push("FIELD_SET_MISMATCH");
  }

  if (
    typeof value.invoice_number !== "string" ||
    !INVOICE_NUMBER_RE.test(value.invoice_number)
  ) {
    errors.push("INVALID_INVOICE_NUMBER");
  }

  for (const field of ["subtotal_minor", "tax_minor", "total_minor"]) {
    const amount = value[field];
    if (!Number.isSafeInteger(amount) || amount < 0) {
      errors.push(`INVALID_${field.toUpperCase()}`);
    }
  }

  if (
    typeof value.currency !== "string" ||
    !CURRENCY_RE.test(value.currency)
  ) {
    errors.push("INVALID_CURRENCY");
  }

  if (
    Number.isSafeInteger(value.subtotal_minor) &&
    Number.isSafeInteger(value.tax_minor) &&
    Number.isSafeInteger(value.total_minor) &&
    value.subtotal_minor + value.tax_minor !== value.total_minor
  ) {
    errors.push("ARITHMETIC_MISMATCH");
  }

  return { ok: errors.length === 0, errors };
}

export function canonicalizeInvoiceV1(value) {
  const validation = validateInvoiceV1(value);

  if (!validation.ok) {
    throw new Error(
      `INVALID_INVOICE_V1:${validation.errors.join(",")}`
    );
  }

  return [
    CANONICAL_PREFIX,
    `invoice_number:${value.invoice_number}`,
    `subtotal_minor:${value.subtotal_minor}`,
    `tax_minor:${value.tax_minor}`,
    `total_minor:${value.total_minor}`,
    `currency:${value.currency}`,
  ].join("\n");
}

export function scoreInvoiceV1(actual, expected) {
  const expectedValidation = validateInvoiceV1(expected);

  if (!expectedValidation.ok) {
    throw new Error(
      `INVALID_EXPECTED_INVOICE_V1:${expectedValidation.errors.join(",")}`
    );
  }

  const actualValidation = validateInvoiceV1(actual);

  if (!actualValidation.ok) {
    return {
      pass: false,
      code: "MALFORMED_ACTUAL",
      mismatches: [...actualValidation.errors],
      actualCanonical: null,
      expectedCanonical: canonicalizeInvoiceV1(expected),
    };
  }

  const mismatches = INVOICE_V1_FIELDS.filter(
    (field) => actual[field] !== expected[field]
  );

  return {
    pass: mismatches.length === 0,
    code: mismatches.length === 0 ? "PASS" : "FIELD_MISMATCH",
    mismatches,
    actualCanonical: canonicalizeInvoiceV1(actual),
    expectedCanonical: canonicalizeInvoiceV1(expected),
  };
}
