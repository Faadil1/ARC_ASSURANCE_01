import { keccak256 } from "viem";

export function normalizeRuntimeBytecode(
  bytecode,
  immutableReferences = []
) {
  if (
    typeof bytecode !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(bytecode)
  ) {
    throw new Error("INVALID_RUNTIME_BYTECODE");
  }

  if (!Array.isArray(immutableReferences)) {
    throw new Error(
      "INVALID_IMMUTABLE_REFERENCE_LIST"
    );
  }

  const bytes = bytecode.slice(2).match(/.{2}/g) ?? [];

  const ranges = immutableReferences
    .map((entry) => ({
      start: Number(entry.start),
      length: Number(entry.length),
    }))
    .sort(
      (a, b) =>
        a.start - b.start || a.length - b.length
    );

  for (let i = 0; i < ranges.length; i += 1) {
    const current = ranges[i];

    if (
      !Number.isSafeInteger(current.start) ||
      !Number.isSafeInteger(current.length) ||
      current.start < 0 ||
      current.length <= 0 ||
      current.start + current.length > bytes.length
    ) {
      throw new Error(
        "INVALID_IMMUTABLE_REFERENCE"
      );
    }

    if (
      i > 0 &&
      ranges[i - 1].start +
        ranges[i - 1].length >
        current.start
    ) {
      throw new Error(
        "OVERLAPPING_IMMUTABLE_REFERENCES"
      );
    }

    for (
      let offset = current.start;
      offset < current.start + current.length;
      offset += 1
    ) {
      bytes[offset] = "00";
    }
  }

  return "0x" + bytes.join("");
}

export function hashNormalizedRuntime(
  bytecode,
  immutableReferences = []
) {
  return keccak256(
    normalizeRuntimeBytecode(
      bytecode,
      immutableReferences
    )
  );
}
