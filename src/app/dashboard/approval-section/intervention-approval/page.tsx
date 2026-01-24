"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Eye, Edit2, Filter, X, ArrowLeft } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type Intervention = {
	InterventionID: number;
	FormNumber: string;
	Section: string | null;
	InterventionStatus: string | null;
	InterventionCategory: string | null;
	SubCategory: string | null;
	MainIntervention: string | null;
	InterventionType: string | null;
	FinancialCategory: string | null;
	TotalAmount: number | null;
	InterventionStartDate: string | null;
	InterventionEndDate: string | null;
	Remarks: string | null;
	MemberID: string | null;
	MemberName: string | null;
	ApprovalStatus: string | null;
	Mentor: string | null;
	CreatedAt: string | null;
	FamilyFullName: string | null;
	FamilyCNIC: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

export default function InterventionApprovalPage() {
	const router = useRouter();
	const [interventions, setInterventions] = useState<Intervention[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		approvalStatus: "",
		regionalCommunity: "",
	});

	// Unique values for filters
	const [approvalStatuses, setApprovalStatuses] = useState<string[]>([]);
	const [regionalCommunities, setRegionalCommunities] = useState<string[]>([]);

	useEffect(() => {
		fetchInterventions();
	}, []);

	const fetchInterventions = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (filters.approvalStatus) params.append("approvalStatus", filters.approvalStatus);
			if (filters.regionalCommunity) params.append("regionalCommunity", filters.regionalCommunity);
			if (searchTerm) params.append("search", searchTerm);

			const response = await fetch(`/api/approval/interventions?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const interventions: Intervention[] = (data.interventions || []) as Intervention[];
				setInterventions(interventions);

				// Extract unique values for filters
				const uniqueStatuses: string[] = Array.from(new Set(
					interventions.map((i) => i.ApprovalStatus || "Pending")
				));
				const uniqueCommunities: string[] = Array.from(new Set(
					interventions.map((i) => i.RegionalCommunity).filter((v): v is string => Boolean(v))
				));

				setApprovalStatuses(uniqueStatuses.sort());
				setRegionalCommunities(uniqueCommunities.sort());
			} else {
				setError(data.message || "Failed to fetch interventions");
			}
		} catch (err: any) {
			console.error("Error fetching interventions:", err);
			setError(err.message || "Error fetching interventions");
		} finally {
			setLoading(false);
		}
	};

	const handleView = (interventionId: number) => {
		router.push(`/dashboard/approval-section/intervention-approval/view?interventionId=${interventionId}`);
	};

	const handleEdit = (interventionId: number) => {
		router.push(`/dashboard/approval-section/intervention-approval/edit?interventionId=${interventionId}`);
	};

	const clearFilters = () => {
		setFilters({ approvalStatus: "", regionalCommunity: "" });
		setSearchTerm("");
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return `PKR ${amount.toLocaleString()}`;
	};

	const isApproved = (v: any) => typeof v === 'string' && v.trim().toLowerCase() === 'approved';

	const getStatusBadge = (status: string | null) => {
		if (!status || status === "Pending") {
			return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>;
		}
		const statusUpper = status.toUpperCase();
		if (statusUpper === "APPROVED" || statusUpper === "APPROVAL") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approved</span>;
		} else if (statusUpper === "REJECTED" || statusUpper === "REJECTION") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejected</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>;
	};

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">Intervention Approval</h1>
						</div>
						<p className="text-gray-600 mt-2">Review and approve intervention submissions</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={() => router.push("/dashboard")}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</button>
						<button
							onClick={fetchInterventions}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</button>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{/* Search and Filters */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
					<input
						type="text"
						placeholder="Search by Form Number or Family Name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								fetchInterventions();
							}
						}}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
					/>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
							<select
								value={filters.approvalStatus}
								onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Statuses</option>
								{approvalStatuses.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
							<select
								value={filters.regionalCommunity}
								onChange={(e) => setFilters({ ...filters, regionalCommunity: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Communities</option>
								{regionalCommunities.map((community) => (
									<option key={community} value={community}>
										{community}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-end">
							<button
								onClick={clearFilters}
								className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
							>
								<X className="h-4 w-4" />
								Clear Filters
							</button>
						</div>
					</div>

					<button
						onClick={fetchInterventions}
						className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Filter className="h-4 w-4" />
						Apply Filters
					</button>
				</div>

				{/* Interventions Table */}
				{loading ? (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<p className="text-gray-600 mt-4">Loading interventions...</p>
					</div>
				) : interventions.length === 0 ? (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
						<p className="text-gray-600">No interventions found.</p>
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Intervention ID
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Family Information
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Section
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Intervention Type
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Total Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Beneficiary Information
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Mentor
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Created
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{interventions.map((intervention) => (
										<tr key={intervention.InterventionID} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{intervention.InterventionID}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div className="font-medium">{intervention.FormNumber}</div>
													<div className="text-gray-500">{intervention.FamilyFullName || "N/A"}</div>
													<div className="text-xs text-gray-400">
														{intervention.RegionalCommunity || "N/A"} / {intervention.LocalCommunity || "N/A"}
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.Section || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div>{intervention.MainIntervention || "N/A"}</div>
													<div className="text-xs text-gray-500">{intervention.InterventionType || "N/A"}</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{formatCurrency(intervention.TotalAmount)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div>
														<span className="text-xs font-medium text-gray-500">MemberID:</span>{" "}
														<span className="text-gray-900">{intervention.MemberID || "—"}</span>
													</div>
													<div className="mt-1">
														<span className="text-xs font-medium text-gray-500">MemberName:</span>{" "}
														<span className="text-gray-900">{intervention.MemberName || "—"}</span>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{getStatusBadge(intervention.ApprovalStatus)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.Mentor || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{formatDate(intervention.CreatedAt)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
												<button
													onClick={() => handleView(intervention.InterventionID)}
													className="text-[#0b4d2b] hover:text-[#0a3d22] inline-flex items-center gap-1"
													title="View Details"
												>
													<Eye className="h-4 w-4" />
												</button>
												{!isApproved(intervention.ApprovalStatus) && (
													<button
														onClick={() => handleEdit(intervention.InterventionID)}
														className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
														title="Edit/Approve"
													>
														<Edit2 className="h-4 w-4" />
													</button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</PageGuard>
	);
}
