"use client";

import { Suspense } from "react";
import RequirePermission from "@/components/RequirePermission";
import FamilyRecordsSection from "@/components/FamilyRecordsSection";

function ActualInterventionPageContent() {
	return <FamilyRecordsSection baseRoute="/dashboard/actual-intervention" />;
}

export default function ActualInterventionPage() {
	return (
		<RequirePermission permission="Actual Intervention">
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
				<ActualInterventionPageContent />
			</Suspense>
		</RequirePermission>
	);
}
