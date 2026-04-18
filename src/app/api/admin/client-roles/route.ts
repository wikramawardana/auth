import { type NextRequest, NextResponse } from "next/server";
import {
	addRoleToClient,
	listRolesForClient,
	removeRoleFromClient,
	setDefaultRole,
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

	const clientId = request.nextUrl.searchParams.get("clientId");
	if (!clientId) {
		return NextResponse.json(
			{ error: "clientId query param is required" },
			{ status: 400 },
		);
	}

	try {
		const roles = await listRolesForClient(clientId);
		return NextResponse.json(roles);
	} catch (err) {
		console.error("listRolesForClient failed:", err);
		return NextResponse.json(
			{ error: "Failed to list client roles" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const body = (await request.json()) as {
		clientId?: string;
		role?: string;
		isDefault?: boolean;
	};

	if (!body.clientId || !body.role) {
		return NextResponse.json(
			{ error: "clientId and role are required" },
			{ status: 400 },
		);
	}

	try {
		const created = await addRoleToClient(
			body.clientId,
			body.role,
			body.isDefault ?? false,
		);
		return NextResponse.json(created);
	} catch (err) {
		console.error("addRoleToClient failed:", err);
		return NextResponse.json(
			{ error: "Failed to add client role" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const body = (await request.json()) as {
		clientId?: string;
		role?: string;
	};

	if (!body.clientId || !body.role) {
		return NextResponse.json(
			{ error: "clientId and role are required" },
			{ status: 400 },
		);
	}

	try {
		await setDefaultRole(body.clientId, body.role);
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("setDefaultRole failed:", err);
		return NextResponse.json(
			{ error: "Failed to set default role" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	const unauthorized = await requireAdmin();
	if (unauthorized) return unauthorized;

	const body = (await request.json()) as {
		clientId?: string;
		role?: string;
	};

	if (!body.clientId || !body.role) {
		return NextResponse.json(
			{ error: "clientId and role are required" },
			{ status: 400 },
		);
	}

	try {
		await removeRoleFromClient(body.clientId, body.role);
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("removeRoleFromClient failed:", err);
		return NextResponse.json(
			{ error: "Failed to remove client role" },
			{ status: 500 },
		);
	}
}
