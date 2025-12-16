"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, X, Plus } from "lucide-react";

type FamilyData = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	AGE: number | null;
	CNIC: string | null;
	CONTACT: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
};

export default function FamilyApprovalCRCPage() {
	const router = useRouter();
	const [families, setFamilies] = useState<FamilyData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterFamilyId, setFilterFamilyId] = useState("");
	const [filterProgram, setFilterProgram] = useState("");
	const [filterArea, setFilterArea] = useState("");
	const [filterRegionalCouncil, setFilterRegionalCouncil] = useState("");
	const [filterLocalCouncil, setFilterLocalCouncil] = useState("");
	const [filterJamatKhana, setFilterJamatKhana] = useState("");
	const [filterAreaType, setFilterAreaType] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;
	const [selectedFamily, setSelectedFamily] = useState<FamilyData | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [filterOptions, setFilterOptions] = useState({
		programs: [] as string[],
		areas: [] as string[],
		regionalCouncils: [] as string[],
		localCouncils: [] as string[],
		jamatKhanas: [] as string[],
		areaTypes: [] as string[],
	});
	const [loadingOptions, setLoadingOptions] = useState(false);

	useEffect(() => {
		fetchFamilies();
		fetchFilterOptions();
	}, []);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filterFamilyId) params.append("familyId", filterFamilyId);
			if (filterProgram) params.append("program", filterProgram);
			if (filterArea) params.append("area", filterArea);
			if (filterRegionalCouncil) params.append("regionalCouncil", filterRegionalCouncil);
			if (filterLocalCouncil) params.append("localCouncil", filterLocalCouncil);
			if (filterJamatKhana) params.append("jamatKhana", filterJamatKhana);
			if (filterAreaType) params.append("areaType", filterAreaType);

			const response = await fetch(`/api/families?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setFamilies(data.families || []);
			} else {
				setError(data.message || "Failed to fetch families");
			}
		} catch (err) {
			setError("Error fetching families");
			console.error("Error fetching families:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchFilterOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch('/api/families?getOptions=true');
			const data = await response.json();

			if (data.success) {
				setFilterOptions({
					programs: data.programs || [],
					areas: data.areas || [],
					regionalCouncils: data.regionalCouncils || [],
					localCouncils: data.localCouncils || [],
					jamatKhanas: data.jamatKhanas || [],
					areaTypes: data.areaTypes || [],
				});
			}
		} catch (err) {
			console.error("Error fetching filter options:", err);
		} finally {
			setLoadingOptions(false);
		}
	};

	useEffect(() => {
		fetchFamilies();
	}, [filterFamilyId, filterProgram, filterArea, filterRegionalCouncil, filterLocalCouncil, filterJamatKhana, filterAreaType]);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	const formatDateForInput = (dateString: string | null) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return date.toISOString().split('T')[0];
		} catch {
			return "";
		}
	};

	const handleFamilyIdClick = (family: FamilyData) => {
		setSelectedFamily(family);
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setSelectedFamily(null);
	};

	const handleAdd = () => {
		router.push('/dashboard/family-approval-crc/add');
	};

	const formatNumber = (value: number | null) => {
		if (value === null || value === undefined) return "N/A";
		return value.toLocaleString();
	};


	// Filter families based on search term (client-side filtering for search only)
	const filteredFamilies = families.filter(family => {
		// Search term filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			const matchesSearch = (
				(family.FAMILY_ID?.toLowerCase().includes(search)) ||
				(family.HEAD_NAME?.toLowerCase().includes(search)) ||
				(family.CNIC?.toLowerCase().includes(search)) ||
				(family.CONTACT?.toLowerCase().includes(search)) ||
				(family.PROGRAM?.toLowerCase().includes(search)) ||
				(family.AREA?.toLowerCase().includes(search))
			);
			if (!matchesSearch) return false;
		}
		return true;
	});

	const clearFilters = () => {
		setSearchTerm("");
		setFilterFamilyId("");
		setFilterProgram("");
		setFilterArea("");
		setFilterRegionalCouncil("");
		setFilterLocalCouncil("");
		setFilterJamatKhana("");
		setFilterAreaType("");
		setCurrentPage(1);
	};

	// Calculate stats
	const totalFamilies = families.length;
	const totalFamilyMembers = families.reduce((sum, f) => sum + (f.TOTAL_FAMILY_MEMBER || 0), 0);

	const exportToExcel = () => {
		try {
			const headers = [
				"Family ID",
				"Program",
				"Area",
				"Regional Council",
				"Local Council",
				"Jamat Khana",
				"Head Name",
				"Age",
				"CNIC",
				"Contact",
				"Per Capita Income",
				"Total Family Member",
				"Area Type"
			];

			const csvRows = [];
			csvRows.push(headers.join(","));

			filteredFamilies.forEach(family => {
				const row = [
					family.FAMILY_ID || "N/A",
					family.PROGRAM || "N/A",
					family.AREA || "N/A",
					family.REGIONAL_COUNCIL || "N/A",
					family.LOCAL_COUNCIL || "N/A",
					family.JAMAT_KHANA || "N/A",
					family.HEAD_NAME || "N/A",
					formatNumber(family.AGE),
					family.CNIC || "N/A",
					family.CONTACT || "N/A",
					formatNumber(family.PER_CAPITA_INCOME),
					formatNumber(family.TOTAL_FAMILY_MEMBER),
					family.AREA_TYPE || "N/A"
				];
				csvRows.push(row.map(cell => {
					const cellStr = String(cell);
					if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
						return `"${cellStr.replace(/"/g, '""')}"`;
					}
					return cellStr;
				}).join(","));
			});

			const csvContent = csvRows.join("\n");
			const BOM = "\uFEFF";
			const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
			
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			
			const date = new Date();
			const dateStr = date.toISOString().split('T')[0];
			link.setAttribute("download", `CRC_Family_Progress_Export_${dateStr}.csv`);
			
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

	// Pagination
	const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedFamilies = filteredFamilies.slice(startIndex, endIndex);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Family Approval from CRC</h1>
					<p className="text-gray-600 mt-2">Track family approvals from Child Rights Committee (CRC)</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading families data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Family Approval from CRC</h1>
					<p className="text-gray-600 mt-2">Track family approvals from Child Rights Committee (CRC)</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchFamilies}
						className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
					<h1 className="text-3xl font-bold text-gray-900">Family Approval from CRC</h1>
					<p className="text-gray-600 mt-2">Track family approvals from Child Rights Committee (CRC)</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={exportToExcel}
						disabled={filteredFamilies.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
					>
						<Download className="h-4 w-4" />
						Export to Excel
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors shadow-sm"
					>
						<Plus className="h-4 w-4" />
						Add New Record
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Total Number of Families</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{totalFamilies}</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Total Family Members</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalFamilyMembers)}</p>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="space-y-4">
					{/* Search Bar */}
					<div>
						<input
							type="text"
							placeholder="Search by Family ID, Head Name, CNIC, Contact, Program, Area..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>

					{/* Filters */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Family ID</label>
							<input
								type="text"
								placeholder="Enter Family ID"
								value={filterFamilyId}
								onChange={(e) => {
									setFilterFamilyId(e.target.value);
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Program</label>
							<select
								value={filterProgram}
								onChange={(e) => {
									setFilterProgram(e.target.value);
									setCurrentPage(1);
								}}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">All Programs</option>
								{filterOptions.programs.map(program => (
									<option key={program || ""} value={program || ""}>{program || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Area</label>
							<select
								value={filterArea}
								onChange={(e) => {
									setFilterArea(e.target.value);
									setCurrentPage(1);
								}}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">All Areas</option>
								{filterOptions.areas.map(area => (
									<option key={area || ""} value={area || ""}>{area || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Regional Council</label>
							<select
								value={filterRegionalCouncil}
								onChange={(e) => {
									setFilterRegionalCouncil(e.target.value);
									setFilterLocalCouncil("");
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">All Regional Councils</option>
								{filterOptions.regionalCouncils.map(rc => (
									<option key={rc || ""} value={rc || ""}>{rc || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Local Council</label>
							<select
								value={filterLocalCouncil}
								onChange={(e) => {
									setFilterLocalCouncil(e.target.value);
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								disabled={loadingOptions || !filterRegionalCouncil}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{filterRegionalCouncil ? "All Local Councils" : "Select Regional Council First"}</option>
								{filterOptions.localCouncils.map(lc => (
									<option key={lc || ""} value={lc || ""}>{lc || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Jamat Khana</label>
							<select
								value={filterJamatKhana}
								onChange={(e) => {
									setFilterJamatKhana(e.target.value);
									setCurrentPage(1);
								}}
								disabled={loadingOptions || !filterLocalCouncil}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{filterLocalCouncil ? "All Jamat Khanas" : "Select Local Council First"}</option>
								{filterOptions.jamatKhanas.map(jk => (
									<option key={jk || ""} value={jk || ""}>{jk || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Area Type</label>
							<select
								value={filterAreaType}
								onChange={(e) => {
									setFilterAreaType(e.target.value);
									setCurrentPage(1);
								}}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">All Area Types</option>
								{filterOptions.areaTypes.map(areaType => (
									<option key={areaType || ""} value={areaType || ""}>{areaType || ""}</option>
								))}
							</select>
						</div>
					</div>

					{/* Clear Filters Button */}
					{(filterFamilyId || filterProgram || filterArea || filterRegionalCouncil || filterLocalCouncil || filterJamatKhana || filterAreaType || searchTerm) && (
						<div className="flex justify-end">
							<button
								onClick={clearFilters}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
							>
								Clear All Filters
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Families Grid/Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jamat Khana</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Capita Income</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Family Member</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Type</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedFamilies.length === 0 ? (
								<tr>
									<td colSpan={13} className="px-4 py-8 text-center text-gray-500">
										No families found
									</td>
								</tr>
							) : (
								paginatedFamilies.map((family, index) => (
									<tr key={family.FAMILY_ID || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
											<button
												onClick={() => handleFamilyIdClick(family)}
												className="text-[#0b4d2b] hover:text-[#0a3d22] hover:underline cursor-pointer font-semibold"
											>
												{family.FAMILY_ID || "N/A"}
											</button>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.PROGRAM || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.AREA || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.REGIONAL_COUNCIL || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.LOCAL_COUNCIL || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.JAMAT_KHANA || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.HEAD_NAME || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatNumber(family.AGE)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.CNIC || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.CONTACT || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatNumber(family.PER_CAPITA_INCOME)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatNumber(family.TOTAL_FAMILY_MEMBER)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.AREA_TYPE || "N/A"}
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
								onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
								disabled={currentPage === 1}
								className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<button
								onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
								disabled={currentPage === totalPages}
								className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
						<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p className="text-sm text-gray-700">
									Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
									<span className="font-medium">{Math.min(endIndex, filteredFamilies.length)}</span> of{" "}
									<span className="font-medium">{filteredFamilies.length}</span> results
								</p>
							</div>
							<div>
								<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
									<button
										onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Previous
									</button>
									{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
										if (
											page === 1 ||
											page === totalPages ||
											(page >= currentPage - 2 && page <= currentPage + 2)
										) {
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
										} else if (page === currentPage - 3 || page === currentPage + 3) {
											return (
												<span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
													...
												</span>
											);
										}
										return null;
									})}
									<button
										onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

			{/* View Details Modal */}
			{showModal && selectedFamily && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="sticky top-0 bg-[#0b4d2b] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
							<h2 className="text-2xl font-bold">Family Details - {selectedFamily.FAMILY_ID || "N/A"}</h2>
							<button
								onClick={closeModal}
								className="text-white hover:text-gray-200 transition-colors"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
						<div className="p-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{Object.entries(selectedFamily).map(([key, value]) => (
									<div key={key}>
										<label className="block text-sm font-semibold text-gray-700 mb-1">{key.replace(/_/g, ' ')}</label>
										<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
											{key.includes('DATE') || key.includes('DT') || key.includes('_ON') 
												? formatDate(value as string)
												: typeof value === 'number'
													? formatNumber(value)
													: (value || "N/A")}
										</p>
									</div>
								))}
							</div>
						</div>
						<div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200 rounded-b-lg">
							<button
								onClick={closeModal}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}
