#!/usr/bin/env python3
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "script" / "t0_readonly_fee_budget.py"
INPUT = ROOT / "ops" / "t0-fee-budget-input.json"

spec = importlib.util.spec_from_file_location("t0budget", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class T0ReadonlyFeeBudgetTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads(INPUT.read_text(encoding="utf-8"))

    def rpc(self, method):
        values = {
            "eth_chainId": hex(5042),
            "eth_blockNumber": hex(123456),
            "eth_gasPrice": hex(1_000_000_000),
        }
        return values[method]

    def test_budget_math_with_safety_and_recovery(self):
        snapshot = mod.build_snapshot(self.config, self.rpc)

        self.assertEqual(
            snapshot["happy_path"]["safe_gas_units"],
            3656949,
        )
        self.assertEqual(
            snapshot["contingency"]["safe_gas_units"],
            3789737,
        )
        self.assertEqual(
            snapshot["happy_path"]["safe_gas_price_wei"],
            "2000000000",
        )
        self.assertEqual(
            snapshot["happy_path"]["gas_reserve_wei"],
            "7313898000000000",
        )
        self.assertEqual(
            snapshot["happy_path"]["peak_required_wei"],
            "17313898000000000",
        )
        self.assertTrue(
            snapshot["contingency"]["within_5_usdc_ceiling"]
        )

    def test_wrong_chain_fails_closed(self):
        def rpc(method):
            if method == "eth_chainId":
                return hex(1)
            return self.rpc(method)

        with self.assertRaisesRegex(
            ValueError, "CHAIN_ID_NOT_ARC_MAINNET"
        ):
            mod.build_snapshot(self.config, rpc)

    def test_safety_multiplier_cannot_drop_below_one(self):
        self.config["gas"]["gas_unit_safety_bps"] = 9999
        with self.assertRaisesRegex(
            ValueError, "GAS_UNIT_SAFETY_BELOW_1X"
        ):
            mod.build_snapshot(self.config, self.rpc)

    def test_snapshot_never_claims_authorization(self):
        snapshot = mod.build_snapshot(self.config, self.rpc)
        self.assertFalse(snapshot["safety"]["private_key_consumed"])
        self.assertFalse(snapshot["safety"]["transaction_signed"])
        self.assertFalse(snapshot["safety"]["transaction_broadcast"])
        self.assertFalse(snapshot["safety"]["funds_moved"])


if __name__ == "__main__":
    unittest.main()
