"use client";

import { useEffect, useState } from "react";
import { Search, Grid, List } from "lucide-react";

type ROPData = {
	FAMILY_ID?: string;
	PROGRAM?: string;
	AREA?: string;
	Regional_Council?: string;
	Local_Council?: string;
	Head_Name?: string;
	Family_Progress_Status?: string;
	MENTOR?: string;
	FDP_Approved_Date?: string;
	INTERVENTION_ID?: number;
	Intervention_Framework_Dimensions?: string;
	Main_Intervention?: string;
	Intervention_Amount?: number;
	ACTIVE?: string;
	MEMBER_ID?: string;
	Amount_Type?: string;
	Month_ROP?: string;
	ROP_Amount?: number;
	Payment_Type?: string;
};

export default function ROPsPage() {
	const [rops, setRops] = useState<ROPData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
	const [filters, setFilters] = useState({
		interventionId: "",
		monthRop: "",
		mentor: "",
		paymentType: "",
		familyId: "",
		headName: "",
		program: "",
		regionalCouncil: "",
		localCouncil: "",
		familyStatus: "",
	});
	const [programs, setPrograms] = useState<string[]>([]);
	const [regionalCouncils, setRegionalCouncils] = useState<string[]>([]);
	const [localCouncils, setLocalCouncils] = useState<string[]>([]);
	const [mentors, setMentors] = useState<string[]>([]);
	const [familyStatuses, setFamilyStatuses] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	const fetchROPs = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.interventionId) params.append("interventionId", filters.interventionId);
			if (filters.monthRop) params.append("monthRop", filters.monthRop);
			if (filters.mentor) params.append("mentor", filters.mentor);
			if (filters.paymentType) params.append("paymentType", filters.paymentType);
			if (filters.familyId) params.append("familyId", filters.familyId);
			if (filters.headName) params.append("headName", filters.headName);
			if (filters.program) params.append("program", filters.program);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);
			if (filters.localCouncil) params.append("localCouncil", filters.localCouncil);
			if (filters.familyStatus) params.append("familyStatus", filters.familyStatus);

			const response = await fetch(`/api/rops?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setRops(data.rops || []);
			} else {
				setError(data.message || "Failed to fetch ROPs");
			}
		} catch (err) {
			setError("Error fetching ROPs");
			console.error("Error fetching ROPs:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchROPs();
		fetchDropdownOptions();
	}, []);

	const fetchDropdownOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch(`/api/rops?getOptions=true`);
			const data = await response.json();

			if (data.success) {
				setPrograms(data.programs || []);
				setRegionalCouncils(data.regionalCouncils || []);
				setLocalCouncils(data.localCouncils || []);
				setMentors(data.mentors || []);
				setFamilyStatuses(data.familyStatuses || []);
			}
		} catch (err) {
			console.error("Error fetching dropdown options:", err);
		} finally {
			setLoadingOptions(false);
		}
	};

	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFilters(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleFilterSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		fetchROPs();
	};

	const handleClearFilters = () => {
		setFilters({
			interventionId: "",
			monthRop: "",
			mentor: "",
			paymentType: "",
			familyId: "",
			headName: "",
			program: "",
			regionalCouncil: "",
			localCouncil: "",
			familyStatus: "",
		});
		fetchROPs();
	};

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | undefined) => {
		if (!amount) return "N/A";
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'PKR'
		}).format(amount);
	};

	// Calculate month-wise totals and overall total
	const calculateTotals = () => {
		const monthTotals: { [key: string]: number } = {};
		let overallTotal = 0;

		rops.forEach(rop => {
			if (rop.Month_ROP && rop.ROP_Amount) {
				const month = rop.Month_ROP;
				if (!monthTotals[month]) {
					monthTotals[month] = 0;
				}
				monthTotals[month] += rop.ROP_Amount;
				overallTotal += rop.ROP_Amount;
			}
		});

		return { monthTotals, overallTotal };
	};

	// Calculate totals by INTERVENTION_FRAMEWORK_DIMENSIONS
	const calculateDimensionTotals = () => {
		const dimensionData: {
			[key: string]: {
				families: Set<string>;
				members: Set<string>;
				totalAmount: number;
			}
		} = {};

		rops.forEach(rop => {
			const dimension = rop.Intervention_Framework_Dimensions || "Not Specified";
			
			if (!dimensionData[dimension]) {
				dimensionData[dimension] = {
					families: new Set(),
					members: new Set(),
					totalAmount: 0
				};
			}

			if (rop.FAMILY_ID) {
				dimensionData[dimension].families.add(rop.FAMILY_ID);
			}

			if (rop.MEMBER_ID) {
				dimensionData[dimension].members.add(rop.MEMBER_ID);
			}

			if (rop.ROP_Amount) {
				dimensionData[dimension].totalAmount += rop.ROP_Amount;
			}
		});

		return dimensionData;
	};

	const { monthTotals, overallTotal } = calculateTotals();
	const sortedMonths = Object.keys(monthTotals).sort();
	const dimensionTotals = calculateDimensionTotals();
	const sortedDimensions = Object.keys(dimensionTotals).sort();

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">ROPs</h1>
						<p className="text-gray-600 mt-2">Results and Outputs Progress</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">ROPs</h1>
						<p className="text-gray-600 mt-2">Results and Outputs Progress</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error}</p>
					<button
						onClick={fetchROPs}
						className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">ROPs</h1>
					<p className="text-gray-600 mt-2">Results and Outputs Progress</p>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<form onSubmit={handleFilterSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Family ID</label>
							<input
								type="text"
								name="familyId"
								value={filters.familyId}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Family ID"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Head Name</label>
							<input
								type="text"
								name="headName"
								value={filters.headName}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Head Name"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
							<select
								name="program"
								value={filters.program}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Programs</option>
								{programs.map((program) => (
									<option key={program} value={program}>{program}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
							<select
								name="regionalCouncil"
								value={filters.regionalCouncil}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Regional Councils</option>
								{regionalCouncils.map((rc) => (
									<option key={rc} value={rc}>{rc}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
							<select
								name="localCouncil"
								value={filters.localCouncil}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Local Councils</option>
								{localCouncils.map((lc) => (
									<option key={lc} value={lc}>{lc}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Intervention ID</label>
							<input
								type="text"
								name="interventionId"
								value={filters.interventionId}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Intervention ID"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Month ROP</label>
							<input
								type="text"
								name="monthRop"
								value={filters.monthRop}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Month ROP"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
							<select
								name="mentor"
								value={filters.mentor}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Mentors</option>
								{mentors.map((mentor) => (
									<option key={mentor} value={mentor}>{mentor}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Family Status</label>
							<select
								name="familyStatus"
								value={filters.familyStatus}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Family Statuses</option>
								{familyStatuses.map((status) => (
									<option key={status} value={status}>{status}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
							<input
								type="text"
								name="paymentType"
								value={filters.paymentType}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Payment Type"
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<button
							type="submit"
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							<Search className="h-4 w-4" />
							Search
						</button>
						<button
							type="button"
							onClick={handleClearFilters}
							className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							Clear Filters
						</button>
					</div>
				</form>
			</div>

			{/* Summary by INTERVENTION_FRAMEWORK_DIMENSIONS */}
			{sortedDimensions.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h3 className="text-xl font-bold text-gray-900 mb-6">Summary by Intervention Framework Dimensions</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{sortedDimensions.map((dimension) => {
							const data = dimensionTotals[dimension];
							const totalFamilies = data.families.size;
							const totalMembers = data.members.size;
							const totalAmount = data.totalAmount;

							return (
								<div
									key={dimension}
									className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
								>
									<div className="bg-gradient-to-r from-[#0b4d2b] to-[#0a3d22] p-4">
										<h4 className="text-lg font-bold text-white line-clamp-2">
											{dimension}
										</h4>
									</div>
									<div className="p-6 space-y-4">
										<div className="flex items-center justify-between pb-3 border-b border-gray-200">
											<div className="flex items-center gap-3">
												<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
													<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
													</svg>
												</div>
												<div>
													<p className="text-sm font-medium text-gray-600">Total Families</p>
													<p className="text-2xl font-bold text-gray-900">{totalFamilies.toLocaleString()}</p>
												</div>
											</div>
										</div>
										<div className="flex items-center justify-between pb-3 border-b border-gray-200">
											<div className="flex items-center gap-3">
												<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
													<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
													</svg>
												</div>
												<div>
													<p className="text-sm font-medium text-gray-600">Total Members</p>
													<p className="text-2xl font-bold text-gray-900">{totalMembers.toLocaleString()}</p>
												</div>
											</div>
										</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-12 h-12 bg-[#0b4d2b] bg-opacity-10 rounded-full flex items-center justify-center">
													<svg className="w-6 h-6 text-[#0b4d2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
												<div>
													<p className="text-sm font-medium text-gray-600">Total Amount</p>
													<p className="text-2xl font-bold text-[#0b4d2b]">{formatCurrency(totalAmount)}</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}


			{/* Results */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
					<h3 className="text-lg font-medium text-gray-900">
						ROP Records ({rops.length})
					</h3>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-md transition-colors ${
								viewMode === "grid"
									? "bg-[#0b4d2b] text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
							title="Grid View"
						>
							<Grid className="h-4 w-4" />
						</button>
						<button
							onClick={() => setViewMode("table")}
							className={`p-2 rounded-md transition-colors ${
								viewMode === "table"
									? "bg-[#0b4d2b] text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
							title="Table View"
						>
							<List className="h-4 w-4" />
						</button>
					</div>
				</div>

				{rops.length === 0 ? (
					<div className="p-8 text-center">
						<p className="text-gray-500">No ROP records found.</p>
					</div>
				) : viewMode === "grid" ? (
					<div className="p-4">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{rops.map((rop, index) => (
								<div
									key={`${rop.INTERVENTION_ID}-${rop.Month_ROP}-${index}`}
									className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
								>
									<div className="space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<h4 className="font-semibold text-gray-900">
													Intervention ID: {rop.INTERVENTION_ID}
												</h4>
												<p className="text-sm text-gray-600">Family ID: {rop.FAMILY_ID || "N/A"}</p>
											</div>
										</div>

										<div className="space-y-2 text-sm">
											<div>
												<span className="font-medium text-gray-700">Head Name:</span>
												<span className="ml-2 text-gray-900">{rop.Head_Name || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Program:</span>
												<span className="ml-2 text-gray-900">{rop.PROGRAM || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Regional Council:</span>
												<span className="ml-2 text-gray-900">{rop.Regional_Council || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Local Council:</span>
												<span className="ml-2 text-gray-900">{rop.Local_Council || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Area:</span>
												<span className="ml-2 text-gray-900">{rop.AREA || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Mentor:</span>
												<span className="ml-2 text-gray-900">{rop.MENTOR || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Main Intervention:</span>
												<span className="ml-2 text-gray-900">{rop.Main_Intervention || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Member ID:</span>
												<span className="ml-2 text-gray-900">{rop.MEMBER_ID || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Month ROP:</span>
												<span className="ml-2 text-gray-900">{rop.Month_ROP || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">ROP Amount:</span>
												<span className="ml-2 text-gray-900">
													{rop.ROP_Amount ? formatCurrency(rop.ROP_Amount) : "N/A"}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Intervention Amount:</span>
												<span className="ml-2 text-gray-900">
													{rop.Intervention_Amount ? formatCurrency(rop.Intervention_Amount) : "N/A"}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Payment Type:</span>
												<span className="ml-2 text-gray-900">{rop.Payment_Type || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Amount Type:</span>
												<span className="ml-2 text-gray-900">{rop.Amount_Type || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Family Progress Status:</span>
												<span className="ml-2 text-gray-900">{rop.Family_Progress_Status || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">FDP Approved Date:</span>
												<span className="ml-2 text-gray-900">{formatDate(rop.FDP_Approved_Date)}</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Main Intervention</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month ROP</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROP Amount</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{rops.map((rop, index) => (
									<tr key={`${rop.INTERVENTION_ID}-${rop.Month_ROP}-${index}`} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm text-gray-900">{rop.INTERVENTION_ID}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.FAMILY_ID || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.Head_Name || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.PROGRAM || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.Regional_Council || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.MENTOR || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.Main_Intervention || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.MEMBER_ID || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.Month_ROP || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{rop.ROP_Amount ? formatCurrency(rop.ROP_Amount) : "N/A"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.Payment_Type || "N/A"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
