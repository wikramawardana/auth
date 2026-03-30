import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getServerSession } from "@/lib/auth-server";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export async function GET() {
	const session = await getServerSession();

	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await pool.query(`
			SELECT
				s.id,
				s."userId",
				s."expiresAt",
				s."createdAt",
				s."updatedAt",
				s."ipAddress",
				s."userAgent",
				u.name as "userName",
				u.email as "userEmail",
				u.image as "userImage"
			FROM "session" s
			LEFT JOIN "user" u ON s."userId" = u.id
			ORDER BY s."updatedAt" DESC
		`);

		const now = new Date();
		const sessions = result.rows.map((row) => ({
			...row,
			isActive: new Date(row.expiresAt) > now,
		}));

		const activeSessions = sessions.filter((s) => s.isActive);

		const uniqueActiveUsers = new Set(activeSessions.map((s) => s.userId)).size;

		return NextResponse.json({
			sessions,
			stats: {
				total: sessions.length,
				active: activeSessions.length,
				uniqueActiveUsers,
			},
		});
	} catch (error) {
		console.error("Failed to fetch sessions:", error);
		return NextResponse.json(
			{ error: "Failed to fetch sessions" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: Request) {
	const session = await getServerSession();

	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { sessionId } = await request.json();
	if (!sessionId) {
		return NextResponse.json(
			{ error: "sessionId is required" },
			{ status: 400 },
		);
	}

	try {
		await pool.query('DELETE FROM "session" WHERE id = $1', [sessionId]);
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json(
			{ error: "Failed to revoke session" },
			{ status: 500 },
		);
	}
}
