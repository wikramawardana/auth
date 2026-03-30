import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/login", "/consent", "/api/auth"];

const adminRoutes = ["/dashboard"];

function getBaseUrl(request: NextRequest): string {
	if (process.env.NODE_ENV === "production") {
		return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
	}
	return request.nextUrl.origin;
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (publicRoutes.some((route) => pathname.startsWith(route))) {
		return NextResponse.next();
	}

	const sessionCookie = getSessionCookie(request);

	if (!sessionCookie) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
	}

	try {
		const baseUrl = getBaseUrl(request);
		const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		});

		if (!sessionResponse.ok) {
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("callbackUrl", pathname);
			return NextResponse.redirect(loginUrl);
		}

		const session = await sessionResponse.json();

		if (!session?.user) {
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("callbackUrl", pathname);
			return NextResponse.redirect(loginUrl);
		}

		if (adminRoutes.some((route) => pathname.startsWith(route))) {
			if (session.user.role !== "admin") {
				return NextResponse.redirect(new URL("/", request.url));
			}
		}

		return NextResponse.next();
	} catch (error) {
		console.error("Middleware auth error:", error);
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
