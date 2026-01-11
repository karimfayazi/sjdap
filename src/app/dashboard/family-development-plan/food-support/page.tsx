"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type FoodSupportFormData = {
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
	
	// Food & Nutrition Support
	FoodSupportMonthlyTotalCost: number;
	FoodSupportMonthlyFamilyContribution: number;
	FoodSupportMonthlyPEContribution: number;
	FoodSupportNumberOfMonths: number;
	
	// Calculated Totals (read-only)
	FoodSupportTotalCost: number;
	FoodSupportTotalFamilyContribution: number;
	FoodSupportTotalPEContribution: number;
};

type BaselineData = {
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	SelfSufficiencyIncomePerCapita: number;
	Area_Type: string;
	HeadName: string;
};

function FoodSupportContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpFoodSupportId = searchParams.get("fdpFoodSupportId"); // For edit mode

	const isEditMode = !!fdpFoodSupportId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<FoodSupportFormData>({
		FamilyID: formNumber || "",
		HeadName: "",
		BaselineFamilyIncome: 0,
		FamilyMembersCount: 0,
		FamilyPerCapitaIncome: 0,
		SelfSufficiencyIncomePerCapita: 0,
		BaselinePerCapitaAsPctOfSelfSuff: 0,
		BaselinePovertyLevel: "",
		MaxSocialSupportAmount: 0,
		FoodSupportMonthlyTotalCost: 0,
		FoodSupportMonthlyFamilyContribution: 0,
		FoodSupportMonthlyPEContribution: 0,
		FoodSupportNumberOfMonths: 0,
		FoodSupportTotalCost: 0,
		FoodSupportTotalFamilyContribution: 0,
		FoodSupportTotalPEContribution: 0,
	});

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [foodSupportRecords, setFoodSupportRecords] = useState<any[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
	const [alreadyDefinedSocialSupport, setAlreadyDefinedSocialSupport] = useState(0);
	const [availableSocialSupport, setAvailableSocialSupport] = useState(0);

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
		const peContribution = formData.FoodSupportMonthlyTotalCost - formData.FoodSupportMonthlyFamilyContribution;
		setFormData(prev => ({ ...prev, FoodSupportMonthlyPEContribution: Math.max(0, peContribution) }));
	}, [formData.FoodSupportMonthlyTotalCost, formData.FoodSupportMonthlyFamilyContribution]);

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

	// Calculate totals
	useEffect(() => {
		const totalCost = formData.FoodSupportMonthlyTotalCost * formData.FoodSupportNumberOfMonths;
		const totalFamilyContribution = formData.FoodSupportMonthlyFamilyContribution * formData.FoodSupportNumberOfMonths;
		const totalPEContribution = formData.FoodSupportMonthlyPEContribution * formData.FoodSupportNumberOfMonths;

		setFormData(prev => ({
			...prev,
			FoodSupportTotalCost: totalCost,
			FoodSupportTotalFamilyContribution: totalFamilyContribution,
			FoodSupportTotalPEContribution: totalPEContribution,
		}));
	}, [
		formData.FoodSupportMonthlyTotalCost,
		formData.FoodSupportMonthlyFamilyContribution,
		formData.FoodSupportMonthlyPEContribution,
		formData.FoodSupportNumberOfMonths,
	]);

	// Fetch total social support and calculate available
	useEffect(() => {
		if (!formNumber || !formData.MaxSocialSupportAmount) return;

		const fetchTotalSocialSupport = async () => {
			try {
				const excludeRecordId = isEditMode && fdpFoodSupportId ? fdpFoodSupportId : null;
				const url = `/api/family-development-plan/total-social-support?formNumber=${encodeURIComponent(formNumber)}${excludeRecordId ? `&excludeRecordId=${excludeRecordId}&excludeRecordType=food` : ""}`;
				
				const response = await fetch(url);
				const result = await response.json();
				
				if (result.success && result.data) {
					const totalDefined = result.data.totalSocialSupport || 0;
					// Already defined = total from all other records (excluding current if editing)
					const alreadyDefined = totalDefined;
					// Available = Max - Already defined
					const available = Math.max(0, formData.MaxSocialSupportAmount - alreadyDefined);
					
					setAlreadyDefinedSocialSupport(alreadyDefined);
					setAvailableSocialSupport(available);
				}
			} catch (err) {
				console.error("Error fetching total social support:", err);
			}
		};

		fetchTotalSocialSupport();
	}, [formNumber, formData.MaxSocialSupportAmount, isEditMode, fdpFoodSupportId]);

	// Fetch baseline data and existing food support data
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

				// Load all existing food support records for this family
				if (formNumber) {
					const response = await fetch(`/api/family-development-plan/food-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setFoodSupportRecords(records);
						
						// If in edit mode with fdpFoodSupportId, load that specific record
						if (isEditMode && fdpFoodSupportId) {
							const existing = records.find((r: any) => r.FDP_FoodSupportID?.toString() === fdpFoodSupportId) || records[0];
							if (existing) {
								setSelectedRecordId(existing.FDP_FoodSupportID);
								setFormData(prev => ({
									...prev,
									MaxSocialSupportAmount: existing.MaxSocialSupportAmount || 0,
									FoodSupportMonthlyTotalCost: existing.FoodSupportMonthlyTotalCost || 0,
									FoodSupportMonthlyFamilyContribution: existing.FoodSupportMonthlyFamilyContribution || 0,
									FoodSupportMonthlyPEContribution: existing.FoodSupportMonthlyPEContribution || 0,
									FoodSupportNumberOfMonths: existing.FoodSupportNumberOfMonths || 0,
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
	}, [formNumber, isEditMode, fdpFoodSupportId]);

	const handleChange = (field: keyof FoodSupportFormData, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		// Validation
		if (!formData.FamilyID) {
			setError("Family ID is required");
			return;
		}

		// Validate that poverty level is -3 or -4
		if (formData.BaselinePovertyLevel !== "Level -3" && formData.BaselinePovertyLevel !== "Level -4") {
			setError("Food Support is only available for Poverty Levels -3 and -4");
			return;
		}

		// Validate that Total PE Contribution does not exceed Available Social Support
		if (formData.FoodSupportTotalPEContribution > availableSocialSupport) {
			setError(`Total PE Contribution (PKR ${formData.FoodSupportTotalPEContribution.toLocaleString()}) exceeds Available Social Support (PKR ${availableSocialSupport.toLocaleString()}). Please reduce the amount.`);
			return;
		}

		setSaving(true);

		try {
			const url = isEditMode 
				? `/api/family-development-plan/food-support?fdpFoodSupportId=${encodeURIComponent(fdpFoodSupportId!)}`
				: "/api/family-development-plan/food-support";
			
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
				// Reload food support records
				if (formNumber) {
					const response = await fetch(`/api/family-development-plan/food-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setFoodSupportRecords(records);
					}
				}
				// Reset form
				setFormData(prev => ({
					...prev,
					FoodSupportMonthlyTotalCost: 0,
					FoodSupportMonthlyFamilyContribution: 0,
					FoodSupportMonthlyPEContribution: 0,
					FoodSupportNumberOfMonths: 0,
				}));
				setSelectedRecordId(null);
				setShowForm(false);
				setTimeout(() => {
					setSuccess(false);
				}, 3000);
			} else {
				setError(result.message || "Failed to save Food Support data");
			}
		} catch (err: any) {
			console.error("Error saving Food Support data:", err);
			setError(err.message || "Failed to save Food Support data");
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
				<span className="ml-3 text-gray-600">Loading Food Support data...</span>
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
					<h1 className="text-3xl font-bold text-gray-900">Food Support</h1>
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
					Food Support data saved successfully!
				</div>
			)}

			{/* Gridview or Form Toggle */}
			{foodSupportRecords.length > 0 && !showForm && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-900">Existing Food Support Records</h2>
						<button
							type="button"
							onClick={() => {
								setShowForm(true);
								setSelectedRecordId(null);
								setFormData(prev => ({
									...prev,
									FoodSupportMonthlyTotalCost: 0,
									FoodSupportMonthlyFamilyContribution: 0,
									FoodSupportMonthlyPEContribution: 0,
									FoodSupportNumberOfMonths: 0,
								}));
							}}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Add New Food Support
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poverty Level</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{foodSupportRecords.map((record) => (
									<tr key={record.FDP_FoodSupportID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_FoodSupportID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.HeadName || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.BaselinePovertyLevel || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.FoodSupportMonthlyTotalCost ? `PKR ${parseFloat(record.FoodSupportMonthlyTotalCost).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FoodSupportNumberOfMonths || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.FoodSupportTotalCost ? `PKR ${parseFloat(record.FoodSupportTotalCost).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.FoodSupportTotalPEContribution ? `PKR ${parseFloat(record.FoodSupportTotalPEContribution).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<button
												type="button"
												onClick={() => {
													setSelectedRecordId(record.FDP_FoodSupportID);
													router.push(`/dashboard/family-development-plan/food-support?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpFoodSupportId=${record.FDP_FoodSupportID}`);
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
				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
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

				{/* Section 2: Food & Nutrition Support */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Food & Nutrition Support (For Poverty Levels -3 and -4 Only)</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Monthly Total Cost</label>
								<input
									type="number"
									value={formData.FoodSupportMonthlyTotalCost || ""}
									onChange={(e) => handleChange("FoodSupportMonthlyTotalCost", parseFloat(e.target.value) || 0)}
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
									value={formData.FoodSupportMonthlyFamilyContribution || ""}
									onChange={(e) => handleChange("FoodSupportMonthlyFamilyContribution", parseFloat(e.target.value) || 0)}
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
									value={formatCurrency(formData.FoodSupportMonthlyPEContribution)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Months</label>
							<input
								type="number"
								value={formData.FoodSupportNumberOfMonths || ""}
								onChange={(e) => handleChange("FoodSupportNumberOfMonths", parseInt(e.target.value) || 0)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="0"
								min="0"
							/>
						</div>
					</div>
				</div>

				{/* Section 3: Totals Summary */}
				<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Totals Summary</h2>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total Cost</label>
							<input
								type="text"
								value={formatCurrency(formData.FoodSupportTotalCost)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total Family Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.FoodSupportTotalFamilyContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Total PE Contribution</label>
							<input
								type="text"
								value={formatCurrency(formData.FoodSupportTotalPEContribution)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
				<button
					type="button"
					onClick={() => {
						if (foodSupportRecords.length > 0) {
							setShowForm(false);
							setSelectedRecordId(null);
						} else {
							router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`);
						}
					}}
					className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
				>
					{foodSupportRecords.length > 0 ? "Back to List" : "Cancel"}
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
								<span>Save Food Support</span>
							</>
						)}
					</button>
				</div>
				</form>
			)}
		</div>
	);
}

export default function FoodSupportPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FoodSupportContent />
		</Suspense>
	);
}
