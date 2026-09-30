#!/usr/bin/env python3
import json
import os
import re
import sys
from pathlib import Path

SCHEMA = "ARC_ASSURANCE_T0_GAS_UNIT_EVIDENCE_V1"
CONTRACT_MARKER = "src/PolicyCustody.sol:PolicyCustody Contract"
REQUIRED = [
    "createPolicy",
    "fund",
    "releaseConfiguredPayout",
    "refundRemaining",
    "complete",
]
TX_COUNT = 6
TX_INTRINSIC_FLOOR = 21_000


def _int(value: str) -> int:
    return int(value.replace(",", "").strip())


def extract_contract_section(report: str) -> str:
    start = report.find(CONTRACT_MARKER)
    if start < 0:
        raise ValueError("POLICY_CUSTODY_GAS_SECTION_NOT_FOUND")
    tail = report[start:]
    candidates = []
    for marker in ("\n| src/", "\n| test/"):
        idx = tail[len(CONTRACT_MARKER):].find(marker)
        if idx >= 0:
            candidates.append(idx)
    if not candidates:
        return tail
    end = len(CONTRACT_MARKER) + min(candidates)
    return tail[:end]


def parse_deployment(section: str) -> tuple[int, int]:
    lines = section.splitlines()
    for i, line in enumerate(lines):
        if "Deployment Cost" in line and "Deployment Size" in line:
            for row in lines[i + 1:i + 8]:
                cells = [c.strip() for c in row.split("|") if c.strip()]
                if (
                    len(cells) >= 2
                    and re.fullmatch(r"[0-9,]+", cells[0])
                    and re.fullmatch(r"[0-9,]+", cells[1])
                ):
                    return _int(cells[0]), _int(cells[1])
    raise ValueError("DEPLOYMENT_ROW_NOT_FOUND")


def parse_functions(section: str) -> dict[str, dict[str, int]]:
    rows: dict[str, dict[str, int]] = {}
    for line in section.splitlines():
        if "|" not in line:
            continue
        cells = [c.strip() for c in line.split("|") if c.strip()]
        if len(cells) < 6:
            continue
        name, min_v, avg_v, median_v, max_v, calls_v = cells[:6]
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
            continue
        numeric = [min_v, avg_v, median_v, max_v, calls_v]
        if not all(re.fullmatch(r"[0-9,]+", v) for v in numeric):
            continue
        rows[name] = {
            "min": _int(min_v),
            "avg": _int(avg_v),
            "median": _int(median_v),
            "max": _int(max_v),
            "calls": _int(calls_v),
        }
    for name in REQUIRED:
        if name not in rows:
            raise ValueError(f"REQUIRED_GAS_FUNCTION_MISSING:{name}")
    return rows


def parse_t0_gas_report(report: str, git_sha=None, workflow_run=None) -> dict:
    section = extract_contract_section(report)
    deployment_gas, deployment_size = parse_deployment(section)
    functions = parse_functions(section)

    execution_sum = sum(functions[name]["max"] for name in REQUIRED)
    intrinsic_floor = TX_COUNT * TX_INTRINSIC_FLOOR
    planning_floor = deployment_gas + execution_sum + intrinsic_floor

    recovery = functions.get("cancelExpiredAndRefund", {}).get("max")

    return {
        "schema": SCHEMA,
        "evidence_class": "LOCAL_EXACT_HEAD_REHEARSAL",
        "git_sha": git_sha,
        "workflow_run": workflow_run,
        "source": {
            "command": "arc-forge test --gas-report",
            "contract": CONTRACT_MARKER,
        },
        "deployment": {
            "gas_units": deployment_gas,
            "contract_size_bytes": deployment_size,
            "status": "LOCAL_REHEARSAL_OBSERVED" if deployment_gas > 0 else "BLOCKED_ZERO",
        },
        "function_max_gas": {name: row["max"] for name, row in functions.items()},
        "canonical_t0": {
            "sequence": [
                "deploy PolicyCustody",
                "createPolicy",
                "fund",
                "releaseConfiguredPayout",
                "refundRemaining",
                "complete",
            ],
            "mainnet_transaction_count": TX_COUNT,
            "execution_function_max_sum_gas": execution_sum,
            "transaction_intrinsic_floor_gas": intrinsic_floor,
            "planning_floor_before_safety_gas": planning_floor,
        },
        "recovery_path": {
            "cancelExpiredAndRefund_max_gas": recovery,
        },
        "truth_boundary": {
            "arc_mainnet_receipt": False,
            "arc_mainnet_fee_quote": False,
            "mainnet_tx_intrinsic_calldata_exact": False,
            "planning_input": True,
            "note": (
                "Adds a 21,000-gas intrinsic floor for each of six canonical "
                "mainnet transactions. Calldata intrinsic gas and network-specific "
                "variance remain covered by the later gas-unit safety multiplier."
            ),
        },
    }


def main() -> int:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "gas-report.log")
    target = Path(
        sys.argv[2] if len(sys.argv) > 2 else "t0-gas-unit-evidence.json"
    )
    report = source.read_text(encoding="utf-8")
    evidence = parse_t0_gas_report(
        report,
        git_sha=os.environ.get("GIT_COMMIT"),
        workflow_run=os.environ.get("GITHUB_RUN_ID"),
    )
    target.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))
    if evidence["deployment"]["gas_units"] <= 0:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
