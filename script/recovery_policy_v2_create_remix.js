// ARC_ASSURANCE_01 — RECOVERY POLICY V2 EXACT createPolicy — REMIX/METAMASK
// ONE-SHOT AUTHORIZED ACTION.
// This script refuses to send if any bound precondition drifts.
// It does NOT fund the policy and does NOT authorize any downstream action.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const AUTHORITY = "0x2ca7ba27ab8686F3a073c053FaD6258C003a02bb";
    const FUNDER = AUTHORITY;
    const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
    const PAYOUT = "0x6B8ad09233dF44eD57B99aF8839129303955590C";
    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const V1_POLICY_ID = "0xd29987d91c313c30cea5f455634b0aca7b5b83fb82aaf273b7d8edf2dd9dcb30";
    const V1_BATCH_ID = "0x8a230c39bab845408d8ffbd8bfc978a588cab1726347145ad09a0984c27d46b7";
    const V1_COMMITMENT = "0x73a186a5be26811d7802c28a6feb6d509d26ca6a0bea44166f8206634e27fce9";
    const SCORER_ID_HASH = "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const MAX_FAILURES = 2;
    const MAX_SPEND_CAP = ethers.BigNumber.from("20000000000000000");
    const UNIT_PAYOUT = ethers.BigNumber.from("2000000000000000");
    const EXPIRY = 1792465200;
    const EXPECTED_PENDING_NONCE = 10;
    const EXPECTED_CALLDATA_HASH =
      "0x98718c6fab13f2fca8b94c91d1744c7a1d6c853c9ff1df2f6409e208b354fb66";

    const abi = [
      "function authority() view returns (address)",
      "function expectedChainId() view returns (uint256)",
      "function deploymentSpendCap() view returns (uint256)",
      "function policyCount() view returns (uint256)",
      "function totalLiability() view returns (uint256)",
      "function totalCustodyReceived() view returns (uint256)",
      "function totalValueReleased() view returns (uint256)",
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function getBatch(bytes32,bytes32) view returns (tuple(bytes32 commitment,bytes32 workId,bytes32 inputHash,bytes32 outputHash,bytes32 expectedOutputHash,bytes32 providerDigest,uint8 state,uint8 directive,uint256 committedAtBlock,uint256 outputLockedAtBlock,uint256 revealedAtBlock,uint256 resolvedAtBlock))",
      "function createPolicy(bytes32,address,address,address,bytes32,uint32,uint256,uint256,uint64)"
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
    if (!(await vaultRead.expectedChainId()).eq(CHAIN_ID)) {
      throw new Error("STOP: contract chain binding drift");
    }
    if (!(await vaultRead.deploymentSpendCap()).eq("50000000000000000")) {
      throw new Error("STOP: deployment spend cap drift");
    }
    if (!(await vaultRead.policyCount()).eq(1)) {
      throw new Error("STOP: policyCount drift; expected exactly 1 before v2");
    }
    if (!(await vaultRead.totalLiability()).eq("10000000000000000")) {
      throw new Error("STOP: totalLiability drift");
    }
    if (!(await vaultRead.totalCustodyReceived()).eq("10000000000000000")) {
      throw new Error("STOP: totalCustodyReceived drift");
    }
    if (!(await vaultRead.totalValueReleased()).eq(0)) {
      throw new Error("STOP: totalValueReleased drift");
    }
    if (!(await provider.getBalance(CONTRACT)).eq("10000000000000000")) {
      throw new Error("STOP: vault balance drift");
    }

    const v1Policy = await vaultRead.getPolicy(V1_POLICY_ID);
    const v1Batch = await vaultRead.getBatch(V1_POLICY_ID, V1_BATCH_ID);
    if (v1Policy.activeBatchId.toLowerCase() !== V1_BATCH_ID.toLowerCase()) {
      throw new Error("STOP: v1 active batch drift");
    }
    if (Number(v1Batch.state) !== 1) {
      throw new Error(`STOP: v1 batch no longer Committed; state=${v1Batch.state}`);
    }
    if (v1Batch.commitment.toLowerCase() !== V1_COMMITMENT.toLowerCase()) {
      throw new Error("STOP: v1 commitment drift");
    }

    const args = [
      POLICY_ID,
      FUNDER,
      PROVIDER,
      PAYOUT,
      SCORER_ID_HASH,
      MAX_FAILURES,
      MAX_SPEND_CAP,
      UNIT_PAYOUT,
      EXPIRY
    ];

    const iface = new ethers.utils.Interface(abi);
    const calldata = iface.encodeFunctionData("createPolicy", args);
    const calldataHash = ethers.utils.keccak256(calldata);
    if (calldataHash.toLowerCase() !== EXPECTED_CALLDATA_HASH.toLowerCase()) {
      throw new Error(`STOP: calldata hash mismatch ${calldataHash}`);
    }

    const pendingNonce = await provider.getTransactionCount(AUTHORITY, "pending");
    if (pendingNonce !== EXPECTED_PENDING_NONCE) {
      throw new Error(`STOP: pending nonce drift ${pendingNonce}; expected ${EXPECTED_PENDING_NONCE}. Fresh preflight required.`);
    }

    // eth_call / callStatic must pass immediately before wallet prompt.
    await vault.callStatic.createPolicy(...args);

    const gasEstimate = await vault.estimateGas.createPolicy(...args);
    if (gasEstimate.gt(ethers.BigNumber.from("400000"))) {
      throw new Error(`STOP: gas estimate unexpectedly high: ${gasEstimate.toString()}`);
    }

    console.log("RECOVERY POLICY V2 — FINAL PRE-BROADCAST CHECK");
    console.log("RESULT: PASS");
    console.log("chain_id", CHAIN_ID);
    console.log("sender", sender);
    console.log("contract", CONTRACT);
    console.log("policy_id", POLICY_ID);
    console.log("pending_nonce", pendingNonce);
    console.log("calldata_keccak256", calldataHash);
    console.log("gas_estimate", gasEstimate.toString());
    console.log("tx_value_wei", "0");
    console.log("NEXT: MetaMask will request confirmation for ONE createPolicy transaction.");

    const tx = await vault.createPolicy(...args);

    console.log("CREATE_POLICY_BROADCAST");
    console.log("tx_hash", tx.hash);
    console.log("nonce", tx.nonce);
    console.log("NO FUNDING OR DOWNSTREAM ACTION SENT");

    const receipt = await tx.wait();
    if (receipt.status !== 1) {
      throw new Error(`createPolicy receipt failed: ${tx.hash}`);
    }

    const p = await vaultRead.getPolicy(POLICY_ID);
    if (!p.exists) throw new Error("POSTCHECK: v2 policy missing");
    if (p.funder.toLowerCase() !== FUNDER.toLowerCase()) throw new Error("POSTCHECK: funder mismatch");
    if (p.provider.toLowerCase() !== PROVIDER.toLowerCase()) throw new Error("POSTCHECK: provider mismatch");
    if (p.payoutRecipient.toLowerCase() !== PAYOUT.toLowerCase()) throw new Error("POSTCHECK: payout mismatch");
    if (p.scorerIdHash.toLowerCase() !== SCORER_ID_HASH.toLowerCase()) throw new Error("POSTCHECK: scorer mismatch");
    if (Number(p.maxFailures) !== MAX_FAILURES) throw new Error("POSTCHECK: maxFailures mismatch");
    if (!p.maxSpendCap.eq(MAX_SPEND_CAP)) throw new Error("POSTCHECK: maxSpendCap mismatch");
    if (!p.unitPayout.eq(UNIT_PAYOUT)) throw new Error("POSTCHECK: unitPayout mismatch");
    if (Number(p.expiry) !== EXPIRY) throw new Error("POSTCHECK: expiry mismatch");
    if (!(await vaultRead.policyCount()).eq(2)) throw new Error("POSTCHECK: policyCount != 2");

    console.log("RECOVERY POLICY V2 — LIVE RECEIPT");
    console.log("RESULT: PASS");
    console.log("tx_hash", tx.hash);
    console.log("block", receipt.blockNumber);
    console.log("status", receipt.status);
    console.log("policy_id", POLICY_ID);
    console.log("policy_count_after", (await vaultRead.policyCount()).toString());
    console.log("funded_after", p.totalFunded.toString());
    console.log("active_batch_after", p.activeBatchId);
    console.log("AUTHORIZATION_CONSUMED: createPolicy only");
    console.log("fund/commit/sign/lock/reveal/resolve remain NOT AUTHORIZED");
  } catch (err) {
    console.error("RECOVERY POLICY V2 createPolicy STOPPED:", err);
  }
})();
