"use client";

import { Check, Plus, Star, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientRole {
	id: string;
	clientId: string;
	role: string;
	isDefault: boolean;
	createdAt: string;
}

interface Props {
	clientId: string | null;
	clientName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ManageClientRolesDialog({
	clientId,
	clientName,
	open,
	onOpenChange,
}: Props) {
	const [roles, setRoles] = useState<ClientRole[]>([]);
	const [loading, setLoading] = useState(false);
	const [newRole, setNewRole] = useState("");
	const [newRoleDefault, setNewRoleDefault] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deleteRole, setDeleteRole] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const fetchRoles = useCallback(async () => {
		if (!clientId) return;
		setLoading(true);
		try {
			const res = await fetch(
				`/api/admin/client-roles?clientId=${encodeURIComponent(clientId)}`,
			);
			if (res.ok) {
				const data = (await res.json()) as ClientRole[];
				setRoles(data);
			} else {
				toast.error("Failed to load roles");
			}
		} catch {
			toast.error("Failed to load roles");
		} finally {
			setLoading(false);
		}
	}, [clientId]);

	useEffect(() => {
		if (open) {
			fetchRoles();
		} else {
			setRoles([]);
			setNewRole("");
			setNewRoleDefault(false);
		}
	}, [open, fetchRoles]);

	const handleAdd = async () => {
		if (!clientId || !newRole.trim()) {
			toast.error("Role name is required");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/admin/client-roles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clientId,
					role: newRole.trim(),
					isDefault: newRoleDefault,
				}),
			});
			if (res.ok) {
				toast.success("Role added");
				setNewRole("");
				setNewRoleDefault(false);
				fetchRoles();
			} else {
				toast.error("Failed to add role");
			}
		} catch {
			toast.error("Failed to add role");
		} finally {
			setSaving(false);
		}
	};

	const handleSetDefault = async (role: string) => {
		if (!clientId) return;
		try {
			const res = await fetch("/api/admin/client-roles", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientId, role }),
			});
			if (res.ok) {
				toast.success(`Default role set to "${role}"`);
				fetchRoles();
			} else {
				toast.error("Failed to set default role");
			}
		} catch {
			toast.error("Failed to set default role");
		}
	};

	const handleDelete = async () => {
		if (!clientId || !deleteRole) return;
		setDeleting(true);
		try {
			const res = await fetch("/api/admin/client-roles", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientId, role: deleteRole }),
			});
			if (res.ok) {
				toast.success("Role removed");
				setDeleteRole(null);
				fetchRoles();
			} else {
				toast.error("Failed to remove role");
			}
		} catch {
			toast.error("Failed to remove role");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="neo-brutal neo-brutal-white max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-black text-black dark:text-white">
						Manage Roles · {clientName}
					</DialogTitle>
					<DialogDescription className="font-medium text-black/60 dark:text-white/60">
						Define the roles this application can assign to users. The default
						role is given to users who haven't been assigned anything.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label className="font-bold text-black dark:text-white">
							Existing roles
						</Label>
						{loading ? (
							<div className="flex justify-center py-4">
								<div className="h-5 w-5 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
							</div>
						) : roles.length === 0 ? (
							<p className="text-sm text-black/50 dark:text-white/50 font-medium border-2 border-dashed border-black/30 dark:border-white/30 p-3">
								No roles defined yet. Add one below.
							</p>
						) : (
							<div className="space-y-2">
								{roles.map((r) => (
									<div
										key={r.id}
										className="flex items-center justify-between border-2 border-black dark:border-white px-3 py-2"
									>
										<div className="flex items-center gap-2">
											<code className="font-mono text-sm font-bold">
												{r.role}
											</code>
											{r.isDefault && (
												<Badge className="bg-yellow-300 text-black border-2 border-black font-bold">
													<Star className="h-3 w-3 mr-1" />
													default
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-1">
											{!r.isDefault && (
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 border-2 border-black dark:border-white hover:bg-yellow-200"
													title="Set as default"
													onClick={() => handleSetDefault(r.role)}
												>
													<Check className="h-4 w-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 border-2 border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
												title="Delete role"
												onClick={() => setDeleteRole(r.role)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2 border-t-2 border-black/20 dark:border-white/20 pt-4">
						<Label className="font-bold text-black dark:text-white">
							Add new role
						</Label>
						<div className="flex items-center gap-2">
							<Input
								placeholder="e.g. chef"
								value={newRole}
								onChange={(e) => setNewRole(e.target.value)}
								className="border-2 border-black dark:border-white font-medium"
								disabled={saving}
							/>
							<Button
								onClick={handleAdd}
								disabled={saving || !newRole.trim()}
								className="font-bold bg-blue-500 text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover shrink-0"
							>
								<Plus className="h-4 w-4 mr-1" />
								Add
							</Button>
						</div>
						<label className="flex items-center gap-2 text-sm font-medium text-black/70 dark:text-white/70">
							<input
								type="checkbox"
								checked={newRoleDefault}
								onChange={(e) => setNewRoleDefault(e.target.checked)}
								className="border-2 border-black dark:border-white"
							/>
							Mark as default role for this client
						</label>
					</div>
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

			<AlertDialog
				open={!!deleteRole}
				onOpenChange={(o) => !o && !deleting && setDeleteRole(null)}
			>
				<AlertDialogContent
					className="neo-brutal neo-brutal-white"
					overlayClassName="bg-transparent"
				>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-black dark:text-white">
							Delete role "{deleteRole}"?
						</AlertDialogTitle>
						<AlertDialogDescription className="font-medium text-black/60 dark:text-white/60">
							Users currently assigned this role for{" "}
							<span className="font-bold text-black dark:text-white">
								{clientName}
							</span>{" "}
							will lose it and fall back to the default role.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={deleting}
							className="font-bold border-2 border-black dark:border-white"
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting}
							className="font-bold bg-red-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							{deleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
