# Security Model

## Encryption Architecture

CipherChain should treat Firebase, backend servers, and blockchain infrastructure as untrusted for message content.

Recommended flow:

1. Each device generates an ECDH key pair using Web Crypto.
2. Users publish only signed device public keys.
3. A sender derives a conversation key per recipient device.
4. Messages are encrypted locally with AES-GCM using a fresh IV per message.
5. The app signs message metadata with the wallet or a device signing key.
6. The app hashes canonical encrypted metadata and verifies that hash on-chain.
7. Receivers decrypt locally after validating sender membership and metadata.

## Never Store

- Plaintext messages.
- Raw private keys.
- Unencrypted file contents.
- Wallet private keys or seed phrases.
- Message preview text in notifications.

## Store Carefully

- Device public keys.
- Encrypted private-key backups, if added later.
- Ciphertext, IV, message hash, sender signature, and timestamps.
- Minimal on-chain hashes only.

## Wallet Authentication

Use nonce-based wallet login:

1. Backend issues a short-lived nonce.
2. User signs a structured message.
3. Backend verifies address recovery.
4. Backend mints or links a Firebase custom token.
5. Frontend signs into Firebase with that custom token.

Prefer EIP-4361 Sign-In with Ethereum once the backend auth flow is implemented.

## Firestore Rules

Rules should enforce:

- Users can read only conversations where they are members.
- Users can write messages only as themselves.
- Users cannot modify historical ciphertext after send.
- Device key updates require authenticated ownership.
- Verification records are append-only or backend-owned.

## Smart Contract Safety

- Store only `bytes32` message commitments.
- Emit events for indexers.
- Avoid conversation IDs or participant identifiers on-chain.
- Add replay protection for duplicate hashes.
- Keep deployer keys out of frontend environments.

## Production Hardening

- Content Security Policy with strict script sources.
- Rate-limit auth, verification, and profile endpoints.
- Validate all backend input with Zod.
- Enable Firebase App Check.
- Add Sentry or OpenTelemetry with sensitive-field scrubbing.
- Use dependency scanning and smart contract static analysis in CI.
