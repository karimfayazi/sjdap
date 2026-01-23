"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";

function ROPsReportContent() {
	const { userProfile } = useAuth();
	const router = useRouter();

	// Check route access based on UserType
	useEffect(() => {
		if (!userProfile) return;
		
		const userType = userProfile.access_level;
		const hasFullAccessToAll = hasFullAccess(
			userProfile.username,
			userProfile.supper_user,
			userType
		);
		
		// Super Admin has access to all pages
		if (hasFullAccessToAll) {
			return;
		}
		
		// Check route-specific access (using same route as /dashboard/rops)
		const currentRoute = '/dashboard/rops';
		if (!hasRouteAccess(userType, currentRoute)) {
			router.push('/dashboard');
		}
	}, [userProfile, router]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
						ROPs Report
					</h1>
				</div>
			</div>
		</div>
	);
}

export default function ROPsReportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
						<p className="mt-4 text-gray-600 font-medium">Loading...</p>
					</div>
				</div>
			}
		>
			<ROPsReportContent />
		</Suspense>
	);
}
