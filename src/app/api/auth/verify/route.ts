import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
	try {
		const reqHeaders = await headers();
		const session = await auth.api.getSession({
			headers: reqHeaders,
		});

		if (!session?.user) {
			return new NextResponse(null, { status: 401 });
		}

		const response = NextResponse.json(
			{
				authenticated: true,
				user: {
					id: session.user.id,
					email: session.user.email,
					name: session.user.name,
					role: (session.user as Record<string, unknown>).role ?? "user",
				},
			},
			{ status: 200 },
		);

		// Populate headers for reverse-proxy auth_request_set
		response.headers.set("X-User-Id", session.user.id);
		response.headers.set("X-User-Email", session.user.email);
		response.headers.set("X-User-Name", session.user.name || "");
		if ((session.user as Record<string, unknown>).role) {
			response.headers.set(
				"X-User-Role",
				String((session.user as Record<string, unknown>).role),
			);
		}

		return response;
	} catch (error) {
		console.error("Session verification failed:", error);
		return new NextResponse(null, { status: 401 });
	}
}

export async function HEAD() {
	return GET();
}
