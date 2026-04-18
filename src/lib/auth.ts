import dns from "node:dns";
import { betterAuth } from "better-auth";
import { admin, jwt, oidcProvider } from "better-auth/plugins";
import { Pool } from "pg";
import { getUserRoleForClient } from "./app-roles";

dns.setDefaultResultOrder("ipv4first");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

function parseTrustedClients() {
	const raw = process.env.TRUSTED_CLIENTS;
	if (!raw) return [];

	try {
		const clients = JSON.parse(raw) as Array<{
			clientId: string;
			clientSecret: string;
			name: string;
			redirectUrls: string[];
			skipConsent?: boolean;
		}>;

		return clients.map((c) => ({
			clientId: c.clientId,
			clientSecret: c.clientSecret,
			name: c.name,
			type: "web" as const,
			redirectUrls: c.redirectUrls,
			disabled: false,
			skipConsent: c.skipConsent ?? true,
			metadata: {},
		}));
	} catch {
		console.error("Failed to parse TRUSTED_CLIENTS env var");
		return [];
	}
}

export const auth = betterAuth({
	baseURL: appUrl,
	secret: process.env.BETTER_AUTH_SECRET,
	database: new Pool({
		connectionString: process.env.DATABASE_URL,
	}),
	emailAndPassword: {
		enabled: false,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			redirectURI: `${appUrl}/api/auth/callback/google`,
		},
	},
	plugins: [
		jwt(),
		oidcProvider({
			loginPage: "/login",
			consentPage: "/consent",
			trustedClients: parseTrustedClients(),
			getAdditionalUserInfoClaim: async (user, _scopes, client) => {
				const globalRole =
					((user as Record<string, unknown>).role as string | undefined) ??
					"user";

				let appRole: string | null = null;
				if (client?.clientId) {
					try {
						appRole = await getUserRoleForClient(user.id, client.clientId);
					} catch (err) {
						console.error("Failed to resolve app_role claim:", err);
					}
				}

				return {
					role: globalRole,
					app_role: appRole ?? "user",
				};
			},
		}),
		admin({
			defaultRole: "user",
		}),
	],
	session: {
		expiresIn: 60 * 60 * 24,
		updateAge: 60 * 60,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	trustedOrigins: [
		appUrl,
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		...(process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) || []),
	],
});

export type Session = typeof auth.$Infer.Session;
