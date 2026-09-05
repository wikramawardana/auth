import { AppWindow, ArrowRight, Monitor, Shield, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Pool } from "pg";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getAppStats } from "@/lib/app-stats";
import { auth } from "@/lib/auth";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

async function getStats() {
	try {
		const result = await auth.api.listUsers({
			query: { limit: 1 },
			headers: await headers(),
		});

		let activeSessions = 0;
		let uniqueOnlineUsers = 0;
		try {
			const sessionResult = await pool.query(
				'SELECT COUNT(*) as total, COUNT(DISTINCT "userId") as unique_users FROM "session" WHERE "expiresAt" > NOW()',
			);
			activeSessions = Number.parseInt(sessionResult.rows[0]?.total || "0", 10);
			uniqueOnlineUsers = Number.parseInt(
				sessionResult.rows[0]?.unique_users || "0",
				10,
			);
		} catch {
			/* session table may not exist yet */
		}

		return {
			totalUsers: result.total ?? result.users.length,
			activeSessions,
			uniqueOnlineUsers,
		};
	} catch {
		return { totalUsers: "N/A", activeSessions: 0, uniqueOnlineUsers: 0 };
	}
}

export default async function DashboardPage() {
	const [stats, appStats] = await Promise.all([getStats(), getAppStats()]);

	return (
		<Card className="neo-brutal neo-brutal-white">
			<CardHeader>
				<CardTitle className="text-2xl font-black text-black">
					Dashboard
				</CardTitle>
				<CardDescription className="font-medium text-black/60">
					Overview of your authentication service.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card className="neo-brutal neo-brutal-white">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-bold text-black">
								Users
							</CardTitle>
							<Users className="h-4 w-4 text-blue-600" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-black text-black">
								{stats.totalUsers}
							</div>
							<CardDescription className="font-medium text-black/50">
								Registered users
							</CardDescription>
						</CardContent>
					</Card>

					<Card className="neo-brutal neo-brutal-white">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-bold text-black">
								Active Sessions
							</CardTitle>
							<Monitor className="h-4 w-4 text-green-600" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-black text-green-600">
								{stats.activeSessions}
							</div>
							<CardDescription className="font-medium text-black/50">
								Currently online
							</CardDescription>
						</CardContent>
					</Card>

					<Card className="neo-brutal neo-brutal-white">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-bold text-black">
								Users Online
							</CardTitle>
							<Users className="h-4 w-4 text-green-600" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-black text-black">
								{stats.uniqueOnlineUsers}
							</div>
							<CardDescription className="font-medium text-black/50">
								Unique logged-in users
							</CardDescription>
						</CardContent>
					</Card>

					<Card className="neo-brutal neo-brutal-white">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-bold text-black">
								Status
							</CardTitle>
							<Shield className="h-4 w-4 text-blue-600" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-black text-green-600">Healthy</div>
							<CardDescription className="font-medium text-black/50">
								OIDC provider active
							</CardDescription>
						</CardContent>
					</Card>
				</div>

				{/* Users per Application Section */}
				<Card className="neo-brutal neo-brutal-white">
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-xl font-black text-black">
								Users per Application
							</CardTitle>
							<CardDescription className="font-medium text-black/60">
								Active account distribution across all connected apps
							</CardDescription>
						</div>
						<Link
							href="/dashboard/clients"
							className="inline-flex items-center gap-1 text-xs font-black uppercase text-blue-600 hover:underline"
						>
							Manage Apps <ArrowRight className="h-3.5 w-3.5" />
						</Link>
					</CardHeader>
					<CardContent className="space-y-4">
						{appStats.apps.length === 0 ? (
							<div className="py-6 text-center text-sm font-medium text-black/50">
								No OAuth applications registered yet.
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{appStats.apps.map((app) => (
									<div
										key={app.clientId}
										className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between"
									>
										<div>
											<div className="flex items-center justify-between gap-2 mb-2">
												<div className="flex items-center gap-2 min-w-0">
													<div className="flex h-7 w-7 shrink-0 items-center justify-center bg-blue-100 border border-black">
														<AppWindow className="h-4 w-4 text-blue-700" />
													</div>
													<h3 className="font-black text-sm text-black truncate">
														{app.name}
													</h3>
												</div>
												<Badge
													className={
														app.disabled
															? "bg-red-200 text-black border border-black text-[10px] px-1.5 py-0 font-bold shrink-0"
															: "bg-green-200 text-black border border-black text-[10px] px-1.5 py-0 font-bold shrink-0"
													}
												>
													{app.disabled ? "Off" : "Active"}
												</Badge>
											</div>

											<div className="my-3">
												<div className="flex items-baseline justify-between">
													<span className="text-2xl font-black text-black">
														{app.usersCount}
													</span>
													<span className="text-xs font-bold text-black/50">
														{app.percentage}% of users
													</span>
												</div>
												<div className="w-full bg-slate-100 border border-black h-2.5 mt-1.5 overflow-hidden">
													<div
														className="bg-blue-600 h-full transition-all duration-300"
														style={{
															width: `${Math.max(app.percentage, app.usersCount > 0 ? 6 : 0)}%`,
														}}
													/>
												</div>
											</div>
										</div>

										<Link
											href={`/dashboard/users?app=${encodeURIComponent(app.clientId)}`}
											className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
										>
											<Users className="h-3.5 w-3.5" />
											View {app.usersCount} User
											{app.usersCount !== 1 ? "s" : ""}
										</Link>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid gap-4 md:grid-cols-2">
					<Link href="/dashboard/sessions" className="block">
						<Card className="neo-brutal neo-brutal-white neo-brutal-hover cursor-pointer h-full">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center bg-green-400 border-2 border-black">
										<Monitor className="h-5 w-5 text-black" />
									</div>
									<div>
										<CardTitle className="font-black text-black">
											Session Monitor
										</CardTitle>
										<CardDescription className="font-medium text-black/50">
											View active sessions and revoke access
										</CardDescription>
									</div>
								</div>
							</CardHeader>
						</Card>
					</Link>

					<Card className="neo-brutal neo-brutal-white">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center bg-blue-400 border-2 border-black">
									<AppWindow className="h-5 w-5 text-black" />
								</div>
								<div>
									<CardTitle className="font-black text-black">
										Quick Start
									</CardTitle>
									<CardDescription className="font-medium text-black/50">
										Connect your applications
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="border-2 border-black p-4 bg-yellow-50">
								<p className="text-sm font-bold mb-2 text-black">
									OIDC Discovery URL
								</p>
								<code className="text-xs break-all bg-white px-2 py-1 border-2 border-black font-mono">
									{process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
									/api/auth/.well-known/openid-configuration
								</code>
							</div>
							<div className="text-sm text-black/60 space-y-1 font-medium">
								<p>1. Register your app as an OAuth client</p>
								<p>2. Use the discovery URL in your app config</p>
								<p>3. Set the redirect URI to your callback</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</CardContent>
		</Card>
	);
}
