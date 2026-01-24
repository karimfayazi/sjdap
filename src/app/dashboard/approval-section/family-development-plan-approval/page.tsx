"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, RefreshCw, Eye, X, FileText, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { reportStyles } from "@/lib/reportStyles";

// Helper function to normalize user type
const normalizeUserType = (v?: string | null): string => {
	return (v || "").toString().trim().toUpperCase();
};

type FamilyDevelopmentPlan = {
	FormNumber: string | null;
	Full_Name: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	TotalFamilyMembers: number | null;
	Area_Type: string | null;
	IncomeLevel: string | null;
	MaxSocialSupport: number | null;
};

function FamilyDevelopmentPlanApprovalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userProfile, loading: authLoading } = useAuth();
	
	const [applications, setApplications] = useState<FamilyDevelopmentPlan[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		formNumber: "",
		fullName: "",
		cnicNumber: "",
		regionalCommunity: "",
		localCommunity: "",
	});
	const itemsPerPage = 50;
	const [debouncedFilters, setDebouncedFilters] = useState(filters);

	// Debounce filter changes to prevent focus loss
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedFilters(filters);
		}, 500); // 500ms delay

		return () => clearTimeout(timer);
	}, [filters]);

	const fetchApplications = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString(),
			});

			// Add filter parameters (use debounced filters)
			if (debouncedFilters.formNumber) params.append("formNumber", debouncedFilters.formNumber);
			if (debouncedFilters.fullName) params.append("fullName", debouncedFilters.fullName);
			if (debouncedFilters.cnicNumber) params.append("cnicNumber", debouncedFilters.cnicNumber);
			if (debouncedFilters.regionalCommunity) params.append("regionalCommunity", debouncedFilters.regionalCommunity);
			if (debouncedFilters.localCommunity) params.append("localCommunity", debouncedFilters.localCommunity);

			const response = await fetch(`/api/family-development-plan?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setApplications(data.data || []);
				setTotalRecords(data.total || 0);
			} else {
				setError(data.message || "Failed to fetch family development plan data");
			}
		} catch (err: any) {
			console.error("Error fetching family development plan data:", err);
			setError(err.message || "Error fetching family development plan data");
		} finally {
			setLoading(false);
		}
	}, [currentPage, debouncedFilters, itemsPerPage]);

	useEffect(() => {
		fetchApplications();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, debouncedFilters]);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const clearFilters = () => {
		const emptyFilters = {
			formNumber: "",
			fullName: "",
			cnicNumber: "",
			regionalCommunity: "",
			localCommunity: "",
		};
		setFilters(emptyFilters);
		setDebouncedFilters(emptyFilters);
		setSearchTerm("");
		setCurrentPage(1);
	};

	const exportToCSV = () => {
		try {
			if (applications.length === 0) {
				alert("No data to export");
				return;
			}

			const headers = [
				"FormNumber",
				"Full_Name",
				"CNICNumber",
				"RegionalCommunity",
				"LocalCommunity",
				"TotalFamilyMembers",
				"Area_Type",
				"IncomeLevel",
				"MaxSocialSupport",
			];
			const csvRows = [];
			csvRows.push(headers.join(","));

			applications.forEach((app) => {
				const row = headers.map((header) => {
					const value = app[header as keyof FamilyDevelopmentPlan];
					if (value === null || value === undefined) return "";
					const cellStr = String(value);
					if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
						return `"${cellStr.replace(/"/g, '""')}"`;
					}
					return cellStr;
				});
				csvRows.push(row.join(","));
			});

			const csvContent = csvRows.join("\n");
			const BOM = "\uFEFF";
			const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
			
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			
			const date = new Date();
			const dateStr = date.toISOString().split('T')[0];
			link.setAttribute("download", `Family_Development_Plan_${dateStr}.csv`);
			
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			setTimeout(() => URL.revokeObjectURL(url), 100);
		} catch (error) {
			console.error("Export error:", error);
			alert("Failed to export data. Please try again.");
		}
	};

	const filteredApplications = applications.filter((app) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(app.FormNumber && String(app.FormNumber).toLowerCase().includes(search)) ||
			(app.Full_Name && String(app.Full_Name).toLowerCase().includes(search)) ||
			(app.CNICNumber && String(app.CNICNumber).toLowerCase().includes(search)) ||
			(app.RegionalCommunity && String(app.RegionalCommunity).toLowerCase().includes(search)) ||
			(app.LocalCommunity && String(app.LocalCommunity).toLowerCase().includes(search))
		);
	});

	const totalPages = Math.ceil(totalRecords / itemsPerPage);

	// Check if user is EDO and block access
	useEffect(() => {
		if (!authLoading && userProfile) {
			const userType = normalizeUserType(userProfile.access_level);
			if (userType === "EDO") {
				router.push("/dashboard/feasibility-approval");
			}
		}
	}, [authLoading, userProfile, router]);

	// Show loading while checking auth
	if (authLoading) {
		return (
			<div className={reportStyles.loadingContainer}>
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
				<p className="text-gray-600 mt-4">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
							Family Development Plan Approval
						</h1>
					</div>
					<p className="text-gray-600 mt-2 font-medium">Family Development Plan Management System</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchApplications}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg font-semibold"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={exportToCSV}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] text-white rounded-lg hover:from-[#0a3d22] hover:to-[#0b4d2b] transition-all shadow-md hover:shadow-lg font-semibold"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className={reportStyles.errorContainer}>
					<p className={reportStyles.errorText}>{error}</p>
				</div>
			)}

			{/* New Filter Row - 5 controls in one row (matching reference) */}
			<div className={reportStyles.filterBarContainer}>
				<div className={reportStyles.filterBarGrid}>
					{/* 1. Created Date: From */}
					<div>
						<label className={reportStyles.filterLabel}>Created Date: From</label>
						<input
							type="date"
							value=""
							onChange={() => {}}
							className={reportStyles.filterControl}
							disabled
						/>
					</div>

					{/* 2. Created Date: To */}
					<div>
						<label className={reportStyles.filterLabel}>Created Date: To</label>
						<input
							type="date"
							value=""
							onChange={() => {}}
							className={reportStyles.filterControl}
							disabled
						/>
					</div>

					{/* 3. Approval Status */}
					<div>
						<label className={reportStyles.filterLabel}>Approval Status</label>
						<select
							value=""
							onChange={() => {}}
							className={reportStyles.filterControl}
							disabled
						>
							<option value="">All</option>
						</select>
					</div>

					{/* 4. Search */}
					<div>
						<label className={reportStyles.filterLabel}>Search</label>
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Form Number, Full Name, CNIC..."
							className={reportStyles.filterControl}
						/>
					</div>

					{/* 5. Actions */}
					<div className="flex items-end gap-2">
						<button
							onClick={fetchApplications}
							className={reportStyles.applyButton}
						>
							<Filter className="h-4 w-4" />
							<span className="hidden sm:inline">Apply Filters</span>
							<span className="sm:hidden">Apply</span>
						</button>
						<button
							onClick={clearFilters}
							className={reportStyles.resetButton}
						>
							<X className="h-4 w-4" />
							<span className="hidden sm:inline">Reset</span>
						</button>
					</div>
				</div>
			</div>

			{/* Additional Filters */}
			<div className={reportStyles.additionalFiltersContainer}>
				<div className="flex items-center justify-between mb-4">
					<h2 className={reportStyles.additionalFiltersTitle}>Additional Filters</h2>
				</div>

				<div className={reportStyles.additionalFiltersGrid}>
					<div>
						<label className={reportStyles.filterLabel}>Regional Community</label>
						<input
							type="text"
							value={filters.regionalCommunity}
							onChange={(e) => handleFilterChange("regionalCommunity", e.target.value)}
							placeholder="Enter Regional Community"
							className={reportStyles.filterControl}
						/>
					</div>

					<div>
						<label className={reportStyles.filterLabel}>Local Community</label>
						<input
							type="text"
							value={filters.localCommunity}
							onChange={(e) => handleFilterChange("localCommunity", e.target.value)}
							placeholder="Enter Local Community"
							className={reportStyles.filterControl}
						/>
					</div>

					<div>
						<label className={reportStyles.filterLabel}>Form Number</label>
						<input
							type="text"
							value={filters.formNumber}
							onChange={(e) => handleFilterChange("formNumber", e.target.value)}
							placeholder="e.g., PE-00006"
							className={reportStyles.filterControl}
						/>
					</div>

					<div>
						<label className={reportStyles.filterLabel}>Full Name</label>
						<input
							type="text"
							value={filters.fullName}
							onChange={(e) => handleFilterChange("fullName", e.target.value)}
							placeholder="Search by full name..."
							className={reportStyles.filterControl}
						/>
					</div>

					<div>
						<label className={reportStyles.filterLabel}>CNIC Number</label>
						<input
							type="text"
							value={filters.cnicNumber}
							onChange={(e) => handleFilterChange("cnicNumber", e.target.value)}
							placeholder="Search by CNIC..."
							className={reportStyles.filterControl}
						/>
					</div>
				</div>
			</div>

			{/* Data Table */}
			{loading ? (
				<div className={reportStyles.loadingContainer}>
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
					<p className="text-gray-600 mt-4">Loading family development plan data...</p>
				</div>
			) : filteredApplications.length === 0 ? (
				<div className={reportStyles.emptyContainer}>
					<p className="text-gray-600">No records found.</p>
				</div>
			) : (
				<div className={reportStyles.tableContainer}>
					<div className="overflow-x-auto">
						<table className={reportStyles.table}>
							<thead className={reportStyles.tableHeader}>
								<tr>
									<th className={reportStyles.tableHeaderCell}>Form #</th>
									<th className={reportStyles.tableHeaderCell}>Full Name</th>
									<th className={reportStyles.tableHeaderCell}>CNIC</th>
									<th className={reportStyles.tableHeaderCell}>Regional / Local</th>
									<th className={reportStyles.tableHeaderCell}>Members</th>
									<th className={reportStyles.tableHeaderCell}>Area</th>
									<th className={reportStyles.tableHeaderCell}>Income</th>
									<th className={reportStyles.tableHeaderCell}>Max Support</th>
									<th className={reportStyles.tableHeaderCell}>Actions</th>
								</tr>
							</thead>
							<tbody className={reportStyles.tableBody}>
								{filteredApplications.map((app) => (
									<tr key={app.FormNumber} className={reportStyles.tableRow}>
										<td className={reportStyles.tableCellMedium}>{app.FormNumber || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.Full_Name || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.CNICNumber || "N/A"}</td>
										<td className={reportStyles.tableCell}>
											{app.RegionalCommunity || "N/A"} / {app.LocalCommunity || "N/A"}
										</td>
										<td className={reportStyles.tableCell}>{app.TotalFamilyMembers !== null ? app.TotalFamilyMembers : 0}</td>
										<td className={reportStyles.tableCell}>{app.Area_Type || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.IncomeLevel || "N/A"}</td>
										<td className={reportStyles.tableCell}>
											{app.MaxSocialSupport && app.MaxSocialSupport > 0 ? `PKR ${app.MaxSocialSupport.toLocaleString()}` : "N/A"}
										</td>
										<td className={reportStyles.tableCell}>
											<button
												onClick={() => app.FormNumber && router.push(`/dashboard/family-development-plan/view-fdp?formNumber=${encodeURIComponent(app.FormNumber)}`)}
												disabled={!app.FormNumber}
												className="text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
												title="View FDP"
											>
												<Eye className="h-4 w-4" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className={reportStyles.paginationContainer}>
							<div className={reportStyles.paginationText}>
								Showing page {currentPage} of {totalPages} ({totalRecords} total records)
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className={reportStyles.paginationButton}
								>
									Previous
								</button>
								<button
									onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className={reportStyles.paginationButton}
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function FamilyDevelopmentPlanApprovalPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FamilyDevelopmentPlanApprovalContent />
		</Suspense>
	);
}
