import { createHash, timingSafeEqual } from "node:crypto";

export const TUWAGA_ROLES = ["admin", "organizer", "eo", "user"] as const;
export type TuwagaRole = (typeof TUWAGA_ROLES)[number];

// Production client already documented in scripts/split-auth-db.mjs.
const PRODUCTION_TUWAGA_CLIENT_ID = "MdDAHWXdFhwCySkMOapFeIbEvgjklnVL";

export function roleSyncClientIds(
	value = process.env.TUWAGA_ROLE_SYNC_CLIENT_IDS,
) {
	return (value ?? PRODUCTION_TUWAGA_CLIENT_ID)
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);
}

export function isTuwagaRole(value: unknown): value is TuwagaRole {
	return (
		typeof value === "string" &&
		(TUWAGA_ROLES as readonly string[]).includes(value)
	);
}

export function parseClientCredentials(header: string | null) {
	const match = header?.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i);
	if (!match || match[1].length > 4096) return null;
	const decoded = Buffer.from(match[1], "base64").toString("utf8");
	const separator = decoded.indexOf(":");
	if (separator < 1 || separator === decoded.length - 1) return null;
	return {
		clientId: decoded.slice(0, separator),
		clientSecret: decoded.slice(separator + 1),
	};
}

export function canSyncTuwagaRoles(
	client:
		| {
				clientId: string;
				clientSecret: string | null;
				disabled: boolean;
				type: string;
		  }
		| undefined,
	credentials: ReturnType<typeof parseClientCredentials>,
	allowedIds = roleSyncClientIds(),
) {
	if (
		!client ||
		!credentials ||
		client.disabled ||
		client.type !== "web" ||
		!client.clientSecret ||
		client.clientId !== credentials.clientId ||
		!allowedIds.includes(client.clientId)
	)
		return false;
	const digest = (value: string) => createHash("sha256").update(value).digest();
	return timingSafeEqual(
		digest(client.clientSecret),
		digest(credentials.clientSecret),
	);
}
