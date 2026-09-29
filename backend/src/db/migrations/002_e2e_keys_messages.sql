-- E2E key directory and ciphertext relay. The server stores public keys and
-- opaque ciphertext only. It never sees private keys or plaintext.

-- One row per device. Each device has its own Signal identity key, which is
-- bound to the wallet by a wallet signature (identity_signature) that clients
-- verify before trusting the key. This stops the server swapping in its own keys.
CREATE TABLE devices (
  wallet_address           TEXT NOT NULL REFERENCES users (wallet_address) ON DELETE CASCADE,
  device_id                INTEGER NOT NULL CHECK (device_id BETWEEN 1 AND 1000000),
  registration_id          INTEGER NOT NULL CHECK (registration_id BETWEEN 1 AND 16380),
  identity_key             TEXT NOT NULL,
  identity_signature       TEXT NOT NULL,
  signed_prekey_id         INTEGER NOT NULL,
  signed_prekey            TEXT NOT NULL,
  signed_prekey_signature  TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_prekey_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at               TIMESTAMPTZ,
  PRIMARY KEY (wallet_address, device_id),
  UNIQUE (identity_key)
);

-- One-time prekeys. Each is handed out once, then deleted.
CREATE TABLE one_time_prekeys (
  wallet_address TEXT NOT NULL,
  device_id      INTEGER NOT NULL,
  key_id         INTEGER NOT NULL,
  public_key     TEXT NOT NULL,
  PRIMARY KEY (wallet_address, device_id, key_id),
  FOREIGN KEY (wallet_address, device_id) REFERENCES devices (wallet_address, device_id) ON DELETE CASCADE
);

-- Ciphertext envelopes, one per recipient device. Deleted once the recipient
-- device acknowledges them, so the server keeps no message history.
CREATE TABLE message_envelopes (
  id                  BIGSERIAL PRIMARY KEY,
  sender_address      TEXT NOT NULL REFERENCES users (wallet_address) ON DELETE CASCADE,
  sender_device_id    INTEGER NOT NULL,
  recipient_address   TEXT NOT NULL,
  recipient_device_id INTEGER NOT NULL,
  type                SMALLINT NOT NULL CHECK (type IN (1, 3)),
  body                TEXT NOT NULL CHECK (char_length(body) <= 262144),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (recipient_address, recipient_device_id) REFERENCES devices (wallet_address, device_id) ON DELETE CASCADE
);
CREATE INDEX message_envelopes_recipient_idx ON message_envelopes (recipient_address, recipient_device_id, id);
