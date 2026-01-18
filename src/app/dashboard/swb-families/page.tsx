"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Plus, Eye, Trash2, Edit2 } from "lucide-react";

type SWBFamily = {
	CNIC: string | null;
	Received_Application: string | null;
	BTS_Number: string | null;
	FAMILY_ID: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	Jamat_Khana: string | null;
	Programme: string | null;
	Beneficiary_Name: string | null;
	Gender: string | null;
	VIST_FEAP: string | null;
	Already_FEAP_Programme: string | null;
	Potential_family_declaration_by_FEAP: string | null;
	If_no_reason: string | null;
	FDP_Status: string | null;
	SWB_to_stop_support_from_date: string | null;
	Remarks: string | null;
	Mentor_Name: string | null;
	Social_Support_Amount: number | null;
	Economic_Support_Amount: number | null;
};

export default function SWBFamiliesPage() {
	const router = useRouter();
	const [families, setFamilies] = useState<SWBFamily[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		cnic: "",
		familyId: "",
		btsNumber: "",
		regionalCouncil: "",
		localCouncil: "",
		programme: "",
		beneficiaryName: "",
		mentorName: "",
		fdpStatus: "",
	});
	const [deleteConfirm, setDeleteConfirm] = useState<{
		show: boolean;
		cnic: string | null;
	}>({
		show: false,
		cnic: null,
	});
	const [deleting, setDeleting] = useState(false);
	const itemsPerPage = 50;

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) {
					params.append(key, value);
				}
			});
			params.append("page", currentPage.toString());
			params.append("limit", itemsPerPage.toString());

			const response = await fetch(`/api/swb-families?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const allFamilies = data.swbFamilies || [];
				setFamilies(allFamilies);
				setTotalRecords(allFamilies.length);
			} else {
				setError(data.message || "Failed to fetch SWB families");
			}
		} catch (err: any) {
			console.error("Error fetching SWB families:", err);
			setError(err.message || "Error fetching SWB families");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchFamilies();
	}, [currentPage]);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	};

	const handleApplyFilters = () => {
		setCurrentPage(1);
		fetchFamilies();
	};

	const handleClearFilters = () => {
		setFilters({
			cnic: "",
			familyId: "",
			btsNumber: "",
			regionalCouncil: "",
			localCouncil: "",
			programme: "",
			beneficiaryName: "",
			mentorName: "",
			fdpStatus: "",
		});
		setSearchTerm("");
		setCurrentPage(1);
	};

	const handleDelete = async (cnic: string) => {
		if (!cnic) return;
		
		setDeleting(true);
		try {
			const response = await fetch(`/api/swb-families?cnic=${encodeURIComponent(cnic)}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (data.success) {
				fetchFamilies();
				setDeleteConfirm({ show: false, cnic: null });
			} else {
				setError(data.message || "Failed to delete SWB family");
			}
		} catch (err: any) {
			console.error("Error deleting SWB family:", err);
			setError(err.message || "Error deleting SWB family");
		} finally {
			setDeleting(false);
		}
	};

	const exportToCSV = () => {
		try {
			const headers = [
				"CNIC",
				"Received Application",
				"BTS Number",
				"Family ID",
				"Regional Council",
				"Local Council",
				"Jamat Khana",
				"Programme",
				"Beneficiary Name",
				"Gender",
				"VIST FEAP",
				"Already FEAP Programme",
				"Potential family declaration by FEAP",
				"If no reason",
				"FDP Status",
				"SWB to stop support from date",
				"Remarks",
				"Mentor Name",
				"Social Support Amount",
				"Economic Support Amount",
			];
			const csvRows = [];
			csvRows.push(headers.join(","));

			families.forEach((family) => {
				const row = headers.map((header) => {
					const key = header.replace(/\s+/g, "_").replace(/\//g, "_");
					const value = family[key as keyof SWBFamily];
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
			link.setAttribute("download", `SWB_Families_${dateStr}.csv`);
			
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

	const filteredFamilies = families.filter((family) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(family.CNIC && String(family.CNIC).toLowerCase().includes(search)) ||
			(family.BTS_Number && String(family.BTS_Number).toLowerCase().includes(search)) ||
			(family.FAMILY_ID && String(family.FAMILY_ID).toLowerCase().includes(search)) ||
			(family.Beneficiary_Name && String(family.Beneficiary_Name).toLowerCase().includes(search)) ||
			(family.Regional_Council && String(family.Regional_Council).toLowerCase().includes(search)) ||
			(family.Local_Council && String(family.Local_Council).toLowerCase().includes(search)) ||
			(family.Jamat_Khana && String(family.Jamat_Khana).toLowerCase().includes(search)) ||
			(family.Programme && String(family.Programme).toLowerCase().includes(search)) ||
			(family.Mentor_Name && String(family.Mentor_Name).toLowerCase().includes(search)) ||
			(family.FDP_Status && String(family.FDP_Status).toLowerCase().includes(search))
		);
	});

	// Pagination
	const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedFamilies = filteredFamilies.slice(startIndex, startIndex + itemsPerPage);

	// Access control removed - all users can access this page

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
						<p className="text-gray-600 mt-2">SWB Family Management</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading SWB families...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
						<p className="text-gray-600 mt-2">SWB Family Management</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={fetchFamilies}
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
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
					</div>
					<p className="text-gray-600 mt-2">SWB Family Management</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchFamilies}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard/swb-families/add")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Family
					</button>
					<button
						onClick={exportToCSV}
						disabled={families.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
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
							{startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredFamilies.length)}
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
				
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
					<input
						type="text"
						placeholder="CNIC"
						value={filters.cnic}
						onChange={(e) => handleFilterChange("cnic", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Family ID"
						value={filters.familyId}
						onChange={(e) => handleFilterChange("familyId", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="BTS Number"
						value={filters.btsNumber}
						onChange={(e) => handleFilterChange("btsNumber", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Regional Council"
						value={filters.regionalCouncil}
						onChange={(e) => handleFilterChange("regionalCouncil", e.target.value)}
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
						placeholder="Programme"
						value={filters.programme}
						onChange={(e) => handleFilterChange("programme", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Beneficiary Name"
						value={filters.beneficiaryName}
						onChange={(e) => handleFilterChange("beneficiaryName", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Mentor Name"
						value={filters.mentorName}
						onChange={(e) => handleFilterChange("mentorName", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="FDP Status"
						value={filters.fdpStatus}
						onChange={(e) => handleFilterChange("fdpStatus", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				
				<div className="flex gap-2">
					<button
						onClick={handleApplyFilters}
						className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						Apply Filters
					</button>
					<button
						onClick={handleClearFilters}
						className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
					>
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
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BTS Number</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programme</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FDP Status</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor Name</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedFamilies.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-4 py-8 text-center text-gray-500">
										{searchTerm || Object.values(filters).some(f => f) ? "No families found matching your search/filters" : "No SWB families found"}
									</td>
								</tr>
							) : (
								paginatedFamilies.map((family, index) => (
									<tr key={family.CNIC || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => router.push(`/dashboard/swb-families/view?cnic=${encodeURIComponent(family.CNIC || "")}`)}
													className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
													title="View"
												>
													<Eye className="h-4 w-4" />
												</button>
												<button
													onClick={() => router.push(`/dashboard/swb-families/edit?cnic=${encodeURIComponent(family.CNIC || "")}`)}
													className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
													title="Edit"
												>
													<Edit2 className="h-4 w-4" />
												</button>
												<button
													onClick={() => setDeleteConfirm({ show: true, cnic: family.CNIC })}
													className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.CNIC || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.BTS_Number || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.FAMILY_ID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Beneficiary_Name || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Programme || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Regional_Council || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Local_Council || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.FDP_Status || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Mentor_Name || "N/A"}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
								<span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredFamilies.length)}</span> of{" "}
								<span className="font-medium">{filteredFamilies.length}</span> results
							</div>
							<nav className="flex gap-2">
								<button
									onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
									disabled={currentPage === 1}
									className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Previous
								</button>
								<span className="px-3 py-1 text-sm text-gray-700">
									Page {currentPage} of {totalPages}
								</span>
								<button
									onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
									disabled={currentPage === totalPages}
									className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Next
								</button>
							</nav>
						</div>
					</div>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
							<p className="text-gray-600 mb-6">
								Are you sure you want to delete this SWB family record? This action cannot be undone.
							</p>
							<div className="flex justify-end gap-3">
								<button
									onClick={() => setDeleteConfirm({ show: false, cnic: null })}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
									disabled={deleting}
								>
									Cancel
								</button>
								<button
									onClick={() => deleteConfirm.cnic && handleDelete(deleteConfirm.cnic)}
									disabled={deleting}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
								>
									{deleting ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
