import test from "node:test";
import assert from "node:assert/strict";
import {
  hashNormalizedRuntime,
  normalizeRuntimeBytecode,
} from "../../src/verifier/runtime-provenance-v1.mjs";

test("immutable byte ranges are zeroed deterministically", () => {
  const runtime =
    "0x6001aabbccdd6002";
  const ranges = [
    { start: 2, length: 4 },
  ];

  assert.equal(
    normalizeRuntimeBytecode(runtime, ranges),
    "0x6001000000006002"
  );
});

test("different immutable values produce same normalized hash", () => {
  const a =
    "0x6001aabbccdd6002";
  const b =
    "0x6001112233446002";
  const ranges = [
    { start: 2, length: 4 },
  ];

  assert.equal(
    hashNormalizedRuntime(a, ranges),
    hashNormalizedRuntime(b, ranges)
  );
});

test("difference outside immutable range changes normalized hash", () => {
  const a =
    "0x6001aabbccdd6002";
  const b =
    "0x6001aabbccdd6003";
  const ranges = [
    { start: 2, length: 4 },
  ];

  assert.notEqual(
    hashNormalizedRuntime(a, ranges),
    hashNormalizedRuntime(b, ranges)
  );
});

test("overlapping immutable ranges fail closed", () => {
  assert.throws(
    () =>
      normalizeRuntimeBytecode(
        "0x0011223344556677",
        [
          { start: 1, length: 3 },
          { start: 3, length: 2 },
        ]
      ),
    /OVERLAPPING_IMMUTABLE_REFERENCES/
  );
});

test("out-of-bounds immutable range fails closed", () => {
  assert.throws(
    () =>
      normalizeRuntimeBytecode(
        "0x00112233",
        [{ start: 3, length: 2 }]
      ),
    /INVALID_IMMUTABLE_REFERENCE/
  );
});
