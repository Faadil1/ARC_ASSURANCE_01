// ARC_ASSURANCE_01 — one-time reveal bridge key generator
// Generates an ephemeral RSA-OAEP keypair in the browser.
// PRIVATE key stays in this browser's localStorage.
// Only the PUBLIC JWK may be shared.

(async () => {
  try {
    if (!globalThis.crypto?.subtle) throw new Error("WEB_CRYPTO_UNAVAILABLE");
    if (!globalThis.localStorage) throw new Error("LOCAL_STORAGE_UNAVAILABLE");

    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    const publicCanonical = JSON.stringify({
      kty: publicJwk.kty,
      n: publicJwk.n,
      e: publicJwk.e,
      alg: "RSA-OAEP-256",
      ext: true
    });

    await localStorage.setItem(
      "ARC_ASSURANCE_V2_REVEAL_BRIDGE_PRIVATE_JWK",
      JSON.stringify(privateJwk)
    );

    const publicBytes = new TextEncoder().encode(publicCanonical);
    const hashBuffer = await crypto.subtle.digest("SHA-256", publicBytes);
    const fingerprint = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2,"0"))
      .join("");

    console.log("RECOVERY V2 REVEAL BRIDGE KEYGEN");
    console.log("RESULT: PASS");
    console.log("PRIVATE_KEY_LOCATION browser localStorage only");
    console.log("PRIVATE_KEY_PRINTED false");
    console.log("public_key_fingerprint_sha256", fingerprint);
    console.log("PUBLIC_REVEAL_BRIDGE_JWK", publicCanonical);
    console.log("Share ONLY the PUBLIC_REVEAL_BRIDGE_JWK line.");
    console.log("Do NOT clear this browser's site data until revealCanary is complete.");
  } catch (err) {
    console.error("REVEAL BRIDGE KEYGEN STOPPED:", err);
  }
})();
