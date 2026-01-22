"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type CRCFamilyStatusFormData = {
	Family_Status_Id?: number;
	Form_Number: string;
	Family_Status_Level: string;
	Mentor: string;
	Family_Mentor: string;
	Application_Date: string;
	FDP_Approved_Date: string;
	Self_Sufficient_Date: string;
	Graduated_Date: string;
	Dropout_Date: string;
	Program_Type: string;
	Family_From: string;
	Dropout_Category: string;
	Community_Affiliation: string;
	Application_Status: string;
	FDP_Development_Status: string;
	FDP_Development_Date: string;
	CRC_Approval_Status: string;
	CRC_Approval_Date: string;
	Intervention_Status: string;
	Intervention_Start_Date: string;
	Remarks: string;
};

function CRCFamilyStatusFormContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const familyStatusId = searchParams.get("familyStatusId");

	const isEditMode = !!familyStatusId;
	const { userProfile } = useAuth();

	const [formData, setFormData] = useState<CRCFamilyStatusFormData>({
		Form_Number: formNumber || "",
		Family_Status_Level: "Approved",
		Mentor: "",
		Family_Mentor: "",
		Application_Date: "",
		FDP_Approved_Date: "",
		Self_Sufficient_Date: "",
		Graduated_Date: "",
		Dropout_Date: "",
		Program_Type: "",
		Family_From: "",
		Dropout_Category: "",
		Community_Affiliation: "",
		Application_Status: "",
		FDP_Development_Status: "",
		FDP_Development_Date: "",
		CRC_Approval_Status: "",
		CRC_Approval_Date: "",
		Intervention_Status: "",
		Intervention_Start_Date: "",
		Remarks: "",
	});

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Fetch Mentor and dates from API when formNumber is available
	useEffect(() => {
		if (formNumber && !isEditMode) {
			const fetchData = async () => {
				try {
					const response = await fetch(
						`/api/family-development-plan/crc-family-status?formNumber=${encodeURIComponent(formNumber)}`
					);
					const result = await response.json();

					if (result.success) {
						// Set today's date for CRC Approval Date
						const today = new Date().toISOString().split('T')[0];
						// Format SubmittedAt date if available
						const applicationDate = result.submittedAt 
							? new Date(result.submittedAt).toISOString().split('T')[0] 
							: "";
						// Format FDP Approved Date if available
						const fdpApprovedDate = result.fdpApprovedDate 
							? new Date(result.fdpApprovedDate).toISOString().split('T')[0] 
							: "";
						// Format FDP Development Date if available
						const fdpDevelopmentDate = result.fdpDevelopmentDate 
							? new Date(result.fdpDevelopmentDate).toISOString().split('T')[0] 
							: "";
						
						setFormData((prev) => ({
							...prev,
							Mentor: result.mentor || "",
							Family_Mentor: result.mentor || "",
							CRC_Approval_Date: today,
							Application_Date: applicationDate,
							FDP_Approved_Date: fdpApprovedDate,
							FDP_Development_Date: fdpDevelopmentDate,
						}));
					} else {
						// Still set today's date even if fetch fails
						const today = new Date().toISOString().split('T')[0];
						setFormData((prev) => ({
							...prev,
							CRC_Approval_Date: today,
						}));
					}
				} catch (err: any) {
					console.error("Error fetching data:", err);
					// Set today's date even if there's an error
					const today = new Date().toISOString().split('T')[0];
					setFormData((prev) => ({
						...prev,
						CRC_Approval_Date: today,
					}));
				}
			};

			fetchData();
		} else if (!isEditMode) {
			// Set today's date for CRC Approval Date even if formNumber is not available yet
			const today = new Date().toISOString().split('T')[0];
			setFormData((prev) => ({
				...prev,
				CRC_Approval_Date: today,
			}));
		}
	}, [formNumber, isEditMode]);

	// Fetch existing data if in edit mode
	useEffect(() => {
		if (isEditMode && familyStatusId) {
			const fetchData = async () => {
				try {
					setLoading(true);
					const response = await fetch(
						`/api/family-development-plan/crc-family-status?familyStatusId=${encodeURIComponent(familyStatusId)}`
					);
					const result = await response.json();

					if (result.success && result.data) {
						const data = result.data;
						// Use mentor from API if available, otherwise use existing value
						const mentorValue = result.mentor || data.Mentor || "";
						// Use SubmittedAt from API if available, otherwise use existing Application_Date
						const applicationDate = result.submittedAt 
							? new Date(result.submittedAt).toISOString().split('T')[0]
							: (data.Application_Date ? new Date(data.Application_Date).toISOString().split('T')[0] : "");
						// Use FDP Approved Date from API if available, otherwise use existing value
						const fdpApprovedDate = result.fdpApprovedDate 
							? new Date(result.fdpApprovedDate).toISOString().split('T')[0]
							: (data.FDP_Approved_Date ? new Date(data.FDP_Approved_Date).toISOString().split('T')[0] : "");
						// Use FDP Development Date from API if available, otherwise use existing value
						const fdpDevelopmentDate = result.fdpDevelopmentDate 
							? new Date(result.fdpDevelopmentDate).toISOString().split('T')[0]
							: (data.FDP_Development_Date ? new Date(data.FDP_Development_Date).toISOString().split('T')[0] : "");
						setFormData({
							Family_Status_Id: data.Family_Status_Id,
							Form_Number: data.Form_Number || "",
							Family_Status_Level: "Approved",
							Mentor: mentorValue,
							Family_Mentor: mentorValue,
							Application_Date: applicationDate,
							FDP_Approved_Date: fdpApprovedDate,
							Self_Sufficient_Date: data.Self_Sufficient_Date ? new Date(data.Self_Sufficient_Date).toISOString().split('T')[0] : "",
							Graduated_Date: data.Graduated_Date ? new Date(data.Graduated_Date).toISOString().split('T')[0] : "",
							Dropout_Date: data.Dropout_Date ? new Date(data.Dropout_Date).toISOString().split('T')[0] : "",
							Program_Type: data.Program_Type || "",
							Family_From: data.Family_From || "",
							Dropout_Category: data.Dropout_Category || "",
							Community_Affiliation: data.Community_Affiliation || "",
							Application_Status: data.Application_Status || "",
							FDP_Development_Status: data.FDP_Development_Status || "",
							FDP_Development_Date: fdpDevelopmentDate,
							CRC_Approval_Status: data.CRC_Approval_Status || "",
							CRC_Approval_Date: data.CRC_Approval_Date ? new Date(data.CRC_Approval_Date).toISOString().split('T')[0] : "",
							Intervention_Status: data.Intervention_Status || "",
							Intervention_Start_Date: data.Intervention_Start_Date ? new Date(data.Intervention_Start_Date).toISOString().split('T')[0] : "",
							Remarks: data.Remarks || "",
						});
					} else {
						setError(result.message || "Failed to load data");
					}
				} catch (err: any) {
					console.error("Error fetching data:", err);
					setError(err.message || "Error fetching data");
				} finally {
					setLoading(false);
				}
			};

			fetchData();
		}
	}, [isEditMode, familyStatusId]);

	const handleInputChange = (field: keyof CRCFamilyStatusFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setError(null);
		setSuccess(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			const url = isEditMode
				? "/api/family-development-plan/crc-family-status"
				: "/api/family-development-plan/crc-family-status";
			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push(`/dashboard/family-development-plan/crc-approval?formNumber=${encodeURIComponent(formData.Form_Number)}`);
				}, 1500);
			} else {
				setError(result.message || "Failed to save data");
			}
		} catch (err: any) {
			console.error("Error saving data:", err);
			setError(err.message || "Error saving data");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.push(`/dashboard/family-development-plan/crc-approval?formNumber=${encodeURIComponent(formData.Form_Number || formNumber || "")}`)}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{isEditMode ? "Edit CRC Family Status" : "Add CRC Family Status"}
						</h1>
						<p className="text-gray-600 mt-2">
							{formNumber && <span>Form Number: {formNumber}</span>}
						</p>
					</div>
				</div>
			</div>

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-green-600" />
					<p className="text-green-700">
						{isEditMode ? "Record updated successfully!" : "Record created successfully!"}
					</p>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
					<AlertCircle className="h-5 w-5 text-red-600" />
					<p className="text-red-700">{error}</p>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
				<div className="space-y-6">
					{/* Basic Information Section */}
					<div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Form Number <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.Form_Number}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Current Mentor
								</label>
								<input
									type="text"
									value={formData.Mentor}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Intake Family Mentor
								</label>
								<input
									type="text"
									value={formData.Family_Mentor}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Program Type
								</label>
								<select
									value={formData.Program_Type}
									onChange={(e) => handleInputChange("Program_Type", e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-1 focus:ring-[#0b4d2b]"
								>
									<option value="">Select Program Type</option>
									<option value="FDP-Full">FDP-Full - Family Development Plan-Full</option>
									<option value="CEDP">CEDP — Community Economic Development Programme</option>
									<option value="CEDP-Convert into FDP-Full">CEDP-Convert into FDP-Full</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Family From
								</label>
								<select
									value={formData.Family_From}
									onChange={(e) => handleInputChange("Family_From", e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-1 focus:ring-[#0b4d2b]"
								>
									<option value="">Select Family From</option>
									<option value="Application">Application</option>
									<option value="SWB">SWB - Social Welfare Board</option>
									<option value="EPB">EPB - Economic Planning Board</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Community Affiliation
								</label>
								<select
									value={formData.Community_Affiliation}
									onChange={(e) => handleInputChange("Community_Affiliation", e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-1 focus:ring-[#0b4d2b]"
								>
									<option value="">Select Community Affiliation</option>
									<option value="Jamati Member">Jamati Member</option>
									<option value="Non-Jamati Member">Non-Jamati Member</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Family Current Status
								</label>
								<input
									type="text"
									value="Approved"
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

						</div>
					</div>

					{/* Dates Section */}
					<div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Application Date
								</label>
								<input
									type="date"
									value={formData.Application_Date}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									FDP Approved Date
								</label>
								<input
									type="date"
									value={formData.FDP_Approved_Date}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									FDP Development Date
								</label>
								<input
									type="date"
									value={formData.FDP_Development_Date}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									CRC Approval Date
								</label>
								<input
									type="date"
									value={formData.CRC_Approval_Date}
									readOnly
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
								/>
							</div>


						</div>
					</div>

					{/* Remarks Section */}
					<div>
						<h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
							Additional Information
						</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Remarks
							</label>
							<textarea
								value={formData.Remarks}
								onChange={(e) => handleInputChange("Remarks", e.target.value)}
								rows={4}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-1 focus:ring-[#0b4d2b]"
								placeholder="Enter any additional remarks or notes..."
							/>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.push(`/dashboard/family-development-plan/crc-approval?formNumber=${encodeURIComponent(formData.Form_Number || formNumber || "")}`)}
							className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save className="h-4 w-4" />
							{saving ? "Saving..." : isEditMode ? "Update" : "Save"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}

export default function CRCFamilyStatusFormPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<CRCFamilyStatusFormContent />
		</Suspense>
	);
}
