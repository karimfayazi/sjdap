"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Search } from "lucide-react";

type FamilyProgressFormData = {
	FAMILY_ID: string;
	FAMILY_PROGRESS_STATUS: string;
	REMARKS: string;
	MENTOR: string;
	FDP_APPROVED_DATE: string;
	FAMILY_TYPE: string;
	CRC_APPROVAL_FAMILY_INCOME: string;
	FAMILY_MENTOR: string;
	EXPECTED_GRADUCATION_DATE: string;
	PROGRAM_TYPE: string;
	FAMILY_FROM: string;
	STATUS_DATE: string;
	DROPOUT_CATEGORY: string;
	Community_Affiliation: string;
};

type FamilyInfo = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	CNIC: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
};

export default function AddFamilyProgressPage() {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
	const [loadingFamilyInfo, setLoadingFamilyInfo] = useState(false);
	const [familyInfoError, setFamilyInfoError] = useState<string | null>(null);
	const [familyProgressStatuses, setFamilyProgressStatuses] = useState<string[]>([]);
	const [loadingStatuses, setLoadingStatuses] = useState(false);
	const [loadingUserInfo, setLoadingUserInfo] = useState(false);

	const [formData, setFormData] = useState<FamilyProgressFormData>({
		FAMILY_ID: "",
		FAMILY_PROGRESS_STATUS: "",
		REMARKS: "",
		MENTOR: "",
		FDP_APPROVED_DATE: "",
		FAMILY_TYPE: "",
		CRC_APPROVAL_FAMILY_INCOME: "",
		FAMILY_MENTOR: "",
		EXPECTED_GRADUCATION_DATE: "",
		PROGRAM_TYPE: "",
		FAMILY_FROM: "",
		STATUS_DATE: "",
		DROPOUT_CATEGORY: "",
		Community_Affiliation: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.FAMILY_ID) {
			setError("Family ID is required");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			const response = await fetch('/api/family-progress', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/family-approval-crc');
				}, 1500);
			} else {
				setError(data.message || "Failed to create family progress record");
			}
		} catch (err) {
			console.error("Error creating record:", err);
			setError("Error creating record. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleChange = (field: keyof FamilyProgressFormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setError(null);
	};

	const fetchFamilyInfo = async () => {
		if (!formData.FAMILY_ID || formData.FAMILY_ID.trim() === "") {
			setFamilyInfoError("Please enter a Family ID");
			return;
		}

		try {
			setLoadingFamilyInfo(true);
			setFamilyInfoError(null);
			setFamilyInfo(null);

			const response = await fetch(`/api/family-bank-search?familyId=${encodeURIComponent(formData.FAMILY_ID)}`);
			const data = await response.json();

			if (data.success && data.families && data.families.length > 0) {
				const family = data.families[0];
				setFamilyInfo({
					FAMILY_ID: family.FAMILY_ID || null,
					PROGRAM: family.PROGRAM || null,
					AREA: family.AREA || null,
					REGIONAL_COUNCIL: family.REGIONAL_COUNCIL || null,
					LOCAL_COUNCIL: family.LOCAL_COUNCIL || null,
					JAMAT_KHANA: family.JAMAT_KHANA || null,
					HEAD_NAME: family.HEAD_NAME || null,
					CNIC: family.CNIC || null,
					PER_CAPITA_INCOME: family.PER_CAPITA_INCOME || null,
					TOTAL_FAMILY_MEMBER: family.TOTAL_FAMILY_MEMBER || null,
					AREA_TYPE: family.AREA_TYPE || null,
				});

				// Auto-populate PROGRAM_TYPE if PROGRAM is available
				if (family.PROGRAM && !formData.PROGRAM_TYPE) {
					setFormData(prev => ({ ...prev, PROGRAM_TYPE: family.PROGRAM }));
				}
			} else {
				setFamilyInfoError(data.message || "Family not found");
				setFamilyInfo(null);
			}
		} catch (err) {
			console.error("Error fetching family info:", err);
			setFamilyInfoError("Error fetching family information. Please try again.");
			setFamilyInfo(null);
		} finally {
			setLoadingFamilyInfo(false);
		}
	};

	// Fetch Family Progress Status options and current user info on component mount
	useEffect(() => {
		const fetchStatusOptions = async () => {
			try {
				setLoadingStatuses(true);
				const response = await fetch('/api/families?getOptions=true');
				const data = await response.json();

				if (data.success) {
					setFamilyProgressStatuses(data.familyProgressStatuses || []);
				}
			} catch (err) {
				console.error("Error fetching family progress status options:", err);
			} finally {
				setLoadingStatuses(false);
			}
		};

		const fetchUserInfo = async () => {
			try {
				setLoadingUserInfo(true);
				const response = await fetch('/api/user-info');
				const data = await response.json();

				if (data.success && data.user && data.user.name) {
					setFormData(prev => ({ ...prev, MENTOR: data.user.name }));
				}
			} catch (err) {
				console.error("Error fetching user info:", err);
			} finally {
				setLoadingUserInfo(false);
			}
		};

		fetchStatusOptions();
		fetchUserInfo();
	}, []);

	// Clear family info when Family ID changes
	useEffect(() => {
		if (!formData.FAMILY_ID || formData.FAMILY_ID.trim() === "") {
			setFamilyInfo(null);
			setFamilyInfoError(null);
		}
	}, [formData.FAMILY_ID]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add Family Progress Record</h1>
					<p className="text-gray-600 mt-2">Create a new family progress record for CRC approval</p>
				</div>
				<button
					onClick={() => router.push('/dashboard/family-approval-crc')}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to List
				</button>
			</div>

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">Family progress record created successfully! Redirecting...</p>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="space-y-6">
					{/* Section 1: Family ID Search */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Family Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Family ID <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={formData.FAMILY_ID}
										onChange={(e) => handleChange('FAMILY_ID', e.target.value)}
										onBlur={() => {
											if (formData.FAMILY_ID && formData.FAMILY_ID.trim() !== "") {
												fetchFamilyInfo();
											}
										}}
										className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										required
										placeholder="Enter Family ID and press Search or click outside"
									/>
									<button
										type="button"
										onClick={fetchFamilyInfo}
										disabled={loadingFamilyInfo || !formData.FAMILY_ID}
										className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{loadingFamilyInfo ? (
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										) : (
											<Search className="h-4 w-4" />
										)}
										{loadingFamilyInfo ? "Searching..." : "Search"}
									</button>
								</div>
								{familyInfoError && (
									<p className="mt-1 text-sm text-red-600">{familyInfoError}</p>
								)}
							</div>
						</div>

						{/* Display Family Information */}
						{familyInfo && (
							<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<h3 className="text-sm font-semibold text-blue-900 mb-3">Family Details from Database</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Program</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.PROGRAM || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Area</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.AREA || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Regional Council</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.REGIONAL_COUNCIL || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Local Council</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.LOCAL_COUNCIL || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Jamat Khana</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.JAMAT_KHANA || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Head Name</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.HEAD_NAME || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">CNIC</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.CNIC || "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Per Capita Income</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.PER_CAPITA_INCOME !== null ? familyInfo.PER_CAPITA_INCOME.toLocaleString() : "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Total Family Members</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.TOTAL_FAMILY_MEMBER !== null ? familyInfo.TOTAL_FAMILY_MEMBER : "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-xs font-medium text-blue-700 mb-1">Area Type</label>
										<p className="text-sm text-blue-900 bg-white px-3 py-2 rounded-md border border-blue-200">
											{familyInfo.AREA_TYPE || "N/A"}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Section 2: Family Progress Information */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Family Progress Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Family Progress Status</label>
								<select
									value={formData.FAMILY_PROGRESS_STATUS}
									onChange={(e) => handleChange('FAMILY_PROGRESS_STATUS', e.target.value)}
									disabled={loadingStatuses}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">Select Family Progress Status</option>
									{familyProgressStatuses.map((status) => (
										<option key={status} value={status}>
											{status}
										</option>
									))}
								</select>
								{loadingStatuses && (
									<p className="mt-1 text-xs text-gray-500">Loading status options...</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
								<input
									type="text"
									value={formData.MENTOR}
									readOnly
									disabled={loadingUserInfo}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
									placeholder={loadingUserInfo ? "Loading..." : "Auto-filled from logged-in user"}
								/>
								{loadingUserInfo && (
									<p className="mt-1 text-xs text-gray-500">Loading user information...</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Family Mentor</label>
								<input
									type="text"
									value={formData.FAMILY_MENTOR}
									onChange={(e) => handleChange('FAMILY_MENTOR', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Family Type</label>
								<input
									type="text"
									value={formData.FAMILY_TYPE}
									onChange={(e) => handleChange('FAMILY_TYPE', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Program Type</label>
								<select
									value={formData.PROGRAM_TYPE}
									onChange={(e) => handleChange('PROGRAM_TYPE', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Program Type</option>
									<option value="FAMILY DEVELOPMENT PLAN-FULL">FAMILY DEVELOPMENT PLAN-FULL</option>
									<option value="COMMUNITY ECONOMIC DEVELOPMENT PROGRAM">COMMUNITY ECONOMIC DEVELOPMENT PROGRAM</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Family From</label>
								<input
									type="text"
									value={formData.FAMILY_FROM}
									onChange={(e) => handleChange('FAMILY_FROM', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">CRC Approval Family Income</label>
								<input
									type="text"
									value={formData.CRC_APPROVAL_FAMILY_INCOME}
									onChange={(e) => handleChange('CRC_APPROVAL_FAMILY_INCOME', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					{/* Section 3: Dates */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Important Dates</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">FDP Approved Date</label>
								<input
									type="date"
									value={formData.FDP_APPROVED_DATE}
									onChange={(e) => handleChange('FDP_APPROVED_DATE', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Expected Graduation Date</label>
								<input
									type="date"
									value={formData.EXPECTED_GRADUCATION_DATE}
									onChange={(e) => handleChange('EXPECTED_GRADUCATION_DATE', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Status Date</label>
								<input
									type="date"
									value={formData.STATUS_DATE}
									onChange={(e) => handleChange('STATUS_DATE', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					{/* Section 4: Additional Information */}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Additional Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Dropout Category</label>
								<input
									type="text"
									value={formData.DROPOUT_CATEGORY}
									onChange={(e) => handleChange('DROPOUT_CATEGORY', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Community Affiliation</label>
								<input
									type="text"
									value={formData.Community_Affiliation}
									onChange={(e) => handleChange('Community_Affiliation', e.target.value)}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
								<textarea
									value={formData.REMARKS}
									onChange={(e) => handleChange('REMARKS', e.target.value)}
									rows={4}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder="Enter any additional remarks or notes..."
								/>
							</div>
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.push('/dashboard/family-approval-crc')}
							className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving || success}
							className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save className="h-4 w-4" />
							{saving ? "Saving..." : success ? "Saved!" : "Save Record"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}

