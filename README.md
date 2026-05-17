# CipherChain

CipherChain is a modern Web3 end-to-end encrypted chat application inspired by Signal, Discord, and Slack. It is organized as a production-oriented monorepo with a modular React PWA, an API and socket backend, and an isolated Hardhat smart contract workspace.

## Repository Layout

```text
cipherchain/
├── frontend/       # React, Vite, Tailwind, PWA, Firebase, Ethers.js
├── backend/        # Express API, wallet auth, Firebase Admin, sockets, relayers
├── blockchain/     # Solidity contracts, Hardhat scripts, Ignition modules, tests
├── docs/           # Architecture, security, product, operations documentation
├── .github/        # CI, PR templates, issue templates
└── README.md
```

## Quick Start

```bash
npm install
npm run dev
```

Useful workspace commands:

```bash
npm run dev:frontend
npm run dev:backend
npm run compile:contracts
npm run test:blockchain
```

## Documentation

- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Security Model](docs/security/SECURITY.md)
- [MVP Roadmap](docs/product/MVP_ROADMAP.md)
- [Development Workflow](docs/operations/DEVELOPMENT_WORKFLOW.md)

## Recommended Package Installations

Frontend:

```bash
cd frontend
npm install react-router-dom zustand firebase ethers vite-plugin-pwa tailwindcss @tailwindcss/vite
npm install -D vitest @testing-library/react @testing-library/jest-dom playwright eslint-plugin-jsx-a11y prettier
```

Backend:

```bash
cd backend
npm install express cors helmet dotenv zod firebase-admin socket.io ethers
npm install -D nodemon eslint prettier vitest supertest
```

Blockchain:

```bash
cd blockchain
npm install -D hardhat @nomicfoundation/hardhat-toolbox dotenv
```

## VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Solidity
- Hardhat Solidity
- GitLens
- Error Lens
- DotENV
- Playwright Test for VS Code

## Development Order

1. Finalize Firebase schema, Firestore rules, and wallet auth nonce flow.
2. Implement MetaMask login with signed nonce verification.
3. Build profile and device public key registration.
4. Implement one-on-one encrypted messaging with Web Crypto.
5. Add Firestore realtime listeners and local optimistic message state.
6. Deploy `MessageVerifier` to Polygon Amoy and wire hash verification.
7. Harden PWA install, offline shell, and mobile navigation.
8. Add group chat key distribution, file encryption, and video-call signaling.

## Git Workflow

Use trunk-based development with short-lived feature branches:

```text
main
feature/wallet-auth
feature/e2ee-direct-messages
feature/message-verification
fix/firebase-presence-rules
chore/ci-hardhat-tests
```

Every pull request should include a security note when touching auth, crypto, Firestore rules, wallet flows, or smart contracts.
