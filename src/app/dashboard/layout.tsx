"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	// Initialize sidebar state from localStorage (default to expanded if not set)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
		// Only access localStorage on client-side
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("sidebarCollapsed");
			return stored === "1"; // "1" means collapsed, "0" or missing means expanded
		}
		return false; // Default to expanded for SSR
	});
	const router = useRouter();
	const pathname = usePathname();
	const { user, userProfile, loading } = useAuth();

	// Save sidebar state to localStorage whenever it changes
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "1" : "0");
		}
	}, [sidebarCollapsed]);

	// Check if username is null and redirect to login
	useEffect(() => {
		if (loading) return; // Wait for auth to finish loading

		// Check if username is null in both user and userProfile
		const username = user?.username || userProfile?.username;
		
		// If username is null, redirect to login page
		if (!username) {
			router.push("/login");
		}
	}, [user, userProfile, loading, router]);

	// NOTE: Route access is now checked by PageGuard components on individual pages
	// and by permission-service.ts using PE_Rights_UserPermission table.
	// This layout no longer enforces UserType-based access rules.
	// Individual pages must use PageGuard or check permissions via useRoutePermission hook.

	// Show loading state while checking authentication
	if (loading) {
		return (
			<div className="h-full bg-gray-50 flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<span className="text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Don't render dashboard if username is null (will redirect)
	const username = user?.username || userProfile?.username;
	if (!username) {
		return null;
	}

	return (
		<div className="h-full bg-gray-50 flex flex-col">

			{/* Main Content with Sidebar */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className={`hidden md:flex border-r border-gray-200 bg-white p-4 transition-all duration-300 overflow-y-auto ${
					sidebarCollapsed ? "w-16" : "w-60"
				}`}>
					<div className="w-full">
						<Sidebar 
							collapsed={sidebarCollapsed} 
							setCollapsed={setSidebarCollapsed} 
						/>
					</div>
				</aside>

				{/* Main Section */}
				<main className="flex-1 p-6 overflow-y-auto transition-all duration-300">
					{children}
				</main>
			</div>
		</div>
	);
}
