#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

EXPECTED_CHAIN_ID = 5042
EXPECTED_USDC = "0x3600000000000000000000000000000000000000"
EXPECTED_AUTHORITY = "0x2ca7ba27ab8686f3a073c053fad6258c003a02bb"
MAX_POLICY_CAP_WEI = 50_000_000_000_000_000
SUBMISSION_DEADLINE_UTC = 1792036740  # 2026-10-15T03:59:00Z


def parse_env(path):
    out = {}
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k] = v
    return out


def fail(msg):
    raise SystemExit(f"DEPLOYMENT_CONFIG_INVALID:{msg}")


def main(cfg_path, env_path):
    cfg = json.loads(Path(cfg_path).read_text(encoding="utf-8"))
    env = parse_env(env_path)

    if cfg["network"]["chain_id"] != EXPECTED_CHAIN_ID:
        fail("chain_id")
    if cfg["network"]["usdc_interface"].lower() != EXPECTED_USDC:
        fail("usdc_interface")

    authority = cfg["authority_address"].lower()
    funder = cfg["funder_address"].lower()
    recipient = cfg["payout_recipient_address"].lower()

    addr_re = re.compile(r"^0x[0-9a-f]{40}$")
    for label, addr in [("authority", authority), ("funder", funder), ("recipient", recipient)]:
        if not addr_re.fullmatch(addr):
            fail(label)

    if authority != EXPECTED_AUTHORITY:
        fail("authority_not_t0_wallet")
    if funder != authority:
        fail("funder_not_authority")

    policy_id = cfg["policy_id"].lower()
    if not re.fullmatch(r"0x[0-9a-f]{64}", policy_id) or int(policy_id, 16) == 0:
        fail("policy_id")

    fund = int(cfg["fund_amount_wei"])
    payout = int(cfg["unit_payout_wei"])
    refund = int(cfg["expected_refund_wei"])
    cap = int(cfg["deployment_spend_cap_wei"])
    expiry = int(cfg["expiry_unix"])

    if fund <= 0 or payout <= 0 or payout > fund:
        fail("amount_ordering")
    if refund != fund - payout:
        fail("refund_math")
    if fund > cap or cap != MAX_POLICY_CAP_WEI:
        fail("spend_cap")
    if expiry <= SUBMISSION_DEADLINE_UTC:
        fail("expiry_not_after_submission")

    expected_env = {
        "ARC_MAINNET_RPC_URL": cfg["network"]["rpc"],
        "ARC_USDC_ADDRESS": cfg["network"]["usdc_interface"],
        "T0_AUTHORITY_ADDRESS": cfg["authority_address"],
        "T0_FUNDER_ADDRESS": cfg["funder_address"],
        "T0_PAYOUT_RECIPIENT_ADDRESS": cfg["payout_recipient_address"],
        "T0_POLICY_ID": cfg["policy_id"],
        "T0_FUND_AMOUNT_WEI": cfg["fund_amount_wei"],
        "T0_UNIT_PAYOUT_WEI": cfg["unit_payout_wei"],
        "T0_EXPIRY": str(cfg["expiry_unix"]),
        "T0_CONFIRM_MAINNET": "0",
    }
    for key, expected in expected_env.items():
        if env.get(key) != str(expected):
            fail(f"env_mismatch:{key}")

    if "PRIVATE_KEY" in env:
        fail("public_env_must_not_contain_private_key")

    print(json.dumps({
        "schema": "ARC_ASSURANCE_T0_DEPLOYMENT_CONFIG_CHECK_V1",
        "valid": True,
        "chain_id": EXPECTED_CHAIN_ID,
        "authority": authority,
        "funder": funder,
        "payout_recipient": recipient,
        "policy_id": policy_id,
        "fund_amount_wei": fund,
        "unit_payout_wei": payout,
        "expected_refund_wei": refund,
        "expiry_unix": expiry,
        "private_key_present": False,
        "mainnet_confirmation_default": 0
    }, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: t0_validate_deployment_config.py <config-json> <public-env>")
    main(sys.argv[1], sys.argv[2])
