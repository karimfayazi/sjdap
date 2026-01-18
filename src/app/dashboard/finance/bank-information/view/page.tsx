"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, RefreshCw, Plus, Edit2, Trash2 } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";
import PermissionStatusLabel from "@/components/PermissionStatusLabel";

type BankInformation = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	HEAD_NAME: string | null;
	FAMILY_PROGRESS_STATUS: string | null;
	MENTOR: string | null;
	BANK_NAME: string | null;
	ACCOUNT_TITLE: string | null;
	ACCOUNT_NO: string | null;
	CNIC: string | null;
	ACCOUNT_TYPE: string | null;
};

export default function ViewBankInformationPage() {
	const router = useRouter();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("BankInformation");
	const [banks, setBanks] = useState<BankInformation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
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
	const [deleteConfirm, setDeleteConfirm] = useState<{
		show: boolean;
		familyId: string | null;
		accountNo: string | null;
	}>({
		show: false,
		familyId: null,
		accountNo: null,
	});
	const [deleting, setDeleting] = useState(false);

	const fetchBanks = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) {
					params.append(key, value);
				}
			});

			const response = await fetch(`/api/bank-information?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setBanks(data.banks || []);
			} else {
				setError(data.message || "Failed to fetch bank information");
			}
		} catch (err: any) {
			console.error("Error fetching bank information:", err);
			setError(err.message || "Error fetching bank information");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBanks();
	}, []);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const handleApplyFilters = () => {
		fetchBanks();
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
		setSearchTerm("");
	};

	const handleDelete = async (familyId: string, accountNo: string) => {
		if (!familyId || !accountNo) return;
		
		setDeleting(true);
		try {
			const response = await fetch(`/api/bank-information?familyId=${encodeURIComponent(familyId)}&accountNo=${encodeURIComponent(accountNo)}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (data.success) {
				fetchBanks();
				setDeleteConfirm({ show: false, familyId: null, accountNo: null });
			} else {
				setError(data.message || "Failed to delete bank information");
			}
		} catch (err: any) {
			console.error("Error deleting bank information:", err);
			setError(err.message || "Error deleting bank information");
		} finally {
			setDeleting(false);
		}
	};

	const exportToCSV = () => {
		try {
			const headers = [
				"Family ID",
				"Program",
				"Area",
				"Head Name",
				"Family Progress Status",
				"Mentor",
				"Bank Name",
				"Account Title",
				"Account No",
				"CNIC",
				"Account Type",
			];
			const csvRows = [];
			csvRows.push(headers.join(","));

			filteredBanks.forEach((bank) => {
				const row = headers.map((header) => {
					const key = header.replace(/\s+/g, "_").toUpperCase();
					const value = bank[key as keyof BankInformation];
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
			link.setAttribute("download", `Bank_Information_${dateStr}.csv`);
			
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

	const filteredBanks = banks.filter((bank) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(bank.FAMILY_ID && String(bank.FAMILY_ID).toLowerCase().includes(search)) ||
			(bank.HEAD_NAME && String(bank.HEAD_NAME).toLowerCase().includes(search)) ||
			(bank.BANK_NAME && String(bank.BANK_NAME).toLowerCase().includes(search)) ||
			(bank.ACCOUNT_TITLE && String(bank.ACCOUNT_TITLE).toLowerCase().includes(search)) ||
			(bank.ACCOUNT_NO && String(bank.ACCOUNT_NO).toLowerCase().includes(search)) ||
			(bank.CNIC && String(bank.CNIC).toLowerCase().includes(search))
		);
	});

	// Check access - only users with BankInformation = 1/TRUE can access this page
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="BankInformation" />;
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">View Bank Details</h1>
							<PermissionStatusLabel permission="BankInformation" />
						</div>
						<p className="text-gray-600 mt-2">Bank Information Management</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading bank information...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">View Bank Details</h1>
							<PermissionStatusLabel permission="BankInformation" />
						</div>
						<p className="text-gray-600 mt-2">Bank Information Management</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={fetchBanks}
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
					<h1 className="text-3xl font-bold text-gray-900">View Bank Details</h1>
					<p className="text-gray-600 mt-2">Bank Information Management</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchBanks}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard/finance/bank-information/add")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Bank Details
					</button>
					<button
						onClick={exportToCSV}
						disabled={banks.length === 0}
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
						<p className="text-3xl font-bold text-[#0b4d2b]">{filteredBanks.length.toLocaleString()}</p>
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
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
					<input
						type="text"
						placeholder="Family ID"
						value={filters.familyId}
						onChange={(e) => handleFilterChange("familyId", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Program"
						value={filters.program}
						onChange={(e) => handleFilterChange("program", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Head Name"
						value={filters.headName}
						onChange={(e) => handleFilterChange("headName", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Bank Name"
						value={filters.bankName}
						onChange={(e) => handleFilterChange("bankName", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Account Title"
						value={filters.accountTitle}
						onChange={(e) => handleFilterChange("accountTitle", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Account No"
						value={filters.accountNo}
						onChange={(e) => handleFilterChange("accountNo", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="CNIC"
						value={filters.cnic}
						onChange={(e) => handleFilterChange("cnic", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<input
						type="text"
						placeholder="Mentor"
						value={filters.mentor}
						onChange={(e) => handleFilterChange("mentor", e.target.value)}
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
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Title</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredBanks.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-4 py-8 text-center text-gray-500">
										{searchTerm || Object.values(filters).some(f => f) ? "No bank information found matching your search/filters" : "No bank information found"}
									</td>
								</tr>
							) : (
								filteredBanks.map((bank, index) => (
									<tr key={`${bank.FAMILY_ID}-${bank.ACCOUNT_NO}-${index}`} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => {
														// Edit functionality - you can implement this
														alert("Edit functionality to be implemented");
													}}
													className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
													title="Edit"
												>
													<Edit2 className="h-4 w-4" />
												</button>
												<button
													onClick={() => setDeleteConfirm({ show: true, familyId: bank.FAMILY_ID, accountNo: bank.ACCOUNT_NO })}
													className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.FAMILY_ID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.PROGRAM || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.AREA || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.HEAD_NAME || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.BANK_NAME || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.ACCOUNT_TITLE || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.ACCOUNT_NO || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.CNIC || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.MENTOR || "N/A"}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
							<p className="text-gray-600 mb-6">
								Are you sure you want to delete this bank information record? This action cannot be undone.
							</p>
							<div className="flex justify-end gap-3">
								<button
									onClick={() => setDeleteConfirm({ show: false, familyId: null, accountNo: null })}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
									disabled={deleting}
								>
									Cancel
								</button>
								<button
									onClick={() => deleteConfirm.familyId && deleteConfirm.accountNo && handleDelete(deleteConfirm.familyId, deleteConfirm.accountNo)}
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
