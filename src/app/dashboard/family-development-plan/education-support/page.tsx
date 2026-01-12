"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type EducationSupportFormData = {
	// Family-Level Information
	FamilyID: string;
	HeadName: string;
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	BaselinePerCapitaAsPctOfSelfSuff: number;
	BaselinePovertyLevel: string;
	MaxSocialSupportAmount: number;
	
	// Education Costs - One-time Admission
	EduOneTimeAdmissionTotalCost: number;
	EduOneTimeAdmissionFamilyContribution: number;
	EduOneTimeAdmissionPEContribution: number;
	
	// Education Costs - Monthly Tuition
	EduMonthlyTuitionTotalCost: number;
	EduMonthlyTuitionFamilyContribution: number;
	EduMonthlyTuitionPEContribution: number;
	EduTuitionNumberOfMonths: number;
	
	// Education Costs - Monthly Hostel
	EduMonthlyHostelTotalCost: number;
	EduMonthlyHostelFamilyContribution: number;
	EduMonthlyHostelPEContribution: number;
	EduHostelNumberOfMonths: number;
	
	// Education Costs - Monthly Transport
	EduMonthlyTransportTotalCost: number;
	EduMonthlyTransportFamilyContribution: number;
	EduMonthlyTransportPEContribution: number;
	EduTransportNumberOfMonths: number;
	
	// Calculated Totals (read-only)
	EduTotalSupportCost: number;
	EduTotalFamilyContribution: number;
	EduTotalPEContribution: number;
	
	// Beneficiary Information
	BeneficiaryID: string;
	BeneficiaryName: string;
	BeneficiaryAge: number;
	BeneficiaryGender: string;
	
	// Education Intervention Type
	EducationInterventionType: string;
	RegularSupport: boolean;
	
	// If Admitted
	BaselineReasonNotStudying: string;
	AdmittedToSchoolType: string;
	AdmittedToClassLevel: string;
	
	// If Transferred
	BaselineSchoolType: string;
	TransferredToSchoolType: string;
	TransferredToClassLevel: string;
	
	// Approval and Remarks
	ApprovalStatus: string;
	Remarks: string;
};

type FamilyMember = {
	MemberNo: string;
	FullName: string;
	Gender: string;
	DOBMonth: string | null;
	DOBYear: string | null;
};

type BaselineData = {
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	SelfSufficiencyIncomePerCapita: number;
	Area_Type: string;
	HeadName: string;
};

function EducationSupportContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpSocialEduId = searchParams.get("fdpSocialEduId"); // For edit mode

	const isEditMode = !!fdpSocialEduId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<EducationSupportFormData>({
		FamilyID: formNumber || "",
		HeadName: "",
		BaselineFamilyIncome: 0,
		FamilyMembersCount: 0,
		FamilyPerCapitaIncome: 0,
		SelfSufficiencyIncomePerCapita: 0,
		BaselinePerCapitaAsPctOfSelfSuff: 0,
		BaselinePovertyLevel: "",
		MaxSocialSupportAmount: 0,
		EduOneTimeAdmissionTotalCost: 0,
		EduOneTimeAdmissionFamilyContribution: 0,
		EduOneTimeAdmissionPEContribution: 0,
		EduMonthlyTuitionTotalCost: 0,
		EduMonthlyTuitionFamilyContribution: 0,
		EduMonthlyTuitionPEContribution: 0,
		EduTuitionNumberOfMonths: 0,
		EduMonthlyHostelTotalCost: 0,
		EduMonthlyHostelFamilyContribution: 0,
		EduMonthlyHostelPEContribution: 0,
		EduHostelNumberOfMonths: 0,
		EduMonthlyTransportTotalCost: 0,
		EduMonthlyTransportFamilyContribution: 0,
		EduMonthlyTransportPEContribution: 0,
		EduTransportNumberOfMonths: 0,
		EduTotalSupportCost: 0,
		EduTotalFamilyContribution: 0,
		EduTotalPEContribution: 0,
		BeneficiaryID: memberNo || "",
		BeneficiaryName: memberName || "",
		BeneficiaryAge: 0,
		BeneficiaryGender: "",
		EducationInterventionType: "",
		RegularSupport: false,
		BaselineReasonNotStudying: "",
		AdmittedToSchoolType: "",
		AdmittedToClassLevel: "",
		BaselineSchoolType: "",
		TransferredToSchoolType: "",
		TransferredToClassLevel: "",
		ApprovalStatus: "Pending",
		Remarks: "",
	});

	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [educationSupportRecords, setEducationSupportRecords] = useState<any[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
	const [alreadyDefinedSocialSupport, setAlreadyDefinedSocialSupport] = useState(0);
	const [availableSocialSupport, setAvailableSocialSupport] = useState(0);

	// Calculate age from DOB
	const calculateAge = (dobMonth: string | null, dobYear: string | null): number => {
		if (!dobMonth || !dobYear) return 0;
		const monthMap: { [key: string]: number } = {
			"Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
			"Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
		};
		const month = monthMap[dobMonth];
		const year = parseInt(dobYear);
		if (isNaN(year) || month === undefined) return 0;
		const today = new Date();
		const birthDate = new Date(year, month, 1);
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
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

	// Auto-calculate PE Contribution
	useEffect(() => {
		const peContribution = formData.EduOneTimeAdmissionTotalCost - formData.EduOneTimeAdmissionFamilyContribution;
		setFormData(prev => ({ ...prev, EduOneTimeAdmissionPEContribution: Math.max(0, peContribution) }));
	}, [formData.EduOneTimeAdmissionTotalCost, formData.EduOneTimeAdmissionFamilyContribution]);

	useEffect(() => {
		const peContribution = formData.EduMonthlyTuitionTotalCost - formData.EduMonthlyTuitionFamilyContribution;
		setFormData(prev => ({ ...prev, EduMonthlyTuitionPEContribution: Math.max(0, peContribution) }));
	}, [formData.EduMonthlyTuitionTotalCost, formData.EduMonthlyTuitionFamilyContribution]);

	useEffect(() => {
		const peContribution = formData.EduMonthlyHostelTotalCost - formData.EduMonthlyHostelFamilyContribution;
		setFormData(prev => ({ ...prev, EduMonthlyHostelPEContribution: Math.max(0, peContribution) }));
	}, [formData.EduMonthlyHostelTotalCost, formData.EduMonthlyHostelFamilyContribution]);

	useEffect(() => {
		const peContribution = formData.EduMonthlyTransportTotalCost - formData.EduMonthlyTransportFamilyContribution;
		setFormData(prev => ({ ...prev, EduMonthlyTransportPEContribution: Math.max(0, peContribution) }));
	}, [formData.EduMonthlyTransportTotalCost, formData.EduMonthlyTransportFamilyContribution]);

	// Handle Regular Support changes
	useEffect(() => {
		if (formData.EducationInterventionType === "Regular Support") {
			// Clear Baseline Reason Not Studying and one-time admission costs
			setFormData(prev => ({
				...prev,
				RegularSupport: true,
				BaselineReasonNotStudying: "",
				EduOneTimeAdmissionTotalCost: 0,
				EduOneTimeAdmissionFamilyContribution: 0,
				EduOneTimeAdmissionPEContribution: 0,
			}));
		} else {
			setFormData(prev => ({
				...prev,
				RegularSupport: false,
			}));
		}
	}, [formData.EducationInterventionType]);

	// Calculate totals
	useEffect(() => {
		// Exclude one-time admission costs if Regular Support is selected
		const isRegularSupport = formData.EducationInterventionType === "Regular Support";
		const oneTimeCost = isRegularSupport ? 0 : formData.EduOneTimeAdmissionTotalCost;
		const oneTimeFamily = isRegularSupport ? 0 : formData.EduOneTimeAdmissionFamilyContribution;
		const oneTimePE = isRegularSupport ? 0 : formData.EduOneTimeAdmissionPEContribution;

		const totalSupportCost = 
			oneTimeCost +
			(formData.EduMonthlyTuitionTotalCost * formData.EduTuitionNumberOfMonths) +
			(formData.EduMonthlyHostelTotalCost * formData.EduHostelNumberOfMonths) +
			(formData.EduMonthlyTransportTotalCost * formData.EduTransportNumberOfMonths);

		const totalFamilyContribution = 
			oneTimeFamily +
			(formData.EduMonthlyTuitionFamilyContribution * formData.EduTuitionNumberOfMonths) +
			(formData.EduMonthlyHostelFamilyContribution * formData.EduHostelNumberOfMonths) +
			(formData.EduMonthlyTransportFamilyContribution * formData.EduTransportNumberOfMonths);

		const totalPEContribution = 
			oneTimePE +
			(formData.EduMonthlyTuitionPEContribution * formData.EduTuitionNumberOfMonths) +
			(formData.EduMonthlyHostelPEContribution * formData.EduHostelNumberOfMonths) +
			(formData.EduMonthlyTransportPEContribution * formData.EduTransportNumberOfMonths);

		setFormData(prev => ({
			...prev,
			EduTotalSupportCost: totalSupportCost,
			EduTotalFamilyContribution: totalFamilyContribution,
			EduTotalPEContribution: totalPEContribution,
		}));
	}, [
		formData.EducationInterventionType,
		formData.EduOneTimeAdmissionTotalCost,
		formData.EduMonthlyTuitionTotalCost,
		formData.EduTuitionNumberOfMonths,
		formData.EduMonthlyHostelTotalCost,
		formData.EduHostelNumberOfMonths,
		formData.EduMonthlyTransportTotalCost,
		formData.EduTransportNumberOfMonths,
		formData.EduOneTimeAdmissionFamilyContribution,
		formData.EduMonthlyTuitionFamilyContribution,
		formData.EduMonthlyHostelFamilyContribution,
		formData.EduMonthlyTransportFamilyContribution,
		formData.EduOneTimeAdmissionPEContribution,
		formData.EduMonthlyTuitionPEContribution,
		formData.EduMonthlyHostelPEContribution,
		formData.EduMonthlyTransportPEContribution,
	]);

	// Fetch total social support and calculate available
	useEffect(() => {
		if (!formNumber || !formData.MaxSocialSupportAmount) return;

		const fetchTotalSocialSupport = async () => {
			try {
				const excludeRecordId = isEditMode && fdpSocialEduId ? fdpSocialEduId : null;
				const url = `/api/family-development-plan/total-social-support?formNumber=${encodeURIComponent(formNumber)}${excludeRecordId ? `&excludeRecordId=${excludeRecordId}&excludeRecordType=education` : ""}`;
				
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
	}, [formNumber, formData.MaxSocialSupportAmount, isEditMode, fdpSocialEduId]);

	// Fetch baseline data and existing education support data
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
					}));
				}

				// Fetch family members
				const membersResponse = await fetch(`/api/family-members?formNumber=${encodeURIComponent(formNumber)}`);
				const membersResult = await membersResponse.json();
				
				if (membersResult.success && membersResult.data) {
					const members = Array.isArray(membersResult.data) ? membersResult.data : [membersResult.data];
					setFamilyMembers(members);
					
					// If memberNo is provided, find and set beneficiary info
					if (memberNo) {
						const selectedMember = members.find((m: FamilyMember) => m.MemberNo === memberNo);
						if (selectedMember) {
							const age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
							setFormData(prev => ({
								...prev,
								BeneficiaryID: selectedMember.MemberNo,
								BeneficiaryName: selectedMember.FullName,
								BeneficiaryAge: age,
								BeneficiaryGender: selectedMember.Gender,
							}));
						}
					}
				}

				// Load all existing education support records for this family
				if (formNumber) {
					const response = await fetch(`/api/family-development-plan/education-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setEducationSupportRecords(records);
						
						// If in edit mode with fdpSocialEduId, load that specific record
						if (isEditMode && fdpSocialEduId) {
							const existing = records.find((r: any) => r.FDP_SocialEduID?.toString() === fdpSocialEduId) || records[0];
							if (existing) {
								setSelectedRecordId(existing.FDP_SocialEduID);
								setFormData(prev => ({
									...prev,
									MaxSocialSupportAmount: existing.MaxSocialSupportAmount || 0,
									EduOneTimeAdmissionTotalCost: existing.EduOneTimeAdmissionTotalCost || 0,
									EduOneTimeAdmissionFamilyContribution: existing.EduOneTimeAdmissionFamilyContribution || 0,
									EduOneTimeAdmissionPEContribution: existing.EduOneTimeAdmissionPEContribution || 0,
									EduMonthlyTuitionTotalCost: existing.EduMonthlyTuitionTotalCost || 0,
									EduMonthlyTuitionFamilyContribution: existing.EduMonthlyTuitionFamilyContribution || 0,
									EduMonthlyTuitionPEContribution: existing.EduMonthlyTuitionPEContribution || 0,
									EduTuitionNumberOfMonths: existing.EduTuitionNumberOfMonths || 0,
									EduMonthlyHostelTotalCost: existing.EduMonthlyHostelTotalCost || 0,
									EduMonthlyHostelFamilyContribution: existing.EduMonthlyHostelFamilyContribution || 0,
									EduMonthlyHostelPEContribution: existing.EduMonthlyHostelPEContribution || 0,
									EduHostelNumberOfMonths: existing.EduHostelNumberOfMonths || 0,
									EduMonthlyTransportTotalCost: existing.EduMonthlyTransportTotalCost || 0,
									EduMonthlyTransportFamilyContribution: existing.EduMonthlyTransportFamilyContribution || 0,
									EduMonthlyTransportPEContribution: existing.EduMonthlyTransportPEContribution || 0,
									EduTransportNumberOfMonths: existing.EduTransportNumberOfMonths || 0,
									BeneficiaryID: existing.BeneficiaryID || prev.BeneficiaryID,
									BeneficiaryName: existing.BeneficiaryName || prev.BeneficiaryName,
									BeneficiaryAge: existing.BeneficiaryAge || prev.BeneficiaryAge,
									BeneficiaryGender: existing.BeneficiaryGender || prev.BeneficiaryGender,
									EducationInterventionType: existing.EducationInterventionType || "",
									RegularSupport: existing.RegularSupport || (existing.EducationInterventionType === "Regular Support"),
									BaselineReasonNotStudying: existing.BaselineReasonNotStudying || "",
									AdmittedToSchoolType: existing.AdmittedToSchoolType || "",
									AdmittedToClassLevel: existing.AdmittedToClassLevel || "",
									BaselineSchoolType: existing.BaselineSchoolType || "",
									TransferredToSchoolType: existing.TransferredToSchoolType || "",
									TransferredToClassLevel: existing.TransferredToClassLevel || "",
									ApprovalStatus: existing.ApprovalStatus || "Pending",
									Remarks: existing.Remarks || "",
								}));
								setShowForm(true);
							}
						} else {
							// If there are records, show gridview by default
							if (records.length > 0) {
								setShowForm(false);
							} else {
								setShowForm(true);
							}
						}
					} else {
						setShowForm(true);
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
	}, [formNumber, memberNo, isEditMode, fdpSocialEduId]);

	const handleChange = (field: keyof EducationSupportFormData, value: string | number | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleBeneficiaryChange = (memberNo: string) => {
		const selectedMember = familyMembers.find(m => m.MemberNo === memberNo);
		if (selectedMember) {
			const age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
			setFormData(prev => ({
				...prev,
				BeneficiaryID: selectedMember.MemberNo,
				BeneficiaryName: selectedMember.FullName,
				BeneficiaryAge: age,
				BeneficiaryGender: selectedMember.Gender,
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		// Validation
		if (!formData.BeneficiaryID || !formData.EducationInterventionType) {
			setError("Please fill in all required fields (Beneficiary ID, Education Intervention Type)");
			return;
		}

		if (formData.EducationInterventionType === "Admitted" && !formData.AdmittedToSchoolType) {
			setError("Please select Admitted To School Type");
			return;
		}

		if (formData.EducationInterventionType === "Regular Support" && !formData.AdmittedToSchoolType) {
			setError("Please select School Type");
			return;
		}

		if (formData.EducationInterventionType === "Transferred" && (!formData.BaselineSchoolType || !formData.TransferredToSchoolType)) {
			setError("Please fill in Baseline School Type and Transferred To School Type");
			return;
		}

		// Validate that Total PE Contribution does not exceed Available Social Support
		if (formData.EduTotalPEContribution > availableSocialSupport) {
			setError(`Total PE Contribution (PKR ${formData.EduTotalPEContribution.toLocaleString()}) exceeds Available Social Support (PKR ${availableSocialSupport.toLocaleString()}). Please reduce the amount.`);
			return;
		}

		setSaving(true);

		try {
			const url = isEditMode 
				? `/api/family-development-plan/education-support?fdpSocialEduId=${encodeURIComponent(fdpSocialEduId!)}`
				: "/api/family-development-plan/education-support";
			
			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					CreatedBy: userProfile?.username || userProfile?.email || "System",
					UpdatedBy: userProfile?.username || userProfile?.email || "System",
				}),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				// Reload education support records
				if (formNumber) {
					const response = await fetch(`/api/family-development-plan/education-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setEducationSupportRecords(records);
					}
				}
				// Reset form
				setFormData(prev => ({
					...prev,
					EduOneTimeAdmissionTotalCost: 0,
					EduOneTimeAdmissionFamilyContribution: 0,
					EduOneTimeAdmissionPEContribution: 0,
					EduMonthlyTuitionTotalCost: 0,
					EduMonthlyTuitionFamilyContribution: 0,
					EduMonthlyTuitionPEContribution: 0,
					EduTuitionNumberOfMonths: 0,
					EduMonthlyHostelTotalCost: 0,
					EduMonthlyHostelFamilyContribution: 0,
					EduMonthlyHostelPEContribution: 0,
					EduHostelNumberOfMonths: 0,
					EduMonthlyTransportTotalCost: 0,
					EduMonthlyTransportFamilyContribution: 0,
					EduMonthlyTransportPEContribution: 0,
					EduTransportNumberOfMonths: 0,
					EducationInterventionType: "",
					RegularSupport: false,
					BaselineReasonNotStudying: "",
					AdmittedToSchoolType: "",
					AdmittedToClassLevel: "",
					BaselineSchoolType: "",
					TransferredToSchoolType: "",
					TransferredToClassLevel: "",
					Remarks: "",
				}));
				setSelectedRecordId(null);
				setShowForm(false);
				setTimeout(() => {
					setSuccess(false);
				}, 3000);
			} else {
				setError(result.message || "Failed to save Education Support data");
			}
		} catch (err: any) {
			console.error("Error saving Education Support data:", err);
			setError(err.message || "Failed to save Education Support data");
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
				<span className="ml-3 text-gray-600">Loading Education Support data...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`)}
					className="p-2 hover:bg-gray-100 rounded-full transition-colors"
				>
					<ArrowLeft className="h-5 w-5 text-gray-600" />
				</button>
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Education Support</h1>
					<p className="text-gray-600 mt-2">
						{formNumber && (
							<span>
								Form Number: {formNumber} {memberNo && `| Member: ${memberNo}`} {memberName && `- ${memberName}`}
							</span>
						)}
					</p>
				</div>
			</div>

			{/* Error/Success Messages */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
					<AlertCircle className="h-5 w-5" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
					Education Support data saved successfully!
				</div>
			)}

			{/* Gridview or Form Toggle */}
			{educationSupportRecords.length > 0 && !showForm && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-900">Existing Education Support Records</h2>
						<button
							type="button"
							onClick={() => {
								setShowForm(true);
								setSelectedRecordId(null);
								setFormData(prev => ({
									...prev,
									EduOneTimeAdmissionTotalCost: 0,
									EduOneTimeAdmissionFamilyContribution: 0,
									EduOneTimeAdmissionPEContribution: 0,
									EduMonthlyTuitionTotalCost: 0,
									EduMonthlyTuitionFamilyContribution: 0,
									EduMonthlyTuitionPEContribution: 0,
									EduTuitionNumberOfMonths: 0,
									EduMonthlyHostelTotalCost: 0,
									EduMonthlyHostelFamilyContribution: 0,
									EduMonthlyHostelPEContribution: 0,
									EduHostelNumberOfMonths: 0,
									EduMonthlyTransportTotalCost: 0,
									EduMonthlyTransportFamilyContribution: 0,
									EduMonthlyTransportPEContribution: 0,
									EduTransportNumberOfMonths: 0,
									EducationInterventionType: "",
									RegularSupport: false,
									BaselineReasonNotStudying: "",
									AdmittedToSchoolType: "",
									AdmittedToClassLevel: "",
									BaselineSchoolType: "",
									TransferredToSchoolType: "",
									TransferredToClassLevel: "",
									Remarks: "",
								}));
							}}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Add New Education Support
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{educationSupportRecords.map((record) => (
									<tr key={record.FDP_SocialEduID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_SocialEduID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.BeneficiaryName || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.EducationInterventionType || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.EduTotalSupportCost ? `PKR ${parseFloat(record.EduTotalSupportCost).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.EduTotalPEContribution ? `PKR ${parseFloat(record.EduTotalPEContribution).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<button
												type="button"
												onClick={() => {
													setSelectedRecordId(record.FDP_SocialEduID);
													router.push(`/dashboard/family-development-plan/education-support?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpSocialEduId=${record.FDP_SocialEduID}`);
												}}
												className="text-[#0b4d2b] hover:text-[#0a3d22] mr-3"
											>
												Edit
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Form */}
			{showForm && (
				<form onSubmit={handleSubmit} onKeyDown={(e) => {
					if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
						e.preventDefault();
					}
				}} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
				{/* Section 1: Family-Level Information (Read-Only) */}
				<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
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

				{/* Section 2: Beneficiary Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Beneficiary Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Beneficiary ID <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.BeneficiaryID}
								onChange={(e) => handleBeneficiaryChange(e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Beneficiary</option>
								{familyMembers.map((member) => (
									<option key={member.MemberNo} value={member.MemberNo}>
										{member.MemberNo} - {member.FullName}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
							<input
								type="text"
								value={formData.BeneficiaryName}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
							<input
								type="text"
								value={formData.BeneficiaryAge}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
							<input
								type="text"
								value={formData.BeneficiaryGender}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
					</div>
				</div>

				{/* Section 3: Education Intervention Type */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Education Intervention Type</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Education Intervention Type <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.EducationInterventionType}
								onChange={(e) => {
									const value = e.target.value;
									handleChange("EducationInterventionType", value);
									// If Regular Support is selected, clear BaselineReasonNotStudying and one-time admission costs
									if (value === "Regular Support") {
										setFormData(prev => ({
											...prev,
											EducationInterventionType: value,
											RegularSupport: true,
											BaselineReasonNotStudying: "",
											EduOneTimeAdmissionTotalCost: 0,
											EduOneTimeAdmissionFamilyContribution: 0,
											EduOneTimeAdmissionPEContribution: 0,
										}));
									} else {
										setFormData(prev => ({
											...prev,
											EducationInterventionType: value,
											RegularSupport: false,
										}));
									}
								}}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Type</option>
								<option value="Admitted">Admitted</option>
								<option value="Transferred">Transferred</option>
								<option value="Regular Support">Regular Support</option>
							</select>
						</div>
					</div>

					{/* If Admitted */}
					{formData.EducationInterventionType === "Admitted" && (
						<div className="mt-4 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Reason Not Studying</label>
								<input
									type="text"
									value={formData.BaselineReasonNotStudying}
									onChange={(e) => handleChange("BaselineReasonNotStudying", e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder="Enter reason"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Admitted To School Type
									</label>
									<select
										value={formData.AdmittedToSchoolType}
										onChange={(e) => handleChange("AdmittedToSchoolType", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select School Type</option>
										<option value="Govt">Govt</option>
										<option value="Private">Private</option>
										<option value="AKES">AKES</option>
										<option value="AK CBS">AK CBS</option>
										<option value="NGO">NGO</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Admitted To Class Level
									</label>
									<select
										value={formData.AdmittedToClassLevel}
										onChange={(e) => handleChange("AdmittedToClassLevel", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Class Level</option>
										<option value="Pre-Primary">Pre-Primary</option>
										<option value="Primary">Primary</option>
										<option value="Secondary">Secondary</option>
										<option value="Higher Secondary">Higher Secondary</option>
									</select>
								</div>
							</div>
						</div>
					)}

					{/* If Regular Support */}
					{formData.EducationInterventionType === "Regular Support" && (
						<div className="mt-4 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										School Type
									</label>
									<select
										value={formData.AdmittedToSchoolType}
										onChange={(e) => handleChange("AdmittedToSchoolType", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select School Type</option>
										<option value="Govt">Govt</option>
										<option value="Private">Private</option>
										<option value="AKES">AKES</option>
										<option value="AK CBS">AK CBS</option>
										<option value="NGO">NGO</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Class Level
									</label>
									<select
										value={formData.AdmittedToClassLevel}
										onChange={(e) => handleChange("AdmittedToClassLevel", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Class Level</option>
										<option value="Pre-Primary">Pre-Primary</option>
										<option value="Primary">Primary</option>
										<option value="Secondary">Secondary</option>
										<option value="Higher Secondary">Higher Secondary</option>
									</select>
								</div>
							</div>
						</div>
					)}

					{/* If Transferred */}
					{formData.EducationInterventionType === "Transferred" && (
						<div className="mt-4 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Baseline School Type</label>
									<select
										value={formData.BaselineSchoolType}
										onChange={(e) => handleChange("BaselineSchoolType", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select School Type</option>
										<option value="Govt">Govt</option>
										<option value="Private">Private</option>
										<option value="AKES">AKES</option>
										<option value="AK CBS">AK CBS</option>
										<option value="NGO">NGO</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Transferred To School Type</label>
									<select
										value={formData.TransferredToSchoolType}
										onChange={(e) => handleChange("TransferredToSchoolType", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select School Type</option>
										<option value="Govt">Govt</option>
										<option value="Private">Private</option>
										<option value="AKES">AKES</option>
										<option value="AK CBS">AK CBS</option>
										<option value="NGO">NGO</option>
									</select>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Transferred To Class Level</label>
								<select
									value={formData.TransferredToClassLevel}
									onChange={(e) => handleChange("TransferredToClassLevel", e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Class Level</option>
									<option value="Pre-Primary">Pre-Primary</option>
									<option value="Primary">Primary</option>
									<option value="Secondary">Secondary</option>
									<option value="Higher Secondary">Higher Secondary</option>
								</select>
							</div>
						</div>
					)}
				</div>

				{/* Section 4: Education Costs - One-time Admission */}
				{formData.EducationInterventionType !== "Regular Support" && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">4. Education Costs - One-time Admission</h2>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total Cost</label>
							<input
								type="number"
								value={formData.EduOneTimeAdmissionTotalCost || ""}
								onChange={(e) => handleChange("EduOneTimeAdmissionTotalCost", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Contribution</label>
							<input
								type="number"
								value={formData.EduOneTimeAdmissionFamilyContribution || ""}
								onChange={(e) => handleChange("EduOneTimeAdmissionFamilyContribution", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduOneTimeAdmissionPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
					</div>
				</div>
				)}

				{/* Section 5: Education Costs - Monthly Tuition */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">5. Education Costs - Monthly Tuition Fees</h2>
					<div className="grid grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Total Cost</label>
							<input
								type="number"
								value={formData.EduMonthlyTuitionTotalCost || ""}
								onChange={(e) => handleChange("EduMonthlyTuitionTotalCost", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Family Contribution</label>
							<input
								type="number"
								value={formData.EduMonthlyTuitionFamilyContribution || ""}
								onChange={(e) => handleChange("EduMonthlyTuitionFamilyContribution", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduMonthlyTuitionPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Months</label>
							<input
								type="number"
								value={formData.EduTuitionNumberOfMonths || ""}
								onChange={(e) => handleChange("EduTuitionNumberOfMonths", parseInt(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
							/>
						</div>
					</div>
				</div>

				{/* Section 6: Education Costs - Monthly Hostel */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">6. Education Costs - Monthly Hostel Fees</h2>
					<div className="grid grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Total Cost</label>
							<input
								type="number"
								value={formData.EduMonthlyHostelTotalCost || ""}
								onChange={(e) => handleChange("EduMonthlyHostelTotalCost", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Family Contribution</label>
							<input
								type="number"
								value={formData.EduMonthlyHostelFamilyContribution || ""}
								onChange={(e) => handleChange("EduMonthlyHostelFamilyContribution", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduMonthlyHostelPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Months</label>
							<input
								type="number"
								value={formData.EduHostelNumberOfMonths || ""}
								onChange={(e) => handleChange("EduHostelNumberOfMonths", parseInt(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
							/>
						</div>
					</div>
				</div>

				{/* Section 7: Education Costs - Monthly Transportation */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">7. Education Costs - Monthly Transportation</h2>
					<div className="grid grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Total Cost</label>
							<input
								type="number"
								value={formData.EduMonthlyTransportTotalCost || ""}
								onChange={(e) => handleChange("EduMonthlyTransportTotalCost", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Family Contribution</label>
							<input
								type="number"
								value={formData.EduMonthlyTransportFamilyContribution || ""}
								onChange={(e) => handleChange("EduMonthlyTransportFamilyContribution", parseFloat(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Monthly PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduMonthlyTransportPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Months</label>
							<input
								type="number"
								value={formData.EduTransportNumberOfMonths || ""}
								onChange={(e) => handleChange("EduTransportNumberOfMonths", parseInt(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
							/>
						</div>
					</div>
				</div>

				{/* Section 8: Totals Summary */}
				<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">8. Totals Summary</h2>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total Support Cost</label>
							<input
								type="text"
								value={formatCurrency(formData.EduTotalSupportCost)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total Family Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduTotalFamilyContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.EduTotalPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
					</div>
				</div>

				{/* Section 9: Approval Status and Remarks */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">9. Approval Status and Remarks</h2>
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

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
				<button
					type="button"
					onClick={() => {
						if (educationSupportRecords.length > 0) {
							setShowForm(false);
							setSelectedRecordId(null);
						} else {
							router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`);
						}
					}}
					className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
				>
					{educationSupportRecords.length > 0 ? "Back to List" : "Cancel"}
				</button>
					<button
						type="submit"
						disabled={saving}
						className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{saving ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>Saving...</span>
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								<span>Save Education Support</span>
							</>
						)}
					</button>
				</div>
				</form>
			)}
		</div>
	);
}

export default function EducationSupportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<EducationSupportContent />
		</Suspense>
	);
}
