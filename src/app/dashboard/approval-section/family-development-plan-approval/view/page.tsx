"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

type RecordData = {
	[key: string]: any;
};

function FamilyDevelopmentPlanApprovalViewContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const section = searchParams.get("section") || "";
	const recordId = searchParams.get("recordId") || "";
	const formNumber = searchParams.get("formNumber") || "";

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [record, setRecord] = useState<RecordData | null>(null);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
	const [loadingLogs, setLoadingLogs] = useState(false);

	const sectionNames: Record<string, string> = {
		education: "Education Support",
		health: "Health Support",
		food: "Food Support",
		habitat: "Housing Support",
		housing: "Housing Support",
	};

	const moduleNames: Record<string, string> = {
		education: "FDP-Education",
		health: "FDP-Health",
		food: "FDP-Food",
		habitat: "FDP-Habitat",
		housing: "FDP-Habitat",
	};

	useEffect(() => {
		if (section && recordId) {
			fetchRecord();
			fetchApprovalLogs();
		}
	}, [section, recordId]);

	const fetchRecord = async () => {
		if (!section || !recordId) return;

		try {
			setLoading(true);
			setError(null);

			let apiUrl = "";
			const sectionLower = section.toLowerCase();
			switch (sectionLower) {
				case "education":
					apiUrl = `/api/family-development-plan/education-support?fdpSocialEduId=${recordId}`;
					break;
				case "health":
					apiUrl = `/api/family-development-plan/health-support?fdpHealthSupportId=${recordId}`;
					break;
				case "food":
					apiUrl = `/api/family-development-plan/food-support?fdpFoodSupportId=${recordId}`;
					break;
				case "habitat":
				case "housing":
					apiUrl = `/api/family-development-plan/housing-support?fdpHabitatSupportId=${recordId}`;
					break;
				default:
					throw new Error("Invalid section");
			}

			const response = await fetch(apiUrl);
			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to fetch record");
			}

			setRecord(data.data);
		} catch (err) {
			console.error("Error fetching record:", err);
			setError(err instanceof Error ? err.message : "Error fetching record");
		} finally {
			setLoading(false);
		}
	};

	const fetchApprovalLogs = async () => {
		if (!section || !recordId) return;

		try {
			setLoadingLogs(true);
			const moduleName = moduleNames[section.toLowerCase()] || "";
			const response = await fetch(
				`/api/approval-log?recordId=${recordId}&moduleName=${encodeURIComponent(moduleName)}`
			);
			const data = await response.json();

			if (response.ok && data.success) {
				setApprovalLogs(data.records || []);
			}
		} catch (err) {
			console.error("Error fetching approval logs:", err);
		} finally {
			setLoadingLogs(false);
		}
	};

	const updateApprovalStatus = async (newStatus: string) => {
		if (!record || !recordId) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/family-development-plan/approval", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					section: section.toLowerCase(),
					recordId: parseInt(recordId),
					approvalStatus: newStatus,
					remarks: approvalRemarks,
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
					  }
					: prev
			);

			// Refresh approval logs
			fetchApprovalLogs();

			// Clear remarks
			setApprovalRemarks("");

			alert("Approval status updated successfully!");
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

	const formatCurrency = (value: number | null | undefined): string => {
		if (value === null || value === undefined) return "N/A";
		return `PKR ${parseFloat(value.toString()).toLocaleString()}`;
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;

		const statusLower = status.toLowerCase();
		if (statusLower === "approved") {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
					<CheckCircle className="h-3 w-3 mr-1" />
					Approved
				</span>
			);
		} else if (statusLower === "rejected") {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
					<XCircle className="h-3 w-3 mr-1" />
					Rejected
				</span>
			);
		} else {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					<Clock className="h-3 w-3 mr-1" />
					{status || "Pending"}
				</span>
			);
		}
	};

	const isApproved = () => {
		if (!record || !record.ApprovalStatus) return false;
		const statusLower = (record.ApprovalStatus || "").toString().trim().toLowerCase();
		return statusLower === "approved" || statusLower.includes("approve");
	};

	const renderRecordDetails = () => {
		if (!record) return null;

		const details: Array<{ label: string; value: any }> = [];

		// Common fields
		if (record.FormNumber) details.push({ label: "Form Number", value: record.FormNumber });
		if (record.FamilyID) details.push({ label: "Family ID", value: record.FamilyID });
		if (record.HeadName) details.push({ label: "Head Name", value: record.HeadName });

		// Section-specific fields
		if (section.toLowerCase() === "education") {
			if (record.MaxSocialSupportAmount !== undefined)
				details.push({ label: "Max Social Support Amount", value: formatCurrency(record.MaxSocialSupportAmount) });
			if (record.EduOneTimeAdmissionTotalCost !== undefined)
				details.push({ label: "One-Time Admission Total Cost", value: formatCurrency(record.EduOneTimeAdmissionTotalCost) });
			if (record.EduOneTimeAdmissionFamilyContribution !== undefined)
				details.push({ label: "One-Time Admission Family Contribution", value: formatCurrency(record.EduOneTimeAdmissionFamilyContribution) });
			if (record.EduOneTimeAdmissionPEContribution !== undefined)
				details.push({ label: "One-Time Admission PE Contribution", value: formatCurrency(record.EduOneTimeAdmissionPEContribution) });
			if (record.EduMonthlyTuitionTotalCost !== undefined)
				details.push({ label: "Monthly Tuition Total Cost", value: formatCurrency(record.EduMonthlyTuitionTotalCost) });
			if (record.EduMonthlyTuitionFamilyContribution !== undefined)
				details.push({ label: "Monthly Tuition Family Contribution", value: formatCurrency(record.EduMonthlyTuitionFamilyContribution) });
			if (record.EduMonthlyTuitionPEContribution !== undefined)
				details.push({ label: "Monthly Tuition PE Contribution", value: formatCurrency(record.EduMonthlyTuitionPEContribution) });
			if (record.EduTuitionNumberOfMonths !== undefined)
				details.push({ label: "Tuition Number of Months", value: record.EduTuitionNumberOfMonths });
			if (record.EduMonthlyHostelTotalCost !== undefined)
				details.push({ label: "Monthly Hostel Total Cost", value: formatCurrency(record.EduMonthlyHostelTotalCost) });
			if (record.EduMonthlyHostelFamilyContribution !== undefined)
				details.push({ label: "Monthly Hostel Family Contribution", value: formatCurrency(record.EduMonthlyHostelFamilyContribution) });
			if (record.EduMonthlyHostelPEContribution !== undefined)
				details.push({ label: "Monthly Hostel PE Contribution", value: formatCurrency(record.EduMonthlyHostelPEContribution) });
			if (record.EduHostelNumberOfMonths !== undefined)
				details.push({ label: "Hostel Number of Months", value: record.EduHostelNumberOfMonths });
			if (record.EduMonthlyTransportTotalCost !== undefined)
				details.push({ label: "Monthly Transport Total Cost", value: formatCurrency(record.EduMonthlyTransportTotalCost) });
			if (record.EduMonthlyTransportFamilyContribution !== undefined)
				details.push({ label: "Monthly Transport Family Contribution", value: formatCurrency(record.EduMonthlyTransportFamilyContribution) });
			if (record.EduMonthlyTransportPEContribution !== undefined)
				details.push({ label: "Monthly Transport PE Contribution", value: formatCurrency(record.EduMonthlyTransportPEContribution) });
			if (record.EduTransportNumberOfMonths !== undefined)
				details.push({ label: "Transport Number of Months", value: record.EduTransportNumberOfMonths });
			if (record.EduTotalSupportCost !== undefined)
				details.push({ label: "Total Support Cost", value: formatCurrency(record.EduTotalSupportCost) });
			if (record.EduTotalFamilyContribution !== undefined)
				details.push({ label: "Total Family Contribution", value: formatCurrency(record.EduTotalFamilyContribution) });
			if (record.EduTotalPEContribution !== undefined)
				details.push({ label: "Total PE Contribution", value: formatCurrency(record.EduTotalPEContribution) });
			if (record.BeneficiaryID) details.push({ label: "Beneficiary ID", value: record.BeneficiaryID });
			if (record.BeneficiaryName) details.push({ label: "Beneficiary Name", value: record.BeneficiaryName });
			if (record.BeneficiaryAge) details.push({ label: "Beneficiary Age", value: record.BeneficiaryAge });
			if (record.BeneficiaryGender) details.push({ label: "Beneficiary Gender", value: record.BeneficiaryGender });
			if (record.EducationInterventionType) details.push({ label: "Intervention Type", value: record.EducationInterventionType });
			if (record.BaselineReasonNotStudying) details.push({ label: "Reason Not Studying", value: record.BaselineReasonNotStudying });
			if (record.AdmittedToSchoolType) details.push({ label: "Admitted School Type", value: record.AdmittedToSchoolType });
			if (record.AdmittedToClassLevel) details.push({ label: "Admitted Class Level", value: record.AdmittedToClassLevel });
			if (record.BaselineSchoolType) details.push({ label: "Baseline School Type", value: record.BaselineSchoolType });
			if (record.TransferredToSchoolType) details.push({ label: "Transferred School Type", value: record.TransferredToSchoolType });
			if (record.TransferredToClassLevel) details.push({ label: "Transferred Class Level", value: record.TransferredToClassLevel });
		} else if (section.toLowerCase() === "health") {
			if (record.HealthMonthlyTotalCost !== undefined)
				details.push({ label: "Monthly Total Cost", value: formatCurrency(record.HealthMonthlyTotalCost) });
			if (record.HealthMonthlyFamilyContribution !== undefined)
				details.push({ label: "Monthly Family Contribution", value: formatCurrency(record.HealthMonthlyFamilyContribution) });
			if (record.HealthMonthlyPEContribution !== undefined)
				details.push({ label: "Monthly PE Contribution", value: formatCurrency(record.HealthMonthlyPEContribution) });
			if (record.HealthNumberOfMonths !== undefined)
				details.push({ label: "Number of Months", value: record.HealthNumberOfMonths });
			if (record.HealthTotalCost !== undefined)
				details.push({ label: "Total Cost", value: formatCurrency(record.HealthTotalCost) });
			if (record.HealthTotalFamilyContribution !== undefined)
				details.push({ label: "Total Family Contribution", value: formatCurrency(record.HealthTotalFamilyContribution) });
			if (record.HealthTotalPEContribution !== undefined)
				details.push({ label: "Total PE Contribution", value: formatCurrency(record.HealthTotalPEContribution) });
			if (record.BeneficiaryID) details.push({ label: "Beneficiary ID", value: record.BeneficiaryID });
			if (record.BeneficiaryName) details.push({ label: "Beneficiary Name", value: record.BeneficiaryName });
			if (record.BeneficiaryAge) details.push({ label: "Beneficiary Age", value: record.BeneficiaryAge });
			if (record.BeneficiaryGender) details.push({ label: "Beneficiary Gender", value: record.BeneficiaryGender });
			if (record.AreaType) details.push({ label: "Area Type", value: record.AreaType });
		} else if (section.toLowerCase() === "food") {
			if (record.BaselineFamilyIncome !== undefined)
				details.push({ label: "Baseline Family Income", value: formatCurrency(record.BaselineFamilyIncome) });
			if (record.FamilyMembersCount !== undefined)
				details.push({ label: "Family Members Count", value: record.FamilyMembersCount });
			if (record.FamilyPerCapitaIncome !== undefined)
				details.push({ label: "Per Capita Income", value: formatCurrency(record.FamilyPerCapitaIncome) });
			if (record.SelfSufficiencyIncomePerCapita !== undefined)
				details.push({ label: "Self-Sufficiency Income Per Capita", value: formatCurrency(record.SelfSufficiencyIncomePerCapita) });
			if (record.BaselinePerCapitaAsPctOfSelfSuff !== undefined)
				details.push({ label: "Baseline % of Self-Sufficiency", value: `${parseFloat(record.BaselinePerCapitaAsPctOfSelfSuff).toFixed(2)}%` });
			if (record.BaselinePovertyLevel) details.push({ label: "Poverty Level", value: record.BaselinePovertyLevel });
			if (record.MaxSocialSupportAmount !== undefined)
				details.push({ label: "Max Social Support Amount", value: formatCurrency(record.MaxSocialSupportAmount) });
			if (record.FoodSupportMonthlyTotalCost !== undefined)
				details.push({ label: "Monthly Total Cost", value: formatCurrency(record.FoodSupportMonthlyTotalCost) });
			if (record.FoodSupportMonthlyFamilyContribution !== undefined)
				details.push({ label: "Monthly Family Contribution", value: formatCurrency(record.FoodSupportMonthlyFamilyContribution) });
			if (record.FoodSupportMonthlyPEContribution !== undefined)
				details.push({ label: "Monthly PE Contribution", value: formatCurrency(record.FoodSupportMonthlyPEContribution) });
			if (record.FoodSupportNumberOfMonths !== undefined)
				details.push({ label: "Number of Months", value: record.FoodSupportNumberOfMonths });
			if (record.FoodSupportTotalCost !== undefined)
				details.push({ label: "Total Cost", value: formatCurrency(record.FoodSupportTotalCost) });
			if (record.FoodSupportTotalFamilyContribution !== undefined)
				details.push({ label: "Total Family Contribution", value: formatCurrency(record.FoodSupportTotalFamilyContribution) });
			if (record.FoodSupportTotalPEContribution !== undefined)
				details.push({ label: "Total PE Contribution", value: formatCurrency(record.FoodSupportTotalPEContribution) });
		} else if (section.toLowerCase() === "habitat" || section.toLowerCase() === "housing") {
			if (record.AreaType) details.push({ label: "Area Type", value: record.AreaType });
			if (record.HabitatMonthlyTotalCost !== undefined)
				details.push({ label: "Monthly Total Cost", value: formatCurrency(record.HabitatMonthlyTotalCost) });
			if (record.HabitatMonthlyFamilyContribution !== undefined)
				details.push({ label: "Monthly Family Contribution", value: formatCurrency(record.HabitatMonthlyFamilyContribution) });
			if (record.HabitatMonthlyPEContribution !== undefined)
				details.push({ label: "Monthly PE Contribution", value: formatCurrency(record.HabitatMonthlyPEContribution) });
			if (record.HabitatNumberOfMonths !== undefined)
				details.push({ label: "Number of Months", value: record.HabitatNumberOfMonths });
			if (record.HabitatTotalCost !== undefined)
				details.push({ label: "Total Cost", value: formatCurrency(record.HabitatTotalCost) });
			if (record.HabitatTotalFamilyContribution !== undefined)
				details.push({ label: "Total Family Contribution", value: formatCurrency(record.HabitatTotalFamilyContribution) });
			if (record.HabitatTotalPEContribution !== undefined)
				details.push({ label: "Total PE Contribution", value: formatCurrency(record.HabitatTotalPEContribution) });
		}

		// Approval status
		details.push({ label: "Approval Status", value: getStatusBadge(record.ApprovalStatus) });

		return (
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">Record Details</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{details.map((detail, idx) => (
						<div key={idx} className="border-b border-gray-100 pb-2">
							<dt className="text-sm font-medium text-gray-500">{detail.label}</dt>
							<dd className="mt-1 text-sm text-gray-900">{detail.value || "N/A"}</dd>
						</div>
					))}
				</div>
			</div>
		);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<span className="ml-3 text-gray-600 mt-3 block">Loading record data...</span>
					</div>
				</div>
			</div>
		);
	}

	if (error && !record) {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						{sectionNames[section.toLowerCase()] || "FDP Section"} - View Details
					</h1>
					<p className="text-gray-600 mt-2">View and approve/reject record details</p>
				</div>
				<button
					onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval?formNumber=${encodeURIComponent(formNumber)}`)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
			</div>

			{/* Record Details */}
			{renderRecordDetails()}

			{/* Approval Section */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Action</h3>
				{isApproved() && (
					<div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-green-700 text-sm font-medium">
							This record has already been approved. Editing is disabled.
						</p>
					</div>
				)}
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Remarks
						</label>
						<textarea
							value={approvalRemarks}
							onChange={(e) => setApprovalRemarks(e.target.value)}
							placeholder="Enter remarks for approval/rejection..."
							rows={4}
							disabled={isApproved()}
							className={`w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
								isApproved() ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
							}`}
						/>
					</div>

					{saveError && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4">
							<p className="text-red-600 text-sm font-medium">Error: {saveError}</p>
						</div>
					)}

					<div className="flex gap-4">
						<button
							onClick={() => updateApprovalStatus("Approved")}
							disabled={savingStatus || isApproved()}
							className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<CheckCircle className="h-4 w-4" />
							Approve
						</button>
						<button
							onClick={() => updateApprovalStatus("Rejected")}
							disabled={savingStatus || isApproved()}
							className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<XCircle className="h-4 w-4" />
							Reject
						</button>
					</div>
				</div>
			</div>

			{/* Approval Log */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="bg-[#0b4d2b] px-6 py-4">
					<h2 className="text-xl font-semibold text-white">Approval History</h2>
				</div>
				{loadingLogs ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
						<span className="ml-3 text-gray-600">Loading approval logs...</span>
					</div>
				) : approvalLogs.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Level</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action By</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action At</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{approvalLogs.map((log, idx) => (
									<tr key={log.LogID || idx} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.LogID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											{log.ActionLevel ? (
												<span
													className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
														(log.ActionLevel || "")
															.toString()
															.trim()
															.toLowerCase()
															.includes("approve")
															? "bg-emerald-50 text-emerald-700 border border-emerald-200"
															: (log.ActionLevel || "")
																	.toString()
																	.trim()
																	.toLowerCase()
																	.includes("reject")
															? "bg-red-50 text-red-700 border border-red-200"
															: "bg-amber-50 text-amber-700 border border-amber-200"
													}`}
												>
													{log.ActionLevel}
												</span>
											) : (
												"N/A"
											)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionBy || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{log.ActionAt
												? new Date(log.ActionAt).toLocaleString("en-US", {
														year: "numeric",
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
												  })
												: "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionType || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{log.Remarks || "N/A"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-12 text-center">
						<p className="text-gray-500">No approval logs found.</p>
					</div>
				)}
			</div>
		</div>
	);
}

export default function FamilyDevelopmentPlanApprovalViewPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FamilyDevelopmentPlanApprovalViewContent />
		</Suspense>
	);
}
