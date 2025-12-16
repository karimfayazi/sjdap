"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
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

type EducationFormData = {
	IsCurrentlyStudying: string; // 1) Yes, 2) No, 99) Not applicable
	InstitutionType: string; // 1) AKES, 2) Private, 3) Government, 4) NGO, 5) Community based, 98) Others, 99) Not applicable
	InstitutionTypeOther: string;
	CurrentClass: string; // 1-9, 98) Others, 99) Not applicable
	CurrentClassOther: string;
	LastFormalQualification: string; // 1-7, 98) Others, 99) Not applicable
	LastFormalQualificationOther: string;
	HighestQualification: string; // 1-9, 98) Others, 99) Not applicable
	HighestQualificationOther: string;
};

type LivelihoodFormData = {
	IsCurrentlyEarning: string; // 1) Yes, 2) No, 99) Not applicable
	EarningSource: string; // 1) Salaried, 2) Business, 3) Self-employed, 4) Agriculture/Livestock, 5) Wage earner, 98) Others
	EarningSourceOther: string;
	SalariedWorkSector: string; // 1) Government, 2) Private, 3) NGO, 98) Others, 99) Not Applicable
	SalariedWorkSectorOther: string;
	WorkField: string; // 1-12, 98) Others, 99) Not Applicable
	WorkFieldOther: string;
	MonthlyIncome: string;
	JoblessDuration: string; // 1) Less than 6 month, 2) 6-12 months, 3) 12-24 months, 4) More than 24 months, 99) Not applicable
	ReasonNotEarning: string; // 1) Cannot get a job, 2) Non-availability of desirable job, 3) Family does not allow, 4) Job offers have lower than desirable salary, 98) Others, 99) Not Applicable
	ReasonNotEarningOther: string;
};

type FamilyMemberFormData = {
	MemberNo: string;
	FullName: string;
	BFormOrCNIC: string;
	RelationshipId: string;
	GenderId: string;
	MaritalStatusId: string;
	DOBMonth: string;
	DOBYear: string;
	education: EducationFormData;
	livelihood: LivelihoodFormData;
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

	const [familyMembers, setFamilyMembers] = useState<FamilyMemberFormData[]>([]);
	const [loadingFormNo, setLoadingFormNo] = useState(true);
	const [relationships, setRelationships] = useState<Array<{ RelationshipId: number; RelationshipName: string }>>([]);
	const [genders, setGenders] = useState<Array<{ GenderId: number; GenderName: string }>>([]);
	const [maritalStatuses, setMaritalStatuses] = useState<Array<{ MaritalStatusId: number; MaritalStatusName: string }>>([]);
	const [houseStatuses, setHouseStatuses] = useState<Array<{ HouseStatusId: number; HouseStatusName: string }>>([]);
	const [locationHierarchy, setLocationHierarchy] = useState<LocationHierarchy[]>([]);
	const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
	const [applicationIdParam, setApplicationIdParam] = useState<string | null>(null);

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

		const fetchRelationships = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getRelationships");
				const data = await response.json();
				if (data.success && data.relationships) {
					setRelationships(data.relationships);
				}
			} catch (error) {
				console.error("Error fetching relationships:", error);
			}
		};

		const fetchGenders = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getGenders");
				const data = await response.json();
				if (data.success && data.genders) {
					setGenders(data.genders);
				}
			} catch (error) {
				console.error("Error fetching genders:", error);
			}
		};

		const fetchMaritalStatuses = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getMaritalStatuses");
				const data = await response.json();
				if (data.success && data.maritalStatuses) {
					setMaritalStatuses(data.maritalStatuses);
				}
			} catch (error) {
				console.error("Error fetching marital statuses:", error);
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
		fetchRelationships();
		fetchGenders();
		fetchMaritalStatuses();
		fetchHouseStatuses();
		fetchLocationHierarchy();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		setApplicationIdParam(params.get("applicationId"));
	}, []);

	useEffect(() => {
		if (!applicationIdParam) return;
		setEditingApplicationId(applicationIdParam);

		const fetchApplicationData = async () => {
			try {
				const response = await fetch(`/api/baseline-applications/${applicationIdParam}`);
				const data = await response.json();
				if (data.success && data.data) {
					const app = data.data.application;
					setApplicationData({
						FormNo: app.FormNo || "",
						TotalFamilyMembers: app.TotalFamilyMembers ? String(app.TotalFamilyMembers) : "",
						Remarks: app.Remarks || "",
					});

					setFamilyHeads(
						(Array.isArray(data.data.familyHeads) ? data.data.familyHeads : []).map((head: any) => ({
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

					setFamilyMembers(
						Array.isArray(data.data.familyMembers)
							? data.data.familyMembers.map((member: any, index: number) => ({
									MemberNo: member.MemberNo || `${app.ApplicationId}${String(index + 1).padStart(2, "0")}`,
									FullName: member.FullName || "",
									BFormOrCNIC: member.BFormOrCNIC || "",
									RelationshipId: member.RelationshipId ? String(member.RelationshipId) : "",
									GenderId: member.GenderId ? String(member.GenderId) : "",
									MaritalStatusId: member.MaritalStatusId ? String(member.MaritalStatusId) : "",
									DOBMonth: member.DOBMonth || "",
									DOBYear: member.DOBYear || "",
									education: member.education || {
										IsCurrentlyStudying: "",
										InstitutionType: "",
										InstitutionTypeOther: "",
										CurrentClass: "",
										CurrentClassOther: "",
										LastFormalQualification: "",
										LastFormalQualificationOther: "",
										HighestQualification: "",
										HighestQualificationOther: "",
									},
									livelihood: member.livelihood || {
										IsCurrentlyEarning: "",
										EarningSource: "",
										EarningSourceOther: "",
										SalariedWorkSector: "",
										SalariedWorkSectorOther: "",
										WorkField: "",
										WorkFieldOther: "",
										MonthlyIncome: "",
										JoblessDuration: "",
										ReasonNotEarning: "",
										ReasonNotEarningOther: "",
									},
							  }))
							: []
					);
				}
			} catch (err) {
				console.error("Error loading application for edit:", err);
			}
		};

		fetchApplicationData();
	}, [applicationIdParam]);

	// Recalculate MemberNo when FormNo changes
	useEffect(() => {
		if (applicationData.FormNo && familyMembers.length > 0) {
			setFamilyMembers((prev) => {
				const formNo = applicationData.FormNo || "PE-00001";
				return prev.map((member, i) => {
					const expectedMemberNo = `${formNo}-${String(i + 1).padStart(2, '0')}`;
					// Only update if MemberNo doesn't match the expected format
					if (member.MemberNo !== expectedMemberNo) {
						return {
							...member,
							MemberNo: expectedMemberNo
						};
					}
					return member;
				});
			});
		}
	}, [applicationData.FormNo]);

	const handleApplicationChange = (field: keyof ApplicationFormData, value: string) => {
		setApplicationData((prev) => {
			const updated = { ...prev, [field]: value };
			
			// When TotalFamilyMembers changes, update family members array
			if (field === "TotalFamilyMembers") {
				// Validate: must be between 1 and 15
				const count = parseInt(value) || 0;
				if (count < 1 || count > 15) {
					// Don't update if value is invalid
					return prev;
				}
				if (count >= 1 && count <= 15) {
					// Create or adjust family members array
					setFamilyMembers((prev) => {
						const currentCount = prev.length;
						if (count > currentCount) {
							// Add new members
							const formNo = updated.FormNo || "PE-00001";
							const newMembers: FamilyMemberFormData[] = Array.from({ length: count - currentCount }, (_, i) => ({
								MemberNo: `${formNo}-${String(currentCount + i + 1).padStart(2, '0')}`,
								FullName: "",
								BFormOrCNIC: "",
								RelationshipId: "",
								GenderId: "",
								MaritalStatusId: "",
								DOBMonth: "",
								DOBYear: "",
								education: {
									IsCurrentlyStudying: "",
									InstitutionType: "",
									InstitutionTypeOther: "",
									CurrentClass: "",
									CurrentClassOther: "",
									LastFormalQualification: "",
									LastFormalQualificationOther: "",
									HighestQualification: "",
									HighestQualificationOther: "",
								},
								livelihood: {
									IsCurrentlyEarning: "",
									EarningSource: "",
									EarningSourceOther: "",
									SalariedWorkSector: "",
									SalariedWorkSectorOther: "",
									WorkField: "",
									WorkFieldOther: "",
									MonthlyIncome: "",
									JoblessDuration: "",
									ReasonNotEarning: "",
									ReasonNotEarningOther: "",
								},
							}));
							return [...prev, ...newMembers];
						} else if (count < currentCount) {
							// Remove excess members and recalculate MemberNo
							const formNo = updated.FormNo || "PE-00001";
							const trimmed = prev.slice(0, count);
							return trimmed.map((member, i) => ({
								...member,
								MemberNo: `${formNo}-${String(i + 1).padStart(2, '0')}`
							}));
						}
						return prev;
					});
				} else {
					setFamilyMembers([]);
				}
			}
			
			return updated;
		});
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

	const handleFamilyMemberChange = (index: number, field: keyof FamilyMemberFormData, value: string | boolean) => {
		setFamilyMembers((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	const handleEducationChange = (memberIndex: number, field: keyof EducationFormData, value: string) => {
		setFamilyMembers((prev) => {
			const updated = [...prev];
			updated[memberIndex] = {
				...updated[memberIndex],
				education: {
					...updated[memberIndex].education,
					[field]: value,
				},
			};
			return updated;
		});
	};

	const handleLivelihoodChange = (memberIndex: number, field: keyof LivelihoodFormData, value: string | boolean) => {
		setFamilyMembers((prev) => {
			const updated = [...prev];
			updated[memberIndex] = {
				...updated[memberIndex],
				livelihood: {
					...updated[memberIndex].livelihood,
					[field]: value,
				},
			};
			return updated;
		});
	};

	// Helper function to generate Member No in format PE-{FormNo}-{MemberNumber}
	const generateMemberNo = (memberIndex: number): string => {
		const formNo = applicationData.FormNo || "PE-00001";
		const memberNumber = String(memberIndex + 1).padStart(2, '0');
		return `${formNo}-${memberNumber}`;
	};

	const addFamilyMember = () => {
		setFamilyMembers((prev) => {
			const nextMemberNo = generateMemberNo(prev.length);
			return [
				...prev,
				{
					MemberNo: nextMemberNo,
					FullName: "",
					BFormOrCNIC: "",
					RelationshipId: "",
					GenderId: "",
					MaritalStatusId: "",
					DOBMonth: "",
					DOBYear: "",
					education: {
						IsCurrentlyStudying: "",
						InstitutionType: "",
						InstitutionTypeOther: "",
						CurrentClass: "",
						CurrentClassOther: "",
						LastFormalQualification: "",
						LastFormalQualificationOther: "",
						HighestQualification: "",
						HighestQualificationOther: "",
					},
					livelihood: {
						IsCurrentlyEarning: "",
						EarningSource: "",
						EarningSourceOther: "",
						SalariedWorkSector: "",
						SalariedWorkSectorOther: "",
						WorkField: "",
						WorkFieldOther: "",
						MonthlyIncome: "",
						JoblessDuration: "",
						ReasonNotEarning: "",
						ReasonNotEarningOther: "",
					},
				},
			];
		});
	};

	const removeFamilyMember = (index: number) => {
		setFamilyMembers((prev) => {
			const updated = prev.filter((_, i) => i !== index);
			// Recalculate MemberNo for remaining members
			const formNo = applicationData.FormNo || "PE-00001";
			return updated.map((member, i) => ({
				...member,
				MemberNo: `${formNo}-${String(i + 1).padStart(2, '0')}`
			}));
		});
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

			// Validate all family members - all fields are required
			for (let i = 0; i < familyMembers.length; i++) {
				const member = familyMembers[i];
				const memberNumber = i + 1;
				
				if (!member.MemberNo || member.MemberNo.trim() === "") {
					setError(`Member No is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.FullName || member.FullName.trim() === "") {
					setError(`Full Name is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.BFormOrCNIC || member.BFormOrCNIC.trim() === "") {
					setError(`B-Form or CNIC is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.RelationshipId || member.RelationshipId.trim() === "") {
					setError(`Relationship is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.GenderId || member.GenderId.trim() === "") {
					setError(`Gender is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.MaritalStatusId || member.MaritalStatusId.trim() === "") {
					setError(`Marital Status is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.DOBMonth || member.DOBMonth.trim() === "") {
					setError(`Date of Birth - Month is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				if (!member.DOBYear || member.DOBYear.trim() === "") {
					setError(`Date of Birth - Year is required for Family Member ${memberNumber}`);
					setSaving(false);
					return;
				}
				
				// If currently earning (Yes), Monthly Income is required
				if (member.livelihood?.IsCurrentlyEarning === "1") {
					if (!member.livelihood.MonthlyIncome || member.livelihood.MonthlyIncome.trim() === "") {
						setError(`Member per month Income is required for Family Member ${memberNumber} (currently earning)`);
						setSaving(false);
						return;
					}
				}
			}

			// All family members are valid if they pass validation
			const validFamilyMembers = familyMembers;

			const isEditing = Boolean(editingApplicationId);
			const payload = {
				application: {
					FormNo: applicationData.FormNo,
					TotalFamilyMembers: applicationData.TotalFamilyMembers || (validFamilyHeads.length + validFamilyMembers.length).toString(),
					Remarks: applicationData.Remarks || null,
					...(isEditing ? { ApplicationId: Number(editingApplicationId) } : {}),
				},
				familyHeads: validFamilyHeads,
				familyMembers: validFamilyMembers,
			};

			const response = await fetch("/api/baseline-applications", {
				method: isEditing ? "PUT" : "POST",
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
				setError(data.message || "Failed to create application");
			}
		} catch (err: any) {
			console.error("Error creating application:", err);
			setError(err.message || "Error creating application. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const months = [
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add Baseline Application</h1>
					<p className="text-gray-600 mt-2">Create a new PE Application</p>
				</div>
				<button
					onClick={() => router.back()}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
			</div>

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">Application created successfully! Redirecting...</p>
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
								<div className="flex justify-end mt-4">
									<button
										type="submit"
										className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
									>
										<Save className="h-4 w-4" />
										Save Family Head Information
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Family Members Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">Family Members</h2>
						<button
							type="button"
							onClick={addFamilyMember}
							className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Add Member
						</button>
					</div>

					{familyMembers.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<p>No family members added yet. Click "Add Member" to add a family member.</p>
						</div>
					) : (
						<div className="space-y-8">
							{familyMembers.map((member, index) => (
								<div key={index} className="border border-gray-200 rounded-lg p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-gray-900">
											Family Member {index + 1}
										</h3>
										<button
											type="button"
											onClick={() => removeFamilyMember(index)}
											className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
										>
											<Trash2 className="h-4 w-4" />
											Remove
										</button>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Member No <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={member.MemberNo}
												readOnly
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												placeholder="Auto-generated"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Full Name <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={member.FullName}
												onChange={(e) => handleFamilyMemberChange(index, "FullName", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												placeholder="Enter full name"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												B-Form or CNIC <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={member.BFormOrCNIC}
												onChange={(e) => handleFamilyMemberChange(index, "BFormOrCNIC", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												placeholder="Enter B-Form or CNIC"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Relationship ID <span className="text-red-500">*</span>
											</label>
											<select
												value={member.RelationshipId}
												onChange={(e) => handleFamilyMemberChange(index, "RelationshipId", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											>
												<option value="">Select Relationship</option>
												{relationships.map((rel) => (
													<option key={rel.RelationshipId} value={rel.RelationshipId.toString()}>
														{rel.RelationshipName}
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Gender <span className="text-red-500">*</span>
											</label>
											<select
												value={member.GenderId}
												onChange={(e) => handleFamilyMemberChange(index, "GenderId", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											>
												<option value="">Select Gender</option>
												{genders.map((gender) => (
													<option key={gender.GenderId} value={gender.GenderId.toString()}>
														{gender.GenderName}
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Marital Status <span className="text-red-500">*</span>
											</label>
											<select
												value={member.MaritalStatusId}
												onChange={(e) => handleFamilyMemberChange(index, "MaritalStatusId", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											>
												<option value="">Select Marital Status</option>
												{maritalStatuses.map((status) => (
													<option key={status.MaritalStatusId} value={status.MaritalStatusId.toString()}>
														{status.MaritalStatusName}
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Date of Birth - Month <span className="text-red-500">*</span>
											</label>
											<select
												value={member.DOBMonth}
												onChange={(e) => handleFamilyMemberChange(index, "DOBMonth", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											>
												{months.map((month, i) => (
													<option key={i} value={i === 0 ? "" : i.toString()}>
														{month}
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Date of Birth - Year <span className="text-red-500">*</span>
											</label>
											<select
												value={member.DOBYear}
												onChange={(e) => handleFamilyMemberChange(index, "DOBYear", e.target.value)}
												required
												className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											>
												<option value="">Select Year</option>
												{years.map((year) => (
													<option key={year} value={year.toString()}>
														{year}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Education Section */}
									<div className="mt-6 pt-6 border-t border-gray-200">
										<h3 className="text-lg font-semibold text-gray-900 mb-4">Education Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Q.FM1: Are you currently studying? */}
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													Are you currently studying?
												</label>
												<select
													value={member.education.IsCurrentlyStudying}
													onChange={(e) => handleEducationChange(index, "IsCurrentlyStudying", e.target.value)}
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select option</option>
													<option value="1">1) Yes</option>
													<option value="2">2) No</option>
													<option value="99">99) Not applicable</option>
												</select>
											</div>

											{/* Show fields if Yes (IsCurrentlyStudying === "1") */}
											{member.education.IsCurrentlyStudying === "1" && (
												<>
													{/* Q.FM1.1: Type of Institution */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Type of Institution
														</label>
														<select
															value={member.education.InstitutionType}
															onChange={(e) => handleEducationChange(index, "InstitutionType", e.target.value)}
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														>
															<option value="">Select option</option>
															<option value="1">1) AKES</option>
															<option value="2">2) Private</option>
															<option value="3">3) Government</option>
															<option value="4">4) NGO</option>
															<option value="5">5) Community based</option>
															<option value="98">98) Others</option>
															<option value="99">99) Not applicable</option>
														</select>
													</div>

													{/* Show "Other" field if InstitutionType is "98" */}
													{member.education.InstitutionType === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Institution Type Other
															</label>
															<input
																type="text"
																value={member.education.InstitutionTypeOther}
																onChange={(e) => handleEducationChange(index, "InstitutionTypeOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other institution type"
															/>
														</div>
													)}

													{/* Q.FM1.2: Current class */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Current class
														</label>
														<select
															value={member.education.CurrentClass}
															onChange={(e) => handleEducationChange(index, "CurrentClass", e.target.value)}
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														>
															<option value="">Select option</option>
															<option value="1">1) ECD/pre-primary</option>
															<option value="2">2) Primary</option>
															<option value="3">3) Secondary (till Matric / O-Levels)</option>
															<option value="4">4) Higher secondary (Inter / A-Levels)</option>
															<option value="5">5) Bachelors (Graduate)</option>
															<option value="6">6) Masters (Post graduate)</option>
															<option value="7">7) M. Phil / PhD</option>
															<option value="8">8) Diploma</option>
															<option value="9">9) Professional certification</option>
															<option value="98">98) Others</option>
															<option value="99">99) Not applicable</option>
														</select>
													</div>

													{/* Show "Other" field if CurrentClass is "98" */}
													{member.education.CurrentClass === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Current Class Other
															</label>
															<input
																type="text"
																value={member.education.CurrentClassOther}
																onChange={(e) => handleEducationChange(index, "CurrentClassOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other current class"
															/>
														</div>
													)}
												</>
											)}

											{/* Q.FM1.5: If currently availing any diploma / professional certificate / others */}
											{(member.education.CurrentClass === "8" || member.education.CurrentClass === "9" || member.education.CurrentClass === "98") && (
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														If currently availing any diploma / professional certificate / others, what is the last formal qualification you have completed?
													</label>
													<select
														value={member.education.LastFormalQualification}
														onChange={(e) => handleEducationChange(index, "LastFormalQualification", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													>
														<option value="">Select option</option>
														<option value="1">1) ECD / pre-primary</option>
														<option value="2">2) Primary</option>
														<option value="3">3) Secondary (till Matric / O-Levels)</option>
														<option value="4">4) Higher secondary (Inter / A-Levels)</option>
														<option value="5">5) Bachelors (Graduate)</option>
														<option value="6">6) Masters (Post graduate)</option>
														<option value="7">7) M. Phil / PhD</option>
														<option value="98">98) Others</option>
														<option value="99">99) Not applicable</option>
													</select>
												</div>
											)}

											{/* Show "Other" field if LastFormalQualification is "98" */}
											{member.education.LastFormalQualification === "98" && (
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														Last Formal Qualification Other
													</label>
													<input
														type="text"
														value={member.education.LastFormalQualificationOther}
														onChange={(e) => handleEducationChange(index, "LastFormalQualificationOther", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Specify other last formal qualification"
													/>
												</div>
											)}

											{/* Q.FM1.7: What is your highest qualification? */}
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													What is your highest qualification?
												</label>
												<select
													value={member.education.HighestQualification}
													onChange={(e) => handleEducationChange(index, "HighestQualification", e.target.value)}
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select option</option>
													<option value="1">1) ECD/pre-primary</option>
													<option value="2">2) Primary</option>
													<option value="3">3) Secondary (till matric / O-Levels)</option>
													<option value="4">4) Higher secondary (Inter / A-Levels)</option>
													<option value="5">5) Bachelors (Graduate)</option>
													<option value="6">6) Masters (Post graduate)</option>
													<option value="7">7) M. Phil / PhD</option>
													<option value="8">8) Diploma</option>
													<option value="9">9) Professional certification</option>
													<option value="98">98) Others</option>
													<option value="99">99) Not applicable</option>
												</select>
											</div>

											{/* Show "Other" field if HighestQualification is "98" */}
											{member.education.HighestQualification === "98" && (
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														Highest Qualification Other
													</label>
													<input
														type="text"
														value={member.education.HighestQualificationOther}
														onChange={(e) => handleEducationChange(index, "HighestQualificationOther", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Specify other highest qualification"
													/>
												</div>
											)}
										</div>
									</div>

									{/* Livelihood Section */}
									<div className="mt-6 pt-6 border-t border-gray-200">
										<h3 className="text-lg font-semibold text-gray-900 mb-4">Livelihood Information</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Q.FM15: Are you currently earning? */}
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													Are you currently earning?
												</label>
												<select
													value={member.livelihood.IsCurrentlyEarning}
													onChange={(e) => handleLivelihoodChange(index, "IsCurrentlyEarning", e.target.value)}
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select option</option>
													<option value="1">1) Yes</option>
													<option value="2">2) No</option>
													<option value="99">99) Not applicable</option>
												</select>
											</div>

											{/* Show fields if Yes (IsCurrentlyEarning === "1") */}
											{member.livelihood.IsCurrentlyEarning === "1" && (
												<>
													{/* Q.FM15.1: What is the source of your earning? */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															What is the source of your earning?
														</label>
														<select
															value={member.livelihood.EarningSource}
															onChange={(e) => handleLivelihoodChange(index, "EarningSource", e.target.value)}
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														>
															<option value="">Select option</option>
															<option value="1">1) Salaried (employment)</option>
															<option value="2">2) Business</option>
															<option value="3">3) Self-employed</option>
															<option value="4">4) Agriculture / Livestock</option>
															<option value="5">5) Wage earner</option>
															<option value="98">98) Others</option>
														</select>
													</div>

													{/* Show "Other" field if EarningSource is "98" */}
													{member.livelihood.EarningSource === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Earning Source Other
															</label>
															<input
																type="text"
																value={member.livelihood.EarningSourceOther}
																onChange={(e) => handleLivelihoodChange(index, "EarningSourceOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other earning source"
															/>
														</div>
													)}

													{/* Q.FM15.2: If Salaried: where do you currently work? */}
													{member.livelihood.EarningSource === "1" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																If Salaried: where do you currently work?
															</label>
															<select
																value={member.livelihood.SalariedWorkSector}
																onChange={(e) => handleLivelihoodChange(index, "SalariedWorkSector", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select option</option>
																<option value="1">1) Government</option>
																<option value="2">2) Private</option>
																<option value="3">3) NGO</option>
																<option value="98">98) Others</option>
																<option value="99">99) Not Applicable</option>
															</select>
														</div>
													)}

													{/* Show "Other" field if SalariedWorkSector is "98" */}
													{member.livelihood.SalariedWorkSector === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Salaried Work Sector Other
															</label>
															<input
																type="text"
																value={member.livelihood.SalariedWorkSectorOther}
																onChange={(e) => handleLivelihoodChange(index, "SalariedWorkSectorOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other salaried work sector"
															/>
														</div>
													)}

													{/* Q.FM15.3: If Salaried OR Self-employed: specify the field? */}
													{(member.livelihood.EarningSource === "1" || member.livelihood.EarningSource === "3") && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																If Salaried OR Self-employed: specify the field?
															</label>
															<select
																value={member.livelihood.WorkField}
																onChange={(e) => handleLivelihoodChange(index, "WorkField", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select option</option>
																<option value="1">1) Education</option>
																<option value="2">2) IT professional</option>
																<option value="3">3) Agriculture</option>
																<option value="4">4) Health</option>
																<option value="5">5) Labor</option>
																<option value="6">6) Civil / engineering / construction / architecture</option>
																<option value="7">7) Accounting / taxation / audit</option>
																<option value="8">8) Financial institution (bank / society / investment company / brokerage firm / insurance)</option>
																<option value="9">9) Trading (retail / wholesale)</option>
																<option value="10">10) Media / communications / public relations</option>
																<option value="11">11) Shop worker (retail / grocery / food stall)</option>
																<option value="12">12) Transportation (driver / rider)</option>
																<option value="98">98) Others</option>
																<option value="99">99) Not Applicable</option>
															</select>
														</div>
													)}

													{/* Show "Other" field if WorkField is "98" */}
													{member.livelihood.WorkField === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Work Field Other
															</label>
															<input
																type="text"
																value={member.livelihood.WorkFieldOther}
																onChange={(e) => handleLivelihoodChange(index, "WorkFieldOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other work field"
															/>
														</div>
													)}

													{/* Monthly Income */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Member per month Income <span className="text-red-500">*</span>
														</label>
														<input
															type="number"
															value={member.livelihood.MonthlyIncome}
															onChange={(e) => handleLivelihoodChange(index, "MonthlyIncome", e.target.value)}
															required
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															placeholder="Enter monthly income"
															min="0"
															step="0.01"
														/>
													</div>
												</>
											)}

											{/* Show fields if No (IsCurrentlyEarning === "2") */}
											{member.livelihood.IsCurrentlyEarning === "2" && (
												<>
													{/* Q.FM15.6: Since how long are you jobless/out of business */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Since how long are you jobless/out of business
														</label>
														<select
															value={member.livelihood.JoblessDuration}
															onChange={(e) => handleLivelihoodChange(index, "JoblessDuration", e.target.value)}
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														>
															<option value="">Select option</option>
															<option value="1">1) Less than 6 month</option>
															<option value="2">2) 6 - 12 months</option>
															<option value="3">3) 12 months to 24 months</option>
															<option value="4">4) More than 24 months</option>
															<option value="99">99) Not applicable</option>
														</select>
													</div>

													{/* Q.FM15.8: Reason for not currently earning? */}
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-2">
															Reason for not currently earning?
														</label>
														<select
															value={member.livelihood.ReasonNotEarning}
															onChange={(e) => handleLivelihoodChange(index, "ReasonNotEarning", e.target.value)}
															className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														>
															<option value="">Select option</option>
															<option value="1">1) Cannot get a job</option>
															<option value="2">2) Non-availability of desirable job</option>
															<option value="3">3) Family does not allow</option>
															<option value="4">4) Job offers have lower than desirable salary</option>
															<option value="98">98) Others</option>
															<option value="99">99) Not Applicable</option>
														</select>
													</div>

													{/* Show "Other" field if ReasonNotEarning is "98" */}
													{member.livelihood.ReasonNotEarning === "98" && (
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																Reason Not Earning Other
															</label>
															<input
																type="text"
																value={member.livelihood.ReasonNotEarningOther}
																onChange={(e) => handleLivelihoodChange(index, "ReasonNotEarningOther", e.target.value)}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																placeholder="Specify other reason"
															/>
														</div>
													)}
												</>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
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
						{saving ? "Saving..." : "Save Application"}
					</button>
				</div>
			</form>
		</div>
	);
}

