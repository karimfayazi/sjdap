"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type SWBFamilyData = {
	CNIC?: string;
	Received_Application?: string;
	BTS_Number?: string;
	FAMILY_ID?: string;
	Regional_Council?: string;
	Local_Council?: string;
	Jamat_Khana?: string;
	Programme?: string;
	Beneficiary_Name?: string;
	Gender?: string;
	VIST_FEAP?: string;
	Already_FEAP_Programme?: string;
	Potential_family_declaration_by_FEAP?: string;
	If_no_reason?: string;
	FDP_Status?: string;
	SWB_to_stop_support_from_date?: string;
	Remarks?: string;
	Mentor_Name?: string;
	Social_Support_Amount?: number;
	Economic_Support_Amount?: number;
	update_date?: string;
};

function ViewSWBFamilyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const cnic = searchParams.get("cnic");
	const familyId = searchParams.get("familyId");

	const [family, setFamily] = useState<SWBFamilyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFamily = async () => {
			if (!cnic || !familyId) {
				setError("Missing CNIC or Family ID in the URL.");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/swb-families?cnic=${encodeURIComponent(cnic)}&familyId=${encodeURIComponent(familyId)}`);
				const data = await response.json();

				if (data.success && data.swbFamily) {
					setFamily(data.swbFamily);
				} else {
					setError(data.message || "SWB family record not found.");
				}
			} catch (err) {
				console.error("Error fetching SWB family record:", err);
				setError("Error fetching SWB family record.");
			} finally {
				setLoading(false);
			}
		};

		fetchFamily();
	}, [cnic, familyId]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | undefined) => {
		if (!amount) return "N/A";
		return new Intl.NumberFormat('en-PK', {
			style: 'currency',
			currency: 'PKR'
		}).format(amount);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
						<p className="text-gray-600 mt-2">Loading SWB family record...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	if (error || !family) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
						<p className="text-gray-600 mt-2">View SWB family information</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/swb-families")}
						className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to SWB Families
					</button>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error || "SWB family record not found."}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
					<p className="text-gray-600 mt-2">View SWB family information</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/swb-families")}
					className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to SWB Families
				</button>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Basic Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
							<p className="text-sm text-gray-900">{family.CNIC || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Family ID</label>
							<p className="text-sm text-gray-900">{family.FAMILY_ID || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">BTS Number</label>
							<p className="text-sm text-gray-900">{family.BTS_Number || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
							<p className="text-sm text-gray-900">{family.Beneficiary_Name || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
							<p className="text-sm text-gray-900">{family.Gender || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Received Application</label>
							<p className="text-sm text-gray-900">{formatDate(family.Received_Application)}</p>
						</div>
					</div>

					{/* Location Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Location Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
							<p className="text-sm text-gray-900">{family.Regional_Council || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
							<p className="text-sm text-gray-900">{family.Local_Council || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Jamat Khana</label>
							<p className="text-sm text-gray-900">{family.Jamat_Khana || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
							<p className="text-sm text-gray-900">{family.Programme || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mentor Name</label>
							<p className="text-sm text-gray-900">{family.Mentor_Name || "N/A"}</p>
						</div>
					</div>

					{/* FEAP Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">FEAP Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Visit Family</label>
							<p className="text-sm text-gray-900">{family.VIST_FEAP || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Already FEAP Programme</label>
							<p className="text-sm text-gray-900">{family.Already_FEAP_Programme || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Potential Family Declaration by FEAP/SEDP Staff</label>
							<p className="text-sm text-gray-900">{family.Potential_family_declaration_by_FEAP || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">If No Reason</label>
							<p className="text-sm text-gray-900">{family.If_no_reason || "N/A"}</p>
						</div>
					</div>

					{/* Status and Support Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Status and Support Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">FDP Status</label>
							<p className="text-sm text-gray-900">{family.FDP_Status || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">SWB to Stop Support From Date</label>
							<p className="text-sm text-gray-900">{formatDate(family.SWB_to_stop_support_from_date)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Social Support Amount</label>
							<p className="text-sm text-gray-900">{formatCurrency(family.Social_Support_Amount)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Economic Support Amount</label>
							<p className="text-sm text-gray-900">{formatCurrency(family.Economic_Support_Amount)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
							<p className="text-sm text-gray-900">{family.Remarks || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Update Date</label>
							<p className="text-sm text-gray-900">{formatDate(family.update_date)}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ViewSWBFamilyPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">View SWB Family</h1>
						<p className="text-gray-600 mt-2">Loading...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ViewSWBFamilyContent />
		</Suspense>
	);
}

