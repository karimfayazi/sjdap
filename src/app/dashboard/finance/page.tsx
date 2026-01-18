"use client";

import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

export default function FinancePage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("FinanceSection");

	// Show loading while checking access
	if (accessLoading) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Checking permissions...</span>
			</div>
		);
	}

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="FinanceSection" />;
	}

	return (
		<div className="flex items-center justify-center min-h-[60vh]">
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 mb-4">This section is under process</h1>
				<p className="text-gray-600">Please check back later.</p>
			</div>
		</div>
	);
}
