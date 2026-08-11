#!/usr/bin/env node

/**
 * Vault secret loader for local development.
 *
 * Reads VAULT_ADDR / VAULT_TOKEN / VAULT_SECRET_PATH from the project's .env
 * file, fetches secrets from HashiCorp Vault KV v2, sets them as environment
 * variables, and then spawns the actual command (e.g. `next dev`).
 *
 * If VAULT_ADDR or VAULT_TOKEN are missing the script passes through
 * gracefully — this way CI, Docker, and non-Vault setups still work.
 *
 * Usage: node scripts/vault-dev.mjs <command> [args...]
 *   pnpm dev  →  runs: node scripts/vault-dev.mjs next dev -p XXXX
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// 1. Parse .env (minimal manual parser — no dependencies)
// ---------------------------------------------------------------------------

function parseEnv(filePath) {
	const result = {};
	try {
		const content = readFileSync(filePath, "utf-8");
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx).trim();
			let value = trimmed.slice(eqIdx + 1).trim();

			// Strip surrounding single or double quotes
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}

			result[key] = value;
		}
	} catch {
		// .env file is optional — that's fine
	}
	return result;
}

const envFile = parseEnv(resolve(projectRoot, ".env"));
const envLocalFile = parseEnv(resolve(projectRoot, ".env.local"));

// Merge .env then .env.local — .env.local wins over .env, neither overrides real env
for (const [key, value] of Object.entries(envFile)) {
	if (!process.env[key]) process.env[key] = value;
}
for (const [key, value] of Object.entries(envLocalFile)) {
	if (!process.env[key]) process.env[key] = value;
}

// ---------------------------------------------------------------------------
// 2. Load secrets from Vault (mirrors the Rust backend pattern)
// ---------------------------------------------------------------------------

const VAULT_ADDR = process.env.VAULT_ADDR;
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const VAULT_SECRET_PATH = process.env.VAULT_SECRET_PATH;

async function loadVaultSecrets() {
	if (!VAULT_ADDR || !VAULT_TOKEN) {
		console.log(
			"[vault] VAULT_ADDR or VAULT_TOKEN not set — skipping Vault secrets",
		);
		return;
	}

	if (!VAULT_SECRET_PATH || !VAULT_SECRET_PATH.includes("/")) {
		console.error(
			"[vault] VAULT_SECRET_PATH must be set (e.g. secret/auth-local)",
		);
		process.exit(1);
	}

	const [mount, ...pathParts] = VAULT_SECRET_PATH.split("/");
	const path = pathParts.join("/");
	const addr = VAULT_ADDR.replace(/\/$/, "");
	const url = `${addr}/v1/${mount}/data/${path}`;

	console.log(`[vault] Loading secrets from ${url} …`);

	let response;
	try {
		response = await fetch(url, {
			headers: { "X-Vault-Token": VAULT_TOKEN },
		});
	} catch (err) {
		if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
			console.error(
				`[vault] Cannot reach ${addr} — is Vault running and reachable?`,
			);
		} else {
			console.error(`[vault] Network error: ${err.message}`);
		}
		process.exit(1);
	}

	if (!response.ok) {
		const body = await response.text().catch(() => "(no body)");
		console.error(`[vault] Request failed (${response.status}): ${body}`);
		process.exit(1);
	}

	const json = await response.json();
	const secrets = json?.data?.data;

	if (!secrets || typeof secrets !== "object") {
		console.error(
			"[vault] Unexpected response — expected { data: { data: { … } } }",
		);
		process.exit(1);
	}

	let count = 0;
	for (const [key, value] of Object.entries(secrets)) {
		// Vault is authoritative for application settings. Keep only the
		// device-specific Vault connection controls from the local environment.
		if (typeof value === "string" && !key.startsWith("VAULT_")) {
			process.env[key] = value;
			count++;
		}
	}

	console.log(`[vault] Loaded ${count} secrets from ${VAULT_SECRET_PATH}`);
}

await loadVaultSecrets();

// ---------------------------------------------------------------------------
// 3. Spawn the actual command (e.g. `next dev`)
// ---------------------------------------------------------------------------

const [cmd, ...args] = process.argv.slice(2);

if (!cmd) {
	console.error("Usage: node scripts/vault-dev.mjs <command> [args...]");
	process.exit(1);
}

// Inject -p <PORT> from vault secrets if not already in args
if (process.env.PORT && !args.includes("-p") && !args.includes("--port")) {
	args.push("-p", process.env.PORT);
}

const child = spawn(cmd, args, {
	stdio: "inherit",
	env: process.env,
	cwd: projectRoot,
	shell: false,
});

child.on("exit", (code) => {
	process.exit(code ?? 1);
});

process.on("SIGINT", () => {
	child.kill("SIGINT");
});
process.on("SIGTERM", () => {
	child.kill("SIGTERM");
});
