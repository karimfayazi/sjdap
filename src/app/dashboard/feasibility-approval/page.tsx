"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, AlertCircle, Download, Eye, FileText, Users, FileCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type FeasibilityApprovalData = {
	FDP_ID: number;
	FamilyID: string | null;
	MemberID: string | null;
	MemberName: string | null;
	PlanCategory: string | null;
	CurrentBaselineIncome: number | null;
	FeasibilityType: string | null;
	InvestmentRationale: string | null;
	MarketBusinessAnalysis: string | null;
	TotalSalesRevenue: number | null;
	TotalDirectCosts: number | null;
	DirectCostPercentage: number | null;
	TotalIndirectCosts: number | null;
	TotalCosts: number | null;
	MonthlyProfitLoss: number | null;
	NetProfitLoss: number | null;
	TotalInvestmentRequired: number | null;
	InvestmentFromPEProgram: number | null;
	SubField: string | null;
	Trade: string | null;
	TrainingInstitution: string | null;
	InstitutionType: string | null;
	InstitutionCertifiedBy: string | null;
	CourseTitle: string | null;
	CourseDeliveryType: string | null;
	HoursOfInstruction: number | null;
	DurationWeeks: number | null;
	StartDate: string | null;
	EndDate: string | null;
	CostPerParticipant: number | null;
	ExpectedStartingSalary: number | null;
	FeasibilityPdfPath: string | null;
	ApprovalStatus: string | null;
	ApprovalRemarks: string | null;
	SystemDate: string | null;
	CreatedBy: string | null;
	// Family Member Info
	MemberNo: string | null;
	MemberFormNo: string | null;
	MemberFullName: string | null;
	MemberBFormOrCNIC: string | null;
	MemberGender: string | null;
	// Application Basic Info
	FormNumber: string | null;
	ApplicationFullName: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

// TypeScript types for grouped data
type FamilySummary = {
	formNumber: string;
	fullName: string;
	cnicNumber: string;
	regionalCommunity: string;
	localCommunity: string;
};

type FeasibilityRecord = {
	fdpId: number;
	submittedAt: string | null;
	submittedBy: string;
	approvalStatus: string | null;
	totalCost: number;
	familyContribution: number;
	peContribution: number;
	remarks: string | null;
	// Include all original fields for detail view
	[key: string]: any;
};

type GroupedFamilyFeasibility = {
	family: FamilySummary;
	feasibilityRecords: FeasibilityRecord[];
};

// Helper function to normalize user type
const normalizeUserType = (v?: string | null): string => {
	return (v || "").toString().trim().toUpperCase();
};

// Helper function to group records by FormNumber (client-side fallback)
const groupRecordsByFormNumber = (records: FeasibilityApprovalData[]): GroupedFamilyFeasibility[] => {
	const grouped: Record<string, GroupedFamilyFeasibility> = {};

	records.forEach((record) => {
		const formNumber = (record.FormNumber || "").trim();
		if (!formNumber) return;

		if (!grouped[formNumber]) {
			grouped[formNumber] = {
				family: {
					formNumber: formNumber,
					fullName: record.ApplicationFullName || "N/A",
					cnicNumber: record.CNICNumber || "N/A",
					regionalCommunity: record.RegionalCommunity || "N/A",
					localCommunity: record.LocalCommunity || "N/A",
				},
				feasibilityRecords: [],
			};
		}

		const totalCost = record.TotalInvestmentRequired != null ? Number(record.TotalInvestmentRequired) : 0;
		const peContribution = record.InvestmentFromPEProgram != null ? Number(record.InvestmentFromPEProgram) : 0;
		const familyContribution = totalCost - peContribution;

		// Calculate PE-Support based on PlanCategory
		const planCategory = (record.PlanCategory || "").trim().toUpperCase();
		let peSupport = 0;
		if (planCategory === "ECONOMIC") {
			peSupport = peContribution;
		} else if (planCategory === "SKILLS") {
			peSupport = record.CostPerParticipant != null ? Number(record.CostPerParticipant) : 0;
		}

		grouped[formNumber].feasibilityRecords.push({
			fdpId: record.FDP_ID,
			formNumber: record.FormNumber || null,
			memberId: record.MemberID || null,
			memberName: record.MemberName || null,
			planCategory: record.PlanCategory || null,
			feasibilityType: record.FeasibilityType || null,
			peSupport: peSupport,
			approvalStatus: record.ApprovalStatus || null,
			createdBy: record.CreatedBy || "N/A",
			submittedAt: record.SystemDate || null,
			submittedBy: record.CreatedBy || "N/A",
			totalCost: totalCost,
			familyContribution: familyContribution,
			peContribution: peContribution,
			remarks: record.ApprovalRemarks || null,
			...record,
		});
	});

	return Object.values(grouped);
};

const getStatusStyle = (rawStatus: string | null | undefined) => {
	const status = (rawStatus || "").toString().trim().toLowerCase();

	if (!status) {
		return {
			label: "Pending",
			icon: Clock,
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}

	if (status.includes("approve") || status === "approved" || status === "complete") {
		return {
			label: rawStatus || "Approved",
			icon: CheckCircle2,
			className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
		};
	}

	if (
		status.includes("reject") ||
		status.includes("rejected") ||
		status.includes("drop") ||
		status.includes("closed") ||
		status.includes("cancel")
	) {
		return {
			label: rawStatus || "Rejected",
			icon: XCircle,
			className: "bg-red-50 text-red-700 border border-red-200",
		};
	}

	if (status.includes("pending") || status.includes("review") || status.includes("process")) {
		return {
			label: rawStatus || "Pending",
			icon: Clock,
			className: "bg-amber-50 text-amber-700 border border-amber-200",
		};
	}

	// Default info style
	return {
		label: rawStatus || "Pending",
		icon: AlertCircle,
		className: "bg-blue-50 text-blue-700 border border-blue-200",
	};
};

export default function FeasibilityApprovalPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const [records, setRecords] = useState<FeasibilityApprovalData[]>([]);
	const [groupedFamilies, setGroupedFamilies] = useState<GroupedFamilyFeasibility[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [formNumberFilter, setFormNumberFilter] = useState("");
	const [fullNameFilter, setFullNameFilter] = useState("");
	const [cnicFilter, setCnicFilter] = useState("");
	const [memberNameFilter, setMemberNameFilter] = useState("");
	const [planCategoryFilter, setPlanCategoryFilter] = useState("");
	const [feasibilityTypeFilter, setFeasibilityTypeFilter] = useState("");
	const [approvalStatusFilter, setApprovalStatusFilter] = useState("");

	// Applied filters
	const [appliedFormNumberFilter, setAppliedFormNumberFilter] = useState("");
	const [appliedFullNameFilter, setAppliedFullNameFilter] = useState("");
	const [appliedCnicFilter, setAppliedCnicFilter] = useState("");
	const [appliedMemberNameFilter, setAppliedMemberNameFilter] = useState("");
	const [appliedPlanCategoryFilter, setAppliedPlanCategoryFilter] = useState("");
	const [appliedFeasibilityTypeFilter, setAppliedFeasibilityTypeFilter] = useState("");
	const [appliedApprovalStatusFilter, setAppliedApprovalStatusFilter] = useState("");

	// Detail view
	const [detailRecord, setDetailRecord] = useState<FeasibilityApprovalData | null>(null);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Approval log modal
	const [showApprovalLogModal, setShowApprovalLogModal] = useState(false);
	const [showApprovalAlert, setShowApprovalAlert] = useState(false);
	const [pendingApprovalLogRecordId, setPendingApprovalLogRecordId] = useState<number | null>(null);
	const [approvalLogRecordId, setApprovalLogRecordId] = useState<number | null>(null);
	const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
	const [loadingLogs, setLoadingLogs] = useState(false);
	const [logError, setLogError] = useState<string | null>(null);
	
	// Overall stats from database
	const [overallStats, setOverallStats] = useState({
		families: 0,
		feasibility: 0,
		pending: 0,
		approved: 0,
		rejected: 0,
	});
	const [statsLoading, setStatsLoading] = useState(true);
	const [statsError, setStatsError] = useState<string | null>(null);

	// Fetch overall stats
	useEffect(() => {
		const fetchStats = async () => {
			try {
				setStatsLoading(true);
				setStatsError(null);
				const response = await fetch("/api/feasibility-stats");
				const result = await response.json();
				
				if (result.success) {
					setOverallStats({
						families: result.families || 0,
						feasibility: result.feasibility || 0,
						pending: result.pending || 0,
						approved: result.approved || 0,
						rejected: result.rejected || 0,
					});
				} else {
					setOverallStats({
						families: result.families || 0,
						feasibility: result.feasibility || 0,
						pending: result.pending || 0,
						approved: result.approved || 0,
						rejected: result.rejected || 0,
					});
					setStatsError(result.message || "Unable to load stats");
				}
			} catch (err) {
				console.error("Error fetching feasibility stats:", err);
				setStatsError("Unable to load stats");
			} finally {
				setStatsLoading(false);
			}
		};

		fetchStats();
	}, []);

	useEffect(() => {
		const abortController = new AbortController();
		
		const fetchFeasibilityApproval = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch("/api/feasibility-approval", {
					signal: abortController.signal
				});
				
				// Check if response has a body before reading
				const contentType = response.headers.get("content-type") || "";
				const hasJsonBody = contentType.includes("application/json");
				
				// Read response as text first (before any parsing)
				let rawBody = "";
				try {
					rawBody = await response.text();
				} catch (readError) {
					console.error("[feasibility-approval] Error reading response body:", readError);
					rawBody = "";
				}
				
				// Parse JSON safely
				let parsedBody: any = null;
				if (rawBody && rawBody.trim()) {
					try {
						parsedBody = JSON.parse(rawBody);
						// Check if parsed body is empty object
						if (parsedBody && typeof parsedBody === 'object' && Object.keys(parsedBody).length === 0) {
							console.warn("[feasibility-approval] Parsed JSON is empty object, rawBody:", rawBody?.substring(0, 200));
							parsedBody = { 
								message: "Empty response object from server", 
								emptyObject: true,
								status: response.status,
								statusText: response.statusText,
								rawBody: rawBody?.substring(0, 500)
							};
						} else if (parsedBody && Object.keys(parsedBody).length > 0) {
							console.log("[feasibility-approval] Successfully parsed JSON:", parsedBody);
						}
					} catch (parseError) {
						console.error("[feasibility-approval] Failed to parse response JSON:", {
							rawBody: rawBody?.substring(0, 500),
							rawBodyLength: rawBody?.length,
							parseError: parseError instanceof Error ? parseError.message : String(parseError)
						});
						parsedBody = { 
							message: rawBody || "Unknown error", 
							parseError: true,
							rawBody: rawBody?.substring(0, 500)
						};
					}
				} else {
					console.warn("[feasibility-approval] Empty or whitespace-only response body");
					parsedBody = { 
						message: "Empty response from server", 
						emptyBody: true,
						status: response.status,
						statusText: response.statusText
					};
				}

				// Log complete debug info for all statuses
				const debugInfo = {
					status: response.status,
					statusText: response.statusText,
					url: response.url,
					rawBody: rawBody,
					parsedBody: parsedBody,
					contentType: response.headers.get("content-type")
				};
				console.log("[feasibility-approval] API Response:", debugInfo);

				if (response.status === 401) {
					const errorMsg = parsedBody?.message || "Not Authenticated. Please log in again.";
					setError(errorMsg);
					console.error("[feasibility-approval] 401 Unauthorized:", debugInfo);
					return;
				}

				if (!response.ok) {
					const errorMsg = parsedBody?.message || `Failed to load feasibility approval data (${response.status})`;
					setError(errorMsg);
					console.error("[feasibility-approval] Error response:", debugInfo);
					return;
				}

				if (parsedBody?.success) {
					setRecords(parsedBody.records || []);
					// Use grouped data if available, otherwise fall back to grouping on client
					if (parsedBody.groupedFamilies && Array.isArray(parsedBody.groupedFamilies)) {
						setGroupedFamilies(parsedBody.groupedFamilies);
					} else {
						// Fallback: group on client side
						const grouped = groupRecordsByFormNumber(parsedBody.records || []);
						setGroupedFamilies(grouped);
					}
				} else {
					setError(parsedBody?.message || "Failed to load feasibility approval data");
				}
			} catch (err) {
				// Don't set error if request was aborted
				if (err instanceof Error && err.name === 'AbortError') {
					return;
				}
				console.error("Error fetching feasibility approval data:", err);
				setError("Error fetching feasibility approval data");
			} finally {
				setLoading(false);
			}
		};

		fetchFeasibilityApproval();
		
		// Cleanup: abort request on unmount
		return () => {
			abortController.abort();
		};
	}, []);

	// Get unique values for dropdowns from all records
	const allFeasibilityRecords = groupedFamilies.flatMap(f => f.feasibilityRecords);
	const uniquePlanCategories = Array.from(
		new Set(allFeasibilityRecords.map((r) => r.PlanCategory).filter(Boolean))
	) as string[];
	const uniqueFeasibilityTypes = Array.from(
		new Set(allFeasibilityRecords.map((r) => r.FeasibilityType).filter(Boolean))
	) as string[];
	const uniqueApprovalStatuses = Array.from(
		new Set(allFeasibilityRecords.map((r) => r.approvalStatus).filter(Boolean))
	) as string[];

	// Filter groupedFamilies based on applied filters
	const filteredGroupedFamilies = groupedFamilies
		.map((groupedFamily) => {
			// Filter family level
			const matchesFormNumber =
				!appliedFormNumberFilter ||
				(groupedFamily.family.formNumber || "")
					.toLowerCase()
					.includes(appliedFormNumberFilter.toLowerCase());
			const matchesFullName =
				!appliedFullNameFilter ||
				(groupedFamily.family.fullName || "")
					.toLowerCase()
					.includes(appliedFullNameFilter.toLowerCase());
			const matchesCnic =
				!appliedCnicFilter ||
				(groupedFamily.family.cnicNumber || "")
					.toLowerCase()
					.includes(appliedCnicFilter.toLowerCase());

			// Filter feasibility records within this family
			const filteredFeasibilityRecords = groupedFamily.feasibilityRecords.filter((record) => {
				const matchesMemberName =
					!appliedMemberNameFilter ||
					(record.MemberName || "")
						.toLowerCase()
						.includes(appliedMemberNameFilter.toLowerCase());
				const matchesPlanCategory =
					!appliedPlanCategoryFilter ||
					(record.PlanCategory || "")
						.toLowerCase()
						=== appliedPlanCategoryFilter.toLowerCase();
				const matchesFeasibilityType =
					!appliedFeasibilityTypeFilter ||
					(record.FeasibilityType || "")
						.toLowerCase()
						=== appliedFeasibilityTypeFilter.toLowerCase();
				const matchesApprovalStatus =
					!appliedApprovalStatusFilter ||
					(record.approvalStatus || "")
						.toLowerCase()
						=== appliedApprovalStatusFilter.toLowerCase();

				return (
					matchesMemberName &&
					matchesPlanCategory &&
					matchesFeasibilityType &&
					matchesApprovalStatus
				);
			});

			// Only include family if it matches family filters AND has at least one matching feasibility record
			if (matchesFormNumber && matchesFullName && matchesCnic && filteredFeasibilityRecords.length > 0) {
				return {
					...groupedFamily,
					feasibilityRecords: filteredFeasibilityRecords,
				};
			}

			return null;
		})
		.filter((f): f is GroupedFamilyFeasibility => f !== null);

	// Stats - calculate from filtered grouped families
	const filteredFeasibilityRecords = filteredGroupedFamilies.flatMap(f => f.feasibilityRecords);
	const totalPlans = filteredFeasibilityRecords.length;
	const totalApproved = filteredFeasibilityRecords.filter((record) => {
		const s = (record.approvalStatus || "").toString().trim().toLowerCase();
		return s.includes("approve") || s === "approved" || s === "complete";
	}).length;
	const totalPending = filteredFeasibilityRecords.filter((record) => {
		const s = (record.approvalStatus || "").toString().trim().toLowerCase();
		return !s || s === "pending" || s.includes("pending");
	}).length;
	const totalRejected = filteredFeasibilityRecords.filter((record) => {
		const s = (record.approvalStatus || "").toString().trim().toLowerCase();
		return s.includes("reject") || s.includes("rejected");
	}).length;

	const exportToCsv = () => {
		try {
			const headers = [
				"FDP_ID",
				"FormNumber",
				"FullName",
				"CNICNumber",
				"RegionalCommunity",
				"LocalCommunity",
				"MemberID",
				"MemberName",
				"PlanCategory",
				"FeasibilityType",
				"TotalCost",
				"FamilyContribution",
				"PEContribution",
				"ApprovalStatus",
				"Remarks",
				"SubmittedAt",
				"SubmittedBy",
			];

			const csvRows: string[] = [];
			csvRows.push(headers.join(","));

			filteredGroupedFamilies.forEach((groupedFamily) => {
				groupedFamily.feasibilityRecords.forEach((record) => {
					const dataRow = [
						record.fdpId?.toString() || "N/A",
						groupedFamily.family.formNumber || "N/A",
						groupedFamily.family.fullName || "N/A",
						groupedFamily.family.cnicNumber || "N/A",
						groupedFamily.family.regionalCommunity || "N/A",
						groupedFamily.family.localCommunity || "N/A",
						record.MemberID || "N/A",
						record.MemberName || "N/A",
						record.PlanCategory || "N/A",
						record.FeasibilityType || "N/A",
						record.totalCost > 0 ? record.totalCost.toString() : "N/A",
						record.familyContribution > 0 ? record.familyContribution.toString() : "N/A",
						record.peContribution > 0 ? record.peContribution.toString() : "N/A",
						record.approvalStatus || "N/A",
						record.remarks || "N/A",
						record.submittedAt
							? new Date(record.submittedAt).toLocaleDateString("en-US")
							: "N/A",
						record.submittedBy || "N/A",
					];

					const escaped = dataRow
						.map((cell) => {
							const str = String(cell);
							if (str.includes(",") || str.includes('"') || str.includes("\n")) {
								return `"${str.replace(/"/g, '""')}"`;
							}
							return str;
						})
						.join(",");

					csvRows.push(escaped);
				});
			});

			const csvContent = csvRows.join("\n");
			const BOM = "\uFEFF";
			const blob = new Blob([BOM + csvContent], {
				type: "text/csv;charset=utf-8;",
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "feasibility_approval_export.csv";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error exporting CSV:", error);
			alert("Failed to export CSV. Please try again.");
		}
	};

	const handleResetFilters = () => {
		setFormNumberFilter("");
		setFullNameFilter("");
		setCnicFilter("");
		setMemberNameFilter("");
		setPlanCategoryFilter("");
		setFeasibilityTypeFilter("");
		setApprovalStatusFilter("");

		setAppliedFormNumberFilter("");
		setAppliedFullNameFilter("");
		setAppliedCnicFilter("");
		setAppliedMemberNameFilter("");
		setAppliedPlanCategoryFilter("");
		setAppliedFeasibilityTypeFilter("");
		setAppliedApprovalStatusFilter("");
	};

	const handleViewRow = (row: FeasibilityApprovalData) => {
		const status = (row.ApprovalStatus || "").toString().trim().toLowerCase();
		if (status.includes("approve") || status === "approved") {
			// Show custom alert with View button
			setPendingApprovalLogRecordId(row.FDP_ID);
			setShowApprovalAlert(true);
			return;
		}
		setDetailRecord(row);
		setApprovalRemarks(row.ApprovalRemarks || "");
		setSaveError(null);
	};

	const handleViewApprovalLog = () => {
		if (pendingApprovalLogRecordId) {
			setShowApprovalAlert(false);
			setApprovalLogRecordId(pendingApprovalLogRecordId);
			setShowApprovalLogModal(true);
			fetchApprovalLogs(pendingApprovalLogRecordId);
			setPendingApprovalLogRecordId(null);
		}
	};

	const fetchApprovalLogs = async (fdpId: number) => {
		try {
			setLoadingLogs(true);
			setLogError(null);

			const response = await fetch(
				`/api/approval-log?recordId=${fdpId}&moduleName=${encodeURIComponent("Feasibility Plan")}`
			);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setLogError(data?.message || "Failed to load approval logs");
				setApprovalLogs([]);
				return;
			}

			setApprovalLogs(data.records || []);
		} catch (err) {
			console.error("Error fetching approval logs:", err);
			setLogError("Error fetching approval logs");
			setApprovalLogs([]);
		} finally {
			setLoadingLogs(false);
		}
	};

	const updateApprovalStatus = async (newStatus: string) => {
		if (!detailRecord) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/feasibility-approval", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fdpId: detailRecord.FDP_ID,
					approvalStatus: newStatus,
					approvalRemarks: approvalRemarks,
				}),
			});

			// Read response as text first (before any parsing)
			const rawBody = await response.text();
			
			// Parse JSON safely
			let parsedBody: any = null;
			if (rawBody && rawBody.trim()) {
				try {
					parsedBody = JSON.parse(rawBody);
				} catch (parseError) {
					console.error("[feasibility-approval] Failed to parse PUT response JSON:", {
						rawBody,
						parseError
					});
					parsedBody = { message: rawBody || "Unknown error" };
				}
			} else {
				console.warn("[feasibility-approval] Empty PUT response body");
				parsedBody = { message: "Empty response from server" };
			}

			// Log complete debug info
			const debugInfo = {
				status: response.status,
				statusText: response.statusText,
				rawBody: rawBody,
				parsedBody: parsedBody,
				contentType: response.headers.get("content-type")
			};
			console.log("[feasibility-approval] PUT API Response:", debugInfo);

			if (response.status === 401) {
				const errorMsg = parsedBody?.message || "Not Authenticated. Please log in again.";
				throw new Error(errorMsg);
			}

			if (!response.ok || !parsedBody?.success) {
				const errorMsg = parsedBody?.message || "Failed to update approval status";
				throw new Error(errorMsg);
			}

			// Update list
			setRecords((prev) =>
				prev.map((r) =>
					r.FDP_ID === detailRecord.FDP_ID
						? {
								...r,
								ApprovalStatus: newStatus,
								ApprovalRemarks: approvalRemarks,
						  }
						: r
				)
			);

			// Update detail record
			setDetailRecord((prev) =>
				prev
					? {
							...prev,
							ApprovalStatus: newStatus,
							ApprovalRemarks: approvalRemarks,
					  }
					: prev
			);

			alert("Approval status updated successfully!");
		} catch (err) {
			console.error("Error updating approval status:", err);
			const message =
				err instanceof Error
					? err.message
					: "Error updating approval status. Please try again.";
			setSaveError(message);
		} finally {
			setSavingStatus(false);
		}
	};

	return (
		<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">Feasibility Approval</h1>
						</div>
						<p className="text-gray-600 mt-2">Manage feasibility study approvals</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-500">
							{filteredFeasibilityRecords.length > 0 ? `Records: ${filteredFeasibilityRecords.length}` : ""}
						</span>
						<button
							type="button"
							onClick={exportToCsv}
							disabled={filteredGroupedFamilies.length === 0}
							className="inline-flex items-center gap-1 rounded-md bg-[#0b4d2b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a3d22] disabled:opacity-60"
						>
							<Download className="h-3.5 w-3.5" />
							<span>Export CSV</span>
						</button>
					</div>
				</div>

				{loading && (
					<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
							<span className="ml-3 text-gray-600 mt-3 block">Loading feasibility data...</span>
						</div>
					</div>
				)}

				{!loading && error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
						{error}
					</div>
				)}

				{!loading && !error && (
					<>
						{/* Overall Stats Cards */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-gray-600 mb-1"># of Families</p>
										<p className="text-2xl font-bold text-gray-900">{overallStats.families}</p>
									</div>
									<Users className="h-5 w-5 text-gray-400" />
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-gray-600 mb-1"># of Feasibility</p>
										<p className="text-2xl font-bold text-gray-900">{overallStats.feasibility}</p>
									</div>
									<FileCheck className="h-5 w-5 text-gray-400" />
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-gray-600 mb-1"># of Pending Feasibility</p>
										<p className="text-2xl font-bold text-gray-900">{overallStats.pending}</p>
									</div>
									<Clock className="h-5 w-5 text-amber-500" />
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-gray-600 mb-1"># of Approved Feasibility</p>
										<p className="text-2xl font-bold text-gray-900">{overallStats.approved}</p>
									</div>
									<CheckCircle2 className="h-5 w-5 text-green-500" />
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm text-gray-600 mb-1"># of Rejected Feasibility</p>
										<p className="text-2xl font-bold text-gray-900">{overallStats.rejected}</p>
									</div>
									<XCircle className="h-5 w-5 text-red-500" />
								</div>
							</div>
						</div>
						{statsError && (
							<div className="text-xs text-gray-500 text-center">{statsError}</div>
						)}

						<div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							{/* Filters */}
							<div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
								<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
									<input
										type="text"
										placeholder="Form Number"
										value={formNumberFilter}
										onChange={(e) => setFormNumberFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Full Name"
										value={fullNameFilter}
										onChange={(e) => setFullNameFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="CNIC Number"
										value={cnicFilter}
										onChange={(e) => setCnicFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<input
										type="text"
										placeholder="Member Name"
										value={memberNameFilter}
										onChange={(e) => setMemberNameFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
									<select
										value={planCategoryFilter}
										onChange={(e) => setPlanCategoryFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Plan Categories</option>
										{uniquePlanCategories.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
									<select
										value={feasibilityTypeFilter}
										onChange={(e) => setFeasibilityTypeFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Feasibility Types</option>
										{uniqueFeasibilityTypes.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
									<select
										value={approvalStatusFilter}
										onChange={(e) => setApprovalStatusFilter(e.target.value)}
										className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">All Status</option>
										{uniqueApprovalStatuses.map((status) => (
											<option key={status} value={status}>
												{status}
											</option>
										))}
									</select>
								</div>
								<div className="mt-3 flex justify-end gap-2 text-xs">
									<button
										type="button"
										onClick={() => {
											setAppliedFormNumberFilter(formNumberFilter);
											setAppliedFullNameFilter(fullNameFilter);
											setAppliedCnicFilter(cnicFilter);
											setAppliedMemberNameFilter(memberNameFilter);
											setAppliedPlanCategoryFilter(planCategoryFilter);
											setAppliedFeasibilityTypeFilter(feasibilityTypeFilter);
											setAppliedApprovalStatusFilter(approvalStatusFilter);
										}}
										className="inline-flex items-center rounded-md bg-[#0b4d2b] px-3 py-1.5 font-medium text-white hover:bg-[#0a3d22]"
									>
										Filter
									</button>
									<button
										type="button"
										onClick={handleResetFilters}
										className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
									>
										Reset
									</button>
								</div>
							</div>

							<div className="overflow-x-auto max-h-[600px]">
								{filteredGroupedFamilies.length === 0 ? (
									<div className="p-6 text-center text-gray-500">
										No feasibility records found.
									</div>
								) : (
									<div className="space-y-6">
										{filteredGroupedFamilies.map((groupedFamily) => (
											<div key={groupedFamily.family.formNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
												{/* Family Information Header */}
												<div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
													<div className="flex items-center justify-between mb-4">
														<div>
															<h2 className="text-xl font-bold text-gray-900 mb-1">Family Information</h2>
															<p className="text-sm font-semibold text-gray-700">
																<span className="text-gray-500">Household Head Name:</span>{" "}
																{groupedFamily.family.formNumber || "N/A"} - {groupedFamily.family.fullName || "N/A"}
															</p>
														</div>
														{(() => {
															const userType = normalizeUserType(userProfile?.access_level);
															// Hide button for EDO user type
															if (userType === "EDO") {
																return null;
															}
															return (
																<button
																	type="button"
																	onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval?formNumber=${encodeURIComponent(groupedFamily.family.formNumber)}`)}
																	className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors font-medium"
																>
																	<Eye className="h-4 w-4" />
																	View FDP Approval
																</button>
															);
														})()}
													</div>
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
														<div className="bg-white rounded-md border border-gray-200 p-3">
															<p className="text-xs font-medium text-gray-500 mb-1">CNIC Number</p>
															<p className="text-sm font-semibold text-gray-900">{groupedFamily.family.cnicNumber || "N/A"}</p>
														</div>
														<div className="bg-white rounded-md border border-gray-200 p-3">
															<p className="text-xs font-medium text-gray-500 mb-1">Regional Community</p>
															<p className="text-sm font-semibold text-gray-900">{groupedFamily.family.regionalCommunity || "N/A"}</p>
														</div>
														<div className="bg-white rounded-md border border-gray-200 p-3">
															<p className="text-xs font-medium text-gray-500 mb-1">Local Community</p>
															<p className="text-sm font-semibold text-gray-900">{groupedFamily.family.localCommunity || "N/A"}</p>
														</div>
														<div className="bg-white rounded-md border border-gray-200 p-3">
															<p className="text-xs font-medium text-gray-500 mb-1">Total Feasibility Plans</p>
															<p className="text-sm font-semibold text-gray-900">{groupedFamily.feasibilityRecords.length}</p>
														</div>
													</div>
												</div>

												{/* Feasibility Plans GridView */}
												<div className="px-6 py-4">
													<h3 className="text-lg font-semibold text-gray-900 mb-4">Feasibility Plans</h3>
													<div className="overflow-x-auto">
														<table className="min-w-full divide-y divide-gray-200 text-sm">
															<thead className="bg-gray-50">
																<tr>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		FDP ID
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Form Number
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Member ID
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Member Name
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Plan Category
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Feasibility Type
																	</th>
																	<th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
																		PE-Support
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Approval Status
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Created By
																	</th>
																	<th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
																		Actions
																	</th>
																</tr>
															</thead>
															<tbody className="bg-white divide-y divide-gray-200">
																{groupedFamily.feasibilityRecords.length === 0 ? (
																	<tr>
																		<td colSpan={10} className="px-3 py-4 text-center text-gray-500">
																			No feasibility records found for this family.
																		</td>
																	</tr>
																) : (
																	groupedFamily.feasibilityRecords.map((record, idx) => {
																		const statusStyle = getStatusStyle(record.approvalStatus);
																		const StatusIcon = statusStyle.icon;
																		
																		// Calculate PE-Support based on PlanCategory
																		const planCategory = (record.planCategory || record.PlanCategory || "").trim().toUpperCase();
																		let peSupport = 0;
																		if (planCategory === "ECONOMIC") {
																			peSupport = record.peContribution || record.InvestmentFromPEProgram || 0;
																		} else if (planCategory === "SKILLS") {
																			peSupport = record.peSupport || record.CostPerParticipant || 0;
																		} else {
																			// Fallback to peSupport if available
																			peSupport = record.peSupport || 0;
																		}

																		// Convert record back to FeasibilityApprovalData format for handleViewRow
																		const rowData: FeasibilityApprovalData = {
																			FDP_ID: record.fdpId || record.FDP_ID,
																			FamilyID: null,
																			MemberID: record.memberId || record.MemberID || null,
																			MemberName: record.memberName || record.MemberName || null,
																			PlanCategory: record.planCategory || record.PlanCategory || null,
																			CurrentBaselineIncome: record.CurrentBaselineIncome || null,
																			FeasibilityType: record.feasibilityType || record.FeasibilityType || null,
																			InvestmentRationale: record.InvestmentRationale || null,
																			MarketBusinessAnalysis: record.MarketBusinessAnalysis || null,
																			TotalSalesRevenue: record.TotalSalesRevenue || null,
																			TotalDirectCosts: record.TotalDirectCosts || null,
																			DirectCostPercentage: null,
																			TotalIndirectCosts: record.TotalIndirectCosts || null,
																			TotalCosts: null,
																			MonthlyProfitLoss: null,
																			NetProfitLoss: record.NetProfitLoss || null,
																			TotalInvestmentRequired: record.totalCost || record.TotalInvestmentRequired || null,
																			InvestmentFromPEProgram: record.peContribution || record.InvestmentFromPEProgram || null,
																			SubField: record.SubField || null,
																			Trade: record.Trade || null,
																			TrainingInstitution: record.TrainingInstitution || null,
																			InstitutionType: record.InstitutionType || null,
																			InstitutionCertifiedBy: record.InstitutionCertifiedBy || null,
																			CourseTitle: record.CourseTitle || null,
																			CourseDeliveryType: record.CourseDeliveryType || null,
																			HoursOfInstruction: record.HoursOfInstruction || null,
																			DurationWeeks: record.DurationWeeks || null,
																			StartDate: record.StartDate || null,
																			EndDate: record.EndDate || null,
																			CostPerParticipant: record.CostPerParticipant || null,
																			ExpectedStartingSalary: record.ExpectedStartingSalary || null,
																			FeasibilityPdfPath: record.FeasibilityPdfPath || null,
																			ApprovalStatus: record.approvalStatus || record.ApprovalStatus || null,
																			ApprovalRemarks: record.remarks || record.ApprovalRemarks || null,
																			SystemDate: record.submittedAt || record.SystemDate || null,
																			CreatedBy: record.createdBy || record.submittedBy || record.CreatedBy || null,
																			MemberNo: null,
																			MemberFormNo: record.MemberFormNo || null,
																			MemberFullName: record.MemberFullName || null,
																			MemberBFormOrCNIC: record.MemberBFormOrCNIC || null,
																			MemberGender: record.MemberGender || null,
																			FormNumber: record.formNumber || record.FormNumber || groupedFamily.family.formNumber,
																			ApplicationFullName: groupedFamily.family.fullName,
																			CNICNumber: groupedFamily.family.cnicNumber,
																			RegionalCommunity: groupedFamily.family.regionalCommunity,
																			LocalCommunity: groupedFamily.family.localCommunity,
																		};
																		return (
																			<tr key={record.fdpId || record.FDP_ID || idx} className="hover:bg-gray-50">
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.fdpId || record.FDP_ID || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.formNumber || record.FormNumber || groupedFamily.family.formNumber || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.memberId || record.MemberID || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.memberName || record.MemberName || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.planCategory || record.PlanCategory || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.feasibilityType || record.FeasibilityType || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900 text-right">
																					{peSupport > 0 ? peSupport.toLocaleString() : "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap">
																					<span
																						className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusStyle.className}`}
																					>
																						<StatusIcon className="h-3 w-3" />
																						{statusStyle.label}
																					</span>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap text-gray-900">
																					{record.createdBy || record.submittedBy || record.CreatedBy || "N/A"}
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap">
																					<button
																						type="button"
																						onClick={() => handleViewRow(rowData)}
																						className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
																					>
																						<Eye className="h-3 w-3" />
																						View
																					</button>
																				</td>
																			</tr>
																		);
																	})
																)}
															</tbody>
														</table>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</>
				)}

			{/* Detail Modal */}
			{detailRecord && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDetailRecord(null)}></div>
						<div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
								<h2 className="text-xl font-bold text-gray-900">Feasibility Details</h2>
								<button
									type="button"
									onClick={() => setDetailRecord(null)}
									className="text-gray-400 hover:text-gray-600"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{saveError && (
									<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
										{saveError}
									</div>
								)}

								<div className="space-y-6">
									{/* Basic Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">FDP ID</p>
												<p className="text-gray-900">{detailRecord.FDP_ID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Family ID</p>
												<p className="text-gray-900">{detailRecord.FamilyID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Member ID</p>
												<p className="text-gray-900">{detailRecord.MemberID || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Member Name</p>
												<p className="text-gray-900">{detailRecord.MemberName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Plan Category</p>
												<p className="text-gray-900">{detailRecord.PlanCategory || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Feasibility Type</p>
												<p className="text-gray-900">{detailRecord.FeasibilityType || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Current Baseline Income</p>
												<p className="text-gray-900">
													{detailRecord.CurrentBaselineIncome != null
														? detailRecord.CurrentBaselineIncome.toLocaleString()
														: "N/A"}
												</p>
											</div>
										</div>
									</div>

									{/* Application Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Application Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">Form Number</p>
												<p className="text-gray-900">{detailRecord.FormNumber || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Full Name</p>
												<p className="text-gray-900">{detailRecord.ApplicationFullName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">CNIC Number</p>
												<p className="text-gray-900">{detailRecord.CNICNumber || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Regional Community</p>
												<p className="text-gray-900">{detailRecord.RegionalCommunity || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Local Community</p>
												<p className="text-gray-900">{detailRecord.LocalCommunity || "N/A"}</p>
											</div>
										</div>
									</div>

									{/* Member Information */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Member Information</h3>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-gray-700">Member No</p>
												<p className="text-gray-900">{detailRecord.MemberNo || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Full Name</p>
												<p className="text-gray-900">{detailRecord.MemberFullName || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">B-Form/CNIC</p>
												<p className="text-gray-900">{detailRecord.MemberBFormOrCNIC || "N/A"}</p>
											</div>
											<div>
												<p className="font-medium text-gray-700">Gender</p>
												<p className="text-gray-900">{detailRecord.MemberGender || "N/A"}</p>
											</div>
										</div>
									</div>

									{/* Economic Feasibility Details */}
									{detailRecord.FeasibilityType === "Economic" && (
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-3">Economic Feasibility</h3>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="font-medium text-gray-700">Total Sales Revenue</p>
													<p className="text-gray-900">
														{detailRecord.TotalSalesRevenue != null
															? detailRecord.TotalSalesRevenue.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Direct Costs</p>
													<p className="text-gray-900">
														{detailRecord.TotalDirectCosts != null
															? detailRecord.TotalDirectCosts.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Indirect Costs</p>
													<p className="text-gray-900">
														{detailRecord.TotalIndirectCosts != null
															? detailRecord.TotalIndirectCosts.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Net Profit/Loss</p>
													<p className="text-gray-900">
														{detailRecord.NetProfitLoss != null
															? detailRecord.NetProfitLoss.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Total Investment Required</p>
													<p className="text-gray-900">
														{detailRecord.TotalInvestmentRequired != null
															? detailRecord.TotalInvestmentRequired.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Investment from PE Program</p>
													<p className="text-gray-900">
														{detailRecord.InvestmentFromPEProgram != null
															? Math.round(detailRecord.InvestmentFromPEProgram).toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div className="col-span-2">
													<p className="font-medium text-gray-700">Investment Rationale</p>
													<p className="text-gray-900 whitespace-pre-wrap">
														{detailRecord.InvestmentRationale || "N/A"}
													</p>
												</div>
												<div className="col-span-2">
													<p className="font-medium text-gray-700">Market/Business Analysis</p>
													<p className="text-gray-900 whitespace-pre-wrap">
														{detailRecord.MarketBusinessAnalysis || "N/A"}
													</p>
												</div>
											</div>
										</div>
									)}

									{/* Skills Development Details */}
									{detailRecord.FeasibilityType === "Skills Development" && (
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-3">Skills Development</h3>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="font-medium text-gray-700">Sub Field</p>
													<p className="text-gray-900">{detailRecord.SubField || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Trade</p>
													<p className="text-gray-900">{detailRecord.Trade || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Training Institution</p>
													<p className="text-gray-900">{detailRecord.TrainingInstitution || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Course Title</p>
													<p className="text-gray-900">{detailRecord.CourseTitle || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Duration (Weeks)</p>
													<p className="text-gray-900">{detailRecord.DurationWeeks || "N/A"}</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Cost Per Participant</p>
													<p className="text-gray-900">
														{detailRecord.CostPerParticipant != null
															? detailRecord.CostPerParticipant.toLocaleString()
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-gray-700">Expected Starting Salary</p>
													<p className="text-gray-900">
														{detailRecord.ExpectedStartingSalary != null
															? detailRecord.ExpectedStartingSalary.toLocaleString()
															: "N/A"}
													</p>
												</div>
											</div>
										</div>
									)}

									{/* Approval Section */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-3">Approval</h3>
										<div className="space-y-4">
											<div>
												<p className="font-medium text-gray-700 mb-2">Current Status</p>
												{(() => {
													const statusStyle = getStatusStyle(detailRecord.ApprovalStatus);
													const StatusIcon = statusStyle.icon;
													return (
														<span
															className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusStyle.className}`}
														>
															<StatusIcon className="h-4 w-4" />
															{statusStyle.label}
														</span>
													);
												})()}
											</div>
											<div>
												<p className="font-medium text-gray-700 mb-2">Approval Remarks</p>
												<textarea
													value={approvalRemarks}
													onChange={(e) => setApprovalRemarks(e.target.value)}
													disabled={
														(detailRecord.ApprovalStatus || "")
															.toString()
															.trim()
															.toLowerCase()
															.includes("approve") ||
														(detailRecord.ApprovalStatus || "").toString().trim().toLowerCase() === "approved"
													}
													className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
													rows={4}
													placeholder="Enter approval remarks..."
												/>
											</div>
											{detailRecord.FeasibilityPdfPath && (
												<div>
													<p className="font-medium text-gray-700 mb-2">Feasibility PDF</p>
													<a
														href={detailRecord.FeasibilityPdfPath}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
													>
														<FileText className="h-4 w-4" />
														View PDF
													</a>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setDetailRecord(null)}
									className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									Close
								</button>
								{(() => {
									const isApproved =
										(detailRecord.ApprovalStatus || "")
											.toString()
											.trim()
											.toLowerCase()
											.includes("approve") ||
										(detailRecord.ApprovalStatus || "").toString().trim().toLowerCase() === "approved";
									
									if (!isApproved) {
										return (
											<>
												<button
													type="button"
													onClick={() => updateApprovalStatus("Rejected")}
													disabled={savingStatus}
													className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
												>
													{savingStatus ? "Saving..." : "Reject"}
												</button>
												<button
													type="button"
													onClick={() => updateApprovalStatus("Approved")}
													disabled={savingStatus}
													className="rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22] disabled:opacity-50"
												>
													{savingStatus ? "Saving..." : "Approve"}
												</button>
											</>
										);
									}
									return null;
								})()}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Approval Alert Modal */}
			{showApprovalAlert && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowApprovalAlert(false);
								setPendingApprovalLogRecordId(null);
							}}
						></div>
						<div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-amber-50">
								<h2 className="text-lg font-bold text-amber-900">Approval Status</h2>
								<button
									type="button"
									onClick={() => {
										setShowApprovalAlert(false);
										setPendingApprovalLogRecordId(null);
									}}
									className="text-amber-600 hover:text-amber-800"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="px-6 py-6">
								<div className="flex items-start">
									<AlertCircle className="h-6 w-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
									<div className="flex-1">
										<p className="text-gray-800 font-medium mb-4">
											This feasibility is already approved
										</p>
										<div className="flex justify-end gap-3">
											<button
												type="button"
												onClick={() => {
													setShowApprovalAlert(false);
													setPendingApprovalLogRecordId(null);
												}}
												className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
											>
												Close
											</button>
											<button
												type="button"
												onClick={handleViewApprovalLog}
												className="inline-flex items-center gap-2 rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22]"
											>
												<Eye className="h-4 w-4" />
												View
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Approval Log Modal */}
			{showApprovalLogModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowApprovalLogModal(false);
								setApprovalLogRecordId(null);
								setApprovalLogs([]);
								setLogError(null);
							}}
						></div>
						<div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
								<div>
									<h2 className="text-xl font-bold text-gray-900">Approval Log</h2>
									<p className="text-sm text-gray-600 mt-1">
										Record ID: {approvalLogRecordId} | Module: Feasibility Plan
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowApprovalLogModal(false);
										setApprovalLogRecordId(null);
										setApprovalLogs([]);
										setLogError(null);
									}}
									className="text-gray-400 hover:text-gray-600"
								>
									<XCircle className="h-5 w-5" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingLogs ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading approval logs...</span>
										</div>
									</div>
								) : logError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{logError}
									</div>
								) : approvalLogs.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<p className="text-gray-600">No approval logs found for this record.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
											<div className="flex items-start">
												<AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
												<div>
													<p className="text-blue-800 font-medium">This feasibility is already approved</p>
													<p className="text-blue-700 text-sm mt-1">
														Below is the approval history for this record.
													</p>
												</div>
											</div>
										</div>

										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Log ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Module Name
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Record ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action Level
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action By
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action At
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Action Type
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Remarks
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{approvalLogs.map((log, idx) => (
															<tr key={log.LogID || idx} className="hover:bg-gray-50">
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.LogID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ModuleName || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.RecordID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm">
																	{log.ActionLevel ? (
																		<span
																			className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
																				(log.ActionLevel || "")
																					.toString()
																					.trim()
																					.toLowerCase()
																					.includes("approve")
																					? "bg-emerald-50 text-emerald-700 border border-emerald-200"
																					: (log.ActionLevel || "")
																							.toString()
																							.trim()
																							.toLowerCase()
																							.includes("reject")
																					? "bg-red-50 text-red-700 border border-red-200"
																					: "bg-amber-50 text-amber-700 border border-amber-200"
																			}`}
																		>
																			{log.ActionLevel}
																		</span>
																	) : (
																		"N/A"
																	)}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ActionBy || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ActionAt
																		? new Date(log.ActionAt).toLocaleString("en-US", {
																				year: "numeric",
																				month: "short",
																				day: "numeric",
																				hour: "2-digit",
																				minute: "2-digit",
																		  })
																		: "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{log.ActionType || "N/A"}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																	<div className="truncate" title={log.Remarks || ""}>
																		{log.Remarks || "N/A"}
																	</div>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowApprovalLogModal(false);
										setApprovalLogRecordId(null);
										setApprovalLogs([]);
										setLogError(null);
									}}
									className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
