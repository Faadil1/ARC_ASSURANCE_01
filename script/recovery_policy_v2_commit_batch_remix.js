// ARC_ASSURANCE_01 — RECOVERY POLICY V2 EXACT commitBatch — REMIX/METAMASK
// ONE-SHOT AUTHORIZED ACTION.
// Refuses to send if any bound precondition drifts.
// Does NOT read the hidden reveal packet and does NOT authorize downstream actions.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const AUTHORITY = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";

    const V2_POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const V2_BATCH_ID = "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19";
    const V2_COMMITMENT = "0x156d26a85f7ff103de7a362e594d5411d7e8bfd702097d2e2b4a16b115185d17";

    const V1_POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
    const V1_BATCH_ID = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
    const V1_COMMITMENT = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";

    const EXPECTED_PENDING_NONCE = 12;
    const EXPECTED_CALLDATA_HASH =
      "0xbb2035436436b15588fe49896ce036d68b271f41d5499fb7297c371642e23b95";

    const abi = [
      "function authority() view returns (address)",
      "function policyCount() view returns (uint256)",
      "function totalLiability() view returns (uint256)",
      "function totalCustodyReceived() view returns (uint256)",
      "function totalValueReleased() view returns (uint256)",
      "function remainingFor(bytes32) view returns (uint256)",
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function commitBatch(bytes32,bytes32,bytes32)"
    ];

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`STOP: wrong chain ${network.chainId}; expected Arc Mainnet ${CHAIN_ID}`);
    }

    const signer = provider.getSigner();
    const sender = await signer.getAddress();
    if (sender.toLowerCase() !== AUTHORITY.toLowerCase()) {
      throw new Error(`STOP: wrong MetaMask account ${sender}; expected ${AUTHORITY}`);
    }

    const code = await provider.getCode(CONTRACT);
    if (!code || code === "0x") throw new Error("STOP: AssuranceVault code missing");

    const vaultRead = new ethers.Contract(CONTRACT, abi, provider);
    const vault = vaultRead.connect(signer);

    if ((await vaultRead.authority()).toLowerCase() !== AUTHORITY.toLowerCase()) {
      throw new Error("STOP: authority binding drift");
    }
    if (!(await vaultRead.policyCount()).eq(2)) throw new Error("STOP: policyCount drift");
    if (!(await vaultRead.totalLiability()).eq("20000000000000000")) throw new Error("STOP: totalLiability drift");
    if (!(await vaultRead.totalCustodyReceived()).eq("20000000000000000")) throw new Error("STOP: totalCustodyReceived drift");
    if (!(await vaultRead.totalValueReleased()).eq(0)) throw new Error("STOP: totalValueReleased drift");
    if (!(await provider.getBalance(CONTRACT)).eq("20000000000000000")) throw new Error("STOP: vault balance drift");

    const p2 = await vaultRead.getPolicy(V2_POLICY_ID);
    if (!p2.exists) throw new Error("STOP: v2 policy missing");
    if (p2.funder.toLowerCase() !== AUTHORITY.toLowerCase()) throw new Error("STOP: v2 funder mismatch");
    if (p2.paused || p2.closed || p2.refundIssued) throw new Error("STOP: v2 policy not usable");
    if (p2.fundedAt.eq(0) || !p2.totalFunded.eq("10000000000000000")) throw new Error("STOP: v2 funding drift");
    if (!p2.unitPayout.eq("2000000000000000")) throw new Error("STOP: v2 unit payout drift");
    if (p2.activeBatchId !== ethers.constants.HashZero) throw new Error(`STOP: v2 active batch already exists: ${p2.activeBatchId}`);
    if (!(await vaultRead.remainingFor(V2_POLICY_ID)).eq("10000000000000000")) throw new Error("STOP: v2 remaining liability drift");

    const p1 = await vaultRead.getPolicy(V1_POLICY_ID);
    const b1 = await vaultRead.getBatch(V1_POLICY_ID, V1_BATCH_ID);
    if (p1.activeBatchId.toLowerCase() !== V1_BATCH_ID.toLowerCase()) throw new Error("STOP: v1 active batch drift");
    if (Number(b1.state) !== 1) throw new Error(`STOP: v1 batch state drift: ${b1.state}`);
    if (b1.commitment.toLowerCase() !== V1_COMMITMENT.toLowerCase()) throw new Error("STOP: v1 commitment drift");
    if (!p1.totalFunded.eq("10000000000000000")) throw new Error("STOP: v1 funding drift");

    const iface = new ethers.utils.Interface(abi);
    const calldata = iface.encodeFunctionData("commitBatch", [V2_POLICY_ID, V2_BATCH_ID, V2_COMMITMENT]);
    const calldataHash = ethers.utils.keccak256(calldata);
    if (calldataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase()) {
      throw new Error(`STOP: calldata hash mismatch ${calldataHash}`);
    }

    const pendingNonce = await provider.getTransactionCount(AUTHORITY, "pending");
    if (pendingNonce !== EXPECTED_PENDING_NONCE) {
      throw new Error(`STOP: pending nonce drift ${pendingNonce}; expected ${EXPECTED_PENDING_NONCE}. Fresh preflight required.`);
    }

    await vault.callStatic.commitBatch(V2_POLICY_ID, V2_BATCH_ID, V2_COMMITMENT);
    const gasEstimate = await vault.estimateGas.commitBatch(V2_POLICY_ID, V2_BATCH_ID, V2_COMMITMENT);
    if (gasEstimate.gt(ethers.BigNumber.from("250000"))) {
      throw new Error(`STOP: gas estimate unexpectedly high: ${gasEstimate.toString()}`);
    }

    console.log("RECOVERY POLICY V2 — FINAL commitBatch PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("sender", sender);
    console.log("contract", CONTRACT);
    console.log("policy_id", V2_POLICY_ID);
    console.log("batch_id", V2_BATCH_ID);
    console.log("commitment", V2_COMMITMENT);
    console.log("pending_nonce", pendingNonce);
    console.log("calldata_keccak256", calldataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("NEXT: MetaMask will request confirmation for ONE commitBatch transaction.");

    const tx = await vault.commitBatch(V2_POLICY_ID, V2_BATCH_ID, V2_COMMITMENT);

    console.log("V2_COMMITBATCH_BROADCAST");
    console.log("tx_hash", tx.hash);
    console.log("nonce", tx.nonce);
    console.log("NO PROVIDER SIGNATURE / LOCK / REVEAL / RESOLVE SENT");

    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error(`commitBatch receipt failed: ${tx.hash}`);

    const p2After = await vaultRead.getPolicy(V2_POLICY_ID);
    const b2After = await vaultRead.getBatch(V2_POLICY_ID, V2_BATCH_ID);

    if (p2After.activeBatchId.toLowerCase() !== V2_BATCH_ID.toLowerCase()) throw new Error("POSTCHECK: v2 activeBatchId mismatch");
    if (Number(b2After.state) !== 1) throw new Error("POSTCHECK: v2 batch state is not Committed");
    if (b2After.commitment.toLowerCase() !== V2_COMMITMENT.toLowerCase()) throw new Error("POSTCHECK: v2 commitment mismatch");
    if (!(await vaultRead.totalLiability()).eq("20000000000000000")) throw new Error("POSTCHECK: totalLiability changed");
    if (!(await vaultRead.totalCustodyReceived()).eq("20000000000000000")) throw new Error("POSTCHECK: totalCustodyReceived changed");
    if (!(await vaultRead.totalValueReleased()).eq(0)) throw new Error("POSTCHECK: totalValueReleased changed");
    if (!(await provider.getBalance(CONTRACT)).eq("20000000000000000")) throw new Error("POSTCHECK: vault balance changed");

    console.log("RECOVERY POLICY V2 — commitBatch LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("tx_hash", tx.hash);
    console.log("block", receipt.blockNumber);
    console.log("status", receipt.status);
    console.log("policy_id", V2_POLICY_ID);
    console.log("batch_id", V2_BATCH_ID);
    console.log("commitment", b2After.commitment);
    console.log("batch_state", Number(b2After.state));
    console.log("AUTHORIZATION_CONSUMED: commitBatch only");
    console.log("provider signature / lock / reveal / resolve remain NOT AUTHORIZED");
  } catch (err) {
    console.error("RECOVERY POLICY V2 commitBatch STOPPED:", err);
  }
})();
