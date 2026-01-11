"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type FamilyStatusLog = {
	FormNumber: string | null;
	ApplicationStatus: string | null;
	ApplicationDate: string | null;
	FDPDevelopmentStatus: string | null;
	FDPDevelopmentDate: string | null;
	CRCApprovalStatus: string | null;
	CRCApprovalDate: string | null;
	InterventionStatus: string | null;
	InterventionStartDate: string | null;
	SystemDate: string | null;
	UserId: string | null;
	Remarks: string | null;
	BasicInfo_ApplicationDate: string | null;
	Full_Name: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

// Helper function to get status color
const getStatusColor = (status: string | null): string => {
	if (!status) return "bg-gray-100 text-gray-700";
	
	const statusLower = status.toLowerCase().trim();
	
	// Active statuses - green
	if (
		statusLower === "active" ||
		statusLower === "approved" ||
		statusLower === "completed" ||
		statusLower === "in progress" ||
		statusLower === "ongoing"
	) {
		return "bg-green-100 text-green-800 border-green-300";
	}
	
	// Pending statuses - yellow
	if (
		statusLower === "pending" ||
		statusLower === "under review" ||
		statusLower === "waiting" ||
		statusLower === "submitted"
	) {
		return "bg-yellow-100 text-yellow-800 border-yellow-300";
	}
	
	// Rejected/Cancelled statuses - red
	if (
		statusLower === "rejected" ||
		statusLower === "cancelled" ||
		statusLower === "declined" ||
		statusLower === "closed"
	) {
		return "bg-red-100 text-red-800 border-red-300";
	}
	
	// Inactive statuses - gray
	if (
		statusLower === "inactive" ||
		statusLower === "not started" ||
		statusLower === "draft"
	) {
		return "bg-gray-100 text-gray-700 border-gray-300";
	}
	
	// Default - blue
	return "bg-blue-100 text-blue-800 border-blue-300";
};

// Helper function to format date
const formatDate = (dateString: string | null): string => {
	if (!dateString) return "-";
	try {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return dateString;
	}
};

export default function FamilyStatusPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const [statusLogs, setStatusLogs] = useState<FamilyStatusLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		formNumber: "",
		applicationStatus: "",
		fdpDevelopmentStatus: "",
		crcApprovalStatus: "",
		interventionStatus: "",
	});
	const itemsPerPage = 50;

	const fetchStatusLogs = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString(),
			});

			// Add filter parameters
			if (filters.formNumber) params.append("formNumber", filters.formNumber);
			if (filters.applicationStatus) params.append("applicationStatus", filters.applicationStatus);
			if (filters.fdpDevelopmentStatus) params.append("fdpDevelopmentStatus", filters.fdpDevelopmentStatus);
			if (filters.crcApprovalStatus) params.append("crcApprovalStatus", filters.crcApprovalStatus);
			if (filters.interventionStatus) params.append("interventionStatus", filters.interventionStatus);

			const response = await fetch(`/api/family-status-log?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setStatusLogs(data.data || []);
				setTotalRecords(data.total || 0);
			} else {
				setError(data.message || "Failed to fetch family status logs");
			}
		} catch (err: any) {
			console.error("Error fetching family status logs:", err);
			setError(err.message || "Error fetching family status logs");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStatusLogs();
	}, [currentPage, filters]);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const clearFilters = () => {
		setFilters({
			formNumber: "",
			applicationStatus: "",
			fdpDevelopmentStatus: "",
			crcApprovalStatus: "",
			interventionStatus: "",
		});
		setSearchTerm("");
		setCurrentPage(1);
	};

	const exportToCSV = () => {
		try {
			if (statusLogs.length === 0) {
				alert("No data to export");
				return;
			}

			const headers = [
				"FormNumber",
				"Full_Name",
				"ApplicationDate",
				"RegionalCommunity",
				"LocalCommunity",
				"ApplicationStatus",
				"FDPDevelopmentStatus",
				"FDPDevelopmentDate",
				"CRCApprovalStatus",
				"CRCApprovalDate",
				"InterventionStatus",
				"InterventionStartDate",
				"SystemDate",
				"UserId",
				"Remarks",
			];
			const csvRows = [];
			csvRows.push(headers.join(","));

			statusLogs.forEach((log) => {
				const row = headers.map((header) => {
					const value = log[header as keyof FamilyStatusLog];
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
			link.setAttribute("download", `Family_Status_Log_${dateStr}.csv`);
			
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

	const filteredStatusLogs = statusLogs.filter((log) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(log.FormNumber && String(log.FormNumber).toLowerCase().includes(search)) ||
			(log.Full_Name && String(log.Full_Name).toLowerCase().includes(search)) ||
			(log.RegionalCommunity && String(log.RegionalCommunity).toLowerCase().includes(search)) ||
			(log.LocalCommunity && String(log.LocalCommunity).toLowerCase().includes(search)) ||
			(log.ApplicationStatus && String(log.ApplicationStatus).toLowerCase().includes(search)) ||
			(log.FDPDevelopmentStatus && String(log.FDPDevelopmentStatus).toLowerCase().includes(search)) ||
			(log.CRCApprovalStatus && String(log.CRCApprovalStatus).toLowerCase().includes(search)) ||
			(log.InterventionStatus && String(log.InterventionStatus).toLowerCase().includes(search)) ||
			(log.Remarks && String(log.Remarks).toLowerCase().includes(search))
		);
	});

	const totalPages = Math.ceil(totalRecords / itemsPerPage);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Family Status</h1>
						<p className="text-gray-600 mt-2">Family Status Log Management</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading family status logs...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Family Status</h1>
						<p className="text-gray-600 mt-2">Family Status Log Management</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={fetchStatusLogs}
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
					<h1 className="text-3xl font-bold text-gray-900">Family Status</h1>
					<p className="text-gray-600 mt-2">Family Status Log Management</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchStatusLogs}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={exportToCSV}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
					{/* Search */}
					<div className="lg:col-span-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
							<input
								type="text"
								placeholder="Search by Form Number, Full Name, Regional/Local Community, Status, or Remarks..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
							/>
						</div>
					</div>

					{/* Form Number Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Form Number
						</label>
						<input
							type="text"
							value={filters.formNumber}
							onChange={(e) => handleFilterChange("formNumber", e.target.value)}
							placeholder="Filter by Form Number"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* Application Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Application Status
						</label>
						<input
							type="text"
							value={filters.applicationStatus}
							onChange={(e) => handleFilterChange("applicationStatus", e.target.value)}
							placeholder="Filter by Application Status"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* FDP Development Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							FDP Development Status
						</label>
						<input
							type="text"
							value={filters.fdpDevelopmentStatus}
							onChange={(e) => handleFilterChange("fdpDevelopmentStatus", e.target.value)}
							placeholder="Filter by FDP Development Status"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* CRC Approval Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							CRC Approval Status
						</label>
						<input
							type="text"
							value={filters.crcApprovalStatus}
							onChange={(e) => handleFilterChange("crcApprovalStatus", e.target.value)}
							placeholder="Filter by CRC Approval Status"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* Intervention Status Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Intervention Status
						</label>
						<input
							type="text"
							value={filters.interventionStatus}
							onChange={(e) => handleFilterChange("interventionStatus", e.target.value)}
							placeholder="Filter by Intervention Status"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>
				</div>

				{/* Clear Filters Button */}
				<div className="flex justify-end">
					<button
						onClick={clearFilters}
						className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:underline"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Form Number
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Full Name
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Application Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Regional Community
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Local Community
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Application Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									FDP Development Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									FDP Development Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									CRC Approval Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									CRC Approval Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Intervention Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Intervention Start Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Remarks
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredStatusLogs.length === 0 ? (
								<tr>
									<td colSpan={13} className="px-6 py-12 text-center text-gray-500">
										No records found
									</td>
								</tr>
							) : (
								filteredStatusLogs.map((log, index) => (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{log.FormNumber || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{log.Full_Name || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatDate(log.BasicInfo_ApplicationDate || log.ApplicationDate)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
											{log.RegionalCommunity || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
											{log.LocalCommunity || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(log.ApplicationStatus)}`}>
												{log.ApplicationStatus || "-"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(log.FDPDevelopmentStatus)}`}>
												{log.FDPDevelopmentStatus || "-"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatDate(log.FDPDevelopmentDate)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(log.CRCApprovalStatus)}`}>
												{log.CRCApprovalStatus || "-"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatDate(log.CRCApprovalDate)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(log.InterventionStatus)}`}>
												{log.InterventionStatus || "-"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{formatDate(log.InterventionStartDate)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.Remarks || ""}>
											{log.Remarks || "-"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
						<div className="text-sm text-gray-700">
							Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} results
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
								disabled={currentPage === 1}
								className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<span className="text-sm text-gray-700">
								Page {currentPage} of {totalPages}
							</span>
							<button
								onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
								disabled={currentPage === totalPages}
								className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
