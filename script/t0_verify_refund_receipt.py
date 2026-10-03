#!/usr/bin/env python3
import json,re,sys,urllib.request
from pathlib import Path

ARC_CHAIN_ID=5042

def rpc(url, method, params=None):
    payload=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params or []}).encode()
    req=urllib.request.Request(url,data=payload,headers={"Content-Type":"application/json","User-Agent":"ARC_ASSURANCE_01-refund/1.0"})
    with urllib.request.urlopen(req,timeout=20) as resp:
        body=json.loads(resp.read().decode())
    if "error" in body:
        raise RuntimeError(f"RPC_{method}_ERROR:{body['error']}")
    return body["result"]

def addr(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}",v or ""): raise ValueError(f"BAD_ADDR:{v}")
    return v.lower()

def h32(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}",v or ""): raise ValueError(f"BAD_H32:{v}")
    return v.lower()

def decode_call(v):
    h=v[2:] if v.startswith("0x") else v
    if len(h)!=72: raise ValueError(f"BAD_CALLDATA_LEN:{len(h)}")
    return "0x"+h[:8], "0x"+h[8:].lower()

def decode_refund_event(receipt,spec):
    contract=addr(spec["contract_address"])
    pid=h32(spec["policy_id"])
    funder=addr(spec["expected_sender"])
    funder_topic="0x"+"0"*24+funder[2:]
    matches=[]
    for log in receipt.get("logs",[]):
        if addr(log["address"])!=contract: continue
        topics=[x.lower() for x in log.get("topics",[])]
        data=(log.get("data") or "0x")[2:]
        # RemainingFundsRefunded(bytes32,address,address,uint256,uint256,uint256,uint256,uint256,uint256)
        # indexed: policyId, funder, recipient
        if len(topics)==4 and topics[1]==pid and topics[2]==funder_topic and topics[3]==funder_topic and len(data)==64*6:
            w=[data[i*64:(i+1)*64] for i in range(6)]
            matches.append({
                "topic0":topics[0],
                "amount_wei":int(w[0],16),
                "custody_balance_wei":int(w[1],16),
                "total_refunded_wei":int(w[2],16),
                "chain_id":int(w[3],16),
                "refunded_at_block":int(w[4],16),
                "refunded_at_timestamp":int(w[5],16),
                "log_index":int(log["logIndex"],16)
            })
    if len(matches)!=1:
        raise ValueError(f"REMAINING_FUNDS_REFUNDED_LOG_COUNT:{len(matches)}")
    return matches[0]

def main(url,spec_path):
    s=json.loads(Path(spec_path).read_text())
    txh=h32(s["refund_tx_hash"]); contract=addr(s["contract_address"]); sender=addr(s["expected_sender"])
    pid=h32(s["policy_id"]); expected=int(s["expected_refund_wei"])
    chain=int(rpc(url,"eth_chainId"),16)
    if chain!=ARC_CHAIN_ID or chain!=int(s["chain_id"]): raise ValueError("CHAIN_MISMATCH")
    tx=rpc(url,"eth_getTransactionByHash",[txh]); rc=rpc(url,"eth_getTransactionReceipt",[txh])
    if not tx or not rc: raise ValueError("TX_OR_RECEIPT_MISSING")
    if int(rc["status"],16)!=1: raise ValueError("REFUND_TX_REVERTED")
    if addr(tx["to"])!=contract: raise ValueError("CONTRACT_MISMATCH")
    if addr(tx["from"])!=sender: raise ValueError("SENDER_MISMATCH")
    if int(tx["nonce"],16)!=int(s["expected_nonce"]): raise ValueError("NONCE_MISMATCH")
    if int(tx["value"],16)!=int(s["expected_tx_value_wei"]): raise ValueError("TX_VALUE_MISMATCH")
    selector,call_pid=decode_call(tx["input"])
    if call_pid!=pid: raise ValueError("POLICY_ID_MISMATCH")
    ev=decode_refund_event(rc,s)
    if ev["amount_wei"]!=expected: raise ValueError("REFUND_AMOUNT_MISMATCH")
    if ev["custody_balance_wei"]!=0: raise ValueError("POST_REFUND_CUSTODY_NOT_ZERO")
    if ev["total_refunded_wei"]!=expected: raise ValueError("TOTAL_REFUNDED_MISMATCH")
    if ev["chain_id"]!=ARC_CHAIN_ID: raise ValueError("EVENT_CHAIN_MISMATCH")
    if ev["refunded_at_block"]!=int(rc["blockNumber"],16): raise ValueError("EVENT_BLOCK_MISMATCH")
    print(json.dumps({
        "schema":"ARC_ASSURANCE_T0_REFUND_RECEIPT_V1",
        "chain_id":chain,
        "transaction_hash":txh,
        "status":1,
        "block_number":int(rc["blockNumber"],16),
        "contract_address":contract,
        "sender":sender,
        "nonce":int(tx["nonce"],16),
        "tx_value_wei":"0",
        "function_selector":selector,
        "policy_id":pid,
        "remaining_funds_refunded_event":ev,
        "receipt_verified":True,
        "safety":{"private_key_consumed":False,"transaction_signed":False,"transaction_broadcast":False,"funds_moved_by_verifier":False}
    },indent=2))

if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("usage: verifier <rpc> <spec>")
    main(sys.argv[1],sys.argv[2])
