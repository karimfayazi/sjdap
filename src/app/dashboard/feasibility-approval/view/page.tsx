"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react";

type FeasibilityApprovalData = {
	FDP_ID: number;
	FamilyID: string | null;
	MemberID: string | null;
	MemberName: string | null;
	PlanCategory: string | null;
	CurrentBaselineIncome: number | null;
	FeasibilityType: string | null;
	InvestmentRationale: string | null;
	MarketBusinessAnalysis: string | null;
	TotalSalesRevenue: number | null;
	TotalDirectCosts: number | null;
	DirectCostPercentage: number | null;
	TotalIndirectCosts: number | null;
	TotalCosts: number | null;
	MonthlyProfitLoss: number | null;
	NetProfitLoss: number | null;
	TotalInvestmentRequired: number | null;
	InvestmentFromPEProgram: number | null;
	PrimaryIndustry: string | null;
	SubField: string | null;
	Trade: string | null;
	TrainingInstitution: string | null;
	InstitutionType: string | null;
	InstitutionCertifiedBy: string | null;
	CourseTitle: string | null;
	CourseDeliveryType: string | null;
	HoursOfInstruction: number | null;
	DurationWeeks: number | null;
	StartDate: string | null;
	EndDate: string | null;
	CostPerParticipant: number | null;
	ExpectedStartingSalary: number | null;
	FeasibilityPdfPath: string | null;
	ApprovalStatus: string | null;
	ApprovalRemarks: string | null;
	SystemDate: string | null;
	CreatedBy: string | null;
};

const getStatusStyle = (rawStatus: string | null | undefined) => {
	const status = (rawStatus || "").toString().trim().toLowerCase();

	if (!status) {
		return {
			label: "Pending",
			icon: Clock,
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}

	if (status.includes("approve") || status === "approved" || status === "complete") {
		return {
			label: rawStatus || "Approved",
			icon: CheckCircle2,
			className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
		};
	}

	if (
		status.includes("reject") ||
		status.includes("rejected") ||
		status.includes("drop") ||
		status.includes("closed") ||
		status.includes("cancel")
	) {
		return {
			label: rawStatus || "Rejected",
			icon: XCircle,
			className: "bg-red-50 text-red-700 border border-red-200",
		};
	}

	if (status.includes("pending") || status.includes("review") || status.includes("process")) {
		return {
			label: rawStatus || "Pending",
			icon: Clock,
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}

	return {
		label: rawStatus || "Pending",
		icon: AlertCircle,
		className: "bg-blue-50 text-blue-700 border border-blue-200",
	};
};

function FeasibilityApprovalViewContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const fdpId = searchParams.get("fdpId");
	const familyId = searchParams.get("familyId");
	const memberId = searchParams.get("memberId");

	const [record, setRecord] = useState<FeasibilityApprovalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		if (!fdpId || !familyId || !memberId) {
			setError("Missing required parameters");
			setLoading(false);
			return;
		}

		const fetchFeasibilityData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(familyId)}&memberID=${encodeURIComponent(memberId)}`
				);
				const data = await response.json().catch(() => ({}));

				if (!response.ok || !data.success) {
					setError(data?.message || "Failed to load feasibility data");
					return;
				}

				// Find the record with matching FDP_ID
				const records = data.data || [];
				const foundRecord = records.find((r: any) => r.FDP_ID === parseInt(fdpId));

				if (!foundRecord) {
					setError("Feasibility record not found");
					return;
				}

				// Check if already approved - still load the record but show message
				const status = (foundRecord.ApprovalStatus || "").toString().trim().toLowerCase();
				if (status.includes("approve") || status === "approved") {
					setError("This feasibility is already approved");
				}

				setRecord(foundRecord);
				setApprovalRemarks(foundRecord.ApprovalRemarks || "");
			} catch (err) {
				console.error("Error fetching feasibility data:", err);
				setError("Error fetching feasibility data");
			} finally {
				setLoading(false);
			}
		};

		fetchFeasibilityData();
	}, [fdpId, familyId, memberId]);

	const updateApprovalStatus = async (newStatus: string) => {
		if (!record || !fdpId) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/feasibility-approval", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fdpId: parseInt(fdpId),
					approvalStatus: newStatus,
					approvalRemarks: approvalRemarks,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to update approval status");
			}

			// Update record
			setRecord((prev) =>
				prev
					? {
							...prev,
							ApprovalStatus: newStatus,
							ApprovalRemarks: approvalRemarks,
					  }
					: prev
			);

			alert("Approval status updated successfully!");
			router.push("/dashboard/feasibility-approval");
		} catch (err) {
			console.error("Error updating approval status:", err);
			const message =
				err instanceof Error
					? err.message
					: "Error updating approval status. Please try again.";
			setSaveError(message);
		} finally {
			setSavingStatus(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<span className="ml-3 text-gray-600 mt-3 block">Loading feasibility data...</span>
					</div>
				</div>
			</div>
		);
	}

	if (error && !record) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push("/dashboard/feasibility-approval")}
						className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-700 font-medium">{error}</p>
				</div>
			</div>
		);
	}

	if (!record) {
		return (
			<div className="space-y-6">
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
					<p className="text-gray-600">No feasibility record found.</p>
				</div>
			</div>
		);
	}

	const isApproved =
		(record.ApprovalStatus || "").toString().trim().toLowerCase().includes("approve") ||
		(record.ApprovalStatus || "").toString().trim().toLowerCase() === "approved";

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => router.push("/dashboard/feasibility-approval")}
					className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Feasibility Details</h1>
					<p className="text-gray-600 mt-2">
						FDP ID: {record.FDP_ID} | Family: {record.FamilyID} | Member: {record.MemberID}
					</p>
				</div>
			</div>

			{error && isApproved && (
				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
					<div className="flex items-start">
						<AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-amber-800 font-medium">{error}</p>
							<p className="text-amber-700 text-sm mt-1">
								This feasibility has already been approved and cannot be modified.
							</p>
						</div>
					</div>
				</div>
			)}

			{saveError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
					{saveError}
				</div>
			)}

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="space-y-6">
					{/* Basic Information */}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="font-medium text-gray-700">FDP ID</p>
								<p className="text-gray-900">{record.FDP_ID || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Family ID</p>
								<p className="text-gray-900">{record.FamilyID || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Member ID</p>
								<p className="text-gray-900">{record.MemberID || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Member Name</p>
								<p className="text-gray-900">{record.MemberName || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Plan Category</p>
								<p className="text-gray-900">{record.PlanCategory || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Feasibility Type</p>
								<p className="text-gray-900">{record.FeasibilityType || "N/A"}</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Current Baseline Income</p>
								<p className="text-gray-900">
									{record.CurrentBaselineIncome != null
										? record.CurrentBaselineIncome.toLocaleString()
										: "N/A"}
								</p>
							</div>
						</div>
					</div>

					{/* Economic Feasibility Details */}
					{record.FeasibilityType === "Economic" && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">Economic Feasibility</h3>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="font-medium text-gray-700">Total Sales Revenue</p>
									<p className="text-gray-900">
										{record.TotalSalesRevenue != null
											? record.TotalSalesRevenue.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Total Direct Costs</p>
									<p className="text-gray-900">
										{record.TotalDirectCosts != null
											? record.TotalDirectCosts.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Total Indirect Costs</p>
									<p className="text-gray-900">
										{record.TotalIndirectCosts != null
											? record.TotalIndirectCosts.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Net Profit/Loss</p>
									<p className="text-gray-900">
										{record.NetProfitLoss != null ? record.NetProfitLoss.toLocaleString() : "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Total Investment Required</p>
									<p className="text-gray-900">
										{record.TotalInvestmentRequired != null
											? record.TotalInvestmentRequired.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Investment from PE Program</p>
									<p className="text-gray-900">
										{record.InvestmentFromPEProgram != null
											? record.InvestmentFromPEProgram.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div className="col-span-2">
									<p className="font-medium text-gray-700">Investment Rationale</p>
									<p className="text-gray-900 whitespace-pre-wrap">
										{record.InvestmentRationale || "N/A"}
									</p>
								</div>
								<div className="col-span-2">
									<p className="font-medium text-gray-700">Market/Business Analysis</p>
									<p className="text-gray-900 whitespace-pre-wrap">
										{record.MarketBusinessAnalysis || "N/A"}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Skills Development Details */}
					{record.FeasibilityType === "Skills Development" && (
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-3">Skills Development</h3>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="font-medium text-gray-700">Primary Industry</p>
									<p className="text-gray-900">{record.PrimaryIndustry || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Sub Field</p>
									<p className="text-gray-900">{record.SubField || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Trade</p>
									<p className="text-gray-900">{record.Trade || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Training Institution</p>
									<p className="text-gray-900">{record.TrainingInstitution || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Course Title</p>
									<p className="text-gray-900">{record.CourseTitle || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Duration (Weeks)</p>
									<p className="text-gray-900">{record.DurationWeeks || "N/A"}</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Cost Per Participant</p>
									<p className="text-gray-900">
										{record.CostPerParticipant != null
											? record.CostPerParticipant.toLocaleString()
											: "N/A"}
									</p>
								</div>
								<div>
									<p className="font-medium text-gray-700">Expected Starting Salary</p>
									<p className="text-gray-900">
										{record.ExpectedStartingSalary != null
											? record.ExpectedStartingSalary.toLocaleString()
											: "N/A"}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Approval Section */}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 mb-3">Approval</h3>
						<div className="space-y-4">
							<div>
								<p className="font-medium text-gray-700 mb-2">Current Status</p>
								{(() => {
									const statusStyle = getStatusStyle(record.ApprovalStatus);
									const StatusIcon = statusStyle.icon;
									return (
										<span
											className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusStyle.className}`}
										>
											<StatusIcon className="h-4 w-4" />
											{statusStyle.label}
										</span>
									);
								})()}
							</div>
							<div>
								<p className="font-medium text-gray-700 mb-2">Approval Remarks</p>
								<textarea
									value={approvalRemarks}
									onChange={(e) => setApprovalRemarks(e.target.value)}
									disabled={isApproved}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
									rows={4}
									placeholder="Enter approval remarks..."
								/>
							</div>
							{record.FeasibilityPdfPath && (
								<div>
									<p className="font-medium text-gray-700 mb-2">Feasibility PDF</p>
									<a
										href={record.FeasibilityPdfPath}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
									>
										<FileText className="h-4 w-4" />
										View PDF
									</a>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Action Buttons - Only show if not approved */}
			{!isApproved && (
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={() => router.push("/dashboard/feasibility-approval")}
						className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => updateApprovalStatus("Rejected")}
						disabled={savingStatus}
						className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					>
						{savingStatus ? "Saving..." : "Reject"}
					</button>
					<button
						type="button"
						onClick={() => updateApprovalStatus("Approved")}
						disabled={savingStatus}
						className="rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22] disabled:opacity-50"
					>
						{savingStatus ? "Saving..." : "Approve"}
					</button>
				</div>
			)}
		</div>
	);
}

export default function FeasibilityApprovalViewPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				</div>
			}
		>
			<FeasibilityApprovalViewContent />
		</Suspense>
	);
}
