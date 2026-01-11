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

			const response = await fetch("/api/actual-intervention/interventions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to create intervention");
			}

			alert("Intervention created successfully!");
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
						<p className="text-gray-600 mt-2">Form Number: {formNumber}</p>
						{interventionType && (
							<p className="text-gray-500 text-sm mt-1">Section: {interventionType.charAt(0).toUpperCase() + interventionType.slice(1)}</p>
						)}
						{memberId && (
							<p className="text-gray-500 text-sm mt-1">Member ID: {memberId}</p>
						)}
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
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
								onChange={(e) => handleInputChange("Section", e.target.value)}
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
								onChange={(e) => handleInputChange("InterventionStatus", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
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
							<label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
							<input
								type="text"
								value={formData.SubCategory || ""}
								onChange={(e) => handleInputChange("SubCategory", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Framework Dimensions
							</label>
							<input
								type="text"
								value={formData.FrameworkDimensions || ""}
								onChange={(e) => handleInputChange("FrameworkDimensions", e.target.value)}
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
								Intervention Type
							</label>
							<input
								type="text"
								value={formData.InterventionType || ""}
								onChange={(e) => handleInputChange("InterventionType", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Financial Category
							</label>
							<input
								type="text"
								value={formData.FinancialCategory || ""}
								onChange={(e) => handleInputChange("FinancialCategory", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
							<input
								type="number"
								value={formData.Frequency || ""}
								onChange={(e) => handleInputChange("Frequency", e.target.value ? parseInt(e.target.value) : null)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Frequency Unit</label>
							<input
								type="text"
								value={formData.FrequencyUnit || ""}
								onChange={(e) => handleInputChange("FrequencyUnit", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
							<input
								type="number"
								step="0.01"
								value={formData.Amount || ""}
								onChange={(e) => handleInputChange("Amount", e.target.value ? parseFloat(e.target.value) : null)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
							<input
								type="number"
								step="0.01"
								value={formData.TotalAmount || ""}
								onChange={(e) => handleInputChange("TotalAmount", e.target.value ? parseFloat(e.target.value) : null)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
							<input
								type="date"
								value={formData.InterventionStartDate ? formData.InterventionStartDate.split('T')[0] : new Date().toISOString().split('T')[0]}
								onChange={(e) => handleInputChange("InterventionStartDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
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
								onChange={(e) => handleInputChange("MemberID", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

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

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
							<input
								type="text"
								value={formData.CNIC || ""}
								onChange={(e) => handleInputChange("CNIC", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Amount Type</label>
							<input
								type="text"
								value={formData.AmountType || ""}
								onChange={(e) => handleInputChange("AmountType", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
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
