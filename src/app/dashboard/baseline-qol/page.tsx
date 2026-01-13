"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Plus, X, Eye, Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";
import { isSuperUser } from "@/lib/auth-utils";

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
	const [isSuperUserState, setIsSuperUserState] = useState(false);
	const itemsPerPage = 50;


	// Check if user is Super User using utility function
	useEffect(() => {
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
					{hasAccess && (
						<button
							onClick={() => router.push("/dashboard/baseline-qol/add")}
							className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Add New
						</button>
					)}
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<input
						type="text"
						placeholder="Form No"
						value={filters.formNo}
						onChange={(e) => handleFilterChange("formNo", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="CNIC No"
						value={filters.cnicNo}
						onChange={(e) => handleFilterChange("cnicNo", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Primary Contact"
						value={filters.primaryContactNo}
						onChange={(e) => handleFilterChange("primaryContactNo", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Local Council"
						value={filters.localCouncil}
						onChange={(e) => handleFilterChange("localCouncil", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Full Name"
						value={filters.fullName}
						onChange={(e) => handleFilterChange("fullName", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Regional Council"
						value={filters.regionalCouncil}
						onChange={(e) => handleFilterChange("regionalCouncil", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<button
						onClick={clearFilters}
						className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Search */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
					<input
						type="text"
						placeholder="Search applications..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form No</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC No</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Contact</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Members</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredApplications.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-6 py-4 text-center text-gray-500">
										No applications found
									</td>
								</tr>
							) : (
								filteredApplications.map((app) => (
									<tr key={app.FormNo} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.FormNo || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.FullName || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.CNICNo || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.PrimaryContactNo || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.LocalCouncil || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.RegionalCouncil || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.TotalFamilyMembers || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													onClick={() => router.push(`/dashboard/baseline-qol/view?formNo=${encodeURIComponent(app.FormNo || "")}`)}
													className="text-[#0b4d2b] hover:text-[#0a3d22]"
												>
													<Eye className="h-4 w-4" />
												</button>
												{isSuperUserState && (
													<button
														onClick={() => router.push(`/dashboard/baseline-qol/${app.FormNo}`)}
														className="text-blue-600 hover:text-blue-800"
													>
														<Edit2 className="h-4 w-4" />
													</button>
												)}
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
									{Array.from({ length: totalPages }, (_, i) => i + 1)
										.filter((page) => {
											if (totalPages <= 7) return true;
											if (page === 1 || page === totalPages) return true;
											if (Math.abs(page - currentPage) <= 1) return true;
											return false;
										})
										.map((page, idx, arr) => (
											<div key={page}>
												{idx > 0 && arr[idx - 1] !== page - 1 && (
													<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
														...
													</span>
												)}
												<button
													onClick={() => setCurrentPage(page)}
													className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
														currentPage === page
															? "z-10 bg-[#0b4d2b] border-[#0b4d2b] text-white"
															: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
													}`}
												>
													{page}
												</button>
											</div>
										))}
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
