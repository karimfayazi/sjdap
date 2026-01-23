"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, XCircle, Save } from "lucide-react";

type Intervention = {
	InterventionID: number;
	FormNumber: string;
	Section: string | null;
	InterventionStatus: string | null;
	InterventionCategory: string | null;
	SubCategory: string | null;
	MainIntervention: string | null;
	InterventionType: string | null;
	FinancialCategory: string | null;
	AmountType: string | null;
	TotalAmount: number | null;
	InterventionStartDate: string | null;
	InterventionEndDate: string | null;
	Remarks: string | null;
	MemberID: string | null;
	ApprovalStatus: string | null;
	CreatedBy: string | null;
	CreatedAt: string | null;
};

type MemberInfo = {
	BeneficiaryID?: string;
	FullName?: string;
	MemberName?: string;
	CNIC?: string;
	CNICNumber?: string;
	BFormOrCNIC?: string;
};

function AddInterventionContent() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const formNumber = params?.formNumber as string;
	const interventionType = searchParams?.get("type") || "";
	const memberId = searchParams?.get("memberId") || "";

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [memberName, setMemberName] = useState<string>("");
	const [memberCNIC, setMemberCNIC] = useState<string>("");
	const [headName, setHeadName] = useState<string>("");
	const [housingSupportRecords, setHousingSupportRecords] = useState<any[]>([]);
	const [loadingHousingSupport, setLoadingHousingSupport] = useState(false);
	const [fdpEconomicRecords, setFdpEconomicRecords] = useState<any[]>([]);
	const [loadingFdpEconomic, setLoadingFdpEconomic] = useState(false);
	const [filteredInterventions, setFilteredInterventions] = useState<Intervention[]>([]);
	const [loadingInterventions, setLoadingInterventions] = useState(false);
	const [formData, setFormData] = useState<Partial<Intervention>>({
		FormNumber: formNumber || "",
	});

	// Auto-populate form when type parameter is present
	useEffect(() => {
		if (interventionType) {
			// Get today's date
			const today = new Date();

			// Capitalize first letter of intervention type
			const sectionName = interventionType.charAt(0).toUpperCase() + interventionType.slice(1);

			setFormData({
				FormNumber: formNumber || "",
				Section: sectionName,
				InterventionStatus: "Open",
				InterventionStartDate: today.toISOString(),
				MemberID: memberId || null,
				ApprovalStatus: "Pending",
			});
		}
	}, [interventionType, formNumber, memberId]);

	// Auto-set Main Intervention based on Section
	useEffect(() => {
		const section = formData.Section;
		if (section) {
			// If Section is Food, Health, Habitat, or Education, set Main Intervention to "Social"
			// Otherwise, set it to "Economic"
			if (section === "Food" || section === "Health" || section === "Habitat" || section === "Education") {
				setFormData((prev) => ({
					...prev,
					MainIntervention: "Social",
				}));
			} else {
				setFormData((prev) => ({
					...prev,
					MainIntervention: "Economic",
				}));
			}
		}
	}, [formData.Section]);

	// Set Amount Type and Total Amount based on Intervention Type and Financial Category
	useEffect(() => {
		const interventionType = formData.InterventionType;
		const financialCategory = formData.FinancialCategory;
		
		if (interventionType === "Non-Financial") {
			// For Non-Financial: Amount Type = "N/A", Total Amount = 0
			setFormData((prev) => ({
				...prev,
				AmountType: "N/A",
				TotalAmount: 0,
			}));
		} else if (interventionType === "Financial") {
			if (financialCategory === "Payment From PE Account" || financialCategory === "Payment But Non-PE Account") {
				// For Financial with either payment category: Amount Type = "Grants"
				setFormData((prev) => ({
					...prev,
					AmountType: "Grants",
				}));
			} else if (!financialCategory) {
				// Clear Amount Type if Financial Category is not selected yet
				setFormData((prev) => ({
					...prev,
					AmountType: null,
				}));
			}
		} else {
			// If Intervention Type is not selected, check section-based logic
			const section = formData.Section;
			if (section === "Habitat" || section === "Food" || section === "Education" || section === "Health") {
				setFormData((prev) => ({
					...prev,
					AmountType: "Grants",
				}));
			}
		}
	}, [formData.InterventionType, formData.FinancialCategory, formData.Section]);

	// Fetch Head Name from basic info when formNumber is provided
	useEffect(() => {
		if (formNumber) {
			const fetchHeadName = async () => {
				try {
					const response = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.data && data.data.Full_Name) {
						setHeadName(data.data.Full_Name);
					}
				} catch (err) {
					console.error("Error fetching head name:", err);
				}
			};

			fetchHeadName();
		}
	}, [formNumber]);

	// Fetch CNIC and Member Name from member data when memberId is provided
	useEffect(() => {
		if (memberId && formNumber) {
			const fetchMemberData = async () => {
				try {
					const response = await fetch(`/api/actual-intervention/members?formNumber=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.members) {
						const member = data.members.find((m: MemberInfo) => m.BeneficiaryID === memberId) as MemberInfo | undefined;
						if (member) {
							setMemberName(member?.FullName ?? member?.MemberName ?? "");
							setMemberCNIC(member?.CNIC ?? member?.CNICNumber ?? member?.BFormOrCNIC ?? "");
						}
					}
				} catch (err) {
					console.error("Error fetching member data:", err);
				}
			};

			fetchMemberData();
		}
	}, [memberId, formNumber]);

	// Fetch Housing Support records when type is "habitat"
	useEffect(() => {
		if (interventionType === "habitat" && formNumber) {
			const fetchHousingSupport = async () => {
				try {
					setLoadingHousingSupport(true);
					const response = await fetch(`/api/family-development-plan/housing-support?familyID=${encodeURIComponent(formNumber)}`);
					const data = await response.json();
					
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setHousingSupportRecords(records);
					}
				} catch (err) {
					console.error("Error fetching housing support data:", err);
				} finally {
					setLoadingHousingSupport(false);
				}
			};

			fetchHousingSupport();
		}
	}, [interventionType, formNumber]);

	// Fetch FDP Economic records when type is "economic"
	useEffect(() => {
		if (interventionType === "economic" && formNumber && memberId) {
			const fetchFdpEconomic = async () => {
				try {
					setLoadingFdpEconomic(true);
					const response = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}&beneficiaryID=${encodeURIComponent(memberId)}`);
					const data = await response.json();
					
					if (data.success && data.data) {
						const records = Array.isArray(data.data) ? data.data : [data.data];
						setFdpEconomicRecords(records);
					}
				} catch (err) {
					console.error("Error fetching FDP economic data:", err);
				} finally {
					setLoadingFdpEconomic(false);
				}
			};

			fetchFdpEconomic();
		}
	}, [interventionType, formNumber, memberId]);

	// Fetch filtered interventions by Section and MemberID
	useEffect(() => {
		if (formNumber && formData.Section && formData.MemberID) {
			const fetchFilteredInterventions = async () => {
				try {
					setLoadingInterventions(true);
					const response = await fetch(
						`/api/actual-intervention/interventions?formNumber=${encodeURIComponent(formNumber)}`
					);
					const data = await response.json().catch(() => ({}));

					if (response.ok && data.success) {
						// Filter by Section and MemberID
						const filtered = (data.records || []).filter(
							(intervention: Intervention) =>
								intervention.Section === formData.Section &&
								intervention.MemberID === formData.MemberID
						);
						setFilteredInterventions(filtered);
					}
				} catch (err) {
					console.error("Error fetching filtered interventions:", err);
				} finally {
					setLoadingInterventions(false);
				}
			};

			fetchFilteredInterventions();
		} else {
			setFilteredInterventions([]);
		}
	}, [formNumber, formData.Section, formData.MemberID]);

	const handleInputChange = (field: keyof Intervention, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setSaving(true);
			setError(null);

			// Validation: For Habitat and Education sections, all required fields must be filled
			if (formData.Section === "Habitat" || formData.Section === "Education") {
				if (!formData.InterventionCategory) {
					setError(`Intervention Category is required for ${formData.Section} section.`);
					setSaving(false);
					return;
				}
				if (!formData.InterventionType) {
					setError(`Intervention Type is required for ${formData.Section} section.`);
					setSaving(false);
					return;
				}
				if (!formData.FinancialCategory) {
					setError(`Financial Category is required for ${formData.Section} section.`);
					setSaving(false);
					return;
				}
				if (!formData.TotalAmount && formData.TotalAmount !== 0) {
					setError(`Total Intervention Amount is required for ${formData.Section} section.`);
					setSaving(false);
					return;
				}
				if (!formData.InterventionEndDate) {
					setError(`End Date is required for ${formData.Section} section.`);
					setSaving(false);
					return;
				}
			}

			// Validation: Total Amount must be 0 or above (negative values not accepted)
			if (formData.TotalAmount != null && formData.TotalAmount < 0) {
				setError("Total Intervention Amount must be 0 or above. Negative values are not accepted.");
				setSaving(false);
				return;
			}

			// Validation: Total Amount is required for Financial interventions with payment categories
			if (formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")) {
				if (!formData.TotalAmount || formData.TotalAmount <= 0) {
					setError("Total Intervention Amount is required for Financial interventions with payment categories.");
					setSaving(false);
					return;
				}
			}

			// Validation: Total Amount is required for economic interventions
			if (interventionType === "economic") {
				if (!formData.TotalAmount || formData.TotalAmount <= 0) {
					setError("Total Intervention Amount is required for economic interventions.");
					setSaving(false);
					return;
				}
			}

			// Validation: For habitat section, Total Amount should not exceed remaining PE Contribution
			if (interventionType === "habitat" && formData.TotalAmount) {
				const totalPEContribution = housingSupportRecords.reduce((sum, record) => {
					const peContribution = parseFloat(record.HabitatTotalPEContribution) || 0;
					return sum + peContribution;
				}, 0);

				// Calculate sum of existing interventions for the same Section and MemberID
				const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
					const amount = intervention.TotalAmount || 0;
					return sum + amount;
				}, 0);

				// Calculate remaining amount
				const remainingAmount = totalPEContribution - existingInterventionsTotal;

				// Check if new amount + existing total exceeds PE Contribution
				const newTotal = existingInterventionsTotal + formData.TotalAmount;

				if (newTotal > totalPEContribution) {
					setError(
						`Total intervention amount exceeds available PE Contribution. ` +
						`Total PE Contribution: PKR ${totalPEContribution.toLocaleString()}, ` +
						`Existing interventions total: PKR ${existingInterventionsTotal.toLocaleString()}, ` +
						`Remaining available: PKR ${remainingAmount.toLocaleString()}, ` +
						`New amount: PKR ${formData.TotalAmount.toLocaleString()}. ` +
						`Total would be: PKR ${newTotal.toLocaleString()} (exceeds by PKR ${(newTotal - totalPEContribution).toLocaleString()})`
					);
					setSaving(false);
					return;
				}

				if (formData.TotalAmount > remainingAmount) {
					setError(
						`Total Amount (PKR ${formData.TotalAmount.toLocaleString()}) exceeds remaining available amount (PKR ${remainingAmount.toLocaleString()}). ` +
						`Total PE Contribution: PKR ${totalPEContribution.toLocaleString()}, ` +
						`Already used: PKR ${existingInterventionsTotal.toLocaleString()}`
					);
					setSaving(false);
					return;
				}
			}

			// Validation: For economic section, Total Amount should not exceed Investment From PE Program
			if (interventionType === "economic" && formData.TotalAmount && fdpEconomicRecords.length > 0) {
				const record = fdpEconomicRecords[0];
				const investmentFromPE = parseFloat(record.InvestmentFromPEProgram) || 0;

				// Calculate sum of existing interventions for the same Section and MemberID
				const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
					const amount = intervention.TotalAmount || 0;
					return sum + amount;
				}, 0);

				// Calculate remaining amount
				const remainingAmount = investmentFromPE - existingInterventionsTotal;

				// Check if new amount + existing total exceeds Investment From PE Program
				const newTotal = existingInterventionsTotal + formData.TotalAmount;

				if (newTotal > investmentFromPE) {
					setError(
						`Total intervention amount exceeds Investment From PE Program. ` +
						`Investment From PE Program: PKR ${investmentFromPE.toLocaleString()}, ` +
						`Existing interventions total: PKR ${existingInterventionsTotal.toLocaleString()}, ` +
						`Remaining available: PKR ${remainingAmount.toLocaleString()}, ` +
						`New amount: PKR ${formData.TotalAmount.toLocaleString()}. ` +
						`Total would be: PKR ${newTotal.toLocaleString()} (exceeds by PKR ${(newTotal - investmentFromPE).toLocaleString()})`
					);
					setSaving(false);
					return;
				}

				if (formData.TotalAmount > remainingAmount) {
					setError(
						`Total Amount (PKR ${formData.TotalAmount.toLocaleString()}) exceeds remaining available amount (PKR ${remainingAmount.toLocaleString()}). ` +
						`Investment From PE Program: PKR ${investmentFromPE.toLocaleString()}, ` +
						`Already used: PKR ${existingInterventionsTotal.toLocaleString()}`
					);
					setSaving(false);
					return;
				}

				// Also check if the amount itself exceeds the Investment From PE Program
				if (formData.TotalAmount > investmentFromPE) {
					setError(
						`Total Intervention Amount (PKR ${formData.TotalAmount.toLocaleString()}) cannot be greater than Investment From PE Program (PKR ${investmentFromPE.toLocaleString()}).`
					);
					setSaving(false);
					return;
				}
			}

			const response = await fetch("/api/actual-intervention/interventions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to create intervention");
			}

			// Refresh filtered interventions list
			if (formNumber && formData.Section && formData.MemberID) {
				const refreshResponse = await fetch(
					`/api/actual-intervention/interventions?formNumber=${encodeURIComponent(formNumber)}`
				);
				const refreshData = await refreshResponse.json().catch(() => ({}));

				if (refreshResponse.ok && refreshData.success) {
					const filtered = (refreshData.records || []).filter(
						(intervention: Intervention) =>
							intervention.Section === formData.Section &&
							intervention.MemberID === formData.MemberID
					);
					setFilteredInterventions(filtered);
				}
			}

			// Redirect to the family's intervention page
			router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}`);
		} catch (err) {
			console.error("Error creating intervention:", err);
			setError(err instanceof Error ? err.message : "Error creating intervention");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}`)}
						className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Add Intervention</h1>
						<p className="text-gray-600 mt-2">Form Number: {formNumber} {headName && `- ${headName}`}</p>
						{interventionType && (
							<p className="text-gray-500 text-sm mt-1">Section: {interventionType.charAt(0).toUpperCase() + interventionType.slice(1)}</p>
						)}
						{memberId && (
							<p className="text-gray-500 text-sm mt-1">
								Member ID: {memberId} {memberName && `- ${memberName}`} {memberCNIC && `| CNIC: ${memberCNIC}`}
							</p>
						)}
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
				</div>
			)}

			{/* FDP Economic Investment Information - Show when type is economic */}
			{interventionType === "economic" && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Investment Information - From FDP</h2>
					{loadingFdpEconomic ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b4d2b]"></div>
							<span className="ml-3 text-gray-600">Loading investment information...</span>
						</div>
					) : fdpEconomicRecords.length > 0 ? (
						<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
							{(() => {
								// Get the first record (most recent)
								const record = fdpEconomicRecords[0];
								return (
									<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
										<div className="bg-white rounded-lg p-4 border border-gray-200">
											<label className="block text-sm font-medium text-gray-600 mb-1">Field Of Investment</label>
											<p className="text-base font-semibold text-gray-900">{record.FieldOfInvestment || "N/A"}</p>
										</div>
										<div className="bg-white rounded-lg p-4 border border-gray-200">
											<label className="block text-sm font-medium text-gray-600 mb-1">Sub Field Of Investment</label>
											<p className="text-base font-semibold text-gray-900">{record.SubFieldOfInvestment || "N/A"}</p>
										</div>
										<div className="bg-white rounded-lg p-4 border border-gray-200">
											<label className="block text-sm font-medium text-gray-600 mb-1">Investment From PE Program</label>
											<p className="text-base font-semibold text-[#0b4d2b]">
												{record.InvestmentFromPEProgram 
													? `Rs. ${parseFloat(record.InvestmentFromPEProgram).toLocaleString()}` 
													: "N/A"}
											</p>
										</div>
										<div className="bg-white rounded-lg p-4 border border-gray-200">
											<label className="block text-sm font-medium text-gray-600 mb-1">Grant Amount</label>
											<p className="text-base font-semibold text-gray-900">
												{record.GrantAmount != null && parseFloat(record.GrantAmount) > 0
													? `Rs. ${parseFloat(record.GrantAmount).toLocaleString()}` 
													: "N/A"}
											</p>
										</div>
										<div className="bg-white rounded-lg p-4 border border-gray-200">
											<label className="block text-sm font-medium text-gray-600 mb-1">Loan Amount</label>
											<p className="text-base font-semibold text-gray-900">
												{record.LoanAmount != null && parseFloat(record.LoanAmount) > 0
													? `Rs. ${parseFloat(record.LoanAmount).toLocaleString()}` 
													: "N/A"}
											</p>
										</div>
									</div>
								);
							})()}
						</div>
					) : (
						<p className="text-gray-500 text-sm py-4">No investment information found for this member in FDP.</p>
					)}
				</div>
			)}

			{/* Housing Support Records Table - Show when type is habitat */}
			{interventionType === "habitat" && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Housing Support Records- From FDP</h2>
					{loadingHousingSupport ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0b4d2b]"></div>
							<span className="ml-3 text-gray-600">Loading housing support records...</span>
						</div>
					) : housingSupportRecords.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Type</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{housingSupportRecords.map((record) => (
										<tr key={record.FDP_HabitatSupportID} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_HabitatSupportID}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.HeadName || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.AreaType || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{record.HabitatMonthlyTotalCost ? `PKR ${parseFloat(record.HabitatMonthlyTotalCost).toLocaleString()}` : "-"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.HabitatNumberOfMonths || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{record.HabitatTotalCost ? `PKR ${parseFloat(record.HabitatTotalCost).toLocaleString()}` : "-"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{record.HabitatTotalPEContribution ? `PKR ${parseFloat(record.HabitatTotalPEContribution).toLocaleString()}` : "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-sm py-4">No housing support records found for this family.</p>
					)}
					{/* PE Contribution Summary */}
					{housingSupportRecords.length > 0 && formData.Section === "Habitat" && formData.MemberID && (
						<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h3 className="text-lg font-semibold text-gray-900 mb-3">PE Contribution Summary - Section Wise & Member Wise</h3>
							{(() => {
								const totalPEContribution = housingSupportRecords.reduce((sum, record) => {
									const peContribution = parseFloat(record.HabitatTotalPEContribution) || 0;
									return sum + peContribution;
								}, 0);

								const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
									const amount = intervention.TotalAmount || 0;
									return sum + amount;
								}, 0);

								const remainingAmount = totalPEContribution - existingInterventionsTotal;
								const newAmount = formData.TotalAmount || 0;
								const wouldBeTotal = existingInterventionsTotal + newAmount;

								return (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
										<div className="bg-white p-3 rounded border border-gray-200">
											<p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Total PE Contribution</p>
											<p className="text-xl font-bold text-gray-900">PKR {totalPEContribution.toLocaleString()}</p>
										</div>
										<div className="bg-white p-3 rounded border border-gray-200">
											<p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Existing Interventions Total</p>
											<p className="text-xl font-bold text-orange-600">PKR {existingInterventionsTotal.toLocaleString()}</p>
										</div>
										<div className="bg-white p-3 rounded border border-gray-200">
											<p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Remaining Available</p>
											<p className={`text-xl font-bold ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												PKR {remainingAmount.toLocaleString()}
											</p>
										</div>
										<div className="bg-white p-3 rounded border border-gray-200">
											<p className="text-xs text-gray-600 uppercase tracking-wide mb-1">New Amount</p>
											<p className="text-xl font-bold text-blue-600">PKR {newAmount.toLocaleString()}</p>
										</div>
									</div>
								);
							})()}
							{(() => {
								const totalPEContribution = housingSupportRecords.reduce((sum, record) => {
									const peContribution = parseFloat(record.HabitatTotalPEContribution) || 0;
									return sum + peContribution;
								}, 0);

								const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
									const amount = intervention.TotalAmount || 0;
									return sum + amount;
								}, 0);

								const newAmount = formData.TotalAmount || 0;
								const wouldBeTotal = existingInterventionsTotal + newAmount;

								if (newAmount > 0 && wouldBeTotal > totalPEContribution) {
									return (
										<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
											<p className="text-sm font-semibold text-red-800">
												⚠️ Warning: Total would exceed PE Contribution by PKR {(wouldBeTotal - totalPEContribution).toLocaleString()}
											</p>
										</div>
									);
								}

								return null;
							})()}
						</div>
					)}
				</div>
			)}

			{/* Add Intervention Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Form Number <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.FormNumber || ""}
									onChange={(e) => handleInputChange("FormNumber", e.target.value)}
									required
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
						)}

						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
								<input
									type="text"
									value={formData.Section || ""}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						)}

						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Intervention Category
									{(formData.Section === "Habitat" || formData.Section === "Education") && <span className="text-red-500"> *</span>}
								</label>
								{formData.Section === "Habitat" ? (
									<select
										value={formData.InterventionCategory || ""}
										onChange={(e) => handleInputChange("InterventionCategory", e.target.value)}
										required={formData.Section === "Habitat"}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Intervention Category</option>
										<option value="FOR HOME RENT">FOR HOME RENT</option>
										<option value="FOR UTILITIES">FOR UTILITIES</option>
										<option value="FOR MINOR/ESSENTIAL RENOVATION OF HOUSE (FOR SAFETY, WINTERIZATION ,WATER SUPPLY SYSTEM,TOILET ,KITCHEN)">FOR MINOR/ESSENTIAL RENOVATION OF HOUSE (FOR SAFETY, WINTERIZATION ,WATER SUPPLY SYSTEM,TOILET ,KITCHEN)</option>
										<option value="FOR RESETTLEMENT/MOVING TO A NEW HOUSE">FOR RESETTLEMENT/MOVING TO A NEW HOUSE</option>
									</select>
								) : formData.Section === "Education" ? (
									<select
										value={formData.InterventionCategory || ""}
										onChange={(e) => handleInputChange("InterventionCategory", e.target.value)}
										required={formData.Section === "Education"}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Intervention Category</option>
										<option value="Coaching / Tutoring / Bridge Program">Coaching / Tutoring / Bridge Program</option>
										<option value="School Fees for Tuition/ Children / Parent Education">School Fees for Tuition/ Children / Parent Education</option>
										<option value="New Admission for Out-of-School Student">New Admission for Out-of-School Student</option>
										<option value="In-Kind Support (Kits, Materials, Uniforms, Supplies)">In-Kind Support (Kits, Materials, Uniforms, Supplies)</option>
										<option value="School Van / Transportation / Hostel Fees">School Van / Transportation / Hostel Fees</option>
										<option value="Admission in the Same School (Existing Student)">Admission in the Same School (Existing Student)</option>
										<option value="Day-Care Support">Day-Care Support</option>
									</select>
								) : (
									<input
										type="text"
										value={formData.InterventionCategory || ""}
										onChange={(e) => handleInputChange("InterventionCategory", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								)}
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Main Intervention
							</label>
							<input
								type="text"
								value={formData.MainIntervention || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Intervention Status
							</label>
							<input
								type="text"
								value={formData.InterventionStatus || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Intervention Type
								{(formData.Section === "Habitat" || formData.Section === "Education") && <span className="text-red-500"> *</span>}
							</label>
							<select
								value={formData.InterventionType || ""}
								onChange={(e) => {
									handleInputChange("InterventionType", e.target.value);
									// Clear Financial Category when Intervention Type changes
									handleInputChange("FinancialCategory", "");
								}}
								required={formData.Section === "Habitat" || formData.Section === "Education"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Intervention Type</option>
								<option value="Financial">Financial</option>
								<option value="Non-Financial">Non-Financial</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Financial Category
								{(formData.Section === "Habitat" || formData.Section === "Education") && <span className="text-red-500"> *</span>}
							</label>
							<select
								value={formData.FinancialCategory || ""}
								onChange={(e) => handleInputChange("FinancialCategory", e.target.value)}
								disabled={!formData.InterventionType}
								required={formData.Section === "Habitat" || formData.Section === "Education"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">Select Financial Category</option>
								{formData.InterventionType === "Financial" && (
									<>
										<option value="Payment From PE Account">Payment From PE Account</option>
										<option value="Payment But Non-PE Account">Payment But Non-PE Account</option>
									</>
								)}
								{formData.InterventionType === "Non-Financial" && (
									<option value="No Payment Required">No Payment Required</option>
								)}
							</select>
							{formData.InterventionType === "Financial" && formData.FinancialCategory === "Payment From PE Account" && (
								<p className="mt-1 text-xs text-gray-500">Payment will be processed from the PE account. ROP can be developed for this intervention.</p>
							)}
							{formData.InterventionType === "Financial" && formData.FinancialCategory === "Payment But Non-PE Account" && (
								<p className="mt-1 text-xs text-gray-500">Payment will be made from a non-PE account. ROP is not allowed for this intervention.</p>
							)}
							{formData.InterventionType === "Non-Financial" && formData.FinancialCategory === "No Payment Required" && (
								<p className="mt-1 text-xs text-gray-500">No payment or financial transaction is involved. ROP is not required.</p>
							)}
						</div>

						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Amount Type</label>
								<input
									type="text"
									value={formData.AmountType || ""}
									onChange={(e) => handleInputChange("AmountType", e.target.value)}
									readOnly={
										formData.InterventionType === "Non-Financial" ||
										(formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")) ||
										(formData.Section === "Habitat" || formData.Section === "Food" || formData.Section === "Education" || formData.Section === "Health")
									}
									className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										formData.InterventionType === "Non-Financial" ||
										(formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")) ||
										(formData.Section === "Habitat" || formData.Section === "Food" || formData.Section === "Education" || formData.Section === "Health")
											? "bg-gray-100 text-gray-600 cursor-not-allowed"
											: ""
									}`}
								/>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Total Intervention Amount
								{(formData.Section === "Habitat" || formData.Section === "Education" || interventionType === "economic" || (formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account"))) && (
									<span className="text-red-500"> *</span>
								)}
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={formData.TotalAmount != null ? formData.TotalAmount : ""}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "") {
										handleInputChange("TotalAmount", null);
									} else {
										const numValue = parseFloat(value);
										// Only allow values >= 0
										if (!isNaN(numValue) && numValue >= 0) {
											handleInputChange("TotalAmount", numValue);
										}
									}
								}}
								required={formData.Section === "Habitat" || formData.Section === "Education" || interventionType === "economic" || (formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account"))}
								readOnly={formData.InterventionType === "Non-Financial"}
								className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
									formData.InterventionType === "Non-Financial" ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""
								}`}
							/>
							{formData.Section === "Habitat" && formData.MemberID && housingSupportRecords.length > 0 && (() => {
								const totalPEContribution = housingSupportRecords.reduce((sum, record) => {
									const peContribution = parseFloat(record.HabitatTotalPEContribution) || 0;
									return sum + peContribution;
								}, 0);

								const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
									const amount = intervention.TotalAmount || 0;
									return sum + amount;
								}, 0);

								const remainingAmount = totalPEContribution - existingInterventionsTotal;
								const newAmount = formData.TotalAmount || 0;
								const wouldBeTotal = existingInterventionsTotal + newAmount;

								return (
									<div className="mt-2">
										<p className="text-xs text-gray-600">
											Remaining available: <span className={`font-semibold ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												PKR {remainingAmount.toLocaleString()}
											</span>
											{newAmount > 0 && (
												<span className="ml-2">
													| Total would be: <span className={`font-semibold ${wouldBeTotal <= totalPEContribution ? 'text-blue-600' : 'text-red-600'}`}>
														PKR {wouldBeTotal.toLocaleString()}
													</span>
												</span>
											)}
										</p>
										{newAmount > 0 && wouldBeTotal > totalPEContribution && (
											<p className="text-xs text-red-600 font-medium mt-1">
												⚠️ This amount would exceed the PE Contribution limit by PKR {(wouldBeTotal - totalPEContribution).toLocaleString()}
											</p>
										)}
									</div>
								);
							})()}
							{interventionType === "economic" && fdpEconomicRecords.length > 0 && (() => {
								const record = fdpEconomicRecords[0];
								const investmentFromPE = parseFloat(record.InvestmentFromPEProgram) || 0;

								const existingInterventionsTotal = filteredInterventions.reduce((sum, intervention) => {
									const amount = intervention.TotalAmount || 0;
									return sum + amount;
								}, 0);

								const remainingAmount = investmentFromPE - existingInterventionsTotal;
								const newAmount = formData.TotalAmount || 0;
								const wouldBeTotal = existingInterventionsTotal + newAmount;

								return (
									<div className="mt-2">
										<p className="text-xs text-gray-600">
											Investment From PE Program: <span className="font-semibold text-[#0b4d2b]">
												PKR {investmentFromPE.toLocaleString()}
											</span>
											{existingInterventionsTotal > 0 && (
												<span className="ml-2">
													| Already used: <span className="font-semibold text-orange-600">
														PKR {existingInterventionsTotal.toLocaleString()}
													</span>
												</span>
											)}
										</p>
										<p className="text-xs text-gray-600 mt-1">
											Remaining available: <span className={`font-semibold ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												PKR {remainingAmount.toLocaleString()}
											</span>
											{newAmount > 0 && (
												<span className="ml-2">
													| Total would be: <span className={`font-semibold ${wouldBeTotal <= investmentFromPE ? 'text-blue-600' : 'text-red-600'}`}>
														PKR {wouldBeTotal.toLocaleString()}
													</span>
												</span>
											)}
										</p>
										{newAmount > 0 && (newAmount > investmentFromPE || wouldBeTotal > investmentFromPE) && (
											<p className="text-xs text-red-600 font-medium mt-1">
												⚠️ {newAmount > investmentFromPE 
													? `This amount exceeds Investment From PE Program by PKR ${(newAmount - investmentFromPE).toLocaleString()}`
													: `This amount would exceed Investment From PE Program by PKR ${(wouldBeTotal - investmentFromPE).toLocaleString()}`
												}
											</p>
										)}
									</div>
								);
							})()}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
							<input
								type="date"
								value={formData.InterventionStartDate ? formData.InterventionStartDate.split('T')[0] : new Date().toISOString().split('T')[0]}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								End Date
								{(formData.Section === "Habitat" || formData.Section === "Education") && <span className="text-red-500"> *</span>}
							</label>
							<input
								type="date"
								value={formData.InterventionEndDate ? formData.InterventionEndDate.split('T')[0] : ""}
								onChange={(e) => handleInputChange("InterventionEndDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
								min={new Date().toISOString().split('T')[0]}
								required={formData.Section === "Habitat" || formData.Section === "Education"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
								<input
									type="text"
									value={formData.MemberID || ""}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						)}

						{interventionType !== "habitat" && formData.Section !== "Education" && interventionType !== "economic" && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Main Trade</label>
									<input
										type="text"
										value={formData.MainTrade || ""}
										onChange={(e) => handleInputChange("MainTrade", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Sub Trades</label>
									<input
										type="text"
										value={formData.SubTrades || ""}
										onChange={(e) => handleInputChange("SubTrades", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Specialty Trade</label>
									<input
										type="text"
										value={formData.SpecialtyTrade || ""}
										onChange={(e) => handleInputChange("SpecialtyTrade", e.target.value)}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</>
						)}

						{interventionType !== "economic" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
								<input
									type="text"
									value={memberCNIC || ""}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
							<input
								type="text"
								value={formData.ApprovalStatus || ""}
								onChange={(e) => handleInputChange("ApprovalStatus", e.target.value)}
								readOnly
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
							<textarea
								value={formData.Remarks || ""}
								onChange={(e) => handleInputChange("Remarks", e.target.value)}
								rows={3}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>
					</div>

					<div className="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onClick={() => router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}`)}
							className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22] disabled:opacity-50"
						>
							<Save className="h-4 w-4" />
							{saving ? "Saving..." : "Save"}
						</button>
					</div>
				</form>
			</div>

			{/* Filtered Interventions Table - Show when Section and MemberID match */}
			{formData.Section && formData.MemberID && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-xl font-semibold text-gray-900">
							Existing Interventions - {formData.Section} ({formData.MemberID})
						</h2>
						<p className="text-sm text-gray-600 mt-1">
							Showing interventions with matching Section and Member ID
						</p>
					</div>
					{loadingInterventions ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
							<span className="ml-3 text-gray-600">Loading interventions...</span>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-[#0b4d2b]">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Form Number
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Section
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Status
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Category
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Main Intervention
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Type
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Financial Category
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Total Amount
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Start Date
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											End Date
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Member ID
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
											Approval Status
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredInterventions.length === 0 ? (
										<tr>
											<td colSpan={13} className="px-4 py-8 text-center text-gray-500">
												No interventions found for this Section and Member ID.
											</td>
										</tr>
									) : (
										filteredInterventions.map((intervention) => (
											<tr key={intervention.InterventionID} className="hover:bg-gray-50 transition-colors">
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
												<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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
										))
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function AddInterventionPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				</div>
			}
		>
			<AddInterventionContent />
		</Suspense>
	);
}
