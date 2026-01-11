"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Plus, X, Eye, Trash2, Edit2 } from "lucide-react";
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
		createdDate: "",
		createdTime: "",
		updatedDate: "",
		updatedTime: "",
	});
	const [deleteConfirm, setDeleteConfirm] = useState<{
		show: boolean;
		formNo: string | null;
	}>({
		show: false,
		formNo: null,
	});
	const [deleting, setDeleting] = useState(false);
	const [isSuperUser, setIsSuperUser] = useState(false);
	const [loadAll, setLoadAll] = useState(false);
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

	const fetchApplications = async (fetchAll: boolean = false) => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();

			// If fetching all, use a very large limit, otherwise use pagination
			if (fetchAll || loadAll) {
				params.append("page", "1");
				params.append("limit", "999999"); // Very large number to get all records
			} else {
				params.append("page", currentPage.toString());
				params.append("limit", itemsPerPage.toString());
			}

			// Add filter parameters
			if (filters.formNo) params.append("formNo", filters.formNo);
			if (filters.cnicNo) params.append("cnicNo", filters.cnicNo);
			if (filters.primaryContactNo) params.append("primaryContactNo", filters.primaryContactNo);
			if (filters.localCouncil) params.append("localCouncil", filters.localCouncil);
			if (filters.fullName) params.append("fullName", filters.fullName);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);
			if (filters.createdDate) params.append("createdDate", filters.createdDate);
			if (filters.createdTime) params.append("createdTime", filters.createdTime);
			if (filters.updatedDate) params.append("updatedDate", filters.updatedDate);
			if (filters.updatedTime) params.append("updatedTime", filters.updatedTime);

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
		fetchApplications(loadAll);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPage, filters, loadAll]);

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
			createdDate: "",
			createdTime: "",
			updatedDate: "",
			updatedTime: "",
		});
		setCurrentPage(1);
	};

	const handleDeleteClick = (formNo: string) => {
		setDeleteConfirm({
			show: true,
			formNo,
		});
	};

	const handleDeleteConfirm = async () => {
		if (!deleteConfirm.formNo) return;

		try {
			setDeleting(true);
			// Delete using FormNo directly
			const response = await fetch(`/api/baseline-applications?formNo=${encodeURIComponent(deleteConfirm.formNo)}`, {
				method: "DELETE",
			});
			const data = await response.json();
			if (data.success) {
				await fetchApplications();
				setDeleteConfirm({ show: false, formNo: null });
			} else {
				alert(data.message || "Failed to delete application");
			}
		} catch (err: any) {
			console.error("Error deleting application:", err);
			alert(err.message || "Error deleting application");
		} finally {
			setDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setDeleteConfirm({ show: false, formNo: null });
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
			if (filters.createdDate) params.append("createdDate", filters.createdDate);
			if (filters.createdTime) params.append("createdTime", filters.createdTime);
			if (filters.updatedDate) params.append("updatedDate", filters.updatedDate);
			if (filters.updatedTime) params.append("updatedTime", filters.updatedTime);

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
			if (!loadAll) {
				await fetchApplications();
			}
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
						onClick={() => {
							setLoadAll(!loadAll);
							setCurrentPage(1);
							fetchApplications(!loadAll);
						}}
						className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
							loadAll 
								? "bg-blue-600 text-white hover:bg-blue-700" 
								: "bg-blue-100 text-blue-700 hover:bg-blue-200"
						}`}
					>
						{loadAll ? "Show Paginated" : "Load All"}
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
							{loadAll 
								? `${applications.length.toLocaleString()} (All)` 
								: `${((currentPage - 1) * itemsPerPage + 1).toLocaleString()} - ${Math.min(currentPage * itemsPerPage, totalRecords).toLocaleString()}`
							}
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
				{/* Date/Time Filters */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Created Date
						</label>
						<input
							type="date"
							value={filters.createdDate}
							onChange={(e) => handleFilterChange("createdDate", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Created Time
						</label>
						<input
							type="time"
							value={filters.createdTime}
							onChange={(e) => handleFilterChange("createdTime", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Updated Date
						</label>
						<input
							type="date"
							value={filters.updatedDate}
							onChange={(e) => handleFilterChange("updatedDate", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Updated Time
						</label>
						<input
							type="time"
							value={filters.updatedTime}
							onChange={(e) => handleFilterChange("updatedTime", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
				</div>
				<div className="flex justify-between items-center">
					<div className="flex gap-2">
						<button
							onClick={() => {
								setFilters({
									...filters,
									createdDate: "2026-01-10",
									createdTime: "23:00",
								});
								setCurrentPage(1);
							}}
							className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
						>
							Filter: Jan 10, 2026 11:00 PM
						</button>
					</div>
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
												<button
													onClick={() => handleDeleteClick(app.FormNo || "")}
													className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
												>
													<Trash2 className="h-3 w-3" />
													Delete
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
				{!loadAll && totalPages > 1 && (
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

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						{/* Modal Header */}
						<div className="bg-red-50 border-b border-red-200 px-6 py-4 rounded-t-lg">
							<div className="flex items-center gap-3">
								<div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
									<Trash2 className="h-5 w-5 text-red-600" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900">Delete Family</h3>
									<p className="text-sm text-gray-600">This action cannot be undone</p>
								</div>
							</div>
						</div>

						{/* Modal Body */}
						<div className="px-6 py-4">
							<div className="mb-4">
								<p className="text-gray-700 mb-2">
									<strong>Form No:</strong> <span className="font-mono text-lg text-red-600">{deleteConfirm.formNo || "N/A"}</span>
								</p>
								<p className="text-gray-800 text-base leading-relaxed">
									Do you want to delete this application? This will permanently delete all records associated with this Form No.
								</p>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete all related records including:
								</p>
								<ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
									<li>Application information</li>
									<li>Family head(s) data</li>
									<li>Family members data</li>
									<li>Education records</li>
									<li>Livelihood records</li>
								</ul>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
							<button
								onClick={handleDeleteCancel}
								disabled={deleting}
								className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteConfirm}
								disabled={deleting}
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{deleting ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4" />
										Delete Family
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
