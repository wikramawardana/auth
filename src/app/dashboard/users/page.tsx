"use client";

import {
	Ban,
	MoreHorizontal,
	Search,
	ShieldCheck,
	UserCog,
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

export default function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [roleDialog, setRoleDialog] = useState<User | null>(null);
	const [selectedRole, setSelectedRole] = useState("");
	const [banDialog, setBanDialog] = useState<User | null>(null);

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

	useEffect(() => {
		const timeout = setTimeout(fetchUsers, 300);
		return () => clearTimeout(timeout);
	}, [fetchUsers]);

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

	return (
		<>
			<Card className="neo-brutal neo-brutal-white">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-2xl font-black text-black">
								Users
							</CardTitle>
							<CardDescription className="font-medium text-black/60">
								Manage user accounts, roles, and access. {users.length} user
								{users.length !== 1 ? "s" : ""} found
							</CardDescription>
						</div>
						<div className="relative w-64">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-black/40" />
							<Input
								placeholder="Search by email..."
								className="pl-8 border-2 border-black font-medium"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-8">
							<div className="h-6 w-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-8 text-black/50 font-medium">
							No users found.
						</div>
					) : (
						<div className="space-y-2">
							{users.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between border-2 border-black p-3"
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-9 w-9 border-2 border-black">
											<AvatarImage src={user.image ?? undefined} />
											<AvatarFallback className="bg-yellow-400 text-black text-xs font-bold">
												{user.name
													? user.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.toUpperCase()
													: user.email[0].toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-bold leading-none text-black">
												{user.name || "Unnamed"}
											</p>
											<p className="text-xs text-black/50 mt-0.5">
												{user.email}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Badge
											className={
												user.role === "admin"
													? "bg-red-400 text-black border-2 border-black font-bold"
													: "bg-blue-200 text-black border-2 border-black font-bold"
											}
										>
											{user.role || "user"}
										</Badge>
										{user.banned && (
											<Badge className="bg-red-600 text-white border-2 border-black font-bold">
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
												className="border-2 border-black"
											>
												<DropdownMenuItem
													onClick={() => {
														setSelectedRole(user.role || "user");
														setRoleDialog(user);
													}}
													className="font-bold"
												>
													<UserCog className="h-4 w-4 mr-2" />
													Change Role
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => setBanDialog(user)}
													className={`font-bold ${
														user.banned ? "text-green-600" : "text-destructive"
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
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
				<DialogContent className="neo-brutal neo-brutal-white">
					<DialogHeader>
						<DialogTitle className="font-black text-black">
							Change User Role
						</DialogTitle>
						<DialogDescription className="font-medium text-black/60">
							Update role for {roleDialog?.name || roleDialog?.email}
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
