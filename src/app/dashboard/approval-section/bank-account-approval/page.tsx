"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";
import PermissionStatusLabel from "@/components/PermissionStatusLabel";

export default function BankAccountApprovalPage() {
	const router = useRouter();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("BankAccountApproval");

	// Check access - only users with BankAccountApproval = 1/TRUE can access this page
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
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="BankAccountApproval" />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
							<CreditCard className="h-8 w-8" />
							Bank Account Approval
						</h1>
						<PermissionStatusLabel permission="BankAccountApproval" />
					</div>
					<p className="text-gray-600 mt-2">Manage bank account approval processes</p>
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
				<div className="space-y-6">
					{/* Main Heading Section */}
					<div className="border-b border-gray-200 pb-4">
						<h2 className="text-2xl font-semibold text-gray-900">Bank Account Approval</h2>
						<p className="text-gray-600 mt-2">Review and approve bank account information submissions</p>
					</div>

					{/* Approval Status Section */}
					<div className="space-y-4">
						<h3 className="text-xl font-semibold text-gray-800">Approval Status</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
								<h4 className="text-sm font-medium text-yellow-800 mb-1">Pending</h4>
								<p className="text-2xl font-bold text-yellow-900">0</p>
							</div>
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<h4 className="text-sm font-medium text-green-800 mb-1">Approved</h4>
								<p className="text-2xl font-bold text-green-900">0</p>
							</div>
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<h4 className="text-sm font-medium text-red-800 mb-1">Rejected</h4>
								<p className="text-2xl font-bold text-red-900">0</p>
							</div>
						</div>
					</div>

					{/* Bank Account Information Section */}
					<div className="space-y-4">
						<h3 className="text-xl font-semibold text-gray-800">Bank Account Information</h3>
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
							<p className="text-gray-600">Bank account approval content will be displayed here.</p>
						</div>
					</div>

					{/* Actions Section */}
					<div className="space-y-4">
						<h3 className="text-xl font-semibold text-gray-800">Actions</h3>
						<div className="flex gap-3">
							<button
								className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
								disabled
							>
								Approve
							</button>
							<button
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
								disabled
							>
								Reject
							</button>
							<button
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
								disabled
							>
								View Details
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
