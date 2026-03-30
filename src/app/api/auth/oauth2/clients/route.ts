import { Pool } from "pg";
import { type NextRequest, NextResponse } from "next/server";
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
		const result = await pool.query(
			'SELECT * FROM "oauthApplication" ORDER BY "createdAt" DESC',
		);
		return NextResponse.json(result.rows);
	} catch {
		return NextResponse.json([]);
	}
}

export async function DELETE(request: NextRequest) {
	const session = await getServerSession();

	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { clientId } = await request.json();
	if (!clientId) {
		return NextResponse.json({ error: "clientId is required" }, { status: 400 });
	}

	try {
		await pool.query('DELETE FROM "oauthApplication" WHERE "clientId" = $1', [clientId]);
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	const session = await getServerSession();

	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { clientId, name, redirectUri } = await request.json();
	if (!clientId) {
		return NextResponse.json({ error: "clientId is required" }, { status: 400 });
	}

	try {
		await pool.query(
			'UPDATE "oauthApplication" SET name = $1, "redirectUrls" = $2 WHERE "clientId" = $3',
			[name, redirectUri, clientId],
		);
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
	}
}
