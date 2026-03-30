"use client";

import {
	AppWindow,
	LayoutDashboard,
	Monitor,
	PanelLeft,
	Shield,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const navItems = [
	{
		title: "Overview",
		href: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		title: "Users",
		href: "/dashboard/users",
		icon: Users,
	},
	{
		title: "Sessions",
		href: "/dashboard/sessions",
		icon: Monitor,
	},
	{
		title: "OAuth Clients",
		href: "/dashboard/clients",
		icon: AppWindow,
	},
];

interface DashboardShellProps {
	children: React.ReactNode;
	user: {
		name: string | null | undefined;
		email: string;
		image?: string | null | undefined;
	};
}

export function DashboardShell({ children }: DashboardShellProps) {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	const currentPage =
		navItems.find(
			(item) =>
				pathname === item.href ||
				(item.href !== "/dashboard" && pathname.startsWith(item.href)),
		) || navItems[0];

	return (
		<TooltipProvider delayDuration={0}>
			<div
				className={cn(
					"grid h-screen grid-rows-[4rem_1fr] transition-all duration-300",
					collapsed
						? "grid-cols-[60px_1fr]"
						: "grid-cols-[256px_1fr]",
				)}
			>
				{/* Sidebar header */}
				<div className="flex items-center border-r-4 border-b-4 border-black bg-white px-3">
					{!collapsed ? (
						<Link
							href="/dashboard"
							className="flex items-center gap-2.5 font-black text-black"
						>
							<div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
								<Shield className="h-5 w-5 text-black" />
							</div>
							<div className="flex flex-col">
								<span className="text-sm leading-tight">Wikra Auth</span>
								<span className="text-[10px] font-medium text-black/50 leading-tight">
									Admin Panel
								</span>
							</div>
						</Link>
					) : (
						<Link href="/dashboard" className="mx-auto">
							<div className="flex h-9 w-9 items-center justify-center bg-blue-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
								<Shield className="h-5 w-5 text-black" />
							</div>
						</Link>
					)}
				</div>

				{/* Main header */}
				<header className="flex items-center gap-2 border-b-4 border-black bg-white px-4">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 border-2 border-black hover:bg-yellow-200 shrink-0"
								onClick={() => setCollapsed(!collapsed)}
							>
								<PanelLeft className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							{collapsed ? "Expand sidebar" : "Collapse sidebar"}
						</TooltipContent>
					</Tooltip>
					<Separator
						orientation="vertical"
						className="mr-2 h-6 w-[3px] bg-black"
					/>
					<h2 className="text-sm font-black text-black">
						{currentPage.title}
					</h2>
					<div className="ml-auto">
						<UserMenu />
					</div>
				</header>

				{/* Sidebar nav */}
				<div className="border-r-4 border-black bg-white overflow-hidden">
					<ScrollArea className="h-full pt-4 pb-2">
						{!collapsed && (
							<p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-black/40 border-b border-black/10 mx-2 mb-2">
								Navigation
							</p>
						)}
						<nav className="flex flex-col gap-1 px-2">
							{navItems.map((item) => {
								const isActive =
									pathname === item.href ||
									(item.href !== "/dashboard" &&
										pathname.startsWith(item.href));

								const linkContent = (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all border-2",
											isActive
												? "bg-yellow-400 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
												: "text-black/60 border-transparent hover:border-black hover:bg-yellow-100",
											collapsed && "justify-center px-2",
										)}
									>
										<item.icon className="h-4 w-4 shrink-0" />
										{!collapsed && <span>{item.title}</span>}
									</Link>
								);

								if (collapsed) {
									return (
										<Tooltip key={item.href}>
											<TooltipTrigger asChild>{linkContent}</TooltipTrigger>
											<TooltipContent side="right">
												{item.title}
											</TooltipContent>
										</Tooltip>
									);
								}

								return linkContent;
							})}
						</nav>
					</ScrollArea>
				</div>

				{/* Main content */}
				<main className="overflow-auto bg-[#f5f5f5]">
					<div className="p-4 sm:p-6">{children}</div>
				</main>
			</div>
		</TooltipProvider>
	);
}
