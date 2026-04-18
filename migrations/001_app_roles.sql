-- 001_app_roles.sql
-- Adds per-client role definitions and user<->client role assignments so that
-- each OIDC client (dapur-buwikra, expense-tracker, ...) can expose its own
-- role vocabulary and wikra-auth admins can assign roles per user per client.

BEGIN;

CREATE TABLE IF NOT EXISTS "oauth_client_role" (
    "id"         TEXT PRIMARY KEY,
    "clientId"   TEXT NOT NULL,
    "role"       TEXT NOT NULL,
    "isDefault"  BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_client_role_unique UNIQUE ("clientId", "role")
);

CREATE INDEX IF NOT EXISTS oauth_client_role_client_idx
    ON "oauth_client_role" ("clientId");

-- Ensure only one default role per client
CREATE UNIQUE INDEX IF NOT EXISTS oauth_client_role_one_default_per_client
    ON "oauth_client_role" ("clientId")
    WHERE "isDefault" = TRUE;

CREATE TABLE IF NOT EXISTS "user_client_role" (
    "id"         TEXT PRIMARY KEY,
    "userId"     TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "clientId"   TEXT NOT NULL,
    "role"       TEXT NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_client_role_unique UNIQUE ("userId", "clientId")
);

CREATE INDEX IF NOT EXISTS user_client_role_client_idx
    ON "user_client_role" ("clientId");
CREATE INDEX IF NOT EXISTS user_client_role_user_idx
    ON "user_client_role" ("userId");

COMMIT;
