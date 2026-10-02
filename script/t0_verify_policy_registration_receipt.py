#!/usr/bin/env python3
import json
import re
import sys
import urllib.request
from pathlib import Path

ARC_CHAIN_ID = 5042

def rpc_call(rpc_url, method, params=None):
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }).encode("utf-8")
    req = urllib.request.Request(
        rpc_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ARC_ASSURANCE_01-policy-registration-receipt/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    if "error" in body:
        raise RuntimeError(f"RPC_{method}_ERROR:{body['error']}")
    return body["result"]

def norm_addr(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}", v or ""):
        raise ValueError(f"INVALID_ADDRESS:{v}")
    return v.lower()

def norm_hash(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", v or ""):
        raise ValueError(f"INVALID_TX_HASH:{v}")
    return v.lower()

def norm_bytes32(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", v or ""):
        raise ValueError(f"INVALID_BYTES32:{v}")
    return v.lower()

def addr_from_word(word):
    if len(word) != 64 or int(word[:24], 16) != 0:
        raise ValueError("BAD_ADDRESS_WORD")
    return "0x" + word[-40:].lower()

def decode_tx_args(input_hex):
    h = input_hex[2:] if input_hex.startswith("0x") else input_hex
    if len(h) != 8 + 64 * 6:
        raise ValueError(f"UNEXPECTED_CALLDATA_LENGTH:{len(h)}")
    selector = "0x" + h[:8]
    words = [h[8+i*64:8+(i+1)*64] for i in range(6)]
    return {
        "selector": selector,
        "policy_id": "0x" + words[0].lower(),
        "funder": addr_from_word(words[1]),
        "payout_recipient": addr_from_word(words[2]),
        "max_spend_cap_wei": int(words[3], 16),
        "unit_payout_wei": int(words[4], 16),
        "expiry_unix": int(words[5], 16),
    }

def decode_policy_created_log(receipt, spec):
    contract = norm_addr(spec["contract_address"])
    policy_id = norm_bytes32(spec["policy_id"])
    funder_topic = "0x" + ("0" * 24) + norm_addr(spec["funder"])[2:]
    recipient_topic = "0x" + ("0" * 24) + norm_addr(spec["payout_recipient"])[2:]
    for log in receipt.get("logs", []):
        if norm_addr(log["address"]) != contract:
            continue
        topics = [t.lower() for t in log.get("topics", [])]
        if len(topics) != 4:
            continue
        if topics[1] != policy_id:
            continue
        if topics[2] != funder_topic or topics[3] != recipient_topic:
            continue
        data = log.get("data", "0x")
        h = data[2:] if data.startswith("0x") else data
        if len(h) != 64 * 6:
            raise ValueError(f"POLICY_CREATED_DATA_LENGTH:{len(h)}")
        words = [h[i*64:(i+1)*64] for i in range(6)]
        return {
            "topic0": topics[0],
            "max_spend_cap_wei": int(words[0], 16),
            "unit_payout_wei": int(words[1], 16),
            "expiry_unix": int(words[2], 16),
            "chain_id": int(words[3], 16),
            "created_at_block": int(words[4], 16),
            "created_at_timestamp": int(words[5], 16),
            "log_index": int(log["logIndex"], 16),
        }
    raise ValueError("POLICY_CREATED_LOG_NOT_FOUND")

def main(rpc_url, spec_path):
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    tx_hash = norm_hash(spec["registration_tx_hash"])
    contract = norm_addr(spec["contract_address"])
    sender = norm_addr(spec["expected_sender"])

    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != int(spec["chain_id"]) or chain_id != ARC_CHAIN_ID:
        raise ValueError(f"CHAIN_ID_MISMATCH:{chain_id}")

    tx = rpc_call(rpc_url, "eth_getTransactionByHash", [tx_hash])
    receipt = rpc_call(rpc_url, "eth_getTransactionReceipt", [tx_hash])
    if tx is None or receipt is None:
        raise ValueError("TX_OR_RECEIPT_NOT_FOUND")

    if int(receipt["status"], 16) != 1:
        raise ValueError("POLICY_REGISTRATION_REVERTED")
    if norm_addr(tx["to"]) != contract:
        raise ValueError(f"CONTRACT_MISMATCH:{tx['to']}")
    if norm_addr(tx["from"]) != sender:
        raise ValueError(f"SENDER_MISMATCH:{tx['from']}")
    if int(tx["nonce"], 16) != int(spec["expected_nonce"]):
        raise ValueError(f"NONCE_MISMATCH:{int(tx['nonce'],16)}")
    if int(tx["value"], 16) != int(spec["expected_tx_value_wei"]):
        raise ValueError(f"TX_VALUE_MISMATCH:{int(tx['value'],16)}")

    args = decode_tx_args(tx["input"])
    expected = {
        "policy_id": norm_bytes32(spec["policy_id"]),
        "funder": norm_addr(spec["funder"]),
        "payout_recipient": norm_addr(spec["payout_recipient"]),
        "max_spend_cap_wei": int(spec["max_spend_cap_wei"]),
        "unit_payout_wei": int(spec["unit_payout_wei"]),
        "expiry_unix": int(spec["expiry_unix"]),
    }
    for k, v in expected.items():
        if args[k] != v:
            raise ValueError(f"ARG_MISMATCH:{k}:{args[k]}:{v}")

    ev = decode_policy_created_log(receipt, spec)
    if ev["max_spend_cap_wei"] != expected["max_spend_cap_wei"]:
        raise ValueError("EVENT_MAX_SPEND_MISMATCH")
    if ev["unit_payout_wei"] != expected["unit_payout_wei"]:
        raise ValueError("EVENT_UNIT_PAYOUT_MISMATCH")
    if ev["expiry_unix"] != expected["expiry_unix"]:
        raise ValueError("EVENT_EXPIRY_MISMATCH")
    if ev["chain_id"] != ARC_CHAIN_ID:
        raise ValueError("EVENT_CHAIN_ID_MISMATCH")
    if ev["created_at_block"] != int(receipt["blockNumber"], 16):
        raise ValueError("EVENT_BLOCK_MISMATCH")

    out = {
        "schema": "ARC_ASSURANCE_T0_POLICY_REGISTRATION_RECEIPT_V1",
        "chain_id": chain_id,
        "transaction_hash": tx_hash,
        "status": 1,
        "block_number": int(receipt["blockNumber"], 16),
        "contract_address": contract,
        "sender": sender,
        "nonce": int(tx["nonce"], 16),
        "tx_value_wei": str(int(tx["value"], 16)),
        "function_selector": args["selector"],
        "policy": {
            "policy_id": expected["policy_id"],
            "funder": expected["funder"],
            "payout_recipient": expected["payout_recipient"],
            "max_spend_cap_wei": str(expected["max_spend_cap_wei"]),
            "unit_payout_wei": str(expected["unit_payout_wei"]),
            "expiry_unix": expected["expiry_unix"],
        },
        "policy_created_event": ev,
        "receipt_verified": True,
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved_by_verifier": False,
        },
    }
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: t0_verify_policy_registration_receipt.py <rpc-url> <spec-json>")
    main(sys.argv[1], sys.argv[2])
