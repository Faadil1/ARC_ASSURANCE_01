#!/usr/bin/env python3
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "script" / "validate_t0_funding_envelope.py"
ENVELOPE = ROOT / "ops" / "t0-funding-envelope.json"

spec = importlib.util.spec_from_file_location("funding", VALIDATOR)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FundingEnvelopeTests(unittest.TestCase):
    def setUp(self):
        self.envelope = json.loads(ENVELOPE.read_text(encoding="utf-8"))
        self.snapshot = {
            "schema": "ARC_ASSURANCE_T0_FEE_BUDGET_SNAPSHOT_V1",
            "contingency": {
                "peak_required_wei": "161589480363814752"
            }
        }

    def test_current_snapshot_is_ready_for_human_review(self):
        result = mod.validate_envelope(self.envelope, self.snapshot)
        self.assertEqual(
            result["status"],
            "CANDIDATE_ENVELOPE_READY_FOR_HUMAN_REVIEW"
        )
        self.assertTrue(result["snapshot_within_rule"])
        self.assertTrue(result["candidate_covers_snapshot"])
        self.assertFalse(result["funding_authorized"])

    def test_snapshot_over_025_usdc_blocks_candidate(self):
        self.snapshot["contingency"]["peak_required_wei"] = (
            "250000000000000001"
        )
        result = mod.validate_envelope(self.envelope, self.snapshot)
        self.assertEqual(
            result["status"],
            "BLOCKED_FRESH_SNAPSHOT_EXCEEDS_ENVELOPE_RULE"
        )

    def test_candidate_cannot_exceed_hard_ceiling(self):
        self.envelope["candidate_topup_wei"] = "5000000000000000001"
        with self.assertRaisesRegex(
            ValueError, "CANDIDATE_EXCEEDS_HARD_CEILING"
        ):
            mod.validate_envelope(self.envelope, self.snapshot)


if __name__ == "__main__":
    unittest.main()
