"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Building2, Search, Download, Edit, Trash2, Eye } from "lucide-react";

type BankData = {
	FAMILY_ID: string;
	PROGRAM: string;
	AREA: string;
	HEAD_NAME: string;
	FAMILY_PROGRESS_STATUS: string;
	MENTOR: string;
	BANK_NAME: string;
	ACCOUNT_TITLE: string;
	ACCOUNT_NO: string;
	CNIC: string;
	ACCOUNT_TYPE: string;
};

export default function ViewBankDetailsPage() {
	const router = useRouter();
	const [banks, setBanks] = useState<BankData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [viewBank, setViewBank] = useState<BankData | null>(null);
	const [filters, setFilters] = useState({
		familyId: "",
		program: "",
		headName: "",
		familyProgressStatus: "",
		mentor: "",
		bankName: "",
		accountTitle: "",
		accountNo: "",
		cnic: "",
		accountType: "",
	});

	const fetchBankDetails = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.familyId) params.append("familyId", filters.familyId);
			if (filters.program) params.append("program", filters.program);
			if (filters.headName) params.append("headName", filters.headName);
			if (filters.familyProgressStatus) params.append("familyProgressStatus", filters.familyProgressStatus);
			if (filters.mentor) params.append("mentor", filters.mentor);
			if (filters.bankName) params.append("bankName", filters.bankName);
			if (filters.accountTitle) params.append("accountTitle", filters.accountTitle);
			if (filters.accountNo) params.append("accountNo", filters.accountNo);
			if (filters.cnic) params.append("cnic", filters.cnic);
			if (filters.accountType) params.append("accountType", filters.accountType);

			const response = await fetch(`/api/bank-information?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setBanks(data.banks || []);
			} else {
				setError(data.message || "Failed to fetch bank details");
			}
		} catch (err) {
			setError("Error fetching bank details");
			console.error("Error fetching bank details:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBankDetails();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFilters(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleFilterSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		fetchBankDetails();
	};

	const handleClearFilters = () => {
		setFilters({
			familyId: "",
			program: "",
			headName: "",
			familyProgressStatus: "",
			mentor: "",
			bankName: "",
			accountTitle: "",
			accountNo: "",
			cnic: "",
			accountType: "",
		});
		setTimeout(() => fetchBankDetails(), 100);
	};

	const exportToCSV = () => {
		if (banks.length === 0) {
			alert("No data to export");
			return;
		}

		const headers = Object.keys(banks[0]);
		const csvHeaders = headers.join(",");
		const csvRows = banks.map(bank => {
			return headers.map(header => {
				const value = bank[header as keyof BankData];
				if (value === null || value === undefined) return "";
				const stringValue = String(value);
				if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return stringValue;
			}).join(",");
		});

		const csvContent = [csvHeaders, ...csvRows].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `bank_details_export_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleEdit = (bank: BankData) => {
		// Navigate to edit page with bank data
		const params = new URLSearchParams({
			familyId: bank.FAMILY_ID || "",
			accountNo: bank.ACCOUNT_NO || "",
		});
		router.push(`/dashboard/finance/bank-information/edit?${params.toString()}`);
	};

	const handleDelete = async (bank: BankData) => {
		if (!confirm(`Are you sure you want to delete bank information for Family ID: ${bank.FAMILY_ID}?`)) {
			return;
		}

		try {
			setDeletingId(`${bank.FAMILY_ID}-${bank.ACCOUNT_NO}`);
			const response = await fetch(
				`/api/bank-information?familyId=${encodeURIComponent(bank.FAMILY_ID || "")}&accountNo=${encodeURIComponent(bank.ACCOUNT_NO || "")}`,
				{
					method: "DELETE",
				}
			);

			const data = await response.json();

			if (data.success) {
				// Refresh the list
				fetchBankDetails();
			} else {
				alert(data.message || "Failed to delete bank information");
			}
		} catch (err) {
			console.error("Error deleting bank information:", err);
			alert("Error deleting bank information");
		} finally {
			setDeletingId(null);
		}
	};

	const handleView = (bank: BankData) => {
		setViewBank(bank);
	};

	// Get unique values for dropdowns
	const uniquePrograms = Array.from(new Set(banks.map(b => b.PROGRAM).filter(Boolean))).sort();
	const uniqueFamilyProgressStatuses = Array.from(new Set(banks.map(b => b.FAMILY_PROGRESS_STATUS).filter(Boolean))).sort();
	const uniqueAccountTypes = Array.from(new Set(banks.map(b => b.ACCOUNT_TYPE).filter(Boolean))).sort();

	// Filter banks based on search
	const filteredBanks = banks.filter(bank => {
		if (!searchTerm) return true;
		
		const searchLower = searchTerm.toLowerCase();
		return (
			(bank.FAMILY_ID || "").toLowerCase().includes(searchLower) ||
			(bank.PROGRAM || "").toLowerCase().includes(searchLower) ||
			(bank.HEAD_NAME || "").toLowerCase().includes(searchLower) ||
			(bank.FAMILY_PROGRESS_STATUS || "").toLowerCase().includes(searchLower) ||
			(bank.MENTOR || "").toLowerCase().includes(searchLower) ||
			(bank.ACCOUNT_TITLE || "").toLowerCase().includes(searchLower) ||
			(bank.BANK_NAME || "").toLowerCase().includes(searchLower) ||
			(bank.ACCOUNT_NO || "").toLowerCase().includes(searchLower) ||
			(bank.CNIC || "").toLowerCase().includes(searchLower) ||
			(bank.ACCOUNT_TYPE || "").toLowerCase().includes(searchLower)
		);
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
						<Building2 className="h-8 w-8 text-[#0b4d2b]" />
						View Bank Details
					</h1>
					<p className="text-gray-600 mt-2">View and manage bank account information for families</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={exportToCSV}
						disabled={banks.length === 0 || loading}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
					<Link
						href="/dashboard/finance/bank-information/add"
						className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Bank Details
					</Link>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{/* Filters */}
			<form onSubmit={handleFilterSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Search across all fields..."
						/>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Family ID</label>
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
						<label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
						<select
							name="program"
							value={filters.program}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniquePrograms.map(prog => (
								<option key={prog} value={prog}>{prog}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Head Name</label>
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
						<label className="block text-sm font-medium text-gray-700 mb-2">Family Progress Status</label>
						<select
							name="familyProgressStatus"
							value={filters.familyProgressStatus}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueFamilyProgressStatuses.map(status => (
								<option key={status} value={status}>{status}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Mentor</label>
						<input
							type="text"
							name="mentor"
							value={filters.mentor}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Mentor"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
						<input
							type="text"
							name="bankName"
							value={filters.bankName}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Bank Name"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Account Title</label>
						<input
							type="text"
							name="accountTitle"
							value={filters.accountTitle}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Account Title"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
						<input
							type="text"
							name="accountNo"
							value={filters.accountNo}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Account Number"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">CNIC</label>
						<input
							type="text"
							name="cnic"
							value={filters.cnic}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="CNIC"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
						<select
							name="accountType"
							value={filters.accountType}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueAccountTypes.map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
					</div>
				</div>
				<div className="flex gap-2 mt-4">
					<button
						type="submit"
						disabled={loading}
						className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
					>
						{loading ? "Loading..." : "Apply Filters"}
					</button>
					<button
						type="button"
						onClick={handleClearFilters}
						className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
					>
						Clear Filters
					</button>
				</div>
			</form>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<span className="ml-3 text-gray-600 mt-3 block">Loading bank details...</span>
					</div>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Progress Status</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Title</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredBanks.length === 0 ? (
									<tr>
										<td colSpan={11} className="px-4 py-8 text-center text-gray-500">
											No bank details found. <Link href="/dashboard/bank-information/add" className="text-[#0b4d2b] hover:underline">Add your first bank detail</Link>
										</td>
									</tr>
								) : (
									filteredBanks.map((bank, index) => {
										const deleteKey = `${bank.FAMILY_ID}-${bank.ACCOUNT_NO}`;
										const isDeleting = deletingId === deleteKey;
										return (
											<tr key={deleteKey} className="hover:bg-gray-50">
												<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
													{bank.FAMILY_ID || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.PROGRAM || "N/A"}
												</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.AREA || "N/A"}
										</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.HEAD_NAME || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.FAMILY_PROGRESS_STATUS || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.MENTOR || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.BANK_NAME || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.ACCOUNT_TITLE || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.ACCOUNT_NO || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.CNIC || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													{bank.ACCOUNT_TYPE || "N/A"}
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
													<div className="flex items-center gap-2">
														<button
															onClick={() => handleView(bank)}
															className="p-1.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-colors"
															title="View"
														>
															<Eye className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleEdit(bank)}
															className="p-1.5 text-[#0b4d2b] hover:bg-[#0b4d2b] hover:text-white rounded transition-colors"
															title="Update"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleDelete(bank)}
															disabled={isDeleting}
															className="p-1.5 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
															title="Delete"
														>
															{isDeleting ? (
																<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
															) : (
																<Trash2 className="h-4 w-4" />
															)}
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* View Modal */}
			{viewBank && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
					<div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
						<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
							<h2 className="text-xl font-semibold text-gray-900">
								Bank Details - {viewBank.FAMILY_ID || "N/A"}
							</h2>
							<button
								type="button"
								onClick={() => setViewBank(null)}
								className="text-gray-500 hover:text-gray-700 text-sm"
							>
								Close
							</button>
						</div>
						<div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<p className="font-medium text-gray-700">Program</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.PROGRAM || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Area</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.AREA || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Head Name</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.HEAD_NAME || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Family Progress Status</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.FAMILY_PROGRESS_STATUS || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Mentor</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.MENTOR || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Bank Name</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.BANK_NAME || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Account Title</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.ACCOUNT_TITLE || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Account Number</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.ACCOUNT_NO || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">CNIC</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.CNIC || "N/A"}
								</p>
							</div>
							<div>
								<p className="font-medium text-gray-700">Account Type</p>
								<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{viewBank.ACCOUNT_TYPE || "N/A"}
								</p>
							</div>
						</div>
						<div className="px-6 py-4 border-t border-gray-200 flex justify-end">
							<button
								type="button"
								onClick={() => setViewBank(null)}
								className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] text-sm"
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

