#!/usr/bin/env node
/**
 * Runs every *.sql file in the migrations/ directory against DATABASE_URL,
 * in filename order. Idempotent — use CREATE TABLE IF NOT EXISTS etc.
 *
 * Usage:
 *   pnpm run db:migrate:app
 *
 * Requires DATABASE_URL in .env.local (loaded automatically via Next env).
 */
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns");
const { Pool } = require("pg");

dns.setDefaultResultOrder("ipv4first");

function loadEnv() {
	const envPath = path.join(process.cwd(), ".env.local");
	if (!fs.existsSync(envPath)) return;
	const contents = fs.readFileSync(envPath, "utf8");
	for (const line of contents.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}

async function main() {
	loadEnv();

	if (!process.env.DATABASE_URL) {
		console.error("DATABASE_URL is not set (check .env.local).");
		process.exit(1);
	}

	const migrationsDir = path.join(process.cwd(), "migrations");
	if (!fs.existsSync(migrationsDir)) {
		console.error(`No migrations directory at ${migrationsDir}`);
		process.exit(1);
	}

	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	if (files.length === 0) {
		console.log("No migration files found.");
		return;
	}

	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		for (const file of files) {
			const full = path.join(migrationsDir, file);
			const sql = fs.readFileSync(full, "utf8");
			console.log(`\n▶ Running ${file}`);
			await pool.query(sql);
			console.log(`  ✓ ${file} applied`);
		}
	} finally {
		await pool.end();
	}

	console.log("\nAll migrations applied.");
}

main().catch((err) => {
	console.error("\nMigration failed:", err.message);
	process.exit(1);
});
