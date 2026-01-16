"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type HealthSupportFormData = {
	// Family-Level Information
	FamilyID: string;
	HeadName: string;
	AreaType: string;
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	BaselinePerCapitaAsPctOfSelfSuff: number;
	BaselinePovertyLevel: string;
	MaxSocialSupportAmount: number;
	
	// Health Support - Monthly Values
	HealthMonthlyTotalCost: number;
	HealthMonthlyFamilyContribution: number;
	HealthMonthlyPEContribution: number;
	HealthNumberOfMonths: number;
	
	// Health Support - Total Values (calculated)
	HealthTotalCost: number;
	HealthTotalFamilyContribution: number;
	HealthTotalPEContribution: number;
	
	// Beneficiary Information
	BeneficiaryID: string;
	BeneficiaryName: string;
	BeneficiaryAge: number;
	BeneficiaryGender: string;
	
	// Status
	ApprovalStatus: string;
	Remarks: string;
};

type FamilyMember = {
	MemberNo: string;
	FullName: string;
	Gender: string;
	DOBMonth: number;
	DOBYear: number;
};

function HealthSupportContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpHealthSupportId = searchParams.get("fdpHealthSupportId"); // For edit mode

	const isEditMode = !!fdpHealthSupportId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<HealthSupportFormData>({
		FamilyID: formNumber || "",
		HeadName: "",
		AreaType: "",
		BaselineFamilyIncome: 0,
		FamilyMembersCount: 0,
		FamilyPerCapitaIncome: 0,
		SelfSufficiencyIncomePerCapita: 0,
		BaselinePerCapitaAsPctOfSelfSuff: 0,
		BaselinePovertyLevel: "",
		MaxSocialSupportAmount: 0,
		HealthMonthlyTotalCost: 0,
		HealthMonthlyFamilyContribution: 0,
		HealthMonthlyPEContribution: 0,
		HealthNumberOfMonths: 0,
		HealthTotalCost: 0,
		HealthTotalFamilyContribution: 0,
		HealthTotalPEContribution: 0,
		BeneficiaryID: memberNo || "",
		BeneficiaryName: memberName || "",
		BeneficiaryAge: 0,
		BeneficiaryGender: "",
		ApprovalStatus: "Pending",
		Remarks: "",
	});

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [healthSupportRecords, setHealthSupportRecords] = useState<any[]>([]);
	const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
	const [alreadyDefinedSocialSupport, setAlreadyDefinedSocialSupport] = useState(0);
	const [availableSocialSupport, setAvailableSocialSupport] = useState(0);
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

	// Calculate age from DOB (DOBMonth: mm, DOBYear: yyyy)
	const calculateAge = (dobMonth: number, dobYear: number): number => {
		if (!dobMonth || !dobYear || isNaN(dobMonth) || isNaN(dobYear)) return 0;
		const today = new Date();
		// Convert DOBMonth (mm) and DOBYear (yyyy) to date format: 1/mm/yyyy
		const birthDate = new Date(dobYear, dobMonth - 1, 1);
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		// Return age only if it's positive (> 0), otherwise return 0
		return age > 0 ? age : 0;
	};

	// Calculate poverty level
	const calculatePovertyLevel = (perCapitaIncome: number, areaType: string): string => {
		const thresholds: { [key: string]: { [key: number]: string } } = {
			"Rural": {
				0: "Level -4",
				2700: "Level -3",
				5400: "Level -2",
				8100: "Level -1",
				10800: "Level 0",
				13500: "Level +1",
			},
			"Urban": {
				0: "Level -4",
				4800: "Level -3",
				9600: "Level -2",
				14400: "Level -1",
				19200: "Level 0",
				24000: "Level +1",
			},
			"Peri-Urban": {
				0: "Level -4",
				4025: "Level -3",
				8100: "Level -2",
				12100: "Level -1",
				16100: "Level 0",
				20100: "Level +1",
			},
		};

		const areaThresholds = thresholds[areaType] || thresholds["Rural"];
		const sortedLevels = Object.keys(areaThresholds)
			.map(Number)
			.sort((a, b) => b - a);

		for (const threshold of sortedLevels) {
			if (perCapitaIncome >= threshold) {
				return areaThresholds[threshold];
			}
		}

		return "Level -4";
	};

	// Auto-calculate PE Contribution
	useEffect(() => {
		const peContribution = formData.HealthMonthlyTotalCost - formData.HealthMonthlyFamilyContribution;
		// Only set positive values, otherwise set to 0
		setFormData(prev => ({ ...prev, HealthMonthlyPEContribution: peContribution > 0 ? peContribution : 0 }));
	}, [formData.HealthMonthlyTotalCost, formData.HealthMonthlyFamilyContribution]);

	// Auto-calculate Total Values
	useEffect(() => {
		const months = formData.HealthNumberOfMonths || 0;
		setFormData(prev => ({
			...prev,
			HealthTotalCost: (prev.HealthMonthlyTotalCost || 0) * months,
			HealthTotalFamilyContribution: (prev.HealthMonthlyFamilyContribution || 0) * months,
			HealthTotalPEContribution: (prev.HealthMonthlyPEContribution || 0) * months,
		}));
	}, [formData.HealthMonthlyTotalCost, formData.HealthMonthlyFamilyContribution, formData.HealthMonthlyPEContribution, formData.HealthNumberOfMonths]);

	// Calculate Max Social Support Amount based on Poverty Level
	useEffect(() => {
		let maxSocialSupport = 0;
		switch (formData.BaselinePovertyLevel) {
			case "Level -4":
				maxSocialSupport = 468000;
				break;
			case "Level -3":
				maxSocialSupport = 360000;
				break;
			case "Level -2":
				maxSocialSupport = 264000;
				break;
			case "Level -1":
				maxSocialSupport = 180000;
				break;
			default:
				maxSocialSupport = 0;
		}
		setFormData(prev => ({ ...prev, MaxSocialSupportAmount: maxSocialSupport }));
	}, [formData.BaselinePovertyLevel]);

	// Fetch baseline data and existing health support data
	useEffect(() => {
		if (!formNumber) {
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch baseline data
				const baselineResponse = await fetch(`/api/family-development-plan/baseline-data?formNumber=${encodeURIComponent(formNumber)}`);
				const baselineResult = await baselineResponse.json();
				
				if (baselineResult.success && baselineResult.data) {
					const data = baselineResult.data;
					
					// Calculate per capita income
					const perCapitaIncome = data.FamilyMembersCount > 0 
						? data.BaselineFamilyIncome / data.FamilyMembersCount 
						: 0;
					
					// Calculate percentage of self-sufficiency
					const selfSufficiencyPercent = data.SelfSufficiencyIncomePerCapita > 0
						? (perCapitaIncome / data.SelfSufficiencyIncomePerCapita) * 100
						: 0;
					
					// Calculate poverty level
					const povertyLevel = calculatePovertyLevel(perCapitaIncome, data.Area_Type || "Rural");
					
					// Fetch head name from basic info
					const basicInfoResponse = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNumber)}`);
					const basicInfoResult = await basicInfoResponse.json();
					const headName = basicInfoResult.success && basicInfoResult.data ? basicInfoResult.data.Full_Name || "" : "";

					setFormData(prev => ({
						...prev,
						BaselineFamilyIncome: data.BaselineFamilyIncome,
						FamilyMembersCount: data.FamilyMembersCount,
						FamilyPerCapitaIncome: perCapitaIncome,
						SelfSufficiencyIncomePerCapita: data.SelfSufficiencyIncomePerCapita,
						BaselinePerCapitaAsPctOfSelfSuff: selfSufficiencyPercent,
						BaselinePovertyLevel: povertyLevel,
						HeadName: headName,
						AreaType: data.Area_Type || "",
					}));
				}

				// Fetch family members
				const membersResponse = await fetch(`/api/family-development-plan/members?formNumber=${encodeURIComponent(formNumber)}`);
				const membersResult = await membersResponse.json();
				
				if (membersResult.success && membersResult.data) {
					const members = Array.isArray(membersResult.data) ? membersResult.data : [membersResult.data];
					setFamilyMembers(members);
					
					// If memberNo is provided, find and set beneficiary info
					if (memberNo) {
						const selectedMember = members.find((m: FamilyMember) => m.MemberNo === memberNo);
						if (selectedMember) {
							// Try to fetch age from baseline database first
							let age = 0;
							try {
								const baselineMemberResponse = await fetch(`/api/family-members?memberId=${encodeURIComponent(memberNo)}`);
								const baselineMemberResult = await baselineMemberResponse.json();
								if (baselineMemberResult.success && baselineMemberResult.member && baselineMemberResult.member.AGE && !isNaN(baselineMemberResult.member.AGE)) {
									age = parseInt(baselineMemberResult.member.AGE) || 0;
								} else {
									// Fallback to calculating from DOB (DOBMonth: mm, DOBYear: yyyy)
									age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
								}
							} catch (err) {
								// Fallback to calculating from DOB if baseline fetch fails
								console.warn("Error fetching age from baseline, using calculated age:", err);
								age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
							}
							
							setFormData(prev => ({
								...prev,
								BeneficiaryID: selectedMember.MemberNo,
								BeneficiaryName: selectedMember.FullName,
								BeneficiaryAge: age > 0 ? age : 0,
								BeneficiaryGender: selectedMember.Gender || "",
							}));
						}
					}
				}

				// Load all existing health support records for this family
				if (formNumber) {
					const response = await fetch(`/api/family-development-plan/health-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setHealthSupportRecords(records);
						
						// If editing, load the selected record
						if (isEditMode && fdpHealthSupportId) {
							const record = records.find((r: any) => r.FDP_HealthSupportID === parseInt(fdpHealthSupportId));
							if (record) {
								// Calculate age if not available in record
								let age = 0;
								if (record.BeneficiaryAge && !isNaN(record.BeneficiaryAge)) {
									const parsedAge = parseInt(record.BeneficiaryAge) || 0;
									age = parsedAge > 0 ? parsedAge : 0;
								} else if (record.BeneficiaryID) {
									// Try to find member and calculate age from DOB
									const member = familyMembers.find((m: FamilyMember) => m.MemberNo === record.BeneficiaryID);
									if (member && member.DOBMonth && member.DOBYear) {
										age = calculateAge(member.DOBMonth, member.DOBYear);
									}
								}
								
								setFormData(prev => ({
									...prev,
									HealthMonthlyTotalCost: record.HealthMonthlyTotalCost || 0,
									HealthMonthlyFamilyContribution: record.HealthMonthlyFamilyContribution || 0,
									HealthMonthlyPEContribution: record.HealthMonthlyPEContribution || 0,
									HealthNumberOfMonths: record.HealthNumberOfMonths || 0,
									HealthTotalCost: record.HealthTotalCost || 0,
									HealthTotalFamilyContribution: record.HealthTotalFamilyContribution || 0,
									HealthTotalPEContribution: record.HealthTotalPEContribution || 0,
									BeneficiaryID: record.BeneficiaryID || "",
									BeneficiaryName: record.BeneficiaryName || "",
									BeneficiaryAge: age > 0 ? age : 0,
									BeneficiaryGender: record.BeneficiaryGender || "",
									ApprovalStatus: record.ApprovalStatus || "Pending",
									Remarks: record.Remarks || "",
								}));
							}
						}
					}
				}
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load data. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber, memberNo, isEditMode, fdpHealthSupportId]);

	// Fetch total social support and calculate available
	useEffect(() => {
		if (!formNumber || !formData.MaxSocialSupportAmount) return;

		const fetchTotalSocialSupport = async () => {
			try {
				const excludeRecordId = isEditMode && fdpHealthSupportId ? fdpHealthSupportId : null;
				const url = `/api/family-development-plan/total-social-support?formNumber=${encodeURIComponent(formNumber)}${excludeRecordId ? `&excludeRecordId=${excludeRecordId}&excludeRecordType=health` : ""}`;
				
				const response = await fetch(url);
				const result = await response.json();
				
				if (result.success && result.data) {
					const totalDefined = result.data.totalSocialSupport || 0;
					const alreadyDefined = totalDefined;
					const available = Math.max(0, formData.MaxSocialSupportAmount - alreadyDefined);
					
					setAlreadyDefinedSocialSupport(alreadyDefined);
					setAvailableSocialSupport(available);
				}
			} catch (err) {
				console.error("Error fetching total social support:", err);
			}
		};

		fetchTotalSocialSupport();
	}, [formNumber, formData.MaxSocialSupportAmount, isEditMode, fdpHealthSupportId]);

	const handleChange = (field: keyof HealthSupportFormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleBeneficiaryChange = async (memberNo: string) => {
		const selectedMember = familyMembers.find(m => m.MemberNo === memberNo);
		if (selectedMember) {
			// Try to fetch age from baseline database first
			let age = 0;
			try {
				const baselineMemberResponse = await fetch(`/api/family-members?memberId=${encodeURIComponent(memberNo)}`);
				const baselineMemberResult = await baselineMemberResponse.json();
				if (baselineMemberResult.success && baselineMemberResult.member && baselineMemberResult.member.AGE && !isNaN(baselineMemberResult.member.AGE)) {
					age = parseInt(baselineMemberResult.member.AGE) || 0;
				} else {
					// Fallback to calculating from DOB (DOBMonth: mm, DOBYear: yyyy)
					age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
				}
			} catch (err) {
				// Fallback to calculating from DOB if baseline fetch fails
				console.warn("Error fetching age from baseline, using calculated age:", err);
				age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
			}
			
			setFormData(prev => ({
				...prev,
				BeneficiaryID: selectedMember.MemberNo,
				BeneficiaryName: selectedMember.FullName,
				BeneficiaryAge: age > 0 ? age : 0,
				BeneficiaryGender: selectedMember.Gender || "",
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(false);

		// Validate that Total PE Contribution does not exceed Available Social Support
		if (formData.HealthTotalPEContribution > availableSocialSupport) {
			setError(`Total PE Contribution (PKR ${formData.HealthTotalPEContribution.toLocaleString()}) exceeds Available Social Support (PKR ${availableSocialSupport.toLocaleString()}). Please reduce the amount.`);
			setSaving(false);
			return;
		}

		try {
			const url = isEditMode
				? `/api/family-development-plan/health-support?fdpHealthSupportId=${fdpHealthSupportId}`
				: `/api/family-development-plan/health-support`;

			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					FormNumber: formData.FamilyID,
					HeadName: formData.HeadName,
					AreaType: formData.AreaType,
					HealthMonthlyTotalCost: formData.HealthMonthlyTotalCost,
					HealthMonthlyFamilyContribution: formData.HealthMonthlyFamilyContribution,
					HealthMonthlyPEContribution: formData.HealthMonthlyPEContribution,
					HealthNumberOfMonths: formData.HealthNumberOfMonths,
					HealthTotalCost: formData.HealthTotalCost,
					HealthTotalFamilyContribution: formData.HealthTotalFamilyContribution,
					HealthTotalPEContribution: formData.HealthTotalPEContribution,
					BeneficiaryID: formData.BeneficiaryID,
					BeneficiaryName: formData.BeneficiaryName,
					BeneficiaryAge: formData.BeneficiaryAge,
					BeneficiaryGender: formData.BeneficiaryGender,
					ApprovalStatus: formData.ApprovalStatus,
					Remarks: formData.Remarks,
				}),
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || "Failed to save health support data");
			}

			setSuccess(true);
			
			// Reload records
			const recordsResponse = await fetch(`/api/family-development-plan/health-support?familyID=${encodeURIComponent(formNumber || "")}`);
			const recordsData = await recordsResponse.json();
			if (recordsData.success && recordsData.data) {
				const records = Array.isArray(recordsData.data) ? recordsData.data : [recordsData.data];
				setHealthSupportRecords(records);
			}

			// Reset form (keep beneficiary info if memberNo is provided)
			setFormData(prev => ({
				...prev,
				HealthMonthlyTotalCost: 0,
				HealthMonthlyFamilyContribution: 0,
				HealthMonthlyPEContribution: 0,
				HealthNumberOfMonths: 0,
				HealthTotalCost: 0,
				HealthTotalFamilyContribution: 0,
				HealthTotalPEContribution: 0,
				ApprovalStatus: "Pending",
				Remarks: "",
				// Keep beneficiary info if memberNo is provided
				BeneficiaryID: memberNo || prev.BeneficiaryID,
				BeneficiaryName: memberName || prev.BeneficiaryName,
			}));
			
			// If in edit mode, redirect to normal page
			if (isEditMode) {
				router.push(`/dashboard/family-development-plan/health-support?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}`);
			}

			setTimeout(() => setSuccess(false), 3000);
		} catch (err: any) {
			setError(err.message || "Failed to save health support data");
		} finally {
			setSaving(false);
		}
	};

	const formatCurrency = (value: number): string => {
		return `Rs. ${value.toLocaleString()}`;
	};

	const formatPercent = (value: number): string => {
		return `${value.toFixed(2)}%`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading Health Support data...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`)}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Health Support</h1>
						<p className="text-gray-600 mt-2">
							{formNumber && memberNo && (
								<span>
									Form Number: {formNumber} | Member: {memberNo} {memberName && `- ${memberName}`}
								</span>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
					<span>Health Support data saved successfully!</span>
				</div>
			)}

			{/* Error Messages */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
					<AlertCircle className="h-5 w-5" />
					<span>{error}</span>
				</div>
			)}

			{/* Section 1: Family-Level Information (Read-Only) */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">1. Family-Level Information</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Family ID</label>
						<input
							type="text"
							value={formData.FamilyID}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Head Name (Self)</label>
						<input
							type="text"
							value={formData.HeadName}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Area Type</label>
						<input
							type="text"
							value={formData.AreaType}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Family Income</label>
						<input
							type="text"
							value={formatCurrency(formData.BaselineFamilyIncome)}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Family Members Count</label>
						<input
							type="text"
							value={formData.FamilyMembersCount}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Family Per Capita Income</label>
						<input
							type="text"
							value={formatCurrency(formData.FamilyPerCapitaIncome)}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Self-Sufficiency Income Per Capita</label>
						<input
							type="text"
							value={formatCurrency(formData.SelfSufficiencyIncomePerCapita)}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Per Capita as % of Self-Sufficiency</label>
						<input
							type="text"
							value={formatPercent(formData.BaselinePerCapitaAsPctOfSelfSuff)}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Poverty Level</label>
						<input
							type="text"
							value={formData.BaselinePovertyLevel}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Max Social Support Amount</label>
						<input
							type="text"
							value={formData.MaxSocialSupportAmount && formData.MaxSocialSupportAmount > 0 
								? `PKR ${formData.MaxSocialSupportAmount.toLocaleString()}` 
								: "-"}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Already Defined Social Support</label>
						<input
							type="text"
							value={`PKR ${alreadyDefinedSocialSupport.toLocaleString()}`}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Available Social Support</label>
						<input
							type="text"
							value={`PKR ${availableSocialSupport.toLocaleString()}`}
							readOnly
							className={`w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold ${availableSocialSupport < 0 ? 'text-red-600' : availableSocialSupport === 0 ? 'text-orange-600' : 'text-green-600'}`}
						/>
					</div>
				</div>
			</div>

			{/* Section 2: Health Support Form */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">
					{isEditMode ? "Edit Health Support" : "2. Add Health Support"}
				</h2>
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Beneficiary Information */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Beneficiary (Member) <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.BeneficiaryID && formData.BeneficiaryName 
										? `${formData.BeneficiaryID} - ${formData.BeneficiaryName}`
										: formData.BeneficiaryID || ""}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Name</label>
								<input
									type="text"
									value={formData.BeneficiaryName}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Age</label>
								<input
									type="number"
									value={formData.BeneficiaryAge && formData.BeneficiaryAge > 0 && !isNaN(formData.BeneficiaryAge) ? formData.BeneficiaryAge : ""}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Gender</label>
								<input
									type="text"
									value={formData.BeneficiaryGender}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						</div>

						{/* Health Support - Monthly Values */}
						<div className="border-t pt-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Health Support</h3>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Monthly Total Cost <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										min="0.01"
										value={formData.HealthMonthlyTotalCost > 0 ? formData.HealthMonthlyTotalCost : ""}
										onChange={(e) => {
											const inputValue = e.target.value;
											if (inputValue === "") {
												handleChange("HealthMonthlyTotalCost", 0);
											} else {
												const value = parseFloat(inputValue);
												if (!isNaN(value) && value > 0) {
													handleChange("HealthMonthlyTotalCost", value);
												}
											}
										}}
										onBlur={(e) => {
											const value = parseFloat(e.target.value);
											if (isNaN(value) || value <= 0) {
												handleChange("HealthMonthlyTotalCost", 0);
											}
										}}
										required
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Monthly Family Contribution <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={formData.HealthMonthlyFamilyContribution > 0 ? formData.HealthMonthlyFamilyContribution : ""}
										onChange={(e) => {
											const inputValue = e.target.value;
											if (inputValue === "") {
												handleChange("HealthMonthlyFamilyContribution", 0);
											} else {
												const value = parseFloat(inputValue);
												if (!isNaN(value) && value >= 0) {
													handleChange("HealthMonthlyFamilyContribution", value);
												}
											}
										}}
										onBlur={(e) => {
											const value = parseFloat(e.target.value);
											if (isNaN(value) || value < 0) {
												handleChange("HealthMonthlyFamilyContribution", 0);
											}
										}}
										required
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Monthly PE Contribution</label>
									<input
										type="number"
										step="0.01"
										value={formData.HealthMonthlyPEContribution > 0 ? formData.HealthMonthlyPEContribution : ""}
										readOnly
										className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Number of Months <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										value={formData.HealthNumberOfMonths > 0 ? formData.HealthNumberOfMonths : ""}
										onChange={(e) => {
											const inputValue = e.target.value;
											if (inputValue === "") {
												handleChange("HealthNumberOfMonths", 0);
											} else {
												const value = parseInt(inputValue);
												if (!isNaN(value) && value > 0) {
													handleChange("HealthNumberOfMonths", value);
												}
											}
										}}
										onBlur={(e) => {
											const value = parseInt(e.target.value);
											if (isNaN(value) || value <= 0) {
												handleChange("HealthNumberOfMonths", 0);
											}
										}}
										required
										min="1"
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
						</div>

						{/* Health Support - Total Values (Read-Only) */}
						<div className="border-t pt-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Total Health Support (Calculated)</h3>
							<div className="grid grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Total Cost</label>
									<input
										type="text"
										value={formatCurrency(formData.HealthTotalCost)}
										readOnly
										className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Total Family Contribution</label>
									<input
										type="text"
										value={formatCurrency(formData.HealthTotalFamilyContribution)}
										readOnly
										className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Total PE Contribution</label>
									<input
										type="text"
										value={formatCurrency(formData.HealthTotalPEContribution)}
										readOnly
										className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
									/>
								</div>
							</div>
						</div>

						{/* Approval Status and Remarks */}
						<div className="border-t pt-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Status and Remarks</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
									<input
										type="text"
										value={formData.ApprovalStatus}
										readOnly
										className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
									<textarea
										value={formData.Remarks}
										onChange={(e) => handleChange("Remarks", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										rows={4}
										placeholder="Enter remarks here..."
									/>
								</div>
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex justify-end gap-3 pt-4 border-t">
							{isEditMode && (
								<button
									type="button"
									onClick={() => {
										setSelectedRecordId(null);
										router.push(`/dashboard/family-development-plan/health-support?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}`);
									}}
									className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</button>
							)}
							<button
								type="submit"
								disabled={saving}
								className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Save className="h-4 w-4" />
								{saving ? "Saving..." : isEditMode ? "Update" : "Save"}
							</button>
						</div>
					</form>
				</div>

			{/* Section 3: Existing Health Support Records */}
			{healthSupportRecords.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Existing Health Support Records</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly PE</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Months</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{healthSupportRecords.map((record) => (
									<tr key={record.FDP_HealthSupportID} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.FDP_HealthSupportID}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{record.BeneficiaryName || record.BeneficiaryID}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatCurrency(record.HealthMonthlyTotalCost || 0)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatCurrency(record.HealthMonthlyPEContribution || 0)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{record.HealthNumberOfMonths || 0}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
											{formatCurrency(record.HealthTotalPEContribution || 0)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												record.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												record.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{record.ApprovalStatus || "Pending"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<button
												onClick={() => {
													router.push(`/dashboard/family-development-plan/health-support?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpHealthSupportId=${record.FDP_HealthSupportID}`);
												}}
												className="text-blue-600 hover:text-blue-800 mr-3"
											>
												<Edit className="h-4 w-4 inline" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

export default function HealthSupportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<HealthSupportContent />
		</Suspense>
	);
}
