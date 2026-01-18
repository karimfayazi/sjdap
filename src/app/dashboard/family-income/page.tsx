"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Construction, TrendingUp, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";

export default function FamilyIncomePage() {
	const router = useRouter();
	const { userProfile } = useAuth();

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
		const currentRoute = '/dashboard/family-income';
		if (!hasRouteAccess(userType, currentRoute)) {
			router.push('/dashboard');
		}
	}, [userProfile, router]);

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-120px)] bg-gradient-to-br from-gray-50 to-gray-100 py-4">
			<div className="max-w-4xl w-full mx-auto px-4">
				<div className="bg-white rounded-xl shadow-xl overflow-hidden">
					{/* Header Section with Gradient - Reduced Height */}
					<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0a5d2e] to-[#0b4d2b] px-6 py-4 text-center">
						<div className="flex justify-center mb-3">
							<div className="relative">
								<div className="absolute inset-0 bg-white rounded-full opacity-20 animate-pulse"></div>
								<div className="relative bg-white rounded-full p-3 shadow-lg">
									<DollarSign className="h-10 w-10 text-[#0b4d2b]" />
								</div>
							</div>
						</div>
						<div className="flex items-center justify-center gap-3 mb-1">
							<h1 className="text-2xl md:text-3xl font-bold text-white">Family Income</h1>
						</div>
						<p className="text-sm text-green-100">Income Management and Tracking</p>
					</div>

					{/* Content Section - Reduced Padding */}
					<div className="px-6 py-6">
						<div className="text-center mb-4">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-3">
								<Clock className="h-8 w-8 text-yellow-600 animate-pulse" />
							</div>
							<h2 className="text-xl font-bold text-gray-900 mb-2">This Section is Under Process</h2>
							<p className="text-sm text-gray-600 max-w-2xl mx-auto">
								We are currently working on developing this feature.
							</p>
						</div>

						{/* Features Grid - Reduced Size */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border-2 border-blue-200">
								<div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-2">
									<TrendingUp className="h-6 w-6 text-white" />
								</div>
								<h3 className="text-sm font-semibold text-gray-900 mb-1">Development</h3>
								<p className="text-xs text-gray-600">Active development in progress</p>
							</div>

							<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border-2 border-green-200">
								<div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-2">
									<Clock className="h-6 w-6 text-white" />
								</div>
								<h3 className="text-sm font-semibold text-gray-900 mb-1">Coming Soon</h3>
								<p className="text-xs text-gray-600">Feature will be available shortly</p>
							</div>

							<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border-2 border-purple-200">
								<div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-2">
									<Construction className="h-6 w-6 text-white" />
								</div>
								<h3 className="text-sm font-semibold text-gray-900 mb-1">Enhancement</h3>
								<p className="text-xs text-gray-600">Improving user experience</p>
							</div>
						</div>

						{/* Action Button */}
						<div className="text-center">
							<button
								onClick={() => router.push("/dashboard")}
								className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-all duration-300 shadow-md hover:shadow-lg font-semibold text-sm"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Dashboard
							</button>
						</div>
					</div>

					{/* Footer Decoration - Reduced */}
					<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
						<div className="flex items-center justify-center gap-2 text-xs text-gray-500">
							<Clock className="h-3 w-3" />
							<span>Please check back later for updates</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
