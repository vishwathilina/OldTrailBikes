-- ─────────────────────────────────────────────────────────────────────────────
-- Pre-init migration: enable required PostgreSQL extensions.
-- Runs first (lexicographic ordering on migration directory name).
-- gen_random_uuid() requires pgcrypto.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
