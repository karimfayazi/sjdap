"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Plus, X, Eye, Edit2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser, hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";
import FilterBar from "@/components/common/FilterBar";
import FilterField from "@/components/common/FilterField";
import DataCardTable from "@/components/common/DataCardTable";
import { reportStyles } from "@/lib/ui/reportStyles";

type BaselineApplication = {
	FormNo: string | null;
	PersonRole: string | null;
	CNICNo: string | null;
	PrimaryContactNo: string | null;
	LocalCouncil: string | null;
	PrimaryLocationSettlement: string | null;
	AreaOfOrigin: string | null;
	FullName: string | null;
	RegionalCouncil: string | null;
	HouseStatusName: string | null;
	TotalFamilyMembers: string | number | null;
	Remarks: string | null;
	SubmittedBy: string | null;
	ApprovalStatus: string | null;
};


export default function BaselineQOLPage() {
	const router = useRouter();
	const { userProfile, refreshUser } = useAuth();
	
	// Debug: Log userProfile when it changes
	useEffect(() => {
		if (userProfile) {
			console.log('[BaselineQOLPage] UserProfile loaded:', {
				email: userProfile.email,
				username: userProfile.username,
				BaselineQOL: userProfile.BaselineQOL,
				BaselineQOLType: typeof userProfile.BaselineQOL,
				allPermissionKeys: Object.keys(userProfile).filter(k => 
					k.includes('Baseline') || k.includes('baseline')
				)
			});
		}
	}, [userProfile]);
	const [applications, setApplications] = useState<BaselineApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [filters, setFilters] = useState({
		formNo: "",
		cnicNo: "",
		primaryContactNo: "",
		localCouncil: "",
		fullName: "",
		regionalCouncil: "",
	});
	const [isSuperUserState, setIsSuperUserState] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const itemsPerPage = 50;
	const isInitialMount = useRef(true);


	// Check if user is Super User using utility function
	useEffect(() => {
		setIsMounted(true);
		if (userProfile) {
			const superUserValue = userProfile.supper_user;
			setIsSuperUserState(isSuperUser(superUserValue));
		} else {
			// Fallback to localStorage
			try {
				const stored = localStorage.getItem("userData");
				if (stored) {
					const parsed = JSON.parse(stored);
					const su = parsed.super_user || parsed.supper_user;
					setIsSuperUserState(isSuperUser(su));
				}
			} catch {
				// ignore localStorage errors
			}
		}
	}, [userProfile]);

	// Check route access based on UserType
	useEffect(() => {
		if (!userProfile) return;
		
		const userType = userProfile.access_level; // UserType is stored in access_level
		const hasFullAccessToAll = hasFullAccess(
			userProfile.username,
			userProfile.supper_user,
			userType
		);
		
		// Super Admin has access to all pages
		if (hasFullAccessToAll) {
			return;
		}
		
		// Check route-specific access
		const currentRoute = '/dashboard/baseline-qol';
		if (!hasRouteAccess(userType, currentRoute)) {
			router.push('/dashboard');
		}
	}, [userProfile, router]);


	const fetchApplications = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();

			// Use pagination
			params.append("page", currentPage.toString());
			params.append("limit", itemsPerPage.toString());

			// Add filter parameters
			if (filters.formNo) params.append("formNo", filters.formNo);
			if (filters.cnicNo) params.append("cnicNo", filters.cnicNo);
			if (filters.primaryContactNo) params.append("primaryContactNo", filters.primaryContactNo);
			if (filters.localCouncil) params.append("localCouncil", filters.localCouncil);
			if (filters.fullName) params.append("fullName", filters.fullName);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);

			const response = await fetch(`/api/baseline-applications?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setApplications(data.data || []);
				setTotalRecords(data.total || 0);
			} else {
				setError(data.message || "Failed to fetch baseline applications");
			}
		} catch (err: any) {
			console.error("Error fetching baseline applications:", err);
			setError(err.message || "Error fetching baseline applications");
		} finally {
			setLoading(false);
		}
	};

	// Initial load and page changes (no debounce)
	useEffect(() => {
		fetchApplications();
	}, [currentPage]);

	// Debounce filter changes to avoid refreshing on every keystroke
	useEffect(() => {
		// Skip debounce on initial mount (initial load is handled by currentPage effect)
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}

		const timeoutId = setTimeout(() => {
			fetchApplications();
		}, 500); // Wait 500ms after user stops typing

		return () => clearTimeout(timeoutId);
	}, [filters]);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const clearFilters = () => {
		setFilters({
			formNo: "",
			cnicNo: "",
			primaryContactNo: "",
			localCouncil: "",
			fullName: "",
			regionalCouncil: "",
		});
		setCurrentPage(1);
	};

	const exportToCSV = async () => {
		try {
			// Fetch all applications for export
			setLoading(true);
			const params = new URLSearchParams({
				page: "1",
				limit: "999999", // Very large number to get all records
			});

			// Add filter parameters if any are set
			if (filters.formNo) params.append("formNo", filters.formNo);
			if (filters.cnicNo) params.append("cnicNo", filters.cnicNo);
			if (filters.primaryContactNo) params.append("primaryContactNo", filters.primaryContactNo);
			if (filters.localCouncil) params.append("localCouncil", filters.localCouncil);
			if (filters.fullName) params.append("fullName", filters.fullName);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);

			const response = await fetch(`/api/baseline-applications?${params.toString()}`);
			const data = await response.json();

			if (!data.success || !data.data || data.data.length === 0) {
				alert("No data to export");
				setLoading(false);
				return;
			}

			const allApplications = data.data;

			const headers = [
				"FormNo",
				"FullName",
				"CNICNo",
				"RegionalCouncil",
				"LocalCouncil",
				"PrimaryContactNo",
				"TotalFamilyMembers",
				"SubmittedBy",
				"ApprovalStatus",
			];
			const csvRows = [];
			csvRows.push(headers.join(","));

			allApplications.forEach((app: BaselineApplication) => {
				const row = headers.map((header) => {
					const value = app[header as keyof BaselineApplication];
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
			link.setAttribute("download", `Baseline_Applications_${dateStr}.csv`);
			
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			setTimeout(() => URL.revokeObjectURL(url), 100);
			
			// Refresh the current view after export
			await fetchApplications();
		} catch (error) {
			console.error("Export error:", error);
			alert("Failed to export data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// No client-side filtering needed - all filtering is done server-side
	const filteredApplications = applications;


	const totalPages = Math.ceil(totalRecords / itemsPerPage);

	// Access control removed - all users can access this page

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">Baseline</h1>
						</div>
						<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading baseline applications...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">Baseline</h1>
						</div>
						<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={fetchApplications}
						className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}


	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Baseline</h1>
					<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={exportToCSV}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
					<button
						onClick={() => fetchApplications()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard/baseline-qol/add")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add New
					</button>
				</div>
			</div>

			{/* Filters */}
			<FilterBar columns={4}>
				<FilterField label="Form No">
					<input
						type="text"
						placeholder="Enter Form No"
						value={filters.formNo}
						onChange={(e) => handleFilterChange("formNo", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<FilterField label="CNIC No">
					<input
						type="text"
						placeholder="Enter CNIC No"
						value={filters.cnicNo}
						onChange={(e) => handleFilterChange("cnicNo", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<FilterField label="Full Name">
					<input
						type="text"
						placeholder="Enter Full Name"
						value={filters.fullName}
						onChange={(e) => handleFilterChange("fullName", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<FilterField label="Primary Contact">
					<input
						type="text"
						placeholder="Enter Contact No"
						value={filters.primaryContactNo}
						onChange={(e) => handleFilterChange("primaryContactNo", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<FilterField label="Regional Council">
					<input
						type="text"
						placeholder="Enter Regional Council"
						value={filters.regionalCouncil}
						onChange={(e) => handleFilterChange("regionalCouncil", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<FilterField label="Local Council">
					<input
						type="text"
						placeholder="Enter Local Council"
						value={filters.localCouncil}
						onChange={(e) => handleFilterChange("localCouncil", e.target.value)}
						className={reportStyles.filterControl}
					/>
				</FilterField>
				<div className="flex items-end gap-2">
					<button
						onClick={clearFilters}
						className={reportStyles.filterButtonSecondary}
					>
						<X className="h-4 w-4" />
						<span className="hidden sm:inline">Reset</span>
					</button>
				</div>
			</FilterBar>

			{/* Table */}
			<DataCardTable>
				<table className={reportStyles.table}>
					<thead className={reportStyles.tableHeader}>
						<tr>
							<th className={reportStyles.tableHeaderCell}>Form No</th>
							<th className={reportStyles.tableHeaderCell}>Full Name [Head Name]</th>
							<th className={reportStyles.tableHeaderCell}>CNIC No</th>
							<th className={reportStyles.tableHeaderCell}>Regional Council</th>
							<th className={reportStyles.tableHeaderCell}>Local Council</th>
							<th className={reportStyles.tableHeaderCell}>Primary Contact</th>
							<th className={reportStyles.tableHeaderCell}>Total Members</th>
							<th className={reportStyles.tableHeaderCell}>Mentor</th>
							<th className={reportStyles.tableHeaderCell}>Approval Status</th>
							<th className={reportStyles.tableHeaderCell}>Actions</th>
						</tr>
					</thead>
					<tbody className={reportStyles.tableBody}>
							{filteredApplications.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-6 py-8 text-center text-gray-500">
										<div className="flex flex-col items-center justify-center">
											<Search className="h-12 w-12 text-gray-300 mb-2" />
											<p className="text-lg font-medium">No applications found</p>
											<p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms</p>
										</div>
									</td>
								</tr>
							) : (
								filteredApplications.map((app) => (
									<tr key={app.FormNo} className={reportStyles.tableRow}>
										<td className={reportStyles.tableCellNoWrap}>{app.FormNo || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.FullName || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.CNICNo || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.RegionalCouncil || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.LocalCouncil || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.PrimaryContactNo || "N/A"}</td>
										<td className={reportStyles.tableCell}>{app.TotalFamilyMembers || 0}</td>
										<td className={reportStyles.tableCell}>{app.SubmittedBy || "N/A"}</td>
										<td className={reportStyles.tableCell}>
											{(() => {
												const status = app.ApprovalStatus?.toLowerCase() || '';
												const isApproved = status.includes('approve') || status === 'approved' || status === 'complete';
												const isRejected = status.includes('reject') || status === 'rejected';
												const isPending = !isApproved && !isRejected && (status === '' || status === 'pending' || !status);
												
												if (isApproved) {
													return (
														<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
															Approved
														</span>
													);
												} else if (isRejected) {
													return (
														<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
															Rejected
														</span>
													);
												} else {
													return (
														<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
															Pending
														</span>
													);
												}
											})()}
										</td>
										<td className={reportStyles.tableCell}>
											<div className="flex items-center gap-2">
												<button
													onClick={() => router.push(`/dashboard/baseline-qol/view?formNo=${encodeURIComponent(app.FormNo || "")}`)}
													className="p-2 text-[#0b4d2b] hover:bg-[#0b4d2b] hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
													title="View Details"
												>
													<Eye className="h-5 w-5" />
												</button>
												{(() => {
													const status = app.ApprovalStatus?.toLowerCase() || '';
													const isApproved = status.includes('approve') || status === 'approved' || status === 'complete';
													const isRejected = status.includes('reject') || status === 'rejected';
													const isPending = !isApproved && !isRejected && (status === '' || status === 'pending' || !status);
													
													// Show update button only if status is 'Pending' or 'Rejection'
													// Hide update button if status is 'Approved'
													const shouldShowUpdate = isPending || isRejected;
													
													if (!shouldShowUpdate) return null;
													
													return (
														<button
															onClick={() => router.push(`/dashboard/baseline-qol/add?formNo=${encodeURIComponent(app.FormNo || "")}`)}
															className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
															title="Update"
														>
															<Edit2 className="h-5 w-5" />
														</button>
													);
												})()}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className={reportStyles.paginationContainer}>
							<div className={reportStyles.paginationText}>
								Showing page {currentPage} of {totalPages} ({totalRecords} total records)
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className={reportStyles.paginationButton}
								>
									Previous
								</button>
								<button
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className={reportStyles.paginationButton}
								>
									Next
								</button>
							</div>
						</div>
					)}
				</DataCardTable>
		</div>
	);
}
