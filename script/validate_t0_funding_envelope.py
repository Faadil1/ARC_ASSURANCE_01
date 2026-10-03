#!/usr/bin/env python3
import json
import sys
from pathlib import Path

SCHEMA = "ARC_ASSURANCE_T0_FUNDING_ENVELOPE_VALIDATION_V1"


def validate_envelope(envelope, snapshot):
    if envelope.get("schema") != "ARC_ASSURANCE_T0_FUNDING_ENVELOPE_V1":
        raise ValueError("UNEXPECTED_ENVELOPE_SCHEMA")
    if snapshot.get("schema") != "ARC_ASSURANCE_T0_FEE_BUDGET_SNAPSHOT_V1":
        raise ValueError("UNEXPECTED_SNAPSHOT_SCHEMA")

    candidate = int(envelope["candidate_topup_wei"])
    hard_ceiling = int(envelope["hard_wallet_ceiling_wei"])
    snapshot_limit = int(
        envelope["fresh_snapshot_max_contingency_peak_wei"]
    )
    contingency_required = int(
        snapshot["contingency"]["peak_required_wei"]
    )

    if candidate <= 0 or hard_ceiling <= 0:
        raise ValueError("FUNDING_LIMITS_MUST_BE_POSITIVE")
    if candidate > hard_ceiling:
        raise ValueError("CANDIDATE_EXCEEDS_HARD_CEILING")
    if snapshot_limit <= 0:
        raise ValueError("SNAPSHOT_LIMIT_MUST_BE_POSITIVE")

    snapshot_within_limit = contingency_required <= snapshot_limit
    candidate_covers_snapshot = candidate >= contingency_required

    verdict = (
        "CANDIDATE_ENVELOPE_READY_FOR_HUMAN_REVIEW"
        if snapshot_within_limit and candidate_covers_snapshot
        else "BLOCKED_FRESH_SNAPSHOT_EXCEEDS_ENVELOPE_RULE"
    )

    return {
        "schema": SCHEMA,
        "status": verdict,
        "candidate_topup_wei": str(candidate),
        "hard_wallet_ceiling_wei": str(hard_ceiling),
        "fresh_snapshot_rule_max_contingency_peak_wei": str(snapshot_limit),
        "observed_contingency_peak_wei": str(contingency_required),
        "snapshot_within_rule": snapshot_within_limit,
        "candidate_covers_snapshot": candidate_covers_snapshot,
        "human_approval_required": True,
        "funding_authorized": False,
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved": False
        },
        "truth_boundary": (
            "A ready verdict means the candidate amount is numerically sufficient "
            "for the fresh fee snapshot under the configured rule. It does not "
            "authorize wallet creation, funding, deployment, or value movement."
        )
    }


def main():
    envelope_path = Path(sys.argv[1])
    snapshot_path = Path(sys.argv[2])
    output_path = Path(
        sys.argv[3] if len(sys.argv) > 3
        else "t0-funding-envelope-validation.json"
    )

    envelope = json.loads(envelope_path.read_text(encoding="utf-8"))
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    result = validate_envelope(envelope, snapshot)

    output_path.write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8"
    )
    print(json.dumps(result, indent=2))

    if result["status"].startswith("BLOCKED_"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
