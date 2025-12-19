"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type SWBFormData = {
	CNIC: string;
	Received_Application: string;
	BTS_Number: string;
	FAMILY_ID: string;
	Regional_Council: string;
	Local_Council: string;
	Jamat_Khana: string;
	Programme: string;
	Beneficiary_Name: string;
	Gender: string;
	VIST_FEAP: string;
	Already_FEAP_Programme: string;
	Potential_family_declaration_by_FEAP: string;
	If_no_reason: string;
	FDP_Status: string;
	SWB_to_stop_support_from_date: string;
	Remarks: string;
	Mentor_Name: string;
	Social_Support_Amount: string;
	Economic_Support_Amount: string;
};

export default function AddSWBFamilyPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("SWB_Families");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [formData, setFormData] = useState<SWBFormData>({
		CNIC: "",
		Received_Application: "",
		BTS_Number: "",
		FAMILY_ID: "",
		Regional_Council: "",
		Local_Council: "",
		Jamat_Khana: "",
		Programme: "",
		Beneficiary_Name: "",
		Gender: "",
		VIST_FEAP: "",
		Already_FEAP_Programme: "",
		Potential_family_declaration_by_FEAP: "",
		If_no_reason: "",
		FDP_Status: "",
		SWB_to_stop_support_from_date: "",
		Remarks: "",
		Mentor_Name: "",
		Social_Support_Amount: "",
		Economic_Support_Amount: "",
	});

	const [regionalCouncils, setRegionalCouncils] = useState<string[]>([]);
	const [localCouncils, setLocalCouncils] = useState<string[]>([]);
	const [jamatKhanas, setJamatKhanas] = useState<string[]>([]);
	const [mentors, setMentors] = useState<string[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(false);
	const [loadingLocations, setLoadingLocations] = useState(false);
	const [familyHead, setFamilyHead] = useState<string>("");
	const [loadingFamilyHead, setLoadingFamilyHead] = useState(false);

	const programmes = ["FEAP", "SEDP"];

	useEffect(() => {
		const fetchDropdownOptions = async () => {
			try {
				setLoadingOptions(true);
				const response = await fetch("/api/swb-families?getOptions=true");
				const data = await response.json();

				if (data.success) {
					setRegionalCouncils(data.regionalCouncils || []);
					setMentors(data.mentors || []);
				}
			} catch (err) {
				console.error("Error fetching dropdown options:", err);
			} finally {
				setLoadingOptions(false);
			}
		};

		fetchDropdownOptions();
	}, []);

	// Fetch Local Council and Jamat Khana when Regional Council changes
	useEffect(() => {
		const fetchLocations = async () => {
			if (!formData.Regional_Council) {
				setLocalCouncils([]);
				setJamatKhanas([]);
				setFormData(prev => ({ ...prev, Local_Council: "", Jamat_Khana: "" }));
				return;
			}

			try {
				setLoadingLocations(true);
				const response = await fetch(`/api/swb-families?getOptions=true&regionalCouncil=${encodeURIComponent(formData.Regional_Council)}`);
				const data = await response.json();

				if (data.success) {
					setLocalCouncils(data.localCouncils || []);
					setJamatKhanas(data.jamatKhanas || []);
					// Clear Local Council and Jamat Khana if they're not in the new list
					setFormData(prev => {
						const updates: Partial<SWBFormData> = {};
						if (prev.Local_Council && !data.localCouncils?.includes(prev.Local_Council)) {
							updates.Local_Council = "";
						}
						if (prev.Jamat_Khana && !data.jamatKhanas?.includes(prev.Jamat_Khana)) {
							updates.Jamat_Khana = "";
						}
						return { ...prev, ...updates };
					});
				}
			} catch (err) {
				console.error("Error fetching locations:", err);
			} finally {
				setLoadingLocations(false);
			}
		};

		fetchLocations();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formData.Regional_Council]);

	const handleViewFamilyHead = async () => {
		if (!formData.FAMILY_ID) {
			setError("Please enter Family ID first");
			return;
		}

		try {
			setLoadingFamilyHead(true);
			setError(null);
			const response = await fetch(`/api/swb-families?getFamilyHead=true&familyId=${encodeURIComponent(formData.FAMILY_ID)}`);
			const data = await response.json();

			if (data.success) {
				setFamilyHead(data.headName || "Not Found");
			} else {
				setError(data.message || "Error fetching family head");
				setFamilyHead("");
			}
		} catch (err) {
			console.error("Error fetching family head:", err);
			setError("Error fetching family head");
			setFamilyHead("");
		} finally {
			setLoadingFamilyHead(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		
		// If VIST_FEAP changes to "No", clear dependent fields
		if (name === "VIST_FEAP" && value === "No") {
			setFormData(prev => ({
				...prev,
				VIST_FEAP: value,
				Already_FEAP_Programme: "",
				Potential_family_declaration_by_FEAP: "",
				If_no_reason: ""
			}));
			return;
		}
		
		// If Potential_family_declaration_by_FEAP changes to "Yes", clear If_no_reason
		if (name === "Potential_family_declaration_by_FEAP" && value === "Yes") {
			setFormData(prev => ({
				...prev,
				Potential_family_declaration_by_FEAP: value,
				If_no_reason: ""
			}));
			return;
		}
		
		// If FDP_Status changes to something other than "Approved", clear dependent fields
		if (name === "FDP_Status" && value !== "Approved") {
			setFormData(prev => ({
				...prev,
				FDP_Status: value,
				FAMILY_ID: "",
				SWB_to_stop_support_from_date: "",
				Social_Support_Amount: "",
				Economic_Support_Amount: ""
			}));
			setFamilyHead(""); // Clear Family Head when FDP Status is not Approved
			return;
		}
		
		// Clear family head when Family ID changes
		if (name === "FAMILY_ID") {
			setFamilyHead("");
		}
		
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!formData.CNIC) {
			setError("CNIC is a required field");
			return;
		}
		
		// Validate required fields when FDP Status is "Approved"
		if (formData.FDP_Status === "Approved") {
			const missingFields: string[] = [];
			
			if (!formData.FAMILY_ID) {
				missingFields.push("Family ID");
			}
			
			if (!familyHead || familyHead === "Not Found") {
				missingFields.push("Family Head (click View button to fetch)");
			}
			
			if (!formData.SWB_to_stop_support_from_date) {
				missingFields.push("SWB to Stop Support From Date");
			}
			
			if (!formData.Social_Support_Amount) {
				missingFields.push("Social Support Amount");
			}
			
			if (!formData.Economic_Support_Amount) {
				missingFields.push("Economic Support Amount");
			}
			
			if (missingFields.length > 0) {
				setError(`When FDP Status is "Approved", the following fields are required: ${missingFields.join(", ")}`);
				return;
			}
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			// Prepare data for submission - set null/empty for disabled fields when VIST_FEAP is "No"
			const submitData = { ...formData };
			if (formData.VIST_FEAP === "No") {
				submitData.Already_FEAP_Programme = "";
				submitData.Potential_family_declaration_by_FEAP = "";
				submitData.If_no_reason = "";
			}
			// Set empty for If_no_reason when Potential_family_declaration_by_FEAP is "Yes"
			if (formData.Potential_family_declaration_by_FEAP === "Yes") {
				submitData.If_no_reason = "";
			}
			// Set empty for support fields when FDP_Status is not "Approved"
			if (formData.FDP_Status !== "Approved") {
				submitData.FAMILY_ID = "";
				submitData.SWB_to_stop_support_from_date = "";
				submitData.Social_Support_Amount = "";
				submitData.Economic_Support_Amount = "";
			}

			const response = await fetch("/api/swb-families", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/swb-families");
				}, 1500);
			} else {
				setError(data.message || "Failed to save SWB family record");
			}
		} catch (err) {
			console.error("Error saving SWB family record:", err);
			setError("Error saving SWB family record");
		} finally {
			setSaving(false);
		}
	};

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied 
			sectionName={sectionName} 
			requiredPermission="SWB Families"
			permissionValue={userProfile?.SWB_Families}
		/>;
	}

	// Show loading while checking access
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add SWB Family Record</h1>
					<p className="text-gray-600 mt-2">Add a new SWB family record</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/swb-families")}
					className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to SWB Families
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700 text-sm">{error}</p>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-700 text-sm">SWB family record saved successfully! Redirecting...</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
				{/* Basic Information */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								CNIC <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								name="CNIC"
								value={formData.CNIC}
								onChange={handleInputChange}
								required
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="CNIC"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Received Application</label>
							<input
								type="date"
								name="Received_Application"
								value={formData.Received_Application}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">BTS Number</label>
							<input
								type="text"
								name="BTS_Number"
								value={formData.BTS_Number}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="BTS Number"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
							<input
								type="text"
								name="Beneficiary_Name"
								value={formData.Beneficiary_Name}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Beneficiary Name"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
							<select
								name="Gender"
								value={formData.Gender}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Gender</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Assign Mentor</label>
							<select
								name="Mentor_Name"
								value={formData.Mentor_Name}
								onChange={handleInputChange}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">Select Mentor</option>
								{mentors.map((mentor) => (
									<option key={mentor} value={mentor}>{mentor}</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Location Information */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Location Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
							<select
								name="Regional_Council"
								value={formData.Regional_Council}
								onChange={handleInputChange}
								disabled={loadingOptions}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Regional Council</option>
								{regionalCouncils.map((rc) => (
									<option key={rc} value={rc}>{rc}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
							<select
								name="Local_Council"
								value={formData.Local_Council}
								onChange={handleInputChange}
								disabled={loadingOptions || loadingLocations || !formData.Regional_Council}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">
									{!formData.Regional_Council 
										? "Select Regional Council first" 
										: loadingLocations 
										? "Loading..." 
										: "Select Local Council"}
								</option>
								{localCouncils.map((lc) => (
									<option key={lc} value={lc}>{lc}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Jamat Khana</label>
							<select
								name="Jamat_Khana"
								value={formData.Jamat_Khana}
								onChange={handleInputChange}
								disabled={loadingOptions || loadingLocations || !formData.Regional_Council}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">
									{!formData.Regional_Council 
										? "Select Regional Council first" 
										: loadingLocations 
										? "Loading..." 
										: "Select Jamat Khana"}
								</option>
								{jamatKhanas.map((jk) => (
									<option key={jk} value={jk}>{jk}</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
							<select
								name="Programme"
								value={formData.Programme}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Programme</option>
								{programmes.map((prog) => (
									<option key={prog} value={prog}>{prog}</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* FEAP Information */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">FEAP Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Visit Family</label>
							<select
								name="VIST_FEAP"
								value={formData.VIST_FEAP}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select</option>
								<option value="Yes">Yes</option>
								<option value="No">No</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Already FEAP Programme</label>
							<select
								name="Already_FEAP_Programme"
								value={formData.Already_FEAP_Programme}
								onChange={handleInputChange}
								disabled={formData.VIST_FEAP !== "Yes"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">
									{formData.VIST_FEAP !== "Yes" ? "Select Visit Family first" : "Select"}
								</option>
								<option value="Yes">Yes</option>
								<option value="No">No</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Potential Family Declaration by FEAP/SEDP Staff</label>
							<select
								name="Potential_family_declaration_by_FEAP"
								value={formData.Potential_family_declaration_by_FEAP}
								onChange={handleInputChange}
								disabled={formData.VIST_FEAP !== "Yes"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">
									{formData.VIST_FEAP !== "Yes" ? "Select Visit Family first" : "Select"}
								</option>
								<option value="Yes">Yes</option>
								<option value="No">No</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">If No Reason</label>
							<input
								type="text"
								name="If_no_reason"
								value={formData.If_no_reason}
								onChange={handleInputChange}
								disabled={formData.VIST_FEAP !== "Yes" || formData.Potential_family_declaration_by_FEAP !== "No"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder={
									formData.VIST_FEAP !== "Yes" 
										? "Select Visit Family first" 
										: formData.Potential_family_declaration_by_FEAP !== "No"
										? "Select Potential Family Declaration first"
										: "If No Reason"
								}
							/>
						</div>
					</div>
				</div>

				{/* Status and Support Information */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Status and Support Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">FDP Status</label>
							<select
								name="FDP_Status"
								value={formData.FDP_Status}
								onChange={handleInputChange}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Status</option>
								<option value="Approved">Approved</option>
								<option value="CRC-Approval Waiting">CRC-Approval Waiting</option>
								<option value="Family Mentoring">Family Mentoring</option>
								<option value="Not Interested">Not Interested</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Family ID <span className="text-red-500">*</span>
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									name="FAMILY_ID"
									value={formData.FAMILY_ID}
									onChange={handleInputChange}
									required={formData.FDP_Status === "Approved"}
									disabled={formData.FDP_Status !== "Approved"}
									className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
									placeholder={formData.FDP_Status !== "Approved" ? "FDP Status must be Approved" : "Family ID"}
								/>
								<button
									type="button"
									onClick={handleViewFamilyHead}
									disabled={formData.FDP_Status !== "Approved" || !formData.FAMILY_ID || loadingFamilyHead}
									className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loadingFamilyHead ? (
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									) : (
										<Eye className="h-4 w-4" />
									)}
									View
								</button>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Family Head</label>
							<input
								type="text"
								value={familyHead}
								readOnly
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 cursor-not-allowed"
								placeholder="Click View button to fetch Family Head"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">SWB to Stop Support From Date</label>
							<input
								type="date"
								name="SWB_to_stop_support_from_date"
								value={formData.SWB_to_stop_support_from_date}
								onChange={handleInputChange}
								disabled={formData.FDP_Status !== "Approved"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder={formData.FDP_Status !== "Approved" ? "FDP Status must be Approved" : ""}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Social Support Amount</label>
							<input
								type="number"
								name="Social_Support_Amount"
								value={formData.Social_Support_Amount}
								onChange={handleInputChange}
								step="0.01"
								min="0"
								disabled={formData.FDP_Status !== "Approved"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder={formData.FDP_Status !== "Approved" ? "FDP Status must be Approved" : "0.00"}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Economic Support Amount</label>
							<input
								type="number"
								name="Economic_Support_Amount"
								value={formData.Economic_Support_Amount}
								onChange={handleInputChange}
								step="0.01"
								min="0"
								disabled={formData.FDP_Status !== "Approved"}
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder={formData.FDP_Status !== "Approved" ? "FDP Status must be Approved" : "0.00"}
							/>
						</div>
					</div>
				</div>

				{/* Remarks */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Additional Information</h2>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
						<textarea
							name="Remarks"
							value={formData.Remarks}
							onChange={handleInputChange}
							rows={4}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter remarks or additional notes"
						/>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onClick={() => router.push("/dashboard/swb-families")}
						className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? (
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						) : (
							<Save className="h-4 w-4" />
						)}
						{saving ? "Saving..." : "Save Record"}
					</button>
				</div>
			</form>
		</div>
	);
}
