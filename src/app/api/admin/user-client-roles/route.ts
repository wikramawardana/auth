import { type NextRequest, NextResponse } from "next/server";
import {
	listUserClientRoles,
	removeUserRoleForClient,
	setUserRoleForClient,
} from "@/lib/app-roles";
import { getServerSession } from "@/lib/auth-server";

async function requireAdmin() {
	const session = await getServerSession();
	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	return null;
}

export async function GET(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const userId = request.nextUrl.searchParams.get("userId");
	if (!userId) {
		return NextResponse.json(
			{ error: "userId query param is required" },
			{ status: 400 },
		);
	}

	try {
		const roles = await listUserClientRoles(userId);
		return NextResponse.json(roles);
	} catch (err) {
		console.error("listUserClientRoles failed:", err);
		return NextResponse.json(
			{ error: "Failed to list user client roles" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const body = (await request.json()) as {
		userId?: string;
		clientId?: string;
		role?: string;
	};

	if (!body.userId || !body.clientId || !body.role) {
		return NextResponse.json(
			{ error: "userId, clientId and role are required" },
			{ status: 400 },
		);
	}

	try {
		const saved = await setUserRoleForClient(
			body.userId,
			body.clientId,
			body.role,
		);
		return NextResponse.json(saved);
	} catch (err) {
		console.error("setUserRoleForClient failed:", err);
		const message =
			err instanceof Error ? err.message : "Failed to assign user role";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const body = (await request.json()) as {
		userId?: string;
		clientId?: string;
	};

	if (!body.userId || !body.clientId) {
		return NextResponse.json(
			{ error: "userId and clientId are required" },
			{ status: 400 },
		);
	}

	try {
		await removeUserRoleForClient(body.userId, body.clientId);
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("removeUserRoleForClient failed:", err);
		return NextResponse.json(
			{ error: "Failed to remove user role" },
			{ status: 500 },
		);
	}
}
