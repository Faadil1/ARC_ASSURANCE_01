# Recovery Policy v2 — Secure Reveal Bridge

**Status:** READY_FOR_EPHEMERAL_PUBLIC_KEY

The v2 reveal preimage is stored only in the protected GitHub Environment secret. GitHub secrets are write-only to operators, while the actual `revealCanary` transaction must be signed by the funder wallet in MetaMask.

The bridge transports only the two bytes32 reveal values needed by the wallet without publishing them in plaintext.

## Design

1. Browser/Remix generates an ephemeral RSA-OAEP-2048 key pair.
2. The private JWK is stored only in that browser's localStorage and is never printed.
3. Only the public JWK is supplied to the secret-bound GitHub workflow.
4. GitHub Actions reads the protected reveal packet in runner temp and encrypts exactly 64 raw bytes:
   - expected output hash;
   - salt.
5. Only RSA-OAEP ciphertext and public bindings are emitted.
6. Browser decrypts ciphertext locally, reconstructs the live commitment, verifies the exact authorized calldata hash, and only then requests the MetaMask transaction.
7. After the reveal receipt is proven, the browser bridge private key is deleted.

## Security boundary

MUST NOT expose in repo/chat/logs:
- private bridge JWK;
- plaintext salt;
- raw reveal calldata before broadcast;
- full reveal packet.

The public RSA JWK and RSA ciphertext are safe to transport publicly.

This bridge does not authorize `revealCanary`; transaction authorization remains a separate one-shot checkpoint.
