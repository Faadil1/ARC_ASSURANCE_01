#!/usr/bin/env python3
import json,re,sys,urllib.request
from pathlib import Path
ARC_CHAIN_ID=5042
def rpc(url,m,p=None):
    data=json.dumps({"jsonrpc":"2.0","id":1,"method":m,"params":p or []}).encode()
    req=urllib.request.Request(url,data=data,headers={"Content-Type":"application/json","User-Agent":"ARC_ASSURANCE_01-payout/1.0"})
    with urllib.request.urlopen(req,timeout=20) as r: body=json.loads(r.read().decode())
    if "error" in body: raise RuntimeError(body["error"])
    return body["result"]
def addr(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}",v or ""): raise ValueError(f"BAD_ADDR:{v}")
    return v.lower()
def h32(v):
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}",v or ""): raise ValueError(f"BAD_H32:{v}")
    return v.lower()
def decode_input(v):
    h=v[2:] if v.startswith("0x") else v
    if len(h)!=72: raise ValueError(f"BAD_CALLDATA_LEN:{len(h)}")
    return "0x"+h[:8], "0x"+h[8:].lower()
def decode_payment(receipt,spec):
    contract=addr(spec["contract_address"]); pid=h32(spec["policy_id"])
    rec_topic="0x"+"0"*24+addr(spec["expected_sender"])[2:]
    # payout recipient == funder == sender in this T0 policy
    for log in receipt.get("logs",[]):
        if addr(log["address"])!=contract: continue
        topics=[x.lower() for x in log.get("topics",[])]
        if len(topics)!=4 or topics[1]!=pid or topics[2]!=rec_topic or topics[3]!=rec_topic: continue
        data=log["data"][2:]
        if len(data)!=64*8: continue
        w=[data[i*64:(i+1)*64] for i in range(8)]
        return {
          "topic0":topics[0],
          "amount_wei":int(w[0],16),
          "unit_payout_wei":int(w[1],16),
          "custody_balance_wei":int(w[2],16),
          "remaining_wei":int(w[3],16),
          "total_paid_out_wei":int(w[4],16),
          "chain_id":int(w[5],16),
          "paid_at_block":int(w[6],16),
          "paid_at_timestamp":int(w[7],16),
          "log_index":int(log["logIndex"],16)
        }
    raise ValueError("PAYMENT_RELEASED_EVENT_NOT_FOUND")
def main(url,path):
    s=json.loads(Path(path).read_text())
    txh=h32(s["payout_tx_hash"]); contract=addr(s["contract_address"]); sender=addr(s["expected_sender"])
    chain=int(rpc(url,"eth_chainId"),16)
    if chain!=ARC_CHAIN_ID or chain!=int(s["chain_id"]): raise ValueError("CHAIN_MISMATCH")
    tx=rpc(url,"eth_getTransactionByHash",[txh]); rc=rpc(url,"eth_getTransactionReceipt",[txh])
    if not tx or not rc: raise ValueError("TX_OR_RECEIPT_MISSING")
    if int(rc["status"],16)!=1: raise ValueError("TX_REVERTED")
    if addr(tx["to"])!=contract: raise ValueError("CONTRACT_MISMATCH")
    if addr(tx["from"])!=sender: raise ValueError("SENDER_MISMATCH")
    if int(tx["nonce"],16)!=int(s["expected_nonce"]): raise ValueError("NONCE_MISMATCH")
    if int(tx["value"],16)!=int(s["expected_tx_value_wei"]): raise ValueError("TX_VALUE_MISMATCH")
    selector,pid=decode_input(tx["input"])
    if pid!=h32(s["policy_id"]): raise ValueError("POLICY_ID_MISMATCH")
    ev=decode_payment(rc,s)
    ep=int(s["expected_payout_wei"]); er=int(s["expected_remaining_wei"])
    if ev["amount_wei"]!=ep or ev["unit_payout_wei"]!=ep: raise ValueError("PAYOUT_MISMATCH")
    if ev["remaining_wei"]!=er or ev["custody_balance_wei"]!=er: raise ValueError("REMAINING_MISMATCH")
    if ev["total_paid_out_wei"]!=ep or ev["chain_id"]!=ARC_CHAIN_ID: raise ValueError("EVENT_MISMATCH")
    if ev["paid_at_block"]!=int(rc["blockNumber"],16): raise ValueError("BLOCK_MISMATCH")
    out={
      "schema":"ARC_ASSURANCE_T0_PAYOUT_RECEIPT_V1","chain_id":chain,"transaction_hash":txh,
      "status":1,"block_number":int(rc["blockNumber"],16),"contract_address":contract,
      "sender":sender,"nonce":int(tx["nonce"],16),"tx_value_wei":"0","function_selector":selector,
      "policy_id":pid,"payment_released_event":ev,"receipt_verified":True,
      "safety":{"private_key_consumed":False,"transaction_signed":False,"transaction_broadcast":False,"funds_moved_by_verifier":False}
    }
    print(json.dumps(out,indent=2))
if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("usage: verifier <rpc> <spec>")
    main(sys.argv[1],sys.argv[2])
