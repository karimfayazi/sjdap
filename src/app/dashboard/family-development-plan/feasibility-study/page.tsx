"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Upload, FileText, Edit, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type FeasibilityFormData = {
	FamilyID: string;
	MemberID: string;
	MemberName: string;
	PlanCategory: string; // "ECONOMIC" or "SKILLS"
	CurrentBaselineIncome: number;
	
	// Economic fields
	FeasibilityType: string;
	InvestmentRationale: string;
	MarketBusinessAnalysis: string;
	TotalSalesRevenue: number;
	TotalDirectCosts: number;
	TotalIndirectCosts: number;
	NetProfitLoss: number;
	TotalInvestmentRequired: number;
	InvestmentFromPEProgram: number;
	
	// Skills fields
	MainTrade: string;
	SubTrade: string;
	SkillsDevelopmentInstitution: string;
	SubField: string;
	Trade: string;
	TrainingInstitution: string;
	InstitutionType: string;
	InstitutionCertifiedBy: string;
	CourseTitle: string;
	CourseDeliveryType: string;
	HoursOfInstruction: number;
	DurationWeeks: number;
	StartDate: string;
	EndDate: string;
	CostPerParticipant: number;
	ExpectedStartingSalary: number;
	
	// Common fields
	FeasibilityPdfPath: string;
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
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	Area_Type: string;
};

function FeasibilityStudyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpId = searchParams.get("fdpId"); // For edit mode

	const isEditMode = !!fdpId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<FeasibilityFormData>({
		FamilyID: formNumber || "",
		MemberID: memberNo || "",
		MemberName: memberName || "",
		PlanCategory: "",
		CurrentBaselineIncome: 0,
		FeasibilityType: "",
		InvestmentRationale: "",
		MarketBusinessAnalysis: "",
		TotalSalesRevenue: 0,
		TotalDirectCosts: 0,
		TotalIndirectCosts: 0,
		NetProfitLoss: 0,
		TotalInvestmentRequired: 0,
		InvestmentFromPEProgram: 0,
		MainTrade: "",
		SubTrade: "",
		SkillsDevelopmentInstitution: "",
		SubField: "",
		Trade: "",
		TrainingInstitution: "",
		InstitutionType: "",
		InstitutionCertifiedBy: "",
		CourseTitle: "",
		CourseDeliveryType: "",
		HoursOfInstruction: 0,
		DurationWeeks: 0,
		StartDate: "",
		EndDate: "",
		CostPerParticipant: 0,
		ExpectedStartingSalary: 0,
		FeasibilityPdfPath: "",
		ApprovalStatus: "Pending",
		ApprovalRemarks: "",
	});

	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [uploadingPdf, setUploadingPdf] = useState(false);
	const [existingFeasibility, setExistingFeasibility] = useState<any[]>([]);
	
	// Family-level information state
	const [headName, setHeadName] = useState<string>("");
	const [familyPerCapitaIncome, setFamilyPerCapitaIncome] = useState<number>(0);
	const [baselinePerCapitaAsPctOfSelfSuff, setBaselinePerCapitaAsPctOfSelfSuff] = useState<number>(0);
	const [baselinePovertyLevel, setBaselinePovertyLevel] = useState<string>("");
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

	// Fetch data on mount
	useEffect(() => {
		if (!formNumber || !memberNo) {
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
					
					setFamilyPerCapitaIncome(perCapitaIncome);
					setBaselinePerCapitaAsPctOfSelfSuff(selfSufficiencyPercent);
					setBaselinePovertyLevel(povertyLevel);
				}

				// Fetch head name from basic info
				const basicInfoResponse = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNumber)}`);
				const basicInfoResult = await basicInfoResponse.json();
				const headNameValue = basicInfoResult.success && basicInfoResult.data ? basicInfoResult.data.Full_Name || "" : "";
				setHeadName(headNameValue);

				// Fetch family members
				const membersResponse = await fetch(`/api/family-development-plan/members?formNumber=${encodeURIComponent(formNumber)}`);
				const membersData = await membersResponse.json();
				
				if (membersData.success && membersData.data) {
					setFamilyMembers(membersData.data);
					
					// Auto-select the member if memberNo is provided
					const selectedMember = membersData.data.find((m: FamilyMember) => m.MemberNo === memberNo);
					if (selectedMember) {
						setFormData(prev => ({
							...prev,
							MemberID: selectedMember.MemberNo,
							MemberName: selectedMember.FullName,
							CurrentBaselineIncome: selectedMember.MonthlyIncome || 0,
						}));
					}
				}

				// Fetch existing feasibility studies
				const feasibilityResponse = await fetch(`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(formNumber)}&memberID=${encodeURIComponent(memberNo)}`);
				const feasibilityData = await feasibilityResponse.json();
				
				if (feasibilityData.success && feasibilityData.data) {
					const studies = Array.isArray(feasibilityData.data) ? feasibilityData.data : [feasibilityData.data];
					setExistingFeasibility(studies);
					
					// If editing, load the specific record
					if (isEditMode && fdpId) {
						const record = studies.find((s: any) => s.FDP_ID === parseInt(fdpId));
						if (record) {
							// Get the member's baseline income from baseline member data
							let memberBaselineIncome = 0;
							if (membersData.success && membersData.data) {
								const selectedMember = membersData.data.find((m: FamilyMember) => m.MemberNo === (record.MemberID || memberNo));
								memberBaselineIncome = selectedMember?.MonthlyIncome || 0;
							}
							
							setFormData({
								FamilyID: record.FamilyID || formNumber || "",
								MemberID: record.MemberID || memberNo || "",
								MemberName: record.MemberName || memberName || "",
								PlanCategory: record.PlanCategory || "",
								CurrentBaselineIncome: memberBaselineIncome,
								FeasibilityType: record.FeasibilityType || "",
								InvestmentRationale: record.InvestmentRationale || "",
								MarketBusinessAnalysis: record.MarketBusinessAnalysis || "",
								TotalSalesRevenue: record.TotalSalesRevenue || 0,
								TotalDirectCosts: record.TotalDirectCosts || 0,
								TotalIndirectCosts: record.TotalIndirectCosts || 0,
								NetProfitLoss: record.NetProfitLoss || 0,
								TotalInvestmentRequired: record.TotalInvestmentRequired || 0,
								InvestmentFromPEProgram: record.InvestmentFromPEProgram || 0,
								MainTrade: record.MainTrade || "",
								SubTrade: record.SubTrade || "",
								SkillsDevelopmentInstitution: record.SkillsDevelopmentInstitution || "",
								SubField: record.SubField || "",
								Trade: record.Trade || "",
								TrainingInstitution: record.TrainingInstitution || "",
								InstitutionType: record.InstitutionType || "",
								InstitutionCertifiedBy: record.InstitutionCertifiedBy || "",
								CourseTitle: record.CourseTitle || "",
								CourseDeliveryType: record.CourseDeliveryType || "",
								HoursOfInstruction: record.HoursOfInstruction || 0,
								DurationWeeks: record.DurationWeeks || 0,
								StartDate: record.StartDate ? record.StartDate.split('T')[0] : "",
								EndDate: record.EndDate ? record.EndDate.split('T')[0] : "",
								CostPerParticipant: record.CostPerParticipant || 0,
								ExpectedStartingSalary: record.ExpectedStartingSalary || 0,
								FeasibilityPdfPath: record.FeasibilityPdfPath || "",
								ApprovalStatus: "Pending", // Always set to Pending as it's read-only
								ApprovalRemarks: record.ApprovalRemarks || "",
							});
						}
					}
				}
			} catch (err: any) {
				console.error("Error fetching data:", err);
				setError(err.message || "Error fetching data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber, memberNo, memberName, isEditMode, fdpId]);

	// Fetch total economic support and calculate available
	useEffect(() => {
		if (!formNumber) return;

		const fetchTotalEconomicSupport = async () => {
			try {
				const response = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}`);
				const result = await response.json();
				
				if (result.success && result.data) {
					const records = Array.isArray(result.data) ? result.data : [result.data];
					const totalDefined = records.reduce((sum: number, record: any) => {
						const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
						return sum + investment;
					}, 0);
					
					const alreadyDefined = totalDefined;
					const available = Math.max(0, maxEconomicSupportAmount - alreadyDefined);
					
					setAlreadyDefinedEconomicSupport(alreadyDefined);
					setAvailableEconomicSupport(available);
				}
			} catch (err) {
				console.error("Error fetching total economic support:", err);
			}
		};

		fetchTotalEconomicSupport();
	}, [formNumber, maxEconomicSupportAmount]);

	// Calculate Net Profit/Loss for Economic
	useEffect(() => {
		if (formData.PlanCategory === "ECONOMIC") {
			const netProfitLoss = (formData.TotalSalesRevenue || 0) - (formData.TotalDirectCosts || 0) - (formData.TotalIndirectCosts || 0);
			setFormData(prev => ({ ...prev, NetProfitLoss: netProfitLoss }));
		}
	}, [formData.PlanCategory, formData.TotalSalesRevenue, formData.TotalDirectCosts, formData.TotalIndirectCosts]);

	// Handle PDF upload
	const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (file.type !== "application/pdf") {
			setError("Please upload a PDF file");
			return;
		}

		if (file.size > 10 * 1024 * 1024) { // 10MB limit
			setError("File size must be less than 10MB");
			return;
		}

		try {
			setUploadingPdf(true);
			setError(null);

			const formDataUpload = new FormData();
			formDataUpload.append("file", file);
			formDataUpload.append("formNumber", formNumber || "");
			formDataUpload.append("memberNo", memberNo || "");
			formDataUpload.append("documentType", "feasibility-study");

			const response = await fetch("/api/family-development-plan/upload-pdf", {
				method: "POST",
				body: formDataUpload,
			});

			const result = await response.json();

			if (result.success) {
				setFormData(prev => ({ ...prev, FeasibilityPdfPath: result.filePath }));
				setSuccess(true);
				setTimeout(() => setSuccess(false), 3000);
			} else {
				setError(result.message || "Failed to upload PDF");
			}
		} catch (err: any) {
			console.error("Error uploading PDF:", err);
			setError(err.message || "Error uploading PDF");
		} finally {
			setUploadingPdf(false);
		}
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		// Validation
		if (!formData.PlanCategory) {
			setError("Please select a Plan Category");
			return;
		}

		if (!formData.FeasibilityPdfPath) {
			setError("Please upload a feasibility study PDF");
			return;
		}

		if (formData.PlanCategory === "ECONOMIC") {
			if (!formData.FeasibilityType || !formData.TotalInvestmentRequired || formData.TotalInvestmentRequired <= 0) {
				setError("Please fill in all required Economic fields");
				return;
			}
			if (!formData.InvestmentRationale || !formData.InvestmentRationale.trim()) {
				setError("Investment Rationale is required");
				return;
			}
			if (!formData.MarketBusinessAnalysis || !formData.MarketBusinessAnalysis.trim()) {
				setError("Market/Business Analysis is required");
				return;
			}
			if (formData.TotalSalesRevenue === null || formData.TotalSalesRevenue === undefined || formData.TotalSalesRevenue < 0) {
				setError("Total Sales Revenue is required and must be 0 or greater");
				return;
			}
			if (formData.TotalDirectCosts === null || formData.TotalDirectCosts === undefined || formData.TotalDirectCosts < 0) {
				setError("Total Direct Costs is required and must be 0 or greater");
				return;
			}
			if (formData.TotalIndirectCosts === null || formData.TotalIndirectCosts === undefined || formData.TotalIndirectCosts < 0) {
				setError("Total Indirect Costs is required and must be 0 or greater");
				return;
			}
			if (formData.InvestmentFromPEProgram === null || formData.InvestmentFromPEProgram === undefined || formData.InvestmentFromPEProgram < 0) {
				setError("Investment from PE Program is required and must be 0 or greater");
				return;
			}
		}

		if (formData.PlanCategory === "SKILLS") {
			if (!formData.MainTrade || !formData.SubTrade || !formData.SkillsDevelopmentInstitution || !formData.CourseTitle || !formData.CostPerParticipant || formData.CostPerParticipant <= 0) {
				setError("Please fill in all required Skills fields (Main Trade, Sub Trade, Skills Development Institution, Course Title, and Cost Per Participant)");
				return;
			}
		}

		try {
			setSaving(true);

			const payload = {
				...formData,
				CreatedBy: userProfile?.username || null,
			};

			const response = await fetch("/api/family-development-plan/feasibility", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`);
				}, 2000);
			} else {
				setError(result.message || "Failed to save feasibility study");
			}
		} catch (err: any) {
			console.error("Error saving feasibility study:", err);
			setError(err.message || "Error saving feasibility study");
		} finally {
			setSaving(false);
		}
	};

	const formatCurrency = (value: number | null | undefined): string => {
		if (value === null || value === undefined) return "0";
		return `Rs. ${value.toLocaleString()}`;
	};

	const formatPercent = (value: number): string => {
		return `${value.toFixed(2)}%`;
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Feasibility Study</h1>
						<p className="text-gray-600 mt-1">
							Form: {formNumber} | Member: {memberName || memberNo}
						</p>
					</div>
				</div>
			</div>

			{/* Error/Success Messages */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
					<AlertCircle className="h-5 w-5 text-red-600" />
					<p className="text-red-600">{error}</p>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
					<AlertCircle className="h-5 w-5 text-green-600" />
					<p className="text-green-600">Feasibility study saved successfully!</p>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Family-Level Information */}
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
								value={headName}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Area Type</label>
							<input
								type="text"
								value={baselineData?.Area_Type || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Family Income</label>
							<input
								type="text"
								value={formatCurrency(baselineData?.BaselineFamilyIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Members Count</label>
							<input
								type="text"
								value={baselineData?.FamilyMembersCount || 0}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Per Capita Income</label>
							<input
								type="text"
								value={formatCurrency(familyPerCapitaIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Self-Sufficiency Income Per Capita</label>
							<input
								type="text"
								value={formatCurrency(baselineData?.SelfSufficiencyIncomePerCapita)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Per Capita as % of Self-Sufficiency</label>
							<input
								type="text"
								value={formatPercent(baselinePerCapitaAsPctOfSelfSuff)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Poverty Level</label>
							<input
								type="text"
								value={baselinePovertyLevel}
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

				{/* Basic Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Basic Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Plan Category <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.PlanCategory}
								onChange={(e) => setFormData(prev => ({ ...prev, PlanCategory: e.target.value }))}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								required
							>
								<option value="">Select Category</option>
								<option value="ECONOMIC">Economic</option>
								<option value="SKILLS">Skills Development</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Current Baseline Income
							</label>
							<input
								type="text"
								value={formatCurrency(formData.CurrentBaselineIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
					</div>
				</div>

				{/* Economic Fields */}
				{formData.PlanCategory === "ECONOMIC" && (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Economic Feasibility Details</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Feasibility Type <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.FeasibilityType}
									onChange={(e) => setFormData(prev => ({ ...prev, FeasibilityType: e.target.value }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								>
									<option value="">Select Type</option>
									<option value="Business">Business</option>
									<option value="Agriculture">Agriculture</option>
									<option value="Livestock">Livestock</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Investment Rationale <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.InvestmentRationale}
									onChange={(e) => setFormData(prev => ({ ...prev, InvestmentRationale: e.target.value }))}
									rows={3}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Market/Business Analysis <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.MarketBusinessAnalysis}
									onChange={(e) => setFormData(prev => ({ ...prev, MarketBusinessAnalysis: e.target.value }))}
									rows={3}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Total Sales Revenue (PKR) <span className="text-red-500">*</span>
								</label>
								<input
									type="number"
									step="0.01"
									value={formData.TotalSalesRevenue || 0}
									onChange={(e) => setFormData(prev => ({ ...prev, TotalSalesRevenue: parseFloat(e.target.value) || 0 }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Total Direct Costs (PKR) <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.TotalDirectCosts || 0}
										onChange={(e) => setFormData(prev => ({ ...prev, TotalDirectCosts: parseFloat(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Total Indirect Costs (PKR) <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.TotalIndirectCosts || 0}
										onChange={(e) => setFormData(prev => ({ ...prev, TotalIndirectCosts: parseFloat(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Net Profit/Loss (PKR)
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.NetProfitLoss}
										readOnly
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Total Investment Required (PKR) <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.TotalInvestmentRequired}
										onChange={(e) => setFormData(prev => ({ ...prev, TotalInvestmentRequired: parseFloat(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Investment from PE Program (PKR) <span className="text-red-500">*</span>
								</label>
								<input
									type="number"
									step="0.01"
									value={formData.InvestmentFromPEProgram || 0}
									onChange={(e) => setFormData(prev => ({ ...prev, InvestmentFromPEProgram: parseFloat(e.target.value) || 0 }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>
						</div>
					</div>
				)}

				{/* Skills Fields */}
				{formData.PlanCategory === "SKILLS" && (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Skills Development Details</h2>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Main Trade <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.MainTrade}
										onChange={(e) => setFormData(prev => ({ ...prev, MainTrade: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Sub Trade <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.SubTrade}
										onChange={(e) => setFormData(prev => ({ ...prev, SubTrade: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Skills Development Institution <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.SkillsDevelopmentInstitution}
									onChange={(e) => setFormData(prev => ({ ...prev, SkillsDevelopmentInstitution: e.target.value }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Sub Field
									</label>
									<input
										type="text"
										value={formData.SubField}
										onChange={(e) => setFormData(prev => ({ ...prev, SubField: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Trade
									</label>
									<input
										type="text"
										value={formData.Trade}
										onChange={(e) => setFormData(prev => ({ ...prev, Trade: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Training Institution
									</label>
									<input
										type="text"
										value={formData.TrainingInstitution}
										onChange={(e) => setFormData(prev => ({ ...prev, TrainingInstitution: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Institution Type
									</label>
									<select
										value={formData.InstitutionType}
										onChange={(e) => setFormData(prev => ({ ...prev, InstitutionType: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Type</option>
										<option value="Government">Government</option>
										<option value="Private">Private</option>
										<option value="NGO">NGO</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Institution Certified By
									</label>
									<input
										type="text"
										value={formData.InstitutionCertifiedBy}
										onChange={(e) => setFormData(prev => ({ ...prev, InstitutionCertifiedBy: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Course Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.CourseTitle}
									onChange={(e) => setFormData(prev => ({ ...prev, CourseTitle: e.target.value }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Course Delivery Type
									</label>
									<select
										value={formData.CourseDeliveryType}
										onChange={(e) => setFormData(prev => ({ ...prev, CourseDeliveryType: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Type</option>
										<option value="In-Person">In-Person</option>
										<option value="Online">Online</option>
										<option value="Hybrid">Hybrid</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Hours of Instruction
									</label>
									<input
										type="number"
										value={formData.HoursOfInstruction}
										onChange={(e) => setFormData(prev => ({ ...prev, HoursOfInstruction: parseInt(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Duration (Weeks)
									</label>
									<input
										type="number"
										value={formData.DurationWeeks}
										onChange={(e) => setFormData(prev => ({ ...prev, DurationWeeks: parseInt(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Cost Per Participant (PKR) <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										value={formData.CostPerParticipant}
										onChange={(e) => setFormData(prev => ({ ...prev, CostPerParticipant: parseFloat(e.target.value) || 0 }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Start Date
									</label>
									<input
										type="date"
										value={formData.StartDate}
										onChange={(e) => setFormData(prev => ({ ...prev, StartDate: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										End Date
									</label>
									<input
										type="date"
										value={formData.EndDate}
										onChange={(e) => setFormData(prev => ({ ...prev, EndDate: e.target.value }))}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Expected Starting Salary (PKR)
								</label>
								<input
									type="number"
									step="0.01"
									value={formData.ExpectedStartingSalary}
									onChange={(e) => setFormData(prev => ({ ...prev, ExpectedStartingSalary: parseFloat(e.target.value) || 0 }))}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
						</div>
					</div>
				)}

				{/* PDF Upload */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">4. Upload Feasibility Study PDF</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Feasibility Study PDF <span className="text-red-500">*</span>
							</label>
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors cursor-pointer">
									<Upload className="h-4 w-4" />
									<span>{formData.FeasibilityPdfPath ? "Change PDF" : "Upload PDF"}</span>
									<input
										type="file"
										accept=".pdf"
										onChange={handlePdfUpload}
										className="hidden"
										disabled={uploadingPdf}
									/>
								</label>
								{uploadingPdf && (
									<span className="text-sm text-gray-600">Uploading...</span>
								)}
								{formData.FeasibilityPdfPath && (
									<div className="flex items-center gap-2 text-sm text-green-600">
										<FileText className="h-4 w-4" />
										<span>PDF uploaded successfully</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Approval Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">5. Approval Information</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Approval Status
							</label>
							<input
								type="text"
								value="Pending"
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Approval Remarks
							</label>
							<textarea
								value={formData.ApprovalRemarks}
								onChange={(e) => setFormData(prev => ({ ...prev, ApprovalRemarks: e.target.value }))}
								rows={3}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								Save Feasibility Study
							</>
						)}
					</button>
				</div>
			</form>

			{/* Existing Feasibility Plans Grid View */}
			{existingFeasibility.length > 0 && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Feasibility Plans</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Category</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feasibility Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Investment Required</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales Revenue</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit/Loss</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{existingFeasibility.map((record) => (
									<tr key={record.FDP_ID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_ID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.PlanCategory || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.FeasibilityType || record.MainTrade || record.CourseTitle || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.TotalInvestmentRequired || record.CostPerParticipant
												? `PKR ${(record.TotalInvestmentRequired || record.CostPerParticipant || 0).toLocaleString()}`
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.InvestmentFromPEProgram
												? `PKR ${parseFloat(record.InvestmentFromPEProgram).toLocaleString()}`
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.TotalSalesRevenue
												? `PKR ${parseFloat(record.TotalSalesRevenue).toLocaleString()}`
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.NetProfitLoss !== null && record.NetProfitLoss !== undefined
												? `PKR ${parseFloat(record.NetProfitLoss).toLocaleString()}`
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												record.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												record.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{record.ApprovalStatus || "Pending"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm">
											<button
												onClick={() => {
													router.push(`/dashboard/family-development-plan/feasibility-study?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpId=${record.FDP_ID}`);
												}}
												className="text-blue-600 hover:text-blue-800 mr-3"
												title="Edit"
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

export default function FeasibilityStudyPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FeasibilityStudyContent />
		</Suspense>
	);
}
