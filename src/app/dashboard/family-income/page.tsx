"use client";

import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

export default function FamilyIncomePage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Family_Income");

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="Family Income" />;
	}

	// Show loading while checking access
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Family Income</h1>
				<p className="text-gray-600 mt-2">Track and manage family income records</p>
			</div>
			
			<div className="bg-white rounded-lg shadow p-6">
				<p className="text-gray-600">Content for Family Income will be displayed here.</p>
			</div>
		</div>
	);
}

