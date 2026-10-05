import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

test("role sync changes only the authenticated Tuwaga client's assignment", {
	skip: !process.env.TEST_DATABASE_URL,
	timeout: 120000,
}, async (t) => {
	const databaseUrl = process.env.TEST_DATABASE_URL;
	const pool = new pg.Pool({ connectionString: databaseUrl });
	t.after(() => pool.end());
	await pool.query(
		'CREATE TABLE IF NOT EXISTS "user" (id TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT); CREATE TABLE IF NOT EXISTS "oauthApplication" ("clientId" TEXT PRIMARY KEY, "clientSecret" TEXT, disabled BOOLEAN, type TEXT)',
	);
	await pool.query(
		await readFile(
			new URL("../migrations/001_app_roles.sql", import.meta.url),
			"utf8",
		),
	);
	await pool.query(
		'INSERT INTO "user" (id, email, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
		["reviewer", "reviewer@example.com", "user"],
	);
	for (const clientId of ["tuwaga-sync-test", "other-app-test"]) {
		await pool.query(
			'INSERT INTO "oauthApplication" ("clientId", "clientSecret", disabled, type) VALUES ($1, $2, FALSE, $3) ON CONFLICT ("clientId") DO NOTHING',
			[clientId, "integration-secret", "web"],
		);
	}
	await pool.query(
		'INSERT INTO oauth_client_role (id, "clientId", role, "isDefault") VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING',
		["default-test-user", "tuwaga-sync-test", "user"],
	);
	const port = 3305;
	let logs = "";
	const server = spawn(
		process.execPath,
		[
			"node_modules/next/dist/bin/next",
			"dev",
			"--webpack",
			"--hostname",
			"127.0.0.1",
			"--port",
			String(port),
		],
		{
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
				TUWAGA_ROLE_SYNC_CLIENT_IDS: "tuwaga-sync-test",
				BETTER_AUTH_SECRET: "integration-secret-for-tests-32-characters",
				NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	server.stdout.on("data", (chunk) => {
		logs = (logs + chunk).slice(-20000);
	});
	server.stderr.on("data", (chunk) => {
		logs = (logs + chunk).slice(-20000);
	});
	t.after(() => {
		server.kill("SIGTERM");
	});
	const url = `http://127.0.0.1:${port}/api/internal/tuwaga-roles`;
	let ready = false;
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const response = await fetch(url, {
				method: "PUT",
				signal: AbortSignal.timeout(2000),
			});
			if (response.status === 401) {
				ready = true;
				break;
			}
		} catch {
			/* Startup is asynchronous. */
		}
		if (server.exitCode !== null) break;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	assert.ok(ready, `Auth route did not start:\n${logs}`);
	const put = (clientId, secret, body) =>
		fetch(url, {
			method: "PUT",
			headers: {
				Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	const body = { email: "reviewer@example.com", role: "eo" };
	assert.equal(
		(await put("other-app-test", "integration-secret", body)).status,
		401,
	);
	assert.equal(
		(await put("tuwaga-sync-test", "wrong-secret", body)).status,
		401,
	);
	assert.equal(
		(
			await put("tuwaga-sync-test", "integration-secret", {
				...body,
				role: "global_admin",
			})
		).status,
		400,
	);
	assert.equal(
		(await put("tuwaga-sync-test", "integration-secret", body)).status,
		200,
		`Role synchronization failed:\n${logs}`,
	);
	const global = await pool.query('SELECT role FROM "user" WHERE id = $1', [
		"reviewer",
	]);
	assert.equal(global.rows[0].role, "user");
	const assignments = await pool.query(
		'SELECT "clientId", role FROM user_client_role WHERE "userId" = $1',
		["reviewer"],
	);
	assert.deepEqual(assignments.rows, [
		{ clientId: "tuwaga-sync-test", role: "eo" },
	]);
	const roles = await pool.query(
		'SELECT role, "isDefault" FROM oauth_client_role WHERE "clientId" = $1',
		["tuwaga-sync-test"],
	);
	assert.equal(roles.rows.find((role) => role.role === "eo").isDefault, false);
	assert.equal(roles.rows.find((role) => role.role === "user").isDefault, true);
	await pool.query(
		'UPDATE "oauthApplication" SET disabled = TRUE WHERE "clientId" = $1',
		["tuwaga-sync-test"],
	);
	assert.equal(
		(await put("tuwaga-sync-test", "integration-secret", body)).status,
		401,
	);
});
