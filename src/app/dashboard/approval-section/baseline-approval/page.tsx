"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";
import PermissionStatusLabel from "@/components/PermissionStatusLabel";

type BaselineQOLRecord = {
	FormNumber: string | null;
	Full_Name: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	CurrentCommunityCenter: string | null;
	Area_Type: string | null;
	ApprovalStatus: string | null;
	TotalMembers: number | null;
};

function BaselineApprovalContent() {
	const router = useRouter();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("BaselineApproval");
	const [baselineRecords, setBaselineRecords] = useState<BaselineQOLRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [formNumberFilter, setFormNumberFilter] = useState("");
	const [approvalStatusFilter, setApprovalStatusFilter] = useState("");
	const [appliedFormNumberFilter, setAppliedFormNumberFilter] = useState("");
	const [appliedApprovalStatusFilter, setAppliedApprovalStatusFilter] = useState("");

	const fetchBaselineQOL = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/baseline-qol-approval");
			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(data?.message || "Failed to load baseline QOL data");
				return;
			}

			if (data.success) {
				setBaselineRecords(data.records || []);
			} else {
				setError(data.message || "Failed to load baseline QOL data");
			}
		} catch (err) {
			console.error("Error fetching baseline QOL data:", err);
			setError("Error fetching baseline QOL data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBaselineQOL();
	}, []);

	const filteredBaselineRecords = baselineRecords.filter((record) => {
		const matchesFormNumber =
			!appliedFormNumberFilter ||
			(record.FormNumber || "").toLowerCase().includes(appliedFormNumberFilter.toLowerCase());
		const matchesApprovalStatus =
			!appliedApprovalStatusFilter ||
			(record.ApprovalStatus || "").toLowerCase() === appliedApprovalStatusFilter.toLowerCase();

		return matchesFormNumber && matchesApprovalStatus;
	});

	const uniqueApprovalStatuses = Array.from(
		new Set(baselineRecords.map((r) => r.ApprovalStatus).filter(Boolean))
	) as string[];

	// Stats
	const totalBaselineRecords = baselineRecords.length;
	const totalApproved = baselineRecords.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return s.includes("approve") || s === "approved" || s === "complete";
	}).length;
	const totalPending = baselineRecords.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return !s || s === "pending" || s.includes("pending");
	}).length;
	const totalRejected = baselineRecords.filter((row) => {
		const s = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		return s.includes("reject") || s.includes("rejected");
	}).length;

	const getStatusBadge = (status: string | null) => {
		if (!status) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					Pending
				</span>
			);
		}
		const statusLower = status.toLowerCase();
		if (statusLower === "approved" || statusLower.includes("approve")) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
					Approved
				</span>
			);
		} else if (statusLower === "rejected" || statusLower.includes("reject")) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
					Rejected
				</span>
			);
		} else {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					{status}
				</span>
			);
		}
	};

	// Check access - only users with BaselineApproval = 1/TRUE can access this page
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="BaselineApproval" />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Baseline Approval</h1>
						<PermissionStatusLabel permission="BaselineApproval" />
					</div>
					<p className="text-gray-600 mt-2">Manage baseline quality of life approvals</p>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-sm text-gray-500">
						{baselineRecords.length > 0 ? `Records: ${baselineRecords.length}` : ""}
					</span>
					<button
						onClick={() => fetchBaselineQOL()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Dashboard
					</button>
				</div>
			</div>

			{loading && (
				<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<span className="ml-3 text-gray-600 mt-3 block">Loading baseline QOL data...</span>
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
							<p className="text-xs font-medium text-gray-600">Total Records</p>
							<p className="mt-1 text-2xl font-bold text-gray-900">{totalBaselineRecords}</p>
						</div>
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
							<p className="text-xs font-medium text-amber-700">Pending</p>
							<p className="mt-1 text-2xl font-bold text-amber-900">{totalPending}</p>
						</div>
						<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
							<p className="text-xs font-medium text-emerald-700">Approved</p>
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
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<input
									type="text"
									placeholder="Form Number"
									value={formNumberFilter}
									onChange={(e) => setFormNumberFilter(e.target.value)}
									className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
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
										setAppliedFormNumberFilter(formNumberFilter);
										setAppliedApprovalStatusFilter(approvalStatusFilter);
									}}
									className="inline-flex items-center rounded-md bg-[#0b4d2b] px-3 py-1.5 font-medium text-white hover:bg-[#0a3d22]"
								>
									Filter
								</button>
								<button
									type="button"
									onClick={() => {
										setFormNumberFilter("");
										setApprovalStatusFilter("");
										setAppliedFormNumberFilter("");
										setAppliedApprovalStatusFilter("");
									}}
									className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
								>
									Reset
								</button>
							</div>
						</div>

						<div className="overflow-x-auto max-h-[600px]">
							{filteredBaselineRecords.length === 0 ? (
								<div className="p-6 text-center text-gray-500">
									No baseline QOL records found.
								</div>
							) : (
								<div className="space-y-6">
									{filteredBaselineRecords.map((record) => (
										<div key={record.FormNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											{/* Family Information Header */}
											<div className="bg-[#0b4d2b] px-6 py-4">
												<div className="flex items-center justify-between">
													<div className="flex-1">
														<h3 className="text-lg font-semibold text-white mb-2">
															Form Number: {record.FormNumber || "N/A"}
														</h3>
														<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/90">
															<div>
																<span className="font-medium">Full Name:</span> {record.Full_Name || "N/A"}
															</div>
															<div>
																<span className="font-medium">CNIC:</span> {record.CNICNumber || "N/A"}
															</div>
															<div>
																<span className="font-medium">Regional Community:</span> {record.RegionalCommunity || "N/A"}
															</div>
															<div>
																<span className="font-medium">Local Community:</span> {record.LocalCommunity || "N/A"}
															</div>
															<div>
																<span className="font-medium">Current Community Center:</span> {record.CurrentCommunityCenter || "N/A"}
															</div>
															<div>
																<span className="font-medium">Total Members:</span> {record.TotalMembers || 0}
															</div>
															<div>
																<span className="font-medium">Area Type:</span> {record.Area_Type || "N/A"}
															</div>
															<div>
																<span className="font-medium">Approval Status:</span> {getStatusBadge(record.ApprovalStatus)}
															</div>
														</div>
													</div>
													<div className="ml-4">
														<button
															type="button"
															onClick={() => router.push(`/dashboard/baseline-qol/view?formNumber=${encodeURIComponent(record.FormNumber || "")}`)}
															className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0b4d2b] rounded-md hover:bg-gray-100 transition-colors font-medium"
														>
															<Eye className="h-4 w-4" />
															View
														</button>
													</div>
												</div>
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
	);
}

export default function BaselineApprovalPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<BaselineApprovalContent />
		</Suspense>
	);
}
