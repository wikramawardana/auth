import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { setUserRoleForClient } from "@/lib/app-roles";
import {
	canSyncTuwagaRoles,
	isTuwagaRole,
	parseClientCredentials,
	TUWAGA_ROLES,
} from "@/lib/tuwaga-role-policy";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	connectionTimeoutMillis: 8000,
});

// Server-to-server only. Credentials can modify this client's app roles;
// they never modify global user.role or another application's role.
export async function PUT(request: Request) {
	try {
		const credentials = parseClientCredentials(
			request.headers.get("authorization"),
		);
		if (!credentials)
			return NextResponse.json(
				{ error: "Invalid client credentials" },
				{ status: 401 },
			);
		const result = await pool.query<{
			clientId: string;
			clientSecret: string | null;
			disabled: boolean;
			type: string;
		}>(
			'SELECT "clientId", "clientSecret", disabled, type FROM "oauthApplication" WHERE "clientId" = $1',
			[credentials.clientId],
		);
		if (!canSyncTuwagaRoles(result.rows[0], credentials)) {
			return NextResponse.json(
				{ error: "Client is not authorized for Tuwaga role sync" },
				{ status: 401 },
			);
		}
		const body: unknown = await request.json();
		if (!body || typeof body !== "object" || Array.isArray(body))
			return NextResponse.json({ error: "Invalid request" }, { status: 400 });
		const { email, role } = body as { email?: unknown; role?: unknown };
		if (
			typeof email !== "string" ||
			email.length > 320 ||
			!email.includes("@") ||
			!isTuwagaRole(role)
		) {
			return NextResponse.json(
				{ error: "A valid email and Tuwaga role are required" },
				{ status: 400 },
			);
		}
		const users = await pool.query<{ id: string }>(
			'SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)',
			[email.trim()],
		);
		if (users.rows.length !== 1)
			return NextResponse.json(
				{ error: "User must sign in to Auth first" },
				{ status: 404 },
			);
		for (const definedRole of TUWAGA_ROLES) {
			await pool.query(
				'INSERT INTO oauth_client_role (id, "clientId", role, "isDefault") VALUES ($1, $2, $3, FALSE) ON CONFLICT ("clientId", role) DO NOTHING',
				[randomUUID(), credentials.clientId, definedRole],
			);
		}
		await setUserRoleForClient(users.rows[0].id, credentials.clientId, role);
		return NextResponse.json(
			{ role },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		if (error instanceof SyntaxError)
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
		console.error("Tuwaga app role sync failed", error);
		return NextResponse.json(
			{ error: "Unable to synchronize Tuwaga role" },
			{ status: 503 },
		);
	}
}
