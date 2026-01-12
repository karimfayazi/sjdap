"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Plus, X, Eye, Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

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
};

export default function BaselineQOLPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("BaselineQOL");
	const [applications, setApplications] = useState<BaselineApplication[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		formNo: "",
		cnicNo: "",
		primaryContactNo: "",
		localCouncil: "",
		fullName: "",
		regionalCouncil: "",
	});
	const [isSuperUser, setIsSuperUser] = useState(false);
	const itemsPerPage = 50;

	// Check if user is Super User
	useEffect(() => {
		if (typeof window === "undefined") return;
		
		// Check from userProfile first
		if (userProfile?.supper_user !== null && userProfile?.supper_user !== undefined) {
			const su = userProfile.supper_user;
			const isSu =
				su === 1 ||
				su === "1" ||
				su === true ||
				su === "true" ||
				su === "Yes" ||
				su === "yes";
			setIsSuperUser(isSu);
			return;
		}

		// Fallback to localStorage
		try {
			const stored = localStorage.getItem("userData");
			if (stored) {
				const parsed = JSON.parse(stored);
				const su = parsed.super_user;
				const isSu =
					su === 1 ||
					su === "1" ||
					su === true ||
					su === "true" ||
					su === "Yes" ||
					su === "yes";
				setIsSuperUser(isSu);
			}
		} catch {
			// ignore localStorage errors
		}
	}, [userProfile]);

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

	useEffect(() => {
		fetchApplications();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, filters]);

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
				"CNICNo",
				"PrimaryContactNo",
				"LocalCouncil",
				"FullName",
				"RegionalCouncil",
				"TotalFamilyMembers",
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

	const filteredApplications = applications.filter((app) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(app.FormNo && String(app.FormNo).toLowerCase().includes(search)) ||
			(app.CNICNo && String(app.CNICNo).toLowerCase().includes(search)) ||
			(app.PrimaryContactNo && String(app.PrimaryContactNo).toLowerCase().includes(search)) ||
			(app.LocalCouncil && String(app.LocalCouncil).toLowerCase().includes(search)) ||
			(app.FullName && String(app.FullName).toLowerCase().includes(search)) ||
			(app.RegionalCouncil && String(app.RegionalCouncil).toLowerCase().includes(search)) ||
			(app.TotalFamilyMembers && String(app.TotalFamilyMembers).toLowerCase().includes(search))
		);
	});

	const totalPages = Math.ceil(totalRecords / itemsPerPage);

	// Show loading while checking access
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

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="BaselineQOL" />;
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Baseline</h1>
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
						<h1 className="text-3xl font-bold text-gray-900">Baseline</h1>
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
					<p className="text-gray-600 mt-2">
						PE Application Management
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => fetchApplications()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard/baseline-qol/add")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Application
					</button>
					<button
						onClick={exportToCSV}
						disabled={loading}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export All CSV
					</button>
				</div>
			</div>

			{/* Stats Card */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-600 mb-2">Total Records</p>
						<p className="text-3xl font-bold text-[#0b4d2b]">{totalRecords.toLocaleString()}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-gray-600 mb-2">Showing</p>
						<p className="text-3xl font-bold text-[#0b4d2b]">
							{`${((currentPage - 1) * itemsPerPage + 1).toLocaleString()} - ${Math.min(currentPage * itemsPerPage, totalRecords).toLocaleString()}`}
						</p>
					</div>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search across all columns..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setCurrentPage(1);
						}}
						className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Form No
						</label>
						<input
							type="text"
							value={filters.formNo}
							onChange={(e) => handleFilterChange("formNo", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by Form No"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							CNIC No
						</label>
						<input
							type="text"
							value={filters.cnicNo}
							onChange={(e) => handleFilterChange("cnicNo", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by CNIC"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Primary Contact No
						</label>
						<input
							type="text"
							value={filters.primaryContactNo}
							onChange={(e) => handleFilterChange("primaryContactNo", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by Contact"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Local Council
						</label>
						<input
							type="text"
							value={filters.localCouncil}
							onChange={(e) => handleFilterChange("localCouncil", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by LC"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Full Name
						</label>
						<input
							type="text"
							value={filters.fullName}
							onChange={(e) => handleFilterChange("fullName", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by Name"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Regional Council
						</label>
						<input
							type="text"
							value={filters.regionalCouncil}
							onChange={(e) => handleFilterChange("regionalCouncil", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Filter by RC"
						/>
					</div>
				</div>
				<div className="flex justify-end items-center">
					<button
						onClick={clearFilters}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
					>
						<X className="h-4 w-4" />
						Clear Filters
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Form No
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									CNIC No
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Primary Contact No
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Local Council
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Full Name
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Regional Council
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Total Family Members
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredApplications.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-gray-500">
										No records found
									</td>
								</tr>
							) : (
								filteredApplications.map((app, index) => (
									<tr key={`${app.FormNo}-${index}`} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
											{app.FormNo ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.CNICNo ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.PrimaryContactNo ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.LocalCouncil ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.FullName ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.RegionalCouncil ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{app.TotalFamilyMembers ?? "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<div className="flex items-center gap-2">
												<button
													onClick={() => router.push(`/dashboard/baseline-qol/view?formNo=${encodeURIComponent(app.FormNo || "")}`)}
													className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
												>
													<Eye className="h-3 w-3" />
													View
												</button>
												<button
													onClick={() => router.push(`/dashboard/baseline-qol/add?formNo=${encodeURIComponent(app.FormNo || "")}`)}
													className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-xs"
												>
													<Edit2 className="h-3 w-3" />
													Edit
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
					<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
						<div className="flex-1 flex justify-between sm:hidden">
							<button
								onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
								disabled={currentPage === 1}
								className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<button
								onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
								disabled={currentPage === totalPages}
								className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
						<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p className="text-sm text-gray-700">
									Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
									<span className="font-medium">{Math.min(currentPage * itemsPerPage, totalRecords)}</span> of{" "}
									<span className="font-medium">{totalRecords}</span> results
								</p>
							</div>
							<div>
								<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Previous
									</button>
									{Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
										let page;
										if (totalPages <= 10) {
											page = i + 1;
										} else if (currentPage <= 5) {
											page = i + 1;
										} else if (currentPage >= totalPages - 4) {
											page = totalPages - 9 + i;
										} else {
											page = currentPage - 5 + i;
										}
										return (
											<button
												key={page}
												onClick={() => setCurrentPage(page)}
												className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
													currentPage === page
														? "z-10 bg-[#0b4d2b] border-[#0b4d2b] text-white"
														: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
												}`}
											>
												{page}
											</button>
										);
									})}
									<button
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Next
									</button>
								</nav>
							</div>
						</div>
					</div>
				)}
			</div>

		</div>
	);
}
