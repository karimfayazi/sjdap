"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, RefreshCw, Eye, X, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

	const fetchApplications = async () => {
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
	};

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
	if (authLoading || loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Family Development Plan Approval</h1>
					</div>
					<p className="text-gray-600 mt-2">Family Development Plan Management</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading family development plan data...</span>
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
						<h1 className="text-3xl font-bold text-gray-900">Family Development Plan Approval</h1>
					</div>
					<p className="text-gray-600 mt-2">Family Development Plan Management</p>
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

			{/* Filters */}
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-md p-6">
				<div className="mb-4">
					<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
						<Search className="h-5 w-5 text-[#0b4d2b]" />
						Filter Options
					</h3>
					<p className="text-sm text-gray-600 mt-1">Use the filters below to search for specific applications</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
						<input
							type="text"
							placeholder="Enter Form Number"
							value={filters.formNumber}
							onChange={(e) => handleFilterChange("formNumber", e.target.value)}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-30 focus:outline-none transition-all shadow-sm hover:shadow-md"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
						<input
							type="text"
							placeholder="Enter Full Name"
							value={filters.fullName}
							onChange={(e) => handleFilterChange("fullName", e.target.value)}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-30 focus:outline-none transition-all shadow-sm hover:shadow-md"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">CNIC Number</label>
						<input
							type="text"
							placeholder="Enter CNIC Number"
							value={filters.cnicNumber}
							onChange={(e) => handleFilterChange("cnicNumber", e.target.value)}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-30 focus:outline-none transition-all shadow-sm hover:shadow-md"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
						<input
							type="text"
							placeholder="Enter Regional Community"
							value={filters.regionalCommunity}
							onChange={(e) => handleFilterChange("regionalCommunity", e.target.value)}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-30 focus:outline-none transition-all shadow-sm hover:shadow-md"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
						<input
							type="text"
							placeholder="Enter Local Community"
							value={filters.localCommunity}
							onChange={(e) => handleFilterChange("localCommunity", e.target.value)}
							className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-30 focus:outline-none transition-all shadow-sm hover:shadow-md"
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end gap-3">
					<button
						onClick={clearFilters}
						className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
					>
						<X className="h-4 w-4" />
						Clear Filters
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
				{/* Table Header Section */}
				<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b] px-6 py-4 border-b-2 border-[#0a3d22]">
					<h3 className="text-lg font-bold text-white flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Family Development Plan Records
					</h3>
					<p className="text-sm text-white/80 mt-1">Total Records: {totalRecords}</p>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
						<colgroup>
							<col style={{ width: '8%' }} />
							<col style={{ width: '12%' }} />
							<col style={{ width: '10%' }} />
							<col style={{ width: '14%' }} />
							<col style={{ width: '6%' }} />
							<col style={{ width: '8%' }} />
							<col style={{ width: '8%' }} />
							<col style={{ width: '10%' }} />
							<col style={{ width: '24%' }} />
						</colgroup>
						<thead className="bg-white">
							<tr>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Form #
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Full Name
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									CNIC
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Regional / Local
								</th>
								<th className="px-4 py-4 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Members
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Area
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Income
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-300">
									Max Support
								</th>
								<th className="px-4 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredApplications.length === 0 ? (
								<tr>
									<td colSpan={9} className="px-6 py-16 text-center">
										<div className="flex flex-col items-center justify-center">
											<div className="p-4 bg-gray-100 rounded-full mb-4">
												<FileText className="h-8 w-8 text-gray-400" />
											</div>
											<p className="text-lg font-semibold text-gray-700">No records found</p>
											<p className="text-sm text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
										</div>
									</td>
								</tr>
							) : (
								filteredApplications.map((app, index) => (
									<tr 
										key={index} 
										className={`transition-all duration-150 ${
											index % 2 === 0 
												? 'bg-white hover:bg-blue-50' 
												: 'bg-gray-50 hover:bg-blue-100'
										}`}
									>
										<td className="px-4 py-3 text-sm font-semibold text-[#0b4d2b] truncate border-r border-gray-200" 
											title={app.FormNumber || "-"}
										>
											{app.FormNumber || "-"}
										</td>
										<td className="px-4 py-3 text-sm font-medium text-gray-900 truncate border-r border-gray-200" title={app.Full_Name || "-"}>
											{app.Full_Name || "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700 truncate border-r border-gray-200" title={app.CNICNumber || "-"}>
											{app.CNICNumber || "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700 truncate border-r border-gray-200" title={`${app.RegionalCommunity || "-"} / ${app.LocalCommunity || "-"}`}>
											<span className="font-medium text-gray-800">{app.RegionalCommunity || "-"}</span>
											<span className="text-gray-400 mx-1">/</span>
											<span className="text-gray-600">{app.LocalCommunity || "-"}</span>
										</td>
										<td className="px-4 py-3 text-sm font-bold text-center border-r border-gray-200">
											<span className="inline-flex items-center justify-center w-8 h-8 bg-[#0b4d2b]/10 text-[#0b4d2b] rounded-full font-bold">
												{app.TotalFamilyMembers !== null ? app.TotalFamilyMembers : 0}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-700 truncate border-r border-gray-200" title={app.Area_Type || "-"}>
											<span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
												{app.Area_Type || "-"}
											</span>
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate border-r border-gray-200" title={app.IncomeLevel || "-"}>
											<span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
												{app.IncomeLevel || "-"}
											</span>
										</td>
										<td className="px-4 py-3 text-sm font-bold text-gray-900 truncate border-r border-gray-200" title={app.MaxSocialSupport && app.MaxSocialSupport > 0 ? `PKR ${app.MaxSocialSupport.toLocaleString()}` : "-"}>
											{app.MaxSocialSupport && app.MaxSocialSupport > 0 ? (
												<span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold">
													PKR {app.MaxSocialSupport.toLocaleString()}
												</span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-4 py-3 text-sm">
											<div className="flex items-center gap-2 flex-wrap">
												<button
													onClick={() => app.FormNumber && router.push(`/dashboard/family-development-plan/view-fdp?formNumber=${encodeURIComponent(app.FormNumber)}`)}
													disabled={!app.FormNumber}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-semibold hover:bg-purple-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
													title="View FDP"
												>
													<Eye className="h-3.5 w-3.5" />
													<span>View FDP</span>
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t-2 border-gray-300 flex items-center justify-between">
						<div className="text-sm font-medium text-gray-700">
							Showing <span className="font-bold text-[#0b4d2b]">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-[#0b4d2b]">{Math.min(currentPage * itemsPerPage, totalRecords)}</span> of <span className="font-bold text-[#0b4d2b]">{totalRecords}</span> results
						</div>
						<div className="flex items-center gap-3">
							<button
								onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
								disabled={currentPage === 1}
								className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#0b4d2b] hover:text-white hover:border-[#0b4d2b] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700"
							>
								Previous
							</button>
							<span className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg text-sm font-bold shadow-md">
								Page {currentPage} of {totalPages}
							</span>
							<button
								onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
								disabled={currentPage === totalPages}
								className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#0b4d2b] hover:text-white hover:border-[#0b4d2b] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700"
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>
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
