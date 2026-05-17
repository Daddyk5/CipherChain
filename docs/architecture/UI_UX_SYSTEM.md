# CipherChain UI/UX System

## Product Direction

CipherChain uses a dark enterprise cybersecurity style inspired by Signal, Discord, Linear, Vercel, Raycast, and SOC dashboards. The product should feel calm, fast, secure, and operational rather than decorative.

## Authentication Architecture

- Public routes: landing, user login, registration, wallet connect, 2FA, session verification, admin login, admin verification, unauthorized.
- User panel: `/app/*`, protected by user session.
- Admin panel: `/admin/*`, protected by admin session and RBAC permission checks.
- Session persistence: Zustand `persist` storage under `cipherchain-auth-session`.
- Guards: `ProtectedRoute` redirects unauthenticated users to the correct login page.
- Unauthorized handling: users without required permissions go to `/unauthorized`.

## Layout Architecture

- User shell: Discord-style secure workspace navigation with chat, identity, and security controls.
- Admin shell: isolated SOC-style operations navigation with users, reports, logs, blockchain monitoring, and roles.
- Mobile shell: bottom navigation with native-app spacing and rounded glass treatment.
- Loading shell: animated CipherChain SVG logo with session validation copy.

## Color System

- Deep black: app foundation and page background.
- Midnight navy: primary panels and elevated surfaces.
- Gunmetal gray: borders, muted fills, secondary states.
- Cyan/electric blue: active navigation, wallet and verification accents.
- Emerald: secure/verified states.
- Purple: admin, privileged operations, and blockchain highlights.
- Red: destructive and warning states.
- Amber: pending verification and attention states.

## Component Strategy

- `Logo`: SVG brand mark and compact loading form.
- `AuthShell`: shared authentication page scaffold.
- `ProtectedRoute`: auth and RBAC guard.
- `LoadingScreen`: session validation and splash experience.
- `PageHeader`: consistent page hierarchy.
- `StatCard`: dashboard metrics with hover elevation.
- `StatusPill`: verification, warning, neutral, and info badges.
- `WalletIdentityCard`: wallet-bound user identity surface.

## Motion System

Framer Motion powers:

- route shell entry animations,
- sidebar entrance animation,
- loading logo rotation,
- hover elevation through CSS transitions,
- future modal transitions,
- future notification and realtime event animation.

Keep motion subtle: 180-400ms, ease-out for entry, no distracting loops except secure verification pulses and loading states.

## Future AI Security Slots

The admin modules reserve UI surface for:

- toxicity detection,
- AI moderation,
- scam and phishing detection,
- threat analysis,
- AI-powered security monitoring,
- audit export and compliance review.

These should operate on metadata and encrypted-message safety signals where possible, not plaintext message content.
