"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

type FamilyInfo = {
	FormNumber: string | null;
	Full_Name: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

type CRCApprovalData = {
	isApproved: boolean;
	approvalLogId?: number;
	family: FamilyInfo | null;
	totals: {
		economic: number;
		social: number;
	};
};

function CRCApprovalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	
	const [data, setData] = useState<CRCApprovalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!formNumber) {
			setError("Form Number is required");
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/family-development-plan/crc-approval-check?formNumber=${encodeURIComponent(formNumber)}`
				);
				const result = await response.json();

				if (result.success) {
					setData(result);
				} else {
					setError(result.message || "Failed to fetch data");
				}
			} catch (err: any) {
				console.error("Error fetching data:", err);
				setError(err.message || "Error fetching data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	const formatCurrency = (value: number): string => {
		const roundedValue = Math.round(value);
		return roundedValue.toLocaleString();
	};

	const isApproved = data?.isApproved || false;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.push("/dashboard/family-development-plan")}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">CRC-Approval - Family Status</h1>
						<p className="text-gray-600 mt-2">
							{formNumber && <span>Form Number: {formNumber}</span>}
						</p>
					</div>
				</div>
				{isApproved && formNumber && (
					<button
						onClick={() => router.push(`/dashboard/family-development-plan/crc-approval/add?formNumber=${encodeURIComponent(formNumber)}`)}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Entry
					</button>
				)}
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
				</div>
			)}

			{/* Not Approved Banner */}
			{!isApproved && (
				<div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-yellow-800">
								This family is not approved - please contact your Regional Assist Manager
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Family Information - Show when approved */}
			{isApproved && data?.family && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Information</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
							<p className="text-sm text-gray-900">{data.family.FormNumber || "-"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
							<p className="text-sm text-gray-900">{data.family.Full_Name || "-"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC Number</label>
							<p className="text-sm text-gray-900">{data.family.CNICNumber || "-"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
							<p className="text-sm text-gray-900">{data.family.RegionalCommunity || "-"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
							<p className="text-sm text-gray-900">{data.family.LocalCommunity || "-"}</p>
						</div>
					</div>
				</div>
			)}

			{/* Support Totals - Show when approved */}
			{isApproved && data?.totals && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-[#0b4d2b] text-white px-6 py-2">
						<h2 className="text-base font-semibold">Support Summary</h2>
					</div>
					<div className="p-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
								<h3 className="text-sm font-semibold text-gray-900 mb-1">Total Economic Support</h3>
								<p className="text-xl font-bold text-blue-600">
									Rs. {formatCurrency(data.totals.economic)}
								</p>
							</div>
							<div className="bg-green-50 rounded-lg border border-green-200 p-4">
								<h3 className="text-sm font-semibold text-gray-900 mb-1">Total Social Support</h3>
								<p className="text-xl font-bold text-green-600">
									Rs. {formatCurrency(data.totals.social)}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CRC Approval Section - Only show when approved */}
			{isApproved && (
				<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
					<div className="mb-4">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">CRC Approval Section</h2>
						<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
							<div className="flex items-center justify-between">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Approval Status
									</label>
									<p className="text-2xl font-bold text-[#0b4d2b]">
										Approved
									</p>
								</div>
								<div className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg">
									<span className="text-sm font-semibold">Active</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function CRCApprovalPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<CRCApprovalContent />
		</Suspense>
	);
}
