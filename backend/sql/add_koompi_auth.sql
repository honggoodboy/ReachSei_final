-- Reachsei: add KOOMPI/KID OAuth support
-- Run this once against the same PostgreSQL database used by the backend.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS koompi_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_id TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password';

-- KOOMPI/Telegram accounts may not provide an email, phone number,
-- or password. Existing password accounts continue to work normally.
ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN password DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_koompi_id_unique
  ON users (koompi_id)
  WHERE koompi_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique
  ON users (telegram_id)
  WHERE telegram_id IS NOT NULL;
