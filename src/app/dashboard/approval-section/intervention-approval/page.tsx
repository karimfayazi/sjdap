"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

export default function InterventionApprovalPage() {
	const router = useRouter();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("InterventionApproval");

	// Check access - only users with InterventionApproval = 1/TRUE can access this page
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="InterventionApproval" />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Intervention Approval</h1>
					</div>
					<p className="text-gray-600 mt-2">Manage intervention approval processes</p>
				</div>
				<button
					onClick={() => router.push("/dashboard")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</button>
			</div>

			{/* Content Area */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<p className="text-gray-600">Intervention approval content will be displayed here.</p>
			</div>
		</div>
	);
}
