#!/usr/bin/env node
/**
 * split-auth-db.mjs — one-off migration separating per-app better-auth data
 * from the shared central `auth` database into per-app databases.
 *
 * Background: every Wikra app (abl, dapur-buwikra, tuwaga, expense-tracker)
 * plus the central OIDC/SSO service shared ONE Postgres `auth` database, so
 * app roles leaked between apps via the shared `user.role` column and any
 * app's session token authenticated against every backend. Per standard
 * (shared/standards/frontend.md §10) each app owns its own better-auth DB.
 *
 * What it copies, per app (idempotent — safe to re-run up to the flip):
 *   - all users, IDs preserved (SurrealDB business data references them),
 *     with role = COALESCE(user_client_role[userId], client default, 'user')
 *   - account rows of the 'auth' provider (genericOAuth login linkage)
 * NOT copied: session / verification / jwks / oauth* rows (forced re-login).
 *
 * Usage:
 *   CENTRAL_DB_URL=postgresql://... AUTH DB of the central service
 *   ABL_AUTH_DB_URL=postgresql://...            (any subset; missing = skip)
 *   DAPUR_AUTH_DB_URL=postgresql://...
 *   TUWAGA_AUTH_DB_URL=postgresql://...
 *   EXPENSE_TRACKER_AUTH_DB_URL=postgresql://...
 *   node scripts/split-auth-db.mjs
 *
 * Prerequisite: target DBs exist with the better-auth core schema applied
 * (pg_dump --schema-only of the core tables from the central DB).
 */
import dns from "node:dns";
import pg from "pg";

const { Pool } = pg;

dns.setDefaultResultOrder("ipv4first");

// OAuth client IDs registered in the central IdP (oauthApplication table).
const APPS = [
	{
		name: "abl",
		clientId: "f34a9131d82f8e01e8596fc75021829b",
		envVar: "ABL_AUTH_DB_URL",
	},
	{
		name: "dapur-buwikra",
		clientId: "589226878e4b94be2c86eb021c2d03c8",
		envVar: "DAPUR_AUTH_DB_URL",
	},
	{
		name: "tuwaga",
		clientId: "MdDAHWXdFhwCySkMOapFeIbEvgjklnVL",
		envVar: "TUWAGA_AUTH_DB_URL",
	},
	{
		name: "expense-tracker",
		clientId: "aef6c024c3c70fe34bf421c0a48bc60c",
		envVar: "EXPENSE_TRACKER_AUTH_DB_URL",
	},
];

function quoteIdent(name) {
	return `"${name.replace(/"/g, '""')}"`;
}

async function migrateApp(centralPool, app) {
	const targetUrl = process.env[app.envVar];
	if (!targetUrl) {
		console.log(`\n▶ ${app.name}: ${app.envVar} not set — skipping`);
		return;
	}

	console.log(`\n▶ ${app.name} (clientId ${app.clientId.slice(0, 8)}…)`);
	const targetPool = new Pool({ connectionString: targetUrl });

	try {
		// --- sanity: target must already have the better-auth core schema ---
		const tables = await targetPool.query(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
		);
		const tableSet = new Set(tables.rows.map((r) => r.table_name));
		for (const required of ["user", "account", "session"]) {
			if (!tableSet.has(required)) {
				throw new Error(
					`target DB is missing table "${required}" — apply the core schema ` +
						"bootstrap (pg_dump --schema-only from the central DB) first",
				);
			}
		}

		// --- read central ---
		const [usersRes, accountsRes, userRolesRes, defaultRoleRes] =
			await Promise.all([
				centralPool.query('SELECT * FROM "user" ORDER BY "createdAt"'),
				centralPool.query(
					'SELECT * FROM account WHERE "providerId" = $1 ORDER BY "createdAt"',
					["auth"],
				),
				centralPool.query(
					'SELECT "userId", role FROM user_client_role WHERE "clientId" = $1',
					[app.clientId],
				),
				centralPool.query(
					'SELECT role FROM oauth_client_role WHERE "clientId" = $1 AND "isDefault" = TRUE',
					[app.clientId],
				),
			]);

		const users = usersRes.rows;
		const userColumns = usersRes.fields.map((f) => f.name);
		const accounts = accountsRes.rows;
		const accountColumns = accountsRes.fields.map((f) => f.name);
		const userClientRole = new Map(
			userRolesRes.rows.map((r) => [r.userId, r.role]),
		);
		const defaultRole = defaultRoleRes.rows[0]?.role ?? null;

		if (!userColumns.includes("id") || !userColumns.includes("role")) {
			throw new Error("central user table lacks id/role columns — aborting");
		}

		// --- upsert users (preserving IDs; per-app role resolution) ---
		const colList = userColumns.map(quoteIdent).join(", ");
		const placeholders = userColumns.map((_, i) => `$${i + 1}`).join(", ");
		const upsertUsers = `INSERT INTO "user" (${colList}) VALUES (${placeholders})
			ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`;

		const roleDistribution = new Map();
		for (const user of users) {
			const role = userClientRole.get(user.id) ?? defaultRole ?? "user";
			roleDistribution.set(role, (roleDistribution.get(role) ?? 0) + 1);
			await targetPool.query(
				upsertUsers,
				userColumns.map((c) => (c === "role" ? role : user[c])),
			);
		}

		// --- insert auth-provider accounts unchanged (after users: FK order) ---
		let accountsCopied = 0;
		if (accounts.length > 0) {
			const accColList = accountColumns.map(quoteIdent).join(", ");
			const accPlaceholders = accountColumns
				.map((_, i) => `$${i + 1}`)
				.join(", ");
			const insertAccount = `INSERT INTO account (${accColList}) VALUES (${accPlaceholders})
				ON CONFLICT (id) DO NOTHING`;
			for (const account of accounts) {
				const res = await targetPool.query(
					insertAccount,
					accountColumns.map((c) => account[c]),
				);
				accountsCopied += res.rowCount;
			}
		}

		// --- verification summary ---
		const [userCount, sessionCount] = await Promise.all([
			targetPool.query('SELECT count(*)::int AS n FROM "user"'),
			targetPool.query("SELECT count(*)::int AS n FROM session"),
		]);

		console.log(`  ✓ users upserted: ${users.length}`);
		console.log(
			`  ✓ role resolution: default=${defaultRole ?? "(none → 'user')"}, ` +
				`explicit assignments: ${userClientRole.size}`,
		);
		for (const [role, count] of [...roleDistribution.entries()].sort()) {
			console.log(`      ${role}: ${count}`);
		}
		console.log(
			`  ✓ accounts inserted: ${accountsCopied} (of ${accounts.length} auth-provider rows)`,
		);
		console.log(`  ✓ target user count: ${userCount.rows[0].n}`);
		if (sessionCount.rows[0].n > 0) {
			console.log(
				`  ⚠ target session table has ${sessionCount.rows[0].n} rows (expected 0 before flip)`,
			);
		}
	} finally {
		await targetPool.end();
	}
}

async function main() {
	const centralUrl = process.env.CENTRAL_DB_URL ?? process.env.DATABASE_URL;
	if (!centralUrl) {
		console.error("CENTRAL_DB_URL is not set.");
		process.exit(1);
	}

	const centralPool = new Pool({ connectionString: centralUrl });
	try {
		const probe = await centralPool.query(
			"SELECT count(*)::int AS n FROM user_client_role",
		);
		console.log(
			`Central DB reachable; ${probe.rows[0].n} user_client_role rows total.`,
		);

		for (const app of APPS) {
			await migrateApp(centralPool, app);
		}
	} finally {
		await centralPool.end();
	}

	console.log("\nDone.");
}

main().catch((err) => {
	console.error("\nMigration failed:", err.message);
	process.exit(1);
});
