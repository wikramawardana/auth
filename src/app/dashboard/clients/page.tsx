"use client";

import {
	AppWindow,
	Copy,
	Eye,
	EyeOff,
	Pencil,
	Plus,
	ShieldCheck,
	Trash2,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ManageClientRolesDialog } from "@/components/dashboard/manage-client-roles-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

interface OAuthClient {
	clientId: string;
	clientSecret: string;
	name: string;
	redirectUrls: string;
	type: string;
	disabled: boolean;
	createdAt: string;
	usersCount?: number;
}

interface NewClientForm {
	name: string;
	redirectUri: string;
}

export default function ClientsPage() {
	const [clients, setClients] = useState<OAuthClient[]>([]);
	const [loading, setLoading] = useState(true);
	const [showDialog, setShowDialog] = useState(false);
	const [createdClient, setCreatedClient] = useState<{
		clientId: string;
		clientSecret: string;
	} | null>(null);
	const [form, setForm] = useState<NewClientForm>({
		name: "",
		redirectUri: "",
	});
	const [creating, setCreating] = useState(false);
	const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
	const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [editClient, setEditClient] = useState<OAuthClient | null>(null);
	const [editForm, setEditForm] = useState<NewClientForm>({
		name: "",
		redirectUri: "",
	});
	const [saving, setSaving] = useState(false);
	const [rolesClient, setRolesClient] = useState<OAuthClient | null>(null);

	const fetchClients = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/auth/oauth2/clients");
			if (res.ok) {
				const data = await res.json();
				setClients(Array.isArray(data) ? data : []);
			}
		} catch {
			setClients([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchClients();
	}, [fetchClients]);

	const handleCreate = async () => {
		if (!form.name || !form.redirectUri) {
			toast.error("Name and redirect URI are required");
			return;
		}
		setCreating(true);
		try {
			const res = await authClient.oauth2.register({
				redirect_uris: [form.redirectUri],
				client_name: form.name,
				grant_types: ["authorization_code"],
				response_types: ["code"],
				token_endpoint_auth_method: "client_secret_basic",
				scope: "openid profile email",
			});
			if (res.data) {
				const data = res.data as unknown as {
					client_id: string;
					client_secret: string;
				};
				setCreatedClient({
					clientId: data.client_id,
					clientSecret: data.client_secret,
				});
				setShowDialog(false);
				setForm({ name: "", redirectUri: "" });
				fetchClients();
				toast.success("OAuth client created");
			}
		} catch {
			toast.error("Failed to create client");
		} finally {
			setCreating(false);
		}
	};

	const openEdit = (client: OAuthClient) => {
		setEditClient(client);
		setEditForm({ name: client.name, redirectUri: client.redirectUrls });
	};

	const handleEdit = async () => {
		if (!editClient) return;
		if (!editForm.name || !editForm.redirectUri) {
			toast.error("Name and redirect URI are required");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/auth/oauth2/clients", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clientId: editClient.clientId,
					name: editForm.name,
					redirectUri: editForm.redirectUri,
				}),
			});
			if (res.ok) {
				toast.success("Client updated");
				setEditClient(null);
				fetchClients();
			} else {
				toast.error("Failed to update client");
			}
		} catch {
			toast.error("Failed to update client");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteClientId) return;
		setDeleting(true);
		try {
			const res = await fetch("/api/auth/oauth2/clients", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clientId: deleteClientId }),
			});
			if (res.ok) {
				toast.success("Client deleted");
				setDeleteClientId(null);
				fetchClients();
			} else {
				toast.error("Failed to delete client");
			}
		} catch {
			toast.error("Failed to delete client");
		} finally {
			setDeleting(false);
		}
	};

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text);
		toast.success(`${label} copied to clipboard`);
	};

	const toggleSecretVisibility = (clientId: string) => {
		setVisibleSecrets((prev) => {
			const next = new Set(prev);
			if (next.has(clientId)) {
				next.delete(clientId);
			} else {
				next.add(clientId);
			}
			return next;
		});
	};

	return (
		<>
			<Card className="neo-brutal neo-brutal-white">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-2xl font-black text-black">
								OAuth Clients
							</CardTitle>
							<CardDescription className="font-medium text-black/60">
								Manage registered applications that can use Auth.
							</CardDescription>
						</div>
						<Button
							onClick={() => setShowDialog(true)}
							className="font-bold bg-blue-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							<Plus className="h-4 w-4 mr-2" />
							Register Client
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{loading ? (
						<div className="flex justify-center py-12">
							<div className="h-6 w-6 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
						</div>
					) : clients.length === 0 ? (
						<Card className="neo-brutal neo-brutal-white">
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<div className="flex h-16 w-16 items-center justify-center bg-blue-200 border-4 border-black dark:border-white mb-4">
									<AppWindow className="h-8 w-8 text-black" />
								</div>
								<h3 className="text-lg font-black text-black dark:text-white">
									No clients registered
								</h3>
								<p className="text-sm text-black/50 dark:text-white/50 mt-1 mb-4 font-medium">
									Register your first OAuth client to start using Auth.
								</p>
								<Button
									onClick={() => setShowDialog(true)}
									className="font-bold bg-blue-500 text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
								>
									<Plus className="h-4 w-4 mr-2" />
									Register Client
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-4">
							{clients.map((client) => (
								<Card
									key={client.clientId}
									className="neo-brutal neo-brutal-white"
								>
									<CardHeader>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 items-center justify-center bg-blue-400 border-2 border-black dark:border-white">
													<AppWindow className="h-5 w-5 text-black" />
												</div>
												<div>
													<CardTitle className="text-base font-black text-black dark:text-white">
														{client.name}
													</CardTitle>
													<CardDescription className="font-medium text-black/50 dark:text-white/50">
														Type: {client.type || "web"}
													</CardDescription>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Link
													href={`/dashboard/users?app=${encodeURIComponent(client.clientId)}`}
													className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
													title="View users belonging to this application"
												>
													<Users className="h-3.5 w-3.5" />
													<span>{client.usersCount ?? 0} Users</span>
												</Link>
												<Badge
													className={
														client.disabled
															? "bg-red-400 text-black border-2 border-black font-bold"
															: "bg-green-400 text-black border-2 border-black font-bold"
													}
												>
													{client.disabled ? "Disabled" : "Active"}
												</Badge>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 border-2 border-black dark:border-white hover:bg-yellow-200 dark:hover:bg-yellow-800"
													title="Manage roles"
													onClick={() => setRolesClient(client)}
												>
													<ShieldCheck className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 border-2 border-black dark:border-white hover:bg-yellow-200 dark:hover:bg-yellow-800"
													title="Edit client"
													onClick={() => openEdit(client)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 border-2 border-red-600 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
													onClick={() => setDeleteClientId(client.clientId)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="space-y-1">
											<Label className="text-xs text-black/50 dark:text-white/50 font-bold">
												Client ID
											</Label>
											<div className="flex items-center gap-2">
												<code className="flex-1 text-xs bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1.5 border-2 border-black dark:border-white break-all font-mono">
													{client.clientId}
												</code>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0 border-2 border-black dark:border-white hover:bg-yellow-200 dark:hover:bg-yellow-800"
													onClick={() =>
														copyToClipboard(client.clientId, "Client ID")
													}
												>
													<Copy className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-black/50 dark:text-white/50 font-bold">
												Client Secret
											</Label>
											<div className="flex items-center gap-2">
												<code className="flex-1 text-xs bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1.5 border-2 border-black dark:border-white break-all font-mono">
													{visibleSecrets.has(client.clientId)
														? client.clientSecret
														: "••••••••••••••••••••"}
												</code>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0 border-2 border-black dark:border-white hover:bg-yellow-200 dark:hover:bg-yellow-800"
													onClick={() =>
														toggleSecretVisibility(client.clientId)
													}
												>
													{visibleSecrets.has(client.clientId) ? (
														<EyeOff className="h-3.5 w-3.5" />
													) : (
														<Eye className="h-3.5 w-3.5" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 shrink-0 border-2 border-black dark:border-white hover:bg-yellow-200 dark:hover:bg-yellow-800"
													onClick={() =>
														copyToClipboard(
															client.clientSecret,
															"Client Secret",
														)
													}
												>
													<Copy className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-black/50 dark:text-white/50 font-bold">
												Redirect URIs
											</Label>
											<p className="text-xs bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1.5 border-2 border-black dark:border-white break-all font-mono">
												{client.redirectUrls}
											</p>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!editClient}
				onOpenChange={(open) => !open && setEditClient(null)}
			>
				<DialogContent className="neo-brutal neo-brutal-white">
					<DialogHeader>
						<DialogTitle className="font-black text-black dark:text-white">
							Edit OAuth Client
						</DialogTitle>
						<DialogDescription className="font-medium text-black/60 dark:text-white/60">
							Update the name or redirect URI for this client.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Application Name
							</Label>
							<Input
								value={editForm.name}
								onChange={(e) =>
									setEditForm((prev) => ({ ...prev, name: e.target.value }))
								}
								className="border-2 border-black dark:border-white font-medium"
							/>
						</div>
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Redirect URI
							</Label>
							<Input
								value={editForm.redirectUri}
								onChange={(e) =>
									setEditForm((prev) => ({
										...prev,
										redirectUri: e.target.value,
									}))
								}
								className="border-2 border-black dark:border-white font-medium"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditClient(null)}
							disabled={saving}
							className="font-bold border-2 border-black dark:border-white"
						>
							Cancel
						</Button>
						<Button
							onClick={handleEdit}
							disabled={saving}
							className="font-bold bg-blue-500 text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							{saving ? "Saving..." : "Save changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteClientId}
				onOpenChange={(open) => !open && setDeleteClientId(null)}
			>
				<AlertDialogContent className="neo-brutal neo-brutal-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-black dark:text-white">
							Delete OAuth Client
						</AlertDialogTitle>
						<AlertDialogDescription className="font-medium text-black/60 dark:text-white/60">
							This will permanently delete the client. Any application using
							this client ID and secret will no longer be able to authenticate.
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

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="neo-brutal neo-brutal-white">
					<DialogHeader>
						<DialogTitle className="font-black text-black dark:text-white">
							Register OAuth Client
						</DialogTitle>
						<DialogDescription className="font-medium text-black/60 dark:text-white/60">
							Register a new application to use Auth for authentication.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Application Name
							</Label>
							<Input
								placeholder="My Application"
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								className="border-2 border-black dark:border-white font-medium"
							/>
						</div>
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Redirect URI
							</Label>
							<Input
								placeholder="https://myapp.com/api/auth/callback/auth"
								value={form.redirectUri}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										redirectUri: e.target.value,
									}))
								}
								className="border-2 border-black dark:border-white font-medium"
							/>
							<p className="text-xs text-black/50 dark:text-white/50 font-medium">
								The URL where users will be redirected after authentication.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDialog(false)}
							className="font-bold border-2 border-black dark:border-white"
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={creating}
							className="font-bold bg-blue-500 text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							{creating ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ManageClientRolesDialog
				clientId={rolesClient?.clientId ?? null}
				clientName={rolesClient?.name ?? ""}
				open={!!rolesClient}
				onOpenChange={(open) => !open && setRolesClient(null)}
			/>

			<Dialog
				open={!!createdClient}
				onOpenChange={() => setCreatedClient(null)}
			>
				<DialogContent className="neo-brutal neo-brutal-white">
					<DialogHeader>
						<DialogTitle className="font-black text-black dark:text-white">
							Client Created Successfully
						</DialogTitle>
						<DialogDescription className="font-medium text-black/60 dark:text-white/60">
							Save these credentials. The client secret will not be shown again.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Client ID
							</Label>
							<div className="flex items-center gap-2">
								<code className="flex-1 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 border-2 border-black dark:border-white break-all font-mono">
									{createdClient?.clientId}
								</code>
								<Button
									variant="outline"
									size="icon"
									className="border-2 border-black dark:border-white hover:bg-yellow-200"
									onClick={() =>
										copyToClipboard(createdClient?.clientId || "", "Client ID")
									}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="font-bold text-black dark:text-white">
								Client Secret
							</Label>
							<div className="flex items-center gap-2">
								<code className="flex-1 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 border-2 border-black dark:border-white break-all font-mono">
									{createdClient?.clientSecret}
								</code>
								<Button
									variant="outline"
									size="icon"
									className="border-2 border-black dark:border-white hover:bg-yellow-200"
									onClick={() =>
										copyToClipboard(
											createdClient?.clientSecret || "",
											"Client Secret",
										)
									}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={() => setCreatedClient(null)}
							className="font-bold bg-green-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-brutal-hover"
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
