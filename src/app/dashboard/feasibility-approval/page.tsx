"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, AlertCircle, Download, Eye, FileText } from "lucide-react";

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
	// Family Member Info
	MemberNo: string | null;
	MemberFormNo: string | null;
	MemberFullName: string | null;
	MemberBFormOrCNIC: string | null;
	MemberGender: string | null;
	// Application Basic Info
	FormNumber: string | null;
	ApplicationFullName: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
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

	// Default info style
	return {
		label: rawStatus || "Pending",
		icon: AlertCircle,
		className: "bg-blue-50 text-blue-700 border border-blue-200",
	};
};

export default function FeasibilityApprovalPage() {
	const router = useRouter();
	const [records, setRecords] = useState<FeasibilityApprovalData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [familyIdFilter, setFamilyIdFilter] = useState("");
	const [memberNameFilter, setMemberNameFilter] = useState("");
	const [planCategoryFilter, setPlanCategoryFilter] = useState("");
	const [feasibilityTypeFilter, setFeasibilityTypeFilter] = useState("");
	const [approvalStatusFilter, setApprovalStatusFilter] = useState("");

	// Applied filters
	const [appliedFamilyIdFilter, setAppliedFamilyIdFilter] = useState("");
	const [appliedMemberNameFilter, setAppliedMemberNameFilter] = useState("");
	const [appliedPlanCategoryFilter, setAppliedPlanCategoryFilter] = useState("");
	const [appliedFeasibilityTypeFilter, setAppliedFeasibilityTypeFilter] = useState("");
	const [appliedApprovalStatusFilter, setAppliedApprovalStatusFilter] = useState("");

	// Detail view
	const [detailRecord, setDetailRecord] = useState<FeasibilityApprovalData | null>(null);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Approval log modal
	const [showApprovalLogModal, setShowApprovalLogModal] = useState(false);
	const [showApprovalAlert, setShowApprovalAlert] = useState(false);
	const [pendingApprovalLogRecordId, setPendingApprovalLogRecordId] = useState<number | null>(null);
	const [approvalLogRecordId, setApprovalLogRecordId] = useState<number | null>(null);
	const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
	const [loadingLogs, setLoadingLogs] = useState(false);
	const [logError, setLogError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFeasibilityApproval = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch("/api/feasibility-approval");
				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					setError(data?.message || "Failed to load feasibility approval data");
					return;
				}

				if (data.success) {
					setRecords(data.records || []);
				} else {
					setError(data.message || "Failed to load feasibility approval data");
				}
			} catch (err) {
				console.error("Error fetching feasibility approval data:", err);
				setError("Error fetching feasibility approval data");
			} finally {
				setLoading(false);
			}
		};

		fetchFeasibilityApproval();
	}, []);

	const uniquePlanCategories = Array.from(
		new Set(records.map((r) => r.PlanCategory).filter(Boolean))
	) as string[];
	const uniqueFeasibilityTypes = Array.from(
		new Set(records.map((r) => r.FeasibilityType).filter(Boolean))
	) as string[];
	const uniqueApprovalStatuses = Array.from(
		new Set(records.map((r) => r.ApprovalStatus).filter(Boolean))
	) as string[];

	const filteredRecords = records.filter((row) => {
		const matchesFamilyId =
			!appliedFamilyIdFilter ||
			(row.FamilyID || "").toLowerCase().includes(appliedFamilyIdFilter.toLowerCase());
		const matchesMemberName =
			!appliedMemberNameFilter ||
			(row.MemberName || "").toLowerCase().includes(appliedMemberNameFilter.toLowerCase());
		const matchesPlanCategory =
			!appliedPlanCategoryFilter ||
			(row.PlanCategory || "").toLowerCase() === appliedPlanCategoryFilter.toLowerCase();
		const matchesFeasibilityType =
			!appliedFeasibilityTypeFilter ||
			(row.FeasibilityType || "").toLowerCase() === appliedFeasibilityTypeFilter.toLowerCase();
		const matchesApprovalStatus =
			!appliedApprovalStatusFilter ||
			(row.ApprovalStatus || "").toLowerCase() === appliedApprovalStatusFilter.toLowerCase();

		return (
			matchesFamilyId &&
			matchesMemberName &&
			matchesPlanCategory &&
			matchesFeasibilityType &&
			matchesApprovalStatus
		);
	});

	// Group records by FamilyID
	const groupedByFamily = filteredRecords.reduce((acc, record) => {
		const familyId = record.FamilyID || "Unknown";
		if (!acc[familyId]) {
			acc[familyId] = {
				familyId: familyId,
				formNumber: record.FormNumber || familyId,
				applicationFullName: record.ApplicationFullName || "N/A",
				cnicNumber: record.CNICNumber || "N/A",
				regionalCommunity: record.RegionalCommunity || "N/A",
				localCommunity: record.LocalCommunity || "N/A",
				records: [],
			};
		}
		acc[familyId].records.push(record);
		return acc;
	}, {} as Record<string, {
		familyId: string;
		formNumber: string;
		applicationFullName: string;
		cnicNumber: string;
		regionalCommunity: string;
		localCommunity: string;
		records: FeasibilityApprovalData[];
	}>);

	const familyGroups = Object.values(groupedByFamily);

	// Stats
	const totalPlans = records.length;
	const totalApproved = records.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return s.includes("approve") || s === "approved" || s === "complete";
	}).length;
	const totalPending = records.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return !s || s === "pending" || s.includes("pending");
	}).length;
	const totalRejected = records.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return s.includes("reject") || s.includes("rejected");
	}).length;

	const exportToCsv = () => {
		try {
			const headers = [
				"FDP_ID",
				"FamilyID",
				"MemberID",
				"MemberName",
				"PlanCategory",
				"FeasibilityType",
				"TotalInvestmentRequired",
				"InvestmentFromPEProgram",
				"ApprovalStatus",
				"ApprovalRemarks",
				"FormNumber",
				"ApplicationFullName",
				"CNICNumber",
				"RegionalCommunity",
				"LocalCommunity",
			];

			const csvRows: string[] = [];
			csvRows.push(headers.join(","));

			filteredRecords.forEach((row) => {
				const dataRow = [
					row.FDP_ID?.toString() || "N/A",
					row.FamilyID || "N/A",
					row.MemberID || "N/A",
					row.MemberName || "N/A",
					row.PlanCategory || "N/A",
					row.FeasibilityType || "N/A",
					row.TotalInvestmentRequired != null
						? row.TotalInvestmentRequired.toString()
						: "N/A",
					row.InvestmentFromPEProgram != null
						? row.InvestmentFromPEProgram.toString()
						: "N/A",
					row.ApprovalStatus || "N/A",
					row.ApprovalRemarks || "N/A",
					row.FormNumber || "N/A",
					row.ApplicationFullName || "N/A",
					row.CNICNumber || "N/A",
					row.RegionalCommunity || "N/A",
					row.LocalCommunity || "N/A",
				];

				const escaped = dataRow
					.map((cell) => {
						const str = String(cell);
						if (str.includes(",") || str.includes('"') || str.includes("\n")) {
							return `"${str.replace(/"/g, '""')}"`;
						}
						return str;
					})
					.join(",");

				csvRows.push(escaped);
			});

			const csvContent = csvRows.join("\n");
			const BOM = "\uFEFF";
			const blob = new Blob([BOM + csvContent], {
				type: "text/csv;charset=utf-8;",
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "feasibility_approval_export.csv";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error exporting CSV:", error);
			alert("Failed to export CSV. Please try again.");
		}
	};

	const handleResetFilters = () => {
		setFamilyIdFilter("");
		setMemberNameFilter("");
		setPlanCategoryFilter("");
		setFeasibilityTypeFilter("");
		setApprovalStatusFilter("");

		setAppliedFamilyIdFilter("");
		setAppliedMemberNameFilter("");
		setAppliedPlanCategoryFilter("");
		setAppliedFeasibilityTypeFilter("");
		setAppliedApprovalStatusFilter("");
	};

	const handleViewRow = (row: FeasibilityApprovalData) => {
		const status = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		if (status.includes("approve") || status === "approved") {
			// Show custom alert with View button
			setPendingApprovalLogRecordId(row.FDP_ID);
			setShowApprovalAlert(true);
			return;
		}
		setDetailRecord(row);
		setApprovalRemarks(row.ApprovalRemarks || "");
		setSaveError(null);
	};

	const handleViewApprovalLog = () => {
		if (pendingApprovalLogRecordId) {
			setShowApprovalAlert(false);
			setApprovalLogRecordId(pendingApprovalLogRecordId);
			setShowApprovalLogModal(true);
			fetchApprovalLogs(pendingApprovalLogRecordId);
			setPendingApprovalLogRecordId(null);
		}
	};

	const fetchApprovalLogs = async (fdpId: number) => {
		try {
			setLoadingLogs(true);
			setLogError(null);

			const response = await fetch(
				`/api/approval-log?recordId=${fdpId}&moduleName=${encodeURIComponent("Feasibility Plan")}`
			);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setLogError(data?.message || "Failed to load approval logs");
				setApprovalLogs([]);
				return;
			}

			setApprovalLogs(data.records || []);
		} catch (err) {
			console.error("Error fetching approval logs:", err);
			setLogError("Error fetching approval logs");
			setApprovalLogs([]);
		} finally {
			setLoadingLogs(false);
		}
	};

	const updateApprovalStatus = async (newStatus: string) => {
		if (!detailRecord) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/feasibility-approval", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fdpId: detailRecord.FDP_ID,
					approvalStatus: newStatus,
					approvalRemarks: approvalRemarks,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to update approval status");
			}

			// Update list
			setRecords((prev) =>
				prev.map((r) =>
					r.FDP_ID === detailRecord.FDP_ID
						? {
								...r,
								ApprovalStatus: newStatus,
								ApprovalRemarks: approvalRemarks,
						  }
						: r
				)
			);

			// Update detail record
			setDetailRecord((prev) =>
				prev
					? {
							...prev,
							ApprovalStatus: newStatus,
							ApprovalRemarks: approvalRemarks,
					  }
					: prev
			);

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

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Feasibility Approval</h1>
						<p className="text-gray-600 mt-2">Manage feasibility study approvals</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-500">
							{records.length > 0 ? `Records: ${records.length}` : ""}
						</span>
						<button
							type="button"
							onClick={exportToCsv}
							disabled={filteredRecords.length === 0}
							className="inline-flex items-center gap-1 rounded-md bg-[#0b4d2b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a3d22] disabled:opacity-60"
						>
							<Download className="h-3.5 w-3.5" />
							<span>Export CSV</span>
						</button>
					</div>
				</div>

				{loading && (
					<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
							<span className="ml-3 text-gray-600 mt-3 block">Loading feasibility data...</span>
						</div>
					</div>
				)}

				{!loading && error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
						{error}
					</div>
				)}

				{!loading && !error && (
					<>
						{/* Summary Cards */}
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
								<p className="text-xs font-medium text-gray-600">Total Feasibilities</p>
								<p className="mt-1 text-2xl font-bold text-gray-900">{totalPlans}</p>
							</div>
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
								<p className="text-xs font-medium text-amber-700">Pending</p>
								<p className="mt-1 text-2xl font-bold text-amber-900">{totalPending}</p>
							</div>
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
								<p className="text-xs font-medium text-emerald-700">Approval</p>
								<p className="mt-1 text-2xl font-bold text-emerald-900">{totalApproved}</p>
							</div>
							<div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
								<p className="text-xs font-medium text-red-700">Rejected</p>
								<p className="mt-1 text-2xl font-bold text-red-900">{totalRejected}</p>
							</div>
						</div>

						<div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							{/* Filters */}
							<div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
								<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
									<input
										type="text"
										placeholder="Family ID"
										value={familyIdFilter}
										onChange={(e) => setFamilyIdFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Member Name"
										value={memberNameFilter}
										onChange={(e) => setMemberNameFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<select
										value={planCategoryFilter}
										onChange={(e) => setPlanCategoryFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Plan Categories</option>
										{uniquePlanCategories.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
									<select
										value={feasibilityTypeFilter}
										onChange={(e) => setFeasibilityTypeFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Feasibility Types</option>
										{uniqueFeasibilityTypes.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
									<select
										value={approvalStatusFilter}
										onChange={(e) => setApprovalStatusFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Status</option>
										{uniqueApprovalStatuses.map((status) => (
											<option key={status} value={status}>
												{status}
											</option>
										))}
									</select>
								</div>
								<div className="mt-3 flex justify-end gap-2 text-xs">
									<button
										type="button"
										onClick={() => {
											setAppliedFamilyIdFilter(familyIdFilter);
											setAppliedMemberNameFilter(memberNameFilter);
											setAppliedPlanCategoryFilter(planCategoryFilter);
											setAppliedFeasibilityTypeFilter(feasibilityTypeFilter);
											setAppliedApprovalStatusFilter(approvalStatusFilter);
										}}
										className="inline-flex items-center rounded-md bg-[#0b4d2b] px-3 py-1.5 font-medium text-white hover:bg-[#0a3d22]"
									>
										Filter
									</button>
									<button
										type="button"
										onClick={handleResetFilters}
										className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
									>
										Reset
									</button>
								</div>
							</div>

							<div className="overflow-x-auto max-h-[600px]">
								{familyGroups.length === 0 ? (
									<div className="p-6 text-center text-gray-500">
										No feasibility records found.
									</div>
								) : (
									<div className="space-y-6">
										{familyGroups.map((familyGroup) => (
											<div key={familyGroup.familyId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
												{/* Family Information Header */}
												<div className="bg-[#0b4d2b] px-6 py-4">
													<div className="flex items-center justify-between">
														<div className="flex-1">
															<h3 className="text-lg font-semibold text-white mb-2">
																Family ID: {familyGroup.familyId}
															</h3>
															<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/90">
																<div>
																	<span className="font-medium">Form Number:</span> {familyGroup.formNumber}
																</div>
																<div>
																	<span className="font-medium">Name:</span> {familyGroup.applicationFullName}
																</div>
																<div>
																	<span className="font-medium">CNIC:</span> {familyGroup.cnicNumber}
																</div>
																<div>
																	<span className="font-medium">Regional:</span> {familyGroup.regionalCommunity}
																</div>
																<div>
																	<span className="font-medium">Local:</span> {familyGroup.localCommunity}
																</div>
																<div>
																	<span className="font-medium">Feasibility Records:</span> {familyGroup.records.length}
																</div>
															</div>
														</div>
														<div className="ml-4">
															<button
																type="button"
																onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval?formNumber=${encodeURIComponent(familyGroup.familyId)}`)}
																className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0b4d2b] rounded-md hover:bg-gray-100 transition-colors font-medium"
															>
																<Eye className="h-4 w-4" />
																View FDP Approval
															</button>
														</div>
													</div>
												</div>

												{/* Member Feasibility Records */}
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	FDP ID
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Member Name
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Plan Category
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Feasibility Type
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Total Investment
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Investment from PE
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Status
																</th>
																<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																	Actions
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-200">
															{familyGroup.records.map((row, idx) => {
																const statusStyle = getStatusStyle(row.ApprovalStatus);
																const StatusIcon = statusStyle.icon;
																return (
																	<tr key={row.FDP_ID || idx} className="hover:bg-gray-50">
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.FDP_ID || "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.MemberName || "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.PlanCategory || "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.FeasibilityType || "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.TotalInvestmentRequired != null
																				? row.TotalInvestmentRequired.toLocaleString()
																				: "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																			{row.InvestmentFromPEProgram != null
																				? row.InvestmentFromPEProgram.toLocaleString()
																				: "N/A"}
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap">
																			<span
																				className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyle.className}`}
																			>
																				<StatusIcon className="h-3 w-3" />
																				{statusStyle.label}
																			</span>
																		</td>
																		<td className="px-3 py-2 whitespace-nowrap">
																			<button
																				type="button"
																				onClick={() => handleViewRow(row)}
																				className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
																			>
																				<Eye className="h-3 w-3" />
																				View
																			</button>
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</>
				)}
			</div>

			{/* Detail Modal */}
			{detailRecord && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDetailRecord(null)}></div>
						<div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
								<h2 className="text-xl font-bold text-gray-900">Feasibility Details</h2>
								<button
									type="button"
									onClick={() => setDetailRecord(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{saveError && (
									<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
										{saveError}
									</div>
								)}

								<div className="space-y-6">
									{/* Basic Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">FDP ID</p>
												<p className="text-gray-900">{detailRecord.FDP_ID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Family ID</p>
												<p className="text-gray-900">{detailRecord.FamilyID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Member ID</p>
												<p className="text-gray-900">{detailRecord.MemberID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Member Name</p>
												<p className="text-gray-900">{detailRecord.MemberName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Plan Category</p>
												<p className="text-gray-900">{detailRecord.PlanCategory || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Feasibility Type</p>
												<p className="text-gray-900">{detailRecord.FeasibilityType || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Current Baseline Income</p>
												<p className="text-gray-900">
													{detailRecord.CurrentBaselineIncome != null
														? detailRecord.CurrentBaselineIncome.toLocaleString()
														: "N/A"}
												</p>
											</div>
										</div>
									</div>

									{/* Application Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Application Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">Form Number</p>
												<p className="text-gray-900">{detailRecord.FormNumber || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Full Name</p>
												<p className="text-gray-900">{detailRecord.ApplicationFullName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">CNIC Number</p>
												<p className="text-gray-900">{detailRecord.CNICNumber || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Regional Community</p>
												<p className="text-gray-900">{detailRecord.RegionalCommunity || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Local Community</p>
												<p className="text-gray-900">{detailRecord.LocalCommunity || "N/A"}</p>
											</div>
										</div>
									</div>

									{/* Member Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Member Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">Member No</p>
												<p className="text-gray-900">{detailRecord.MemberNo || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Full Name</p>
												<p className="text-gray-900">{detailRecord.MemberFullName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">B-Form/CNIC</p>
												<p className="text-gray-900">{detailRecord.MemberBFormOrCNIC || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Gender</p>
												<p className="text-gray-900">{detailRecord.MemberGender || "N/A"}</p>
											</div>
										</div>
									</div>

									{/* Economic Feasibility Details */}
									{detailRecord.FeasibilityType === "Economic" && (
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-3">Economic Feasibility</h3>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="font-medium text-gray-700">Total Sales Revenue</p>
													<p className="text-gray-900">
														{detailRecord.TotalSalesRevenue != null
															? detailRecord.TotalSalesRevenue.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Direct Costs</p>
													<p className="text-gray-900">
														{detailRecord.TotalDirectCosts != null
															? detailRecord.TotalDirectCosts.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Indirect Costs</p>
													<p className="text-gray-900">
														{detailRecord.TotalIndirectCosts != null
															? detailRecord.TotalIndirectCosts.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Net Profit/Loss</p>
													<p className="text-gray-900">
														{detailRecord.NetProfitLoss != null
															? detailRecord.NetProfitLoss.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Investment Required</p>
													<p className="text-gray-900">
														{detailRecord.TotalInvestmentRequired != null
															? detailRecord.TotalInvestmentRequired.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Investment from PE Program</p>
													<p className="text-gray-900">
														{detailRecord.InvestmentFromPEProgram != null
															? detailRecord.InvestmentFromPEProgram.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div className="col-span-2">
													<p className="font-medium text-gray-700">Investment Rationale</p>
													<p className="text-gray-900 whitespace-pre-wrap">
														{detailRecord.InvestmentRationale || "N/A"}
													</p>
												</div>
												<div className="col-span-2">
													<p className="font-medium text-gray-700">Market/Business Analysis</p>
													<p className="text-gray-900 whitespace-pre-wrap">
														{detailRecord.MarketBusinessAnalysis || "N/A"}
													</p>
												</div>
											</div>
										</div>
									)}

									{/* Skills Development Details */}
									{detailRecord.FeasibilityType === "Skills Development" && (
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-3">Skills Development</h3>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="font-medium text-gray-700">Sub Field</p>
													<p className="text-gray-900">{detailRecord.SubField || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Trade</p>
													<p className="text-gray-900">{detailRecord.Trade || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Training Institution</p>
													<p className="text-gray-900">{detailRecord.TrainingInstitution || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Course Title</p>
													<p className="text-gray-900">{detailRecord.CourseTitle || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Duration (Weeks)</p>
													<p className="text-gray-900">{detailRecord.DurationWeeks || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Cost Per Participant</p>
													<p className="text-gray-900">
														{detailRecord.CostPerParticipant != null
															? detailRecord.CostPerParticipant.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Expected Starting Salary</p>
													<p className="text-gray-900">
														{detailRecord.ExpectedStartingSalary != null
															? detailRecord.ExpectedStartingSalary.toLocaleString()
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
													const statusStyle = getStatusStyle(detailRecord.ApprovalStatus);
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
													disabled={
														(detailRecord.ApprovalStatus || "")
															.toString()
															.trim()
															.toLowerCase()
															.includes("approve") ||
														(detailRecord.ApprovalStatus || "").toString().trim().toLowerCase() === "approved"
													}
													className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
													rows={4}
													placeholder="Enter approval remarks..."
												/>
											</div>
											{detailRecord.FeasibilityPdfPath && (
												<div>
													<p className="font-medium text-gray-700 mb-2">Feasibility PDF</p>
													<a
														href={detailRecord.FeasibilityPdfPath}
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

							<div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setDetailRecord(null)}
									className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									Close
								</button>
								{(() => {
									const isApproved =
										(detailRecord.ApprovalStatus || "")
											.toString()
											.trim()
											.toLowerCase()
											.includes("approve") ||
										(detailRecord.ApprovalStatus || "").toString().trim().toLowerCase() === "approved";
									
									if (!isApproved) {
										return (
											<>
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
											</>
										);
									}
									return null;
								})()}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Approval Alert Modal */}
			{showApprovalAlert && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowApprovalAlert(false);
								setPendingApprovalLogRecordId(null);
							}}
						></div>
						<div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-amber-50">
								<h2 className="text-lg font-bold text-amber-900">Approval Status</h2>
								<button
									type="button"
									onClick={() => {
										setShowApprovalAlert(false);
										setPendingApprovalLogRecordId(null);
									}}
									className="text-amber-600 hover:text-amber-800"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="px-6 py-6">
								<div className="flex items-start">
									<AlertCircle className="h-6 w-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
									<div className="flex-1">
										<p className="text-gray-800 font-medium mb-4">
											This feasibility is already approved
										</p>
										<div className="flex justify-end gap-3">
											<button
												type="button"
												onClick={() => {
													setShowApprovalAlert(false);
													setPendingApprovalLogRecordId(null);
												}}
												className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
											>
												Close
											</button>
											<button
												type="button"
												onClick={handleViewApprovalLog}
												className="inline-flex items-center gap-2 rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22]"
											>
												<Eye className="h-4 w-4" />
												View
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Approval Log Modal */}
			{showApprovalLogModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowApprovalLogModal(false);
								setApprovalLogRecordId(null);
								setApprovalLogs([]);
								setLogError(null);
							}}
						></div>
						<div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
								<div>
									<h2 className="text-xl font-bold text-gray-900">Approval Log</h2>
									<p className="text-sm text-gray-600 mt-1">
										Record ID: {approvalLogRecordId} | Module: Feasibility Plan
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowApprovalLogModal(false);
										setApprovalLogRecordId(null);
										setApprovalLogs([]);
										setLogError(null);
									}}
									className="text-gray-400 hover:text-gray-600"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingLogs ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading approval logs...</span>
										</div>
									</div>
								) : logError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{logError}
									</div>
								) : approvalLogs.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<p className="text-gray-600">No approval logs found for this record.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
											<div className="flex items-start">
												<AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
												<div>
													<p className="text-blue-800 font-medium">This feasibility is already approved</p>
													<p className="text-blue-700 text-sm mt-1">
														Below is the approval history for this record.
													</p>
												</div>
											</div>
										</div>

										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Log ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Module Name
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Record ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action Level
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action By
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action At
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action Type
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Remarks
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{approvalLogs.map((log, idx) => (
															<tr key={log.LogID || idx} className="hover:bg-gray-50">
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.LogID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ModuleName || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.RecordID || "N/A"}
																</td>
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
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ActionBy || "N/A"}
																</td>
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
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ActionType || "N/A"}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																	<div className="truncate" title={log.Remarks || ""}>
																		{log.Remarks || "N/A"}
																	</div>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowApprovalLogModal(false);
										setApprovalLogRecordId(null);
										setApprovalLogs([]);
										setLogError(null);
									}}
									className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
