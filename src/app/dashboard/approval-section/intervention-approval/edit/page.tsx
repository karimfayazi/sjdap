"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
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

function EditInterventionContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const interventionId = searchParams?.get("interventionId");

	const [intervention, setIntervention] = useState<Intervention | null>(null);
	const [approvalStatus, setApprovalStatus] = useState<string>("");
	const [remarks, setRemarks] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const isApproved = intervention?.ApprovalStatus?.toUpperCase() === "APPROVED";

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
					setApprovalStatus(data.intervention.ApprovalStatus || "");
					setRemarks(data.intervention.Remarks || "");
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isApproved) {
			setError("This record is already approved and cannot be edited");
			return;
		}

		if (!approvalStatus) {
			setError("Please select an approval status");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			const response = await fetch(`/api/approval/interventions/by-id?interventionId=${interventionId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ApprovalStatus: approvalStatus,
					Remarks: remarks,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/approval-section/intervention-approval");
				}, 1500);
			} else {
				const errorMessage = data.message || "Failed to update intervention";
				if (errorMessage.toLowerCase().includes("approved") || errorMessage.toLowerCase().includes("locked")) {
					const refreshResponse = await fetch(`/api/approval/interventions/by-id?interventionId=${interventionId}`);
					const refreshData = await refreshResponse.json();
					if (refreshData.success) {
						setIntervention(refreshData.intervention);
						setApprovalStatus(refreshData.intervention.ApprovalStatus || "");
						setRemarks(refreshData.intervention.Remarks || "");
					}
					setError("This record has already been approved and is locked. The form is now read-only.");
				} else {
					setError(errorMessage);
				}
			}
		} catch (err: any) {
			console.error("Error updating intervention:", err);
			setError(err.message || "Failed to update intervention");
		} finally {
			setSaving(false);
		}
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

	if (error && !intervention) {
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

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Edit Intervention</h1>
						<p className="text-gray-600 mt-2">Intervention ID: {intervention?.InterventionID}</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/intervention-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>

				{isApproved && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-yellow-800">⚠️ This intervention has already been approved. The form is now read-only and cannot be edited.</p>
					</div>
				)}

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-green-800">Intervention updated successfully! Redirecting...</p>
					</div>
				)}

				{intervention && (
					<form onSubmit={handleSubmit} className="space-y-6">
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
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Approval Information</h2>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Approval Status <span className="text-red-500">*</span>
									</label>
									<select
										value={approvalStatus}
										onChange={(e) => setApprovalStatus(e.target.value)}
										disabled={isApproved}
										className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent ${
											isApproved ? "bg-gray-50 cursor-not-allowed opacity-50" : ""
										}`}
									>
										<option value="">Select Status</option>
										<option value="Approved">Approved</option>
										<option value="Rejected">Rejected</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
									<textarea
										value={remarks}
										onChange={(e) => setRemarks(e.target.value)}
										disabled={isApproved}
										rows={4}
										className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent ${
											isApproved ? "bg-gray-50 cursor-not-allowed opacity-50" : ""
										}`}
										placeholder="Enter remarks..."
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={() => router.push("/dashboard/approval-section/intervention-approval")}
								className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving || isApproved}
								className={`inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors ${
									isApproved ? "opacity-50 cursor-not-allowed" : ""
								}`}
							>
								{saving ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Save Approval
									</>
								)}
							</button>
						</div>
					</form>
				)}
			</div>
		</PageGuard>
	);
}

export default function EditInterventionPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<EditInterventionContent />
		</Suspense>
	);
}
