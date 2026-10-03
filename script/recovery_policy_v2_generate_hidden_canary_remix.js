// ARC_ASSURANCE_01 — RECOVERY POLICY V2 HIDDEN CANARY GENERATOR FOR REMIX
// IMPORTANT:
// - Generates secrets only in the browser runtime.
// - Does NOT sign or broadcast any transaction.
// - Do NOT save the secret to a local plaintext file on this managed endpoint.
// - Copy the full SECRET_REVEAL_PACKET directly into the protected GitHub Environment secret.
// - Only PUBLIC_PRECOMMIT.batch_id + PUBLIC_PRECOMMIT.commitment are safe to share in chat.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const POLICY_ID = "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8";
    const SCORER_ID = "ARC_ASSURANCE_SCORER_V1:invoice-exact-v1";
    const EXPECTED_SCORER_ID_HASH =
      "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45";
    const TYPE_STRING =
      "CanaryCommitment(uint256 chainId,address verifyingContract,bytes32 policyId,bytes32 batchId,bytes32 workId,bytes32 inputHash,bytes32 expectedOutputHash,bytes32 scorerIdHash,bytes32 salt)";

    function randomBytes32() {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return ethers.utils.hexlify(bytes);
    }

    function randomInt(min, max) {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return min + (bytes[0] % (max - min + 1));
    }

    function randomInvoiceNumber() {
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      return "ARC-" + Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    }

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`STOP: wrong chain ${network.chainId}; expected Arc ${CHAIN_ID}`);
    }

    const abi = [
      "function computeCanaryCommitment(bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32) view returns (bytes32)",
      "function getPolicy(bytes32) view returns (tuple(address funder,address provider,address payoutRecipient,bytes32 scorerIdHash,uint32 maxFailures,uint32 failureCount,uint256 maxSpendCap,uint256 unitPayout,uint64 expiry,uint64 createdAt,uint64 fundedAt,uint256 totalFunded,uint256 totalPaidOut,uint256 totalRefunded,bool paused,bool closed,bool refundIssued,bool exists,bytes32 activeBatchId))",
      "function policyCount() view returns (uint256)",
      "function totalLiability() view returns (uint256)",
      "function totalCustodyReceived() view returns (uint256)",
      "function totalValueReleased() view returns (uint256)"
    ];

    const vault = new ethers.Contract(CONTRACT, abi, provider);
    const policy = await vault.getPolicy(POLICY_ID);

    if (!policy.exists) throw new Error("STOP: v2 policy missing");
    if (policy.scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase()) {
      throw new Error("STOP: scorer binding changed");
    }
    if (policy.fundedAt.eq(0) || !policy.totalFunded.eq("10000000000000000")) {
      throw new Error("STOP: v2 policy is not funded at exactly 0.010 native USDC");
    }
    if (policy.activeBatchId !== ethers.constants.HashZero) {
      throw new Error(`STOP: v2 active batch already exists: ${policy.activeBatchId}`);
    }
    if (policy.paused || policy.closed || policy.refundIssued) {
      throw new Error("STOP: v2 policy is not usable");
    }
    if (!(await vault.policyCount()).eq(2)) throw new Error("STOP: policyCount drift");
    if (!(await vault.totalLiability()).eq("20000000000000000")) throw new Error("STOP: totalLiability drift");
    if (!(await vault.totalCustodyReceived()).eq("20000000000000000")) throw new Error("STOP: totalCustodyReceived drift");
    if (!(await vault.totalValueReleased()).eq(0)) throw new Error("STOP: totalValueReleased drift");

    const batchId = randomBytes32();
    const workId = randomBytes32();
    const salt = randomBytes32();

    const invoiceNumber = randomInvoiceNumber();
    const subtotalMinor = randomInt(10000, 90000);
    const taxMinor = randomInt(1000, 12000);
    const totalMinor = subtotalMinor + taxMinor;
    const currency = "CAD";

    const money = (minor) =>
      `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;

    const inputText = [
      `Invoice ${invoiceNumber}`,
      `Subtotal: ${money(subtotalMinor)} ${currency}`,
      `Tax: ${money(taxMinor)} ${currency}`,
      `Total: ${money(totalMinor)} ${currency}`,
    ].join("\n");

    const canonicalOutput = [
      "ARC_ASSURANCE_INVOICE_V1",
      `invoice_number:${invoiceNumber}`,
      `subtotal_minor:${subtotalMinor}`,
      `tax_minor:${taxMinor}`,
      `total_minor:${totalMinor}`,
      `currency:${currency}`,
    ].join("\n");

    const inputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(inputText));
    const expectedOutputHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonicalOutput));
    const scorerIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(SCORER_ID));

    if (scorerIdHash.toLowerCase() !== EXPECTED_SCORER_ID_HASH.toLowerCase()) {
      throw new Error(`STOP: local scorer hash mismatch: ${scorerIdHash}`);
    }

    const typeHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(TYPE_STRING));
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ["bytes32","uint256","address","bytes32","bytes32","bytes32","bytes32","bytes32","bytes32","bytes32"],
      [typeHash,CHAIN_ID,CONTRACT,POLICY_ID,batchId,workId,inputHash,expectedOutputHash,scorerIdHash,salt]
    );
    const commitment = ethers.utils.keccak256(encoded);

    const onchainCommitment = await vault.computeCanaryCommitment(
      POLICY_ID,batchId,workId,inputHash,expectedOutputHash,scorerIdHash,salt
    );
    if (commitment.toLowerCase() !== onchainCommitment.toLowerCase()) {
      throw new Error("STOP: local/onchain commitment mismatch");
    }

    const canaryKey = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32","bytes32","bytes32"],
        [inputHash,expectedOutputHash,scorerIdHash]
      )
    );

    const publicPrecommit = {
      policy_id: POLICY_ID,
      batch_id: batchId,
      commitment
    };

    const secretRevealPacket = {
      warning: "SECRET — COPY DIRECTLY TO PROTECTED GITHUB ENVIRONMENT SECRET; DO NOT SHARE",
      chain_id: CHAIN_ID,
      verifying_contract: CONTRACT,
      policy_id: POLICY_ID,
      batch_id: batchId,
      work_id: workId,
      input_text: inputText,
      input_hash: inputHash,
      expected_canonical_output: canonicalOutput,
      expected_output_hash: expectedOutputHash,
      scorer_id: SCORER_ID,
      scorer_id_hash: scorerIdHash,
      salt,
      canary_key: canaryKey,
      commitment
    };

    console.log("==========================================");
    console.log("RECOVERY POLICY V2 CANARY — READ-ONLY GENERATION");
    console.log("PUBLIC_PRECOMMIT — SAFE TO SHARE");
    console.log(JSON.stringify(publicPrecommit, null, 2));
    console.log("==========================================");
    console.log("SECRET_REVEAL_PACKET — DO NOT SHARE");
    console.log(JSON.stringify(secretRevealPacket, null, 2));
    console.log("==========================================");
    console.log("ONCHAIN COMMITMENT CROSS-CHECK: MATCH ✅");
    console.log("NO TRANSACTION SIGNED OR BROADCAST.");
    console.log("");
    console.log("ACTION:");
    console.log("1) Copy the FULL SECRET_REVEAL_PACKET JSON directly into GitHub Environment secret G2_SECRET_REVEAL_PACKET.");
    console.log("2) Do NOT save it as a local plaintext file.");
    console.log("3) Do NOT paste it in chat, an issue, PR, commit, artifact, or workflow input.");
    console.log("4) After the GitHub secret is saved, share ONLY PUBLIC_PRECOMMIT batch_id + commitment in chat.");
  } catch (e) {
    console.error("RECOVERY POLICY V2 CANARY STOPPED:", e?.message || e);
  }
})();
