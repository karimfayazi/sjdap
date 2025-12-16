"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus } from "lucide-react";

type QOLBaselineData = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	CNIC: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
	POVERTY_LEVEL: string | null;
};

export default function QOLBaselinePage() {
	const router = useRouter();
	const [families, setFamilies] = useState<QOLBaselineData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterFamilyId, setFilterFamilyId] = useState("");
	const [filterProgram, setFilterProgram] = useState("");
	const [filterArea, setFilterArea] = useState("");
	const [filterRegionalCouncil, setFilterRegionalCouncil] = useState("");
	const [filterLocalCouncil, setFilterLocalCouncil] = useState("");
	const [filterJamatKhana, setFilterJamatKhana] = useState("");
	const [filterHeadName, setFilterHeadName] = useState("");
	const [filterCnic, setFilterCnic] = useState("");
	const [filterPovertyLevel, setFilterPovertyLevel] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;
	const [filterOptions, setFilterOptions] = useState({
		programs: [] as string[],
		areas: [] as string[],
		regionalCouncils: [] as string[],
		localCouncils: [] as string[],
		jamatKhanas: [] as string[],
		povertyLevels: [] as string[],
	});
	const [loadingOptions, setLoadingOptions] = useState(false);

	useEffect(() => {
		fetchFamilies();
		fetchFilterOptions();
	}, []);

	useEffect(() => {
		fetchFamilies();
	}, [filterFamilyId, filterProgram, filterArea, filterRegionalCouncil, filterLocalCouncil, filterJamatKhana, filterHeadName, filterCnic, filterPovertyLevel]);

	useEffect(() => {
		if (filterArea || filterRegionalCouncil || filterLocalCouncil) {
			fetchCascadingOptions();
		}
	}, [filterArea, filterRegionalCouncil, filterLocalCouncil]);

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
			if (filterHeadName) params.append("headName", filterHeadName);
			if (filterCnic) params.append("cnic", filterCnic);
			if (filterPovertyLevel) params.append("povertyLevel", filterPovertyLevel);

			const response = await fetch(`/api/qol-baseline-data?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setFamilies(data.families || []);
			} else {
				setError(data.message || "Failed to fetch QOL baseline data");
			}
		} catch (err) {
			setError("Error fetching QOL baseline data");
			console.error("Error fetching QOL baseline data:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchCascadingOptions = async () => {
		try {
			const params = new URLSearchParams();
			params.append("getCascadingOptions", "true");
			if (filterArea) params.append("area", filterArea);
			if (filterRegionalCouncil) params.append("regionalCouncil", filterRegionalCouncil);
			if (filterLocalCouncil) params.append("localCouncil", filterLocalCouncil);

			const response = await fetch(`/api/qol-baseline-data?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setFilterOptions(prev => ({
					...prev,
					regionalCouncils: data.regionalCouncils || [],
					localCouncils: data.localCouncils || [],
					jamatKhanas: data.jamatKhanas || [],
				}));
			}
		} catch (err) {
			console.error("Error fetching cascading options:", err);
		}
	};

	const fetchFilterOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch('/api/qol-baseline-data?getOptions=true');
			const data = await response.json();

			if (data.success) {
				setFilterOptions(prev => ({
					...prev,
					programs: data.programs || [],
					areas: data.areas || [],
					povertyLevels: data.povertyLevels || [],
				}));
			}
		} catch (err) {
			console.error("Error fetching filter options:", err);
		} finally {
			setLoadingOptions(false);
		}
	};

	const formatNumber = (value: number | null) => {
		if (value === null || value === undefined) return "N/A";
		return value.toLocaleString();
	};

	const handleFamilyIdClick = (family: QOLBaselineData) => {
		if (family.FAMILY_ID) {
			router.push(`/dashboard/qol-baseline/${encodeURIComponent(family.FAMILY_ID)}`);
		}
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
		setFilterHeadName("");
		setFilterCnic("");
		setFilterPovertyLevel("");
		setCurrentPage(1);
	};

	const handleAdd = () => {
		router.push('/dashboard/qol-baseline/add');
	};

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
				"CNIC",
				"Per Capita Income",
				"Total Family Member",
				"Area Type",
				"Poverty Level"
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
					family.CNIC || "N/A",
					formatNumber(family.PER_CAPITA_INCOME),
					formatNumber(family.TOTAL_FAMILY_MEMBER),
					family.AREA_TYPE || "N/A",
					family.POVERTY_LEVEL || "N/A"
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
			link.setAttribute("download", `QOL_Baseline_Export_${dateStr}.csv`);
			
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

	// Calculate stats
	const totalFamilies = families.length;
	const totalFamilyMembers = families.reduce((sum, f) => sum + (f.TOTAL_FAMILY_MEMBER || 0), 0);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">QOL-Baseline</h1>
					<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading QOL baseline data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">QOL-Baseline</h1>
					<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
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
					<h1 className="text-3xl font-bold text-gray-900">QOL-Baseline</h1>
					<p className="text-gray-600 mt-2">Quality of Life Baseline Assessment</p>
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
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<p className="text-sm font-medium text-gray-600 mb-2"># of Families</p>
					<p className="text-3xl font-bold text-[#0b4d2b]">{totalFamilies.toLocaleString()}</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<p className="text-sm font-medium text-gray-600 mb-2"># of Members</p>
					<p className="text-3xl font-bold text-[#0b4d2b]">{formatNumber(totalFamilyMembers)}</p>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="space-y-4">
					{/* Search Bar */}
					<div>
								<input
									type="text"
							placeholder="Search by Family ID, Head Name, CNIC, Program, Area..."
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
									setFilterRegionalCouncil("");
									setFilterLocalCouncil("");
									setFilterJamatKhana("");
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
								disabled={loadingOptions || !filterArea}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{filterArea ? "All Regional Councils" : "Select Area First"}</option>
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
							<label className="block text-xs font-medium text-gray-700 mb-1">Head Name</label>
								<input
									type="text"
								placeholder="Enter Head Name"
								value={filterHeadName}
								onChange={(e) => {
									setFilterHeadName(e.target.value);
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">CNIC</label>
								<input
									type="text"
								placeholder="Enter CNIC"
								value={filterCnic}
								onChange={(e) => {
									setFilterCnic(e.target.value);
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Poverty Level</label>
								<select
								value={filterPovertyLevel}
								onChange={(e) => {
									setFilterPovertyLevel(e.target.value);
									setCurrentPage(1);
								}}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">All Poverty Levels</option>
								{filterOptions.povertyLevels.map(level => (
									<option key={level || ""} value={level || ""}>{level || ""}</option>
								))}
								</select>
						</div>
					</div>

					{/* Clear Filters Button */}
					{(filterFamilyId || filterProgram || filterArea || filterRegionalCouncil || filterLocalCouncil || filterJamatKhana || filterHeadName || filterCnic || filterPovertyLevel || searchTerm) && (
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
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Capita Income</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Family Member</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Type</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poverty Level</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedFamilies.length === 0 ? (
								<tr>
									<td colSpan={12} className="px-4 py-8 text-center text-gray-500">
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
											{family.CNIC || "N/A"}
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
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.POVERTY_LEVEL || "N/A"}
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

		</div>
	);
}
