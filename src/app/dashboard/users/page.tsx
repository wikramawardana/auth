"use client";

import {
	AppWindow,
	Ban,
	Filter,
	MoreHorizontal,
	Search,
	ShieldCheck,
	UserCog,
	Users,
	X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ManageUserAppRolesDialog } from "@/components/dashboard/manage-user-app-roles-dialog";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { authClient } from "@/lib/auth-client";

interface User {
	id: string;
	name: string | null;
	email: string;
	image: string | null;
	role: string | null;
	banned: boolean | null;
	createdAt: string;
}

function UsersContent() {
	const searchParams = useSearchParams();
	const initialApp = searchParams.get("app") || "all";

	const [users, setUsers] = useState<User[]>([]);
	const [appStats, setAppStats] = useState<AppStatsResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [selectedApp, setSelectedApp] = useState(initialApp);

	const [roleDialog, setRoleDialog] = useState<User | null>(null);
	const [selectedRole, setSelectedRole] = useState("");
	const [banDialog, setBanDialog] = useState<User | null>(null);
	const [appRolesDialog, setAppRolesDialog] = useState<User | null>(null);

	// Sync with searchParams if query string changes
	useEffect(() => {
		const appParam = searchParams.get("app");
		if (appParam) {
			setSelectedApp(appParam);
		}
	}, [searchParams]);

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const res = await authClient.admin.listUsers({
				query: {
					limit: 100,
					...(search
						? {
								searchField: "email",
								searchValue: search,
								searchOperator: "contains" as const,
							}
						: {}),
				},
			});
			if (res.data) {
				setUsers(res.data.users as unknown as User[]);
			}
		} catch {
			toast.error("Failed to fetch users");
		} finally {
			setLoading(false);
		}
	}, [search]);

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
		const timeout = setTimeout(fetchUsers, 300);
		return () => clearTimeout(timeout);
	}, [fetchUsers]);

	useEffect(() => {
		fetchAppStats();
	}, [fetchAppStats]);

	const handleRoleChange = async () => {
		if (!roleDialog || !selectedRole) return;
		try {
			await authClient.admin.setRole({
				userId: roleDialog.id,
				role: selectedRole as "admin" | "user",
			});
			toast.success(`Role updated to ${selectedRole}`);
			setRoleDialog(null);
			fetchUsers();
		} catch {
			toast.error("Failed to update role");
		}
	};

	const handleBanToggle = async () => {
		if (!banDialog) return;
		try {
			if (banDialog.banned) {
				await authClient.admin.unbanUser({ userId: banDialog.id });
				toast.success("User unbanned");
			} else {
				await authClient.admin.banUser({ userId: banDialog.id });
				toast.success("User banned");
			}
			setBanDialog(null);
			fetchUsers();
		} catch {
			toast.error("Failed to update ban status");
		}
	};

	const selectedAppName = useMemo(() => {
		if (selectedApp === "all") return null;
		if (selectedApp === "none") return "No Apps Connected";
		const found = appStats?.apps.find((a) => a.clientId === selectedApp);
		return found ? found.name : selectedApp;
	}, [selectedApp, appStats]);

	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			if (selectedApp === "all") return true;
			const userApps = appStats?.userAppMap[user.id] || [];
			if (selectedApp === "none") {
				return userApps.length === 0;
			}
			return userApps.some((a) => a.clientId === selectedApp);
		});
	}, [users, selectedApp, appStats]);

	return (
		<>
			<Card className="neo-brutal neo-brutal-white">
				<CardHeader className="space-y-4">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-2xl font-black text-black">
								Users Management
							</CardTitle>
							<CardDescription className="font-medium text-black/60">
								{selectedAppName ? (
									<span className="inline-flex items-center gap-1 font-bold text-black">
										Filtered by app:{" "}
										<Badge className="bg-yellow-300 text-black border border-black text-xs font-black">
											{selectedAppName}
										</Badge>{" "}
										({filteredUsers.length} of {users.length} users)
									</span>
								) : (
									`Manage accounts and access across all connected applications. (${users.length} total users)`
								)}
							</CardDescription>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							{/* Search input */}
							<div className="relative w-64">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-black/40" />
								<Input
									placeholder="Search by email..."
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
										All Applications ({users.length})
									</SelectItem>
									{appStats?.apps.map((app) => (
										<SelectItem key={app.clientId} value={app.clientId}>
											{app.name} ({app.usersCount})
										</SelectItem>
									))}
									<SelectItem value="none">No Apps Connected</SelectItem>
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
								All ({users.length})
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
										{app.usersCount}
									</span>
								</button>
							))}
						</div>
					)}
				</CardHeader>

				<CardContent>
					{loading ? (
						<div className="flex justify-center py-8">
							<div className="h-6 w-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
						</div>
					) : filteredUsers.length === 0 ? (
						<div className="text-center py-12 border-2 border-dashed border-black p-6 bg-slate-50">
							<Users className="h-8 w-8 text-black/40 mx-auto mb-2" />
							<p className="text-sm font-bold text-black/70">
								No users match the selected application or search criteria.
							</p>
							{selectedApp !== "all" && (
								<Button
									variant="outline"
									onClick={() => setSelectedApp("all")}
									className="mt-3 border-2 border-black text-xs font-black"
								>
									Reset to All Users
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-2.5">
							{filteredUsers.map((user) => {
								const userApps = appStats?.userAppMap[user.id] || [];

								return (
									<div
										key={user.id}
										className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-2 border-black p-3.5 bg-white shadow-[2px_2px_0px_0px_#000] hover:bg-blue-50/30 transition-colors"
									>
										<div className="flex items-center gap-3 min-w-0">
											<Avatar className="h-10 w-10 border-2 border-black shrink-0">
												<AvatarImage src={user.image ?? undefined} />
												<AvatarFallback className="bg-yellow-400 text-black text-xs font-black">
													{user.name
														? user.name
																.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase()
														: user.email[0].toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<p className="text-sm font-black leading-snug text-black truncate">
													{user.name || "Unnamed"}
												</p>
												<p className="text-xs text-black/60 font-medium truncate">
													{user.email}
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
													No apps used yet
												</span>
											)}
										</div>

										<div className="flex items-center gap-2 shrink-0 justify-end">
											<Badge
												className={
													user.role === "admin"
														? "bg-red-400 text-black border-2 border-black font-black text-xs"
														: "bg-slate-200 text-black border-2 border-black font-black text-xs"
												}
											>
												{user.role || "user"}
											</Badge>

											{user.banned && (
												<Badge className="bg-red-600 text-white border-2 border-black font-black text-xs">
													Banned
												</Badge>
											)}

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
													className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]"
												>
													<DropdownMenuItem
														onClick={() => {
															setSelectedRole(user.role || "user");
															setRoleDialog(user);
														}}
														className="font-bold cursor-pointer"
													>
														<UserCog className="h-4 w-4 mr-2" />
														Change Global Role
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => setAppRolesDialog(user)}
														className="font-bold cursor-pointer"
													>
														<AppWindow className="h-4 w-4 mr-2" />
														App Roles
													</DropdownMenuItem>
													<DropdownMenuSeparator className="border-t border-black" />
													<DropdownMenuItem
														onClick={() => setBanDialog(user)}
														className={`font-bold cursor-pointer ${
															user.banned
																? "text-green-600"
																: "text-destructive"
														}`}
													>
														{user.banned ? (
															<>
																<ShieldCheck className="h-4 w-4 mr-2" />
																Unban User
															</>
														) : (
															<>
																<Ban className="h-4 w-4 mr-2" />
																Ban User
															</>
														)}
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
				<DialogContent className="neo-brutal neo-brutal-white">
					<DialogHeader>
						<DialogTitle className="font-black text-black">
							Change Global Role
						</DialogTitle>
						<DialogDescription className="font-medium text-black/60">
							Controls access to Auth dashboard itself. For per-app roles use
							"App Roles" instead. User: {roleDialog?.name || roleDialog?.email}
						</DialogDescription>
					</DialogHeader>
					<Select value={selectedRole} onValueChange={setSelectedRole}>
						<SelectTrigger className="border-2 border-black font-bold">
							<SelectValue placeholder="Select role" />
						</SelectTrigger>
						<SelectContent className="border-2 border-black">
							<SelectItem value="user">User</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRoleDialog(null)}
							className="font-bold border-2 border-black"
						>
							Cancel
						</Button>
						<Button
							onClick={handleRoleChange}
							className="font-bold bg-blue-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ManageUserAppRolesDialog
				userId={appRolesDialog?.id ?? null}
				userLabel={appRolesDialog?.name || appRolesDialog?.email || "user"}
				open={!!appRolesDialog}
				onOpenChange={(open) => !open && setAppRolesDialog(null)}
			/>

			<AlertDialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
				<AlertDialogContent className="neo-brutal neo-brutal-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-black">
							{banDialog?.banned ? "Unban" : "Ban"} User?
						</AlertDialogTitle>
						<AlertDialogDescription className="font-medium text-black/60">
							{banDialog?.banned
								? `This will restore access for ${banDialog?.name || banDialog?.email}.`
								: `This will block ${banDialog?.name || banDialog?.email} from accessing all connected applications.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="font-bold border-2 border-black">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBanToggle}
							className={`font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover ${
								banDialog?.banned
									? "bg-green-400 text-black"
									: "bg-red-400 text-black"
							}`}
						>
							{banDialog?.banned ? "Unban" : "Ban"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export default function UsersPage() {
	return (
		<Suspense
			fallback={
				<Card className="neo-brutal neo-brutal-white p-12 text-center">
					<div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-3 text-sm font-black text-black/60">
						Loading user accounts...
					</p>
				</Card>
			}
		>
			<UsersContent />
		</Suspense>
	);
}
