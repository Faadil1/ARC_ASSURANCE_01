#!/usr/bin/env python3
import json
import math
import os
import sys
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50

SCHEMA = "ARC_ASSURANCE_T0_FEE_BUDGET_SNAPSHOT_V1"


def rpc_call(rpc_url, method, params=None):
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }).encode("utf-8")
    request = urllib.request.Request(
        rpc_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ARC_ASSURANCE_01-readonly/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    if "error" in body:
        raise RuntimeError(f"RPC_{method}_ERROR:{body['error']}")
    if "result" not in body:
        raise RuntimeError(f"RPC_{method}_MISSING_RESULT")
    return body["result"]


def ceil_mul_div(value, numerator, denominator):
    return (value * numerator + denominator - 1) // denominator


def to_usdc_string(wei_value, decimals=18):
    value = Decimal(wei_value) / (Decimal(10) ** decimals)
    return format(value, "f")


def build_snapshot(config, rpc_fetch):
    if config.get("schema") != "ARC_ASSURANCE_T0_FEE_BUDGET_INPUT_V1":
        raise ValueError("UNEXPECTED_INPUT_SCHEMA")

    network = config["network"]
    gas = config["gas"]
    value = config["value"]

    expected_chain_id = int(network["chain_id"])
    if expected_chain_id != 5042:
        raise ValueError("EXPECTED_CHAIN_ID_MUST_BE_5042")

    chain_id = int(rpc_fetch("eth_chainId"), 16)
    if chain_id != 5042:
        raise ValueError(f"CHAIN_ID_NOT_ARC_MAINNET:{chain_id}")

    block_number = int(rpc_fetch("eth_blockNumber"), 16)
    gas_price = int(rpc_fetch("eth_gasPrice"), 16)
    if gas_price <= 0:
        raise ValueError("GAS_PRICE_NOT_POSITIVE")

    happy_floor = int(gas["happy_path_planning_floor"])
    recovery_extra = int(gas["recovery_extra_floor"])
    gas_unit_bps = int(gas["gas_unit_safety_bps"])
    gas_price_bps = int(gas["gas_price_safety_bps"])

    if happy_floor <= 0:
        raise ValueError("HAPPY_PATH_GAS_NOT_POSITIVE")
    if recovery_extra < 0:
        raise ValueError("RECOVERY_EXTRA_GAS_NEGATIVE")
    if gas_unit_bps < 10000:
        raise ValueError("GAS_UNIT_SAFETY_BELOW_1X")
    if gas_price_bps < 10000:
        raise ValueError("GAS_PRICE_SAFETY_BELOW_1X")

    contingency_floor = happy_floor + recovery_extra
    safe_happy_units = ceil_mul_div(happy_floor, gas_unit_bps, 10000)
    safe_contingency_units = ceil_mul_div(
        contingency_floor, gas_unit_bps, 10000
    )
    safe_gas_price = ceil_mul_div(gas_price, gas_price_bps, 10000)

    happy_gas_reserve = safe_happy_units * safe_gas_price
    contingency_gas_reserve = safe_contingency_units * safe_gas_price

    principal = int(value["peak_t0_principal_wei"])
    ceiling = int(value["wallet_topup_ceiling_wei"])
    if principal <= 0 or ceiling <= 0:
        raise ValueError("VALUE_LIMITS_MUST_BE_POSITIVE")

    happy_peak_required = happy_gas_reserve + principal
    contingency_peak_required = contingency_gas_reserve + principal

    decimals = int(network.get("native_decimals", 18))

    return {
        "schema": SCHEMA,
        "status": "READ_ONLY_TIME_BOUND_FEE_BUDGET",
        "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "network": {
            "chain_id": chain_id,
            "block_number": block_number,
            "gas_price_wei": str(gas_price),
            "gas_price_usdc_per_gas": to_usdc_string(gas_price, decimals),
        },
        "provenance": config["provenance"],
        "safety_multipliers": {
            "gas_unit_bps": gas_unit_bps,
            "gas_price_bps": gas_price_bps,
        },
        "happy_path": {
            "planning_floor_gas": happy_floor,
            "safe_gas_units": safe_happy_units,
            "safe_gas_price_wei": str(safe_gas_price),
            "gas_reserve_wei": str(happy_gas_reserve),
            "gas_reserve_usdc": to_usdc_string(happy_gas_reserve, decimals),
            "principal_wei": str(principal),
            "principal_usdc": to_usdc_string(principal, decimals),
            "peak_required_wei": str(happy_peak_required),
            "peak_required_usdc": to_usdc_string(happy_peak_required, decimals),
            "within_5_usdc_ceiling": happy_peak_required <= ceiling,
        },
        "contingency": {
            "recovery_extra_floor_gas": recovery_extra,
            "planning_floor_gas": contingency_floor,
            "safe_gas_units": safe_contingency_units,
            "safe_gas_price_wei": str(safe_gas_price),
            "gas_reserve_wei": str(contingency_gas_reserve),
            "gas_reserve_usdc": to_usdc_string(contingency_gas_reserve, decimals),
            "principal_wei": str(principal),
            "principal_usdc": to_usdc_string(principal, decimals),
            "peak_required_wei": str(contingency_peak_required),
            "peak_required_usdc": to_usdc_string(
                contingency_peak_required, decimals
            ),
            "within_5_usdc_ceiling": contingency_peak_required <= ceiling,
        },
        "wallet_ceiling": {
            "wei": str(ceiling),
            "usdc": to_usdc_string(ceiling, decimals),
        },
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved": False,
        },
        "truth_boundary": (
            "This is a point-in-time Arc RPC fee observation combined with "
            "local exact-head gas rehearsal. It is not a receipt, fee guarantee, "
            "wallet-balance proof, funding authorization, or deployment authorization."
        ),
    }


def main():
    input_path = Path(
        sys.argv[1] if len(sys.argv) > 1 else "ops/t0-fee-budget-input.json"
    )
    output_path = Path(
        sys.argv[2] if len(sys.argv) > 2 else "t0-fee-budget-snapshot.json"
    )

    config = json.loads(input_path.read_text(encoding="utf-8"))
    rpc_url = os.environ.get("ARC_MAINNET_RPC_URL") or config["network"]["rpc"]

    snapshot = build_snapshot(
        config,
        lambda method: rpc_call(rpc_url, method),
    )
    output_path.write_text(
        json.dumps(snapshot, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(snapshot, indent=2))


if __name__ == "__main__":
    main()
