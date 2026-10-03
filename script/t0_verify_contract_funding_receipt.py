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
            "User-Agent": "ARC_ASSURANCE_01-contract-funding-receipt/1.0",
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

def decode_fund_input(input_hex):
    h = input_hex[2:] if input_hex.startswith("0x") else input_hex
    if len(h) != 8 + 64:
        raise ValueError(f"UNEXPECTED_CALLDATA_LENGTH:{len(h)}")
    return {
        "selector": "0x" + h[:8],
        "policy_id": "0x" + h[8:].lower(),
    }

def decode_policy_funded(receipt, spec):
    contract = norm_addr(spec["contract_address"])
    policy_id = norm_bytes32(spec["policy_id"])
    funder_topic = "0x" + ("0" * 24) + norm_addr(spec["expected_sender"])[2:]
    for log in receipt.get("logs", []):
        if norm_addr(log["address"]) != contract:
            continue
        topics = [t.lower() for t in log.get("topics", [])]
        if len(topics) != 3:
            continue
        if topics[1] != policy_id or topics[2] != funder_topic:
            continue
        data = log.get("data", "0x")
        h = data[2:] if data.startswith("0x") else data
        if len(h) != 64 * 6:
            continue
        words = [h[i*64:(i+1)*64] for i in range(6)]
        amount = int(words[0], 16)
        custody_balance = int(words[1], 16)
        total_funded = int(words[2], 16)
        chain_id = int(words[3], 16)
        block_number = int(words[4], 16)
        timestamp = int(words[5], 16)
        return {
            "topic0": topics[0],
            "amount_wei": amount,
            "custody_balance_wei": custody_balance,
            "total_funded_wei": total_funded,
            "chain_id": chain_id,
            "funded_at_block": block_number,
            "funded_at_timestamp": timestamp,
            "log_index": int(log["logIndex"], 16),
        }
    raise ValueError("POLICY_FUNDED_LOG_NOT_FOUND")

def main(rpc_url, spec_path):
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    tx_hash = norm_hash(spec["funding_tx_hash"])
    contract = norm_addr(spec["contract_address"])
    sender = norm_addr(spec["expected_sender"])
    policy_id = norm_bytes32(spec["policy_id"])
    expected_value = int(spec["expected_value_wei"])

    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != ARC_CHAIN_ID or chain_id != int(spec["chain_id"]):
        raise ValueError(f"CHAIN_ID_MISMATCH:{chain_id}")

    tx = rpc_call(rpc_url, "eth_getTransactionByHash", [tx_hash])
    receipt = rpc_call(rpc_url, "eth_getTransactionReceipt", [tx_hash])
    if tx is None or receipt is None:
        raise ValueError("TX_OR_RECEIPT_NOT_FOUND")

    if int(receipt["status"], 16) != 1:
        raise ValueError("FUNDING_TX_REVERTED")
    if norm_addr(tx["to"]) != contract:
        raise ValueError(f"CONTRACT_MISMATCH:{tx['to']}")
    if norm_addr(tx["from"]) != sender:
        raise ValueError(f"SENDER_MISMATCH:{tx['from']}")
    if int(tx["nonce"], 16) != int(spec["expected_nonce"]):
        raise ValueError(f"NONCE_MISMATCH:{int(tx['nonce'],16)}")
    if int(tx["value"], 16) != expected_value:
        raise ValueError(f"VALUE_MISMATCH:{int(tx['value'],16)}")

    args = decode_fund_input(tx["input"])
    if args["policy_id"] != policy_id:
        raise ValueError("POLICY_ID_MISMATCH")

    ev = decode_policy_funded(receipt, spec)
    if ev["amount_wei"] != expected_value:
        raise ValueError("EVENT_AMOUNT_MISMATCH")
    if ev["total_funded_wei"] != expected_value:
        raise ValueError("EVENT_TOTAL_FUNDED_MISMATCH")
    if ev["chain_id"] != ARC_CHAIN_ID:
        raise ValueError("EVENT_CHAIN_MISMATCH")
    if ev["funded_at_block"] != int(receipt["blockNumber"], 16):
        raise ValueError("EVENT_BLOCK_MISMATCH")

    out = {
        "schema": "ARC_ASSURANCE_T0_CONTRACT_FUNDING_RECEIPT_V1",
        "chain_id": chain_id,
        "transaction_hash": tx_hash,
        "status": 1,
        "block_number": int(receipt["blockNumber"], 16),
        "contract_address": contract,
        "sender": sender,
        "nonce": int(tx["nonce"], 16),
        "tx_value_wei": str(expected_value),
        "function_selector": args["selector"],
        "policy_id": policy_id,
        "policy_funded_event": ev,
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
        raise SystemExit("usage: t0_verify_contract_funding_receipt.py <rpc-url> <spec-json>")
    main(sys.argv[1], sys.argv[2])
