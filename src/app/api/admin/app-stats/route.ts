import { NextResponse } from "next/server";
import { getAppStats } from "@/lib/app-stats";
import { getServerSession } from "@/lib/auth-server";

export async function GET() {
	const session = await getServerSession();

	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const stats = await getAppStats();
		return NextResponse.json(stats);
	} catch (err) {
		console.error("Failed to load app stats:", err);
		return NextResponse.json(
			{ error: "Failed to load app stats" },
			{ status: 500 },
		);
	}
}
