"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, Trash2, FileText, Printer, Edit, Grid, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import { hasLoanAccess as checkLoanAccess } from "@/lib/loan-access-utils";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type LoanData = {
	Intervention_ID?: number;
	Family_ID?: string;
	Member_ID?: string;
	Account_Number?: string;
	Beneficiary_CNIC?: string;
	Member_Name?: string;
	Finance_Officer?: string;
	Main_Trade?: string;
	Sub_Trades?: string;
	Loan_Amount?: number;
	Letter_Ref?: string;
	Regional_Council?: string;
	Loan_Status?: string;
	Post_Date?: string;
	Post_By?: string;
	bank_send?: boolean;
	bank_send_date?: string;
	collateral_mark?: boolean;
	collateral_date?: string;
};

export default function LoanProcessPage() {
	const router = useRouter();
	const [loans, setLoans] = useState<LoanData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [showAccessIssue, setShowAccessIssue] = useState(false);

	const { userProfile, loading: authLoading } = useAuth();
	const [isSuperFinanceOfficer, setIsSuperFinanceOfficer] = useState(false);
	const [hasAccess, setHasAccess] = useState<boolean | null>(null);

	// Check loan access permission
	useEffect(() => {
		if (authLoading) return;

		// Check multiple sources for access_loans value
		let accessLoansValue = userProfile?.access_loans;
		
		// Fallback to localStorage if userProfile doesn't have it
		if ((accessLoansValue === null || accessLoansValue === undefined) && typeof window !== "undefined") {
			const storedValue = localStorage.getItem('access_loans');
			if (storedValue) {
				accessLoansValue = storedValue;
			}
			
			// Also check userData object in localStorage
			const userData = localStorage.getItem('userData');
			if (userData) {
				try {
					const parsedData = JSON.parse(userData);
					if (parsedData.access_loans !== undefined && parsedData.access_loans !== null) {
						accessLoansValue = parsedData.access_loans;
					}
				} catch (e) {
					console.error('Error parsing userData:', e);
				}
			}
		}

		// Check if user has loan access (access_loans = 1 or "Yes")
		const userHasLoanAccess = checkLoanAccess(accessLoansValue);

		// Also check if user is super user (has full access)
		const supperUserValue = userProfile?.supper_user;
		const userIsSuperUser = isSuperUser(supperUserValue);

		// Debug logging
		if (typeof window !== "undefined") {
			console.log("===========================================");
			console.log("=== LOAN PROCESS ACCESS CHECK ===");
			console.log("Full userProfile:", userProfile);
			console.log("access_loans from userProfile:", userProfile?.access_loans);
			console.log("access_loans final value:", accessLoansValue);
			console.log("access_loans type:", typeof accessLoansValue);
			console.log("checkLoanAccess result:", userHasLoanAccess);
			console.log("supper_user value:", supperUserValue);
			console.log("isSuperUser result:", userIsSuperUser);
			console.log("Final access decision:", userHasLoanAccess || userIsSuperUser);
			console.log("===========================================");
		}

		if (!userHasLoanAccess && !userIsSuperUser) {
			setHasAccess(false);
			// DO NOT redirect - user requested to stay on access denied page
		} else {
			setHasAccess(true);
		}
	}, [userProfile, authLoading]);

	// Determine if current user has Finance_Officer = 'All'
	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem("userData");
			if (stored) {
				const parsed = JSON.parse(stored);
				if (parsed.finance_officer) {
					const fo = String(parsed.finance_officer).trim().toLowerCase();
					setIsSuperFinanceOfficer(fo === "all");
					return;
				}
			}
		} catch {
			// ignore
		}

		// Fallback: no explicit finance officer means not super
		setIsSuperFinanceOfficer(false);
	}, []);

	const [filters, setFilters] = useState({
		interventionId: "",
		familyId: "",
		memberId: "",
		letterRef: "",
		loanStatus: "",
		financeOfficer: "",
		regionalCouncil: "",
		loanAmount: "",
		cnic: "",
		bankSend: "",
		bankSendDate: "",
	});
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
	const [financeOfficers, setFinanceOfficers] = useState<string[]>([]);
	const [regionalCouncils, setRegionalCouncils] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	const fetchLoans = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.interventionId) params.append("interventionId", filters.interventionId);
			if (filters.familyId) params.append("familyId", filters.familyId);
			if (filters.memberId) params.append("memberId", filters.memberId);
			if (filters.letterRef) params.append("letterRef", filters.letterRef);
			if (filters.loanStatus) params.append("loanStatus", filters.loanStatus);
			if (filters.financeOfficer) params.append("financeOfficer", filters.financeOfficer);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);
			if (filters.loanAmount) params.append("loanAmount", filters.loanAmount);
			if (filters.cnic) params.append("cnic", filters.cnic);
			if (filters.bankSend !== "") params.append("bankSend", filters.bankSend);
			if (filters.bankSendDate) params.append("bankSendDate", filters.bankSendDate);

			const response = await fetch(`/api/loan-authorization?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setLoans(data.loans || []);
			} else {
				setError(data.message || "Failed to fetch loan records");
			}
		} catch (err) {
			setError("Error fetching loan records");
			console.error("Error fetching loan records:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLoans();
		fetchDropdownOptions();
	}, []);

	const fetchDropdownOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch(`/api/loan-authorization?getOptions=true`);
			const data = await response.json();

			if (data.success) {
				setFinanceOfficers(data.financeOfficers || []);
				setRegionalCouncils(data.regionalCouncils || []);
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
		fetchLoans();
	};

	const handleClearFilters = () => {
		setFilters({
			interventionId: "",
			familyId: "",
			memberId: "",
			letterRef: "",
			loanStatus: "",
			financeOfficer: "",
			regionalCouncil: "",
			loanAmount: "",
			cnic: "",
			bankSend: "",
			bankSendDate: "",
		});
		fetchLoans();
	};

	const handleAdd = () => {
		router.push('/dashboard/finance/loan-process/add');
	};

	const handleView = (loan: LoanData) => {
		if (!loan.Intervention_ID) return;
		const params = new URLSearchParams({
			interventionId: String(loan.Intervention_ID),
		});
		router.push(`/dashboard/finance/loan-process/view?${params.toString()}`);
	};

	const ensureHasRights = () => {
		if (!isSuperFinanceOfficer) {
			setShowAccessIssue(true);
			return false;
		}
		return true;
	};

	const handleEditFlags = (loan: LoanData) => {
		if (!ensureHasRights()) return;
		if (!loan.Intervention_ID) return;
		router.push(`/dashboard/finance/loan-process/edit?interventionId=${loan.Intervention_ID}`);
	};

	const handleGeneratePDF = async (loan: LoanData) => {
		if (!ensureHasRights()) return;
		try {
			console.log('Frontend - Generating PDF for loan:', {
				Intervention_ID: loan.Intervention_ID,
				Letter_Ref: loan.Letter_Ref,
				Family_ID: loan.Family_ID
			});

			if (!loan.Intervention_ID) {
				alert('Error: Intervention ID is missing for this loan record.');
				return;
			}

			const response = await fetch(`/api/generate-pdf?interventionId=${loan.Intervention_ID}`, {
				method: 'GET',
			});

			console.log('Frontend - PDF API response status:', response.status);

			if (response.ok) {
				const blob = await response.blob();
				console.log('Frontend - PDF blob size:', blob.size);

				if (blob.size === 0) {
					alert('Error: Generated PDF is empty. Please try again.');
					return;
				}

				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `Loan_Authorization_${loan.Letter_Ref || loan.Intervention_ID}.pdf`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			} else {
				// Try to get error message from response
				let errorMessage = 'Failed to generate PDF. Please try again.';
				try {
					const errorData = await response.json();
					errorMessage = errorData.message || errorMessage;
				} catch (e) {
					// Ignore JSON parsing errors
				}
				alert(errorMessage);
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('Error generating PDF. Please try again.');
		}
	};

	const handleDelete = async (loan: LoanData) => {
		if (!ensureHasRights()) return;
		if (!confirm(`Are you sure you want to delete loan record for Family ID: ${loan.Family_ID}?`)) {
			return;
		}

		try {
			setDeletingId(loan.Intervention_ID || 0);
			const response = await fetch(
				`/api/loan-authorization?interventionId=${loan.Intervention_ID}`,
				{
					method: "DELETE",
				}
			);

			const data = await response.json();

			if (data.success) {
				fetchLoans();
			} else {
				setError(data.message || "Failed to delete loan record");
			}
		} catch (err) {
			console.error("Error deleting loan record:", err);
			setError("Error deleting loan record");
		} finally {
			setDeletingId(null);
		}
	};

	const exportToCSV = () => {
		const headers = [
			"Intervention ID", "Family ID", "Member ID", "Letter Ref",
			"Account Number", "Beneficiary CNIC", "Member Name", "Finance Officer",
			"Main Trade", "Sub Trades", "Loan Amount", "Regional Council",
			"Loan Status", "Post Date", "Post By",
			"Bank Send", "Bank Send Date", "Collateral Mark", "Collateral Date"
		];

		const csvContent = [
			headers.join(","),
			...loans.map(loan => [
				loan.Intervention_ID || "",
				loan.Family_ID || "",
				loan.Member_ID || "",
				loan.Letter_Ref || "",
				loan.Account_Number || "",
				loan.Beneficiary_CNIC || "",
				loan.Member_Name || "",
				loan.Finance_Officer || "",
				loan.Main_Trade || "",
				loan.Sub_Trades || "",
				loan.Loan_Amount || "",
				loan.Regional_Council || "",
				loan.Loan_Status || "",
				loan.Post_Date || "",
				loan.Post_By || "",
				loan.bank_send ? "Yes" : "No",
				loan.bank_send_date || "",
				loan.collateral_mark ? "Yes" : "No",
				loan.collateral_date || ""
			].join(","))
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `loan_authorization_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
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

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Loan Process</h1>
						<p className="text-gray-600 mt-2">Loading loan authorization records...</p>
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
						<h1 className="text-3xl font-bold text-gray-900">Loan Process</h1>
						<p className="text-gray-600 mt-2">Manage loan authorization process and developed letters</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error}</p>
					<button
						onClick={fetchLoans}
						className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName="Loan Process" requiredPermission="access_loans" />;
	}

	// Show loading while checking access
	if (hasAccess === null || authLoading) {
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
		<div className="space-y-6 relative">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Loan Process</h1>
					<p className="text-gray-600 mt-2">Manage loan authorization process and developed letters</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={exportToCSV}
						disabled={loans.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add New Record
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<form onSubmit={handleFilterSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
							<label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
							<input
								type="text"
								name="memberId"
								value={filters.memberId}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Member ID"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Letter Ref</label>
							<input
								type="text"
								name="letterRef"
								value={filters.letterRef}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Letter Ref"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Finance Officer</label>
							<select
								name="financeOfficer"
								value={filters.financeOfficer}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Finance Officers</option>
								{financeOfficers.map((fo) => (
									<option key={fo} value={fo}>{fo}</option>
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
							<label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
							<input
								type="number"
								name="loanAmount"
								value={filters.loanAmount}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Loan Amount"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
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
							<label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
							<select
								name="loanStatus"
								value={filters.loanStatus}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Statuses</option>
								<option value="Pending">Pending</option>
								<option value="Banking Sending Process">Banking Sending Process</option>
								<option value="Approved">Approved</option>
								<option value="Rejected">Rejected</option>
								<option value="Disbursed">Disbursed</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Bank Send</label>
							<select
								name="bankSend"
								value={filters.bankSend}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All</option>
								<option value="true">Yes</option>
								<option value="false">No</option>
							</select>
						</div>
						{filters.bankSend === "true" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Bank Send Date</label>
								<input
									type="date"
									name="bankSendDate"
									value={filters.bankSendDate}
									onChange={handleFilterChange}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
						)}
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

			{/* Results */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
					<h3 className="text-lg font-medium text-gray-900">
						Loan Authorization Records ({loans.length})
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

				{loans.length === 0 ? (
					<div className="p-8 text-center">
						<p className="text-gray-500">No loan authorization records found.</p>
					</div>
				) : viewMode === "grid" ? (
					<div className="p-4">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{loans.map((loan) => (
								<div
									key={loan.Intervention_ID}
									className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
								>
									<div className="space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<h4 className="font-semibold text-gray-900">
													Letter Ref: {loan.Letter_Ref || "N/A"}
												</h4>
												<p className="text-sm text-gray-600">Intervention ID: {loan.Intervention_ID}</p>
											</div>
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												loan.Loan_Status === "Approved" ? "bg-green-100 text-green-800" :
												loan.Loan_Status === "Rejected" ? "bg-red-100 text-red-800" :
												loan.Loan_Status === "Disbursed" ? "bg-blue-100 text-blue-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{loan.Loan_Status || "Pending"}
											</span>
										</div>

										<div className="space-y-2 text-sm">
											<div>
												<span className="font-medium text-gray-700">Family ID:</span>
												<span className="ml-2 text-gray-900">{loan.Family_ID || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Member ID:</span>
												<span className="ml-2 text-gray-900">{loan.Member_ID || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Beneficiary Name:</span>
												<span className="ml-2 text-gray-900">{loan.Member_Name || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Finance Officer:</span>
												<span className="ml-2 text-gray-900">{loan.Finance_Officer || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Regional Council:</span>
												<span className="ml-2 text-gray-900">{loan.Regional_Council || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Trade:</span>
												<span className="ml-2 text-gray-900">
													{loan.Main_Trade && loan.Sub_Trades 
														? `${loan.Main_Trade} / ${loan.Sub_Trades}`
														: loan.Main_Trade || loan.Sub_Trades || "N/A"}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Loan Amount:</span>
												<span className="ml-2 text-gray-900">
													{loan.Loan_Amount ? formatCurrency(loan.Loan_Amount) : "N/A"}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Account Number:</span>
												<span className="ml-2 text-gray-900">{loan.Account_Number || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Beneficiary CNIC:</span>
												<span className="ml-2 text-gray-900">{loan.Beneficiary_CNIC || "N/A"}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Post Date:</span>
												<span className="ml-2 text-gray-900">{formatDate(loan.Post_Date)}</span>
											</div>
											<div>
												<span className="font-medium text-gray-700">Post By:</span>
												<span className="ml-2 text-gray-900">{loan.Post_By || "N/A"}</span>
											</div>
											<div className="flex gap-2">
												<span className="font-medium text-gray-700">Bank Send:</span>
												<span className="text-gray-900">{loan.bank_send ? "Yes" : "No"}</span>
												{loan.bank_send && loan.bank_send_date && (
													<span className="text-xs text-gray-500">
														({formatDate(loan.bank_send_date)})
													</span>
												)}
											</div>
											<div className="flex gap-2">
												<span className="font-medium text-gray-700">Collateral:</span>
												<span className="text-gray-900">{loan.collateral_mark ? "Yes" : "No"}</span>
												{loan.collateral_mark && loan.collateral_date && (
													<span className="text-xs text-gray-500">
														({formatDate(loan.collateral_date)})
													</span>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2 pt-3 border-t border-gray-200">
											<button
												onClick={() => handleGeneratePDF(loan)}
												className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
												title="Generate PDF Letter"
											>
												<Printer className="h-4 w-4" />
												PDF
											</button>
											<button
												onClick={() => handleEditFlags(loan)}
												className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
												title="Edit bank send & collateral"
											>
												<Edit className="h-4 w-4" />
												Edit
											</button>
											<button
												onClick={() => handleView(loan)}
												className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
												title="View details"
											>
												<FileText className="h-4 w-4" />
												View
											</button>
											<button
												onClick={() => handleDelete(loan)}
												disabled={deletingId === loan.Intervention_ID}
												className="px-3 py-2 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
												title="Delete"
											>
												{deletingId === loan.Intervention_ID ? (
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
												) : (
													<Trash2 className="h-4 w-4" />
												)}
											</button>
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
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Letter Ref</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finance Officer</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trade</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Send</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collateral</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Date</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{loans.map((loan) => (
									<tr key={loan.Intervention_ID} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm text-gray-900 font-medium">{loan.Letter_Ref || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{loan.Intervention_ID}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{loan.Member_Name || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{loan.Finance_Officer || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{loan.Regional_Council || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{loan.Main_Trade && loan.Sub_Trades 
												? `${loan.Main_Trade} / ${loan.Sub_Trades}`
												: loan.Main_Trade || loan.Sub_Trades || "N/A"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{loan.Loan_Amount ? formatCurrency(loan.Loan_Amount) : "N/A"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">{loan.Account_Number || "N/A"}</td>
										<td className="px-4 py-3 text-sm">
											<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
												loan.Loan_Status === "Approved" ? "bg-green-100 text-green-800" :
												loan.Loan_Status === "Rejected" ? "bg-red-100 text-red-800" :
												loan.Loan_Status === "Disbursed" ? "bg-blue-100 text-blue-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{loan.Loan_Status || "Pending"}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											<div className="flex flex-col">
												<span>{loan.bank_send ? "Yes" : "No"}</span>
												{loan.bank_send && loan.bank_send_date && (
													<span className="text-xs text-gray-500">
														{formatDate(loan.bank_send_date)}
													</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											<div className="flex flex-col">
												<span>{loan.collateral_mark ? "Yes" : "No"}</span>
												{loan.collateral_mark && loan.collateral_date && (
													<span className="text-xs text-gray-500">
														{formatDate(loan.collateral_date)}
													</span>
												)}
											</div>
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">{formatDate(loan.Post_Date)}</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEditFlags(loan)}
													className="text-gray-600 hover:text-gray-900 transition-colors"
													title="Edit bank send & collateral"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleView(loan)}
													className="text-gray-600 hover:text-gray-900 transition-colors"
													title="View details"
												>
													<FileText className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleGeneratePDF(loan)}
													className="text-blue-600 hover:text-blue-800 transition-colors"
													title="Generate PDF Letter"
												>
													<Printer className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(loan)}
													disabled={deletingId === loan.Intervention_ID}
													className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
													title="Delete"
												>
													{deletingId === loan.Intervention_ID ? (
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
													) : (
														<Trash2 className="h-4 w-4" />
													)}
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{showAccessIssue && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200">
						<h2 className="text-xl font-semibold text-red-700 mb-3 text-center">
							Access Issue
						</h2>
						<p className="text-sm text-gray-700 text-center mb-4">
							Not Allow to Edit/Update/Print/Delete Record - Please contact MIS Manager
						</p>
						<div className="flex justify-center">
							<button
								type="button"
								onClick={() => setShowAccessIssue(false)}
								className="px-4 py-2 bg-[#0b4d2b] text-white text-sm rounded-md hover:bg-[#0a3d22] transition-colors"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}

