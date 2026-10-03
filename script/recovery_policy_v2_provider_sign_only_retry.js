// RECOVERY V2 — PROVIDER EIP-712 SIGN-ONLY RETRY
// AUTHORIZED ONLY FOR THE EXACT DIGEST BELOW.
// NO TRANSACTION. OPENS METAMASK IMMEDIATELY.

(async () => {
  try {
    const CHAIN_ID = 5042;
    const CONTRACT = "0x6f79CDc961e30f2E1FaC0f4EaDa6Ca35e58290E4";
    const PROVIDER = "0xa58b0e970BCE49BEdf50c0E18B2EEb691b9D35Fe";
    const EXPECTED_DIGEST = "0xf71aa4c07b5ab0c1f9bc5e88c869fe94ef076ce475eaf74e9bbe33fc9591c7f1";

    const domain = {
      name: "ARC_ASSURANCE",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: CONTRACT
    };
    const types = {
      ProviderOutput: [
        { name: "provider", type: "address" },
        { name: "policyId", type: "bytes32" },
        { name: "batchId", type: "bytes32" },
        { name: "workId", type: "bytes32" },
        { name: "inputHash", type: "bytes32" },
        { name: "outputHash", type: "bytes32" },
        { name: "scorerIdHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };
    const message = {
      provider: PROVIDER,
      policyId: "0xa32b293688c5710023773987238ad6382aea9962affe510885350c9c12fa7bc8",
      batchId: "0x73bb1d0c80952e5b5c90c1621c729953bd39b11e286d53601ee14c44c0e27e19",
      workId: "0x1da28d151820e11db601bc1191886459174e203d264b6ed25d2f9709ffe196e0",
      inputHash: "0x964cfaa6ed9ff3bd79e3eced7badce673af4ec99b8dc065e8cbed6dcb60cbcde",
      outputHash: "0x6c029d4b7dae2c2dd9e1c1cd420518d7517a3ca7e243c46e1eb84dcc3739f018",
      scorerIdHash: "0xd84be785f67677ef9712c83075e3141b2adf48eb7aa861397a224dff85627b45",
      nonce: "1",
      deadline: "1792465200"
    };

    const provider = new ethers.providers.Web3Provider(web3Provider);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) throw new Error("STOP: wrong chain");

    const signerAddress = await provider.getSigner().getAddress();
    if (signerAddress.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error("STOP: wrong provider wallet");
    }

    const digest = ethers.utils._TypedDataEncoder.hash(domain, types, message);
    if (digest.toLowerCase() !== EXPECTED_DIGEST.toLowerCase()) {
      throw new Error("STOP: digest mismatch");
    }

    const payload = JSON.stringify({
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" }
        ],
        ProviderOutput: types.ProviderOutput
      },
      domain,
      primaryType: "ProviderOutput",
      message
    });

    console.log("SIGN-ONLY RETRY READY");
    console.log("provider_wallet", signerAddress);
    console.log("digest", digest);
    console.log("NO TRANSACTION");
    console.log("MetaMask opens now.");

    let signature;
    if (web3Provider && typeof web3Provider.request === "function") {
      signature = await web3Provider.request({
        method: "eth_signTypedData_v4",
        params: [PROVIDER, payload]
      });
    } else {
      signature = await provider.send("eth_signTypedData_v4", [PROVIDER, payload]);
    }

    // Print immediately before any post-check so the bytes are not lost again.
    console.log("SIGNATURE_CAPTURED", signature);

    const recovered = ethers.utils.verifyTypedData(domain, types, message, signature);
    console.log("recovered_local", recovered);
    console.log("digest", EXPECTED_DIGEST);
    console.log("transaction_sent", false);

    if (recovered.toLowerCase() !== PROVIDER.toLowerCase()) {
      throw new Error("STOP: recovered signer mismatch");
    }

    console.log("RECOVERY V2 PROVIDER SIGNATURE RETRY");
    console.log("RESULT: PASS");
    console.log("AUTHORIZATION_CONSUMED: signature retry only");
    console.log("lockProviderOutput / reveal / resolve remain NOT AUTHORIZED");
  } catch (err) {
    console.error("SIGN-ONLY RETRY STOPPED:", err);
  }
})();
