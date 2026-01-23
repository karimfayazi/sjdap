"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, XCircle, CreditCard, RefreshCw, Users, FileText, MapPin, Hash, Search, Filter, X, ChevronLeft, ChevronRight, Image as ImageIcon, Activity, FileBarChart } from "lucide-react";

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
	
	// In-modal action state (for showing content inside Family Members modal)
	const [activeModalAction, setActiveModalAction] = useState<'economic' | 'education' | 'food' | 'habitat' | 'bankAccount' | 'generateROP' | null>(null);
	const [activeModalMemberId, setActiveModalMemberId] = useState<string | null>(null);
	const [modalActionData, setModalActionData] = useState<any[]>([]);
	const [loadingModalAction, setLoadingModalAction] = useState(false);
	const [modalActionError, setModalActionError] = useState<string | null>(null);

	// Generate ROP form state
	const [ropFormData, setRopFormData] = useState<{
		monthOfPayment: string;
		paymentType: string;
		remarks: string;
		interventions: Array<{
			InterventionID: string;
			Section: string;
			PayableAmount: number;
			PayAmount: number;
		}>;
	}>({
		monthOfPayment: "",
		paymentType: "",
		remarks: "",
		interventions: []
	});
	const [submittingROP, setSubmittingROP] = useState(false);
	const [ropSuccess, setRopSuccess] = useState(false);

	// Bank account modal state
	const [showBankModal, setShowBankModal] = useState(false);
	const [selectedBankFormNumber, setSelectedBankFormNumber] = useState<string | null>(null);
	const [selectedBankMemberId, setSelectedBankMemberId] = useState<string | null>(null);
	const [bankAccounts, setBankAccounts] = useState<any[]>([]);
	const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
	const [bankError, setBankError] = useState<string | null>(null);

	// Bank status for ROP Generate validation
	const [bankStatusMap, setBankStatusMap] = useState<Record<string, { hasBank: boolean; bankNo?: number }>>({});
	const [loadingBankStatus, setLoadingBankStatus] = useState(false);
	const [bankStatusError, setBankStatusError] = useState<string | null>(null);

	// Intervention section modal state
	const [showInterventionModal, setShowInterventionModal] = useState(false);
	const [selectedInterventionFormNumber, setSelectedInterventionFormNumber] = useState<string | null>(null);
	const [selectedInterventionMemberId, setSelectedInterventionMemberId] = useState<string | null>(null);
	const [selectedInterventionSection, setSelectedInterventionSection] = useState<string | null>(null);
	const [interventions, setInterventions] = useState<any[]>([]);
	const [loadingInterventions, setLoadingInterventions] = useState(false);
	const [interventionError, setInterventionError] = useState<string | null>(null);

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

	const fetchBankStatus = async (formNumber: string, beneficiaryIds: string[]) => {
		if (!formNumber || beneficiaryIds.length === 0) {
			return;
		}

		try {
			setLoadingBankStatus(true);
			setBankStatusError(null);

			const response = await fetch("/api/bank/check-bulk", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					formNumber: formNumber,
					beneficiaryIds: beneficiaryIds
				})
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setBankStatusError(data?.message || "Unable to verify bank account. Please try again.");
				// Initialize all as false if error
				const errorMap: Record<string, { hasBank: boolean }> = {};
				beneficiaryIds.forEach(id => {
					errorMap[id] = { hasBank: false };
				});
				setBankStatusMap(errorMap);
				return;
			}

			setBankStatusMap(data.bankStatusMap || {});
		} catch (err) {
			console.error("Error fetching bank status:", err);
			setBankStatusError("Unable to verify bank account. Please try again.");
			// Initialize all as false if error
			const errorMap: Record<string, { hasBank: boolean }> = {};
			beneficiaryIds.forEach(id => {
				errorMap[id] = { hasBank: false };
			});
			setBankStatusMap(errorMap);
		} finally {
			setLoadingBankStatus(false);
		}
	};

	const handleShowMembers = async (formNumber: string) => {
		setSelectedFormNumber(formNumber);
		setShowMemberModal(true);
		setLoadingMembers(true);
		setMemberError(null);
		setMembers([]);
		setMemberInterventions({});
		setBankStatusMap({});
		setBankStatusError(null);

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

			const membersData = data.members || [];
			setMembers(membersData);
			setMemberInterventions(data.interventions || {});

			// Fetch bank status for all members in parallel
			if (membersData.length > 0) {
				const beneficiaryIds = membersData
					.map((member: any) => member.BeneficiaryID)
					.filter((id: any) => id && String(id).trim() !== '');
				
				if (beneficiaryIds.length > 0) {
					// Fetch bank status asynchronously (don't block modal opening)
					fetchBankStatus(formNumber, beneficiaryIds);
				}
			}
		} catch (err) {
			console.error("Error fetching members:", err);
			setMemberError("Error fetching members");
		} finally {
			setLoadingMembers(false);
		}
	};

	const handleInterventionClick = (e: React.MouseEvent<HTMLButtonElement>, formNumber: string, interventionType: string, memberId: string) => {
		e.preventDefault();
		e.stopPropagation();
		
		// ALWAYS prevent navigation if we're on ROPS page - show in modal or in-modal content
		if (baseRoute === "/dashboard/rops") {
			// If Family Members modal is open, show content inside that modal
			if (showMemberModal) {
				setActiveModalAction(interventionType as 'economic' | 'education' | 'food' | 'habitat');
				setActiveModalMemberId(memberId);
				setModalActionData([]);
				setLoadingModalAction(true);
				setModalActionError(null);
				fetchModalActionData(formNumber, interventionType, memberId);
				return;
			}
			
			// If modal is not open, open separate intervention modal
			const sectionName = interventionType.charAt(0).toUpperCase() + interventionType.slice(1);
			setSelectedInterventionFormNumber(formNumber);
			setSelectedInterventionMemberId(memberId);
			setSelectedInterventionSection(sectionName);
			setShowInterventionModal(true);
			setLoadingInterventions(true);
			setInterventionError(null);
			setInterventions([]);
			fetchInterventions(formNumber, sectionName, memberId);
			return;
		}
		
		// For non-ROPS pages, navigate to intervention add page
		router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}/add?type=${interventionType}&memberId=${encodeURIComponent(memberId)}`);
	};

	const fetchModalActionData = async (formNumber: string, interventionType: string, memberId: string) => {
		try {
			setLoadingModalAction(true);
			setModalActionError(null);

			const sectionName = interventionType.charAt(0).toUpperCase() + interventionType.slice(1);
			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			params.append("section", sectionName);
			if (memberId) {
				params.append("memberId", memberId);
			}

			const response = await fetch(`/api/rops/interventions?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setModalActionError(data?.message || "Failed to load data");
				return;
			}

			setModalActionData(data.records || []);
		} catch (err) {
			console.error("Error fetching modal action data:", err);
			setModalActionError("Error fetching data");
		} finally {
			setLoadingModalAction(false);
		}
	};

	const fetchModalBankAccounts = async (formNumber: string, memberId: string) => {
		try {
			setLoadingModalAction(true);
			setModalActionError(null);

			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			if (memberId) {
				params.append("beneficiaryId", memberId);
			}

			const response = await fetch(`/api/actual-intervention/pe-bank-information?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setModalActionError(data?.message || "Failed to load bank account information");
				return;
			}

			setModalActionData(data.banks || []);
		} catch (err) {
			console.error("Error fetching modal bank accounts:", err);
			setModalActionError("Error fetching bank account information");
		} finally {
			setLoadingModalAction(false);
		}
	};

	const fetchInterventions = async (formNumber: string, section: string, memberId: string) => {
		try {
			setLoadingInterventions(true);
			setInterventionError(null);

			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			if (section) {
				params.append("section", section);
			}
			if (memberId) {
				params.append("memberId", memberId);
			}

			const response = await fetch(`/api/rops/interventions?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setInterventionError(data?.message || "Failed to load interventions");
				return;
			}

			setInterventions(data.records || []);
		} catch (err) {
			console.error("Error fetching interventions:", err);
			setInterventionError("Error fetching interventions");
		} finally {
			setLoadingInterventions(false);
		}
	};

	const formatDate = (dateString: string | null): string => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return dateString;
		}
	};

	const handleBankAccountClick = (e: React.MouseEvent<HTMLButtonElement>, formNumber: string, memberId: string) => {
		e.preventDefault();
		e.stopPropagation();
		
		// ALWAYS prevent navigation if we're on ROPS page - show in modal or in-modal content
		if (baseRoute === "/dashboard/rops") {
			// If Family Members modal is open, show content inside that modal
			if (showMemberModal) {
				setActiveModalAction('bankAccount');
				setActiveModalMemberId(memberId);
				setModalActionData([]);
				setLoadingModalAction(true);
				setModalActionError(null);
				fetchModalBankAccounts(formNumber, memberId);
				return;
			}
			
			// If modal is not open, open separate bank account modal
			setSelectedBankFormNumber(formNumber);
			setSelectedBankMemberId(memberId);
			setShowBankModal(true);
			setLoadingBankAccounts(true);
			setBankError(null);
			setBankAccounts([]);
			fetchBankAccounts(formNumber, memberId);
			return;
		}
		
		// For non-ROPS pages, navigate to bank account page
		router.push(`/dashboard/actual-intervention/bank-account?formNumber=${encodeURIComponent(formNumber)}&memberId=${encodeURIComponent(memberId)}`);
	};

	const handleGenerateROPClick = (e: React.MouseEvent<HTMLButtonElement>, formNumber: string, memberId: string) => {
		e.preventDefault();
		e.stopPropagation();
		
		// Navigate to full page Generate ROP
		router.push(`/dashboard/rops/generate?formNumber=${encodeURIComponent(formNumber)}&memberId=${encodeURIComponent(memberId)}`);
	};

	const handleROPFormChange = (field: string, value: string) => {
		setRopFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleROPInterventionAmountChange = (interventionId: string, payAmount: number) => {
		setRopFormData(prev => ({
			...prev,
			interventions: prev.interventions.map(int =>
				int.InterventionID === interventionId
					? { ...int, PayAmount: Math.max(0, Math.min(payAmount, int.PayableAmount)) }
					: int
			)
		}));
	};

	const handleROPSubmit = async () => {
		if (!selectedFormNumber || !activeModalMemberId) {
			setModalActionError("Form Number and Member ID are required");
			return;
		}

		if (!ropFormData.monthOfPayment) {
			setModalActionError("Month of Payment is required");
			return;
		}

		if (ropFormData.interventions.length === 0) {
			setModalActionError("No interventions available to generate ROP");
			return;
		}

		// Validate all intervention amounts
		for (const intervention of ropFormData.interventions) {
			if (intervention.PayAmount < 0 || intervention.PayAmount > intervention.PayableAmount) {
				setModalActionError(`PayAmount for ${intervention.InterventionID} must be between 0 and ${intervention.PayableAmount}`);
				return;
			}
		}

		try {
			setSubmittingROP(true);
			setModalActionError(null);
			setRopSuccess(false);

			// Prepare items for API
			const items = ropFormData.interventions.map(intervention => {
				const originalIntervention = modalActionData.find((int: any) => int.InterventionID === intervention.InterventionID);
				return {
					FormNumber: selectedFormNumber,
					BeneficiaryID: activeModalMemberId,
					InterventionID: intervention.InterventionID,
					InterventionSection: intervention.Section,
					PayableAmount: intervention.PayableAmount,
					MonthOfPayment: ropFormData.monthOfPayment,
					PaymentType: ropFormData.paymentType || null,
					PayAmount: intervention.PayAmount,
					Remarks: ropFormData.remarks || null
				};
			});

			const response = await fetch("/api/rops/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ items })
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				setModalActionError(data?.message || "Failed to generate ROP");
				return;
			}

			setRopSuccess(true);
			// Refresh the families list
			fetchFamilies();
			
			// Reset form after 2 seconds
			setTimeout(() => {
				setRopFormData({
					monthOfPayment: "",
					paymentType: "",
					remarks: "",
					interventions: []
				});
				setRopSuccess(false);
			}, 2000);

		} catch (err) {
			console.error("Error submitting ROP:", err);
			setModalActionError("Error generating ROP. Please try again.");
		} finally {
			setSubmittingROP(false);
		}
	};

	const fetchBankAccounts = async (formNumber: string, memberId: string) => {
		try {
			setLoadingBankAccounts(true);
			setBankError(null);

			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			if (memberId) {
				params.append("beneficiaryId", memberId);
			}

			const response = await fetch(`/api/actual-intervention/pe-bank-information?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setBankError(data?.message || "Failed to load bank account information");
				return;
			}

			setBankAccounts(data.banks || []);
		} catch (err) {
			console.error("Error fetching bank accounts:", err);
			setBankError("Error fetching bank account information");
		} finally {
			setLoadingBankAccounts(false);
		}
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
								setActiveModalAction(null);
								setActiveModalMemberId(null);
								setModalActionData([]);
								setModalActionError(null);
								setRopFormData({
									monthOfPayment: "",
									paymentType: "",
									remarks: "",
									interventions: []
								});
								setRopSuccess(false);
								setBankStatusMap({});
								setBankStatusError(null);
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
										setActiveModalAction(null);
										setActiveModalMemberId(null);
										setModalActionData([]);
										setModalActionError(null);
										setRopFormData({
											monthOfPayment: "",
											paymentType: "",
											remarks: "",
											interventions: []
										});
										setRopSuccess(false);
										setBankStatusMap({});
										setBankStatusError(null);
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
										{/* Members Table */}
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
																		<div className="flex flex-wrap gap-2">
																			{interventions.economic || interventions.education || interventions.food || interventions.habitat ? (
																				<>
																					{interventions.economic && (
																						<>
																							<button
																								type="button"
																								onClick={(e) => selectedFormNumber && handleInterventionClick(e, selectedFormNumber, "economic", memberKey)}
																								className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer"
																							>
																								Economic
																							</button>
																							<button
																								type="button"
																								onClick={(e) => selectedFormNumber && handleBankAccountClick(e, selectedFormNumber, memberKey)}
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
																							onClick={(e) => selectedFormNumber && handleInterventionClick(e, selectedFormNumber, "education", memberKey)}
																							className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 transition-all cursor-pointer"
																						>
																							Education
																						</button>
																					)}
																					{interventions.food && (
																						<button
																							type="button"
																							onClick={(e) => selectedFormNumber && handleInterventionClick(e, selectedFormNumber, "food", memberKey)}
																							className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md hover:from-amber-700 hover:to-amber-800 transition-all cursor-pointer"
																						>
																							Food
																						</button>
																					)}
																					{interventions.habitat && (
																						<button
																							type="button"
																							onClick={(e) => selectedFormNumber && handleInterventionClick(e, selectedFormNumber, "habitat", memberKey)}
																							className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer"
																						>
																							Habitat
																						</button>
																					)}
																				</>
																			) : (
																				<span className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 italic">
																					No intervention defined in FDP
																				</span>
																			)}
															{/* Generate ROP Button - Always visible */}
															<div className="flex flex-col gap-1">
																<button
																	type="button"
																	onClick={(e) => selectedFormNumber && handleGenerateROPClick(e, selectedFormNumber, memberKey)}
																	disabled={loadingBankStatus || !bankStatusMap[memberKey]?.hasBank}
																	className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-md transition-all ${
																		loadingBankStatus || !bankStatusMap[memberKey]?.hasBank
																			? "bg-gray-400 text-gray-200 cursor-not-allowed opacity-60"
																			: "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 cursor-pointer"
																	}`}
																>
																	{loadingBankStatus ? (
																		<>
																			<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
																			Checking...
																		</>
																	) : (
																		<>
																			<FileBarChart className="h-3.5 w-3.5" />
																			Generate ROP
																		</>
																	)}
																</button>
																{!loadingBankStatus && bankStatusMap[memberKey]?.hasBank === false && (
																	<span className="text-xs text-red-600 font-medium">
																		Bank account is not defined.
																	</span>
																)}
																{bankStatusError && !bankStatusMap[memberKey] && (
																	<span className="text-xs text-red-600 font-medium">
																		Unable to verify bank account. Please try again.
																	</span>
																)}
															</div>
																		</div>
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>

										{/* Dynamic Content Area - Shows selected action content */}
										{activeModalAction && (
											<div className="bg-white rounded-lg border-2 border-[#0b4d2b] shadow-lg overflow-hidden mt-4">
												<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b] px-6 py-3 border-b-2 border-[#0a3d22]">
													<div className="flex items-center justify-between">
														<h3 className="text-lg font-bold text-white flex items-center gap-2">
															{activeModalAction === 'bankAccount' ? (
																<><CreditCard className="h-5 w-5" /> Bank Account Information</>
															) : activeModalAction === 'generateROP' ? (
																<><FileBarChart className="h-5 w-5" /> Generate ROP</>
															) : (
																<><Activity className="h-5 w-5" /> {activeModalAction.charAt(0).toUpperCase() + activeModalAction.slice(1)} ROP</>
															)}
														</h3>
														<button
															type="button"
															onClick={() => {
																setActiveModalAction(null);
																setActiveModalMemberId(null);
																setModalActionData([]);
																setModalActionError(null);
																setRopFormData({
																	monthOfPayment: "",
																	paymentType: "",
																	remarks: "",
																	interventions: []
																});
																setRopSuccess(false);
															}}
															className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-gray-200"
														>
															<XCircle className="h-5 w-5" />
														</button>
													</div>
													{activeModalMemberId && (
														<p className="text-sm text-white/80 mt-1">Member: {activeModalMemberId}</p>
													)}
												</div>
												<div className="p-4">
													{loadingModalAction ? (
														<div className="flex items-center justify-center py-12">
															<div className="text-center">
																<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
																<span className="ml-3 text-gray-600 mt-3 block">Loading...</span>
															</div>
														</div>
													) : modalActionError ? (
														<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
															{modalActionError}
														</div>
													) : modalActionData.length === 0 ? (
														<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
															{activeModalAction === 'bankAccount' ? (
																<><CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
																<p className="text-gray-600">No bank account information found.</p></>
															) : activeModalAction === 'generateROP' ? (
																<><FileBarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
																<p className="text-gray-600">Generate ROP functionality will be implemented soon.</p></>
															) : (
																<><Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
																<p className="text-gray-600">No {activeModalAction} interventions found.</p></>
															)}
														</div>
													) : activeModalAction === 'bankAccount' ? (
														<div className="overflow-x-auto">
															<table className="min-w-full divide-y divide-gray-200">
																<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
																	<tr>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Bank No</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Form Number</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Beneficiary ID</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Bank Name</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Account Title</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Account Number</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">CNIC</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Bank Code</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Approval Status</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cheque Image</th>
																	</tr>
																</thead>
																<tbody className="bg-white divide-y divide-gray-200">
																	{modalActionData.map((bank, index) => (
																		<tr key={bank.BankNo || index} className={index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.BankNo || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.FormNumber || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.BeneficiaryID || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.BankName || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.AccountTitle || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{bank.AccountNo || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{bank.CNIC || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{bank.BankCode || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm">
																				{bank.ApprovalStatus ? (
																					<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
																						bank.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
																						bank.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
																						"bg-yellow-100 text-yellow-800"
																					}`}>
																						{bank.ApprovalStatus}
																					</span>
																				) : "N/A"}
																			</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm">
																				{bank.BankChequeImagePath ? (
																					<a href={bank.BankChequeImagePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
																						<ImageIcon className="h-4 w-4" />
																						View Image
																					</a>
																				) : "N/A"}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													) : activeModalAction === 'generateROP' ? (
														<div className="space-y-6">
															{ropSuccess ? (
																<div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
																	<div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
																		<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
																		</svg>
																	</div>
																	<h4 className="text-lg font-semibold text-green-900 mb-2">ROP Generated Successfully!</h4>
																	<p className="text-green-700">
																		{ropFormData.interventions.length} ROP record(s) have been created and submitted for approval.
																	</p>
																</div>
															) : (
																<>
																	{/* Form Header */}
																	<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
																		<h4 className="text-lg font-semibold text-gray-900 mb-2">Generate ROP</h4>
																		<p className="text-sm text-gray-600">
																			Form Number: <span className="font-semibold">{selectedFormNumber}</span>
																			{activeModalMemberId && (
																				<> | Member: <span className="font-semibold">{activeModalMemberId}</span></>
																			)}
																		</p>
																	</div>

																	{/* Form Fields */}
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																		{/* Month of Payment */}
																		<div>
																			<label className="block text-sm font-medium text-gray-700 mb-2">
																				Month of Payment <span className="text-red-500">*</span>
																			</label>
																			<input
																				type="month"
																				value={ropFormData.monthOfPayment}
																				onChange={(e) => handleROPFormChange("monthOfPayment", e.target.value)}
																				className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
																				required
																			/>
																		</div>

																		{/* Payment Type */}
																		<div>
																			<label className="block text-sm font-medium text-gray-700 mb-2">
																				Payment Type
																			</label>
																			<select
																				value={ropFormData.paymentType}
																				onChange={(e) => handleROPFormChange("paymentType", e.target.value)}
																				className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
																			>
																				<option value="">Select Payment Type</option>
																				<option value="Cash">Cash</option>
																				<option value="Bank Transfer">Bank Transfer</option>
																				<option value="Cheque">Cheque</option>
																				<option value="Other">Other</option>
																			</select>
																		</div>
																	</div>

																	{/* Remarks */}
																	<div>
																		<label className="block text-sm font-medium text-gray-700 mb-2">
																			Remarks (Optional)
																		</label>
																		<textarea
																			value={ropFormData.remarks}
																			onChange={(e) => handleROPFormChange("remarks", e.target.value)}
																			rows={3}
																			className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
																			placeholder="Enter any remarks or notes..."
																		/>
																	</div>

																	{/* Interventions Table */}
																	{ropFormData.interventions.length > 0 ? (
																		<div className="overflow-x-auto">
																			<table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
																				<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
																					<tr>
																						<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																							Intervention ID
																						</th>
																						<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																							Section
																						</th>
																						<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																							Payable Amount
																						</th>
																						<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
																							Pay Amount <span className="text-red-300">*</span>
																						</th>
																					</tr>
																				</thead>
																				<tbody className="bg-white divide-y divide-gray-200">
																					{ropFormData.interventions.map((intervention, index) => (
																						<tr key={intervention.InterventionID} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
																							<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
																								{intervention.InterventionID}
																							</td>
																							<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
																									{intervention.Section}
																								</span>
																							</td>
																							<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
																								PKR {intervention.PayableAmount.toLocaleString()}
																							</td>
																							<td className="px-4 py-3 whitespace-nowrap">
																								<input
																									type="number"
																									min="0"
																									max={intervention.PayableAmount}
																									step="0.01"
																									value={intervention.PayAmount}
																									onChange={(e) => handleROPInterventionAmountChange(intervention.InterventionID, parseFloat(e.target.value) || 0)}
																									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none text-sm"
																									required
																								/>
																							</td>
																						</tr>
																					))}
																				</tbody>
																			</table>
																		</div>
																	) : (
																		<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
																			<p className="text-gray-600">No interventions available for this member.</p>
																		</div>
																	)}

																	{/* Submit Button */}
																	<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
																		<button
																			type="button"
																			onClick={() => {
																				setActiveModalAction(null);
																				setActiveModalMemberId(null);
																				setRopFormData({
																					monthOfPayment: "",
																					paymentType: "",
																					remarks: "",
																					interventions: []
																				});
																				setRopSuccess(false);
																			}}
																			className="px-6 py-2.5 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-all shadow-md hover:shadow-lg"
																		>
																			Cancel
																		</button>
																		<button
																			type="button"
																			onClick={handleROPSubmit}
																			disabled={submittingROP || !ropFormData.monthOfPayment || ropFormData.interventions.length === 0}
																			className="px-6 py-2.5 bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] text-white rounded-lg text-sm font-semibold hover:from-[#0a3d22] hover:to-[#0b4d2b] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
																		>
																			{submittingROP ? (
																				<>
																					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
																					Generating...
																				</>
																			) : (
																				<>
																					<FileBarChart className="h-4 w-4" />
																					Generate ROP
																				</>
																			)}
																		</button>
																	</div>
																</>
															)}
														</div>
													) : (
														<div className="overflow-x-auto">
															<table className="min-w-full divide-y divide-gray-200">
																<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
																	<tr>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">ID</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Form Number</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Section</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Status</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Category</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Type</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Total Amount</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">Start Date</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">End Date</th>
																		<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Approval Status</th>
																	</tr>
																</thead>
																<tbody className="bg-white divide-y divide-gray-200">
																	{modalActionData.map((intervention, index) => (
																		<tr key={intervention.InterventionID || index} className={index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
																			<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{intervention.InterventionID || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{intervention.FormNumber || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
																					{intervention.Section || "N/A"}
																				</span>
																			</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																				<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																					intervention.InterventionStatus === "Open" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
																				}`}>
																					{intervention.InterventionStatus || "N/A"}
																				</span>
																			</td>
																			<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																				<div className="truncate" title={intervention.InterventionCategory || "N/A"}>
																					{intervention.InterventionCategory || "N/A"}
																				</div>
																			</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{intervention.InterventionType || "N/A"}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
																				{intervention.TotalAmount != null ? `PKR ${intervention.TotalAmount.toLocaleString()}` : "N/A"}
																			</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(intervention.InterventionStartDate)}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(intervention.InterventionEndDate)}</td>
																			<td className="px-4 py-3 whitespace-nowrap text-sm">
																				<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																					intervention.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
																					intervention.ApprovalStatus === "Pending" ? "bg-yellow-100 text-yellow-800" :
																					"bg-gray-100 text-gray-800"
																				}`}>
																					{intervention.ApprovalStatus || "N/A"}
																				</span>
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								)}
							</div>

							<div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end gap-3">
								{activeModalAction && (
									<button
										type="button"
										onClick={() => {
											setActiveModalAction(null);
											setActiveModalMemberId(null);
											setModalActionData([]);
											setModalActionError(null);
											setRopFormData({
												monthOfPayment: "",
												paymentType: "",
												remarks: "",
												interventions: []
											});
											setRopSuccess(false);
										}}
										className="px-6 py-2.5 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-all shadow-md hover:shadow-lg"
									>
										Back to Members
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
										setActiveModalAction(null);
										setActiveModalMemberId(null);
										setModalActionData([]);
										setModalActionError(null);
										setRopFormData({
											monthOfPayment: "",
											paymentType: "",
											remarks: "",
											interventions: []
										});
										setRopSuccess(false);
										setBankStatusMap({});
										setBankStatusError(null);
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

			{/* Bank Account Modal */}
			{showBankModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowBankModal(false);
								setSelectedBankFormNumber(null);
								setSelectedBankMemberId(null);
								setBankAccounts([]);
							}}
						></div>
						<div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b]">
								<div>
									<h2 className="text-2xl font-bold text-white flex items-center gap-2">
										<CreditCard className="h-6 w-6" />
										Bank Account Information
									</h2>
									<p className="text-sm text-white/80 mt-1">
										Form Number: {selectedBankFormNumber}
										{selectedBankMemberId && ` - Member: ${selectedBankMemberId}`}
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowBankModal(false);
										setSelectedBankFormNumber(null);
										setSelectedBankMemberId(null);
										setBankAccounts([]);
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-gray-200"
								>
									<XCircle className="h-6 w-6" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingBankAccounts ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading bank account information...</span>
										</div>
									</div>
								) : bankError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{bankError}
									</div>
								) : bankAccounts.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600">No bank account information found for this family{selectedBankMemberId ? " and member" : ""}.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Bank No
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Form Number
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Beneficiary ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Bank Name
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Account Title
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Account Number
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																CNIC
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Bank Code
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Submitted At
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Submitted By
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Approval Status
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Remarks
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
																Cheque Image
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{bankAccounts.map((bank, index) => (
															<tr 
																key={bank.BankNo || index} 
																className={`transition-colors ${
																	index % 2 === 0 
																		? "bg-white hover:bg-blue-50" 
																		: "bg-gray-50 hover:bg-blue-50"
																}`}
															>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.BankNo || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.FormNumber || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.BeneficiaryID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.BankName || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.AccountTitle || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
																	{bank.AccountNo || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
																	{bank.CNIC || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.BankCode || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.SubmittedAt ? new Date(bank.SubmittedAt).toLocaleString() : "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{bank.SubmittedBy || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm">
																	{bank.ApprovalStatus ? (
																		<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
																			bank.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
																			bank.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
																			"bg-yellow-100 text-yellow-800"
																		}`}>
																			{bank.ApprovalStatus}
																		</span>
																	) : (
																		"N/A"
																	)}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																	{bank.Remarks ? (
																		<span className="truncate block" title={bank.Remarks}>
																			{bank.Remarks}
																		</span>
																	) : (
																		"N/A"
																	)}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm">
																	{bank.BankChequeImagePath ? (
																		<a
																			href={bank.BankChequeImagePath}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
																		>
																			<ImageIcon className="h-4 w-4" />
																			View Image
																		</a>
																	) : (
																		"N/A"
																	)}
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

							<div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowBankModal(false);
										setSelectedBankFormNumber(null);
										setSelectedBankMemberId(null);
										setBankAccounts([]);
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

			{/* Intervention Section Modal */}
			{showInterventionModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowInterventionModal(false);
								setSelectedInterventionFormNumber(null);
								setSelectedInterventionMemberId(null);
								setSelectedInterventionSection(null);
								setInterventions([]);
							}}
						></div>
						<div className="relative w-full max-w-7xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b]">
								<div>
									<h2 className="text-2xl font-bold text-white flex items-center gap-2">
										<Activity className="h-6 w-6" />
										{selectedInterventionSection} ROP
									</h2>
									<p className="text-sm text-white/80 mt-1">
										Form Number: {selectedInterventionFormNumber}
										{selectedInterventionMemberId && ` - Member: ${selectedInterventionMemberId}`}
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowInterventionModal(false);
										setSelectedInterventionFormNumber(null);
										setSelectedInterventionMemberId(null);
										setSelectedInterventionSection(null);
										setInterventions([]);
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-gray-200"
								>
									<XCircle className="h-6 w-6" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingInterventions ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading interventions...</span>
										</div>
									</div>
								) : interventionError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{interventionError}
									</div>
								) : interventions.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600">No {selectedInterventionSection?.toLowerCase()} interventions found for this family{selectedInterventionMemberId ? " and member" : ""}.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Form Number
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Section
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Status
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Category
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Main Intervention
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Type
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Financial Category
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Total Amount
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Start Date
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																End Date
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Member ID
															</th>
															<th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
																Approval Status
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{interventions.map((intervention, index) => (
															<tr 
																key={intervention.InterventionID || index} 
																className={`transition-colors ${
																	index % 2 === 0 
																		? "bg-white hover:bg-blue-50" 
																		: "bg-gray-50 hover:bg-blue-50"
																}`}
															>
																<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
																	{intervention.InterventionID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{intervention.FormNumber || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
																		{intervention.Section || "N/A"}
																	</span>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																		intervention.InterventionStatus === "Open" 
																			? "bg-green-100 text-green-800" 
																			: "bg-gray-100 text-gray-800"
																	}`}>
																		{intervention.InterventionStatus || "N/A"}
																	</span>
																</td>
																<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																	<div className="truncate" title={intervention.InterventionCategory || "N/A"}>
																		{intervention.InterventionCategory || "N/A"}
																	</div>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
																		{intervention.MainIntervention || "N/A"}
																	</span>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{intervention.InterventionType || "N/A"}
																</td>
																<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
																	<div className="truncate" title={intervention.FinancialCategory || "N/A"}>
																		{intervention.FinancialCategory || "N/A"}
																	</div>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
																	{intervention.TotalAmount != null
																		? `PKR ${intervention.TotalAmount.toLocaleString()}`
																		: "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{formatDate(intervention.InterventionStartDate)}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{formatDate(intervention.InterventionEndDate)}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{intervention.MemberID || "N/A"}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm">
																	<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																		intervention.ApprovalStatus === "Approved" 
																			? "bg-green-100 text-green-800" 
																			: intervention.ApprovalStatus === "Pending"
																			? "bg-yellow-100 text-yellow-800"
																			: "bg-gray-100 text-gray-800"
																	}`}>
																		{intervention.ApprovalStatus || "N/A"}
																	</span>
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

							<div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowInterventionModal(false);
										setSelectedInterventionFormNumber(null);
										setSelectedInterventionMemberId(null);
										setSelectedInterventionSection(null);
										setInterventions([]);
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
