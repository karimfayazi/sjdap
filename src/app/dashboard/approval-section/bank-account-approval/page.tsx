"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Eye, Edit2, CreditCard, Filter, X } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type BankAccount = {
	BankNo: number;
	FormNumber: string;
	Full_Name: string | null;
	CNICNumber: string | null;
	MotherTongue: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	BankName: string | null;
	AccountTitle: string | null;
	AccountNo: string | null;
	BankCNIC: string | null;
	BankCode: string | null;
	SubmittedAt: string | null;
	SubmittedBy: string | null;
	ApprovalStatus: string | null;
	Remarks: string | null;
	BankChequeImagePath: string | null;
};

export default function BankAccountApprovalPage() {
	const router = useRouter();
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
		fetchBankAccounts();
	}, []);

	const fetchBankAccounts = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (filters.approvalStatus) params.append("approvalStatus", filters.approvalStatus);
			if (filters.regionalCommunity) params.append("regionalCommunity", filters.regionalCommunity);
			if (searchTerm) params.append("search", searchTerm);

			const response = await fetch(`/api/approval/bank-accounts?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const bankAccounts: BankAccount[] = (data.bankAccounts || []) as BankAccount[];
				setBankAccounts(bankAccounts);

				// Extract unique values for filters
				const uniqueStatuses: string[] = Array.from(new Set(bankAccounts.map((ba) => ba.ApprovalStatus).filter((v): v is string => Boolean(v))));
				const uniqueCommunities: string[] = Array.from(new Set(bankAccounts.map((ba) => ba.RegionalCommunity).filter((v): v is string => Boolean(v))));

				setApprovalStatuses(uniqueStatuses.sort());
				setRegionalCommunities(uniqueCommunities.sort());
			} else {
				setError(data.message || "Failed to fetch bank accounts");
			}
		} catch (err: any) {
			console.error("Error fetching bank accounts:", err);
			setError(err.message || "Error fetching bank accounts");
		} finally {
			setLoading(false);
		}
	};

	const handleView = (bankNo: number) => {
		router.push(`/dashboard/approval-section/bank-account-approval/view/${bankNo}`);
	};

	const handleEdit = (bankNo: number) => {
		router.push(`/dashboard/approval-section/bank-account-approval/edit/${bankNo}`);
	};

	const clearFilters = () => {
		setFilters({ approvalStatus: "", regionalCommunity: "" });
		setSearchTerm("");
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + " " + date.toLocaleTimeString();
		} catch {
			return dateString;
		}
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">Pending</span>;
		const statusUpper = status.toUpperCase();
		if (statusUpper === "APPROVAL" || statusUpper === "APPROVED") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approval</span>;
		} else if (statusUpper === "REJECTION" || statusUpper === "REJECTED") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejection</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">{status}</span>;
	};

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
								<CreditCard className="h-8 w-8" />
								Bank Account Approval
							</h1>
						</div>
						<p className="text-gray-600 mt-2">Review and approve bank account information submissions</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={fetchBankAccounts}
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
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search by Form Number, Name, CNIC, or Account Number..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									fetchBankAccounts();
								}
							}}
							className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<select
							value={filters.approvalStatus}
							onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
							className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All Approval Statuses</option>
							{approvalStatuses.map((status) => (
								<option key={status} value={status}>{status}</option>
							))}
						</select>

						<select
							value={filters.regionalCommunity}
							onChange={(e) => setFilters({ ...filters, regionalCommunity: e.target.value })}
							className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All Regional Communities</option>
							{regionalCommunities.map((community) => (
								<option key={community} value={community}>{community}</option>
							))}
						</select>
					</div>

					<div className="flex gap-2">
						<button
							onClick={fetchBankAccounts}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Apply Filters
						</button>
						<button
							onClick={clearFilters}
							className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
						>
							Clear Filters
						</button>
					</div>
				</div>

				{/* Table */}
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
						<span className="ml-3 text-gray-600">Loading bank accounts...</span>
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
								<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank No</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Number</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Title</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Code</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{bankAccounts.length === 0 ? (
										<tr>
											<td colSpan={13} className="px-4 py-8 text-center text-gray-500">
												No bank accounts found
											</td>
										</tr>
									) : (
										bankAccounts.map((account) => (
											<tr key={account.BankNo} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm">
													<div className="flex items-center gap-2">
														<button
															onClick={() => handleView(account.BankNo)}
															className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
															title="View"
														>
															<Eye className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleEdit(account.BankNo)}
															disabled={account.ApprovalStatus?.toUpperCase() === "APPROVED"}
															className={`p-1.5 rounded transition-colors ${
																account.ApprovalStatus?.toUpperCase() === "APPROVED"
																	? "text-gray-400 cursor-not-allowed opacity-50"
																	: "text-green-600 hover:bg-green-50"
															}`}
															title={account.ApprovalStatus?.toUpperCase() === "APPROVED" ? "Cannot edit - Already approved" : "Edit/Approve"}
														>
															<Edit2 className="h-4 w-4" />
														</button>
													</div>
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.BankNo}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.FormNumber || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.Full_Name || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.CNICNumber || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.BankName || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.AccountTitle || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.AccountNo || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.BankCode || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(account.SubmittedAt)}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.SubmittedBy || "N/A"}</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(account.ApprovalStatus)}</td>
												<td
													className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate"
													title={account.Remarks || undefined}
												>
													{account.Remarks || "N/A"}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</PageGuard>
	);
}
