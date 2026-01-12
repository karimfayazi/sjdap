"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type FDPEconomicFormData = {
	// Family-Level Information (read-only)
	FamilyID: string;
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	BaselineIncomePerCapitaAsPercentOfSelfSufficiency: number;
	BaselinePovertyLevel: string;
	
	// Intervention Information
	BeneficiaryID: string;
	BeneficiaryName: string;
	BeneficiaryAge: number;
	BeneficiaryGender: string;
	BeneficiaryCurrentOccupation: string;
	InterventionType: string;
	FieldOfInvestment: string;
	SubFieldOfInvestment: string;
	Trade: string;
	SkillsDevelopmentCourse: string;
	Institution: string;
	
	// Financial Information
	InvestmentRequiredTotal: number;
	ContributionFromBeneficiary: number;
	InvestmentFromPEProgram: number;
	GrantAmount: number;
	LoanAmount: number;
	InvestmentValidationStatus: number; // 1 = Valid, 0 = Invalid
	PlannedMonthlyIncome: number;
	CurrentMonthlyIncome: number;
	IncrementalMonthlyIncome: number;
	FeasibilityID: string;
	
	// Approval
	ApprovalStatus: string;
	ApprovalRemarks: string;
};

type FamilyMember = {
	MemberNo: string;
	FullName: string;
	Gender: string;
	DOBMonth: string | null;
	DOBYear: string | null;
	Occupation: string | null;
	MonthlyIncome: number | null;
};

type BaselineData = {
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	SelfSufficiencyIncomePerCapita: number;
	Area_Type: string;
};

type FeasibilityData = {
	FDP_ID: number;
	FamilyID?: string;
	MemberID?: string;
	MemberName?: string;
	PlanCategory: string;
	TotalInvestmentRequired: number;
	CostPerParticipant: number;
	InvestmentFromPEProgram: number;
	TotalSalesRevenue: number;
	CurrentBaselineIncome: number;
	FeasibilityType: string;
	ApprovalStatus: string;
	InvestmentRationale?: string;
	MarketBusinessAnalysis?: string;
	TotalDirectCosts?: number;
	TotalIndirectCosts?: number;
	NetProfitLoss?: number;
	PrimaryIndustry?: string;
	SubField?: string;
	Trade?: string;
	CourseTitle?: string;
	TrainingInstitution?: string;
};

function FDPEconomicContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpEconomicId = searchParams.get("fdpEconomicId"); // For edit mode

	const isEditMode = !!fdpEconomicId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<FDPEconomicFormData>({
		FamilyID: formNumber || "",
		BaselineFamilyIncome: 0,
		FamilyMembersCount: 0,
		FamilyPerCapitaIncome: 0,
		SelfSufficiencyIncomePerCapita: 0,
		BaselineIncomePerCapitaAsPercentOfSelfSufficiency: 0,
		BaselinePovertyLevel: "",
		BeneficiaryID: memberNo || "",
		BeneficiaryName: memberName || "",
		BeneficiaryAge: 0,
		BeneficiaryGender: "",
		BeneficiaryCurrentOccupation: "",
		InterventionType: "",
		FieldOfInvestment: "",
		SubFieldOfInvestment: "",
		Trade: "",
		SkillsDevelopmentCourse: "",
		Institution: "",
		InvestmentRequiredTotal: 0,
		ContributionFromBeneficiary: 0,
		InvestmentFromPEProgram: 0,
		GrantAmount: 0,
		LoanAmount: 0,
		InvestmentValidationStatus: 0, // 0 = Invalid, 1 = Valid
		PlannedMonthlyIncome: 0,
		CurrentMonthlyIncome: 0,
		IncrementalMonthlyIncome: 0,
		FeasibilityID: "",
		ApprovalStatus: "Pending",
		ApprovalRemarks: "",
	});

	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
	const [feasibilityStudies, setFeasibilityStudies] = useState<FeasibilityData[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [fdpEconomicRecords, setFdpEconomicRecords] = useState<any[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
	const [totalMemberPEInvestment, setTotalMemberPEInvestment] = useState<number>(0);
	const [memberFeasibilityLimit, setMemberFeasibilityLimit] = useState<number | null>(null);
	const [selectedFeasibilityId, setSelectedFeasibilityId] = useState<string>("");
	const [approvedFeasibilityStudies, setApprovedFeasibilityStudies] = useState<FeasibilityData[]>([]);
	const [maxEconomicSupportAmount, setMaxEconomicSupportAmount] = useState<number>(500000); // Fixed at PKR 500,000
	const [alreadyDefinedEconomicSupport, setAlreadyDefinedEconomicSupport] = useState<number>(0);
	const [availableEconomicSupport, setAvailableEconomicSupport] = useState<number>(0);

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
				0: "Level -3",
				10800: "Level -2",
				13500: "Level -1",
				16200: "Level 0",
				20250: "Level +1",
				24300: "Level +2",
				27000: "Level +3",
			},
			"Urban": {
				0: "Level -3",
				19200: "Level -2",
				24000: "Level -1",
				28800: "Level 0",
				36000: "Level +1",
				43200: "Level +2",
				48000: "Level +3",
			},
			"Peri-Urban": {
				0: "Level -3",
				16100: "Level -2",
				20125: "Level -1",
				24150: "Level 0",
				30187: "Level +1",
				36225: "Level +2",
				40250: "Level +3",
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

		return "Level -3";
	};

	// Fetch baseline data, family members, and feasibility studies
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
					setBaselineData(data);
					
					// Use the calculated values from the API (which now matches baseline-qol/view calculation)
					const perCapitaIncome = data.FamilyPerCapitaIncome || 0;
					const selfSufficiencyPercent = data.BaselineIncomePerCapitaAsPercentOfSelfSufficiency || 0;
					
					// Calculate poverty level
					const povertyLevel = calculatePovertyLevel(perCapitaIncome, data.Area_Type || "Rural");
					
					setFormData(prev => ({
						...prev,
						BaselineFamilyIncome: data.BaselineFamilyIncome, // Total Family Baseline Income
						FamilyMembersCount: data.FamilyMembersCount,
						FamilyPerCapitaIncome: perCapitaIncome,
						SelfSufficiencyIncomePerCapita: data.SelfSufficiencyIncomePerCapita,
						BaselineIncomePerCapitaAsPercentOfSelfSufficiency: selfSufficiencyPercent,
						BaselinePovertyLevel: povertyLevel,
					}));
				}

				// Fetch family members
				const membersResponse = await fetch(`/api/family-development-plan/members?formNumber=${encodeURIComponent(formNumber)}`);
				const membersData = await membersResponse.json();
				
				if (membersData.success && membersData.data) {
					setFamilyMembers(membersData.data);
					
					// Auto-select the member if memberNo is provided
					if (memberNo) {
						const selectedMember = membersData.data.find((m: FamilyMember) => m.MemberNo === memberNo);
						if (selectedMember) {
							const age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
							setFormData(prev => ({
								...prev,
								BeneficiaryID: selectedMember.MemberNo,
								BeneficiaryName: selectedMember.FullName,
								BeneficiaryAge: age,
								BeneficiaryGender: selectedMember.Gender || "",
								BeneficiaryCurrentOccupation: selectedMember.Occupation || "",
								CurrentMonthlyIncome: selectedMember.MonthlyIncome || 0,
							}));
						}
					}
				}

				// Fetch feasibility studies for this family/member
				if (memberNo) {
					const feasibilityResponse = await fetch(`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(formNumber)}&memberID=${encodeURIComponent(memberNo)}`);
					const feasibilityData = await feasibilityResponse.json();
					
					if (feasibilityData.success && feasibilityData.data) {
						const studies = Array.isArray(feasibilityData.data) ? feasibilityData.data : [feasibilityData.data];
						// Include both ECONOMIC and SKILLS feasibility studies
						const allStudies = studies.filter((s: any) => s && (s.PlanCategory === "ECONOMIC" || s.PlanCategory === "SKILLS"));
						setFeasibilityStudies(allStudies);
						
						// Filter only approved feasibility studies for the dropdown
						const approvedStudies = allStudies.filter((s: any) => s && s.ApprovalStatus === "Approved");
						setApprovedFeasibilityStudies(approvedStudies);
						
						// Calculate total Investment from PE Program from all ECONOMIC feasibility studies for this member
						const economicStudies = studies.filter((s: any) => s && s.PlanCategory === "ECONOMIC");
						const totalFeasibilityInvestment = economicStudies.reduce((sum: number, study: any) => {
							const investment = parseFloat(study.InvestmentFromPEProgram) || 0;
							return sum + investment;
						}, 0);
						setMemberFeasibilityLimit(totalFeasibilityInvestment > 0 ? totalFeasibilityInvestment : null);
					}
				}

				// Load all existing FDP Economic records for this family/member
				if (formNumber) {
					const fdpResponse = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}${memberNo ? `&beneficiaryID=${encodeURIComponent(memberNo)}` : ""}`);
					const fdpData = await fdpResponse.json();
					
					if (fdpData.success && fdpData.data) {
						const records = Array.isArray(fdpData.data) ? fdpData.data : [fdpData.data];
						setFdpEconomicRecords(records);
						
						// Calculate total PE Investment for this member (excluding current record if editing)
						if (memberNo) {
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(totalPEInvestment);
						}
						
						// If in edit mode with fdpEconomicId, load that specific record
						if (isEditMode && fdpEconomicId) {
							const existing = records.find((r: any) => r.FDP_EconomicID?.toString() === fdpEconomicId) || records[0];
							if (existing) {
								setSelectedRecordId(existing.FDP_EconomicID);
								setFormData(prev => ({
									...prev,
									BeneficiaryID: existing.BeneficiaryID || prev.BeneficiaryID,
									BeneficiaryName: existing.BeneficiaryName || prev.BeneficiaryName,
									BeneficiaryAge: existing.BeneficiaryAge || prev.BeneficiaryAge,
									BeneficiaryGender: existing.BeneficiaryGender || prev.BeneficiaryGender,
									BeneficiaryCurrentOccupation: existing.BeneficiaryCurrentOccupation || prev.BeneficiaryCurrentOccupation,
									InterventionType: existing.InterventionType || "",
									FieldOfInvestment: existing.FieldOfInvestment || "",
									SubFieldOfInvestment: existing.SubFieldOfInvestment || "",
									Trade: existing.Trade || "",
									SkillsDevelopmentCourse: existing.SkillsDevelopmentCourse || "",
									Institution: existing.Institution || "",
									InvestmentRequiredTotal: existing.InvestmentRequiredTotal || 0,
									ContributionFromBeneficiary: existing.ContributionFromBeneficiary || 0,
									InvestmentFromPEProgram: existing.InvestmentFromPEProgram || 0,
									GrantAmount: existing.GrantAmount || 0,
									LoanAmount: existing.LoanAmount || 0,
									InvestmentValidationStatus: existing.InvestmentValidationStatus !== undefined ? existing.InvestmentValidationStatus : 0,
									PlannedMonthlyIncome: existing.PlannedMonthlyIncome || 0,
									CurrentMonthlyIncome: existing.CurrentMonthlyIncome || 0,
									IncrementalMonthlyIncome: existing.IncrementalMonthlyIncome || 0,
									FeasibilityID: existing.FeasibilityID?.toString() || "",
									ApprovalStatus: "Pending", // Always set to Pending as it's read-only
									ApprovalRemarks: existing.ApprovalRemarks || "",
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
	}, [formNumber, memberNo, isEditMode, fdpEconomicId]);

	// Calculate total economic support already defined for the family
	const totalDefinedEconomicSupport = useMemo(() => {
		if (!formNumber) return 0;

		// Sum all InvestmentFromPEProgram from all economic records for this family
		// Exclude current record if editing
		return fdpEconomicRecords.reduce((sum: number, record: any) => {
			if (isEditMode && selectedRecordId !== null && record.FDP_EconomicID === selectedRecordId) {
				return sum;
			}
			const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
			return sum + investment;
		}, 0);
	}, [formNumber, fdpEconomicRecords, isEditMode, selectedRecordId]);

	useEffect(() => {
		if (!formNumber) return;

		const alreadyDefined = totalDefinedEconomicSupport;
		// Available = Max - Already Defined (not including current form's value)
		const available = Math.max(0, maxEconomicSupportAmount - alreadyDefined);

		setAlreadyDefinedEconomicSupport(alreadyDefined);
		setAvailableEconomicSupport(available);
	}, [formNumber, totalDefinedEconomicSupport, maxEconomicSupportAmount]);

	// Set selected feasibility when approved studies are loaded and we have a FeasibilityID
	useEffect(() => {
		if (formData.FeasibilityID && approvedFeasibilityStudies.length > 0) {
			const feasibilityIdStr = formData.FeasibilityID.toString();
			const isApproved = approvedFeasibilityStudies.some(f => f.FDP_ID.toString() === feasibilityIdStr);
			if (isApproved && selectedFeasibilityId !== feasibilityIdStr) {
				setSelectedFeasibilityId(feasibilityIdStr);
				// Also update InterventionType if not already set
				const selectedFeasibility = approvedFeasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityIdStr);
				if (selectedFeasibility && !formData.InterventionType) {
					// Use FeasibilityType directly for Economic plans
					let interventionType = selectedFeasibility.FeasibilityType || "";
					// For Skills, use Employment
					if (selectedFeasibility.PlanCategory === "SKILLS") {
						interventionType = "Employment";
					}
					if (interventionType) {
						setFormData(prev => ({ ...prev, InterventionType: interventionType }));
					}
				}
			}
		}
	}, [approvedFeasibilityStudies, formData.FeasibilityID]);

	// Auto-calculate fields
	useEffect(() => {
		// Calculate Investment From PE Program
		const peInvestment = formData.InvestmentRequiredTotal - formData.ContributionFromBeneficiary;
		setFormData(prev => ({ ...prev, InvestmentFromPEProgram: Math.max(0, peInvestment) }));
		
		// Validate Grants + Loan = Investment Required from PE Program
		const grantLoanTotal = formData.GrantAmount + formData.LoanAmount;
		const peInvestmentRequired = Math.max(0, peInvestment);
		
		// Check if Grants exceeds Investment Required from PE Program
		if (formData.GrantAmount > peInvestmentRequired) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Grants (${formData.GrantAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestmentRequired.toLocaleString()})`
			}));
		}
		// Check if Loan exceeds Investment Required from PE Program
		else if (formData.LoanAmount > peInvestmentRequired) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Loan (${formData.LoanAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestmentRequired.toLocaleString()})`
			}));
		}
		// Check if Grants + Loan equals Investment Required from PE Program
		else if (Math.abs(grantLoanTotal - peInvestmentRequired) > 0.01) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Grants (${formData.GrantAmount.toLocaleString()}) + Loan (${formData.LoanAmount.toLocaleString()}) = ${grantLoanTotal.toLocaleString()} must equal Investment Required from PE Program (${peInvestmentRequired.toLocaleString()})`
			}));
		} else {
			setValidationErrors(prev => {
				const { grantLoanValidation, ...rest } = prev;
				return rest;
			});
		}
		
		// Validate against feasibility study InvestmentFromPEProgram
		if (formData.FeasibilityID) {
			const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
			if (selectedFeasibility && selectedFeasibility.InvestmentFromPEProgram !== null && selectedFeasibility.InvestmentFromPEProgram !== undefined) {
				const calculatedPEInvestment = Math.max(0, peInvestment);
				if (calculatedPEInvestment > selectedFeasibility.InvestmentFromPEProgram) {
					setValidationErrors(prev => ({
						...prev,
						feasibilityInvestment: `Investment Required from PE Program (${calculatedPEInvestment.toLocaleString()}) cannot exceed Investment from PE Program in Feasibility Study (${selectedFeasibility.InvestmentFromPEProgram.toLocaleString()})`
					}));
				} else {
					setValidationErrors(prev => {
						const { feasibilityInvestment, ...rest } = prev;
						return rest;
					});
				}
			}
		}
		
		// Validate total member-level PE Investment doesn't exceed feasibility limit
		if (memberFeasibilityLimit !== null && memberFeasibilityLimit !== undefined) {
			const calculatedPEInvestment = Math.max(0, peInvestment);
			// If editing, subtract the current record's investment from total
			const currentRecordInvestment = isEditMode && selectedRecordId
				? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0)
				: 0;
			const adjustedTotal = totalMemberPEInvestment - currentRecordInvestment + calculatedPEInvestment;
			
			if (adjustedTotal > memberFeasibilityLimit) {
				setValidationErrors(prev => ({
					...prev,
					memberLevelInvestment: `Total PE Investment for this member (${adjustedTotal.toLocaleString()}) cannot exceed the total Investment from PE Program defined in Feasibility Studies (${memberFeasibilityLimit.toLocaleString()}). Current total: ${(totalMemberPEInvestment - currentRecordInvestment).toLocaleString()}, Adding: ${calculatedPEInvestment.toLocaleString()}`
				}));
			} else {
				setValidationErrors(prev => {
					const { memberLevelInvestment, ...rest } = prev;
					return rest;
				});
			}
		}
	}, [formData.InvestmentRequiredTotal, formData.ContributionFromBeneficiary, formData.FeasibilityID, feasibilityStudies, memberFeasibilityLimit, totalMemberPEInvestment, isEditMode, selectedRecordId, fdpEconomicRecords]);

	useEffect(() => {
		// Calculate Incremental Monthly Income
		const incremental = formData.PlannedMonthlyIncome - formData.CurrentMonthlyIncome;
		setFormData(prev => ({ ...prev, IncrementalMonthlyIncome: Math.max(0, incremental) }));
	}, [formData.PlannedMonthlyIncome, formData.CurrentMonthlyIncome]);

	// Business Rule: If loan < 50,000, convert to grant (applied on blur, not while typing)
	const handleLoanBlur = () => {
		if (formData.LoanAmount > 0 && formData.LoanAmount < 50000) {
			setFormData(prev => ({
				...prev,
				GrantAmount: prev.GrantAmount + prev.LoanAmount,
				LoanAmount: 0,
			}));
		}
	};

	// Validate investment: Grant + Loan = PE Investment
	const validateInvestment = (): boolean => {
		const total = formData.GrantAmount + formData.LoanAmount;
		const peInvestment = formData.InvestmentFromPEProgram;
		
		if (Math.abs(total - peInvestment) > 0.01) { // Allow small floating point differences
			setValidationErrors(prev => ({
				...prev,
				investment: `Grant (${formData.GrantAmount.toLocaleString()}) + Loan (${formData.LoanAmount.toLocaleString()}) = ${total.toLocaleString()} must equal PE Program Investment (${peInvestment.toLocaleString()})`
			}));
			return false;
		}
		
		setValidationErrors(prev => {
			const { investment, ...rest } = prev;
			return rest;
		});
		return true;
	};

	const handleChange = (field: keyof FDPEconomicFormData, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		
		// Clear validation errors when user makes changes
		if (validationErrors[field as string]) {
			setValidationErrors(prev => {
				const { [field as string]: _, ...rest } = prev;
				return rest;
			});
		}
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
				BeneficiaryGender: selectedMember.Gender || "",
				BeneficiaryCurrentOccupation: selectedMember.Occupation || "",
				CurrentMonthlyIncome: selectedMember.MonthlyIncome || 0,
			}));
			
			// Fetch feasibility studies for the new member
			if (formNumber) {
				fetch(`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(formNumber)}&memberID=${encodeURIComponent(memberNo)}`)
					.then(res => res.json())
					.then(data => {
						if (data.success && data.data) {
							const studies = Array.isArray(data.data) ? data.data : [data.data];
							// Include both ECONOMIC and SKILLS feasibility studies
							const allStudies = studies.filter((s: any) => s && (s.PlanCategory === "ECONOMIC" || s.PlanCategory === "SKILLS"));
							setFeasibilityStudies(allStudies);
							
							// Calculate total Investment from PE Program from all ECONOMIC feasibility studies for this member
							const economicStudies = studies.filter((s: any) => s && s.PlanCategory === "ECONOMIC");
							const totalFeasibilityInvestment = economicStudies.reduce((sum: number, study: any) => {
								const investment = parseFloat(study.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setMemberFeasibilityLimit(totalFeasibilityInvestment > 0 ? totalFeasibilityInvestment : null);
						}
					});
				
				// Fetch and recalculate total member PE Investment
				fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}&beneficiaryID=${encodeURIComponent(memberNo)}`)
					.then(res => res.json())
					.then(data => {
						if (data.success && data.data) {
							const records = Array.isArray(data.data) ? data.data : [data.data];
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(totalPEInvestment);
						}
					});
			}
		}
	};

	const handleFeasibilityChange = (feasibilityId: string) => {
		const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityId);
		if (selectedFeasibility) {
			// For SKILLS, use CostPerParticipant as Investment Required; for ECONOMIC, use InvestmentFromPEProgram
			const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
				? (selectedFeasibility.CostPerParticipant || 0)
				: (selectedFeasibility.InvestmentFromPEProgram || 0);
			
			setFormData(prev => ({
				...prev,
				FeasibilityID: feasibilityId,
				InvestmentRequiredTotal: investmentRequired,
				PlannedMonthlyIncome: selectedFeasibility.TotalSalesRevenue || 0,
				CurrentMonthlyIncome: selectedFeasibility.CurrentBaselineIncome || prev.CurrentMonthlyIncome,
			}));
			// Clear validation error when feasibility changes
			if (validationErrors.feasibilityInvestment) {
				setValidationErrors(prev => {
					const { feasibilityInvestment, ...rest } = prev;
					return rest;
				});
			}
		}
	};

	// Handler for Link Approved Feasibility dropdown
	const handleApprovedFeasibilityChange = (feasibilityId: string) => {
		setSelectedFeasibilityId(feasibilityId);
		const selectedFeasibility = approvedFeasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityId);
		if (selectedFeasibility) {
			// Map FeasibilityType to InterventionType - use FeasibilityType directly (Business, Agriculture, Livestock)
			let interventionType = selectedFeasibility.FeasibilityType || "";
			// For Skills, use Employment
			if (selectedFeasibility.PlanCategory === "SKILLS") {
				interventionType = "Employment";
			}
			
			// For SKILLS, use CostPerParticipant as Investment Required; for ECONOMIC, use InvestmentFromPEProgram
			const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
				? (selectedFeasibility.CostPerParticipant || 0)
				: (selectedFeasibility.InvestmentFromPEProgram || 0);
			
			setFormData(prev => ({
				...prev,
				FeasibilityID: feasibilityId,
				InterventionType: interventionType,
				InvestmentRequiredTotal: investmentRequired,
				PlannedMonthlyIncome: selectedFeasibility.TotalSalesRevenue || 0,
				CurrentMonthlyIncome: selectedFeasibility.CurrentBaselineIncome || prev.CurrentMonthlyIncome,
			}));
		} else if (!feasibilityId) {
			// Clear selection
			setFormData(prev => ({
				...prev,
				InterventionType: "",
				FeasibilityID: "",
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);
		setValidationErrors({});

		// Validation
		if (!formData.BeneficiaryID || !formData.InterventionType) {
			setError("Please fill in all required fields");
			return;
		}

		// Business Rule: If loan < 50,000, convert to grant (apply before validation)
		let finalLoanAmount = formData.LoanAmount;
		let finalGrantAmount = formData.GrantAmount;
		if (formData.LoanAmount > 0 && formData.LoanAmount < 50000) {
			finalGrantAmount = formData.GrantAmount + formData.LoanAmount;
			finalLoanAmount = 0;
		}

		// Validate Grants and Loan don't exceed Investment Required from PE Program
		const peInvestment = formData.InvestmentFromPEProgram;
		if (finalGrantAmount > peInvestment) {
			setError(`Grants (${finalGrantAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}
		if (finalLoanAmount > peInvestment) {
			setError(`Loan (${finalLoanAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}
		
		// Validate investment with converted values
		const total = finalGrantAmount + finalLoanAmount;
		if (Math.abs(total - peInvestment) > 0.01) {
			setError(`Grant (${finalGrantAmount.toLocaleString()}) + Loan (${finalLoanAmount.toLocaleString()}) = ${total.toLocaleString()} must equal Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}

		// Business Rule: If intervention ≤ 75,000, must be 100% grant
		if (formData.InvestmentRequiredTotal <= 75000 && finalLoanAmount > 0) {
			setError("Interventions ≤ PKR 75,000 must be 100% Grant. Please set Loan Amount to 0.");
			return;
		}

		// Validate Investment Required from PE Program against Feasibility Study
		if (formData.FeasibilityID) {
			const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
			if (selectedFeasibility && selectedFeasibility.InvestmentFromPEProgram !== null && selectedFeasibility.InvestmentFromPEProgram !== undefined) {
				if (peInvestment > selectedFeasibility.InvestmentFromPEProgram) {
					setError(`Investment Required from PE Program (${peInvestment.toLocaleString()}) cannot exceed Investment from PE Program in Feasibility Study (${selectedFeasibility.InvestmentFromPEProgram.toLocaleString()})`);
					return;
				}
			}
		}

		// Validate total member-level PE Investment doesn't exceed feasibility limit
		if (memberFeasibilityLimit !== null && memberFeasibilityLimit !== undefined) {
			const currentRecordInvestment = isEditMode && selectedRecordId
				? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0)
				: 0;
			const adjustedTotal = totalMemberPEInvestment - currentRecordInvestment + peInvestment;
			
			if (adjustedTotal > memberFeasibilityLimit) {
				setError(`Total PE Investment for this member (${adjustedTotal.toLocaleString()}) cannot exceed the total Investment from PE Program defined in Feasibility Studies (${memberFeasibilityLimit.toLocaleString()}). Current total: ${(totalMemberPEInvestment - currentRecordInvestment).toLocaleString()}, Adding: ${peInvestment.toLocaleString()}`);
				return;
			}
		}

		setSaving(true);

		try {
			const url = isEditMode 
				? `/api/family-development-plan/fdp-economic?fdpEconomicId=${encodeURIComponent(fdpEconomicId!)}`
				: "/api/family-development-plan/fdp-economic";
			
			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					GrantAmount: finalGrantAmount,
					LoanAmount: finalLoanAmount,
					InvestmentValidationStatus: 1, // 1 = Valid, 0 = Invalid
					CreatedBy: userProfile?.username || userProfile?.email || "System",
					UpdatedBy: userProfile?.username || userProfile?.email || "System",
				}),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				// Reload FDP Economic records
				if (formNumber) {
					const fdpResponse = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}${memberNo ? `&beneficiaryID=${encodeURIComponent(memberNo)}` : ""}`);
					const fdpData = await fdpResponse.json();
					if (fdpData.success && fdpData.data) {
						const records = Array.isArray(fdpData.data) ? fdpData.data : [fdpData.data];
						setFdpEconomicRecords(records);
						
						// Recalculate total member PE Investment
						if (memberNo) {
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(totalPEInvestment);
						}
					}
				}
				// Reset form (preserve baseline data and beneficiary info)
				setFormData(prev => ({
					...prev,
					InterventionType: "",
					FieldOfInvestment: "",
					SubFieldOfInvestment: "",
					Trade: "",
					SkillsDevelopmentCourse: "",
					Institution: "",
					InvestmentRequiredTotal: 0,
					ContributionFromBeneficiary: 0,
					InvestmentFromPEProgram: 0,
					GrantAmount: 0,
					LoanAmount: 0,
					InvestmentValidationStatus: 0,
					PlannedMonthlyIncome: 0,
					FeasibilityID: "",
					ApprovalStatus: "Pending",
					ApprovalRemarks: "",
				}));
				setSelectedRecordId(null);
				setShowForm(false);
				setTimeout(() => {
					setSuccess(false);
				}, 3000);
			} else {
				setError(result.message || "Failed to save FDP Economic data");
			}
		} catch (err: any) {
			console.error("Error saving FDP Economic data:", err);
			setError(err.message || "Failed to save FDP Economic data");
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
				<span className="ml-3 text-gray-600">Loading FDP Economic data...</span>
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
					<h1 className="text-3xl font-bold text-gray-900">Economic Plan</h1>
					<p className="text-gray-600 mt-2">
						{formNumber && memberNo && (
							<span>
								Form Number: {formNumber} | Member: {memberNo} {memberName && `- ${memberName}`}
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
					FDP Economic data saved successfully!
				</div>
			)}

			{/* Gridview or Form Toggle */}
			{fdpEconomicRecords.length > 0 && !showForm && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-900">Existing FDP Economic Development Records</h2>
						<button
							type="button"
							onClick={() => {
								setShowForm(true);
								setSelectedRecordId(null);
								setFormData(prev => ({
									...prev,
									InterventionType: "",
									FieldOfInvestment: "",
									SubFieldOfInvestment: "",
									Trade: "",
									SkillsDevelopmentCourse: "",
									Institution: "",
									InvestmentRequiredTotal: 0,
									ContributionFromBeneficiary: 0,
									InvestmentFromPEProgram: 0,
									GrantAmount: 0,
									LoanAmount: 0,
									InvestmentValidationStatus: 0,
									PlannedMonthlyIncome: 0,
									FeasibilityID: "",
									ApprovalStatus: "Pending",
									ApprovalRemarks: "",
								}));
							}}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Add New FDP Economic Development
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field of Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Required</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{fdpEconomicRecords.map((record) => (
									<tr key={record.FDP_EconomicID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_EconomicID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.BeneficiaryName || record.BeneficiaryID || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.InterventionType || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FieldOfInvestment || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.InvestmentRequiredTotal ? `PKR ${parseFloat(record.InvestmentRequiredTotal).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.InvestmentFromPEProgram ? `PKR ${parseFloat(record.InvestmentFromPEProgram).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												record.InvestmentValidationStatus === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
											}`}>
												{record.InvestmentValidationStatus === 1 ? "Valid" : "Invalid"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												record.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												record.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{record.ApprovalStatus || "Pending"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<button
												type="button"
												onClick={() => {
													setSelectedRecordId(record.FDP_EconomicID);
													router.push(`/dashboard/family-development-plan/fdp-economic?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpEconomicId=${record.FDP_EconomicID}`);
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
				<form 
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit(e);
					}}
					onKeyDown={(e) => {
						// Prevent form submission on Enter key press in input fields
						if (e.key === 'Enter') {
							const target = e.target as HTMLElement;
							if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
								e.preventDefault();
							}
						}
					}}
					className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8"
				>
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
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Income of the Family</label>
							<input
								type="text"
								value={formatCurrency(formData.BaselineFamilyIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Members in the Family</label>
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
							<label className="block text-sm font-medium text-gray-700 mb-2">Self-Sufficiency Income Required (Per Capita)</label>
							<input
								type="text"
								value={formatCurrency(formData.SelfSufficiencyIncomePerCapita)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Income Per Capita as % of Self-Sufficiency</label>
							<input
								type="text"
								value={formatPercent(formData.BaselineIncomePerCapitaAsPercentOfSelfSufficiency)}
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
							<label className="block text-sm font-medium text-gray-700 mb-2">Max Economic Support Amount</label>
							<input
								type="text"
								value={maxEconomicSupportAmount && maxEconomicSupportAmount > 0 
									? `PKR ${maxEconomicSupportAmount.toLocaleString()}` 
									: "-"}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Already Defined Economic Support</label>
							<input
								type="text"
								value={`PKR ${alreadyDefinedEconomicSupport.toLocaleString()}`}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Available Economic Support</label>
							<input
								type="text"
								value={`PKR ${availableEconomicSupport.toLocaleString()}`}
								readOnly
								className={`w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold ${availableEconomicSupport < 0 ? 'text-red-600' : availableEconomicSupport === 0 ? 'text-orange-600' : 'text-green-600'}`}
							/>
						</div>
					</div>
				</div>

				{/* Section 2: Intervention Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Intervention Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Beneficiary ID (Family Member) <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.BeneficiaryID}
								onChange={(e) => handleBeneficiaryChange(e.target.value)}
								required
								disabled={!!memberNo}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">Select Member</option>
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
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Current Occupation</label>
							<input
								type="text"
								value={formData.BeneficiaryCurrentOccupation}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Link Approved Feasibility
							</label>
							<select
								value={selectedFeasibilityId}
								onChange={(e) => handleApprovedFeasibilityChange(e.target.value)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Approved Feasibility</option>
								{approvedFeasibilityStudies.map((study) => {
									const investmentRequired = study.PlanCategory === "SKILLS" 
										? (study.CostPerParticipant || 0)
										: (study.TotalInvestmentRequired || 0);
									const investmentFromPE = study.InvestmentFromPEProgram || 0;
									
									// Display feasibility type or course title for skills
									const feasibilityTypeDisplay = study.PlanCategory === "SKILLS" 
										? (study.CourseTitle || study.PrimaryIndustry || "Skills Development")
										: (study.FeasibilityType || "Economic");
									
									const planCategoryDisplay = study.PlanCategory === "SKILLS" ? "Skills" : "Economic";
									
									return (
										<option key={study.FDP_ID} value={study.FDP_ID.toString()}>
											ID: {study.FDP_ID} - {feasibilityTypeDisplay} ({planCategoryDisplay}) | Investment Required (from Feasibility): PKR {investmentRequired.toLocaleString()} | Investment Required from PE Program: PKR {investmentFromPE.toLocaleString()}
										</option>
									);
								})}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Type of Intervention <span className="text-red-500">*</span>
							</label>
							{selectedFeasibilityId ? (
								<input
									type="text"
									value={formData.InterventionType}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							) : (
								<select
									value={formData.InterventionType}
									onChange={(e) => handleChange("InterventionType", e.target.value)}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
								<option value="">Select Type</option>
								<option value="Employment">Employment</option>
								<option value="Business">Business</option>
								<option value="Micro Enterprise">Micro Enterprise</option>
								<option value="Agriculture">Agriculture</option>
								<option value="Livestock">Livestock</option>
								</select>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Field of Investment</label>
							<select
								value={formData.FieldOfInvestment}
								onChange={(e) => handleChange("FieldOfInvestment", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Field</option>
								<option value="Construction">Construction</option>
								<option value="Retail">Retail</option>
								<option value="Hospitality">Hospitality</option>
								<option value="Transport">Transport</option>
								<option value="Manufacturing">Manufacturing</option>
								<option value="Agriculture">Agriculture</option>
								<option value="ICT">ICT</option>
								<option value="Health">Health</option>
								<option value="Education">Education</option>
								<option value="Other">Other</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Sub-Field of Investment</label>
							<input
								type="text"
								value={formData.SubFieldOfInvestment}
								onChange={(e) => handleChange("SubFieldOfInvestment", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter sub-field"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Trade</label>
							<input
								type="text"
								value={formData.Trade}
								onChange={(e) => handleChange("Trade", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter trade"
							/>
						</div>
						{formData.InterventionType === "Employment" && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Skills Development Course</label>
									<input
										type="text"
										value={formData.SkillsDevelopmentCourse}
										onChange={(e) => handleChange("SkillsDevelopmentCourse", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										placeholder="Enter course name"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
									<input
										type="text"
										value={formData.Institution}
										onChange={(e) => handleChange("Institution", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										placeholder="Enter institution name"
									/>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Section 3: Financial Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Financial Information</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Investment Required (from Feasibility)</label>
								<input
									type="text"
									value={formatCurrency(formData.InvestmentRequiredTotal)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
								{formData.FeasibilityID && (() => {
									const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
									if (!selectedFeasibility) return null;
									
									const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
										? (selectedFeasibility.CostPerParticipant || 0)
										: (selectedFeasibility.TotalInvestmentRequired || 0);
									
									return (
										<p className="mt-1 text-xs text-gray-500">
											From Feasibility ({selectedFeasibility.PlanCategory === "SKILLS" ? "Skills Development" : "Economic"}): Investment Required (PKR) = {formatCurrency(investmentRequired)}, Investment from PE Program = {formatCurrency(selectedFeasibility.InvestmentFromPEProgram || 0)}
										</p>
									);
								})()}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Contribution from Family / Beneficiary</label>
								<input
									type="text"
									value={formatCurrency(formData.ContributionFromBeneficiary)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Investment Required from PE Program</label>
								<input
									type="text"
									value={formatCurrency(formData.InvestmentFromPEProgram)}
									readOnly
									className={`w-full rounded-md border px-4 py-2 text-sm cursor-not-allowed ${
										validationErrors.feasibilityInvestment || validationErrors.memberLevelInvestment
											? "border-red-300 bg-red-50 text-red-600" 
											: "border-gray-300 bg-gray-100 text-gray-600"
									}`}
								/>
								{validationErrors.feasibilityInvestment && (
									<p className="mt-1 text-xs text-red-600">{validationErrors.feasibilityInvestment}</p>
								)}
								{validationErrors.memberLevelInvestment && (
									<p className="mt-1 text-xs text-red-600">{validationErrors.memberLevelInvestment}</p>
								)}
								{formData.FeasibilityID && !validationErrors.feasibilityInvestment && (
									<p className="mt-1 text-xs text-gray-500">
										Max from Feasibility: {formatCurrency(feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID)?.InvestmentFromPEProgram || 0)}
									</p>
								)}
								{memberFeasibilityLimit !== null && (
									<p className="mt-1 text-xs text-gray-500">
										Member-level limit: {formatCurrency(memberFeasibilityLimit)} | 
										Current total: {formatCurrency(totalMemberPEInvestment - (isEditMode && selectedRecordId ? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0) : 0))} | 
										After {isEditMode ? "update" : "adding"}: {formatCurrency((totalMemberPEInvestment - (isEditMode && selectedRecordId ? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0) : 0)) + formData.InvestmentFromPEProgram)}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Grants</label>
								<input
									type="number"
									value={formData.GrantAmount || ""}
									onChange={(e) => handleChange("GrantAmount", parseFloat(e.target.value) || 0)}
									className={`w-full rounded-md border px-4 py-2 text-sm focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										validationErrors.grantLoanValidation 
											? "border-red-300 focus:border-red-500" 
											: "border-gray-300 focus:border-[#0b4d2b]"
									}`}
									placeholder="0"
									min="0"
									step="0.01"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Loan</label>
								<input
									type="number"
									value={formData.LoanAmount || ""}
									onChange={(e) => {
										const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
										handleChange("LoanAmount", value);
									}}
									onBlur={handleLoanBlur}
									className={`w-full rounded-md border px-4 py-2 text-sm focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										validationErrors.grantLoanValidation 
											? "border-red-300 focus:border-red-500" 
											: "border-gray-300 focus:border-[#0b4d2b]"
									}`}
									placeholder="0"
									min="0"
									step="0.01"
								/>
								{formData.LoanAmount > 0 && formData.LoanAmount < 50000 && (
									<p className="mt-1 text-xs text-yellow-600">Loan amount &lt; PKR 50,000 will be automatically converted to Grant when you leave this field</p>
								)}
							</div>
							{validationErrors.grantLoanValidation && (
								<div className="col-span-2">
									<p className="text-sm text-red-600">{validationErrors.grantLoanValidation}</p>
								</div>
							)}
							{!validationErrors.grantLoanValidation && formData.GrantAmount + formData.LoanAmount > 0 && (
								<div className="col-span-2">
									<p className="text-sm text-green-600">
										✓ Grants ({formData.GrantAmount.toLocaleString()}) + Loan ({formData.LoanAmount.toLocaleString()}) = {(formData.GrantAmount + formData.LoanAmount).toLocaleString()} matches Investment Required from PE Program ({formData.InvestmentFromPEProgram.toLocaleString()})
									</p>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Planned Income per Month (Avg. of 12 Months)</label>
								<input
									type="number"
									value={formData.PlannedMonthlyIncome || ""}
									onChange={(e) => handleChange("PlannedMonthlyIncome", parseFloat(e.target.value) || 0)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder="0"
									min="0"
									step="0.01"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary's Current Income per Month</label>
								<input
									type="text"
									value={formatCurrency(formData.CurrentMonthlyIncome)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Incremental Planned Income per Month</label>
								<input
									type="text"
									value={formatCurrency(formData.IncrementalMonthlyIncome)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Section 4: Approval Section */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">4. Approval Section</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
							<input
								type="text"
								value="Pending"
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Approval Remarks</label>
							<textarea
								value={formData.ApprovalRemarks}
								onChange={(e) => handleChange("ApprovalRemarks", e.target.value)}
								rows={3}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter approval remarks"
							/>
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => {
							if (fdpEconomicRecords.length > 0) {
								setShowForm(false);
								setSelectedRecordId(null);
							} else {
								router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`);
							}
						}}
						className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
					>
						{fdpEconomicRecords.length > 0 ? "Back to List" : "Cancel"}
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
								<span>Save FDP Economic</span>
							</>
						)}
					</button>
				</div>
				</form>
			)}
		</div>
	);
}

export default function FDPEconomicPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FDPEconomicContent />
		</Suspense>
	);
}
