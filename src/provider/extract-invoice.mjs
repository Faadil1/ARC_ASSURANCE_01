import {
  canonicalizeInvoiceV1,
  validateInvoiceV1,
} from "../scorer/invoice-v1.mjs";

export const PROVIDER_SCHEMA_VERSION = "invoice-v1";

export class ProviderInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProviderInputError";
    this.code = code;
  }
}

function parseMoneyLine(text, label) {
  const re = new RegExp(
    `^\\s*${label}\\s*:\\s*([0-9]+)(?:\\.([0-9]{2}))?\\s+([A-Za-z]{3})\\s*$`,
    "im"
  );
  const match = text.match(re);
  if (!match) {
    throw new ProviderInputError(
      `MISSING_${label.toUpperCase()}`,
      `Could not parse ${label}`
    );
  }

  const whole = Number(match[1]);
  const cents = Number(match[2] ?? "00");
  const currency = match[3].toUpperCase();

  if (!Number.isSafeInteger(whole) || whole < 0) {
    throw new ProviderInputError(
      `INVALID_${label.toUpperCase()}`,
      `Invalid ${label} whole amount`
    );
  }

  return {
    minor: whole * 100 + cents,
    currency,
  };
}

export function parseInvoiceTextV1(inputText) {
  if (typeof inputText !== "string" || inputText.trim().length === 0) {
    throw new ProviderInputError(
      "EMPTY_INPUT",
      "input_text must be a non-empty string"
    );
  }

  if (Buffer.byteLength(inputText, "utf8") > 64 * 1024) {
    throw new ProviderInputError(
      "INPUT_TOO_LARGE",
      "input_text exceeds 64 KiB"
    );
  }

  const invoiceMatch = inputText.match(
    /^\s*Invoice(?:\s+(?:No\.?|Number))?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9._\/-]{0,63})\s*$/im
  );

  if (!invoiceMatch) {
    throw new ProviderInputError(
      "MISSING_INVOICE_NUMBER",
      "Could not parse invoice number"
    );
  }

  const subtotal = parseMoneyLine(inputText, "Subtotal");
  const tax = parseMoneyLine(inputText, "Tax");
  const total = parseMoneyLine(inputText, "Total");

  const currencies = new Set([
    subtotal.currency,
    tax.currency,
    total.currency,
  ]);

  if (currencies.size !== 1) {
    throw new ProviderInputError(
      "CURRENCY_MISMATCH",
      "Subtotal, tax, and total currencies must match"
    );
  }

  const parsed = {
    invoice_number: invoiceMatch[1].toUpperCase(),
    subtotal_minor: subtotal.minor,
    tax_minor: tax.minor,
    total_minor: total.minor,
    currency: subtotal.currency,
  };

  const validation = validateInvoiceV1(parsed);
  if (!validation.ok) {
    throw new ProviderInputError(
      "PARSED_OUTPUT_INVALID",
      validation.errors.join(",")
    );
  }

  return parsed;
}

export const DEMO_FAULT_MODES = Object.freeze([
  "NONE",
  "WRONG_AMOUNT_VALID",
  "WRONG_TOTAL",
  "LOWERCASE_CURRENCY",
  "DROP_FIELD",
  "WRONG_INVOICE_NUMBER",
]);

export function applyDemoFault(output, faultMode = "NONE") {
  if (!DEMO_FAULT_MODES.includes(faultMode)) {
    throw new ProviderInputError(
      "UNKNOWN_FAULT_MODE",
      `Unsupported demo fault mode: ${faultMode}`
    );
  }

  if (faultMode === "NONE") {
    return { ...output };
  }

  if (faultMode === "WRONG_AMOUNT_VALID") {
    return {
      ...output,
      tax_minor: output.tax_minor + 1,
      total_minor: output.total_minor + 1,
    };
  }

  if (faultMode === "WRONG_TOTAL") {
    return {
      ...output,
      total_minor: output.total_minor + 1,
    };
  }

  if (faultMode === "LOWERCASE_CURRENCY") {
    return {
      ...output,
      currency: output.currency.toLowerCase(),
    };
  }

  if (faultMode === "DROP_FIELD") {
    const { tax_minor, ...rest } = output;
    return rest;
  }

  if (faultMode === "WRONG_INVOICE_NUMBER") {
    return {
      ...output,
      invoice_number: `${output.invoice_number}-X`,
    };
  }

  return { ...output };
}

export function extractInvoiceV1(inputText, options = {}) {
  const {
    faultMode = "NONE",
    allowDemoFaults = false,
  } = options;

  if (faultMode !== "NONE" && !allowDemoFaults) {
    throw new ProviderInputError(
      "DEMO_FAULTS_DISABLED",
      "Fault injection is disabled"
    );
  }

  const cleanOutput = parseInvoiceTextV1(inputText);
  const result = applyDemoFault(cleanOutput, faultMode);

  let canonical = null;
  try {
    canonical = canonicalizeInvoiceV1(result);
  } catch {
    canonical = null;
  }

  return {
    result,
    clean_output: cleanOutput,
    canonical_output: canonical,
    fault_mode: faultMode,
    fault_injected: faultMode !== "NONE",
  };
}
