"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type Intervention = {
	InterventionID: number;
	FormNumber: string;
	Section: string | null;
	InterventionStatus: string | null;
	InterventionCategory: string | null;
	SubCategory: string | null;
	MainIntervention: string | null;
	InterventionType: string | null;
	FinancialCategory: string | null;
	TotalAmount: number | null;
	InterventionStartDate: string | null;
	InterventionEndDate: string | null;
	Remarks: string | null;
	MemberID: string | null;
	MemberName: string | null;
	MemberCNIC: string | null;
	ApprovalStatus: string | null;
	Mentor: string | null;
	CreatedAt: string | null;
	FamilyFullName: string | null;
	FamilyCNIC: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

function ViewInterventionContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const interventionId = searchParams?.get("interventionId");

	const [intervention, setIntervention] = useState<Intervention | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!interventionId) {
			setError("Intervention ID is missing from URL");
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/approval/interventions/by-id?interventionId=${interventionId}`);
				const data = await response.json();

				if (data.success) {
					setIntervention(data.intervention);
				} else {
					setError(data.message || "Failed to load intervention details");
				}
			} catch (err: any) {
				console.error("Error fetching intervention details:", err);
				setError(err.message || "Failed to load intervention details");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [interventionId]);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return `PKR ${amount.toLocaleString()}`;
	};

	const getStatusBadge = (status: string | null) => {
		if (!status || status === "Pending") {
			return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>;
		}
		const statusUpper = status.toUpperCase();
		if (statusUpper === "APPROVED" || statusUpper === "APPROVAL") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approved</span>;
		} else if (statusUpper === "REJECTED" || statusUpper === "REJECTION") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejected</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>;
	};

	if (loading) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
						<span className="ml-3 text-gray-600">Loading intervention details...</span>
					</div>
				</div>
			</PageGuard>
		);
	}

	if (error) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800">{error}</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/intervention-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
			</PageGuard>
		);
	}

	if (!intervention) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-yellow-800">Intervention not found</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/intervention-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
			</PageGuard>
		);
	}

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">View Intervention</h1>
						<p className="text-gray-600 mt-2">Intervention ID: {intervention.InterventionID}</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/intervention-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>

				{intervention && (
					<>
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Information</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
									<p className="text-sm text-gray-900">{intervention.FormNumber || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
									<p className="text-sm text-gray-900">{intervention.MemberID || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Member Name</label>
									<p className="text-sm text-gray-900">{intervention.MemberName || "—"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
									<p className="text-sm text-gray-900">{intervention.MemberCNIC || intervention.FamilyCNIC || "—"}</p>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Intervention Details</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention ID</label>
									<p className="text-sm text-gray-900">{intervention.InterventionID}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
									<p className="text-sm text-gray-900">{intervention.FormNumber || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
									<p className="text-sm text-gray-900">{intervention.Section || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention Status</label>
									<p className="text-sm text-gray-900">{intervention.InterventionStatus || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention Category</label>
									<p className="text-sm text-gray-900">{intervention.InterventionCategory || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
									<p className="text-sm text-gray-900">{intervention.SubCategory || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Main Intervention</label>
									<p className="text-sm text-gray-900">{intervention.MainIntervention || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention Type</label>
									<p className="text-sm text-gray-900">{intervention.InterventionType || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Financial Category</label>
									<p className="text-sm text-gray-900">{intervention.FinancialCategory || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
									<p className="text-sm text-gray-900">{formatCurrency(intervention.TotalAmount)}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention Start Date</label>
									<p className="text-sm text-gray-900">{formatDate(intervention.InterventionStartDate)}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention End Date</label>
									<p className="text-sm text-gray-900">{formatDate(intervention.InterventionEndDate)}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
									<p className="text-sm text-gray-900">{intervention.MemberID || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
									<div className="mt-1">{getStatusBadge(intervention.ApprovalStatus)}</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
									<p className="text-sm text-gray-900">{intervention.Mentor || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
									<p className="text-sm text-gray-900">{formatDate(intervention.CreatedAt)}</p>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
									<p className="text-sm text-gray-900 whitespace-pre-wrap">{intervention.Remarks || "N/A"}</p>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</PageGuard>
	);
}

export default function ViewInterventionPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ViewInterventionContent />
		</Suspense>
	);
}
