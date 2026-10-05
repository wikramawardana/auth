# Tuwaga EO role synchronization

EO is the Tuwaga app role `eo`, not a global Auth role. The existing OIDC
`app_role` claim already transports per-client roles. The companion Tuwaga
frontend recognizes EO and routes it to its restricted verification workspace.

Run `pnpm db:migrate:app` to add EO to the documented production client's role
definitions. The migration does not change defaults or user assignments. For
another client id, add `eo` through the Auth client-role dashboard; successful
server-side synchronization also adds missing Tuwaga role definitions.

## Restricted server-to-server endpoint

`PUT /api/internal/tuwaga-roles` accepts HTTP Basic authentication using the
registered Tuwaga confidential client's existing id and secret. Its body is
`{ "email": "reviewer@example.com", "role": "eo" }`.

Only enabled `web` clients in `TUWAGA_ROLE_SYNC_CLIENT_IDS` may call it. If this
variable is absent, the allowlist is the production client already documented
in `scripts/split-auth-db.mjs`: `MdDAHWXdFhwCySkMOapFeIbEvgjklnVL`. Set an explicit
comma-separated allowlist for local/dev clients or changed production clients.
An empty value disables synchronization. The OIDC provider explicitly retains
plain client-secret storage, matching the existing default; if changing that
storage policy, update this endpoint's verifier at the same time.

The endpoint writes only `user_client_role` for the authenticated client.
It cannot change another client's role or global `user.role`. Supported values
are `admin`, `organizer`, `eo`, and `user`. It does not make EO a default role.
The caller is Tuwaga's server, whose user-management API first verifies its
own admin session. Browser users never receive the client secret.

This endpoint deliberately delegates management of the Tuwaga app's roles to
its authenticated backend; access to its client secret implies this authority.
Use HTTPS externally or the trusted internal service URL as with token exchange.

Tuwaga writes upstream first, then locally, so OAuth login does not undo locally
assigned roles. Direct central edits are picked up at next Tuwaga login;
immediate tournament revocation is performed by removing the local assignment.

Run `node --experimental-strip-types --test tests/*.test.mjs`.
The HTTP integration test needs an isolated disposable `TEST_DATABASE_URL`; it
starts a local Next server and verifies valid, invalid, disabled, and unrelated
clients, plus application/global role separation. The PR workflow supplies it.
