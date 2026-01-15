"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function CRCApprovalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	
	const [fdpStatus, setFdpStatus] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!formNumber) {
			setError("Form Number is required");
			setLoading(false);
			return;
		}

		const fetchFDPStatus = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/family-development-plan/crc-approval-check?formNumber=${encodeURIComponent(formNumber)}`
				);
				const data = await response.json();

				if (data.success) {
					setFdpStatus(data.fdpStatus);
				} else {
					setError(data.message || "Failed to fetch FDP Status");
				}
			} catch (err: any) {
				console.error("Error fetching FDP Status:", err);
				setError(err.message || "Error fetching FDP Status");
			} finally {
				setLoading(false);
			}
		};

		fetchFDPStatus();
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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
						CRC-Approval Section / Family Status Section
					</h1>
					<p className="text-gray-600 mt-2 font-medium">Form Number: {formNumber}</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/family-development-plan")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
				</div>
			)}

			{/* FDP Status Display */}
			<div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div className="mb-4">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Current FDP Status</h2>
					<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
						<div className="flex items-center justify-between">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Current FDP Status
								</label>
								<p className="text-2xl font-bold text-[#0b4d2b]">
									{fdpStatus || "Not found"}
								</p>
							</div>
							{fdpStatus && (
								<div className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg">
									<span className="text-sm font-semibold">Active</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Additional Information Section */}
			<div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Information</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
						<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
							{formNumber || "N/A"}
						</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">FDP Status</label>
						<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
							{fdpStatus || "Not found"}
						</p>
					</div>
				</div>
			</div>
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
