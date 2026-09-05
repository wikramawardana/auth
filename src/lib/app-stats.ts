import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export interface AppUserStat {
	id: string;
	clientId: string;
	name: string;
	redirectUrls: string;
	disabled: boolean;
	usersCount: number;
	percentage: number;
}

export interface UserAppMembership {
	clientId: string;
	appName: string;
	appRole?: string | null;
}

export interface AppStatsResult {
	totalUsers: number;
	apps: AppUserStat[];
	userAppMap: Record<string, UserAppMembership[]>;
}

export async function getAppStats(): Promise<AppStatsResult> {
	try {
		const usersRes = await pool.query<{ total: string }>(
			'SELECT COUNT(*) as total FROM "user"',
		);
		const totalUsers = Number.parseInt(usersRes.rows[0]?.total || "0", 10);

		const appsRes = await pool.query<{
			id: string;
			clientId: string;
			name: string;
			redirectUrls: string;
			disabled: boolean;
			usersCount: number;
		}>(`
			SELECT 
				app.id,
				app."clientId",
				app.name,
				app."redirectUrls",
				app.disabled,
				COALESCE(counts.users_count, 0)::int as "usersCount"
			FROM "oauthApplication" app
			LEFT JOIN (
				SELECT "clientId", COUNT(DISTINCT "userId") as users_count
				FROM (
					SELECT "clientId", "userId" FROM "oauthConsent"
					UNION
					SELECT "clientId", "userId" FROM "user_client_role"
					UNION
					SELECT "clientId", "userId" FROM "oauthAccessToken"
				) combined
				GROUP BY "clientId"
			) counts ON app."clientId" = counts."clientId"
			ORDER BY "usersCount" DESC, app.name ASC
		`);

		const apps: AppUserStat[] = appsRes.rows.map((app) => ({
			...app,
			percentage:
				totalUsers > 0
					? Math.round((Number(app.usersCount) / totalUsers) * 100)
					: 0,
		}));

		const userAppsRes = await pool.query<{
			userId: string;
			clientId: string;
			appName: string;
			appRole: string | null;
		}>(`
			SELECT DISTINCT
				u_app."userId",
				u_app."clientId",
				COALESCE(app.name, u_app."clientId") as "appName",
				ucr.role as "appRole"
			FROM (
				SELECT "clientId", "userId" FROM "oauthConsent"
				UNION
				SELECT "clientId", "userId" FROM "user_client_role"
				UNION
				SELECT "clientId", "userId" FROM "oauthAccessToken"
			) u_app
			LEFT JOIN "oauthApplication" app ON app."clientId" = u_app."clientId"
			LEFT JOIN "user_client_role" ucr ON ucr."userId" = u_app."userId" AND ucr."clientId" = u_app."clientId"
			ORDER BY "appName" ASC
		`);

		const userAppMap: Record<string, UserAppMembership[]> = {};
		for (const row of userAppsRes.rows) {
			if (!userAppMap[row.userId]) {
				userAppMap[row.userId] = [];
			}
			userAppMap[row.userId].push({
				clientId: row.clientId,
				appName: row.appName,
				appRole: row.appRole,
			});
		}

		return {
			totalUsers,
			apps,
			userAppMap,
		};
	} catch (error) {
		console.error("Failed to calculate app stats:", error);
		return {
			totalUsers: 0,
			apps: [],
			userAppMap: {},
		};
	}
}
