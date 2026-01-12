"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function FamilyDevelopmentPlanApprovalPage() {
	const router = useRouter();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Family Development Plan Approval</h1>
					<p className="text-gray-600 mt-2">Manage family development plan approval processes</p>
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
				<p className="text-gray-600">Family Development Plan approval content will be displayed here.</p>
			</div>
		</div>
	);
}
