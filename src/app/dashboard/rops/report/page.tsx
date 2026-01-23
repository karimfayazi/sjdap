"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Filter, X, Download, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";
import jsPDF from "jspdf";

type ROPReportRow = {
	ROPId: number;
	FormNumber: string;
	BeneficiaryID: string | null;
	BeneficiaryName: string | null;
	InterventionID: string | null;
	InterventionSection: string | null;
	PayableAmount: number | null;
	MonthOfPayment: string | null;
	PaymentType: string | null;
	PayAmount: number | null;
	SubmittedBy: string | null;
	SubmittedAt: string | null;
	Remarks: string | null;
	Payment_Done: string | null;
	BankNo: number | null;
	BankName: string | null;
	AccountTitle: string | null;
	AccountNo: string | null;
	BankCode: string | null;
	FamilyFullName: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

type Summary = {
	familiesCount: number;
	interventionsCount: number;
	totalAmount: number;
	economicCount: number;
	economicTotal: number;
	socialCount: number;
	socialTotal: number;
};

type FilterOptions = {
	months: string[];
	sections: string[];
	mentors: string[];
	regionalCouncils: string[];
	localCouncils: string[];
};

type Filters = {
	regionalCouncilId: string;
	localCouncilId: string;
	formNumber: string;
	headName: string;
	monthOfPayment: string;
	section: string;
	mentor: string;
};

function ROPsReportContent() {
	const { userProfile } = useAuth();
	const router = useRouter();

	const [rows, setRows] = useState<ROPReportRow[]>([]);
	const [summary, setSummary] = useState<Summary | null>(null);
	const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	
	// Check if user is Editor
	const isEditor = userProfile?.access_level 
		? (userProfile.access_level.trim().toUpperCase() === "EDITOR")
		: false;
	const userFullName = userProfile?.full_name || "";
	
	const [filters, setFilters] = useState<Filters>({
		regionalCouncilId: "",
		localCouncilId: "",
		formNumber: "",
		headName: "",
		monthOfPayment: "",
		section: "",
		mentor: isEditor ? userFullName : "", // For Editor, default to their own name
	});
	const [pagination, setPagination] = useState({
		page: 1,
		pageSize: 50,
		total: 0,
		totalPages: 0,
	});
	const [exportingPDF, setExportingPDF] = useState(false);

	// Check route access - Only allow: Editor, Finance and Administration, Managment
	// Also initialize mentor filter for Editor users
	useEffect(() => {
		if (!userProfile) return;
		
		const userType = userProfile.access_level;
		const normalizedUserType = (userType ?? '').trim().toUpperCase();
		
		// Allowed user types for Reports
		const allowedUserTypes = ["EDITOR", "FINANCE AND ADMINISTRATION", "MANAGMENT", "REGIONAL AM"];
		const isAllowed = allowedUserTypes.includes(normalizedUserType);
		
		if (!isAllowed) {
			// Redirect unauthorized users (including Super Admin)
			router.push('/dashboard');
			return;
		}
		
		// For Editor users, set mentor filter to their own name
		if (normalizedUserType === "EDITOR" && userProfile.full_name) {
			setFilters(prev => ({
				...prev,
				mentor: userProfile.full_name || ""
			}));
		}
	}, [userProfile, router]);

	const fetchReport = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (filters.regionalCouncilId) params.append("regionalCouncilId", filters.regionalCouncilId);
			if (filters.localCouncilId) params.append("localCouncilId", filters.localCouncilId);
			if (filters.formNumber) params.append("formNumber", filters.formNumber);
			if (filters.headName) params.append("headName", filters.headName);
			if (filters.monthOfPayment) params.append("monthOfPayment", filters.monthOfPayment);
			if (filters.section) params.append("section", filters.section);
			// For Editor users, don't send mentor filter (server-side enforces it)
			// For non-Editor users, send mentor filter if provided
			if (filters.mentor && !isEditor) {
				params.append("mentor", filters.mentor);
			}
			params.append("page", pagination.page.toString());
			params.append("pageSize", pagination.pageSize.toString());

			const response = await fetch(`/api/rops/report?${params.toString()}`);
			const data = await response.json();

			if (data.ok) {
				setRows(data.rows || []);
				setSummary(data.summary || null);
				setFilterOptions(data.filterOptions || null);
				setPagination(data.pagination || pagination);
			} else {
				setError(data.message || "Failed to fetch report");
			}
		} catch (err) {
			console.error("Error fetching report:", err);
			setError(err instanceof Error ? err.message : "Error fetching report");
		} finally {
			setLoading(false);
		}
	}, [filters, pagination.page, pagination.pageSize, isEditor]);

	useEffect(() => {
		fetchReport();
	}, [fetchReport]);

	const handleFilterChange = (key: keyof Filters, value: string) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setPagination(prev => ({ ...prev, page: 1 }));
	};

	const clearFilters = () => {
		setFilters({
			regionalCouncilId: "",
			localCouncilId: "",
			formNumber: "",
			headName: "",
			monthOfPayment: "",
			section: "",
			mentor: "",
		});
		setPagination(prev => ({ ...prev, page: 1 }));
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return `PKR ${amount.toLocaleString()}`;
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
		} catch {
			return dateString;
		}
	};

	const formatMonth = (monthString: string | null) => {
		if (!monthString) return "N/A";
		try {
			// Handle both 'yyyy-MM' format and date strings
			let year: number, month: number;
			if (monthString.includes("-")) {
				const parts = monthString.split("-");
				year = parseInt(parts[0]);
				month = parseInt(parts[1]);
			} else {
				const date = new Date(monthString);
				year = date.getFullYear();
				month = date.getMonth() + 1;
			}
			const date = new Date(year, month - 1);
			return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
		} catch {
			return monthString;
		}
	};

	const formatBankDetails = (row: ROPReportRow) => {
		if (!row.BankName && !row.AccountTitle && !row.AccountNo && !row.BankCode) {
			return "—";
		}
		const parts: string[] = [];
		if (row.BankName) parts.push(row.BankName);
		if (row.AccountTitle) parts.push(row.AccountTitle);
		if (row.AccountNo) parts.push(row.AccountNo);
		const bankDetails = parts.join(" , ");
		if (row.BankCode) {
			return bankDetails ? `${bankDetails} - ${row.BankCode}` : `— - ${row.BankCode}`;
		}
		return bankDetails || "—";
	};

	const handleExportPDF = async () => {
		try {
			setExportingPDF(true);

			// Fetch all rows for PDF (without pagination)
			const params = new URLSearchParams();
			if (filters.regionalCouncilId) params.append("regionalCouncilId", filters.regionalCouncilId);
			if (filters.localCouncilId) params.append("localCouncilId", filters.localCouncilId);
			if (filters.formNumber) params.append("formNumber", filters.formNumber);
			if (filters.headName) params.append("headName", filters.headName);
			if (filters.monthOfPayment) params.append("monthOfPayment", filters.monthOfPayment);
			if (filters.section) params.append("section", filters.section);
			if (filters.mentor) params.append("mentor", filters.mentor);
			params.append("pageSize", "10000"); // Get all rows

			const response = await fetch(`/api/rops/report?${params.toString()}`);
			const data = await response.json();

			if (!data.ok) {
				alert("Failed to fetch data for PDF export");
				return;
			}

			const allRows: ROPReportRow[] = data.rows || [];
			const pdfSummary: Summary | null = data.summary || null;

			// Create PDF
			const pdf = new jsPDF({
				orientation: "landscape",
				unit: "mm",
				format: "a4",
			});

			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const margin = 10;
			const contentWidth = pageWidth - 2 * margin;
			let yPos = margin;

			// Header
			pdf.setFillColor(11, 77, 43); // #0b4d2b
			pdf.rect(0, 0, pageWidth, 20, "F");
			pdf.setTextColor(255, 255, 255);
			pdf.setFontSize(16);
			pdf.setFont("helvetica", "bold");
			pdf.text("ROPs Report", pageWidth / 2, 12, { align: "center" });
			pdf.setFontSize(10);
			pdf.setFont("helvetica", "normal");
			pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 18, { align: "center" });
			pdf.setTextColor(0, 0, 0);
			yPos = 25;

			// Filters section
			if (Object.values(filters).some(v => v)) {
				pdf.setFontSize(10);
				pdf.setFont("helvetica", "bold");
				pdf.text("Filters Applied:", margin, yPos);
				yPos += 5;
				pdf.setFont("helvetica", "normal");
				pdf.setFontSize(9);
				if (filters.regionalCouncilId) pdf.text(`Regional Council: ${filters.regionalCouncilId}`, margin, yPos);
				if (filters.localCouncilId) {
					pdf.text(`Local Council: ${filters.localCouncilId}`, margin + 70, yPos);
					yPos += 4;
				} else if (filters.regionalCouncilId) yPos += 4;
				if (filters.formNumber) pdf.text(`Form Number: ${filters.formNumber}`, margin, yPos);
				if (filters.headName) {
					pdf.text(`Head Name: ${filters.headName}`, margin + 70, yPos);
					yPos += 4;
				} else if (filters.formNumber) yPos += 4;
				if (filters.monthOfPayment) pdf.text(`Month: ${formatMonth(filters.monthOfPayment)}`, margin, yPos);
				if (filters.section) {
					pdf.text(`Section: ${filters.section}`, margin + 70, yPos);
					yPos += 4;
				} else if (filters.monthOfPayment) yPos += 4;
				if (filters.mentor) pdf.text(`Mentor: ${filters.mentor}`, margin, yPos);
				if (filters.mentor) yPos += 4;
				yPos += 3;
			}

			// Summary section
			if (pdfSummary) {
				pdf.setDrawColor(200, 200, 200);
				pdf.line(margin, yPos, pageWidth - margin, yPos);
				yPos += 5;
				pdf.setFontSize(11);
				pdf.setFont("helvetica", "bold");
				pdf.text("Summary", margin, yPos);
				yPos += 6;
				pdf.setFontSize(9);
				pdf.setFont("helvetica", "normal");
				pdf.text(`Families: ${pdfSummary.familiesCount}`, margin, yPos);
				pdf.text(`Interventions: ${pdfSummary.interventionsCount}`, margin + 50, yPos);
				pdf.text(`Total Amount: ${formatCurrency(pdfSummary.totalAmount)}`, margin + 100, yPos);
				yPos += 5;
				pdf.text(`Economic: ${pdfSummary.economicCount} interventions, ${formatCurrency(pdfSummary.economicTotal)}`, margin, yPos);
				yPos += 5;
				pdf.text(`Social: ${pdfSummary.socialCount} interventions, ${formatCurrency(pdfSummary.socialTotal)}`, margin, yPos);
				yPos += 8;
			}

			// Table
			if (allRows.length > 0) {
				pdf.setDrawColor(200, 200, 200);
				pdf.line(margin, yPos, pageWidth - margin, yPos);
				yPos += 5;

				// Table header
				const headerHeight = 8;
				const rowHeight = 6;
				const colWidths = [12, 18, 15, 20, 18, 18, 15, 18, 18, 20, 20, 20, 15, 30];
				const headers = ["ROPId", "FormNo", "BeneficiaryID", "BeneficiaryName", "InterventionID", "Section", "Month", "PaymentType", "PayAmount", "ROP-Generated By", "ROP Generated Date", "Remarks", "Payment Done", "Bank Details"];
				
				pdf.setFillColor(240, 240, 240);
				pdf.rect(margin, yPos, contentWidth, headerHeight, "F");
				pdf.setDrawColor(200, 200, 200);
				pdf.rect(margin, yPos, contentWidth, headerHeight);

				let xPos = margin + 2;
				pdf.setFontSize(6);
				pdf.setFont("helvetica", "bold");
				headers.forEach((header, idx) => {
					pdf.text(header, xPos, yPos + 5);
					xPos += colWidths[idx];
				});
				yPos += headerHeight;

				// Table rows
				pdf.setFont("helvetica", "normal");
				pdf.setFontSize(5);
				allRows.forEach((row, idx) => {
					if (yPos + rowHeight > pageHeight - 10) {
						pdf.addPage();
						// Repeat header
						pdf.setFillColor(240, 240, 240);
						pdf.rect(margin, margin, contentWidth, headerHeight, "F");
						pdf.setDrawColor(200, 200, 200);
						pdf.rect(margin, margin, contentWidth, headerHeight);
						xPos = margin + 2;
						pdf.setFontSize(6);
						pdf.setFont("helvetica", "bold");
						headers.forEach((header, hIdx) => {
							pdf.text(header, xPos, margin + 5);
							xPos += colWidths[hIdx];
						});
						yPos = margin + headerHeight;
						pdf.setFont("helvetica", "normal");
						pdf.setFontSize(5);
					}

					const rowData = [
						String(row.ROPId || ""),
						row.FormNumber || "",
						row.BeneficiaryID || "",
						(row.BeneficiaryName || "").substring(0, 15),
						row.InterventionID || "",
						row.InterventionSection || "",
						formatMonth(row.MonthOfPayment),
						row.PaymentType || "",
						formatCurrency(row.PayAmount),
						row.SubmittedBy || "",
						formatDate(row.SubmittedAt),
						(row.Remarks || "").substring(0, 15),
						row.Payment_Done || "",
						formatBankDetails(row).substring(0, 20),
					];

					xPos = margin + 2;
					rowData.forEach((cell, cIdx) => {
						const cellText = String(cell).substring(0, 20);
						pdf.text(cellText, xPos, yPos + 4);
						xPos += colWidths[cIdx];
					});

					pdf.setDrawColor(240, 240, 240);
					pdf.line(margin, yPos, pageWidth - margin, yPos);
					yPos += rowHeight;
				});
			}

			// Save PDF
			const fileName = `ROPs_Report_${new Date().toISOString().split('T')[0]}.pdf`;
			pdf.save(fileName);
		} catch (err) {
			console.error("Error exporting PDF:", err);
			alert("Failed to export PDF");
		} finally {
			setExportingPDF(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
						ROPs Report
					</h1>
					<p className="text-gray-600 mt-2">View and export approved ROPs report</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchReport}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={handleExportPDF}
						disabled={exportingPDF || loading}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
					>
						{exportingPDF ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						Export PDF
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-gray-900">Filters</h2>
					<button
						onClick={clearFilters}
						className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
					>
						<X className="h-4 w-4" />
						Clear All
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
						<select
							value={filters.regionalCouncilId}
							onChange={(e) => handleFilterChange("regionalCouncilId", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All</option>
							{filterOptions?.regionalCouncils.map((council) => (
								<option key={council} value={council}>
									{council}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
						<select
							value={filters.localCouncilId}
							onChange={(e) => handleFilterChange("localCouncilId", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All</option>
							{filterOptions?.localCouncils.map((council) => (
								<option key={council} value={council}>
									{council}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
						<input
							type="text"
							value={filters.formNumber}
							onChange={(e) => handleFilterChange("formNumber", e.target.value)}
							placeholder="e.g., PE-00006"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Head Name</label>
						<input
							type="text"
							value={filters.headName}
							onChange={(e) => handleFilterChange("headName", e.target.value)}
							placeholder="Search by head name..."
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Month of ROP</label>
						<select
							value={filters.monthOfPayment}
							onChange={(e) => handleFilterChange("monthOfPayment", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Months</option>
							{filterOptions?.months.map((month) => (
								<option key={month} value={month}>
									{formatMonth(month)}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
						<select
							value={filters.section}
							onChange={(e) => handleFilterChange("section", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Sections</option>
							{filterOptions?.sections.map((section) => (
								<option key={section} value={section}>
									{section}
								</option>
							))}
						</select>
					</div>

					{!isEditor && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
							<select
								value={filters.mentor}
								onChange={(e) => handleFilterChange("mentor", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Mentors</option>
								{filterOptions?.mentors.map((mentor) => (
									<option key={mentor} value={mentor}>
										{mentor}
									</option>
								))}
							</select>
						</div>
					)}

					<div className="flex items-end">
						<button
							onClick={fetchReport}
							className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							<Filter className="h-4 w-4" />
							Apply Filters
						</button>
					</div>
				</div>
			</div>

			{/* Summary Cards */}
			{summary && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600"># of Families</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{summary.familiesCount}</p>
							</div>
							<div className="p-3 bg-blue-100 rounded-lg">
								<FileText className="h-6 w-6 text-blue-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600"># of Interventions</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{summary.interventionsCount}</p>
								<p className="text-sm text-gray-500 mt-1">{formatCurrency(summary.totalAmount)}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-lg">
								<FileText className="h-6 w-6 text-green-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Economic Interventions</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{summary.economicCount}</p>
								<p className="text-sm text-gray-500 mt-1">{formatCurrency(summary.economicTotal)}</p>
							</div>
							<div className="p-3 bg-purple-100 rounded-lg">
								<FileText className="h-6 w-6 text-purple-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Social Interventions</p>
								<p className="text-2xl font-bold text-gray-900 mt-1">{summary.socialCount}</p>
								<p className="text-sm text-gray-500 mt-1">{formatCurrency(summary.socialTotal)}</p>
							</div>
							<div className="p-3 bg-orange-100 rounded-lg">
								<FileText className="h-6 w-6 text-orange-600" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Data Table */}
			{loading ? (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
					<p className="text-gray-600 mt-4">Loading report data...</p>
				</div>
			) : rows.length === 0 ? (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
					<p className="text-gray-600">No records found.</p>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROPId</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Number</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BeneficiaryID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">InterventionID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Amount</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROP-Generated By</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROP Generated Date</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Done</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{rows.map((row) => (
									<tr key={row.ROPId} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.ROPId}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.FormNumber}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.BeneficiaryID || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.BeneficiaryName || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.InterventionID || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.InterventionSection || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatMonth(row.MonthOfPayment)}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.PaymentType || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.PayAmount)}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.SubmittedBy || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(row.SubmittedAt)}</td>
										<td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{row.Remarks || "N/A"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.Payment_Done || "N/A"}</td>
										<td className="px-6 py-4 text-sm text-gray-900">{formatBankDetails(row)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{pagination.totalPages > 1 && (
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
									disabled={pagination.page === 1}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								<button
									onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
									disabled={pagination.page === pagination.totalPages}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function ROPsReportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
						<p className="mt-4 text-gray-600 font-medium">Loading...</p>
					</div>
				</div>
			}
		>
			<ROPsReportContent />
		</Suspense>
	);
}
