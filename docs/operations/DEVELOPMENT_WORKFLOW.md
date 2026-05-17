# Development Workflow

## Branching

Use short-lived branches from `main`:

```text
feature/wallet-auth
feature/direct-message-e2ee
feature/polygon-verifier
fix/firestore-presence-rules
chore/ci
```

## Pull Request Checklist

- Scope is small and reviewable.
- Frontend builds.
- Backend route changes include validation and auth notes.
- Contract changes include tests.
- Security-sensitive changes include a threat-model note.
- Environment variables are documented in `.env.example`.

## Enterprise Workflow

1. Product brief and acceptance criteria.
2. Threat-model review for auth, crypto, and wallet changes.
3. Feature branch with tests.
4. CI: lint, build, unit tests, contract tests.
5. Preview deployment.
6. Security review for high-risk changes.
7. Merge to `main`.
8. Tagged release and deployment notes.

## Recommended CI Gates

- Frontend lint and build.
- Backend lint and API tests.
- Hardhat compile and tests.
- Dependency audit.
- Solidity static analysis.
- Firestore rules tests once rules are added.

## Environment Strategy

- `local`: Emulator-friendly local Firebase and test wallet.
- `preview`: Per-branch frontend preview and testnet contracts.
- `staging`: Stable Firebase staging project and Polygon Amoy.
- `production`: Main environment with locked Firebase rules, monitoring, backups, and deploy approvals.
