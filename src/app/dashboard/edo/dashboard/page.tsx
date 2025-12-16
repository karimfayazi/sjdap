"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";
type FeasibilityData = {
	FAMILY_ID: string | null;
	HEAD_NAME: string | null;
	PROGRAM: string | null;
	REGIONAL_COUNCIL: string | null;
	AREA: string | null;
	MENTOR: string | null;
	FDP_APPROVED_DATE: string | null;
	CRC_APPROVAL_FAMILY_INCOME: string | null;
	MEMBER_ID: string | null;
	CURRENT_SITUATION: string | null;
	RATIONALE: string | null;
	PROPOSED_INTERVENTION: string | null;
	PLAN_TYPE: string | null;
	CONTRIBUTION_SUPPORT_FAMILY: number | null;
	CONTRIBUTION_SUPPORT_PROGRAM: number | null;
	TOTAL_PROPOSED_AMOUNT: number | null;
	TOTAL_SALES_REVENUES: number | null;
	TOTAL_DIRECT_COST: number | null;
	TOTAL_INDIRECT_COSTS: number | null;
	TOTAL_COST_DIRECT_INDIRECT_COST: number | null;
	NET_PROFIT_LOSS: number | null;
	PROFIT_LOSS: string | null;
	EXPECTED_INCOME_AFTER_3_MONTHS: number | null;
	EXPECTED_INCOME_AFTER_6_MONTHS: number | null;
	EXPECTED_INCOME_AFTER_1_YEAR: number | null;
	EXPECTED_INCOME_AFTER_2_YEAR: number | null;
	EXPECTED_INCOME_AFTER_3_YEAR: number | null;
	EXPECTED_INCOME_AFTER_4_YEAR: number | null;
	EXPECTED_OUTCOME: string | null;
	REMARKS: string | null;
	UPDATE_DATE: string | null;
	TOTAL_MEMBERS: number | null;
	FAMILY_INTAKE_MONTH_YEAR: string | null;
	STATUS: string | null;
};

const getStatusStyle = (rawStatus: string | null | undefined) => {
	const status = (rawStatus || "").toString().trim().toLowerCase();

	if (!status) {
		return {
			label: "N/A",
			icon: AlertCircle,
			className: "bg-gray-100 text-gray-700 border border-gray-200",
		};
	}

	if (status.includes("approve") || status === "completed" || status === "complete") {
		return {
			label: rawStatus,
			icon: CheckCircle2,
			className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
		};
	}

	if (
		status.includes("reject") ||
		status.includes("drop") ||
		status.includes("closed") ||
		status.includes("cancel")
	) {
		return {
			label: rawStatus,
			icon: XCircle,
			className: "bg-red-50 text-red-700 border border-red-200",
		};
	}

	if (status.includes("pending") || status.includes("review") || status.includes("process")) {
		return {
			label: rawStatus,
			icon: Clock,
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}

	// Default info style
	return {
		label: rawStatus,
		icon: AlertCircle,
		className: "bg-blue-50 text-blue-700 border border-blue-200",
	};
};

export default function EdoDashboardPage() {
	const [records, setRecords] = useState<FeasibilityData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Current filter inputs (controlled by UI)
	const [familyIdFilter, setFamilyIdFilter] = useState("");
	const [headNameFilter, setHeadNameFilter] = useState("");
	const [programFilter, setProgramFilter] = useState("");
	const [regionalCouncilFilter, setRegionalCouncilFilter] = useState("");
	const [mentorFilter, setMentorFilter] = useState("");
	const [planTypeFilter, setPlanTypeFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	// Applied filters (used to actually filter the grid when clicking Filter)
	const [appliedFamilyIdFilter, setAppliedFamilyIdFilter] = useState("");
	const [appliedHeadNameFilter, setAppliedHeadNameFilter] = useState("");
	const [appliedProgramFilter, setAppliedProgramFilter] = useState("");
	const [appliedRegionalCouncilFilter, setAppliedRegionalCouncilFilter] = useState("");
	const [appliedMentorFilter, setAppliedMentorFilter] = useState("");
	const [appliedPlanTypeFilter, setAppliedPlanTypeFilter] = useState("");
	const [appliedStatusFilter, setAppliedStatusFilter] = useState("");
	const [detailRecord, setDetailRecord] = useState<FeasibilityData | null>(null);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFeasibility = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch("/api/family-feasibility");
				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					setError(data?.message || "Failed to load EDO dashboard data");
					return;
				}

				if (data.success) {
					setRecords(data.records || []);
				} else {
					setError(data.message || "Failed to load EDO dashboard data");
				}
			} catch (err) {
				console.error("Error fetching EDO dashboard data:", err);
				setError("Error fetching EDO dashboard data");
			} finally {
				setLoading(false);
			}
		};

		fetchFeasibility();
	}, []);

	const uniquePrograms = Array.from(
		new Set(records.map((r) => r.PROGRAM).filter(Boolean))
	) as string[];
	const uniqueRegionalCouncils = Array.from(
		new Set(records.map((r) => r.REGIONAL_COUNCIL).filter(Boolean))
	) as string[];
	const uniqueMentors = Array.from(
		new Set(records.map((r) => r.MENTOR).filter(Boolean))
	) as string[];
	const uniquePlanTypes = Array.from(
		new Set(records.map((r) => r.PLAN_TYPE).filter(Boolean))
	) as string[];
	const uniqueStatuses = Array.from(
		new Set(records.map((r) => r.STATUS).filter(Boolean))
	) as string[];

	const filteredRecords = records.filter((row) => {
		const matchesFamilyId =
			!appliedFamilyIdFilter ||
			(row.FAMILY_ID || "").toLowerCase().includes(appliedFamilyIdFilter.toLowerCase());
		const matchesHeadName =
			!appliedHeadNameFilter ||
			(row.HEAD_NAME || "").toLowerCase().includes(appliedHeadNameFilter.toLowerCase());
		const matchesProgram =
			!appliedProgramFilter ||
			(row.PROGRAM || "").toLowerCase() === appliedProgramFilter.toLowerCase();
		const matchesRC =
			!appliedRegionalCouncilFilter ||
			(row.REGIONAL_COUNCIL || "").toLowerCase() ===
				appliedRegionalCouncilFilter.toLowerCase();
		const matchesMentor =
			!appliedMentorFilter ||
			(row.MENTOR || "").toLowerCase() === appliedMentorFilter.toLowerCase();
		const matchesPlanType =
			!appliedPlanTypeFilter ||
			(row.PLAN_TYPE || "").toLowerCase() === appliedPlanTypeFilter.toLowerCase();
		const matchesStatus =
			!appliedStatusFilter ||
			(row.STATUS || "").toLowerCase() === appliedStatusFilter.toLowerCase();

		return (
			matchesFamilyId &&
			matchesHeadName &&
			matchesProgram &&
			matchesRC &&
			matchesMentor &&
			matchesPlanType &&
			matchesStatus
		);
	});

	// Simple stats for cards
	const totalPlans = records.length;
	const totalApproved = records.filter((row) => {
		const s = (row.STATUS || "").toString().trim().toLowerCase();
		return s.includes("approve") || s === "completed" || s === "complete";
	}).length;
	const totalPending = records.filter((row) => {
		const s = (row.STATUS || "").toString().trim().toLowerCase();
		return !s || s === "pending" || s.includes("pending");
	}).length;

	const exportToCsv = () => {
		try {
			const headers = [
				"FAMILY_ID",
				"PROGRAM",
				"AREA",
				"REGIONAL_COUNCIL",
				"HEAD_NAME",
				"MENTOR",
				"STATUS",
				"FAMILY_INTAKE_MONTH_YEAR",
				"TOTAL_PROPOSED_AMOUNT",
				"TOTAL_SALES_REVENUES",
				"TOTAL_DIRECT_COST",
				"TOTAL_INDIRECT_COSTS",
				"TOTAL_COST_DIRECT_INDIRECT_COST"
			];

			const csvRows: string[] = [];
			csvRows.push(headers.join(","));

			filteredRecords.forEach((row) => {
				const dataRow = [
					row.FAMILY_ID || "N/A",
					row.PROGRAM || "N/A",
					row.AREA || "N/A",
					row.REGIONAL_COUNCIL || "N/A",
					row.HEAD_NAME || "N/A",
					row.MENTOR || "N/A",
					row.STATUS || "N/A",
					row.FAMILY_INTAKE_MONTH_YEAR || "N/A",
					row.TOTAL_PROPOSED_AMOUNT != null
						? row.TOTAL_PROPOSED_AMOUNT.toString()
						: "N/A",
					row.TOTAL_SALES_REVENUES != null
						? row.TOTAL_SALES_REVENUES.toString()
						: "N/A",
					row.TOTAL_DIRECT_COST != null
						? row.TOTAL_DIRECT_COST.toString()
						: "N/A",
					row.TOTAL_INDIRECT_COSTS != null
						? row.TOTAL_INDIRECT_COSTS.toString()
						: "N/A",
					row.TOTAL_COST_DIRECT_INDIRECT_COST != null
						? row.TOTAL_COST_DIRECT_INDIRECT_COST.toString()
						: "N/A"
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
				type: "text/csv;charset=utf-8;"
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "edo_feasibility_export.csv";
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
		setHeadNameFilter("");
		setProgramFilter("");
		setRegionalCouncilFilter("");
		setMentorFilter("");
		setPlanTypeFilter("");
		setStatusFilter("");

		setAppliedFamilyIdFilter("");
		setAppliedHeadNameFilter("");
		setAppliedProgramFilter("");
		setAppliedRegionalCouncilFilter("");
		setAppliedMentorFilter("");
		setAppliedPlanTypeFilter("");
		setAppliedStatusFilter("");
	};

	const handleViewRow = (row: FeasibilityData) => {
		setDetailRecord(row);
		setApprovalRemarks(row.REMARKS || "");
		setSaveError(null);
	};

	const updateStatus = async (newStatus: string | null) => {
		if (!detailRecord) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/family-feasibility/status", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					familyId: detailRecord.FAMILY_ID,
					memberId: detailRecord.MEMBER_ID,
					status: newStatus ?? detailRecord.STATUS,
					remarks: approvalRemarks,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to update status");
			}

			const finalStatus = newStatus ?? detailRecord.STATUS;

			// Update list
			setRecords((prev) =>
				prev.map((r) =>
					r.FAMILY_ID === detailRecord.FAMILY_ID && r.MEMBER_ID === detailRecord.MEMBER_ID
						? {
								...r,
								STATUS: finalStatus,
								REMARKS: approvalRemarks,
						  }
						: r
				)
			);

			// Update detail record
			setDetailRecord((prev) =>
				prev
					? {
							...prev,
							STATUS: finalStatus,
							REMARKS: approvalRemarks,
					  }
					: prev
			);
		} catch (err) {
			console.error("Error updating status:", err);
			const message =
				err instanceof Error ? err.message : "Error updating status. Please try again.";
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
					<h1 className="text-3xl font-bold text-gray-900">EDO Dashboard</h1>
					<p className="text-gray-600 mt-2">
						Family Feasibility overview for EDO designation
					</p>
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
						<span className="ml-3 text-gray-600 mt-3 block">Loading EDO data...</span>
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
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<p className="text-xs font-medium text-gray-600">Total Feasibility Plans</p>
							<p className="mt-1 text-2xl font-bold text-gray-900">{totalPlans}</p>
						</div>
						<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
							<p className="text-xs font-medium text-emerald-700">Total Approved</p>
							<p className="mt-1 text-2xl font-bold text-emerald-900">{totalApproved}</p>
						</div>
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
							<p className="text-xs font-medium text-amber-700">Total Pending</p>
							<p className="mt-1 text-2xl font-bold text-amber-900">{totalPending}</p>
						</div>
					</div>

					<div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						{/* Filters */}
						<div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
						<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
							<input
								type="text"
								placeholder="Family ID"
								value={familyIdFilter}
								onChange={(e) => setFamilyIdFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
							<input
								type="text"
								placeholder="Head Name"
								value={headNameFilter}
								onChange={(e) => setHeadNameFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
							<select
								value={programFilter}
								onChange={(e) => setProgramFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Programs</option>
								{uniquePrograms.map((prog) => (
									<option key={prog} value={prog}>
										{prog}
									</option>
								))}
							</select>
							<select
								value={regionalCouncilFilter}
								onChange={(e) => setRegionalCouncilFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Regional Councils</option>
								{uniqueRegionalCouncils.map((rc) => (
									<option key={rc} value={rc}>
										{rc}
									</option>
								))}
							</select>
							<select
								value={mentorFilter}
								onChange={(e) => setMentorFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Mentors</option>
								{uniqueMentors.map((mentor) => (
									<option key={mentor} value={mentor}>
										{mentor}
									</option>
								))}
							</select>
							<select
								value={planTypeFilter}
								onChange={(e) => setPlanTypeFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Plan Types</option>
								{uniquePlanTypes.map((plan) => (
									<option key={plan} value={plan}>
										{plan}
									</option>
								))}
							</select>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Status</option>
								{uniqueStatuses.map((status) => (
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
										setAppliedHeadNameFilter(headNameFilter);
										setAppliedProgramFilter(programFilter);
										setAppliedRegionalCouncilFilter(regionalCouncilFilter);
										setAppliedMentorFilter(mentorFilter);
										setAppliedPlanTypeFilter(planTypeFilter);
										setAppliedStatusFilter(statusFilter);
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

						<div className="overflow-x-auto max-h-[500px]">
							<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Family ID
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Head Name
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Program
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Area
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Regional Council
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Mentor
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Plan Type
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Total Proposed Amount
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Intake (Month-Year)
									</th>
									<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredRecords.length === 0 ? (
									<tr>
										<td colSpan={10} className="px-3 py-6 text-center text-gray-500">
											No feasibility records found.
										</td>
									</tr>
								) : (
									filteredRecords.map((row, idx) => (
										<tr key={row.FAMILY_ID || idx} className="hover:bg-gray-50">
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.FAMILY_ID || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.HEAD_NAME || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.PROGRAM || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.AREA || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.REGIONAL_COUNCIL || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.MENTOR || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.PLAN_TYPE || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.TOTAL_PROPOSED_AMOUNT != null
													? row.TOTAL_PROPOSED_AMOUNT.toLocaleString()
													: "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{(() => {
													const { label, icon: Icon, className } = getStatusStyle(row.STATUS);
													return (
														<span
															className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
														>
															<Icon className="h-3.5 w-3.5" />
															<span>{label || "N/A"}</span>
														</span>
													);
												})()}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												{row.FAMILY_INTAKE_MONTH_YEAR || "N/A"}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-gray-900">
												<button
													type="button"
													onClick={() => handleViewRow(row)}
													className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
												>
													View
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>

		{/* Detail Modal */}
		{detailRecord && (
			<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
				<div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200">
					<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
						<div>
							<h2 className="text-lg font-semibold text-gray-900">
								Family Feasibility Details
							</h2>
							<p className="text-xs text-gray-500">
								FAMILY ID: {detailRecord.FAMILY_ID || "N/A"} | HEAD NAME:{" "}
								{detailRecord.HEAD_NAME || "N/A"}
							</p>
						</div>
						<button
							type="button"
							onClick={() => setDetailRecord(null)}
							className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
						>
							Close
						</button>
					</div>

					<div className="max-h-[75vh] overflow-y-auto px-4 py-4 text-xs">
						{saveError && (
							<div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
								{saveError}
							</div>
						)}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<p className="font-semibold text-gray-700">FAMILY ID</p>
								<p className="text-gray-900">{detailRecord.FAMILY_ID || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">PROGRAM</p>
								<p className="text-gray-900">{detailRecord.PROGRAM || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">REGIONAL COUNCIL</p>
								<p className="text-gray-900">{detailRecord.REGIONAL_COUNCIL || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">AREA</p>
								<p className="text-gray-900">{detailRecord.AREA || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">HEAD NAME</p>
								<p className="text-gray-900">{detailRecord.HEAD_NAME || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">MENTOR</p>
								<p className="text-gray-900">{detailRecord.MENTOR || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">FDP APPROVED DATE</p>
								<p className="text-gray-900">
									{detailRecord.FDP_APPROVED_DATE || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									CRC APPROVAL FAMILY INCOME
								</p>
								<p className="text-gray-900">
									{detailRecord.CRC_APPROVAL_FAMILY_INCOME || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">MEMBER ID</p>
								<p className="text-gray-900">{detailRecord.MEMBER_ID || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">TOTAL MEMBERS</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_MEMBERS != null
										? detailRecord.TOTAL_MEMBERS
										: "N/A"}
								</p>
							</div>
							<div className="md:col-span-2 border-t border-gray-200 pt-3 mt-2">
								<p className="font-semibold text-gray-700">CURRENT SITUATION</p>
								<p className="text-gray-900 whitespace-pre-wrap">
									{detailRecord.CURRENT_SITUATION || "N/A"}
								</p>
							</div>
							<div className="md:col-span-2">
								<p className="font-semibold text-gray-700">RATIONALE</p>
								<p className="text-gray-900 whitespace-pre-wrap">
									{detailRecord.RATIONALE || "N/A"}
								</p>
							</div>
							<div className="md:col-span-2">
								<p className="font-semibold text-gray-700">PROPOSED INTERVENTION</p>
								<p className="text-gray-900 whitespace-pre-wrap">
									{detailRecord.PROPOSED_INTERVENTION || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">PLAN TYPE</p>
								<p className="text-gray-900">{detailRecord.PLAN_TYPE || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									CONTRIBUTION SUPPORT FAMILY
								</p>
								<p className="text-gray-900">
									{detailRecord.CONTRIBUTION_SUPPORT_FAMILY != null
										? detailRecord.CONTRIBUTION_SUPPORT_FAMILY.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									CONTRIBUTION SUPPORT PROGRAM
								</p>
								<p className="text-gray-900">
									{detailRecord.CONTRIBUTION_SUPPORT_PROGRAM != null
										? detailRecord.CONTRIBUTION_SUPPORT_PROGRAM.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">TOTAL PROPOSED AMOUNT</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_PROPOSED_AMOUNT != null
										? detailRecord.TOTAL_PROPOSED_AMOUNT.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">TOTAL SALES REVENUES</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_SALES_REVENUES != null
										? detailRecord.TOTAL_SALES_REVENUES.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">TOTAL DIRECT COST</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_DIRECT_COST != null
										? detailRecord.TOTAL_DIRECT_COST.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">TOTAL INDIRECT COSTS</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_INDIRECT_COSTS != null
										? detailRecord.TOTAL_INDIRECT_COSTS.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									TOTAL COST DIRECT + INDIRECT
								</p>
								<p className="text-gray-900">
									{detailRecord.TOTAL_COST_DIRECT_INDIRECT_COST != null
										? detailRecord.TOTAL_COST_DIRECT_INDIRECT_COST.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">PROFIT / LOSS</p>
								<p className="text-gray-900">{detailRecord.PROFIT_LOSS || "N/A"}</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">NET PROFIT / LOSS</p>
								<p className="text-gray-900">
									{detailRecord.NET_PROFIT_LOSS != null
										? detailRecord.NET_PROFIT_LOSS.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div className="md:col-span-2 border-t border-gray-200 pt-3 mt-2">
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 3 MONTHS
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_3_MONTHS != null
										? detailRecord.EXPECTED_INCOME_AFTER_3_MONTHS.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 6 MONTHS
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_6_MONTHS != null
										? detailRecord.EXPECTED_INCOME_AFTER_6_MONTHS.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 1 YEAR
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_1_YEAR != null
										? detailRecord.EXPECTED_INCOME_AFTER_1_YEAR.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 2 YEARS
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_2_YEAR != null
										? detailRecord.EXPECTED_INCOME_AFTER_2_YEAR.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 3 YEARS
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_3_YEAR != null
										? detailRecord.EXPECTED_INCOME_AFTER_3_YEAR.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									EXPECTED INCOME AFTER 4 YEARS
								</p>
								<p className="text-gray-900">
									{detailRecord.EXPECTED_INCOME_AFTER_4_YEAR != null
										? detailRecord.EXPECTED_INCOME_AFTER_4_YEAR.toLocaleString()
										: "N/A"}
								</p>
							</div>
							<div className="md:col-span-2">
								<p className="font-semibold text-gray-700">EXPECTED OUTCOME</p>
								<p className="text-gray-900 whitespace-pre-wrap">
									{detailRecord.EXPECTED_OUTCOME || "N/A"}
								</p>
							</div>
							<div className="md:col-span-2">
								<p className="font-semibold text-gray-700">REMARKS</p>
								<textarea
									className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-[#0b4d2b] focus:ring-1 focus:ring-[#0b4d2b] focus:ring-opacity-40"
									rows={3}
									value={approvalRemarks}
									onChange={(e) => setApprovalRemarks(e.target.value)}
									placeholder="Enter approval remarks"
								/>
							</div>
							<div>
								<p className="font-semibold text-gray-700">UPDATE DATE</p>
								<p className="text-gray-900">
									{detailRecord.UPDATE_DATE || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">STATUS</p>
								<p className="text-gray-900">
									{detailRecord.STATUS || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-semibold text-gray-700">
									FAMILY INTAKE (MONTH-YEAR)
								</p>
								<p className="text-gray-900">
									{detailRecord.FAMILY_INTAKE_MONTH_YEAR || "N/A"}
								</p>
							</div>

							<div className="md:col-span-2 mt-4 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => updateStatus(null)}
									disabled={savingStatus}
									className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
								>
									Not-Approve
								</button>
								<button
									type="button"
									onClick={() => updateStatus("Approve")}
									disabled={savingStatus}
									className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
								>
									Approve
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		)}
		</>
	);
}


