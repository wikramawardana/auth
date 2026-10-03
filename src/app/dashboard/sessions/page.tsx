"use client";

import {
	AppWindow,
	Filter,
	Monitor,
	MoreHorizontal,
	RefreshCw,
	Search,
	Trash2,
	Users,
	Wifi,
	X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AppStatsResult } from "@/lib/app-stats";

interface SessionInfo {
	id: string;
	userId: string;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	ipAddress: string | null;
	userAgent: string | null;
	userName: string | null;
	userEmail: string;
	userImage: string | null;
	isActive: boolean;
}

interface SessionStats {
	total: number;
	active: number;
	uniqueActiveUsers: number;
}

function parseUserAgent(ua: string | null): string {
	if (!ua) return "Unknown device";
	if (ua.includes("Chrome")) return "Chrome";
	if (ua.includes("Firefox")) return "Firefox";
	if (ua.includes("Safari")) return "Safari";
	if (ua.includes("Edge")) return "Edge";
	return "Unknown browser";
}

function timeAgo(date: string): string {
	const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

function SessionsContent() {
	const searchParams = useSearchParams();
	const initialApp = searchParams.get("app") || "all";

	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [stats, setStats] = useState<SessionStats | null>(null);
	const [appStats, setAppStats] = useState<AppStatsResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [selectedApp, setSelectedApp] = useState(initialApp);
	const [displayLimit, setDisplayLimit] = useState(50);
	const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

	// Sync with searchParams if query string changes
	useEffect(() => {
		const appParam = searchParams.get("app");
		if (appParam) {
			setSelectedApp(appParam);
		}
	}, [searchParams]);

	// Reset display limit when filter/search changes
	useEffect(() => {
		setDisplayLimit(50);
	}, [selectedApp, search]);

	const fetchSessions = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/auth/sessions");
			if (res.ok) {
				const data = await res.json();
				setSessions(data.sessions || []);
				setStats(data.stats || null);
			}
		} catch {
			toast.error("Failed to fetch sessions");
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchAppStats = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/app-stats");
			if (res.ok) {
				const data = (await res.json()) as AppStatsResult;
				setAppStats(data);
			}
		} catch (err) {
			console.error("Failed to fetch app stats", err);
		}
	}, []);

	useEffect(() => {
		fetchSessions();
		fetchAppStats();
	}, [fetchSessions, fetchAppStats]);

	const handleRevoke = async () => {
		if (!revokeTarget) return;
		try {
			const res = await fetch("/api/auth/sessions", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: revokeTarget.id }),
			});
			if (res.ok) {
				toast.success("Session revoked");
				setRevokeTarget(null);
				fetchSessions();
			} else {
				toast.error("Failed to revoke session");
			}
		} catch {
			toast.error("Failed to revoke session");
		}
	};

	const appSessionCounts = useMemo(() => {
		if (!appStats) return {};
		const counts: Record<string, number> = {};
		for (const app of appStats.apps) {
			counts[app.clientId] = sessions.filter((s) => {
				const userApps = appStats.userAppMap[s.userId] || [];
				return userApps.some((a) => a.clientId === app.clientId);
			}).length;
		}
		return counts;
	}, [sessions, appStats]);

	const noAppSessionsCount = useMemo(() => {
		if (!appStats) return 0;
		return sessions.filter((s) => {
			const userApps = appStats.userAppMap[s.userId] || [];
			return userApps.length === 0;
		}).length;
	}, [sessions, appStats]);

	const selectedAppName = useMemo(() => {
		if (selectedApp === "all") return null;
		if (selectedApp === "none") return "No Apps Connected";
		const found = appStats?.apps.find((a) => a.clientId === selectedApp);
		return found ? found.name : selectedApp;
	}, [selectedApp, appStats]);

	const filteredSessions = useMemo(() => {
		return sessions.filter((s) => {
			if (selectedApp !== "all") {
				const userApps = appStats?.userAppMap[s.userId] || [];
				if (selectedApp === "none") {
					if (userApps.length > 0) return false;
				} else {
					if (!userApps.some((a) => a.clientId === selectedApp)) return false;
				}
			}

			if (search.trim()) {
				const q = search.toLowerCase().trim();
				const matchEmail = s.userEmail.toLowerCase().includes(q);
				const matchName = s.userName?.toLowerCase().includes(q) ?? false;
				const matchIp = s.ipAddress?.toLowerCase().includes(q) ?? false;
				if (!matchEmail && !matchName && !matchIp) return false;
			}

			return true;
		});
	}, [sessions, selectedApp, search, appStats]);

	const displayStats = useMemo(() => {
		if (selectedApp === "all" && !search.trim()) {
			return stats;
		}
		const activeSessions = filteredSessions.filter((s) => s.isActive);
		const uniqueActiveUsers = new Set(activeSessions.map((s) => s.userId)).size;
		return {
			total: filteredSessions.length,
			active: activeSessions.length,
			uniqueActiveUsers,
		};
	}, [stats, filteredSessions, selectedApp, search]);

	const displayedSessions = useMemo(() => {
		return filteredSessions.slice(0, displayLimit);
	}, [filteredSessions, displayLimit]);

	return (
		<>
			<Card className="neo-brutal neo-brutal-white">
				<CardHeader className="space-y-4">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-2xl font-black text-black">
								Sessions
							</CardTitle>
							<CardDescription className="font-medium text-black/60">
								{selectedAppName ? (
									<span className="inline-flex items-center gap-1 font-bold text-black">
										Filtered by app:{" "}
										<Badge className="bg-yellow-300 text-black border border-black text-xs font-black">
											{selectedAppName}
										</Badge>{" "}
										({filteredSessions.length} of {sessions.length} sessions)
									</span>
								) : (
									`Monitor active user sessions and login activity across all connected applications. (${sessions.length} total sessions)`
								)}
							</CardDescription>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							{/* Search input */}
							<div className="relative w-64">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-black/40" />
								<Input
									placeholder="Search by email, name, or IP..."
									className="pl-8 border-2 border-black font-medium"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>

							{/* App Filter dropdown */}
							<Select value={selectedApp} onValueChange={setSelectedApp}>
								<SelectTrigger className="w-56 border-2 border-black font-bold bg-white">
									<SelectValue placeholder="Filter by App" />
								</SelectTrigger>
								<SelectContent className="border-2 border-black">
									<SelectItem value="all">
										All Applications ({sessions.length})
									</SelectItem>
									{appStats?.apps.map((app) => (
										<SelectItem key={app.clientId} value={app.clientId}>
											{app.name} ({appSessionCounts[app.clientId] ?? 0})
										</SelectItem>
									))}
									<SelectItem value="none">
										No Apps Connected ({noAppSessionsCount})
									</SelectItem>
								</SelectContent>
							</Select>

							{selectedApp !== "all" && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectedApp("all")}
									className="border-2 border-black font-black text-xs h-9"
									title="Clear filter"
								>
									<X className="h-3.5 w-3.5 mr-1" /> Clear
								</Button>
							)}

							<Button
								onClick={() => {
									fetchSessions();
									fetchAppStats();
								}}
								className="font-bold bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh
							</Button>
						</div>
					</div>

					{/* Application quick chips */}
					{appStats && appStats.apps.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10">
							<span className="text-xs font-black uppercase tracking-wider text-black/50 mr-1 flex items-center gap-1">
								<Filter className="h-3 w-3" /> App Filters:
							</span>
							<button
								type="button"
								onClick={() => setSelectedApp("all")}
								className={`px-2.5 py-1 text-xs font-black uppercase border-2 border-black transition ${
									selectedApp === "all"
										? "bg-[#2563eb] text-white shadow-[2px_2px_0px_0px_#000]"
										: "bg-white text-black hover:bg-slate-100"
								}`}
							>
								All ({sessions.length})
							</button>
							{appStats.apps.map((app) => (
								<button
									key={app.clientId}
									type="button"
									onClick={() => setSelectedApp(app.clientId)}
									className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase border-2 border-black transition ${
										selectedApp === app.clientId
											? "bg-[#ffe45c] text-black shadow-[2px_2px_0px_0px_#000]"
											: "bg-white text-black hover:bg-slate-100"
									}`}
								>
									<AppWindow className="h-3 w-3" />
									{app.name}
									<span className="bg-black/10 px-1 rounded text-[10px]">
										{appSessionCounts[app.clientId] ?? 0}
									</span>
								</button>
							))}
							{noAppSessionsCount > 0 && (
								<button
									type="button"
									onClick={() => setSelectedApp("none")}
									className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase border-2 border-black transition ${
										selectedApp === "none"
											? "bg-[#ffe45c] text-black shadow-[2px_2px_0px_0px_#000]"
											: "bg-white text-black hover:bg-slate-100"
									}`}
								>
									No Apps
									<span className="bg-black/10 px-1 rounded text-[10px]">
										{noAppSessionsCount}
									</span>
								</button>
							)}
						</div>
					)}
				</CardHeader>
				<CardContent className="space-y-6">
					{displayStats && (
						<div className="grid gap-4 md:grid-cols-3">
							<Card className="neo-brutal neo-brutal-white">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-bold text-black">
										Active Sessions
									</CardTitle>
									<Wifi className="h-4 w-4 text-green-600" />
								</CardHeader>
								<CardContent>
									<div className="text-3xl font-black text-black">
										{displayStats.active}
									</div>
									<CardDescription className="font-medium text-black/50">
										Currently online
									</CardDescription>
								</CardContent>
							</Card>

							<Card className="neo-brutal neo-brutal-white">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-bold text-black">
										Unique Users Online
									</CardTitle>
									<Users className="h-4 w-4 text-blue-600" />
								</CardHeader>
								<CardContent>
									<div className="text-3xl font-black text-black">
										{displayStats.uniqueActiveUsers}
									</div>
									<CardDescription className="font-medium text-black/50">
										Distinct logged-in users
									</CardDescription>
								</CardContent>
							</Card>

							<Card className="neo-brutal neo-brutal-white">
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-bold text-black">
										Total Sessions
									</CardTitle>
									<Monitor className="h-4 w-4 text-black/50" />
								</CardHeader>
								<CardContent>
									<div className="text-3xl font-black text-black">
										{displayStats.total}
									</div>
									<CardDescription className="font-medium text-black/50">
										Including expired
									</CardDescription>
								</CardContent>
							</Card>
						</div>
					)}

					<div>
						<h3 className="font-black text-black mb-1">All Sessions</h3>
						<p className="text-sm font-medium text-black/50 mb-4">
							{filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""} found
							{filteredSessions.length !== sessions.length && (
								<span> (filtered from {sessions.length} total)</span>
							)}
						</p>
						{loading ? (
							<div className="flex justify-center py-8">
								<div className="h-6 w-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
							</div>
						) : filteredSessions.length === 0 ? (
							<div className="text-center py-12 border-2 border-dashed border-black p-6 bg-slate-50">
								<Users className="h-8 w-8 text-black/40 mx-auto mb-2" />
								<p className="text-sm font-bold text-black/70">
									No sessions match the selected application or search criteria.
								</p>
								{(selectedApp !== "all" || search) && (
									<Button
										variant="outline"
										onClick={() => {
											setSelectedApp("all");
											setSearch("");
										}}
										className="mt-3 border-2 border-black text-xs font-black"
									>
										Reset to All Sessions
									</Button>
								)}
							</div>
						) : (
							<div className="space-y-2.5">
								{displayedSessions.map((s) => {
									const userApps = appStats?.userAppMap[s.userId] || [];

									return (
										<div
											key={s.id}
											className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black p-3.5 bg-white shadow-[2px_2px_0px_0px_#000] hover:bg-blue-50/30 transition-colors"
										>
											<div className="flex items-center gap-3 min-w-0 sm:w-1/3">
												<Avatar className="h-10 w-10 border-2 border-black shrink-0">
													<AvatarImage src={s.userImage ?? undefined} />
													<AvatarFallback className="bg-yellow-400 text-black text-xs font-black">
														{s.userName
															? s.userName
																	.split(" ")
																	.map((n) => n[0])
																	.join("")
																	.toUpperCase()
															: s.userEmail[0].toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-sm font-black leading-snug text-black truncate">
														{s.userName || "Unnamed"}
													</p>
													<p className="text-xs text-black/60 font-medium truncate">
														{s.userEmail}
													</p>
												</div>
											</div>

											{/* Connected Applications Badges */}
											<div className="flex flex-wrap items-center gap-1.5 flex-1 sm:justify-center sm:px-4">
												{userApps.length > 0 ? (
													userApps.map((app) => (
														<span
															key={app.clientId}
															className="inline-flex items-center gap-1 border border-black bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-950 shadow-[1px_1px_0px_0px_#000]"
															title={`Client: ${app.clientId}`}
														>
															<AppWindow className="h-3 w-3 text-blue-700 shrink-0" />
															{app.appName}
															{app.appRole && (
																<span className="ml-0.5 rounded bg-blue-300/80 px-1 py-0 text-[10px] uppercase font-black text-blue-950">
																	{app.appRole}
																</span>
															)}
														</span>
													))
												) : (
													<span className="text-[11px] font-semibold text-black/40 italic">
														Central Auth only
													</span>
												)}
											</div>

											<div className="flex items-center gap-3 shrink-0 justify-end sm:w-1/3">
												<div className="text-right hidden sm:block">
													<p className="text-xs font-medium text-black/60">
														{parseUserAgent(s.userAgent)}
														{s.ipAddress && ` · ${s.ipAddress}`}
													</p>
													<p className="text-xs text-black/40">
														Last active {timeAgo(s.updatedAt)}
													</p>
												</div>

												<Badge
													className={
														s.isActive
															? "bg-green-400 text-black border-2 border-black font-black text-xs"
															: "bg-gray-300 text-black border-2 border-black font-black text-xs"
													}
												>
													{s.isActive ? "Active" : "Expired"}
												</Badge>

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 border-2 border-black hover:bg-yellow-200"
														>
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="border-2 border-black font-bold"
													>
														<DropdownMenuItem
															onClick={() => setRevokeTarget(s)}
															className="text-destructive focus:text-destructive font-bold cursor-pointer"
														>
															<Trash2 className="h-4 w-4 mr-2" />
															Revoke Session
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>
									);
								})}

								{filteredSessions.length > displayLimit && (
									<div className="flex items-center justify-center gap-3 pt-4">
										<Button
											variant="outline"
											onClick={() => setDisplayLimit((prev) => prev + 50)}
											className="border-2 border-black font-black text-xs h-9 px-4 bg-white shadow-[2px_2px_0px_0px_#000] hover:bg-slate-100"
										>
											Load More Sessions ({filteredSessions.length - displayLimit} remaining)
										</Button>
										<Button
											variant="ghost"
											onClick={() => setDisplayLimit(filteredSessions.length)}
											className="font-bold text-xs text-black/60 hover:text-black underline"
										>
											Show All ({filteredSessions.length})
										</Button>
									</div>
								)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<AlertDialog
				open={!!revokeTarget}
				onOpenChange={() => setRevokeTarget(null)}
			>
				<AlertDialogContent className="neo-brutal neo-brutal-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-black">
							Revoke Session?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-black/60 font-medium">
							This will immediately log out{" "}
							{revokeTarget?.userName || revokeTarget?.userEmail} from this
							session. They will need to sign in again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="font-bold border-2 border-black">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRevoke}
							className="font-bold bg-red-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export default function SessionsPage() {
	return (
		<Suspense
			fallback={
				<Card className="neo-brutal neo-brutal-white p-12 text-center">
					<div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-3 text-sm font-black text-black/60">
						Loading sessions...
					</p>
				</Card>
			}
		>
			<SessionsContent />
		</Suspense>
	);
}
