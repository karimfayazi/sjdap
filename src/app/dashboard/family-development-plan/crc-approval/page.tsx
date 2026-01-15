"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Edit } from "lucide-react";

type FamilyInfo = {
	FamilyNumber: string;
	HeadName: string;
	RegionalCouncil: string;
	LocalCommunity: string;
	AreaType: string;
	BaselineIncomeLevel: string;
	TotalMembers: number;
	Mentor?: string | null;
};

function CRCApprovalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	
	const [fdpStatus, setFdpStatus] = useState<string | null>(null);
	const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
	const [totalEconomicSupport, setTotalEconomicSupport] = useState<number>(0);
	const [totalSocialSupport, setTotalSocialSupport] = useState<number>(0);
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
					setFamilyInfo(data.familyInfo);
					setTotalEconomicSupport(data.totalEconomicSupport || 0);
					setTotalSocialSupport(data.totalSocialSupport || 0);
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

	const formatCurrency = (value: number): string => {
		const roundedValue = Math.round(value);
		return roundedValue.toLocaleString();
	};

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
				{formNumber && (
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

			{/* Family Information */}
			<div className="bg-gradient-to-r from-[#0b4d2b] to-[#0a3d22] rounded-lg shadow-lg p-6 text-white">
				<h2 className="text-xl font-semibold mb-4">Family Information</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p className="text-sm opacity-90">Family Number</p>
						<p className="text-lg font-bold">{familyInfo?.FamilyNumber || formNumber || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Head Name</p>
						<p className="text-lg font-bold">{familyInfo?.HeadName || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Regional Council</p>
						<p className="text-lg font-bold">{familyInfo?.RegionalCouncil || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Local Community</p>
						<p className="text-lg font-bold">{familyInfo?.LocalCommunity || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Area Type</p>
						<p className="text-lg font-bold">{familyInfo?.AreaType || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Baseline Income Level</p>
						<p className="text-lg font-bold">{familyInfo?.BaselineIncomeLevel || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Total Members</p>
						<p className="text-lg font-bold">{familyInfo?.TotalMembers || 0}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Mentor</p>
						<p className="text-lg font-bold">{familyInfo?.Mentor || "-"}</p>
					</div>
				</div>
			</div>

			{/* Support Summary */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				<div className="bg-[#0b4d2b] text-white px-6 py-2">
					<h2 className="text-base font-semibold">Support Summary</h2>
				</div>
				<div className="p-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Total Economic Support */}
						<div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-1">Total Economic Support from PE</h3>
							<p className="text-xl font-bold text-blue-600">
								Rs. {formatCurrency(totalEconomicSupport)}
							</p>
						</div>

						{/* Total Social Support */}
						<div className="bg-green-50 rounded-lg border border-green-200 p-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-1">Total Social Support from PE</h3>
							<p className="text-xl font-bold text-green-600">
								Rs. {formatCurrency(totalSocialSupport)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* FDP Status Display */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
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
