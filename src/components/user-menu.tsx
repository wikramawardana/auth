"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
	const { data: session, isPending } = useSession();

	const handleSignOut = async () => {
		await signOut({
			fetchOptions: {
				onSuccess: () => {
					window.location.href = "/login";
				},
			},
		});
	};

	const getInitials = (name: string | null | undefined, email: string) => {
		if (name) {
			return name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		return email.slice(0, 2).toUpperCase();
	};

	const getRoleBadgeColor = (role: string | null | undefined) => {
		switch (role) {
			case "admin":
				return "bg-red-400 text-black border-black";
			default:
				return "bg-gray-300 text-black border-black";
		}
	};

	if (isPending) {
		return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-9 w-9 rounded-full border-2 border-black hover:bg-yellow-200"
				>
					<Avatar className="h-9 w-9">
						<AvatarImage
							src={session?.user?.image || undefined}
							alt={session?.user?.name || "User"}
							referrerPolicy="no-referrer"
						/>
						<AvatarFallback className="bg-yellow-400 text-black font-bold text-xs">
							{getInitials(session?.user?.name, session?.user?.email || "")}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-56 border-2 border-black bg-white"
				align="end"
				forceMount
			>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-2">
						<p className="text-sm font-bold leading-none text-black">
							{session?.user?.name || "User"}
						</p>
						<p className="text-xs leading-none text-black/50">
							{session?.user?.email}
						</p>
						<Badge
							className={`${getRoleBadgeColor(session?.user?.role)} border w-fit text-xs font-bold`}
						>
							{session?.user?.role || "user"}
						</Badge>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-red-600 focus:text-red-600 font-bold cursor-pointer"
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
