"use client";

import {
	Monitor,
	MoreHorizontal,
	RefreshCw,
	Trash2,
	Users,
	Wifi,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
	const seconds = Math.floor(
		(new Date().getTime() - new Date(date).getTime()) / 1000,
	);
	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SessionsPage() {
	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [stats, setStats] = useState<SessionStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

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

	useEffect(() => {
		fetchSessions();
	}, [fetchSessions]);

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

	return (
		<>
		<Card className="neo-brutal neo-brutal-white">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-2xl font-black text-black">
							Sessions
						</CardTitle>
						<CardDescription className="font-medium text-black/60">
							Monitor active user sessions and login activity.
						</CardDescription>
					</div>
					<Button
						onClick={fetchSessions}
						className="font-bold bg-white text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
			{stats && (
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
								{stats.active}
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
								{stats.uniqueActiveUsers}
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
								{stats.total}
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
					{sessions.length} session{sessions.length !== 1 ? "s" : ""} found
				</p>
					{loading ? (
						<div className="flex justify-center py-8">
							<div className="h-6 w-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
						</div>
					) : sessions.length === 0 ? (
						<div className="text-center py-8 text-black/50 font-medium">
							No sessions found.
						</div>
					) : (
						<div className="space-y-2">
							{sessions.map((s) => (
								<div
									key={s.id}
									className="flex items-center justify-between border-2 border-black p-3"
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-9 w-9 border-2 border-black">
											<AvatarImage src={s.userImage ?? undefined} />
											<AvatarFallback className="bg-yellow-400 text-black text-xs font-bold">
												{s.userName
													? s.userName
															.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase()
													: s.userEmail[0].toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-bold leading-none text-black">
												{s.userName || "Unnamed"}
											</p>
											<p className="text-xs text-black/50 mt-0.5">
												{s.userEmail}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-3">
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
													? "bg-green-400 text-black border-2 border-black font-bold"
													: "bg-gray-300 text-black border-2 border-black font-bold"
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
												className="border-2 border-black"
											>
												<DropdownMenuItem
													onClick={() => setRevokeTarget(s)}
													className="text-destructive focus:text-destructive font-bold"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Revoke Session
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))}
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
