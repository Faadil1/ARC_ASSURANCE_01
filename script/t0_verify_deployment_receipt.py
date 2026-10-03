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
            "User-Agent": "ARC_ASSURANCE_01-deployment-receipt/1.0",
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

def main(rpc_url, spec_path):
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    tx_hash = norm_hash(spec["deployment_tx_hash"])
    contract = norm_addr(spec["contract_address"])
    deployer = norm_addr(spec["expected_deployer"])

    chain_id = int(rpc_call(rpc_url, "eth_chainId"), 16)
    if chain_id != int(spec["chain_id"]) or chain_id != ARC_CHAIN_ID:
        raise ValueError(f"CHAIN_ID_MISMATCH:{chain_id}")

    tx = rpc_call(rpc_url, "eth_getTransactionByHash", [tx_hash])
    if tx is None:
        raise ValueError("TRANSACTION_NOT_FOUND")
    receipt = rpc_call(rpc_url, "eth_getTransactionReceipt", [tx_hash])
    if receipt is None:
        raise ValueError("RECEIPT_NOT_FOUND")

    status = int(receipt["status"], 16)
    if status != 1:
        raise ValueError("DEPLOYMENT_TX_REVERTED")

    if tx.get("to") is not None:
        raise ValueError(f"TX_NOT_CONTRACT_CREATION:{tx.get('to')}")
    if norm_addr(tx["from"]) != deployer:
        raise ValueError(f"DEPLOYER_MISMATCH:{tx['from']}")
    if int(tx["value"], 16) != int(spec["expected_tx_value_wei"]):
        raise ValueError(f"TX_VALUE_MISMATCH:{int(tx['value'],16)}")
    if int(tx["nonce"], 16) != int(spec["expected_nonce"]):
        raise ValueError(f"NONCE_MISMATCH:{int(tx['nonce'],16)}")

    receipt_contract = norm_addr(receipt["contractAddress"])
    if receipt_contract != contract:
        raise ValueError(f"CONTRACT_ADDRESS_MISMATCH:{receipt_contract}")

    code = rpc_call(rpc_url, "eth_getCode", [contract, "latest"])
    if not code or code in ("0x", "0x0", "0x00"):
        raise ValueError("NO_RUNTIME_CODE_AT_CONTRACT")

    block_number = int(receipt["blockNumber"], 16)
    gas_used = int(receipt["gasUsed"], 16)
    effective_gas_price = int(receipt.get("effectiveGasPrice", "0x0"), 16)

    out = {
        "schema": "ARC_ASSURANCE_T0_DEPLOYMENT_RECEIPT_V1",
        "chain_id": chain_id,
        "transaction_hash": tx_hash,
        "transaction_status": status,
        "block_number": block_number,
        "deployer": norm_addr(tx["from"]),
        "nonce": int(tx["nonce"], 16),
        "tx_value_wei": str(int(tx["value"], 16)),
        "contract_address": contract,
        "runtime_code_bytes": (len(code) - 2) // 2,
        "gas_used": gas_used,
        "effective_gas_price_wei": str(effective_gas_price),
        "receipt_verified": True,
        "safety": {
            "private_key_consumed": False,
            "transaction_signed": False,
            "transaction_broadcast": False,
            "funds_moved_by_verifier": False
        }
    }
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: t0_verify_deployment_receipt.py <rpc-url> <spec-json>")
    main(sys.argv[1], sys.argv[2])
