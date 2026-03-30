"use client";

import { CheckCircle2, Shield, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function ConsentForm() {
	const searchParams = useSearchParams();
	const [isLoading, setIsLoading] = useState<"approve" | "deny" | null>(null);

	const consentCode = searchParams.get("consent_code");
	const clientId = searchParams.get("client_id");
	const scope = searchParams.get("scope") || "openid profile email";
	const scopes = scope.split(" ").filter(Boolean);

	const scopeLabels: Record<string, string> = {
		openid: "Verify your identity",
		profile: "Access your name and profile picture",
		email: "Access your email address",
	};

	const handleConsent = async (accept: boolean) => {
		setIsLoading(accept ? "approve" : "deny");
		try {
			if (consentCode) {
				const res = await fetch("/api/auth/oauth2/consent", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ accept, consent_code: consentCode }),
				});
				const data = await res.json().catch(() => null);
				const redirectUrl =
					data?.redirectURI || data?.url || data?.redirect_uri;
				if (redirectUrl) {
					window.location.href = redirectUrl;
					return;
				}
			}
		} catch (error) {
			console.error("Consent error:", error);
		}
		setIsLoading(null);
	};

	if (!consentCode) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center p-4">
				<Card className="w-full max-w-md neo-brutal neo-brutal-white">
					<CardHeader className="text-center">
						<CardTitle className="text-xl font-black text-black dark:text-white">
							Invalid Request
						</CardTitle>
						<CardDescription className="font-medium text-black/70 dark:text-white/70">
							No consent code found. This page should be accessed through an
							OAuth authorization flow.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-yellow-100 via-pink-100 to-cyan-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
			<div className="absolute top-10 right-10 w-16 h-16 bg-blue-400 border-4 border-black dark:border-white rotate-12 hidden md:block" />
			<div className="absolute bottom-20 left-16 w-20 h-20 bg-yellow-400 border-4 border-black dark:border-white -rotate-6 hidden md:block" />

			<Card className="w-full max-w-md neo-brutal neo-brutal-white">
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto flex items-center justify-center w-20 h-20 bg-green-400 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
						<Shield className="w-12 h-12 text-black" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-2xl font-black text-black dark:text-white">
							Authorization Request
						</CardTitle>
						<CardDescription className="text-base font-medium text-black/70 dark:text-white/70">
							<span className="font-bold text-black dark:text-white">
								{clientId || "An application"}
							</span>{" "}
							wants to access your account
						</CardDescription>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="space-y-2">
						<p className="text-sm font-bold text-black/60 dark:text-white/60">
							This will allow the application to:
						</p>
						<div className="space-y-2">
							{scopes.map((s) => (
								<div
									key={s}
									className="flex items-center gap-2 text-sm font-medium border-2 border-black/20 dark:border-white/20 rounded-md px-3 py-2"
								>
									<CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
									<span className="text-black dark:text-white">
										{scopeLabels[s] || s}
									</span>
								</div>
							))}
						</div>
					</div>

					<Separator className="bg-black/20 dark:bg-white/20 h-[2px]" />

					<p className="text-xs text-black/50 dark:text-white/50 text-center font-medium">
						You can revoke this access at any time from your account settings.
					</p>
				</CardContent>

				<CardFooter className="flex gap-3">
					<Button
						className="flex-1 h-12 font-bold bg-white dark:bg-black text-black dark:text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-brutal-hover"
						onClick={() => handleConsent(false)}
						disabled={isLoading !== null}
					>
						{isLoading === "deny" ? (
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
						) : (
							<>
								<XCircle className="h-4 w-4 mr-1" />
								Deny
							</>
						)}
					</Button>
					<Button
						className="flex-1 h-12 font-bold bg-green-400 text-black border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-brutal-hover"
						onClick={() => handleConsent(true)}
						disabled={isLoading !== null}
					>
						{isLoading === "approve" ? (
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
						) : (
							<>
								<CheckCircle2 className="h-4 w-4 mr-1" />
								Approve
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

export default function ConsentPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen w-full flex items-center justify-center">
					<div className="w-6 h-6 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
				</div>
			}
		>
			<ConsentForm />
		</Suspense>
	);
}
