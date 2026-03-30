import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "@/lib/auth-server";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();

	if (!session) {
		redirect("/login?callbackUrl=/dashboard");
	}

	if (session.user.role !== "admin") {
		redirect("/");
	}

	return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
