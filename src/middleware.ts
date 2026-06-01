import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const publicPrefixes = ["/login", "/consent", "/api/auth"];

const adminRoutes = ["/dashboard"];

function logRequest(
	request: NextRequest,
	response: NextResponse,
	startedAt: number,
	reason: string,
) {
	const userAgent = request.headers.get("user-agent") || "";
	if (userAgent.startsWith("kube-probe")) {
		return response;
	}

	const durationMs = Date.now() - startedAt;
	const { pathname, search } = request.nextUrl;
	const log = {
		event: "frontend_request",
		method: request.method,
		path: `${pathname}${search}`,
		status: response.status,
		reason,
		duration_ms: durationMs,
	};

	console.log(JSON.stringify(log));
	return response;
}

function isPublicRoute(pathname: string): boolean {
	if (pathname === "/") return true;
	return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getBaseUrl(request: NextRequest): string {
	if (process.env.NODE_ENV === "production") {
		return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
	}
	return request.nextUrl.origin;
}

function redirectToLogin(request: NextRequest, pathname: string) {
	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("callbackUrl", pathname);
	return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
	const startedAt = Date.now();
	const { pathname } = request.nextUrl;

	if (isPublicRoute(pathname)) {
		return logRequest(request, NextResponse.next(), startedAt, "public");
	}

	const sessionCookie = getSessionCookie(request);

	if (!sessionCookie) {
		return logRequest(
			request,
			redirectToLogin(request, pathname),
			startedAt,
			"no_session",
		);
	}

	try {
		const baseUrl = getBaseUrl(request);
		const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		});

		if (!sessionResponse.ok) {
			return logRequest(
				request,
				redirectToLogin(request, pathname),
				startedAt,
				"session_lookup_failed",
			);
		}

		const session = await sessionResponse.json();

		if (!session?.user) {
			return logRequest(
				request,
				redirectToLogin(request, pathname),
				startedAt,
				"missing_user",
			);
		}

		if (adminRoutes.some((route) => pathname.startsWith(route))) {
			if (session.user.role !== "admin") {
				return logRequest(
					request,
					NextResponse.redirect(new URL("/", request.url)),
					startedAt,
					"forbidden_role",
				);
			}

			return logRequest(request, NextResponse.next(), startedAt, "authorized");
		}

		return logRequest(request, NextResponse.next(), startedAt, "authenticated");
	} catch (error) {
		console.error("Middleware auth error:", error);
		return logRequest(
			request,
			redirectToLogin(request, pathname),
			startedAt,
			"auth_error",
		);
	}
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
