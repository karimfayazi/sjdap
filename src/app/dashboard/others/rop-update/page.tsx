"use client";

import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, X, Save, FileBarChart, DollarSign, Users, Calendar } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type ROPUpdateData = {
	INTERVENTION_ID: string | null;
	MONTH_ROP: string | null;
	AMOUNT: number | null;
	REMARKS: string | null;
	INTERVENTION_ID_MONTH_ROP: string | null;
	SYSTEMDATE: string | null;
	MENTOR: string | null;
	Payment_Type: string | null;
};

export default function ROPUpdatePage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Other");
	const [rops, setRops] = useState<ROPUpdateData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filterInterventionId, setFilterInterventionId] = useState("");
	const [filterMonthRop, setFilterMonthRop] = useState("");
	const [filterMentor, setFilterMentor] = useState("");
	const [filterPaymentType, setFilterPaymentType] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;
	const [selectedRop, setSelectedRop] = useState<ROPUpdateData | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [ropToDelete, setRopToDelete] = useState<ROPUpdateData | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [filterOptions, setFilterOptions] = useState({
		mentors: [] as string[],
		paymentTypes: [] as string[],
		monthRops: [] as string[],
	});
	const [loadingOptions, setLoadingOptions] = useState(false);
	const [editFormData, setEditFormData] = useState<ROPUpdateData>({
		INTERVENTION_ID: null,
		MONTH_ROP: null,
		AMOUNT: null,
		REMARKS: null,
		INTERVENTION_ID_MONTH_ROP: null,
		SYSTEMDATE: null,
		MENTOR: null,
		Payment_Type: null,
	});
	const [animatedStats, setAnimatedStats] = useState({
		totalRecords: 0,
		totalAmount: 0,
		uniqueMentors: 0,
		uniqueMonths: 0,
	});
	const [hasSearched, setHasSearched] = useState(false);

	useEffect(() => {
		fetchFilterOptions();
	}, []);

	const fetchROPs = async () => {
		try {
			setLoading(true);
			setError(null);
			setHasSearched(true);
			const params = new URLSearchParams();
			if (filterInterventionId) params.append("interventionId", filterInterventionId);
			if (filterMonthRop) params.append("monthRop", filterMonthRop);
			if (filterMentor) params.append("mentor", filterMentor);
			if (filterPaymentType) params.append("paymentType", filterPaymentType);

			const response = await fetch(`/api/rop-update?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const fetchedRops = data.rops || [];
				setRops(fetchedRops);
				setCurrentPage(1); // Reset to first page on new search
				
				// Calculate stats
				const totalAmount = fetchedRops.reduce((sum: number, rop: ROPUpdateData) => {
					return sum + (rop.AMOUNT || 0);
				}, 0);
				
				const uniqueMentors = new Set(
					fetchedRops.map((rop: ROPUpdateData) => rop.MENTOR).filter(Boolean)
				).size;
				
				const uniqueMonths = new Set(
					fetchedRops.map((rop: ROPUpdateData) => rop.MONTH_ROP).filter(Boolean)
				).size;
				
				// Animate stats
				animateStats({
					totalRecords: fetchedRops.length,
					totalAmount,
					uniqueMentors,
					uniqueMonths,
				});
			} else {
				setError(data.message || "Failed to fetch ROP data");
				// Reset stats on error
				setAnimatedStats({
					totalRecords: 0,
					totalAmount: 0,
					uniqueMentors: 0,
					uniqueMonths: 0,
				});
			}
		} catch (err) {
			setError("Error fetching ROP data");
			console.error("Error fetching ROP data:", err);
			// Reset stats on error
			setAnimatedStats({
				totalRecords: 0,
				totalAmount: 0,
				uniqueMentors: 0,
				uniqueMonths: 0,
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchFilterOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch(`/api/rop-update?getOptions=true`);
			const data = await response.json();

			if (data.success) {
				setFilterOptions({
					mentors: data.mentors || [],
					paymentTypes: data.paymentTypes || [],
					monthRops: data.monthRops || [],
				});
			}
		} catch (err) {
			console.error("Error fetching filter options:", err);
		} finally {
			setLoadingOptions(false);
		}
	};

	const handleEdit = (rop: ROPUpdateData) => {
		setSelectedRop(rop);
		setEditFormData({
			INTERVENTION_ID: rop.INTERVENTION_ID,
			MONTH_ROP: rop.MONTH_ROP,
			AMOUNT: rop.AMOUNT,
			REMARKS: rop.REMARKS,
			INTERVENTION_ID_MONTH_ROP: rop.INTERVENTION_ID_MONTH_ROP,
			SYSTEMDATE: rop.SYSTEMDATE,
			MENTOR: rop.MENTOR,
			Payment_Type: rop.Payment_Type,
		});
		setShowEditModal(true);
	};

	const handleDelete = (rop: ROPUpdateData) => {
		setRopToDelete(rop);
		setShowDeleteModal(true);
	};

	const handleSaveEdit = async () => {
		if (!editFormData.INTERVENTION_ID_MONTH_ROP) {
			alert("INTERVENTION_ID_MONTH_ROP is required");
			return;
		}

		try {
			setSaving(true);
			const response = await fetch("/api/rop-update", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(editFormData),
			});

			const data = await response.json();

			if (data.success) {
				alert("ROP record updated successfully");
				setShowEditModal(false);
				fetchROPs();
			} else {
				alert(data.message || "Failed to update record");
			}
		} catch (err) {
			console.error("Error updating record:", err);
			alert("Error updating record. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleConfirmDelete = async () => {
		if (!ropToDelete?.INTERVENTION_ID_MONTH_ROP) {
			alert("INTERVENTION_ID_MONTH_ROP is required");
			return;
		}

		try {
			setDeleting(true);
			const response = await fetch(
				`/api/rop-update?interventionIdMonthRop=${encodeURIComponent(ropToDelete.INTERVENTION_ID_MONTH_ROP)}`,
				{
					method: "DELETE",
				}
			);

			const data = await response.json();

			if (data.success) {
				alert("ROP record deleted successfully");
				setShowDeleteModal(false);
				setRopToDelete(null);
				fetchROPs();
			} else {
				alert(data.message || "Failed to delete record");
			}
		} catch (err) {
			console.error("Error deleting record:", err);
			alert("Error deleting record. Please try again.");
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "PKR",
		}).format(amount);
	};

	const formatNumber = (value: number) => {
		return new Intl.NumberFormat("en-US").format(value);
	};

	// Animate number counting
	const animateStats = (targetStats: typeof animatedStats) => {
		const duration = 1000; // 1 second
		const steps = 60;
		const stepDuration = duration / steps;
		
		const startStats = { ...animatedStats };
		
		let currentStep = 0;
		
		const interval = setInterval(() => {
			currentStep++;
			const progress = currentStep / steps;
			
			// Easing function for smooth animation
			const easeOutQuart = 1 - Math.pow(1 - progress, 4);
			
			setAnimatedStats({
				totalRecords: Math.round(startStats.totalRecords + (targetStats.totalRecords - startStats.totalRecords) * easeOutQuart),
				totalAmount: Math.round(startStats.totalAmount + (targetStats.totalAmount - startStats.totalAmount) * easeOutQuart),
				uniqueMentors: Math.round(startStats.uniqueMentors + (targetStats.uniqueMentors - startStats.uniqueMentors) * easeOutQuart),
				uniqueMonths: Math.round(startStats.uniqueMonths + (targetStats.uniqueMonths - startStats.uniqueMonths) * easeOutQuart),
			});
			
			if (currentStep >= steps) {
				clearInterval(interval);
				setAnimatedStats(targetStats);
			}
		}, stepDuration);
	};

	// Pagination
	const totalPages = Math.ceil(rops.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedRops = rops.slice(startIndex, endIndex);

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="ROP Update" />;
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
					<h1 className="text-3xl font-bold text-gray-900">ROP Update</h1>
					<p className="text-gray-600 mt-2">Update ROP (Results of Progress) Information</p>
				</div>
			</div>

			{/* Stats Cards */}
			{hasSearched && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{/* Total Records Card */}
					<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
						<div className="p-5">
							<div className="flex items-center justify-between mb-3">
								<div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
									<FileBarChart className="h-6 w-6 text-white" />
								</div>
								{loading && (
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-blue-700 mb-1">Total ROP Records</p>
								<p className="text-3xl font-bold text-blue-900">
									{loading ? (
										<span className="inline-block w-16 h-8 bg-blue-200 rounded animate-pulse"></span>
									) : (
										formatNumber(animatedStats.totalRecords)
									)}
								</p>
							</div>
						</div>
					</div>

					{/* Total Amount Card */}
					<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
						<div className="p-5">
							<div className="flex items-center justify-between mb-3">
								<div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
									<DollarSign className="h-6 w-6 text-white" />
								</div>
								{loading && (
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-green-700 mb-1">Total Amount</p>
								<p className="text-2xl font-bold text-green-900">
									{loading ? (
										<span className="inline-block w-32 h-8 bg-green-200 rounded animate-pulse"></span>
									) : (
										formatCurrency(animatedStats.totalAmount)
									)}
								</p>
							</div>
						</div>
					</div>

					{/* Unique Mentors Card */}
					<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
						<div className="p-5">
							<div className="flex items-center justify-between mb-3">
								<div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-md">
									<Users className="h-6 w-6 text-white" />
								</div>
								{loading && (
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-purple-700 mb-1">Unique Mentors</p>
								<p className="text-3xl font-bold text-purple-900">
									{loading ? (
										<span className="inline-block w-16 h-8 bg-purple-200 rounded animate-pulse"></span>
									) : (
										formatNumber(animatedStats.uniqueMentors)
									)}
								</p>
							</div>
						</div>
					</div>

					{/* Unique Months Card */}
					<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
						<div className="p-5">
							<div className="flex items-center justify-between mb-3">
								<div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center shadow-md">
									<Calendar className="h-6 w-6 text-white" />
								</div>
								{loading && (
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-orange-700 mb-1">Unique Months</p>
								<p className="text-3xl font-bold text-orange-900">
									{loading ? (
										<span className="inline-block w-16 h-8 bg-orange-200 rounded animate-pulse"></span>
									) : (
										formatNumber(animatedStats.uniqueMonths)
									)}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Intervention ID</label>
						<input
							type="text"
							value={filterInterventionId}
							onChange={(e) => setFilterInterventionId(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Intervention ID"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Month ROP</label>
						<select
							value={filterMonthRop}
							onChange={(e) => setFilterMonthRop(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							disabled={loadingOptions}
						>
							<option value="">All Months</option>
							{filterOptions.monthRops.map((month) => (
								<option key={month} value={month}>
									{month}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
						<select
							value={filterMentor}
							onChange={(e) => setFilterMentor(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							disabled={loadingOptions}
						>
							<option value="">All Mentors</option>
							{filterOptions.mentors.map((mentor) => (
								<option key={mentor} value={mentor}>
									{mentor}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
						<select
							value={filterPaymentType}
							onChange={(e) => setFilterPaymentType(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							disabled={loadingOptions}
						>
							<option value="">All Payment Types</option>
							{filterOptions.paymentTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="mt-4 flex items-center gap-3">
					<button
						onClick={fetchROPs}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Search className="h-4 w-4" />
						Search
					</button>
					<button
						onClick={() => {
							setFilterInterventionId("");
							setFilterMonthRop("");
							setFilterMentor("");
							setFilterPaymentType("");
							setHasSearched(false);
							setRops([]);
							setCurrentPage(1);
							setAnimatedStats({
								totalRecords: 0,
								totalAmount: 0,
								uniqueMentors: 0,
								uniqueMonths: 0,
							});
						}}
						className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error}</p>
					<button
						onClick={fetchROPs}
						className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			)}

			{/* Table */}
			{hasSearched && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-200">
						<h3 className="text-lg font-medium text-gray-900">
							ROP Records ({rops.length})
						</h3>
					</div>
					{loading ? (
						<div className="p-8 text-center">
							<div className="flex items-center justify-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
								<span className="ml-3 text-gray-600">Loading...</span>
							</div>
						</div>
					) : rops.length === 0 ? (
						<div className="p-8 text-center">
							<p className="text-gray-500">No ROP records found matching your filters.</p>
						</div>
					) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Intervention ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Month ROP
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Remarks
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Mentor
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Payment Type
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											System Date
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedRops.map((rop, index) => (
										<tr key={`${rop.INTERVENTION_ID_MONTH_ROP}-${index}`} className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-gray-900">{rop.INTERVENTION_ID || "N/A"}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{rop.MONTH_ROP || "N/A"}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(rop.AMOUNT)}</td>
											<td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={rop.REMARKS || ""}>
												{rop.REMARKS || "N/A"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900">{rop.MENTOR || "N/A"}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{rop.Payment_Type || "N/A"}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{formatDate(rop.SYSTEMDATE)}</td>
											<td className="px-4 py-3 text-sm">
												<div className="flex items-center gap-2">
													<button
														onClick={() => handleEdit(rop)}
														className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDelete(rop)}
														className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{/* Pagination */}
						{totalPages > 1 && (
							<div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									Showing {startIndex + 1} to {Math.min(endIndex, rops.length)} of {rops.length} records
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Previous
									</button>
									<span className="text-sm text-gray-700">
										Page {currentPage} of {totalPages}
									</span>
									<button
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</>
					)}
				</div>
			)}
			
			{!hasSearched && !loading && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
					<div className="text-center">
						<Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-lg font-medium text-gray-700 mb-2">No search performed yet</p>
						<p className="text-gray-500">Please use the filters above and click "Search" to view ROP records.</p>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{showEditModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
							<h2 className="text-xl font-bold text-gray-900">Edit ROP Record</h2>
							<button
								onClick={() => setShowEditModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="px-6 py-4 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Intervention ID
									</label>
									<input
										type="text"
										value={editFormData.INTERVENTION_ID || ""}
										onChange={(e) =>
											setEditFormData({ ...editFormData, INTERVENTION_ID: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Month ROP</label>
									<input
										type="text"
										value={editFormData.MONTH_ROP || ""}
										onChange={(e) =>
											setEditFormData({ ...editFormData, MONTH_ROP: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
									<input
										type="number"
										value={editFormData.AMOUNT || ""}
										onChange={(e) =>
											setEditFormData({
												...editFormData,
												AMOUNT: e.target.value ? parseFloat(e.target.value) : null,
											})
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
									<select
										value={editFormData.MENTOR || ""}
										onChange={(e) =>
											setEditFormData({ ...editFormData, MENTOR: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Mentor</option>
										{filterOptions.mentors.map((mentor) => (
											<option key={mentor} value={mentor}>
												{mentor}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
									<select
										value={editFormData.Payment_Type || ""}
										onChange={(e) =>
											setEditFormData({ ...editFormData, Payment_Type: e.target.value })
										}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Payment Type</option>
										{filterOptions.paymentTypes.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
								<textarea
									value={editFormData.REMARKS || ""}
									onChange={(e) =>
										setEditFormData({ ...editFormData, REMARKS: e.target.value })
									}
									rows={3}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									INTERVENTION_ID_MONTH_ROP (Read-only)
								</label>
								<input
									type="text"
									value={editFormData.INTERVENTION_ID_MONTH_ROP || ""}
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
								/>
							</div>
						</div>
						<div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
							<button
								onClick={() => setShowEditModal(false)}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveEdit}
								disabled={saving}
								className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Save className="h-4 w-4" />
								{saving ? "Saving..." : "Save"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && ropToDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="px-6 py-4 border-b border-gray-200">
							<h2 className="text-xl font-bold text-gray-900">Delete ROP Record</h2>
						</div>
						<div className="px-6 py-4">
							<p className="text-gray-700">
								Are you sure you want to delete this ROP record?
							</p>
							<div className="mt-4 p-3 bg-gray-50 rounded-md">
								<p className="text-sm text-gray-600">
									<strong>Intervention ID:</strong> {ropToDelete.INTERVENTION_ID || "N/A"}
								</p>
								<p className="text-sm text-gray-600">
									<strong>Month ROP:</strong> {ropToDelete.MONTH_ROP || "N/A"}
								</p>
								<p className="text-sm text-gray-600">
									<strong>Amount:</strong> {formatCurrency(ropToDelete.AMOUNT)}
								</p>
							</div>
						</div>
						<div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
							<button
								onClick={() => {
									setShowDeleteModal(false);
									setRopToDelete(null);
								}}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleConfirmDelete}
								disabled={deleting}
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{deleting ? "Deleting..." : "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
