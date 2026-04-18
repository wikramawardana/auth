"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface OAuthClient {
	clientId: string;
	name: string;
	disabled?: boolean;
}

interface ClientRole {
	id: string;
	clientId: string;
	role: string;
	isDefault: boolean;
}

interface UserClientRole {
	id: string;
	userId: string;
	clientId: string;
	role: string;
}

interface Props {
	userId: string | null;
	userLabel: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ManageUserAppRolesDialog({
	userId,
	userLabel,
	open,
	onOpenChange,
}: Props) {
	const [clients, setClients] = useState<OAuthClient[]>([]);
	const [assignments, setAssignments] = useState<UserClientRole[]>([]);
	const [rolesByClient, setRolesByClient] = useState<
		Record<string, ClientRole[]>
	>({});
	const [loading, setLoading] = useState(false);
	const [pendingClient, setPendingClient] = useState<string | null>(null);

	const fetchAll = useCallback(async () => {
		if (!userId) return;
		setLoading(true);
		try {
			const [clientsRes, assignmentsRes] = await Promise.all([
				fetch("/api/auth/oauth2/clients"),
				fetch(
					`/api/admin/user-client-roles?userId=${encodeURIComponent(userId)}`,
				),
			]);

			const clientsData = clientsRes.ok
				? ((await clientsRes.json()) as OAuthClient[])
				: [];
			const assignmentsData = assignmentsRes.ok
				? ((await assignmentsRes.json()) as UserClientRole[])
				: [];

			setClients(Array.isArray(clientsData) ? clientsData : []);
			setAssignments(assignmentsData);

			const roleMap: Record<string, ClientRole[]> = {};
			await Promise.all(
				(Array.isArray(clientsData) ? clientsData : []).map(async (c) => {
					const r = await fetch(
						`/api/admin/client-roles?clientId=${encodeURIComponent(c.clientId)}`,
					);
					if (r.ok) {
						roleMap[c.clientId] = (await r.json()) as ClientRole[];
					} else {
						roleMap[c.clientId] = [];
					}
				}),
			);
			setRolesByClient(roleMap);
		} catch {
			toast.error("Failed to load app roles");
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		if (open) {
			fetchAll();
		} else {
			setClients([]);
			setAssignments([]);
			setRolesByClient({});
		}
	}, [open, fetchAll]);

	const assignedRole = (clientId: string) =>
		assignments.find((a) => a.clientId === clientId)?.role ?? null;

	const defaultRole = (clientId: string) =>
		rolesByClient[clientId]?.find((r) => r.isDefault)?.role ?? null;

	const handleSelect = async (clientId: string, role: string) => {
		if (!userId) return;
		setPendingClient(clientId);
		try {
			const res = await fetch("/api/admin/user-client-roles", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, clientId, role }),
			});
			if (res.ok) {
				toast.success("Role updated");
				fetchAll();
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error || "Failed to update role");
			}
		} catch {
			toast.error("Failed to update role");
		} finally {
			setPendingClient(null);
		}
	};

	const handleClear = async (clientId: string) => {
		if (!userId) return;
		setPendingClient(clientId);
		try {
			const res = await fetch("/api/admin/user-client-roles", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, clientId }),
			});
			if (res.ok) {
				toast.success("Reset to default");
				fetchAll();
			} else {
				toast.error("Failed to clear role");
			}
		} catch {
			toast.error("Failed to clear role");
		} finally {
			setPendingClient(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="neo-brutal neo-brutal-white max-w-2xl">
				<DialogHeader>
					<DialogTitle className="font-black text-black dark:text-white">
						App Roles · {userLabel}
					</DialogTitle>
					<DialogDescription className="font-medium text-black/60 dark:text-white/60">
						Assign a role per application. The role is sent to the app as the
						<code className="mx-1 px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 border border-black/30">
							app_role
						</code>
						claim in the OIDC ID token.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
					{loading ? (
						<div className="flex justify-center py-8">
							<div className="h-6 w-6 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
						</div>
					) : clients.length === 0 ? (
						<p className="text-sm text-black/50 dark:text-white/50 font-medium text-center py-6">
							No OAuth clients registered yet.
						</p>
					) : (
						clients.map((client) => {
							const roles = rolesByClient[client.clientId] ?? [];
							const current = assignedRole(client.clientId);
							const def = defaultRole(client.clientId);
							const effective = current ?? def;

							return (
								<div
									key={client.clientId}
									className="border-2 border-black dark:border-white p-3 space-y-2"
								>
									<div className="flex items-center justify-between">
										<div>
											<p className="font-bold text-black dark:text-white">
												{client.name}
											</p>
											<p className="text-xs font-mono text-black/50 dark:text-white/50">
												{client.clientId}
											</p>
										</div>
										{effective && (
											<Badge className="bg-blue-200 text-black border-2 border-black font-bold">
												{effective}
												{!current && (
													<span className="ml-1 text-[10px] opacity-60">
														(default)
													</span>
												)}
											</Badge>
										)}
									</div>

									{roles.length === 0 ? (
										<p className="text-xs text-black/50 dark:text-white/50 italic">
											No roles defined for this client. Add roles in the
											Clients page first.
										</p>
									) : (
										<div className="flex items-center gap-2">
											<Label className="text-xs font-bold shrink-0 text-black/70 dark:text-white/70">
												Role:
											</Label>
											<Select
												value={current ?? ""}
												onValueChange={(v) =>
													handleSelect(client.clientId, v)
												}
												disabled={pendingClient === client.clientId}
											>
												<SelectTrigger className="border-2 border-black dark:border-white font-bold">
													<SelectValue
														placeholder={
															def ? `Default (${def})` : "Select role"
														}
													/>
												</SelectTrigger>
												<SelectContent className="border-2 border-black dark:border-white">
													{roles.map((r) => (
														<SelectItem key={r.id} value={r.role}>
															{r.role}
															{r.isDefault && " (default)"}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{current && (
												<Button
													variant="ghost"
													size="icon"
													className="h-9 w-9 shrink-0 border-2 border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
													title="Clear assignment (use default)"
													onClick={() => handleClear(client.clientId)}
													disabled={pendingClient === client.clientId}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						className="font-bold bg-green-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
