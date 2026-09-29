-- Wallet identity, sign-in challenges and sessions.
-- All wallet addresses are stored lowercase (the canonical key); the EIP-55
-- checksummed form is kept for display.

CREATE TABLE users (
  wallet_address   TEXT PRIMARY KEY CHECK (wallet_address ~ '^0x[0-9a-f]{40}$'),
  checksum_address TEXT NOT NULL,
  display_name     TEXT CHECK (char_length(display_name) <= 64),
  avatar_url       TEXT CHECK (char_length(avatar_url) <= 512),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One outstanding challenge per address. Rows are single-use and short-lived.
CREATE TABLE auth_nonces (
  wallet_address TEXT PRIMARY KEY,
  nonce          TEXT NOT NULL,
  message        TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX auth_nonces_expires_at_idx ON auth_nonces (expires_at);

-- Opaque bearer sessions. Only the SHA-256 of the token is stored, so a
-- database leak does not yield usable sessions.
CREATE TABLE sessions (
  token_hash     BYTEA PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES users (wallet_address) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ
);
CREATE INDEX sessions_wallet_address_idx ON sessions (wallet_address);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
