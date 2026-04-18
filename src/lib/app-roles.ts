import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export type ClientRoleDef = {
	id: string;
	clientId: string;
	role: string;
	isDefault: boolean;
	createdAt: string;
};

export type UserClientRole = {
	id: string;
	userId: string;
	clientId: string;
	role: string;
	createdAt: string;
	updatedAt: string;
};

export async function listRolesForClient(
	clientId: string,
): Promise<ClientRoleDef[]> {
	const res = await pool.query<ClientRoleDef>(
		'SELECT * FROM "oauth_client_role" WHERE "clientId" = $1 ORDER BY "isDefault" DESC, "role" ASC',
		[clientId],
	);
	return res.rows;
}

export async function addRoleToClient(
	clientId: string,
	role: string,
	isDefault = false,
): Promise<ClientRoleDef> {
	if (isDefault) {
		await pool.query(
			'UPDATE "oauth_client_role" SET "isDefault" = FALSE WHERE "clientId" = $1',
			[clientId],
		);
	}
	const res = await pool.query<ClientRoleDef>(
		`INSERT INTO "oauth_client_role" ("id", "clientId", "role", "isDefault")
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT ("clientId", "role")
		 DO UPDATE SET "isDefault" = EXCLUDED."isDefault"
		 RETURNING *`,
		[randomUUID(), clientId, role, isDefault],
	);
	return res.rows[0];
}

export async function removeRoleFromClient(
	clientId: string,
	role: string,
): Promise<void> {
	await pool.query(
		'DELETE FROM "oauth_client_role" WHERE "clientId" = $1 AND "role" = $2',
		[clientId, role],
	);
	await pool.query(
		'DELETE FROM "user_client_role" WHERE "clientId" = $1 AND "role" = $2',
		[clientId, role],
	);
}

export async function setDefaultRole(
	clientId: string,
	role: string,
): Promise<void> {
	await pool.query(
		'UPDATE "oauth_client_role" SET "isDefault" = FALSE WHERE "clientId" = $1',
		[clientId],
	);
	await pool.query(
		'UPDATE "oauth_client_role" SET "isDefault" = TRUE WHERE "clientId" = $1 AND "role" = $2',
		[clientId, role],
	);
}

export async function getDefaultRoleForClient(
	clientId: string,
): Promise<string | null> {
	const res = await pool.query<{ role: string }>(
		'SELECT "role" FROM "oauth_client_role" WHERE "clientId" = $1 AND "isDefault" = TRUE LIMIT 1',
		[clientId],
	);
	return res.rows[0]?.role ?? null;
}

export async function getUserRoleForClient(
	userId: string,
	clientId: string,
): Promise<string | null> {
	const assigned = await pool.query<{ role: string }>(
		'SELECT "role" FROM "user_client_role" WHERE "userId" = $1 AND "clientId" = $2 LIMIT 1',
		[userId, clientId],
	);
	if (assigned.rows[0]) return assigned.rows[0].role;

	return getDefaultRoleForClient(clientId);
}

export async function listUserClientRoles(
	userId: string,
): Promise<UserClientRole[]> {
	const res = await pool.query<UserClientRole>(
		'SELECT * FROM "user_client_role" WHERE "userId" = $1 ORDER BY "clientId" ASC',
		[userId],
	);
	return res.rows;
}

export async function setUserRoleForClient(
	userId: string,
	clientId: string,
	role: string,
): Promise<UserClientRole> {
	const allowed = await pool.query<{ role: string }>(
		'SELECT "role" FROM "oauth_client_role" WHERE "clientId" = $1 AND "role" = $2 LIMIT 1',
		[clientId, role],
	);
	if (allowed.rows.length === 0) {
		throw new Error(
			`Role "${role}" is not defined for client "${clientId}". Define it first in the client's role list.`,
		);
	}

	const res = await pool.query<UserClientRole>(
		`INSERT INTO "user_client_role" ("id", "userId", "clientId", "role")
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT ("userId", "clientId")
		 DO UPDATE SET "role" = EXCLUDED."role", "updatedAt" = NOW()
		 RETURNING *`,
		[randomUUID(), userId, clientId, role],
	);
	return res.rows[0];
}

export async function removeUserRoleForClient(
	userId: string,
	clientId: string,
): Promise<void> {
	await pool.query(
		'DELETE FROM "user_client_role" WHERE "userId" = $1 AND "clientId" = $2',
		[userId, clientId],
	);
}
