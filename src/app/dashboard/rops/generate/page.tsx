"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasRouteAccess, hasFullAccess } from "@/lib/auth-utils";
import { FileBarChart, ArrowLeft, XCircle } from "lucide-react";

function GenerateROPContent() {
	const { userProfile } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	
	const formNumber = searchParams.get("formNumber");
	const memberId = searchParams.get("memberId");

	const [interventions, setInterventions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [headName, setHeadName] = useState<string>("");
	const [memberName, setMemberName] = useState<string>("");
	const [section, setSection] = useState<string | null>(null);
	
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

	// Check route access
	useEffect(() => {
		if (!userProfile) return;
		
		const userType = userProfile.access_level;
		const hasFullAccessToAll = hasFullAccess(
			userProfile.username,
			userProfile.supper_user,
			userType
		);
		
		if (hasFullAccessToAll) {
			return;
		}
		
		const currentRoute = '/dashboard/rops';
		if (!hasRouteAccess(userType, currentRoute)) {
			router.push('/dashboard');
		}
	}, [userProfile, router]);

	// Validate required params and fetch data
	useEffect(() => {
		if (!formNumber || !memberId) {
			setError("Form Number and Member ID are required");
			setLoading(false);
			return;
		}
		fetchGenerateInfo();
		fetchInterventions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formNumber, memberId]);

	// Update monthOfPayment and paymentType when section changes
	useEffect(() => {
		if (section) {
			const monthOfPayment = calculateMonthOfPayment(section);
			const sectionLower = section.toLowerCase().trim();
			const defaultPaymentType = (sectionLower === "social support" || sectionLower === "social") ? "Grant" : "";
			
			setRopFormData(prev => ({
				...prev,
				monthOfPayment: monthOfPayment,
				paymentType: defaultPaymentType
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [section]);

	// Fetch head name, member name, and section
	const fetchGenerateInfo = async () => {
		if (!formNumber || !memberId) return;

		try {
			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			params.append("memberId", memberId);

			const response = await fetch(`/api/rops/generate-info?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (response.ok && data.success) {
				setHeadName(data.headName || "N/A");
				setMemberName(data.memberName || "N/A");
				setSection(data.section || null);
			}
		} catch (err) {
			console.error("Error fetching generate info:", err);
		}
	};

	// Calculate month of payment based on section
	const calculateMonthOfPayment = (sectionValue: string | null): string => {
		if (!sectionValue) return "";

		const now = new Date();
		const sectionLower = sectionValue.toLowerCase().trim();

		// Check if section is Economic
		if (sectionLower === "economic") {
			// Current month - first day
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, "0");
			return `${year}-${month}`;
		}

		// Check if section is Social Support or Social
		if (sectionLower === "social support" || sectionLower === "social") {
			// Next month - first day
			const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			const year = nextMonth.getFullYear();
			const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
			return `${year}-${month}`;
		}

		// Default to current month if section doesn't match
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		return `${year}-${month}`;
	};

	const fetchInterventions = async () => {
		if (!formNumber || !memberId) return;

		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			params.append("formNumber", formNumber);
			params.append("memberId", memberId);

			const response = await fetch(`/api/rops/interventions?${params.toString()}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setError(data?.message || "Failed to load interventions");
				return;
			}

			const interventionsData = data.records || [];
			
			// Get section from first intervention if not already set
			const primarySection = section || interventionsData[0]?.Section || null;
			setSection(primarySection);

			// Initialize form data with interventions - filter out any without valid InterventionID
			const interventionsWithAmounts = interventionsData
				.filter((intervention: any) => {
					// Filter out interventions without valid InterventionID
					// Accept both string and number types, but ensure it's not null/undefined/empty
					const interventionID = intervention.InterventionID;
					const hasValidID = interventionID !== null && 
						interventionID !== undefined && 
						String(interventionID).trim() !== '';
					
					if (!hasValidID) {
						console.warn("Skipping intervention with invalid InterventionID:", intervention);
					}
					
					return hasValidID;
				})
				.map((intervention: any) => ({
					InterventionID: String(intervention.InterventionID).trim(),
					Section: intervention.Section ? String(intervention.Section).trim() : null,
					PayableAmount: parseFloat(intervention.TotalAmount) || 0,
					PayAmount: parseFloat(intervention.TotalAmount) || 0 // Default to full amount
				}));

			// Check if any valid interventions remain
			if (interventionsWithAmounts.length === 0) {
				setError("No valid interventions found. All interventions must have a valid InterventionID.");
				return;
			}

			// Calculate month of payment based on section
			const monthOfPayment = calculateMonthOfPayment(primarySection);
			
			// Determine default payment type based on section
			const sectionLower = primarySection?.toLowerCase().trim() || "";
			const defaultPaymentType = (sectionLower === "social support" || sectionLower === "social") ? "Grant" : "";

			setInterventions(interventionsData);
			setRopFormData({
				monthOfPayment: monthOfPayment,
				paymentType: defaultPaymentType,
				remarks: "",
				interventions: interventionsWithAmounts
			});
		} catch (err) {
			console.error("Error fetching interventions for ROP:", err);
			setError("Error fetching interventions");
		} finally {
			setLoading(false);
		}
	};

	const handleROPFormChange = (field: string, value: string) => {
		// Prevent changing monthOfPayment if it's read-only
		if (field === "monthOfPayment" && section) {
			return;
		}
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
		if (!formNumber || !memberId) {
			setError("Form Number and Member ID are required");
			return;
		}

		// Validate MonthOfPayment
		if (!ropFormData.monthOfPayment || ropFormData.monthOfPayment.trim() === '') {
			setError("Month of Payment is required");
			return;
		}

		// Validate MonthOfPayment format (should be YYYY-MM)
		const monthPattern = /^\d{4}-\d{2}$/;
		if (!monthPattern.test(ropFormData.monthOfPayment)) {
			setError(`Invalid Month of Payment format: ${ropFormData.monthOfPayment}. Expected format: YYYY-MM (e.g., 2026-01)`);
			return;
		}

		if (ropFormData.interventions.length === 0) {
			setError("No interventions available to generate ROP");
			return;
		}

		// Validate all intervention amounts
		for (const intervention of ropFormData.interventions) {
			if (intervention.PayAmount < 0 || intervention.PayAmount > intervention.PayableAmount) {
				setError(`PayAmount for ${intervention.InterventionID} must be between 0 and ${intervention.PayableAmount}`);
				return;
			}
		}

		try {
			setSubmittingROP(true);
			setError(null);
			setRopSuccess(false);

			// Determine payment type - if Social, must be Grant
			const sectionLower = section?.toLowerCase().trim() || "";
			const finalPaymentType = (sectionLower === "social support" || sectionLower === "social") 
				? "Grant" 
				: (ropFormData.paymentType || null);

			// Validate interventions before preparing items
			for (const intervention of ropFormData.interventions) {
				if (!intervention.InterventionID || String(intervention.InterventionID).trim() === '') {
					setError(`InterventionID is missing or empty for one of the interventions. Please refresh the page and try again.`);
					return;
				}
			}

			// Prepare items for API
			// Ensure MonthOfPayment is in correct format (YYYY-MM from month input)
			const monthOfPaymentValue = String(ropFormData.monthOfPayment || '').trim();
			if (!monthOfPaymentValue || !/^\d{4}-\d{2}$/.test(monthOfPaymentValue)) {
				setError(`Invalid Month of Payment format: ${monthOfPaymentValue}. Expected format: YYYY-MM`);
				return;
			}

			const items = ropFormData.interventions.map((intervention, index) => {
				const originalIntervention = interventions.find((int: any) => int.InterventionID === intervention.InterventionID);
				
				// Ensure InterventionID is a valid string
				const interventionID = String(intervention.InterventionID || '').trim();
				if (!interventionID) {
					throw new Error(`InterventionID is missing for intervention ${index + 1} with Section: ${intervention.Section}`);
				}
				
				const item = {
					FormNumber: String(formNumber || '').trim(),
					BeneficiaryID: String(memberId || '').trim(),
					InterventionID: interventionID,
					InterventionSection: intervention.Section ? String(intervention.Section).trim() : null,
					PayableAmount: intervention.PayableAmount,
					MonthOfPayment: monthOfPaymentValue, // Value from month input textbox (YYYY-MM format)
					PaymentType: finalPaymentType,
					PayAmount: intervention.PayAmount,
					Remarks: ropFormData.remarks ? String(ropFormData.remarks).trim() : null
				};

				// Temporary debug logging for formNumber PE-00006
				if (formNumber === "PE-00006") {
					console.log(`[DEBUG PE-00006] Item ${index + 1}:`, {
						InterventionID: item.InterventionID,
						InterventionID_type: typeof item.InterventionID,
						InterventionID_length: item.InterventionID.length,
						FormNumber: item.FormNumber,
						BeneficiaryID: item.BeneficiaryID,
						MonthOfPayment: item.MonthOfPayment,
						MonthOfPayment_type: typeof item.MonthOfPayment
					});
				}

				return item;
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
				setError(data?.message || "Failed to generate ROP");
				return;
			}

			setRopSuccess(true);
			
			// Redirect back to ROPs page after 2 seconds
			setTimeout(() => {
				router.push("/dashboard/rops");
			}, 2000);

		} catch (err) {
			console.error("Error submitting ROP:", err);
			const errorMessage = err instanceof Error ? err.message : String(err);
			setError(`Error generating ROP: ${errorMessage}. Please check that all interventions have valid InterventionIDs and try again.`);
		} finally {
			setSubmittingROP(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<p className="mt-4 text-gray-600 font-medium">Loading interventions...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.push("/dashboard/rops")}
						className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent flex items-center gap-3">
							<FileBarChart className="h-8 w-8 text-[#0b4d2b]" />
							Generate ROP
						</h1>
						<p className="text-gray-600 mt-2 font-medium">
							Form Number: <span className="font-semibold">{formNumber}</span>
							{headName && (
								<> | Head: <span className="font-semibold">{headName}</span></>
							)}
							{memberId && (
								<> | Member: <span className="font-semibold">{memberId}</span></>
							)}
							{memberName && memberName !== "N/A" && (
								<> - <span className="font-semibold">{memberName}</span></>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Error Message */}
			{error && !ropSuccess && (
				<div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
					<div className="flex items-center gap-3">
						<XCircle className="h-5 w-5 text-red-600" />
						<p className="text-red-600 text-sm font-semibold">Error: {error}</p>
					</div>
				</div>
			)}

			{/* Success Message */}
			{ropSuccess && (
				<div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h4 className="text-lg font-semibold text-green-900 mb-2">ROP Generated Successfully!</h4>
					<p className="text-green-700">
						{ropFormData.interventions.length} ROP record(s) have been created and submitted for approval.
					</p>
					<p className="text-sm text-green-600 mt-2">Redirecting back to ROPs page...</p>
				</div>
			)}

			{/* Form */}
			{!ropSuccess && (
				<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
					{/* Form Fields */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						{/* Month of Payment */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Month of Payment <span className="text-red-500">*</span>
							</label>
							<input
								type="month"
								value={ropFormData.monthOfPayment}
								onChange={(e) => handleROPFormChange("monthOfPayment", e.target.value)}
								readOnly={!!section}
								disabled={!!section}
								className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none ${
									section ? "bg-gray-100 cursor-not-allowed" : ""
								}`}
								required
							/>
						</div>

						{/* Payment Type */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Payment Type
							</label>
							{(section && (section.toLowerCase().trim() === "social support" || section.toLowerCase().trim() === "social")) ? (
								<input
									type="text"
									value="Grant"
									readOnly
									disabled
									className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
								/>
							) : (
								<select
									value={ropFormData.paymentType}
									onChange={(e) => handleROPFormChange("paymentType", e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								>
									<option value="">Select Payment Type</option>
									<option value="Loan">Loan</option>
									<option value="Grant">Grant</option>
								</select>
							)}
						</div>
					</div>

					{/* Remarks */}
					<div className="mb-6">
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
						<div className="mb-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Interventions</h3>
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
											<tr key={intervention.InterventionID} className={index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
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
						</div>
					) : (
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-6">
							<p className="text-gray-600">No interventions available for this member.</p>
						</div>
					)}

					{/* Submit Button */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.push("/dashboard/rops")}
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
				</div>
			)}
		</div>
	);
}

export default function GenerateROPPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
						<p className="mt-4 text-gray-600 font-medium">Loading...</p>
					</div>
				</div>
			}
		>
			<GenerateROPContent />
		</Suspense>
	);
}
