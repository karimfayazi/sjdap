"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, List, Eye, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type SWBFamilyData = {
	CNIC?: string;
	Received_Application?: string;
	BTS_Number?: string;
	FAMILY_ID?: string;
	Regional_Council?: string;
	Local_Council?: string;
	Jamat_Khana?: string;
	Programme?: string;
	Beneficiary_Name?: string;
	Gender?: string;
	VIST_FEAP?: string;
	Already_FEAP_Programme?: string;
	Potential_family_declaration_by_FEAP?: string;
	If_no_reason?: string;
	FDP_Status?: string;
	SWB_to_stop_support_from_date?: string;
	Remarks?: string;
	Mentor_Name?: string;
	Social_Support_Amount?: number;
	Economic_Support_Amount?: number;
	update_date?: string;
};

export default function SWBFamiliesPage() {
	const router = useRouter();
	const { userProfile, loading: authLoading } = useAuth();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("SWB_Families");
	const [swbFamilies, setSwbFamilies] = useState<SWBFamilyData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Check if user is admin
	const isAdmin = userProfile?.access_level?.toLowerCase() === "admin";

	const [filters, setFilters] = useState({
		cnic: "",
		familyId: "",
		btsNumber: "",
		regionalCouncil: "",
		localCouncil: "",
		programme: "",
		beneficiaryName: "",
		mentorName: "",
		fdpStatus: "",
	});

	const [regionalCouncils, setRegionalCouncils] = useState<string[]>([]);
	const [localCouncils, setLocalCouncils] = useState<string[]>([]);
	const [programmes, setProgrammes] = useState<string[]>([]);
	const [mentors, setMentors] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);

	const fetchSWBFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.cnic) params.append("cnic", filters.cnic);
			if (filters.familyId) params.append("familyId", filters.familyId);
			if (filters.btsNumber) params.append("btsNumber", filters.btsNumber);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);
			if (filters.localCouncil) params.append("localCouncil", filters.localCouncil);
			if (filters.programme) params.append("programme", filters.programme);
			if (filters.beneficiaryName) params.append("beneficiaryName", filters.beneficiaryName);
			if (filters.mentorName) params.append("mentorName", filters.mentorName);
			if (filters.fdpStatus) params.append("fdpStatus", filters.fdpStatus);

			const response = await fetch(`/api/swb-families?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setSwbFamilies(data.swbFamilies || []);
			} else {
				setError(data.message || "Error fetching SWB families");
			}
		} catch (err) {
			console.error("Error fetching SWB families:", err);
			setError("Error fetching SWB families");
		} finally {
			setLoading(false);
		}
	};

	const fetchDropdownOptions = async () => {
		try {
			setLoadingOptions(true);
			const response = await fetch("/api/swb-families?getOptions=true");
			const data = await response.json();

			if (data.success) {
				setRegionalCouncils(data.regionalCouncils || []);
				setLocalCouncils(data.localCouncils || []);
				setProgrammes(data.programmes || []);
				setMentors(data.mentors || []);
			}
		} catch (err) {
			console.error("Error fetching dropdown options:", err);
		} finally {
			setLoadingOptions(false);
		}
	};

	useEffect(() => {
		fetchSWBFamilies();
		fetchDropdownOptions();
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
		fetchSWBFamilies();
	};

	const handleClearFilters = () => {
		setFilters({
			cnic: "",
			familyId: "",
			btsNumber: "",
			regionalCouncil: "",
			localCouncil: "",
			programme: "",
			beneficiaryName: "",
			mentorName: "",
			fdpStatus: "",
		});
		setTimeout(() => {
			fetchSWBFamilies();
		}, 100);
	};

	const handleAdd = () => {
		router.push("/dashboard/swb-families/add");
	};

	const handleView = (family: SWBFamilyData) => {
		if (!family.CNIC || !family.FAMILY_ID) return;
		const params = new URLSearchParams({
			cnic: family.CNIC,
			familyId: family.FAMILY_ID,
		});
		router.push(`/dashboard/swb-families/view?${params.toString()}`);
	};

	const handleEdit = (family: SWBFamilyData) => {
		if (!family.CNIC || !family.FAMILY_ID) return;
		const params = new URLSearchParams({
			cnic: family.CNIC,
			familyId: family.FAMILY_ID,
		});
		router.push(`/dashboard/swb-families/edit?${params.toString()}`);
	};

	const handleDelete = async (family: SWBFamilyData) => {
		if (!family.CNIC || !family.FAMILY_ID) return;
		
		if (!confirm(`Are you sure you want to delete SWB family record for CNIC: ${family.CNIC} and Family ID: ${family.FAMILY_ID}?`)) {
			return;
		}

		try {
			setDeletingId(`${family.CNIC}-${family.FAMILY_ID}`);
			const response = await fetch(
				`/api/swb-families?cnic=${encodeURIComponent(family.CNIC)}&familyId=${encodeURIComponent(family.FAMILY_ID)}`,
				{
					method: "DELETE",
				}
			);

			const data = await response.json();

			if (data.success) {
				fetchSWBFamilies();
			} else {
				setError(data.message || "Failed to delete SWB family record");
			}
		} catch (err) {
			console.error("Error deleting SWB family record:", err);
			setError("Error deleting SWB family record");
		} finally {
			setDeletingId(null);
		}
	};

	const exportToCSV = () => {
		const headers = [
			"CNIC", "Received Application", "BTS Number", "Family ID",
			"Regional Council", "Local Council", "Jamat Khana", "Programme",
			"Beneficiary Name", "Gender", "VIST FEAP", "Already FEAP Programme",
			"Potential Family Declaration by FEAP", "If No Reason", "FDP Status",
			"SWB to Stop Support From Date", "Remarks", "Mentor Name",
			"Social Support Amount", "Economic Support Amount", "Update Date"
		];

		const csvContent = [
			headers.join(","),
			...swbFamilies.map(family => [
				family.CNIC || "",
				family.Received_Application || "",
				family.BTS_Number || "",
				family.FAMILY_ID || "",
				family.Regional_Council || "",
				family.Local_Council || "",
				family.Jamat_Khana || "",
				family.Programme || "",
				family.Beneficiary_Name || "",
				family.Gender || "",
				family.VIST_FEAP || "",
				family.Already_FEAP_Programme || "",
				family.Potential_family_declaration_by_FEAP || "",
				family.If_no_reason || "",
				family.FDP_Status || "",
				family.SWB_to_stop_support_from_date || "",
				family.Remarks || "",
				family.Mentor_Name || "",
				family.Social_Support_Amount || "",
				family.Economic_Support_Amount || "",
				family.update_date || ""
			].map(val => {
				// Escape commas and quotes in CSV
				if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
					return `"${val.replace(/"/g, '""')}"`;
				}
				return val;
			}).join(","))
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `swb_families_${new Date().toISOString().split('T')[0]}.csv`);
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
		return new Intl.NumberFormat('en-PK', {
			style: 'currency',
			currency: 'PKR'
		}).format(amount);
	};

	// Calculate statistics for cards
	const potentialFamilyYes = swbFamilies.filter(f => f.Potential_family_declaration_by_FEAP === "Yes").length;
	const potentialFamilyNo = swbFamilies.filter(f => f.Potential_family_declaration_by_FEAP === "No").length;

	// Group by Programme
	const programmeCounts: { [key: string]: number } = {};
	swbFamilies.forEach(family => {
		const programme = family.Programme;
		if (programme && programme.trim() !== "") {
			programmeCounts[programme] = (programmeCounts[programme] || 0) + 1;
		}
	});

	const programmesList = Object.keys(programmeCounts).sort();

	// Group by FDP Status (excluding N/A)
	const fdpStatusCounts: { [key: string]: number } = {};
	swbFamilies.forEach(family => {
		const status = family.FDP_Status;
		if (status && status !== "N/A" && status.trim() !== "") {
			fdpStatusCounts[status] = (fdpStatusCounts[status] || 0) + 1;
		}
	});

	const fdpStatuses = Object.keys(fdpStatusCounts).sort();

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
						<p className="text-gray-600 mt-2">Loading SWB families records...</p>
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
						<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
						<p className="text-gray-600 mt-2">Manage SWB families information</p>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error}</p>
					<button
						onClick={fetchSWBFamilies}
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
		return <SectionAccessDenied 
			sectionName={sectionName} 
			requiredPermission="SWB Families"
			permissionValue={userProfile?.SWB_Families}
		/>;
	}

	// Show loading while checking access
	if (accessLoading || authLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Helper function to format permission value for display
	const formatPermissionValue = (value: any): string => {
		if (value === null || value === undefined) return "Not Set";
		if (typeof value === 'boolean') return value ? "true" : "false";
		if (typeof value === 'number') return value.toString();
		if (typeof value === 'string') return value;
		return String(value);
	};

	// Get SWB_Families permission value
	const swbFamiliesPermission = userProfile?.SWB_Families;
	const hasSWBAccess = hasAccess === true;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">SWB-Families</h1>
					<p className="text-gray-600 mt-2">Manage SWB families information</p>
					{/* SWB_Families Permission Display */}
					<div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 border border-gray-300">
						<span className="text-sm font-medium text-gray-700">SWB_Families Permission:</span>
						<span className={`text-sm font-semibold px-2 py-0.5 rounded ${
							hasSWBAccess 
								? 'bg-green-100 text-green-800 border border-green-300' 
								: 'bg-red-100 text-red-800 border border-red-300'
						}`}>
							{formatPermissionValue(swbFamiliesPermission)}
						</span>
						<span className={`text-xs font-medium px-2 py-0.5 rounded ${
							hasSWBAccess 
								? 'bg-green-50 text-green-700' 
								: 'bg-red-50 text-red-700'
						}`}>
							{hasSWBAccess ? '✓ Access Granted' : '✗ Access Denied'}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={exportToCSV}
						disabled={swbFamilies.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
					{isAdmin && (
						<button
							onClick={handleAdd}
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							<Plus className="h-4 w-4" />
							Add Records
						</button>
					)}
				</div>
			</div>

			{/* SWB_Families Permission Info Card */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-sm font-semibold text-blue-900 mb-2">SWB_Families Access Control Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
							<div>
								<span className="font-medium text-gray-700">Database Value:</span>
								<span className="ml-2 font-mono text-gray-900">
									{swbFamiliesPermission !== null && swbFamiliesPermission !== undefined 
										? formatPermissionValue(swbFamiliesPermission) 
										: 'null/undefined'}
								</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">Value Type:</span>
								<span className="ml-2 font-mono text-gray-900">
									{swbFamiliesPermission !== null && swbFamiliesPermission !== undefined 
										? typeof swbFamiliesPermission 
										: 'N/A'}
								</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">Access Status:</span>
								<span className={`ml-2 font-semibold ${
									hasSWBAccess ? 'text-green-700' : 'text-red-700'
								}`}>
									{hasSWBAccess ? '✓ GRANTED' : '✗ DENIED'}
								</span>
							</div>
						</div>
						<div className="mt-3 text-xs text-gray-600">
							<strong>Note:</strong> Access is granted when SWB_Families = 1 or true in the database. 
							Super users have automatic access regardless of this value.
						</div>
					</div>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="space-y-6">
				{/* # of Cases Card */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="grid grid-cols-1 md:grid-cols-1 gap-6">
						<div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
							<div className="bg-gradient-to-r from-[#0b4d2b] to-[#0a3d22] p-4">
								<h4 className="text-lg font-bold text-white">
									# of Cases
								</h4>
							</div>
							<div className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-16 h-16 bg-[#0b4d2b] bg-opacity-10 rounded-full flex items-center justify-center">
											<svg className="w-8 h-8 text-[#0b4d2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-600">Total Cases</p>
											<p className="text-4xl font-bold text-gray-900">{swbFamilies.length.toLocaleString()}</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Potential Family Declaration by FEAP/SEDP Staff Cards */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h3 className="text-xl font-bold text-gray-900 mb-6">Potential Family Declaration by FEAP/SEDP Staff</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
							<div className="bg-gradient-to-r from-green-600 to-green-700 p-4">
								<h4 className="text-lg font-bold text-white">
									Yes
								</h4>
							</div>
							<div className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
											<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-600">Cases</p>
											<p className="text-4xl font-bold text-gray-900">{potentialFamilyYes.toLocaleString()}</p>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
							<div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
								<h4 className="text-lg font-bold text-white">
									No
								</h4>
							</div>
							<div className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
											<svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-600">Cases</p>
											<p className="text-4xl font-bold text-gray-900">{potentialFamilyNo.toLocaleString()}</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Programme Wise Cards */}
				{programmesList.length > 0 && (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<h3 className="text-xl font-bold text-gray-900 mb-6">Programme Wise</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{programmesList.map((programme) => {
								const count = programmeCounts[programme];
								const getProgrammeColor = (programme: string) => {
									switch (programme.toUpperCase()) {
										case "FEAP":
											return { bg: "from-blue-600 to-blue-700", icon: "bg-blue-100", iconColor: "text-blue-600" };
										case "SEDP":
											return { bg: "from-purple-600 to-purple-700", icon: "bg-purple-100", iconColor: "text-purple-600" };
										default:
											return { bg: "from-indigo-600 to-indigo-700", icon: "bg-indigo-100", iconColor: "text-indigo-600" };
									}
								};
								const colors = getProgrammeColor(programme);

								return (
									<div
										key={programme}
										className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
									>
										<div className={`bg-gradient-to-r ${colors.bg} p-4`}>
											<h4 className="text-lg font-bold text-white line-clamp-2">
												{programme}
											</h4>
										</div>
										<div className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center`}>
														<svg className={`w-8 h-8 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
														</svg>
													</div>
													<div>
														<p className="text-sm font-medium text-gray-600">Cases</p>
														<p className="text-4xl font-bold text-gray-900">{count.toLocaleString()}</p>
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

				{/* FDP Status Cards */}
				{fdpStatuses.length > 0 && (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<h3 className="text-xl font-bold text-gray-900 mb-6">FDP Status</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{fdpStatuses.map((status) => {
								const count = fdpStatusCounts[status];
								const getStatusColor = (status: string) => {
									switch (status) {
										case "Approved":
											return { bg: "from-green-600 to-green-700", icon: "bg-green-100", iconColor: "text-green-600" };
										case "CRC-Approval Waiting":
											return { bg: "from-yellow-600 to-yellow-700", icon: "bg-yellow-100", iconColor: "text-yellow-600" };
										case "Family Mentoring":
											return { bg: "from-blue-600 to-blue-700", icon: "bg-blue-100", iconColor: "text-blue-600" };
										case "Not Interested":
											return { bg: "from-red-600 to-red-700", icon: "bg-red-100", iconColor: "text-red-600" };
										default:
											return { bg: "from-gray-600 to-gray-700", icon: "bg-gray-100", iconColor: "text-gray-600" };
									}
								};
								const colors = getStatusColor(status);

								return (
									<div
										key={status}
										className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
									>
										<div className={`bg-gradient-to-r ${colors.bg} p-4`}>
											<h4 className="text-lg font-bold text-white line-clamp-2">
												{status}
											</h4>
										</div>
										<div className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center`}>
														<svg className={`w-8 h-8 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
														</svg>
													</div>
													<div>
														<p className="text-sm font-medium text-gray-600">Cases</p>
														<p className="text-4xl font-bold text-gray-900">{count.toLocaleString()}</p>
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
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<form onSubmit={handleFilterSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
							<label className="block text-sm font-medium text-gray-700 mb-1">BTS Number</label>
							<input
								type="text"
								name="btsNumber"
								value={filters.btsNumber}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="BTS Number"
							/>
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
							<label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
							<select
								name="programme"
								value={filters.programme}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								disabled={loadingOptions}
							>
								<option value="">All Programmes</option>
								{programmes.map((prog) => (
									<option key={prog} value={prog}>{prog}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
							<input
								type="text"
								name="beneficiaryName"
								value={filters.beneficiaryName}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Beneficiary Name"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mentor Name</label>
							<select
								name="mentorName"
								value={filters.mentorName}
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
							<label className="block text-sm font-medium text-gray-700 mb-1">FDP Status</label>
							<select
								name="fdpStatus"
								value={filters.fdpStatus}
								onChange={handleFilterChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">All Statuses</option>
								<option value="Approved">Approved</option>
								<option value="CRC-Approval Waiting">CRC-Approval Waiting</option>
								<option value="Family Mentoring">Family Mentoring</option>
								<option value="Not Interested">Not Interested</option>
							</select>
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

			{/* Results Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-200">
					<h3 className="text-lg font-medium text-gray-900">
						SWB Families Records ({swbFamilies.length})
					</h3>
				</div>

				{swbFamilies.length === 0 ? (
					<div className="p-8 text-center">
						<p className="text-gray-500">No SWB families records found.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BTS Number</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programme</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FDP Status</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Support</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Economic Support</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Date</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{swbFamilies.map((family, index) => (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.CNIC || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.FAMILY_ID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.BTS_Number || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Regional_Council || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Local_Council || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Programme || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Beneficiary_Name || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Gender || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.Mentor_Name || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{family.FDP_Status || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatCurrency(family.Social_Support_Amount)}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatCurrency(family.Economic_Support_Amount)}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(family.update_date)}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleView(family)}
													className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
													title="View details"
												>
													<Eye className="h-3 w-3" />
													View
												</button>
												<button
													onClick={() => handleEdit(family)}
													className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
													title="Edit record"
												>
													<Edit className="h-3 w-3" />
													Edit
												</button>
												<button
													onClick={() => handleDelete(family)}
													disabled={deletingId === `${family.CNIC}-${family.FAMILY_ID}`}
													className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													title="Delete record"
												>
													{deletingId === `${family.CNIC}-${family.FAMILY_ID}` ? (
														<>
															<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
															Deleting...
														</>
													) : (
														<>
															<Trash2 className="h-3 w-3" />
															Delete
														</>
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
		</div>
	);
}
