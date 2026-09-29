# MVP Roadmap

## Phase 0: Foundation

- Monorepo architecture.
- React PWA shell.
- Dark responsive UI system.
- Postgres (Aiven) setup and migrations. ✅
- Hardhat contract compile and test.

## Phase 1: Identity

- MetaMask connect.
- Wallet nonce signing.
- SIWE wallet sign-in with opaque server sessions. ✅
- User profile and display name.
- Device public key registration.

## Phase 2: One-on-One Messaging

- Conversation creation.
- Web Crypto key agreement.
- AES-GCM encrypted send and receive.
- Authenticated Socket.io push + inbox pull. ✅
- Message timestamps and delivery state.
- Online/offline presence.

## Phase 3: Verification

- Message hash canonicalization.
- Polygon Amoy deployment.
- Frontend verification badge.
- Backend relayer option.
- Verification event indexing.

## Phase 4: Product Polish

- Installable PWA.
- Mobile navigation and safe area support.
- Push notification shell with private payloads.
- Settings for device trust and privacy.
- Error, loading, offline, and empty states.

## Phase 5: Expansion

- Group chats with sender keys or pairwise device envelopes.
- Encrypted file sharing.
- Voice/video signaling.
- Moderation metadata without plaintext access.
- Multi-device recovery.
