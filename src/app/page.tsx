import { Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4">
			<div className="absolute top-10 left-10 w-20 h-20 bg-blue-400 border-4 border-black dark:border-white rotate-12 hidden md:block" />
			<div className="absolute top-32 right-20 w-16 h-16 bg-yellow-400 border-4 border-black dark:border-white -rotate-12 hidden md:block" />
			<div className="absolute bottom-20 left-20 w-24 h-24 bg-pink-400 border-4 border-black dark:border-white rotate-45 hidden md:block" />
			<div className="absolute bottom-32 right-32 w-12 h-12 bg-green-400 border-4 border-black dark:border-white -rotate-6 hidden md:block" />

			<div className="neo-brutal neo-brutal-white p-12 text-center max-w-lg">
				<div className="mx-auto flex items-center justify-center w-20 h-20 bg-blue-400 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-6">
					<Shield className="w-12 h-12 text-black" />
				</div>
				<h1 className="text-4xl font-black tracking-tight text-black dark:text-white mb-3">
					Wikra Auth
				</h1>
				<p className="text-base font-medium text-black/60 dark:text-white/60 mb-8">
					Centralized authentication service. Manage users, roles, and OAuth
					clients from a single dashboard.
				</p>
				<div className="flex gap-3 justify-center">
					<Button
						asChild
						className="h-12 px-8 text-base font-bold bg-blue-500 dark:bg-blue-600 text-white border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-brutal-hover"
					>
						<Link href="/login">Sign In</Link>
					</Button>
					<Button
						variant="outline"
						asChild
						className="h-12 px-8 text-base font-bold bg-yellow-400 dark:bg-yellow-500 text-black border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-brutal-hover"
					>
						<Link href="/dashboard">Dashboard</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
