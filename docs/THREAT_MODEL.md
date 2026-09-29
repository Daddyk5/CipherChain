# CipherChain Threat Model

Status: v2 (2026-09-29). Covers wallet auth, Postgres storage, and 1:1 E2E messaging. Update this doc in the same PR as any change to auth, crypto, key storage, database access, or contracts.

Related: [E2E design](security/E2E_DESIGN.md) · [Security model](security/SECURITY.md)

## 1. Assets

| Asset | Where it lives | Why it matters |
| --- | --- | --- |
| Message plaintext | Sender and recipient devices only (IndexedDB history) | Primary confidentiality target |
| Identity, prekey and ratchet private keys | Client IndexedDB only | Whoever holds them can read and impersonate that device |
| Wallet private key / seed | User's wallet (MetaMask). Never touched by CipherChain | Root of identity and device authorization |
| Session token | Client localStorage; SHA-256 hash in Postgres | Grants API access as the user (not message access) |
| Database credentials (`DATABASE_URL`) | Backend `.env` only | Full read/write of the database |
| Device key directory | Postgres `devices`, `one_time_prekeys` | Integrity matters. Protected by wallet signatures (§3.3) |
| Ciphertext envelopes | Postgres `message_envelopes` until acked, then deleted | Must not reveal content |
| Metadata (who, when, how often, size) | Postgres, backend logs, chain | **Not protected** (§4) |

## 2. Actors and adversaries

- **Passive network attacker.** Observes traffic between client, backend, database, and RPC.
- **Active network attacker (MITM).** Can intercept or modify traffic, but not break TLS without a mis-issued certificate.
- **Malicious or compromised backend operator.** Full control of the Express server, its logs, and the database.
- **Compromised database** (e.g. leaked Aiven credentials). Can read and modify every row.
- **Other users.** Authenticated, but may be malicious (spam, impersonation, prekey exhaustion).
- **Phishing site.** Tries to get a user to sign a CipherChain login or device statement for another origin.
- **Public blockchain observers.** Everyone can read everything on-chain, forever.

## 3. What CipherChain protects against

### 3.1 Server / database compromise → message content
Plaintext and private keys never leave the device. The backend and Postgres only store public keys and opaque ciphertext, and they delete ciphertext once the recipient device acks it. A full compromise of backend or database yields public keys, queued ciphertext, and metadata. It does not yield content.

### 3.2 Malicious backend operator reading messages
Same as 3.1. The operator can **deny service**, **drop or delay messages**, and **see metadata**. It cannot read messages, and it cannot forge messages from another user (see 3.3).

### 3.3 Key substitution / MITM by the server
- Every device identity key must be signed by its owner's wallet ([E2E design §2](security/E2E_DESIGN.md#2-identities-and-trust)).
- Clients verify that signature and trust only pinned, wallet-verified keys. There is no trust-on-first-use.
- Signed prekeys are verified against the identity key (XEdDSA).
- For PreKey messages the sender identity is checked against the exact device's verified key before decryption. This also works around an upstream library bug ([E2E design §1](security/E2E_DESIGN.md#known-risks-of-the-chosen-library)).
- Tests simulate a malicious server substituting a recipient's keys and injecting a forged first message. Both are rejected.

### 3.4 Network MITM
All transport is TLS. The backend→Postgres connection verifies the provider's CA (`DATABASE_CA_CERT_PATH`), and there is deliberately no switch to skip verification. E2E encryption protects content even if TLS is subverted.

### 3.5 Account takeover via auth
- Login is a wallet signature over a server-built EIP-4361 message with a random 128-bit nonce, a 5-minute expiry, the chain id, and the domain.
- Nonces are server-side, bound to one address, and single-use. The consume is an atomic `DELETE … RETURNING`.
- A failed signature does not burn the nonce. An attacker cannot cancel someone else's login.
- The SIWE `domain` comes from server config. MetaMask warns when the requesting origin doesn't match it.
- Sessions are 256-bit random opaque tokens, 7-day expiry, and revocable (logout). Postgres stores only the SHA-256, so a DB leak yields no usable sessions.
- Auth endpoints are rate-limited per IP.
- Admin status is evaluated server-side from `ADMIN_WALLET_ADDRESSES` on every request. It is never taken from client headers.
- Socket.io connections require a valid session token.

### 3.6 Replay and tampering
The Double Ratchet rejects replayed and modified ciphertext (tests cover both). Messages decrypt correctly when delivered out of order.

## 4. What CipherChain does NOT protect against

- **Compromised end device.** This includes malware, malicious browser extensions, XSS in our origin, and physical access to an unlocked session. Keys and decrypted history are raw in IndexedDB (a deliberate choice, see E2E design §3). The session token is in localStorage. CSP and dependency hygiene reduce the XSS risk but cannot remove it.
- **Metadata.** The backend and database see who messages whom, when, how often, message sizes, device counts, IP addresses, and online presence. On-chain commitments are public, timestamped, and linked to the submitting wallet.
- **Wallet compromise.** Whoever controls the wallet can sign in *and authorize a new device*, which then receives **future** messages. Past messages stay safe because they are encrypted to existing devices only. Planned mitigation: safety-number verification plus notifying peers when a contact adds a device.
- **Traffic analysis and availability.** Blocking, delaying, or dropping messages. No anonymity network is used.
- **A malicious recipient.** Screenshots, forwarding, and copying are all possible.
- **Smart-contract wallets (EIP-1271).** Not supported. Only EOA signatures verify.
- **Supply chain.** The E2E library is unmaintained and unaudited (see E2E design §1). A compromised npm dependency in the frontend bundle defeats E2E.

## 5. Trust boundaries

```text
 ┌──────────────────────────── User device (TRUSTED) ─────────────────────────────┐
 │ Wallet ──signs login + device statement──▶ Frontend PWA ──▶ IndexedDB         │
 │                                             encrypt/decrypt   (keys, sessions, │
 │                                                                history)        │
 └──────────────┬──────────────────────────────────────────┬──────────────────────┘
       TLS      │ SIWE, public keys, ciphertext            │ tx: bytes32 hash only
                ▼                                          ▼
 ┌──────── Backend (UNTRUSTED for content) ────────┐   ┌──── Polygon (PUBLIC) ─────┐
 │ Express + Socket.io                             │   │ MessageVerifier contract  │
 │ verifies SIWE + device signatures, relays       │   │ world-readable, permanent │
 │ ciphertext; holds DATABASE_URL (high-value)     │   └───────────────────────────┘
 └──────────────────────┬──────────────────────────┘
          verified TLS  │
                        ▼
 ┌─────── Postgres on Aiven (UNTRUSTED for content) ───────┐
 │ users, auth_nonces, sessions (hashed), devices,         │
 │ one_time_prekeys, message_envelopes (deleted on ack)    │
 └─────────────────────────────────────────────────────────┘
```

| Boundary | Trust assumption | Enforcement |
| --- | --- | --- |
| Wallet → Frontend | The wallet shows the user exactly what is signed | Plain-text EIP-4361 and device statements |
| Frontend → Backend | Backend is honest-but-curious for auth, untrusted for content and keys | Server-side signature checks. Clients verify device keys themselves. Only ciphertext is sent |
| Backend → Postgres | The database is only as trusted as the backend | Verified TLS; credentials only in backend `.env`; ciphertext deleted after delivery |
| Anyone → Blockchain | Public, adversarial | Only opaque `bytes32` commitments on-chain |

## 6. Residual risks and TODOs

- **R1: Wallet compromise → new device.** See §4. Add safety numbers (`FingerprintGenerator`) and "new device" notices.
- **R2: No hardware-backed key storage** in the browser (by decision).
- **R3: DB credentials.** A leaked `DATABASE_URL` grants full DB access (ciphertext and metadata, not content). Rotate credentials if exposed, restrict Aiven IP allow-lists to the backend, and use a least-privilege DB role for the app instead of `avnadmin`.
- **R4: Unmaintained E2E library.** Plan a migration (vodozemac-WASM or an audited alternative) before production.
- **R5: No per-account send rate limit** on `/api/messages` yet (only IP-based auth and bundle limits).
- **R6: Legacy UI screens.** The register (PII/password), 2FA, and forgot-password screens contradict wallet-only identity. Remove or redesign them.
