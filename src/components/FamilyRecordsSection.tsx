"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, XCircle, CreditCard, RefreshCw, Users, FileText, MapPin, Hash, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

type FamilyRecord = {
	FormNumber: string;
	Full_Name: string;
	CNICNumber: string;
	RegionalCommunity: string;
	LocalCommunity: string;
	TotalMembers: number;
	peInvestmentSupportAmount: number;
	EconomicAmount: number;
	SocialSupportAmount: number;
	TotalPESupportAmount: number;
	InterventionPESupportAmount: number;
	EconomicAmountFromInterventions: number;
	SocialSupportAmountFromInterventions: number;
	TotalPESupportAmountFromInterventions: number;
};

type FamilyMember = {
	BeneficiaryID: string;
	FullName: string;
	BFormOrCNIC: string;
	Relationship: string;
	Gender: string;
	DOBMonth: number | null;
	DOBYear: number | null;
	MonthlyIncome: number | null;
	PEInvestmentAmount: number;
};

type MemberInterventions = {
	economic: boolean;
	education: boolean;
	food: boolean;
	habitat: boolean;
};

type FilterOptions = {
	sections: string[];
	categories: string[];
	statuses: string[];
};

type FamilyRecordsSectionProps = {
	baseRoute?: string;
	guidelines?: React.ReactNode;
};

export default function FamilyRecordsSection({ baseRoute = "/dashboard/actual-intervention", guidelines }: FamilyRecordsSectionProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	
	const [records, setRecords] = useState<FamilyRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [summary, setSummary] = useState<{
		totalPEInvestmentSupportAmount: number;
		totalSocialSupport: number;
	}>({
		totalPEInvestmentSupportAmount: 0,
		totalSocialSupport: 0,
	});

	// Filter state
	const [filters, setFilters] = useState({
		search: searchParams.get("q") || "",
		cnic: searchParams.get("cnic") || "",
		section: searchParams.get("section") || "All",
		category: searchParams.get("category") || "All",
		status: searchParams.get("status") || "All",
		from: searchParams.get("from") || "",
		to: searchParams.get("to") || "",
		page: parseInt(searchParams.get("page") || "1"),
		pageSize: parseInt(searchParams.get("pageSize") || "20"),
	});

	const [totalCount, setTotalCount] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [filterOptions, setFilterOptions] = useState<FilterOptions>({
		sections: [],
		categories: [],
		statuses: [],
	});

	// Local state for search input (not synced to URL until Filter button clicked)
	const [localSearch, setLocalSearch] = useState(searchParams.get("q") || "");
	const [localCnic, setLocalCnic] = useState(searchParams.get("cnic") || "");

	// Member modal state
	const [showMemberModal, setShowMemberModal] = useState(false);
	const [selectedFormNumber, setSelectedFormNumber] = useState<string | null>(null);
	const [members, setMembers] = useState<FamilyMember[]>([]);
	const [memberInterventions, setMemberInterventions] = useState<Record<string, MemberInterventions>>({});
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [memberError, setMemberError] = useState<string | null>(null);

	// Load filter options on mount
	useEffect(() => {
		const loadFilterOptions = async () => {
			try {
				const response = await fetch("/api/actual-intervention/filter-options");
				const data = await response.json();
				if (data.success && data.options) {
					setFilterOptions(data.options);
				}
			} catch (err) {
				console.error("Error loading filter options:", err);
			}
		};
		loadFilterOptions();
	}, []);

	// Update URL when filters change
	const updateURL = useCallback((newFilters: typeof filters) => {
		const params = new URLSearchParams();
		if (newFilters.search) params.set("q", newFilters.search);
		if (newFilters.cnic) params.set("cnic", newFilters.cnic);
		if (newFilters.section && newFilters.section !== "All") params.set("section", newFilters.section);
		if (newFilters.category && newFilters.category !== "All") params.set("category", newFilters.category);
		if (newFilters.status && newFilters.status !== "All") params.set("status", newFilters.status);
		if (newFilters.from) params.set("from", newFilters.from);
		if (newFilters.to) params.set("to", newFilters.to);
		if (newFilters.page > 1) params.set("page", newFilters.page.toString());
		if (newFilters.pageSize !== 20) params.set("pageSize", newFilters.pageSize.toString());
		
		router.push(`${baseRoute}?${params.toString()}`, { scroll: false });
	}, [router, baseRoute]);

	// Sync filters from URL params on mount/change
	useEffect(() => {
		const newFilters = {
			search: searchParams.get("q") || "",
			cnic: searchParams.get("cnic") || "",
			section: searchParams.get("section") || "All",
			category: searchParams.get("category") || "All",
			status: searchParams.get("status") || "All",
			from: searchParams.get("from") || "",
			to: searchParams.get("to") || "",
			page: parseInt(searchParams.get("page") || "1"),
			pageSize: parseInt(searchParams.get("pageSize") || "20"),
		};
		setFilters(newFilters);
		setLocalSearch(newFilters.search);
		setLocalCnic(newFilters.cnic);
	}, [searchParams]);

	useEffect(() => {
		fetchFamilies();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);

			// Build query string from filters
			const params = new URLSearchParams();
			if (filters.search) params.set("q", filters.search);
			if (filters.cnic) params.set("cnic", filters.cnic);
			if (filters.section && filters.section !== "All") params.set("section", filters.section);
			if (filters.category && filters.category !== "All") params.set("category", filters.category);
			if (filters.status && filters.status !== "All") params.set("status", filters.status);
			if (filters.from) params.set("from", filters.from);
			if (filters.to) params.set("to", filters.to);
			params.set("page", filters.page.toString());
			params.set("pageSize", filters.pageSize.toString());

			// Use ROPS API if baseRoute is /dashboard/rops, otherwise use actual-intervention API
			const apiEndpoint = baseRoute === "/dashboard/rops" 
				? `/api/rops/families?${params.toString()}`
				: `/api/actual-intervention?${params.toString()}`;

			const response = await fetch(apiEndpoint);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setError(data?.message || "Failed to load families");
				return;
			}

			setRecords(data.records || []);
			setTotalCount(data.totalCount || 0);
			setTotalPages(data.totalPages || 0);
			setSummary(data.summary || {
				totalPEInvestmentSupportAmount: 0,
				totalSocialSupport: 0,
			});
		} catch (err) {
			console.error("Error fetching families:", err);
			setError("Error fetching families");
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (key: keyof typeof filters, value: string | number) => {
		const newFilters = { ...filters, [key]: value, page: 1 }; // Reset to page 1 on filter change
		setFilters(newFilters);
		updateURL(newFilters);
	};

	const handleSearchChange = (value: string) => {
		setLocalSearch(value);
		// Don't update filters or URL - only update on Filter button click
	};

	const handleCnicChange = (value: string) => {
		setLocalCnic(value);
		// Don't update filters or URL - only update on Filter button click
	};

	const handleApplyFilters = () => {
		const newFilters = { ...filters, search: localSearch, cnic: localCnic, page: 1 };
		setFilters(newFilters);
		updateURL(newFilters);
	};

	const handleClearFilters = () => {
		const clearedFilters = {
			search: "",
			cnic: "",
			section: "All",
			category: "All",
			status: "All",
			from: "",
			to: "",
			page: 1,
			pageSize: 20,
		};
		setFilters(clearedFilters);
		setLocalSearch("");
		setLocalCnic("");
		updateURL(clearedFilters);
	};

	const handleRemoveFilter = (key: keyof typeof filters) => {
		if (key === "search") {
			handleFilterChange("search", "");
			setLocalSearch("");
		} else if (key === "cnic") {
			handleFilterChange("cnic", "");
			setLocalCnic("");
		} else if (key === "section") {
			handleFilterChange("section", "All");
		} else if (key === "category") {
			handleFilterChange("category", "All");
		} else if (key === "status") {
			handleFilterChange("status", "All");
		} else if (key === "from") {
			handleFilterChange("from", "");
		} else if (key === "to") {
			handleFilterChange("to", "");
		}
	};

	const getActiveFilters = () => {
		const active: Array<{ key: keyof typeof filters; label: string; value: string }> = [];
		if (filters.search) active.push({ key: "search", label: "Search", value: filters.search });
		if (filters.cnic) active.push({ key: "cnic", label: "CNIC", value: filters.cnic });
		if (filters.section && filters.section !== "All") active.push({ key: "section", label: "Section", value: filters.section });
		if (filters.category && filters.category !== "All") active.push({ key: "category", label: "Category", value: filters.category });
		if (filters.status && filters.status !== "All") active.push({ key: "status", label: "Status", value: filters.status });
		if (filters.from) active.push({ key: "from", label: "From Date", value: filters.from });
		if (filters.to) active.push({ key: "to", label: "To Date", value: filters.to });
		return active;
	};

	const handleShowMembers = async (formNumber: string) => {
		setSelectedFormNumber(formNumber);
		setShowMemberModal(true);
		setLoadingMembers(true);
		setMemberError(null);
		setMembers([]);
		setMemberInterventions({});

		try {
			// Use ROPS API if baseRoute is /dashboard/rops, otherwise use actual-intervention API
			const apiEndpoint = baseRoute === "/dashboard/rops"
				? `/api/rops/members?formNumber=${encodeURIComponent(formNumber)}`
				: `/api/actual-intervention/members?formNumber=${encodeURIComponent(formNumber)}`;

			const response = await fetch(apiEndpoint);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setMemberError(data?.message || "Failed to load members");
				return;
			}

			setMembers(data.members || []);
			setMemberInterventions(data.interventions || {});
		} catch (err) {
			console.error("Error fetching members:", err);
			setMemberError("Error fetching members");
		} finally {
			setLoadingMembers(false);
		}
	};

	const handleInterventionClick = (formNumber: string, interventionType: string, memberId: string) => {
		router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}/add?type=${interventionType}&memberId=${encodeURIComponent(memberId)}`);
	};

	const handleBankAccountClick = (formNumber: string, memberId: string) => {
		router.push(`/dashboard/actual-intervention/bank-account?formNumber=${encodeURIComponent(formNumber)}&memberId=${encodeURIComponent(memberId)}`);
	};

	const formatDateOfBirth = (month: number | null, year: number | null): string => {
		if (!month || !year) return "N/A";
		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		return `${monthNames[month - 1] || month} ${year}`;
	};

	const formatRegionalLocal = (regional: string | null, local: string | null): string => {
		const parts = [];
		if (regional) parts.push(regional);
		if (local) parts.push(local);
		return parts.length > 0 ? parts.join(" / ") : "N/A";
	};

	return (
		<>
			{loading ? (
				<div className="space-y-6">
					<div className="flex justify-between items-center bg-white rounded-xl shadow-md border border-gray-200 p-6">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
								Family Records
							</h1>
							<p className="text-gray-600 mt-2 font-medium">Manage family interventions and member details</p>
							{guidelines && (
								<div className="mt-4">
									{guidelines}
								</div>
							)}
						</div>
					</div>
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="text-center">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
							<p className="mt-4 text-gray-600 font-medium">Loading families...</p>
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
							Family Records
						</h1>
					</div>
					<p className="text-gray-600 mt-2 font-medium">Manage family interventions and member details</p>
					{guidelines && (
						<div className="mt-4">
							{guidelines}
						</div>
					)}
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchFamilies}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg font-semibold"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
					<div className="flex items-center gap-3">
						<XCircle className="h-5 w-5 text-red-600" />
						<p className="text-red-600 text-sm font-semibold">Error: {error}</p>
					</div>
				</div>
			)}

			{!error && (
				<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
					{/* Filter Bar */}
					<div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
						<div className="space-y-4">
							<div className="flex items-center gap-2 mb-4">
								<Filter className="h-5 w-5 text-gray-600" />
								<h3 className="text-lg font-semibold text-gray-900">Filters</h3>
							</div>
							
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{/* Search */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Search
									</label>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
										<input
											type="text"
											value={localSearch}
											onChange={(e) => handleSearchChange(e.target.value)}
											placeholder="FormNumber / Family Head / MemberNo"
											className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										/>
									</div>
								</div>

								{/* CNIC Search */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Search by CNIC
									</label>
									<div className="relative">
										<Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
										<input
											type="text"
											value={localCnic}
											onChange={(e) => handleCnicChange(e.target.value)}
											placeholder="CNIC Number"
											className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										/>
									</div>
								</div>

								{/* Filter Button */}
								<div className="flex items-end">
									<button
										type="button"
										onClick={handleApplyFilters}
										className="w-full px-4 py-2 bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] text-white rounded-md hover:from-[#0a3d22] hover:to-[#0b4d2b] transition-all font-medium flex items-center justify-center gap-2"
									>
										<Filter className="h-4 w-4" />
										Filter
									</button>
								</div>

								{/* Clear Filters Button */}
								<div className="flex items-end">
									<button
										type="button"
										onClick={handleClearFilters}
										className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
									>
										Clear Filters
									</button>
								</div>
							</div>

							{/* Active Filters Chips */}
							{getActiveFilters().length > 0 && (
								<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
									<span className="text-sm font-medium text-gray-700">Active Filters:</span>
									{getActiveFilters().map((filter) => (
										<span
											key={filter.key}
											className="inline-flex items-center gap-1 px-3 py-1 bg-[#0b4d2b] text-white rounded-full text-sm"
										>
											{filter.label}: {filter.value}
											<button
												type="button"
												onClick={() => handleRemoveFilter(filter.key)}
												className="ml-1 hover:bg-white/20 rounded-full p-0.5"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Table Header Section */}
					<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b] px-6 py-4 border-b-2 border-[#0a3d22]">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-bold text-white flex items-center gap-2">
									<Users className="h-5 w-5" />
									Family Records
								</h3>
								<p className="text-sm text-white/80 mt-1">
							Total Families: {totalCount} {totalCount !== records.length && `(Showing ${records.length} of ${totalCount})`}
						</p>
							</div>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4" />
											Form #
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										Full Name
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<Hash className="h-4 w-4" />
											CNIC
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<MapPin className="h-4 w-4" />
											Regional / Local
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										FDP-PE Support
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										Intervention-PE-Suppport
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{records.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-6 py-16 text-center">
											<div className="flex flex-col items-center justify-center">
												<div className="p-4 bg-gray-100 rounded-full mb-4">
													<Users className="h-8 w-8 text-gray-400" />
												</div>
												<p className="text-lg font-semibold text-gray-700">No families found</p>
												<p className="text-sm text-gray-500 mt-2">No family records available for your account</p>
											</div>
										</td>
									</tr>
								) : (
									records.map((record, index) => (
										<tr 
											key={record.FormNumber} 
											className={`transition-all duration-150 ${
												index % 2 === 0 
													? 'bg-white hover:bg-blue-50' 
													: 'bg-gray-50 hover:bg-blue-100'
											}`}
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm font-semibold text-[#0b4d2b]">{record.FormNumber || "N/A"}</span>
											</td>
											<td className="px-6 py-4">
												<span className="text-sm font-medium text-gray-900">{record.Full_Name || "N/A"}</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-gray-700">{record.CNICNumber || "N/A"}</span>
											</td>
											<td className="px-6 py-4">
												<span className="text-sm text-gray-700">
													{formatRegionalLocal(record.RegionalCommunity, record.LocalCommunity)}
												</span>
											</td>
											<td className="px-6 py-4">
												<div className="space-y-1">
													<div className="text-sm">
														<span className="font-medium text-gray-700">Economic | </span>
														<span className="font-semibold text-gray-900">{(record.EconomicAmount || 0).toLocaleString()}</span>
													</div>
													<div className="text-sm">
														<span className="font-medium text-gray-700">Social Support | </span>
														<span className="font-semibold text-gray-900">{(record.SocialSupportAmount || 0).toLocaleString()}</span>
													</div>
													<div className="text-sm pt-1 border-t border-gray-200">
														<span className="font-bold text-[#0b4d2b]">Total PE-Support | </span>
														<span className="font-bold text-[#0b4d2b]">{(record.TotalPESupportAmount || 0).toLocaleString()}</span>
													</div>
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="space-y-1">
													<div className="text-sm">
														<span className="font-medium text-gray-700">Economic | </span>
														<span className="font-semibold text-gray-900">{(record.EconomicAmountFromInterventions || 0).toLocaleString()}</span>
													</div>
													<div className="text-sm">
														<span className="font-medium text-gray-700">Social Support | </span>
														<span className="font-semibold text-gray-900">{(record.SocialSupportAmountFromInterventions || 0).toLocaleString()}</span>
													</div>
													<div className="text-sm pt-1 border-t border-gray-200">
														<span className="font-bold text-[#0b4d2b]">Total PE-Support | </span>
														<span className="font-bold text-[#0b4d2b]">{(record.TotalPESupportAmountFromInterventions || 0).toLocaleString()}</span>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<button
													type="button"
													onClick={() => handleShowMembers(record.FormNumber)}
													className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
												>
													<Eye className="h-4 w-4" />
													View Members
												</button>
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
								Showing page {filters.page} of {totalPages} ({totalCount} total records)
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => handleFilterChange("page", Math.max(1, filters.page - 1))}
									disabled={filters.page === 1}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
								>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</button>
								<div className="flex items-center gap-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (filters.page <= 3) {
											pageNum = i + 1;
										} else if (filters.page >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = filters.page - 2 + i;
										}
										return (
											<button
												key={pageNum}
												type="button"
												onClick={() => handleFilterChange("page", pageNum)}
												className={`px-3 py-2 border rounded-md text-sm font-medium ${
													filters.page === pageNum
														? "bg-[#0b4d2b] text-white border-[#0b4d2b]"
														: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
												}`}
											>
												{pageNum}
											</button>
										);
									})}
								</div>
								<button
									type="button"
									onClick={() => handleFilterChange("page", Math.min(totalPages, filters.page + 1))}
									disabled={filters.page === totalPages}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Member Modal */}
			{showMemberModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowMemberModal(false);
								setSelectedFormNumber(null);
								setMembers([]);
								setMemberInterventions({});
							}}
						></div>
						<div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b]">
								<div>
									<h2 className="text-2xl font-bold text-white flex items-center gap-2">
										<Users className="h-6 w-6" />
										Family Members
									</h2>
									<p className="text-sm text-white/80 mt-1">Form Number: {selectedFormNumber}</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-gray-200"
								>
									<XCircle className="h-6 w-6" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingMembers ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading members...</span>
										</div>
									</div>
								) : memberError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{memberError}
									</div>
								) : members.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<p className="text-gray-600">No members found for this family.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
														<tr>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Member No
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Full Name
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																B-Form/CNIC
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Relationship
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Gender
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Date of Birth
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																PE Investment Amount
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
																Interventions
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{members.map((member, index) => {
															const memberKey = member.BeneficiaryID;
															const interventions = memberInterventions[memberKey] || {
																economic: false,
																education: false,
																food: false,
																habitat: false,
															};

															return (
																<tr 
																	key={memberKey} 
																	className={`transition-colors ${
																		index % 2 === 0 
																			? "bg-white hover:bg-blue-50" 
																			: "bg-gray-50 hover:bg-blue-50"
																	}`}
																>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm font-semibold text-[#0b4d2b]">{memberKey || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm font-medium text-gray-900">{member.FullName || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm text-gray-700">{member.BFormOrCNIC || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
																			{member.Relationship || "N/A"}
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
																			{member.Gender || "N/A"}
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm text-gray-700">{formatDateOfBirth(member.DOBMonth, member.DOBYear)}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		{member.PEInvestmentAmount > 0 ? (
																			<span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">
																				PKR {member.PEInvestmentAmount.toLocaleString()}
																			</span>
																		) : (
																			<span className="text-sm text-gray-400">N/A</span>
																		)}
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm">
																		{interventions.economic || interventions.education || interventions.food || interventions.habitat ? (
																			<div className="flex flex-wrap gap-2">
																				{interventions.economic && (
																					<>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "economic", memberKey)}
																							className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer"
																						>
																							Economic
																						</button>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleBankAccountClick(selectedFormNumber, memberKey)}
																							className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer"
																						>
																							<CreditCard className="h-3.5 w-3.5" />
																							Bank Account
																						</button>
																					</>
																				)}
																				{interventions.education && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "education", memberKey)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 transition-all cursor-pointer"
																					>
																						Education
																					</button>
																				)}
																				{interventions.food && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "food", memberKey)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md hover:from-amber-700 hover:to-amber-800 transition-all cursor-pointer"
																					>
																						Food
																					</button>
																				)}
																				{interventions.habitat && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "habitat", memberKey)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer"
																					>
																						Habitat
																					</button>
																				)}
																			</div>
																		) : (
																			<span className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 italic">
																				No intervention defined in FDP
																			</span>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="px-6 py-2.5 bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] text-white rounded-lg text-sm font-semibold hover:from-[#0a3d22] hover:to-[#0b4d2b] transition-all shadow-md hover:shadow-lg"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
			)}
		</>
	);
}
