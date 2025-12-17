"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

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
	AREA_TYPE: string | null;
	FAMILY_PROGRESS_STATUS: string | null;
	MENTOR: string | null;
	FDP_APPROVED_DATE: string | null;
	FAMILY_TYPE: string | null;
	CRC_APPROVAL_FAMILY_INCOME: string | null;
	EXPECTED_GRADUCATION_DATE: string | null;
	PROGRAM_TYPE: string | null;
	FAMILY_FROM: string | null;
	TOTAL_MEMBERS: number | null;
	STATUS_DATE: string | null;
};

export default function DashboardPage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Dashboard");
	const [families, setFamilies] = useState<FamilyData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterProgram, setFilterProgram] = useState("");
	const [filterArea, setFilterArea] = useState("");
	const [filterRegionalCouncil, setFilterRegionalCouncil] = useState("");
	const [filterLocalCouncil, setFilterLocalCouncil] = useState("");
	const [filterJamatKhana, setFilterJamatKhana] = useState("");
	const [filterFamilyStatus, setFilterFamilyStatus] = useState("");
	const [filterFamilyId, setFilterFamilyId] = useState("");
	const [filterHeadName, setFilterHeadName] = useState("");
	const [filterApprovalYear, setFilterApprovalYear] = useState("");
	const [filterApprovalMonth, setFilterApprovalMonth] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;
	const [selectedFamily, setSelectedFamily] = useState<FamilyData | null>(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/families');
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

	const handleFamilyIdClick = (family: FamilyData) => {
		setSelectedFamily(family);
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setSelectedFamily(null);
	};

	// Get unique values for filters with cascading logic
	const uniquePrograms = Array.from(new Set(families.map(f => f.PROGRAM).filter(Boolean))).sort();
	const uniqueAreas = Array.from(new Set(families.map(f => f.AREA).filter(Boolean))).sort();
	const uniqueFamilyStatuses = Array.from(new Set(families.map(f => f.FAMILY_PROGRESS_STATUS).filter(Boolean))).sort();
	
	// Filter Regional Councils based on selected Area and Program
	const filteredForRegionalCouncil = families.filter(f => {
		if (filterArea && f.AREA !== filterArea) return false;
		if (filterProgram && f.PROGRAM !== filterProgram) return false;
		return true;
	});
	const uniqueRegionalCouncils = Array.from(new Set(filteredForRegionalCouncil.map(f => f.REGIONAL_COUNCIL).filter(Boolean))).sort();
	
	// Filter Local Councils based on selected Area, Program, and Regional Council
	const filteredForLocalCouncil = families.filter(f => {
		if (filterArea && f.AREA !== filterArea) return false;
		if (filterProgram && f.PROGRAM !== filterProgram) return false;
		if (filterRegionalCouncil && f.REGIONAL_COUNCIL !== filterRegionalCouncil) return false;
		return true;
	});
	const uniqueLocalCouncils = Array.from(new Set(filteredForLocalCouncil.map(f => f.LOCAL_COUNCIL).filter(Boolean))).sort();
	
	// Filter Jamat Khanas based on selected Area, Program, Regional Council, and Local Council
	const filteredForJamatKhana = families.filter(f => {
		if (filterArea && f.AREA !== filterArea) return false;
		if (filterProgram && f.PROGRAM !== filterProgram) return false;
		if (filterRegionalCouncil && f.REGIONAL_COUNCIL !== filterRegionalCouncil) return false;
		if (filterLocalCouncil && f.LOCAL_COUNCIL !== filterLocalCouncil) return false;
		return true;
	});
	const uniqueJamatKhanas = Array.from(new Set(filteredForJamatKhana.map(f => f.JAMAT_KHANA).filter(Boolean))).sort();

	// Filter families based on search term and filters
	const filteredFamilies = families.filter(family => {
		// Search term filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			const matchesSearch = (
				(family.FAMILY_ID?.toLowerCase().includes(search)) ||
				(family.HEAD_NAME?.toLowerCase().includes(search)) ||
				(family.CNIC?.toLowerCase().includes(search)) ||
				(family.AREA?.toLowerCase().includes(search)) ||
				(family.PROGRAM?.toLowerCase().includes(search)) ||
				(family.REGIONAL_COUNCIL?.toLowerCase().includes(search)) ||
				(family.LOCAL_COUNCIL?.toLowerCase().includes(search))
			);
			if (!matchesSearch) return false;
		}

		// Program filter
		if (filterProgram && family.PROGRAM !== filterProgram) return false;

		// Area filter
		if (filterArea && family.AREA !== filterArea) return false;

		// Regional Council filter
		if (filterRegionalCouncil && family.REGIONAL_COUNCIL !== filterRegionalCouncil) return false;

		// Local Council filter
		if (filterLocalCouncil && family.LOCAL_COUNCIL !== filterLocalCouncil) return false;

		// Jamat Khana filter
		if (filterJamatKhana && family.JAMAT_KHANA !== filterJamatKhana) return false;

		// Family Status filter
		if (filterFamilyStatus && family.FAMILY_PROGRESS_STATUS !== filterFamilyStatus) return false;

		// Family ID filter
		if (filterFamilyId && family.FAMILY_ID && !family.FAMILY_ID.toLowerCase().includes(filterFamilyId.toLowerCase())) return false;

		// Head Name filter
		if (filterHeadName && family.HEAD_NAME && !family.HEAD_NAME.toLowerCase().includes(filterHeadName.toLowerCase())) return false;

		// Approval Date filter (by year and/or month)
		if (filterApprovalYear || filterApprovalMonth) {
			if (!family.FDP_APPROVED_DATE) return false;
			const approvalDate = new Date(family.FDP_APPROVED_DATE);
			if (isNaN(approvalDate.getTime())) return false;
			
			const approvalYear = approvalDate.getFullYear().toString();
			const approvalMonth = (approvalDate.getMonth() + 1).toString().padStart(2, '0');
			
			if (filterApprovalYear && approvalYear !== filterApprovalYear) return false;
			if (filterApprovalMonth && approvalMonth !== filterApprovalMonth) return false;
		}

		return true;
	});

	const clearFilters = () => {
		setSearchTerm("");
		setFilterProgram("");
		setFilterArea("");
		setFilterRegionalCouncil("");
		setFilterLocalCouncil("");
		setFilterJamatKhana("");
		setFilterFamilyStatus("");
		setFilterFamilyId("");
		setFilterHeadName("");
		setFilterApprovalYear("");
		setFilterApprovalMonth("");
		setCurrentPage(1);
	};

	const exportToExcel = () => {
		try {
			// Export only the data visible in the gridview (all filtered data, not just current page)
			// Prepare headers matching the table columns
			const headers = [
				"Family ID",
				"Head Name",
				"CNIC",
				"Program",
				"Area",
				"Regional Council",
				"Local Council",
				"Jamat Khana",
				"Age",
				"Total Members",
				"Status",
				"FDP Approved Date"
			];

			// Convert data to CSV format
			const csvRows = [];
			
			// Add headers
			csvRows.push(headers.join(","));

			// Add data rows - export all filtered families (not just current page)
			filteredFamilies.forEach(family => {
				const row = [
					family.FAMILY_ID || "N/A",
					family.HEAD_NAME || "N/A",
					family.CNIC || "N/A",
					family.PROGRAM || "N/A",
					family.AREA || "N/A",
					family.REGIONAL_COUNCIL || "N/A",
					family.LOCAL_COUNCIL || "N/A",
					family.JAMAT_KHANA || "N/A",
					family.AGE?.toString() || "N/A",
					family.TOTAL_MEMBERS?.toString() || "N/A",
					family.FAMILY_PROGRESS_STATUS || "N/A",
					family.FDP_APPROVED_DATE ? formatDate(family.FDP_APPROVED_DATE) : "N/A"
				];
				// Escape commas and quotes in CSV
				csvRows.push(row.map(cell => {
					const cellStr = String(cell);
					if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
						return `"${cellStr.replace(/"/g, '""')}"`;
					}
					return cellStr;
				}).join(","));
			});

			// Create CSV content
			const csvContent = csvRows.join("\n");
			
			// Add BOM for UTF-8 to ensure Excel opens it correctly
			const BOM = "\uFEFF";
			const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
			
			// Create download link
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			
			// Generate filename with current date
			const date = new Date();
			const dateStr = date.toISOString().split('T')[0];
			link.setAttribute("download", `SJDA_Families_Export_${dateStr}.csv`);
			
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			// Clean up the URL object
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
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Welcome to the SJDA Dashboard</p>
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
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Welcome to the SJDA Dashboard</p>
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

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="Dashboard" />;
	}

	// Show loading while checking access
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Welcome to the SJDA Dashboard</p>
				</div>
				<button
					onClick={exportToExcel}
					disabled={filteredFamilies.length === 0}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
				>
					<Download className="h-4 w-4" />
					Export to Excel
				</button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Total Families</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{families.length}</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Filtered Results</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{filteredFamilies.length}</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Total Members</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">
						{families.reduce((sum, f) => sum + (f.TOTAL_MEMBERS || 0), 0)}
					</p>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Programs</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">
						{new Set(families.map(f => f.PROGRAM).filter(Boolean)).size}
					</p>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="space-y-4">
					{/* Search Bar */}
					<div>
						<input
							type="text"
							placeholder="Search by Family ID, Head Name, CNIC, Area, Program..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>

					{/* Filter Dropdowns */}
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Program</label>
							<select
								value={filterProgram}
								onChange={(e) => {
									setFilterProgram(e.target.value);
									// Clear child filters when parent changes
									setFilterRegionalCouncil("");
									setFilterLocalCouncil("");
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Programs</option>
								{uniquePrograms.map(program => (
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
									// Clear child filters when parent changes
									setFilterRegionalCouncil("");
									setFilterLocalCouncil("");
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Areas</option>
								{uniqueAreas.map(area => (
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
									// Clear child filters when parent changes
									setFilterLocalCouncil("");
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								disabled={filterArea === "" && filterProgram === ""}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{(filterArea || filterProgram) ? "All Regional Councils" : "Select Area or Program First"}</option>
								{uniqueRegionalCouncils.map(rc => (
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
									// Clear child filters when parent changes
									setFilterJamatKhana("");
									setCurrentPage(1);
								}}
								disabled={filterRegionalCouncil === ""}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{filterRegionalCouncil ? "All Local Councils" : "Select Regional Council First"}</option>
								{uniqueLocalCouncils.map(lc => (
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
								disabled={filterLocalCouncil === ""}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">{filterLocalCouncil ? "All Jamat Khanas" : "Select Local Council First"}</option>
								{uniqueJamatKhanas.map(jk => (
									<option key={jk || ""} value={jk || ""}>{jk || ""}</option>
								))}
							</select>
						</div>
					</div>

					{/* Additional Filters */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-gray-200">
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
							<label className="block text-xs font-medium text-gray-700 mb-1">Family Status</label>
							<select
								value={filterFamilyStatus}
								onChange={(e) => {
									setFilterFamilyStatus(e.target.value);
									setCurrentPage(1);
								}}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Statuses</option>
								{uniqueFamilyStatuses.map(status => (
									<option key={status || ""} value={status || ""}>{status || ""}</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">FDP Approved Date</label>
							<div className="flex gap-2">
								<select
									value={filterApprovalYear}
									onChange={(e) => {
										setFilterApprovalYear(e.target.value);
										if (!e.target.value) setFilterApprovalMonth("");
										setCurrentPage(1);
									}}
									className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">All Years</option>
									{Array.from(new Set(families
										.map(f => f.FDP_APPROVED_DATE ? new Date(f.FDP_APPROVED_DATE).getFullYear() : null)
										.filter((year): year is number => year !== null && !isNaN(year))
									)).sort((a, b) => b - a).map(year => (
										<option key={year} value={year.toString()}>{year}</option>
									))}
								</select>
								<select
									value={filterApprovalMonth}
									onChange={(e) => {
										setFilterApprovalMonth(e.target.value);
										setCurrentPage(1);
									}}
									disabled={!filterApprovalYear}
									className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">All Months</option>
									{filterApprovalYear && Array.from(new Set(families
										.filter(f => {
											if (!f.FDP_APPROVED_DATE) return false;
											const date = new Date(f.FDP_APPROVED_DATE);
											return !isNaN(date.getTime()) && date.getFullYear().toString() === filterApprovalYear;
										})
										.map(f => {
											const date = new Date(f.FDP_APPROVED_DATE!);
											return (date.getMonth() + 1).toString().padStart(2, '0');
										})
										.filter(Boolean)
									)).sort().map(month => {
										const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
										return (
											<option key={month} value={month}>
												{monthNames[parseInt(month) - 1]}
											</option>
										);
									})}
								</select>
							</div>
						</div>
					</div>

					{/* Clear Filters Button */}
					{(filterProgram || filterArea || filterRegionalCouncil || filterLocalCouncil || filterJamatKhana || filterFamilyStatus || filterFamilyId || filterHeadName || filterApprovalYear || filterApprovalMonth || searchTerm) && (
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
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jamat Khana</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Members</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FDP Approved Date</th>
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
											{family.HEAD_NAME || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.CNIC || "N/A"}
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
											{family.AGE || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.TOTAL_MEMBERS || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.FAMILY_PROGRESS_STATUS || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatDate(family.FDP_APPROVED_DATE)}
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

			{/* Family Details Modal */}
			{showModal && selectedFamily && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						{/* Modal Header */}
						<div className="sticky top-0 bg-[#0b4d2b] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
							<h2 className="text-2xl font-bold">Family Details - {selectedFamily.FAMILY_ID || "N/A"}</h2>
							<button
								onClick={closeModal}
								className="text-white hover:text-gray-200 transition-colors"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						{/* Modal Body */}
						<div className="p-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Family ID</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.FAMILY_ID || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Head Name</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.HEAD_NAME || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">CNIC</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.CNIC || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.AGE || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Program</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.PROGRAM || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Program Type</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.PROGRAM_TYPE || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Area</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.AREA || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Area Type</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.AREA_TYPE || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Regional Council</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.REGIONAL_COUNCIL || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Local Council</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.LOCAL_COUNCIL || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Jamat Khana</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.JAMAT_KHANA || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Total Members</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.TOTAL_MEMBERS || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Family Progress Status</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.FAMILY_PROGRESS_STATUS || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Family Type</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.FAMILY_TYPE || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Mentor</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.MENTOR || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Family From</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.FAMILY_FROM || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">FDP Approved Date</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formatDate(selectedFamily.FDP_APPROVED_DATE)}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Expected Graduation Date</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formatDate(selectedFamily.EXPECTED_GRADUCATION_DATE)}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">CRC Approval Family Income</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedFamily.CRC_APPROVAL_FAMILY_INCOME || "N/A"}</p>
								</div>

								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-1">Status Date</label>
									<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formatDate(selectedFamily.STATUS_DATE)}</p>
								</div>
							</div>
						</div>

						{/* Modal Footer */}
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
