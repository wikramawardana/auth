import { ArrowRight, KeyRound, Shield, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<div className="relative grid min-h-dvh w-full grid-rows-[auto_1fr_auto] bg-[#f5f5f0] text-black">
			<div className="pointer-events-none absolute top-20 left-10 hidden h-16 w-16 rotate-12 border-4 border-black md:block" />
			<div className="pointer-events-none absolute top-40 right-16 hidden h-10 w-10 rotate-45 bg-black md:block" />
			<div className="pointer-events-none absolute top-[55%] left-8 hidden h-8 w-8 rounded-full border-4 border-black md:block" />
			<div className="pointer-events-none absolute bottom-32 right-10 hidden h-20 w-5 bg-black md:block" />

			<header className="relative z-10 mx-auto flex max-w-6xl items-center justify-center px-6 py-6">
				<Link href="/" className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center border-[3px] border-black bg-[#60a5fa] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						<Shield className="h-6 w-6 text-black" strokeWidth={2.5} />
					</div>
					<span className="text-xl font-black uppercase tracking-tight">
						Wikra Auth
					</span>
				</Link>
			</header>

			<main className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-12 pb-24">
				<section className="mx-auto max-w-3xl text-center">
					<div className="mb-6 inline-block border-[3px] border-black bg-[#fef08a] px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
						Centralized Authentication
					</div>

					<h1 className="text-5xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
						One Login.
						<br />
						<span className="inline-block bg-[#60a5fa] px-3 py-1">
							Every App.
						</span>
					</h1>

					<p className="mx-auto mt-8 max-w-xl text-lg font-medium text-black/70">
						Manage users, roles, and OAuth clients from a single dashboard.
						Secure access across all your apps without the headache.
					</p>

					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Link href="/login">
							<Button className="h-14 border-[3px] border-black bg-black px-8 text-base font-bold text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
								Sign In
								<ArrowRight className="ml-1 h-5 w-5" strokeWidth={3} />
							</Button>
						</Link>
						<Link href="/dashboard">
							<Button className="h-14 border-[3px] border-black bg-white px-8 text-base font-bold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
								Go to Dashboard
							</Button>
						</Link>
					</div>
				</section>

				<section className="mt-28 grid gap-6 md:grid-cols-3">
					<FeatureCard
						color="#fca5a5"
						icon={<Users className="h-7 w-7" strokeWidth={2.5} />}
						title="User Management"
						description="Invite, approve, and manage users across all your connected apps from one place."
					/>
					<FeatureCard
						color="#86efac"
						icon={<UserCog className="h-7 w-7" strokeWidth={2.5} />}
						title="Roles & Access"
						description="Assign fine-grained roles per app. Grant and revoke permissions in a click."
					/>
					<FeatureCard
						color="#c4b5fd"
						icon={<KeyRound className="h-7 w-7" strokeWidth={2.5} />}
						title="OAuth Clients"
						description="Register OAuth 2.0 / OIDC clients and issue secure tokens for your apps."
					/>
				</section>

				<section className="mt-20 border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:p-12">
					<div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
						<div>
							<h2 className="text-3xl font-black uppercase leading-tight md:text-4xl">
								Ready to secure
								<br />
								your apps?
							</h2>
							<p className="mt-3 font-medium text-black/60">
								Sign in to manage users, roles, and clients.
							</p>
						</div>
						<Link href="/login">
							<Button className="h-14 border-[3px] border-black bg-[#60a5fa] px-8 text-base font-bold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-[#60a5fa] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
								Sign In Now
								<ArrowRight className="ml-1 h-5 w-5" strokeWidth={3} />
							</Button>
						</Link>
					</div>
				</section>
			</main>

			<footer className="relative z-10 border-t-[3px] border-black bg-white">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm font-medium text-black/60 sm:flex-row">
					<p>© {new Date().getFullYear()} Wikra Auth. Built by Wikra.</p>
					<p>Centralized authentication service.</p>
				</div>
			</footer>
		</div>
	);
}

function FeatureCard({
	color,
	icon,
	title,
	description,
}: {
	color: string;
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:-translate-y-1">
			<div
				className="mb-5 flex h-14 w-14 items-center justify-center border-[3px] border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
				style={{ backgroundColor: color }}
			>
				{icon}
			</div>
			<h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
			<p className="mt-2 font-medium text-black/70">{description}</p>
		</div>
	);
}
