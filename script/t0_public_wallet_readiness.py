#!/usr/bin/env python3
import json
import re
import sys
import urllib.request

ARC_CHAIN_ID = 5042


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
            "User-Agent": "ARC_ASSURANCE_01-wallet-readiness/1.0",
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


def inspect_public_wallet(rpc_url, address):
    address = normalize_address(address)
    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != ARC_CHAIN_ID:
        raise ValueError(f"CHAIN_ID_NOT_ARC_MAINNET:{chain_id}")

    balance = int(rpc_call(rpc_url, "eth_getBalance", [address, "latest"]), 16)
    pending_nonce = int(
        rpc_call(rpc_url, "eth_getTransactionCount", [address, "pending"]), 16
    )
    code = rpc_call(rpc_url, "eth_getCode", [address, "latest"])

    is_eoa = code in ("0x", "0x0", "0x00")
    is_fresh_nonce = pending_nonce == 0
    is_zero_balance = balance == 0
    prefunding_ready = (
        is_eoa
        and is_fresh_nonce
        and is_zero_balance
    )

    return {
        "schema": "ARC_ASSURANCE_T0_PUBLIC_WALLET_READINESS_V1",
        "chain_id": chain_id,
        "wallet_address": address,
        "balance_wei": str(balance),
        "pending_nonce": pending_nonce,
        "code": code,
        "is_eoa": is_eoa,
        "is_fresh_nonce": is_fresh_nonce,
        "is_zero_balance_before_funding": is_zero_balance,
        "prefunding_ready": prefunding_ready,
        "verdict": (
            "PUBLIC_WALLET_READY_FOR_FUNDING_REVIEW"
            if prefunding_ready
            else "PUBLIC_WALLET_NOT_READY_FOR_FUNDING"
        ),
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved": False
        },
        "privacy_note": (
            "This checker only needs a public address. Do not provide or log "
            "the private key or seed phrase."
        )
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python3 script/t0_public_wallet_readiness.py "
            "<rpc-url> <public-address>",
            file=sys.stderr
        )
        raise SystemExit(2)
    result = inspect_public_wallet(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2))
    if not result["prefunding_ready"]:
        raise SystemExit(1)
