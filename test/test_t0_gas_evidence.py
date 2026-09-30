#!/usr/bin/env python3
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "script" / "parse_t0_gas_report.py"
FIXTURE = ROOT / "fixtures" / "gas" / "t0-policy-custody-gas-report.txt"

spec = importlib.util.spec_from_file_location("t0gas", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class T0GasEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.report = FIXTURE.read_text(encoding="utf-8")

    def test_extracts_exact_observed_maxima(self):
        evidence = mod.parse_t0_gas_report(
            self.report, git_sha="abc", workflow_run="42"
        )
        self.assertEqual(evidence["deployment"]["gas_units"], 2160427)
        self.assertEqual(evidence["function_max_gas"]["createPolicy"], 217532)
        self.assertEqual(evidence["function_max_gas"]["fund"], 131090)
        self.assertEqual(
            evidence["function_max_gas"]["releaseConfiguredPayout"], 160713
        )
        self.assertEqual(evidence["function_max_gas"]["refundRemaining"], 84222)
        self.assertEqual(evidence["function_max_gas"]["complete"], 45575)

    def test_derives_canonical_t0_planning_floor(self):
        evidence = mod.parse_t0_gas_report(self.report)
        self.assertEqual(
            evidence["canonical_t0"]["execution_function_max_sum_gas"], 639132
        )
        self.assertEqual(
            evidence["canonical_t0"]["transaction_intrinsic_floor_gas"], 126000
        )
        self.assertEqual(
            evidence["canonical_t0"]["planning_floor_before_safety_gas"],
            2925559,
        )

    def test_recovery_path_is_preserved_separately(self):
        evidence = mod.parse_t0_gas_report(self.report)
        self.assertEqual(
            evidence["recovery_path"]["cancelExpiredAndRefund_max_gas"], 85230
        )

    def test_missing_required_function_fails_closed(self):
        broken = self.report.replace(
            "| complete                                     |           31387 |  40334 |  45575 |  45575 |       5 |",
            "",
        )
        with self.assertRaisesRegex(
            ValueError, "REQUIRED_GAS_FUNCTION_MISSING:complete"
        ):
            mod.parse_t0_gas_report(broken)


if __name__ == "__main__":
    unittest.main()
