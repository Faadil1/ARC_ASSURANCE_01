#!/usr/bin/env python3
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

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
            "User-Agent": "ARC_ASSURANCE_01-runtime-binding/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    if "error" in body:
        raise RuntimeError(body["error"])
    return body["result"]

def strip_solidity_cbor(bytecode_hex):
    h = bytecode_hex[2:] if bytecode_hex.startswith("0x") else bytecode_hex
    raw = bytes.fromhex(h)
    if len(raw) < 2:
        raise ValueError("BYTECODE_TOO_SHORT")
    metadata_len = int.from_bytes(raw[-2:], "big")
    cut = metadata_len + 2
    if cut >= len(raw):
        raise ValueError(f"INVALID_METADATA_LENGTH:{metadata_len}")
    return raw[:-cut], raw[-cut:], metadata_len

def deployed_object(artifact):
    db = artifact.get("deployedBytecode")
    if isinstance(db, dict):
        obj = db.get("object")
    else:
        obj = db
    if not obj:
        raise ValueError("DEPLOYED_BYTECODE_MISSING_FROM_ARTIFACT")
    return obj

def sha256(b):
    return hashlib.sha256(b).hexdigest()

def main(rpc_url, contract, artifact_path):
    artifact = json.loads(Path(artifact_path).read_text(encoding="utf-8"))
    compiled_hex = deployed_object(artifact)
    onchain_hex = rpc_call(rpc_url, "eth_getCode", [contract, "latest"])
    if not onchain_hex or onchain_hex in ("0x", "0x0", "0x00"):
        raise ValueError("NO_ONCHAIN_CODE")

    compiled_exec, compiled_meta, compiled_meta_len = strip_solidity_cbor(compiled_hex)
    onchain_exec, onchain_meta, onchain_meta_len = strip_solidity_cbor(onchain_hex)

    executable_match = compiled_exec == onchain_exec
    if not executable_match:
        raise ValueError("EXECUTABLE_RUNTIME_BYTECODE_MISMATCH")

    out = {
        "schema": "ARC_ASSURANCE_T0_RUNTIME_SOURCE_BINDING_V1",
        "contract_address": contract.lower(),
        "artifact": artifact_path,
        "compiled_runtime_bytes": len(bytes.fromhex(compiled_hex[2:] if compiled_hex.startswith("0x") else compiled_hex)),
        "onchain_runtime_bytes": len(bytes.fromhex(onchain_hex[2:])),
        "compiled_metadata_bytes": compiled_meta_len + 2,
        "onchain_metadata_bytes": onchain_meta_len + 2,
        "compiled_executable_bytes": len(compiled_exec),
        "onchain_executable_bytes": len(onchain_exec),
        "compiled_executable_sha256": sha256(compiled_exec),
        "onchain_executable_sha256": sha256(onchain_exec),
        "executable_runtime_match": executable_match,
        "metadata_equal": compiled_meta == onchain_meta,
        "truth_boundary": "Executable runtime is compared after stripping Solidity CBOR metadata. Metadata may differ because Remix and repo source paths differ."
    }
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: t0_verify_runtime_source_binding.py <rpc-url> <contract> <artifact-json>")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
