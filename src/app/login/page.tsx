"use client";

import { Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { signIn, useSession } from "@/lib/auth-client";

const OIDC_CALLBACK_STORAGE_KEY = "auth.oidc.callbackUrl";

function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

function LoginForm() {
	const searchParams = useSearchParams();
	const { data: session, isPending } = useSession();
	const [isLoading, setIsLoading] = React.useState(false);
	const autoTriggered = React.useRef(false);

	const clientId = searchParams.get("client_id");
	const oidcState = searchParams.get("state");
	const shouldResumeOidc = searchParams.get("resumeOidc") === "1";
	const isOidcFlow = !!(clientId && oidcState);

	const callbackUrl = isOidcFlow
		? `/api/auth/oauth2/authorize?${searchParams.toString()}`
		: searchParams.get("callbackUrl") || "/dashboard";

	const triggerGoogleSignIn = React.useCallback(async () => {
		setIsLoading(true);
		try {
			const signInCallbackUrl = isOidcFlow
				? "/login?resumeOidc=1"
				: callbackUrl;

			if (isOidcFlow) {
				window.sessionStorage.setItem(OIDC_CALLBACK_STORAGE_KEY, callbackUrl);
			}

			await signIn.social({
				provider: "google",
				callbackURL: signInCallbackUrl,
			});
		} catch (error) {
			console.error("Sign in error:", error);
			setIsLoading(false);
		}
	}, [callbackUrl, isOidcFlow]);

	React.useEffect(() => {
		if (!isPending && session) {
			const storedOidcCallback = shouldResumeOidc
				? window.sessionStorage.getItem(OIDC_CALLBACK_STORAGE_KEY)
				: null;
			if (storedOidcCallback) {
				window.sessionStorage.removeItem(OIDC_CALLBACK_STORAGE_KEY);
			}

			window.location.href = storedOidcCallback || callbackUrl;
		}
	}, [session, isPending, callbackUrl, shouldResumeOidc]);

	React.useEffect(() => {
		if (!isPending && !session && isOidcFlow && !autoTriggered.current) {
			autoTriggered.current = true;
			triggerGoogleSignIn();
		}
	}, [isPending, session, isOidcFlow, triggerGoogleSignIn]);

	if (isOidcFlow) {
		return (
			<div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f0] p-4 gap-4">
				<div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
				<p className="text-sm font-medium text-black/60">
					Redirecting to Google...
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f0] p-4">
			<div className="absolute top-12 left-16 w-16 h-16 border-4 border-black rotate-12 hidden md:block" />
			<div className="absolute top-28 right-24 w-10 h-10 bg-black rotate-45 hidden md:block" />
			<div className="absolute bottom-24 left-24 w-20 h-5 bg-black hidden md:block" />
			<div className="absolute bottom-16 right-16 w-8 h-8 border-4 border-black rounded-full hidden md:block" />

			<Card className="w-full max-w-sm bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
				<CardHeader className="text-center space-y-5 pb-2 pt-8">
					<div className="mx-auto flex items-center justify-center w-16 h-16 bg-black">
						<Shield className="w-9 h-9 text-white" />
					</div>

					<div className="space-y-1">
						<CardTitle className="text-2xl font-black tracking-tight text-black uppercase">
							Auth
						</CardTitle>
						<CardDescription className="text-sm font-medium text-black/50">
							Sign in to continue
						</CardDescription>
					</div>
				</CardHeader>

				<CardContent className="space-y-6 pb-8">
					<div className="w-full h-[2px] bg-black/10" />

					<Button
						onClick={triggerGoogleSignIn}
						disabled={isLoading}
						className="w-full h-12 text-base font-bold bg-white text-black border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-150"
					>
						{isLoading ? (
							<div className="flex items-center gap-3">
								<div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
								<span>Signing in...</span>
							</div>
						) : (
							<div className="flex items-center gap-3">
								<GoogleIcon className="w-5 h-5" />
								<span>Continue with Google</span>
							</div>
						)}
					</Button>

					<p className="text-center text-xs text-black/40 leading-relaxed">
						By signing in, you agree to our terms and conditions.
						<br />
						Only authorized users can access this system.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function LoginLoading() {
	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f0] p-4">
			<Card className="w-full max-w-sm bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
				<CardHeader className="text-center space-y-5 pb-2 pt-8">
					<div className="mx-auto flex items-center justify-center w-16 h-16 bg-black">
						<Shield className="w-9 h-9 text-white" />
					</div>
					<div className="space-y-1">
						<CardTitle className="text-2xl font-black tracking-tight text-black uppercase">
							Auth
						</CardTitle>
						<CardDescription className="text-sm font-medium text-black/50">
							Loading...
						</CardDescription>
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<LoginLoading />}>
			<LoginForm />
		</Suspense>
	);
}
