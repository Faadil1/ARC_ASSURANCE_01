#!/usr/bin/env python3
import json
import re
import sys
import urllib.request
from decimal import Decimal

ARC_CHAIN_ID = 5042
NATIVE_DECIMALS = 18


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
            "User-Agent": "ARC_ASSURANCE_01-topup-receipt/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    if "error" in body:
        raise RuntimeError(f"RPC_{method}_ERROR:{body['error']}")
    return body["result"]


def normalize_address(address):
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}", address or ""):
        raise ValueError("INVALID_ADDRESS")
    return address.lower()


def normalize_hash(tx_hash):
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", tx_hash or ""):
        raise ValueError("INVALID_TRANSACTION_HASH")
    return tx_hash.lower()


def to_native_units(amount):
    return int(Decimal(str(amount)) * (Decimal(10) ** NATIVE_DECIMALS))


def verify(rpc_url, input_path):
    with open(input_path, "r", encoding="utf-8") as f:
        spec = json.load(f)

    tx_hash = normalize_hash(spec["transaction_hash"])
    destination = normalize_address(spec["destination_public_wallet"])
    expected_chain = int(spec["chain_id"])
    expected_sent = to_native_units(spec["observed_sent_amount_usdc"])
    minimum = to_native_units(spec["authorized_amount_usdc"])
    ceiling = to_native_units(spec["hard_ceiling_usdc"])

    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != expected_chain or chain_id != ARC_CHAIN_ID:
        raise ValueError(f"CHAIN_ID_MISMATCH:{chain_id}")

    tx = rpc_call(rpc_url, "eth_getTransactionByHash", [tx_hash])
    if tx is None:
        raise ValueError("TRANSACTION_NOT_FOUND")

    receipt = rpc_call(rpc_url, "eth_getTransactionReceipt", [tx_hash])
    if receipt is None:
        raise ValueError("RECEIPT_NOT_FOUND")

    tx_to = normalize_address(tx["to"])
    receipt_to = normalize_address(receipt["to"])
    value = int(tx["value"], 16)
    status = int(receipt["status"], 16)
    block_number = int(receipt["blockNumber"], 16)
    pending_nonce = None

    if tx_to != destination or receipt_to != destination:
        raise ValueError("DESTINATION_MISMATCH")
    if status != 1:
        raise ValueError("TRANSACTION_REVERTED")
    if value != expected_sent:
        raise ValueError(f"VALUE_MISMATCH:{value}")
    if not (minimum <= value <= ceiling):
        raise ValueError("VALUE_OUTSIDE_APPROVED_BOUNDARY")

    wallet_balance = int(
        rpc_call(rpc_url, "eth_getBalance", [destination, "latest"]), 16
    )
    pending_nonce = int(
        rpc_call(rpc_url, "eth_getTransactionCount", [destination, "pending"]), 16
    )
    code = rpc_call(rpc_url, "eth_getCode", [destination, "latest"])
    is_eoa = code in ("0x", "0x0", "0x00")

    return {
        "schema": "ARC_ASSURANCE_T0_TOPUP_RECEIPT_V1",
        "chain_id": chain_id,
        "transaction_hash": tx_hash,
        "transaction_status": status,
        "block_number": block_number,
        "from": normalize_address(tx["from"]),
        "to": tx_to,
        "value_wei": str(value),
        "value_usdc_native": format(
            Decimal(value) / (Decimal(10) ** NATIVE_DECIMALS), "f"
        ),
        "wallet_balance_wei": str(wallet_balance),
        "wallet_balance_usdc_native": format(
            Decimal(wallet_balance) / (Decimal(10) ** NATIVE_DECIMALS), "f"
        ),
        "wallet_pending_nonce": pending_nonce,
        "wallet_code": code,
        "wallet_is_eoa": is_eoa,
        "authorized_amount_usdc": str(spec["authorized_amount_usdc"]),
        "observed_sent_amount_usdc": str(spec["observed_sent_amount_usdc"]),
        "authorization_variance_usdc": str(spec["authorization_variance_usdc"]),
        "hard_ceiling_usdc": str(spec["hard_ceiling_usdc"]),
        "topup_receipt_verified": True,
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved_by_verifier": False,
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python3 script/t0_verify_topup_receipt.py "
            "<rpc-url> <input-json>",
            file=sys.stderr,
        )
        raise SystemExit(2)

    result = verify(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2))
