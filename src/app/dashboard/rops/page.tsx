"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";
import FamilyRecordsSection from "@/components/FamilyRecordsSection";

function ROPsPageContent() {
	const { userProfile } = useAuth();
	const router = useRouter();

	// Check route access based on UserType
	useEffect(() => {
		if (!userProfile) return;
		
		const userType = userProfile.access_level; // UserType is stored in access_level
		const hasFullAccessToAll = hasFullAccess(
			userProfile.username,
			userProfile.supper_user,
			userType
		);
		
		// Super Admin has access to all pages
		if (hasFullAccessToAll) {
			return;
		}
		
		// Check route-specific access
		const currentRoute = '/dashboard/rops';
		if (!hasRouteAccess(userType, currentRoute)) {
			router.push('/dashboard');
		}
	}, [userProfile, router]);

	const guidelinesContent = (
		<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
			<h3 className="text-sm font-semibold text-gray-900 mb-2">Guidelines:</h3>
			<ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
				<li>Social Support ROPs will be open from 10th–25th of each month for the next month.</li>
				<li>Economic ROPs can be opened throughout the current month, but the Finance Department will download them after 15 days.</li>
			</ul>
		</div>
	);

	return (
		<div className="space-y-6">
			{/* Family Records Section - Copied from actual-intervention */}
			<FamilyRecordsSection baseRoute="/dashboard/rops" guidelines={guidelinesContent} />
		</div>
	);
}

export default function ROPsPage() {
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
			<ROPsPageContent />
		</Suspense>
	);
}
