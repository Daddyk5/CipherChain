# Folder Responsibilities

## Frontend

`frontend/src/assets`: Static product assets.

`frontend/src/components`: Reusable view components grouped by domain.

`frontend/src/pages`: Route screens that compose components and domain hooks.

`frontend/src/routes`: Route table and navigation guards.

`frontend/src/hooks`: Shared React hooks for browser, Firebase, wallet, and chat behavior.

`frontend/src/crypto`: Web Crypto logic. No React imports.

`frontend/src/services`: Firebase, API, and blockchain adapters.

`frontend/src/store`: Zustand stores and selectors.

`frontend/src/layouts`: App shells and responsive layout composition.

`frontend/src/utils`: Pure utility functions.

`frontend/src/context`: Narrow providers for cross-cutting runtime dependencies.

`frontend/src/styles`: Tailwind entrypoint, global styles, animation primitives.

## Backend

`backend/src/controllers`: HTTP handlers.

`backend/src/routes`: API route declarations.

`backend/src/middleware`: Auth, logging, validation, rate limiting, errors.

`backend/src/models`: Data contracts and schema definitions.

`backend/src/services`: Firebase Admin, blockchain relayers, notifications, indexing.

`backend/src/sockets`: Presence, typing, and call-signaling events.

`backend/src/utils`: Pure backend helpers.

## Blockchain

`blockchain/contracts`: Solidity contracts.

`blockchain/scripts`: Deployment and maintenance scripts.

`blockchain/ignition`: Hardhat Ignition deployment modules.

`blockchain/test`: Contract tests.
