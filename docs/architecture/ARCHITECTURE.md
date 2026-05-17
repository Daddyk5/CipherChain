# CipherChain Architecture

## System Overview

CipherChain separates product concerns into three deployable domains:

- `frontend`: React PWA that owns UI, routing, local state, client encryption, Firebase realtime subscriptions, and wallet interaction.
- `backend`: API and socket layer for wallet authentication, profile administration, verification relays, presence fanout, rate limiting, and future media/video workflows.
- `blockchain`: Solidity contracts and Hardhat tooling for immutable message hash verification on Polygon testnet.

The frontend never imports blockchain build scripts or backend internals. It talks to Firebase for realtime encrypted data, to the backend for trusted server workflows, and to Polygon contracts through a small Ethers.js service boundary.

## Complete Folder Structure

```text
cipherchain/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── layout/
│   │   │   ├── ui/
│   │   │   └── wallet/
│   │   ├── context/
│   │   ├── crypto/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── Chat/
│   │   │   ├── Dashboard/
│   │   │   ├── Login/
│   │   │   ├── Profile/
│   │   │   └── Settings/
│   │   ├── pwa/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── api/
│   │   │   ├── blockchain/
│   │   │   └── firebase/
│   │   ├── store/
│   │   ├── styles/
│   │   └── utils/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
├── blockchain/
│   ├── contracts/
│   ├── ignition/
│   │   └── modules/
│   ├── scripts/
│   ├── test/
│   ├── .env.example
│   └── hardhat.config.js
├── docs/
├── .github/
└── README.md
```

## Frontend Responsibilities

- `assets`: Static images, fonts, icons, and brand system assets.
- `components`: Reusable UI split by domain. `ui` stays generic, while `chat`, `wallet`, and `layout` are product-specific.
- `pages`: Route-level screens with orchestration logic only. Pages compose components, hooks, and stores.
- `routes`: React Router definitions, guards, redirects, and lazy-loading strategy.
- `hooks`: Browser, Firebase, wallet, presence, and responsive behavior hooks.
- `crypto`: Web Crypto API wrappers for key generation, message encryption, decryption, hashing, export/import, and future group key rotation.
- `services`: Side-effect boundaries for Firebase, backend API calls, and Ethers.js contract operations.
- `store`: Zustand slices for wallet, auth session, chat, presence, settings, notifications, and UI preferences.
- `layouts`: Authenticated app shell, guest layout, mobile shell, and future call layout.
- `context`: Narrow providers for auth/session and feature flags when Zustand is not the right shape.
- `styles`: Tailwind entrypoint, design tokens, animations, and global CSS.
- `pwa`: Service worker registration, update prompts, install prompt handling, offline policies.
- `utils`: Pure helpers with no external state.

## Backend Responsibilities

- `controllers`: HTTP request handlers. Keep them thin.
- `routes`: Versioned route declarations.
- `middleware`: Auth, validation, rate limits, request IDs, logging, and error handling.
- `models`: Data contracts and schema shapes for users, conversations, devices, and encrypted messages.
- `services`: Firebase Admin, Ethers relayers, notification delivery, media scanning metadata, and audit logging.
- `sockets`: Presence, typing indicators, call signaling, and future low-latency coordination.
- `utils`: Pure helpers and invariant checks.

## Blockchain Responsibilities

- `contracts`: Solidity contracts only.
- `scripts`: Deployment and operational scripts.
- `ignition`: Declarative Hardhat Ignition deployment modules.
- `test`: Contract unit and integration tests.

Keep generated artifacts and ABIs out of the frontend source. Publish only the minimal ABI and deployed addresses through `frontend/src/services/blockchain` or a generated package later.

## Naming Conventions

- React components: `PascalCase.jsx`.
- Hooks: `useThing.js`.
- Zustand stores: `thingStore.js` with `useThingStore`.
- Services: `thingService.js` or `thingRepository.js`.
- Crypto modules: action-focused names such as `messageCipher.js`, `keyManager.js`, `hash.js`.
- Backend routes: `resource.routes.js`.
- Backend models: `resource.model.js`.
- Solidity contracts: `PascalCase.sol`.
- Environment variables: upper snake case, `VITE_` prefix only for public frontend values.

## Clean React Architecture

Use a route-first shell:

- Routes load pages.
- Pages compose feature components.
- Components call hooks or receive props.
- Hooks coordinate stores and services.
- Services perform external I/O.
- Crypto modules stay deterministic and isolated.

Avoid importing Firebase, Ethers, or Web Crypto directly inside visual components except for wallet-specific UI. This keeps the frontend testable and prepares the codebase for React Native.

## Reusable Component Strategy

- `components/ui`: Buttons, dialogs, menus, inputs, tabs, badges, avatars, loaders.
- `components/chat`: Message list, composer, conversation list, typing indicator, verification badge.
- `components/wallet`: Connect button, chain switcher, signature prompt, wallet account pill.
- `components/layout`: Sidebar, mobile nav, command header, responsive panels.

UI should be mobile-first, dark, compact, and operational. Use glass panels sparingly for high-value surfaces, not every nested element.

## Firebase Realtime Architecture

Recommended collections:

```text
users/{walletAddress}
users/{walletAddress}/devices/{deviceId}
conversations/{conversationId}
conversations/{conversationId}/members/{walletAddress}
conversations/{conversationId}/messages/{messageId}
presence/{walletAddress}
verificationQueue/{messageHash}
```

Messages store ciphertext, IV, sender wallet, sender device ID, recipient key metadata, hash, signature, delivery state, and timestamps. Never store plaintext in Firebase.

Use Firestore listeners for conversation and message updates. Use backend or Cloud Functions for presence cleanup, notification fanout, moderation metadata, and verification queue workers.

## Smart Contract Integration

The app computes a SHA-256 or Keccak message commitment over canonical ciphertext metadata, then submits a `bytes32` hash to `MessageVerifier`. The contract stores only hashes, sender addresses, and timestamps. It must never receive plaintext, ciphertext bodies, participant names, or conversation IDs.

Frontend reads verification state through Ethers.js. Backend may act as a relayer if the product needs gas abstraction.

## Zustand Store Architecture

Recommended slices:

- `authStore`: Firebase user, wallet session, nonce status.
- `walletStore`: account, chain ID, provider status, chain switching.
- `chatStore`: active conversation, messages, drafts, optimistic sends.
- `presenceStore`: online/offline status, typing state, last seen.
- `settingsStore`: theme, notification privacy, selected chain, PWA settings.
- `verificationStore`: pending hashes, confirmed hashes, failed submissions.

Use selectors to avoid re-rendering chat surfaces on unrelated state changes.

## PWA Architecture

- Vite PWA plugin owns manifest and service worker generation.
- Cache the app shell and immutable assets.
- Avoid caching encrypted message API responses unless explicitly designed.
- Add update prompts for new versions.
- Keep notification content privacy-preserving: no message plaintext in push payloads.

## Future React Native Compatibility

Keep portable logic in framework-light modules:

- `crypto`: later swap Web Crypto with native crypto wrappers behind the same interface.
- `services`: keep Firebase and wallet adapters thin.
- `store`: Zustand can be reused in React Native.
- `components/ui`: later mirrored by native components, while page orchestration remains similar.

Avoid DOM APIs outside `pwa`, browser-specific hooks, and wallet browser adapters.
