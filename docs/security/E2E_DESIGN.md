# End-to-End Encryption Design

Status: implemented for 1:1 messaging (2026-09-29). Group chat is **not** covered; it needs its own design (see §8).

## 1. Protocol and library

| Decision | Choice |
| --- | --- |
| Protocol | Signal: X3DH key agreement + Double Ratchet |
| Library | [`@privacyresearch/libsignal-protocol-typescript`](https://github.com/privacyresearchgroup/libsignal-protocol-typescript) **0.0.16, pinned exactly** |
| Primitives | Curve25519 / XEdDSA, AES-CBC + HMAC-SHA256 (Signal message format), all provided by the library. None are implemented in this repo |
| Key storage | Raw key material in IndexedDB, one database per wallet (`cipherchain-signal-<address>`) |
| License impact | The library is GPL-3.0-only, so CipherChain is licensed GPL-3.0-only |

**Why not the alternatives** (checked against npm on 2026-09-29):
- `@signalapp/libsignal-client` is official and maintained, but it is a native Node module (`node-gyp-build`) with no browser build.
- `libsignal-protocol` (the old WhisperSystems JS port) is archived.
- vodozemac/Olm compiled to WASM is audited and Apache-2.0, but needs Rust + wasm-pack and bindings we'd maintain ourselves.
- `ts-mls` is MIT and maintained, but unaudited and a different protocol from the one the product spec asked for.

### Known risks of the chosen library
1. **Unmaintained and unaudited.** Last release May 2023, version 0.0.x. Treat it as prototype-grade until replaced or audited.
2. **Confirmed upstream bug: the identity check is skipped on PreKey messages.** In `SessionBuilder.processV3`, `isTrustedIdentity(...)` is not awaited, so the check always passes. CipherChain works around it in `secureMessenger.assertPreKeyMessageIdentity`: it decodes the PreKeyWhisperMessage, then checks its identity key against the sender's wallet-verified key for that exact device *before* the library runs.
   - A regression test (`secureMessenger.test.js`, "documents the upstream bug") fails if upstream behaviour changes.
   - I checked that disabling the workaround makes the impersonation test fail.
3. All library use goes through `frontend/src/crypto/signal/`, so swapping it (e.g. for vodozemac-WASM) touches one directory plus the key directory's key-format validation.

## 2. Identities and trust

- **User identity = wallet address.** Sign-in is SIWE (EIP-4361), handled by the backend. See THREAT_MODEL §3.4.
- **Device identity = one Signal identity key pair per browser/device.** It is generated on the device and never leaves it.
- **Binding device → wallet.** When a device registers, the wallet signs (EIP-191) this statement:

  ```text
  CipherChain device key

  I authorize this device to send and receive encrypted messages for my wallet.

  Wallet: <EIP-55 address>
  Identity key: <base64 identity public key>
  Registration ID: <n>
  ```

  Both the backend (defense in depth) and **every client** verify this signature. A client trusts an identity key only if it is signed by the wallet it claims to belong to. Clients pin the verified set per wallet in IndexedDB. **There is no trust-on-first-use.**
- **Effect:** a malicious server cannot MITM new sessions by substituting keys, because it would need the victim's wallet to sign them. This closes THREAT_MODEL residual risk R1, except for the wallet-compromise case.

## 3. Key material

| Key | Where | Lifetime |
| --- | --- | --- |
| Identity key pair | IndexedDB (private), directory (public, wallet-signed) | Lifetime of the device |
| Registration ID | IndexedDB, directory | Lifetime of the device |
| Signed prekey | IndexedDB (private), directory (public + XEdDSA sig by identity key) | Rotated every 7 days. The previous one is kept for one period |
| One-time prekeys | IndexedDB (private), directory (public) | Single use. Batch of 100, topped up below 20 |
| Session state (ratchet) | IndexedDB only | Advances every message |
| Decrypted history | IndexedDB only (plaintext on device) | Last 1000 messages per conversation |

Nothing private is ever sent to the backend. A test (`never uploads private keys`) asserts this.

## 4. Message flow

1. **Send.** The sender fetches the recipient's wallet-verified devices (`GET /api/keys/:wallet/devices`).
   - For any device without a session it fetches bundles (`GET /api/keys/:wallet/bundles`, which consumes one one-time prekey per device), verifies them, and runs X3DH.
   - It then encrypts once per recipient device, and once per *other* device of the sender (history sync).
2. **Relay.** `POST /api/messages` stores one opaque envelope per target device: sender, device ids, type 1 or 3, and base64 body. The server pushes a `message:new` socket event to the recipient's room.
3. **Receive.** The device pulls `GET /api/messages/inbox?deviceId=`, decrypts serially (ratchet state must advance in order), stores plaintext locally, then acks with `POST /api/messages/ack`, which **deletes** the envelopes server-side. Envelopes that fail authentication are acked and dropped, never shown.

Payload inside the ciphertext: `{"v":1,"to":"<recipient>","text":"…","sentAt":"…"}`.

## 5. Device linking (multi-device)

Multi-device works now. Each device is an independent Signal endpoint (the Sesame-style fan-out that Signal uses).

- **Adding a device:** sign in with the wallet on the new device. It generates its own keys and asks the wallet to sign its device statement. Other clients accept it once they see a valid wallet signature.
  - There is no QR handshake between old and new devices. The wallet is the root of authority.
- **History:** a new device receives messages from the moment it registers. Past history is **not** transferred. That would need an encrypted device-to-device transfer, which is future work.
- **Limit:** 5 active devices per wallet (server-enforced).
- **Revoking:** `DELETE /api/keys/devices/:id` removes the device from the directory and deletes its prekeys and queued mail. Peers stop encrypting to it on their next directory refresh. Its identity key is un-pinned, so its future messages are rejected.

## 6. Key rotation

- **Signed prekey:** rotated by `maintainDeviceKeys` every 7 days. The previous one is kept for one period so in-flight session setups complete.
- **One-time prekeys:** topped back up to 100 when fewer than 20 remain. Bundle fetches are rate-limited (60/min/IP) to slow prekey-exhaustion attacks. When a device runs out, X3DH falls back to signed-prekey-only, which is secure but has weaker forward secrecy for the first message.
- **Identity key:** never rotated in place. To "rotate", revoke the device and register a new one.
- **Ratchet keys:** rotate automatically with every message round-trip (Double Ratchet).

## 7. What this does not solve (see THREAT_MODEL §4)

- Metadata: the server sees who messages whom, when, and how much.
- Device compromise, including XSS on our origin. Keys and plaintext history are readable from the page.
- Wallet compromise. An attacker can register a new device and receive *future* messages. Mitigation (future): safety-number/QR verification between contacts. `FingerprintGenerator` is available in the library.
- Recovery. Losing every device loses history. The wallet recovers the *identity* (sign in and register a new device), not old messages.

## 8. Group chat (not built)

Do not bolt groups onto pairwise fan-out naively. Options to evaluate: Signal-style sender keys, or MLS (RFC 9420, e.g. `ts-mls`, which is MIT-licensed). Group chat needs its own design doc covering membership changes, removal (post-compromise security), and admin authority.
