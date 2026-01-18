"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import InactiveUserMessage from "@/components/InactiveUserMessage";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const router = useRouter();
	const { user, userProfile, loading } = useAuth();

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

	// Check if user is active
	// Super Admin users can bypass the active check
	const isSuperAdmin = userProfile?.access_level && typeof userProfile.access_level === 'string' && userProfile.access_level.trim() === 'Super Admin';
	const activeValue = userProfile?.active;
	const isActive = 
		activeValue === true || 
		activeValue === 1 || 
		activeValue === "1" || 
		activeValue === "true" || 
		(activeValue && typeof activeValue === 'string' && activeValue.trim().toLowerCase() === 'yes');
	
	// If user is not active and not Super Admin, show inactive message
	// Note: null/undefined active is treated as inactive
	if (!isSuperAdmin && !isActive) {
		return <InactiveUserMessage />;
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
