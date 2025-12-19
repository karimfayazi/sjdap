"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type ApplicationFormData = {
	FormNo: string;
	TotalFamilyMembers: string;
	Remarks: string;
};

type FamilyHeadFormData = {
	PersonRole: string;
	FullName: string;
	CNICNo: string;
	MotherTongue: string;
	ResidentialAddress: string;
	PrimaryContactNo: string;
	RegionalCouncil: string;
	LocalCouncil: string;
	CurrentJK: string;
	PrimaryLocationSettlement: string;
	AreaOfOrigin: string;
	HouseStatusName: string;
};

type LocationHierarchy = {
	LocationId: number;
	RC: string;
	LC: string;
	JK: string;
};

export default function AddBaselineApplicationPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [applicationData, setApplicationData] = useState<ApplicationFormData>({
		FormNo: "",
		TotalFamilyMembers: "",
		Remarks: "",
	});

	const [familyHeads, setFamilyHeads] = useState<FamilyHeadFormData[]>([
		{
			PersonRole: "Head",
			FullName: "",
			CNICNo: "",
			MotherTongue: "",
			ResidentialAddress: "",
			PrimaryContactNo: "",
			RegionalCouncil: "",
			LocalCouncil: "",
			CurrentJK: "",
			PrimaryLocationSettlement: "",
			AreaOfOrigin: "",
			HouseStatusName: "",
		},
	]);

	const [loadingFormNo, setLoadingFormNo] = useState(true);
	const [loadingExistingData, setLoadingExistingData] = useState(false);
	const [houseStatuses, setHouseStatuses] = useState<Array<{ HouseStatusId: number; HouseStatusName: string }>>([]);
	const [locationHierarchy, setLocationHierarchy] = useState<LocationHierarchy[]>([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [formNoParam, setFormNoParam] = useState<string | null>(null);

	// Fetch next Form No and relationships on component mount
	useEffect(() => {
		const fetchNextFormNo = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getNextFormNo");
				const data = await response.json();
				if (data.success && data.nextFormNo) {
					setApplicationData((prev) => ({ ...prev, FormNo: data.nextFormNo }));
				}
			} catch (error) {
				console.error("Error fetching next Form No:", error);
				// Default to PE-00001 if fetch fails
				setApplicationData((prev) => ({ ...prev, FormNo: "PE-00001" }));
			} finally {
				setLoadingFormNo(false);
			}
		};

		const fetchHouseStatuses = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getHouseStatuses");
				const data = await response.json();
				if (data.success && data.houseStatuses) {
					setHouseStatuses(data.houseStatuses);
				}
			} catch (error) {
				console.error("Error fetching house statuses:", error);
			}
		};

		const fetchLocationHierarchy = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getLocationHierarchy");
				const data = await response.json();
				if (data.success && data.locations) {
					setLocationHierarchy(data.locations);
				}
			} catch (error) {
				console.error("Error fetching location hierarchy:", error);
			}
		};

		fetchNextFormNo();
		fetchHouseStatuses();
		fetchLocationHierarchy();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const formNo = params.get("formNo");
		
		// If formNo exists in URL, we're in edit mode
		if (formNo) {
			setFormNoParam(formNo);
			setIsEditMode(true);
		}
	}, []);

	useEffect(() => {
		if (!formNoParam) return;

		const fetchApplicationData = async () => {
			try {
				setLoadingExistingData(true);
				// Fetch using formNo
				const response = await fetch(`/api/baseline-applications/by-formno?formNo=${encodeURIComponent(formNoParam)}`);
				const data = await response.json();
				
				if (data.success && data.data) {
					const app = data.data.application;
					
					// Don't fetch next FormNo if we're editing
					setLoadingFormNo(false);
					
					setApplicationData({
						FormNo: app.FormNo || "",
						TotalFamilyMembers: app.TotalFamilyMembers ? String(app.TotalFamilyMembers) : "",
						Remarks: app.Remarks || "",
					});

					// Load family heads
					if (Array.isArray(data.data.familyHeads) && data.data.familyHeads.length > 0) {
						setFamilyHeads(
							data.data.familyHeads.map((head: any) => ({
								PersonRole: head.PersonRole || "Head",
								FullName: head.FullName || "",
								CNICNo: head.CNICNo || "",
								MotherTongue: head.MotherTongue || "",
								ResidentialAddress: head.ResidentialAddress || "",
								PrimaryContactNo: head.PrimaryContactNo || "",
								RegionalCouncil: head.RegionalCouncil || "",
								LocalCouncil: head.LocalCouncil || "",
								CurrentJK: head.CurrentJK || "",
								PrimaryLocationSettlement: head.PrimaryLocationSettlement || "",
								AreaOfOrigin: head.AreaOfOrigin || "",
								HouseStatusName: head.HouseStatusName || "",
							}))
						);
					}
				}
			} catch (err) {
				console.error("Error loading application for edit:", err);
				setError("Failed to load application data for editing");
			} finally {
				setLoadingExistingData(false);
			}
		};

		fetchApplicationData();
	}, [formNoParam]);

	const handleApplicationChange = (field: keyof ApplicationFormData, value: string) => {
		setApplicationData((prev) => ({ ...prev, [field]: value }));
	};

	const handleFamilyHeadChange = (index: number, field: keyof FamilyHeadFormData, value: string) => {
		setFamilyHeads((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			
			// Reset dependent fields when parent field changes
			if (field === "RegionalCouncil") {
				// Reset Local Council and Current JK when Regional Council changes
				updated[index].LocalCouncil = "";
				updated[index].CurrentJK = "";
			} else if (field === "LocalCouncil") {
				// Reset Current JK when Local Council changes
				updated[index].CurrentJK = "";
			}
			
			return updated;
		});
	};

	const addFamilyHead = () => {
		setFamilyHeads((prev) => [
			...prev,
			{
				PersonRole: "Head",
				FullName: "",
				CNICNo: "",
				MotherTongue: "",
				ResidentialAddress: "",
				PrimaryContactNo: "",
				RegionalCouncil: "",
				LocalCouncil: "",
				CurrentJK: "",
				PrimaryLocationSettlement: "",
				AreaOfOrigin: "",
				HouseStatusName: "",
			},
		]);
	};

	const removeFamilyHead = (index: number) => {
		if (familyHeads.length > 1) {
			setFamilyHeads((prev) => prev.filter((_, i) => i !== index));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			// Validate required fields
			if (!applicationData.FormNo) {
				setError("Form No is required");
				setSaving(false);
				return;
			}

			// Validate Total Family Members: must be between 1 and 15
			const totalFamilyMembers = parseInt(applicationData.TotalFamilyMembers) || 0;
			if (!applicationData.TotalFamilyMembers || totalFamilyMembers < 1 || totalFamilyMembers > 15) {
				setError("Total Family Members must be between 1 and 15");
				setSaving(false);
				return;
			}

			// Validate family heads
			const validFamilyHeads = familyHeads.filter(
				(h) => h.FullName || h.CNICNo
			);

			if (validFamilyHeads.length === 0) {
				setError("At least one family head is required");
				setSaving(false);
				return;
			}

			// Validate all fields are required for all family heads
			for (let i = 0; i < familyHeads.length; i++) {
				const head = familyHeads[i];
				const headNumber = i + 1;
				
				if (!head.PersonRole || head.PersonRole.trim() === "") {
					setError(`Person Role is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.FullName || head.FullName.trim() === "") {
					setError(`Full Name is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.CNICNo || head.CNICNo.trim() === "") {
					setError(`CNIC No is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.MotherTongue || head.MotherTongue.trim() === "") {
					setError(`Mother Tongue is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.ResidentialAddress || head.ResidentialAddress.trim() === "") {
					setError(`Residential Address is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.PrimaryContactNo || head.PrimaryContactNo.trim() === "") {
					setError(`Primary Contact No is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.RegionalCouncil || head.RegionalCouncil.trim() === "") {
					setError(`Regional Council is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.LocalCouncil || head.LocalCouncil.trim() === "") {
					setError(`Local Council is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.CurrentJK || head.CurrentJK.trim() === "") {
					setError(`Current JK is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.PrimaryLocationSettlement || head.PrimaryLocationSettlement.trim() === "") {
					setError(`Primary Location Settlement is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
				if (!head.AreaOfOrigin || head.AreaOfOrigin.trim() === "") {
					setError(`Area of Origin is required for Family Head ${headNumber}`);
					setSaving(false);
					return;
				}
			}

			const payload = {
				application: {
					FormNo: applicationData.FormNo,
					TotalFamilyMembers: applicationData.TotalFamilyMembers || validFamilyHeads.length.toString(),
					Remarks: applicationData.Remarks || null,
				},
				familyHeads: validFamilyHeads,
				familyMembers: [],
			};

			const response = await fetch("/api/baseline-applications", {
				method: isEditMode ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/baseline-qol");
				}, 1500);
			} else {
				setError(data.message || (isEditMode ? "Failed to update application" : "Failed to create application"));
			}
		} catch (err: any) {
			console.error(isEditMode ? "Error updating application:" : "Error creating application:", err);
			setError(err.message || (isEditMode ? "Error updating application. Please try again." : "Error creating application. Please try again."));
		} finally {
			setSaving(false);
		}
	};

	// Show loading indicator when fetching existing data for edit
	if (loadingExistingData) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Loading Application...</h1>
						<p className="text-gray-600 mt-2">Fetching application data for editing</p>
					</div>
					<button
						onClick={() => router.back()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
				</div>
				<div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-4 text-gray-600 text-lg">Loading application data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						{isEditMode ? "Edit QOL Application" : "Add QOL Application"}
					</h1>
					<p className="text-gray-600 mt-2">
						{isEditMode ? `Update PE Application - ${applicationData.FormNo}` : "Create a new PE Application"}
					</p>
				</div>
				<button
					onClick={() => router.back()}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
			</div>

			{/* Edit Mode Indicator */}
			{isEditMode && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center gap-2">
						<div className="flex-shrink-0">
							<svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
						</div>
						<div>
							<p className="text-sm font-medium text-blue-800">
								Editing Mode: You are updating an existing application. Family head information has been loaded.
							</p>
						</div>
					</div>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">
						{isEditMode ? "Application updated successfully! Redirecting..." : "Application created successfully! Redirecting..."}
					</p>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Application Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Application Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Form No <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={applicationData.FormNo}
								readOnly
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
								placeholder={loadingFormNo ? "Loading..." : "PE-00001"}
							/>
							{loadingFormNo && (
								<p className="mt-1 text-xs text-gray-500">Auto-generating Form No...</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Total Family Members <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								value={applicationData.TotalFamilyMembers}
								onChange={(e) => handleApplicationChange("TotalFamilyMembers", e.target.value)}
								required
								min="1"
								max="15"
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter total family members (1-15)"
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Remarks
							</label>
							<textarea
								value={applicationData.Remarks}
								onChange={(e) => handleApplicationChange("Remarks", e.target.value)}
								rows={3}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter remarks"
							/>
						</div>
					</div>
				</div>

				{/* Persons Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">Family Head</h2>
					</div>

					<div className="space-y-8">
						{familyHeads.map((head, index) => (
							<div key={index} className="border border-gray-200 rounded-lg p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-lg font-semibold text-gray-900">
										Family Head
									</h3>
									{familyHeads.length > 1 && (
										<button
											type="button"
											onClick={() => removeFamilyHead(index)}
											className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
										>
											<Trash2 className="h-4 w-4" />
											Remove
										</button>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Person Role <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value="Head"
											readOnly
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Full Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.FullName}
											onChange={(e) => handleFamilyHeadChange(index, "FullName", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter full name"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											CNIC No <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.CNICNo}
											onChange={(e) => handleFamilyHeadChange(index, "CNICNo", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter CNIC number"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Mother Tongue <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.MotherTongue}
											onChange={(e) => handleFamilyHeadChange(index, "MotherTongue", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter mother tongue"
										/>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Residential Address <span className="text-red-500">*</span>
										</label>
										<textarea
											value={head.ResidentialAddress}
											onChange={(e) => handleFamilyHeadChange(index, "ResidentialAddress", e.target.value)}
											required
											rows={2}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter residential address"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Primary Contact No <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.PrimaryContactNo}
											onChange={(e) => handleFamilyHeadChange(index, "PrimaryContactNo", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter primary contact"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Regional Council <span className="text-red-500">*</span>
										</label>
										<select
											value={head.RegionalCouncil}
											onChange={(e) => handleFamilyHeadChange(index, "RegionalCouncil", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">Select Regional Council</option>
											{Array.from(new Set(locationHierarchy.map(loc => loc.RC))).map((rc) => (
												<option key={rc} value={rc}>
													{rc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Local Council <span className="text-red-500">*</span>
										</label>
										<select
											value={head.LocalCouncil}
											onChange={(e) => handleFamilyHeadChange(index, "LocalCouncil", e.target.value)}
											required
											disabled={!head.RegionalCouncil}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										>
											<option value="">{head.RegionalCouncil ? "Select Local Council" : "Select Regional Council first"}</option>
											{head.RegionalCouncil && Array.from(new Set(
												locationHierarchy
													.filter(loc => loc.RC === head.RegionalCouncil)
													.map(loc => loc.LC)
											)).map((lc) => (
												<option key={lc} value={lc}>
													{lc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Current JK <span className="text-red-500">*</span>
										</label>
										<select
											value={head.CurrentJK}
											onChange={(e) => handleFamilyHeadChange(index, "CurrentJK", e.target.value)}
											required
											disabled={!head.RegionalCouncil || !head.LocalCouncil}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										>
											<option value="">{head.RegionalCouncil && head.LocalCouncil ? "Select Current JK" : "Select Regional Council and Local Council first"}</option>
											{head.RegionalCouncil && head.LocalCouncil && Array.from(new Set(
												locationHierarchy
													.filter(loc => loc.RC === head.RegionalCouncil && loc.LC === head.LocalCouncil)
													.map(loc => loc.JK)
											)).map((jk) => (
												<option key={jk} value={jk}>
													{jk}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Primary Location Settlement <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.PrimaryLocationSettlement}
											onChange={(e) => handleFamilyHeadChange(index, "PrimaryLocationSettlement", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter primary location settlement"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Area of Origin <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={head.AreaOfOrigin}
											onChange={(e) => handleFamilyHeadChange(index, "AreaOfOrigin", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter area of origin"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Household Type
										</label>
										<select
											value={head.HouseStatusName}
											onChange={(e) => handleFamilyHeadChange(index, "HouseStatusName", e.target.value)}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">Select Household Type</option>
											{houseStatuses.map((status) => (
												<option key={status.HouseStatusId} value={status.HouseStatusName}>
													{status.HouseStatusName}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Submit Button */}
				<div className="flex items-center justify-end gap-4">
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
						<Save className="h-4 w-4" />
						{saving ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update Application" : "Save Application")}
					</button>
				</div>
			</form>
		</div>
	);
}

