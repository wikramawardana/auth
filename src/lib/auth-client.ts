"use client";

import { adminClient } from "better-auth/client/plugins";
import { oidcClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
};

export const authClient = createAuthClient({
	baseURL: getBaseURL(),
	plugins: [adminClient(), oidcClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
