# Security Model

See also the [Threat Model](../THREAT_MODEL.md) and the [E2E design](E2E_DESIGN.md).

## Encryption Architecture

CipherChain treats the backend, the Postgres database, and blockchain infrastructure as untrusted for message content.

1. Each device generates a Signal identity key, a signed prekey, and one-time prekeys (libsignal-protocol-typescript). Private keys stay in IndexedDB.
2. The user's wallet signs a statement binding the device identity key to the wallet. Clients trust only wallet-signed device keys.
3. Senders run X3DH against the recipient's prekey bundle, then encrypt with the Double Ratchet, once per recipient device.
4. The backend relays base64 ciphertext envelopes and deletes each one when the recipient device acks it.
5. Optional: the app hashes ciphertext and anchors the hash on-chain (see the contract scope decision; not yet wired).

## Never Store (server-side)

- Plaintext messages or previews.
- Private keys of any kind.
- Unencrypted file contents.
- Wallet private keys or seed phrases.
- Raw session tokens (store only their SHA-256).

## Store Carefully

- Device public keys and their wallet signatures.
- Ciphertext envelopes, only until delivery.
- Minimal on-chain hashes only.

## Wallet Authentication

Implemented in `backend/src/auth/`:

1. The backend issues a short-lived, single-use nonce inside a server-built EIP-4361 message.
2. The user signs it with MetaMask.
3. The backend recovers the address, atomically consumes the nonce, and upserts the user in Postgres.
4. The backend issues an opaque, revocable session token. Only its hash is stored.

## Database

- Postgres (Aiven). Schema changes go through `backend/src/db/migrations/` and run with `npm run db:migrate --workspace backend`.
- TLS to the database is always verified with the provider CA (`DATABASE_CA_CERT_PATH`).
- `DATABASE_URL` lives only in `backend/.env` (git-ignored). Rotate it immediately if it is ever pasted, logged, or committed.
- Use a least-privilege role for the app in production, not `avnadmin`.
- All queries are parameterized. Authorization is enforced in the API layer (a session's wallet must match the resource owner).

## Smart Contract Safety

- Store only `bytes32` message commitments.
- Emit events for indexers.
- Avoid conversation IDs or participant identifiers on-chain.
- Add replay protection for duplicate hashes.
- Keep deployer keys out of frontend environments.

## Production Hardening

- Content Security Policy with strict script sources (XSS = key compromise).
- Rate-limit auth, key-bundle, message, and profile endpoints (auth and bundles done; per-account message limits TODO).
- Validate all backend input with Zod.
- Add Sentry or OpenTelemetry with sensitive-field scrubbing (never log bodies of `/messages` or `/keys`).
- Use dependency scanning and smart contract static analysis in CI.
- Pin crypto dependencies exactly and review every upgrade.
