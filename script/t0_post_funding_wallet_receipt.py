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
    request = urllib.request.Request(
        rpc_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ARC_ASSURANCE_01-post-funding-receipt/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    if "error" in body:
        raise RuntimeError(f"RPC_{method}_ERROR:{body['error']}")
    return body["result"]


def normalize_address(address):
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}", address or ""):
        raise ValueError("INVALID_PUBLIC_WALLET_ADDRESS")
    return address.lower()


def to_native_units(amount):
    return int(Decimal(amount) * (Decimal(10) ** NATIVE_DECIMALS))


def inspect_post_funding(rpc_url, address, min_usdc="0.50", hard_ceiling_usdc="5.00"):
    address = normalize_address(address)
    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != ARC_CHAIN_ID:
        raise ValueError(f"CHAIN_ID_NOT_ARC_MAINNET:{chain_id}")

    block_number = int(rpc_call(rpc_url, "eth_blockNumber"), 16)
    balance = int(rpc_call(rpc_url, "eth_getBalance", [address, "latest"]), 16)
    pending_nonce = int(
        rpc_call(rpc_url, "eth_getTransactionCount", [address, "pending"]), 16
    )
    code = rpc_call(rpc_url, "eth_getCode", [address, "latest"])

    min_units = to_native_units(min_usdc)
    ceiling_units = to_native_units(hard_ceiling_usdc)

    is_eoa = code in ("0x", "0x0", "0x00")
    fresh_nonce = pending_nonce == 0
    minimum_met = balance >= min_units
    within_hard_ceiling = balance <= ceiling_units
    verified = is_eoa and fresh_nonce and minimum_met and within_hard_ceiling

    balance_usdc = Decimal(balance) / (Decimal(10) ** NATIVE_DECIMALS)

    return {
        "schema": "ARC_ASSURANCE_T0_POST_FUNDING_WALLET_RECEIPT_V1",
        "chain_id": chain_id,
        "block_number": block_number,
        "wallet_address": address,
        "balance_wei": str(balance),
        "balance_usdc_native": format(balance_usdc, "f"),
        "pending_nonce": pending_nonce,
        "code": code,
        "is_eoa": is_eoa,
        "is_fresh_nonce": fresh_nonce,
        "minimum_expected_usdc": min_usdc,
        "minimum_met": minimum_met,
        "hard_ceiling_usdc": hard_ceiling_usdc,
        "within_hard_ceiling": within_hard_ceiling,
        "post_funding_receipt_verified": verified,
        "verdict": (
            "POST_FUNDING_WALLET_RECEIPT_PROVEN"
            if verified
            else "POST_FUNDING_WALLET_RECEIPT_FAILED"
        ),
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved": False,
        },
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python3 script/t0_post_funding_wallet_receipt.py "
            "<rpc-url> <public-address> [min-usdc] [hard-ceiling-usdc]",
            file=sys.stderr,
        )
        raise SystemExit(2)

    result = inspect_post_funding(
        sys.argv[1],
        sys.argv[2],
        sys.argv[3] if len(sys.argv) > 3 else "0.50",
        sys.argv[4] if len(sys.argv) > 4 else "5.00",
    )
    print(json.dumps(result, indent=2))
    if not result["post_funding_receipt_verified"]:
        raise SystemExit(1)
