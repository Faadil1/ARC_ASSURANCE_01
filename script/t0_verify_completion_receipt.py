#!/usr/bin/env python3
import json,re,sys,urllib.request
from pathlib import Path

ARC_CHAIN_ID=5042

def rpc(url,method,params=None):
    data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params or []}).encode()
    req=urllib.request.Request(url,data=data,headers={"Content-Type":"application/json","User-Agent":"ARC_ASSURANCE_01-completion/1.0"})
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

def decode_completion(receipt,spec):
    contract=addr(spec["contract_address"])
    pid=h32(spec["policy_id"])
    funder=addr(spec["expected_sender"])
    funder_topic="0x"+"0"*24+funder[2:]
    completed=[]
    state_changed=[]
    for log in receipt.get("logs",[]):
        if addr(log["address"])!=contract: continue
        topics=[x.lower() for x in log.get("topics",[])]
        data=(log.get("data") or "0x")[2:]
        # PolicyCompleted(bytes32,address,uint256,uint256,uint256,uint256)
        if len(topics)==3 and topics[1]==pid and topics[2]==funder_topic and len(data)==64*4:
            w=[data[i*64:(i+1)*64] for i in range(4)]
            completed.append({
                "topic0":topics[0],
                "final_balance_wei":int(w[0],16),
                "chain_id":int(w[1],16),
                "completed_at_block":int(w[2],16),
                "completed_at_timestamp":int(w[3],16),
                "log_index":int(log["logIndex"],16)
            })
        # PolicyStateChanged(bytes32,uint8,uint8,uint256,uint256)
        if len(topics)==2 and topics[1]==pid and len(data)==64*4:
            w=[data[i*64:(i+1)*64] for i in range(4)]
            prev=int(w[0],16); new=int(w[1],16); chain=int(w[2],16); block=int(w[3],16)
            if prev==3 and new==4:
                state_changed.append({
                    "topic0":topics[0],
                    "previous_state":prev,
                    "new_state":new,
                    "chain_id":chain,
                    "block_number":block,
                    "log_index":int(log["logIndex"],16)
                })
    if len(completed)!=1: raise ValueError(f"POLICY_COMPLETED_LOG_COUNT:{len(completed)}")
    if len(state_changed)!=1: raise ValueError(f"POLICY_STATE_CHANGED_LOG_COUNT:{len(state_changed)}")
    return completed[0], state_changed[0]

def main(url,spec_path):
    s=json.loads(Path(spec_path).read_text())
    txh=h32(s["completion_tx_hash"]); contract=addr(s["contract_address"])
    sender=addr(s["expected_sender"]); pid=h32(s["policy_id"])
    chain=int(rpc(url,"eth_chainId"),16)
    if chain!=ARC_CHAIN_ID or chain!=int(s["chain_id"]): raise ValueError("CHAIN_MISMATCH")
    tx=rpc(url,"eth_getTransactionByHash",[txh]); rc=rpc(url,"eth_getTransactionReceipt",[txh])
    if not tx or not rc: raise ValueError("TX_OR_RECEIPT_MISSING")
    if int(rc["status"],16)!=1: raise ValueError("COMPLETION_TX_REVERTED")
    if addr(tx["to"])!=contract: raise ValueError("CONTRACT_MISMATCH")
    if addr(tx["from"])!=sender: raise ValueError("SENDER_MISMATCH")
    if int(tx["nonce"],16)!=int(s["expected_nonce"]): raise ValueError("NONCE_MISMATCH")
    if int(tx["value"],16)!=int(s["expected_tx_value_wei"]): raise ValueError("TX_VALUE_MISMATCH")
    selector,call_pid=decode_call(tx["input"])
    if call_pid!=pid: raise ValueError("POLICY_ID_MISMATCH")
    completed,state_changed=decode_completion(rc,s)
    block=int(rc["blockNumber"],16)
    if completed["final_balance_wei"]!=0: raise ValueError("FINAL_BALANCE_NOT_ZERO")
    if completed["chain_id"]!=ARC_CHAIN_ID or completed["completed_at_block"]!=block: raise ValueError("COMPLETED_EVENT_MISMATCH")
    if state_changed["chain_id"]!=ARC_CHAIN_ID or state_changed["block_number"]!=block: raise ValueError("STATE_EVENT_MISMATCH")

    print(json.dumps({
        "schema":"ARC_ASSURANCE_T0_COMPLETION_RECEIPT_V1",
        "chain_id":chain,
        "transaction_hash":txh,
        "status":1,
        "block_number":block,
        "contract_address":contract,
        "sender":sender,
        "nonce":int(tx["nonce"],16),
        "tx_value_wei":"0",
        "function_selector":selector,
        "policy_id":pid,
        "policy_completed_event":completed,
        "policy_state_changed_event":state_changed,
        "receipt_verified":True,
        "safety":{"private_key_consumed":False,"transaction_signed":False,"transaction_broadcast":False,"funds_moved_by_verifier":False}
    },indent=2))

if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("usage: verifier <rpc> <spec>")
    main(sys.argv[1],sys.argv[2])
