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
	FrameworkDimensions: string | null;
	MainIntervention: string | null;
	InterventionType: string | null;
	FinancialCategory: string | null;
	Frequency: number | null;
	FrequencyUnit: string | null;
	Amount: number | null;
	TotalAmount: number | null;
	InterventionStartDate: string | null;
	InterventionEndDate: string | null;
	Remarks: string | null;
	MemberID: string | null;
	MainTrade: string | null;
	SubTrades: string | null;
	SpecialtyTrade: string | null;
	CNIC: string | null;
	AmountType: string | null;
	ApprovalStatus: string | null;
	CreatedBy: string | null;
	CreatedAt: string | null;
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
	const [headName, setHeadName] = useState<string>("");
	const [housingSupportRecords, setHousingSupportRecords] = useState<any[]>([]);
	const [loadingHousingSupport, setLoadingHousingSupport] = useState(false);
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
						const member = data.members.find((m: any) => m.MemberNo === memberId);
						if (member) {
							if (member.BFormOrCNIC) {
								setFormData(prev => ({
									...prev,
									CNIC: member.BFormOrCNIC,
								}));
							}
							if (member.FullName) {
								setMemberName(member.FullName);
							}
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

	const handleInputChange = (field: keyof Intervention, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setSaving(true);
			setError(null);

			// Validation: Total Amount is required for Financial interventions with payment categories
			if (formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")) {
				if (!formData.TotalAmount || formData.TotalAmount <= 0) {
					setError("Total Intervention Amount is required for Financial interventions with payment categories.");
					setSaving(false);
					return;
				}
			}

			// Validation: For habitat section, Total Amount should not exceed Total PE Contribution
			if (interventionType === "habitat" && formData.TotalAmount) {
				const totalPEContribution = housingSupportRecords.reduce((sum, record) => {
					const peContribution = parseFloat(record.HabitatTotalPEContribution) || 0;
					return sum + peContribution;
				}, 0);

				if (formData.TotalAmount > totalPEContribution) {
					setError(`Total Amount (PKR ${formData.TotalAmount.toLocaleString()}) cannot exceed Total PE Contribution (PKR ${totalPEContribution.toLocaleString()}) from Housing Support records.`);
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
							<p className="text-gray-500 text-sm mt-1">Member ID: {memberId} {memberName && `- ${memberName}`}</p>
						)}
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
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
				</div>
			)}

			{/* Add Intervention Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
							<input
								type="text"
								value={formData.Section || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Intervention Category
							</label>
							<input
								type="text"
								value={formData.InterventionCategory || ""}
								onChange={(e) => handleInputChange("InterventionCategory", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Main Intervention
							</label>
							<input
								type="text"
								value={formData.MainIntervention || ""}
								onChange={(e) => handleInputChange("MainIntervention", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
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
							</label>
							<select
								value={formData.InterventionType || ""}
								onChange={(e) => {
									handleInputChange("InterventionType", e.target.value);
									// Clear Financial Category when Intervention Type changes
									handleInputChange("FinancialCategory", "");
								}}
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
							</label>
							<select
								value={formData.FinancialCategory || ""}
								onChange={(e) => handleInputChange("FinancialCategory", e.target.value)}
								disabled={!formData.InterventionType}
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

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Total Intervention Amount
								{(formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")) && (
									<span className="text-red-500"> *</span>
								)}
							</label>
							<input
								type="number"
								step="0.01"
								value={formData.TotalAmount != null ? formData.TotalAmount : ""}
								onChange={(e) => handleInputChange("TotalAmount", e.target.value ? parseFloat(e.target.value) : null)}
								required={formData.InterventionType === "Financial" && (formData.FinancialCategory === "Payment From PE Account" || formData.FinancialCategory === "Payment But Non-PE Account")}
								readOnly={formData.InterventionType === "Non-Financial"}
								className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
									formData.InterventionType === "Non-Financial" ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""
								}`}
							/>
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
							<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
							<input
								type="date"
								value={formData.InterventionEndDate ? formData.InterventionEndDate.split('T')[0] : ""}
								onChange={(e) => handleInputChange("InterventionEndDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
								min={new Date().toISOString().split('T')[0]}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
							<input
								type="text"
								value={formData.MemberID || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

						{interventionType !== "habitat" && (
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

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
							<input
								type="text"
								value={formData.CNIC || ""}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>

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
