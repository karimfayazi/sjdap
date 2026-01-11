"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type BasicInfoFormData = {
	FormNumber: string;
	ApplicationDate: string;
	ReceivedByName: string;
	ReceivedByDate: string;
	Full_Name: string;
	DateOfBirth: string;
	CNICNumber: string;
	MotherTongue: string;
	ResidentialAddress: string;
	PrimaryContactNumber: string;
	SecondaryContactNumber: string;
	RegionalCommunity: string;
	LocalCommunity: string;
	CurrentCommunityCenter: string;
	PrimaryLocationSettlement: string;
	AreaOfOrigin: string;
	Area_Type: string;
	Intake_family_Income: string;
	HouseOwnershipStatus: string;
	HealthInsuranceProgram: string;
	MonthlyIncome_Remittance: string;
	MonthlyIncome_Rental: string;
	MonthlyIncome_OtherSources: string;
	// Financial Assets fields (now in same table)
	Land_Barren_Kanal: string;
	Land_Barren_Value_Rs: string;
	Land_Agriculture_Kanal: string;
	Land_Agriculture_Value_Rs: string;
	Livestock_Number: string;
	Livestock_Value_Rs: string;
	Fruit_Trees_Number: string;
	Fruit_Trees_Value_Rs: string;
	Vehicles_4W_Number: string;
	Vehicles_4W_Value_Rs: string;
	Motorcycle_2W_Number: string;
	Motorcycle_2W_Value_Rs: string;
};

// FinancialAssetsData type removed - all fields are now in BasicInfoFormData

// Location hierarchy is now fetched from View_FEAP_SEDP via API

type FamilyMemberData = {
	MemberNo: string;
	FullName: string;
	RelationshipId: string;
	GenderId: string;
	MaritalStatusId: string;
	DOBMonth: string;
	DOBYear: string;
	BFormOrCNIC: string;
	OccupationId: string;
	PrimaryLocation: string;
	IsPrimaryEarner: boolean;
	education: {
		IsCurrentlyStudying: string;
		InstitutionType: string;
		CurrentClass: string;
		HighestQualification: string;
	};
	livelihood: {
		IsCurrentlyEarning: string;
		EarningSource: string;
		SalariedWorkSector: string;
		WorkField: string;
		MonthlyIncome: string;
		JoblessDuration: string;
		ReasonNotEarning: string;
	};
};


export default function AddBaselineApplicationPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [formData, setFormData] = useState<BasicInfoFormData>({
		FormNumber: "PE-00001", // Default value, will be updated when fetched
		ApplicationDate: "",
		ReceivedByName: "",
		ReceivedByDate: "",
		Full_Name: "",
		DateOfBirth: "",
		CNICNumber: "",
			MotherTongue: "",
			ResidentialAddress: "",
		PrimaryContactNumber: "",
		SecondaryContactNumber: "",
		RegionalCommunity: "",
		LocalCommunity: "",
		CurrentCommunityCenter: "",
			PrimaryLocationSettlement: "",
			AreaOfOrigin: "",
			Area_Type: "",
			Intake_family_Income: "",
		HouseOwnershipStatus: "",
		HealthInsuranceProgram: "",
		MonthlyIncome_Remittance: "",
		MonthlyIncome_Rental: "",
		MonthlyIncome_OtherSources: "",
		// Financial Assets fields
		Land_Barren_Kanal: "",
		Land_Barren_Value_Rs: "",
		Land_Agriculture_Kanal: "",
		Land_Agriculture_Value_Rs: "",
		Livestock_Number: "",
		Livestock_Value_Rs: "",
		Fruit_Trees_Number: "",
		Fruit_Trees_Value_Rs: "",
		Vehicles_4W_Number: "",
		Vehicles_4W_Value_Rs: "",
		Motorcycle_2W_Number: "",
		Motorcycle_2W_Value_Rs: "",
	});

	const [familyMembers, setFamilyMembers] = useState<FamilyMemberData[]>([]);
	const [savingSection, setSavingSection] = useState<string | null>(null);
	const [sectionSaved, setSectionSaved] = useState<{ [key: string]: boolean }>({});

	const [loadingFormNo, setLoadingFormNo] = useState(true);
	const [loadingExistingData, setLoadingExistingData] = useState(false);
	const [regionalCommunities, setRegionalCommunities] = useState<string[]>([]);
	const [localCommunities, setLocalCommunities] = useState<string[]>([]);
	const [communityCenters, setCommunityCenters] = useState<string[]>([]);
	const [loadingLocalCommunities, setLoadingLocalCommunities] = useState(false);
	const [loadingCommunityCenters, setLoadingCommunityCenters] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [formNoParam, setFormNoParam] = useState<string | null>(null);

	// FIRST: Check URL parameter for formNo and set it immediately
	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const formNo = params.get("formNo");
		
		// If formNo exists in URL, we're in edit mode - set it immediately
		if (formNo) {
			setFormNoParam(formNo);
			setIsEditMode(true);
			// Set form number immediately so it's visible and prevents fetching next form number
			setFormData((prev) => ({ ...prev, FormNumber: formNo }));
			setLoadingFormNo(false);
			console.log("Edit mode detected - Form Number from URL:", formNo);
		}
	}, []); // Run only once on mount

	// Fetch next Form No and location hierarchy on component mount
	// Only fetch if not in edit mode
	useEffect(() => {
		// Don't fetch next form number if we're in edit mode (formNoParam exists)
		if (formNoParam) {
			setLoadingFormNo(false);
			return;
		}
		
		const fetchNextFormNo = async () => {
			try {
				const response = await fetch("/api/baseline-applications?action=getNextFormNo");
				const data = await response.json();
				if (data.success && data.nextFormNo) {
					setFormData((prev) => ({ ...prev, FormNumber: data.nextFormNo }));
					console.log("Next Form Number fetched:", data.nextFormNo);
				} else {
					// Default to PE-00001 if fetch fails
					setFormData((prev) => ({ ...prev, FormNumber: "PE-00001" }));
				}
			} catch (error) {
				console.error("Error fetching next Form No:", error);
				// Default to PE-00001 if fetch fails
				setFormData((prev) => ({ ...prev, FormNumber: "PE-00001" }));
			} finally {
				setLoadingFormNo(false);
			}
		};

		const fetchRegionalCommunities = async () => {
			try {
				const response = await fetch("/api/baseline-applications/location-hierarchy");
				const data = await response.json();
				if (data.success && data.data) {
					setRegionalCommunities(data.data);
				}
			} catch (error) {
				console.error("Error fetching regional communities:", error);
			}
		};

		// Set Application Date to today's date for new applications (not in edit mode)
		if (!formNoParam) {
			const today = new Date().toISOString().split('T')[0];
			setFormData((prev) => ({ ...prev, ApplicationDate: today }));
		}

		// Only fetch next form number if not in edit mode
		if (!formNoParam) {
			fetchNextFormNo();
		}
		fetchRegionalCommunities();
	}, [formNoParam]);

	// Fetch Local Communities when Regional Community is selected
	useEffect(() => {
		if (formData.RegionalCommunity) {
			setLoadingLocalCommunities(true);
			fetch(`/api/baseline-applications/location-hierarchy?regionalCouncil=${encodeURIComponent(formData.RegionalCommunity)}`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data) {
						setLocalCommunities(data.data);
					} else {
						setLocalCommunities([]);
					}
				})
				.catch((error) => {
					console.error("Error fetching local communities:", error);
					setLocalCommunities([]);
				})
				.finally(() => {
					setLoadingLocalCommunities(false);
				});
		} else {
			setLocalCommunities([]);
			setFormData((prev) => ({ ...prev, LocalCommunity: "", CurrentCommunityCenter: "" }));
		}
	}, [formData.RegionalCommunity]);

	// Fetch Community Centers when Local Community is selected
	useEffect(() => {
		if (formData.RegionalCommunity && formData.LocalCommunity) {
			setLoadingCommunityCenters(true);
			fetch(`/api/baseline-applications/location-hierarchy?regionalCouncil=${encodeURIComponent(formData.RegionalCommunity)}&localCouncil=${encodeURIComponent(formData.LocalCommunity)}`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data) {
						setCommunityCenters(data.data);
					} else {
						setCommunityCenters([]);
					}
				})
				.catch((error) => {
					console.error("Error fetching community centers:", error);
					setCommunityCenters([]);
				})
				.finally(() => {
					setLoadingCommunityCenters(false);
				});
		} else {
			setCommunityCenters([]);
			if (!formData.LocalCommunity) {
				setFormData((prev) => ({ ...prev, CurrentCommunityCenter: "" }));
			}
		}
	}, [formData.RegionalCommunity, formData.LocalCommunity]);

	// Load existing application data when in edit mode
	useEffect(() => {
		if (!formNoParam) return;
		
		// Ensure form number is ALWAYS set from URL parameter (this is the source of truth)
		setFormData((prev) => {
			if (prev.FormNumber !== formNoParam) {
				console.log("Updating FormNumber from URL parameter:", formNoParam);
				return { ...prev, FormNumber: formNoParam };
			}
			return prev;
		});

		const fetchApplicationData = async () => {
			try {
				setLoadingExistingData(true);
				// Fetch using formNo - need to check if API supports PE_Application_BasicInfo
				const response = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNoParam)}`);
				const data = await response.json();
				
				if (data.success && data.data) {
					const app = data.data;
					setLoadingFormNo(false);
					
					// ALWAYS use formNoParam (from URL) as the source of truth for FormNumber in edit mode
					// Never use app.FormNumber from API - the URL parameter is authoritative
					console.log("Loading application for edit - FormNumber from URL (using this):", formNoParam, "FormNumber from API (ignored):", app.FormNumber);
					
					setFormData({
						FormNumber: formNoParam, // Always use the URL parameter
						ApplicationDate: app.ApplicationDate ? app.ApplicationDate.split('T')[0] : "",
						ReceivedByName: app.ReceivedByName || "",
						ReceivedByDate: app.ReceivedByDate ? app.ReceivedByDate.split('T')[0] : "",
						Full_Name: app.Full_Name || "",
						DateOfBirth: app.DateOfBirth ? app.DateOfBirth.split('T')[0] : "",
						CNICNumber: app.CNICNumber || "",
						MotherTongue: app.MotherTongue || "",
						ResidentialAddress: app.ResidentialAddress || "",
						PrimaryContactNumber: app.PrimaryContactNumber || "",
						SecondaryContactNumber: app.SecondaryContactNumber || "",
						RegionalCommunity: app.RegionalCommunity || "",
						LocalCommunity: app.LocalCommunity || "",
						CurrentCommunityCenter: app.CurrentCommunityCenter || "",
						PrimaryLocationSettlement: app.PrimaryLocationSettlement || "",
						AreaOfOrigin: app.AreaOfOrigin || "",
						Area_Type: app.Area_Type || "",
						Intake_family_Income: app.Intake_family_Income != null ? app.Intake_family_Income.toString() : "",
						HouseOwnershipStatus: app.HouseOwnershipStatus || "",
						HealthInsuranceProgram: app.HealthInsuranceProgram || "",
						MonthlyIncome_Remittance: app.MonthlyIncome_Remittance != null ? app.MonthlyIncome_Remittance.toString() : "",
						MonthlyIncome_Rental: app.MonthlyIncome_Rental != null ? app.MonthlyIncome_Rental.toString() : "",
						MonthlyIncome_OtherSources: app.MonthlyIncome_OtherSources != null ? app.MonthlyIncome_OtherSources.toString() : "",
						// Financial Assets fields (now in same table)
						Land_Barren_Kanal: app.Land_Barren_Kanal?.toString() || "",
						Land_Barren_Value_Rs: app.Land_Barren_Value_Rs != null ? app.Land_Barren_Value_Rs.toString() : "",
						Land_Agriculture_Kanal: app.Land_Agriculture_Kanal?.toString() || "",
						Land_Agriculture_Value_Rs: app.Land_Agriculture_Value_Rs != null ? app.Land_Agriculture_Value_Rs.toString() : "",
						Livestock_Number: app.Livestock_Number?.toString() || "",
						Livestock_Value_Rs: app.Livestock_Value_Rs != null ? app.Livestock_Value_Rs.toString() : "",
						Fruit_Trees_Number: app.Fruit_Trees_Number?.toString() || "",
						Fruit_Trees_Value_Rs: app.Fruit_Trees_Value_Rs != null ? app.Fruit_Trees_Value_Rs.toString() : "",
						Vehicles_4W_Number: app.Vehicles_4W_Number?.toString() || "",
						Vehicles_4W_Value_Rs: app.Vehicles_4W_Value_Rs != null ? app.Vehicles_4W_Value_Rs.toString() : "",
						Motorcycle_2W_Number: app.Motorcycle_2W_Number?.toString() || "",
						Motorcycle_2W_Value_Rs: app.Motorcycle_2W_Value_Rs != null ? app.Motorcycle_2W_Value_Rs.toString() : "",
					});
					
					// Fetch local communities and community centers for the selected values in edit mode
					const regionalCommunity = app.RegionalCommunity || "";
					const localCommunity = app.LocalCommunity || "";
					
					if (regionalCommunity) {
						fetch(`/api/baseline-applications/location-hierarchy?regionalCouncil=${encodeURIComponent(regionalCommunity)}`)
							.then((res) => res.json())
							.then((data) => {
								if (data.success && data.data) {
									setLocalCommunities(data.data);
									if (localCommunity) {
										fetch(`/api/baseline-applications/location-hierarchy?regionalCouncil=${encodeURIComponent(regionalCommunity)}&localCouncil=${encodeURIComponent(localCommunity)}`)
											.then((res2) => res2.json())
											.then((data2) => {
												if (data2.success && data2.data) {
													setCommunityCenters(data2.data);
												}
											})
											.catch((err) => console.error("Error fetching community centers:", err));
									}
								}
							})
							.catch((err) => console.error("Error fetching local communities:", err));
					}
					
					// Fetch family members data
					const membersResponse = await fetch(`/api/baseline-applications/family-members-data?formNumber=${encodeURIComponent(formNoParam)}`);
					const membersData = await membersResponse.json();
					
					if (membersData.success && membersData.data) {
						const members = membersData.data.map((m: any, index: number) => {
							// Normalize IsCurrentlyStudying to "Yes" or "No"
							let isCurrentlyStudying = "";
							if (m.IsCurrentlyStudying) {
								const value = String(m.IsCurrentlyStudying).trim();
								if (value.toLowerCase() === "yes" || value === "1" || value === "true") {
									isCurrentlyStudying = "Yes";
								} else if (value.toLowerCase() === "no" || value === "0" || value === "false") {
									isCurrentlyStudying = "No";
								} else {
									isCurrentlyStudying = value; // Keep original if it's something else
								}
							}
							
							// Normalize IsCurrentlyEarning to "Yes" or "No"
							let isCurrentlyEarning = "";
							if (m.IsCurrentlyEarning) {
								const value = String(m.IsCurrentlyEarning).trim();
								if (value.toLowerCase() === "yes" || value === "1" || value === "true") {
									isCurrentlyEarning = "Yes";
								} else if (value.toLowerCase() === "no" || value === "0" || value === "false") {
									isCurrentlyEarning = "No";
								} else {
									isCurrentlyEarning = value; // Keep original if it's something else
								}
							}
							
							// First member (index 0) must have "Self" as relationship
							const relationshipId = index === 0 ? "Self" : (m.Relationship || m.RelationshipId || "");
							
							return {
								MemberNo: m.MemberNo || "",
								FullName: m.FullName || "",
								RelationshipId: relationshipId,
								GenderId: m.Gender || m.GenderId || "",
								MaritalStatusId: m.MaritalStatus || m.MaritalStatusId || "",
								DOBMonth: m.DOBMonth || "",
								DOBYear: m.DOBYear || "",
								BFormOrCNIC: m.BFormOrCNIC || "",
								OccupationId: m.Occupation || m.OccupationId || "",
								PrimaryLocation: m.PrimaryLocation || "",
								IsPrimaryEarner: m.IsPrimaryEarner || false,
								education: {
									IsCurrentlyStudying: isCurrentlyStudying,
									InstitutionType: m.InstitutionType || "",
									CurrentClass: m.CurrentClass || "",
									HighestQualification: m.HighestQualification || "",
								},
								livelihood: {
									IsCurrentlyEarning: isCurrentlyEarning,
									EarningSource: m.EarningSource || "",
									SalariedWorkSector: m.SalariedWorkSector || "",
									WorkField: m.WorkField || "",
									MonthlyIncome: m.MonthlyIncome?.toString() || "",
									JoblessDuration: m.JoblessDuration || "",
									ReasonNotEarning: m.ReasonNotEarning || "",
								},
							};
						});
						setFamilyMembers(members);
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

	// Calculate age from DOBMonth and DOBYear
	const calculateAge = (dobMonth: string, dobYear: string): number | null => {
		if (!dobMonth || !dobYear) return null;
		
		const monthMap: { [key: string]: number } = {
			"Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
			"Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
		};
		
		const month = monthMap[dobMonth];
		const year = parseInt(dobYear);
		
		if (isNaN(year) || month === undefined) return null;
		
		const today = new Date();
		const birthDate = new Date(year, month, 1);
		
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		
		return age;
	};

	// Format CNIC number with dashes (42101-4466917-3)
	const formatCNIC = (value: string): string => {
		// Remove all non-digits
		const digits = value.replace(/\D/g, '');
		
		// Format: 5 digits - 7 digits - 1 digit
		if (digits.length <= 5) {
			return digits;
		} else if (digits.length <= 12) {
			return `${digits.slice(0, 5)}-${digits.slice(5)}`;
		} else {
			return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
		}
	};

	// Get Income and Area Type based on Regional Community and Local Community
	const getIncomeAndAreaType = (regionalCommunity: string, localCommunity: string): { income: string; areaType: string } => {
		// Mapping based on Regional Community and Local Community
		const mapping: { [key: string]: { income: string; areaType: string } } = {
			"CENTRAL REGION": { income: "19200", areaType: "Urban" },
			"GILGIT REGION|GILGIT": { income: "16100", areaType: "Peri-Urban" },
			"GILGIT REGION|SKARDU": { income: "10800", areaType: "Rural" },
			"GILGIT REGION|SUL, DAN & OSHIKHANDAS": { income: "16100", areaType: "Peri-Urban" },
			"GUPIS & YASIN REGION": { income: "10800", areaType: "Rural" },
			"HUNZA REGION": { income: "10800", areaType: "Rural" },
			"ISHKOMAN & PUNIYAL REGION": { income: "10800", areaType: "Rural" },
			"LOWER CHITRAL REGION": { income: "10800", areaType: "Rural" },
			"SOUTHERN REGION": { income: "19200", areaType: "Urban" },
			"UPPER CHITRAL REGION": { income: "10800", areaType: "Rural" },
		};

		// For GILGIT REGION, Local Community is required
		if (regionalCommunity === "GILGIT REGION") {
			if (localCommunity) {
				const key = `${regionalCommunity}|${localCommunity}`;
				if (mapping[key]) {
					return mapping[key];
				}
			}
			// If GILGIT REGION but no Local Community selected yet, return empty
			return { income: "", areaType: "" };
		}

		// For other regions, use just Regional Community
		if (mapping[regionalCommunity]) {
			return mapping[regionalCommunity];
		}

		// Default values
		return { income: "", areaType: "" };
	};

	const handleChange = (field: keyof BasicInfoFormData, value: string) => {
		// Format CNIC number if it's the CNIC field
		if (field === "CNICNumber") {
			const formatted = formatCNIC(value);
			setFormData((prev) => ({ ...prev, [field]: formatted }));
		} else if (field === "ApplicationDate") {
			// If Application Date changes, reset Received By Date if it's now invalid
			setFormData((prev) => {
				if (prev.ReceivedByDate && value) {
					const receivedDate = new Date(prev.ReceivedByDate);
					const appDate = new Date(value);
					receivedDate.setHours(0, 0, 0, 0);
					appDate.setHours(0, 0, 0, 0);
					
					// If Received By Date is not before Application Date, reset it
					if (receivedDate >= appDate) {
						return { ...prev, [field]: value, ReceivedByDate: "" };
					}
				}
				return { ...prev, [field]: value };
			});
		} else {
			setFormData((prev) => {
				const updated = { ...prev, [field]: value };
				
				// If RegionalCommunity changes, reset dependent fields and update income/area type
				if (field === "RegionalCommunity") {
					updated.LocalCommunity = "";
					updated.CurrentCommunityCenter = "";
					// Update income and area type based on new Regional Community
					const { income, areaType } = getIncomeAndAreaType(value, "");
					updated.Intake_family_Income = income;
					updated.Area_Type = areaType;
				}
				// If LocalCommunity changes, update income and area type
				else if (field === "LocalCommunity") {
					updated.CurrentCommunityCenter = "";
					// Update income and area type when LocalCommunity is selected
					if (prev.RegionalCommunity) {
						const { income, areaType } = getIncomeAndAreaType(prev.RegionalCommunity, value);
						updated.Intake_family_Income = income;
						updated.Area_Type = areaType;
					}
				}
				
				return updated;
			});
		}
	};

	const handleAssetsChange = (field: keyof BasicInfoFormData, value: string) => {
		handleChange(field, value);
	};

	const addFamilyMember = () => {
		// Ensure FormNumber is available
		if (!formData.FormNumber || formData.FormNumber.trim() === "") {
			setError("Please save Basic Information first to get a Form Number");
			return;
		}
		
		// Find the highest existing MemberNo number
		let maxMemberNumber = 0;
		
		if (familyMembers.length > 0) {
			// Extract numbers from existing MemberNos (format: FormNumber-01, FormNumber-02, etc.)
			const memberNumbers = familyMembers
				.map(member => {
					if (!member.MemberNo) return 0;
					// Extract the number after the last dash (e.g., "PE-00001-01" -> "01" -> 1)
					const parts = member.MemberNo.split('-');
					if (parts.length > 0) {
						const lastPart = parts[parts.length - 1];
						const num = parseInt(lastPart, 10);
						return isNaN(num) ? 0 : num;
					}
					return 0;
				})
				.filter(num => num > 0);
			
			if (memberNumbers.length > 0) {
				maxMemberNumber = Math.max(...memberNumbers);
			}
		}
		
		// Generate next MemberNo
		const nextMemberNumber = maxMemberNumber + 1;
		const memberNoSuffix = nextMemberNumber.toString().padStart(2, '0');
		const newMemberNo = `${formData.FormNumber}-${memberNoSuffix}`;
		
		console.log("Adding new family member:", {
			existingMembers: familyMembers.length,
			maxMemberNumber,
			nextMemberNumber,
			newMemberNo
		});
		
		const newMember: FamilyMemberData = {
			MemberNo: newMemberNo,
				FullName: "",
			RelationshipId: familyMembers.length === 0 ? "Self" : "", // First member must be "Self"
			GenderId: "",
			MaritalStatusId: "",
			DOBMonth: "",
			DOBYear: "",
			BFormOrCNIC: "",
			OccupationId: "",
			PrimaryLocation: "",
			IsPrimaryEarner: familyMembers.length === 0, // First member is primary earner
			education: {
				IsCurrentlyStudying: "",
				InstitutionType: "",
				CurrentClass: "",
				HighestQualification: "",
			},
			livelihood: {
				IsCurrentlyEarning: "",
				EarningSource: "",
				SalariedWorkSector: "",
				WorkField: "",
				MonthlyIncome: "",
				JoblessDuration: "",
				ReasonNotEarning: "",
			},
		};
		setFamilyMembers([...familyMembers, newMember]);
	};

	const removeFamilyMember = (index: number) => {
		const updated = familyMembers.filter((_, i) => i !== index);
		// If we removed the first member, ensure the new first member has "Self" as relationship
		if (index === 0 && updated.length > 0) {
			updated[0].RelationshipId = "Self";
		}
		setFamilyMembers(updated);
	};

	const updateFamilyMember = (index: number, field: keyof FamilyMemberData, value: any) => {
		const updated = [...familyMembers];
		if (field === 'education' || field === 'livelihood') {
			updated[index] = { ...updated[index], [field]: { ...updated[index][field], ...value } };
		} else {
			updated[index] = { ...updated[index], [field]: value };
			// Ensure first member always has "Self" as relationship
			if (index === 0 && field === 'RelationshipId' && value !== "Self") {
				updated[index].RelationshipId = "Self";
			}
		}
		setFamilyMembers(updated);
	};

	// Section-based save functions
	const saveBasicInfo = async () => {
		// In edit mode, form number should already exist
		if (!isEditMode && (!formData.FormNumber || formData.FormNumber === "PE-00001")) {
			setError("Please wait for Form Number to be generated");
			return;
		}
		
		// In edit mode, ensure form number exists
		if (isEditMode && !formData.FormNumber) {
			setError("Form Number is required");
			return;
		}

		// Validate Health Insurance Program (must be Yes or No)
		if (!formData.HealthInsuranceProgram || (formData.HealthInsuranceProgram !== "Yes" && formData.HealthInsuranceProgram !== "No")) {
			setError("Health Insurance Program: Please select Yes or No");
			return;
		}

		setSavingSection("basic");
		setError(null);

		try {
			const payload = {
				FormNumber: formData.FormNumber,
				ApplicationDate: formData.ApplicationDate,
				ReceivedByName: formData.ReceivedByName,
				ReceivedByDate: formData.ReceivedByDate,
				Full_Name: formData.Full_Name,
				DateOfBirth: formData.DateOfBirth,
				CNICNumber: formData.CNICNumber,
				MotherTongue: formData.MotherTongue,
				ResidentialAddress: formData.ResidentialAddress,
				PrimaryContactNumber: formData.PrimaryContactNumber,
				SecondaryContactNumber: formData.SecondaryContactNumber || null,
				RegionalCommunity: formData.RegionalCommunity,
				LocalCommunity: formData.LocalCommunity,
				CurrentCommunityCenter: formData.CurrentCommunityCenter,
				PrimaryLocationSettlement: formData.PrimaryLocationSettlement,
				AreaOfOrigin: formData.AreaOfOrigin,
				Area_Type: formData.Area_Type,
				Intake_family_Income: formData.Intake_family_Income ? parseFloat(formData.Intake_family_Income) : null,
				HouseOwnershipStatus: formData.HouseOwnershipStatus,
				HealthInsuranceProgram: formData.HealthInsuranceProgram || null,
				// Handle MonthlyIncome fields - preserve the actual value entered, default to "0" only if truly empty
				// Handle both string and number types (number inputs can return numbers)
				MonthlyIncome_Remittance: (formData.MonthlyIncome_Remittance !== null && formData.MonthlyIncome_Remittance !== undefined && formData.MonthlyIncome_Remittance !== "" && String(formData.MonthlyIncome_Remittance).trim() !== "") ? String(formData.MonthlyIncome_Remittance) : "0",
				MonthlyIncome_Rental: (formData.MonthlyIncome_Rental !== null && formData.MonthlyIncome_Rental !== undefined && formData.MonthlyIncome_Rental !== "" && String(formData.MonthlyIncome_Rental).trim() !== "") ? String(formData.MonthlyIncome_Rental) : "0",
				MonthlyIncome_OtherSources: (formData.MonthlyIncome_OtherSources !== null && formData.MonthlyIncome_OtherSources !== undefined && formData.MonthlyIncome_OtherSources !== "" && String(formData.MonthlyIncome_OtherSources).trim() !== "") ? String(formData.MonthlyIncome_OtherSources) : "0",
			};

			console.log("Saving MonthlyIncome fields:", {
				payload: {
					MonthlyIncome_Remittance: payload.MonthlyIncome_Remittance,
					MonthlyIncome_Rental: payload.MonthlyIncome_Rental,
					MonthlyIncome_OtherSources: payload.MonthlyIncome_OtherSources,
				},
				formData: {
					Remittance: formData.MonthlyIncome_Remittance,
					Rental: formData.MonthlyIncome_Rental,
					OtherSources: formData.MonthlyIncome_OtherSources,
				},
				types: {
					Remittance: typeof formData.MonthlyIncome_Remittance,
					Rental: typeof formData.MonthlyIncome_Rental,
					OtherSources: typeof formData.MonthlyIncome_OtherSources,
				}
			});

			console.log("Saving basic info - isEditMode:", isEditMode, "FormNumber:", formData.FormNumber, "Method:", isEditMode ? "PUT" : "POST");
			
			const response = await fetch("/api/baseline-applications/basic-info", {
				method: isEditMode ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await response.json();
			if (data.success) {
				setSectionSaved({ ...sectionSaved, basic: true });
				setSuccess(true);
				setTimeout(() => setSuccess(false), 2000);
				console.log("Successfully saved MonthlyIncome fields");
			} else {
				console.error("Failed to save:", data.message);
				setError(data.message || "Failed to save basic information");
			}
		} catch (err: any) {
			console.error("Error saving basic info:", err);
			setError(err.message || "Failed to save basic information");
		} finally {
			setSavingSection(null);
		}
	};

	const saveFinancialAssets = async () => {
		// Check if FormNumber exists and is valid
		if (!formData.FormNumber || formData.FormNumber.trim() === "") {
			setError("Please save Basic Information first to get a Form Number");
				return;
			}

		setSavingSection("assets");
		setError(null);

		// Financial assets are now part of basic info, so just call saveBasicInfo
		await saveBasicInfo();
	};

	const saveFamilyMembers = async () => {
		// Check if FormNumber exists and is valid
		if (!formData.FormNumber || formData.FormNumber.trim() === "") {
			setError("Please save Basic Information first to get a Form Number");
				return;
			}

		// Check if basic info has been saved (either sectionSaved.basic is true, or we're in edit mode)
		// In edit mode, formNoParam exists, so we can save family members
		if (!sectionSaved.basic && !formNoParam) {
			setError("Please save Basic Information first");
			return;
		}

		setSavingSection("members");
		setError(null);

		try {
			// Validate that we have at least one member
			if (!familyMembers || familyMembers.length === 0) {
				setError("Please add at least one family member before saving");
				setSavingSection(null);
					return;
				}

			// Validate that all members have required fields
			for (let i = 0; i < familyMembers.length; i++) {
				const member = familyMembers[i];
				if (!member.MemberNo || !member.FullName) {
					setError(`Member ${i + 1} is missing required fields (MemberNo or FullName)`);
					setSavingSection(null);
					return;
				}
				
				// Validate CNIC required for age 18+
				const age = calculateAge(member.DOBMonth, member.DOBYear);
				if (age !== null && age >= 18) {
					if (!member.BFormOrCNIC || member.BFormOrCNIC.trim() === "") {
						setError(`Member ${i + 1} (${member.FullName || 'Unnamed'}): CNIC/B-form Number is required for persons 18 years or older`);
						setSavingSection(null);
						return;
					}
					
					// Validate CNIC format if provided
					const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
					if (!cnicPattern.test(member.BFormOrCNIC)) {
						setError(`Member ${i + 1} (${member.FullName || 'Unnamed'}): CNIC/B-form Number must be in format: 42101-4466917-3 (5 digits - 7 digits - 1 digit)`);
						setSavingSection(null);
						return;
					}
				}
			}

			const familyMembersPayload = {
				formNumber: formData.FormNumber,
				familyMembers: familyMembers,
			};

			console.log("Saving family members:", {
				formNumber: formData.FormNumber,
				memberCount: familyMembers.length,
				firstMember: familyMembers[0] ? {
					MemberNo: familyMembers[0].MemberNo,
					FullName: familyMembers[0].FullName,
					RelationshipId: familyMembers[0].RelationshipId,
					GenderId: familyMembers[0].GenderId,
					MaritalStatusId: familyMembers[0].MaritalStatusId,
					OccupationId: familyMembers[0].OccupationId,
					IsPrimaryEarner: familyMembers[0].IsPrimaryEarner,
					education: familyMembers[0].education,
					livelihood: familyMembers[0].livelihood,
				} : null
			});
			
			// Log full payload for debugging
			console.log("Full payload being sent:", JSON.stringify(familyMembersPayload, null, 2));

			const response = await fetch("/api/baseline-applications/family-members-data", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(familyMembersPayload),
			});

			let data;
			try {
				data = await response.json();
			} catch (parseError) {
				console.error("Failed to parse response:", parseError);
				const text = await response.text();
				console.error("Response text:", text);
				setError("Failed to save family members: Invalid response from server");
					return;
				}

			if (!response.ok) {
				console.error("Response not OK:", response.status, response.statusText);
				console.error("Error data:", data);
				
				// Build detailed error message
				let errorMsg = data?.message || `Server error: ${response.status} ${response.statusText}`;
				
				// Include details if available (in development mode)
				if (data?.details) {
					const details = data.details;
					if (details.errorNumber) {
						errorMsg += ` (SQL Error ${details.errorNumber})`;
					}
					if (details.lineNumber) {
						errorMsg += ` at line ${details.lineNumber}`;
					}
					console.error("Error details:", details);
				}
				
				setError(errorMsg);
					return;
				}

			if (data.success) {
				setSectionSaved({ ...sectionSaved, members: true });
				setSuccess(true);
				setTimeout(() => setSuccess(false), 2000);
			} else {
				console.error("Failed to save family members:", data);
				setError(data.message || "Failed to save family members");
			}
		} catch (err: any) {
			console.error("Error saving family members:", err);
			setError(err.message || "Failed to save family members");
		} finally {
			setSavingSection(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Prevent submission if FormNumber is still loading
		if (loadingFormNo) {
			setError("Please wait for Form Number to be generated");
					return;
				}

		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			// Validate FormNumber first (must be present and not empty)
			if (!formData.FormNumber || formData.FormNumber.trim() === "") {
				setError("Form Number is required. Please wait for it to be generated or refresh the page.");
					setSaving(false);
					return;
				}

			// Validate all other required fields
			const requiredFields: Array<{ field: keyof BasicInfoFormData; label: string }> = [
				{ field: "ApplicationDate", label: "Application Date" },
				{ field: "ReceivedByName", label: "Received By Name" },
				{ field: "ReceivedByDate", label: "Received By Date" },
				{ field: "Full_Name", label: "Full Name" },
				{ field: "DateOfBirth", label: "Date of Birth" },
				{ field: "CNICNumber", label: "CNIC Number" },
				{ field: "MotherTongue", label: "Mother Tongue" },
				{ field: "ResidentialAddress", label: "Residential Address" },
				{ field: "PrimaryContactNumber", label: "Primary Contact Number" },
				{ field: "RegionalCommunity", label: "Regional Community" },
				{ field: "LocalCommunity", label: "Local Community" },
				{ field: "CurrentCommunityCenter", label: "Current Community Center" },
				{ field: "PrimaryLocationSettlement", label: "Primary Location Settlement" },
				{ field: "AreaOfOrigin", label: "Area of Origin" },
				{ field: "HouseOwnershipStatus", label: "House Ownership Status" },
			];

			for (const { field, label } of requiredFields) {
				if (!formData[field] || formData[field].trim() === "") {
					setError(`${label} is required`);
					setSaving(false);
					return;
				}
			}

			// Validate Health Insurance Program (must be Yes or No)
			if (!formData.HealthInsuranceProgram || (formData.HealthInsuranceProgram !== "Yes" && formData.HealthInsuranceProgram !== "No")) {
				setError("Health Insurance Program: Please select Yes or No");
				setSaving(false);
				return;
			}

			// Validate CNIC format (42101-4466917-3)
			const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
			if (!cnicPattern.test(formData.CNICNumber)) {
				setError("CNIC Number must be in format: 42101-4466917-3 (5 digits - 7 digits - 1 digit)");
					setSaving(false);
					return;
				}

			// Validate Date of Birth (not more than 80 years old)
			if (formData.DateOfBirth) {
				const birthDate = new Date(formData.DateOfBirth);
				const today = new Date();
				const age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();
				const dayDiff = today.getDate() - birthDate.getDate();
				
				let actualAge = age;
				if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
					actualAge--;
				}

				if (actualAge > 80) {
					setError("Date of Birth: Person cannot be more than 80 years old");
					setSaving(false);
					return;
				}

				if (actualAge < 0) {
					setError("Date of Birth: Cannot be in the future");
					setSaving(false);
					return;
				}
			}

			// Validate Application Date (must be today or in the past, not in the future)
			if (formData.ApplicationDate) {
				const appDate = new Date(formData.ApplicationDate);
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				appDate.setHours(0, 0, 0, 0);
				
				if (appDate > today) {
					setError("Application Date: Cannot be in the future. Must be today or a past date.");
					setSaving(false);
					return;
				}
			}

			// Validate Received By Date (must be before Application Date)
			if (formData.ReceivedByDate && formData.ApplicationDate) {
				const receivedDate = new Date(formData.ReceivedByDate);
				const appDate = new Date(formData.ApplicationDate);
				receivedDate.setHours(0, 0, 0, 0);
				appDate.setHours(0, 0, 0, 0);
				
				if (receivedDate >= appDate) {
					setError("Received By Date: Must be before the Application Date");
					setSaving(false);
					return;
				}
			}

			// Use the same payload as saveBasicInfo - includes all fields including financial assets
			const payload = {
				FormNumber: formData.FormNumber,
				ApplicationDate: formData.ApplicationDate,
				ReceivedByName: formData.ReceivedByName,
				ReceivedByDate: formData.ReceivedByDate,
				Full_Name: formData.Full_Name,
				DateOfBirth: formData.DateOfBirth,
				CNICNumber: formData.CNICNumber,
				MotherTongue: formData.MotherTongue,
				ResidentialAddress: formData.ResidentialAddress,
				PrimaryContactNumber: formData.PrimaryContactNumber,
				SecondaryContactNumber: formData.SecondaryContactNumber || null,
				RegionalCommunity: formData.RegionalCommunity,
				LocalCommunity: formData.LocalCommunity,
				CurrentCommunityCenter: formData.CurrentCommunityCenter,
				PrimaryLocationSettlement: formData.PrimaryLocationSettlement,
				AreaOfOrigin: formData.AreaOfOrigin,
				Area_Type: formData.Area_Type,
				Intake_family_Income: formData.Intake_family_Income ? parseFloat(formData.Intake_family_Income) : null,
				HouseOwnershipStatus: formData.HouseOwnershipStatus,
				HealthInsuranceProgram: formData.HealthInsuranceProgram || null,
				MonthlyIncome_Remittance: (formData.MonthlyIncome_Remittance !== null && formData.MonthlyIncome_Remittance !== undefined && formData.MonthlyIncome_Remittance !== "" && String(formData.MonthlyIncome_Remittance).trim() !== "") ? String(formData.MonthlyIncome_Remittance) : "0",
				MonthlyIncome_Rental: (formData.MonthlyIncome_Rental !== null && formData.MonthlyIncome_Rental !== undefined && formData.MonthlyIncome_Rental !== "" && String(formData.MonthlyIncome_Rental).trim() !== "") ? String(formData.MonthlyIncome_Rental) : "0",
				MonthlyIncome_OtherSources: (formData.MonthlyIncome_OtherSources !== null && formData.MonthlyIncome_OtherSources !== undefined && formData.MonthlyIncome_OtherSources !== "" && String(formData.MonthlyIncome_OtherSources).trim() !== "") ? String(formData.MonthlyIncome_OtherSources) : "0",
				// Financial Assets fields
				Land_Barren_Kanal: formData.Land_Barren_Kanal || null,
				Land_Barren_Value_Rs: formData.Land_Barren_Value_Rs || null,
				Land_Agriculture_Kanal: formData.Land_Agriculture_Kanal || null,
				Land_Agriculture_Value_Rs: formData.Land_Agriculture_Value_Rs || null,
				Livestock_Number: formData.Livestock_Number || null,
				Livestock_Value_Rs: formData.Livestock_Value_Rs || null,
				Fruit_Trees_Number: formData.Fruit_Trees_Number || null,
				Fruit_Trees_Value_Rs: formData.Fruit_Trees_Value_Rs || null,
				Vehicles_4W_Number: formData.Vehicles_4W_Number || null,
				Vehicles_4W_Value_Rs: formData.Vehicles_4W_Value_Rs || null,
				Motorcycle_2W_Number: formData.Motorcycle_2W_Number || null,
				Motorcycle_2W_Value_Rs: formData.Motorcycle_2W_Value_Rs || null,
			};

			// Save basic info (includes financial assets now)
			const response = await fetch("/api/baseline-applications/basic-info", {
				method: isEditMode ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (data.success) {
				// Validate family members - CNIC required for age 18+
				for (let i = 0; i < familyMembers.length; i++) {
					const member = familyMembers[i];
					const age = calculateAge(member.DOBMonth, member.DOBYear);
					
					if (age !== null && age >= 18) {
						if (!member.BFormOrCNIC || member.BFormOrCNIC.trim() === "") {
							setError(`Member ${i + 1} (${member.FullName || 'Unnamed'}): CNIC/B-form Number is required for persons 18 years or older`);
							setSaving(false);
							return;
						}
						
						// Validate CNIC format if provided
						const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
						if (!cnicPattern.test(member.BFormOrCNIC)) {
							setError(`Member ${i + 1} (${member.FullName || 'Unnamed'}): CNIC/B-form Number must be in format: 42101-4466917-3 (5 digits - 7 digits - 1 digit)`);
							setSaving(false);
							return;
						}
					}
				}
				
				// Save family members data
				const familyMembersPayload = {
					formNumber: formData.FormNumber,
					familyMembers: familyMembers,
				};

				const familyMembersResponse = await fetch("/api/baseline-applications/family-members-data", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(familyMembersPayload),
				});

				const familyMembersData = await familyMembersResponse.json();

				if (familyMembersData.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/baseline-qol");
				}, 1500);
				} else {
					// Basic info saved but family members failed
					setSuccess(true);
					setError(familyMembersData.message || "Basic info saved but failed to save family members data");
					setTimeout(() => {
						router.push("/dashboard/baseline-qol");
					}, 2000);
				}
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
						{isEditMode ? "Edit Baseline Application" : "Add Baseline Application"}
					</h1>
					<p className="text-gray-600 mt-2">
						{isEditMode ? `Update PE Application - ${formData.FormNumber}` : "Create a new PE Application Basic Info"}
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
								Editing Mode: You are updating an existing application.
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
				{/* Application Basic Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<h2 className="text-xl font-bold text-gray-900">Application Basic Information</h2>
							{sectionSaved.basic && (
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									✓ Saved
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={saveBasicInfo}
							disabled={savingSection === "basic"}
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
						>
							<Save className="h-4 w-4" />
							{savingSection === "basic" ? "Saving..." : "Save Section"}
						</button>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Form Number <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.FormNumber}
								readOnly
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
								placeholder={loadingFormNo ? "Loading..." : "PE-00001"}
							/>
							{loadingFormNo && (
								<p className="mt-1 text-xs text-gray-500">Auto-generating Form Number...</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Application Date <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={formData.ApplicationDate}
								readOnly
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
							/>
							<p className="mt-1 text-xs text-gray-500">Auto-set to today's date (read-only)</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Received By Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.ReceivedByName}
								onChange={(e) => handleChange("ReceivedByName", e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter name of person who received"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Received By Date <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={formData.ReceivedByDate}
								onChange={(e) => handleChange("ReceivedByDate", e.target.value)}
								required
								max={formData.ApplicationDate || new Date().toISOString().split('T')[0]}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
							<p className="mt-1 text-xs text-gray-500">Must be before Application Date</p>
						</div>
					</div>
				</div>

				{/* Personal Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Full Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
								value={formData.Full_Name}
								onChange={(e) => handleChange("Full_Name", e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter full name"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Date of Birth <span className="text-red-500">*</span>
										</label>
										<input
								type="date"
								value={formData.DateOfBirth}
								onChange={(e) => handleChange("DateOfBirth", e.target.value)}
											required
								max={new Date().toISOString().split('T')[0]}
								min={(() => {
									const today = new Date();
									const minDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
									return minDate.toISOString().split('T')[0];
								})()}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
							<p className="mt-1 text-xs text-gray-500">Maximum age: 80 years (Date must be within the last 80 years)</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								CNIC Number <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
								value={formData.CNICNumber}
								onChange={(e) => handleChange("CNICNumber", e.target.value)}
											required
								maxLength={15}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="42101-4466917-3"
										/>
							<p className="mt-1 text-xs text-gray-500">Format: 42101-4466917-3</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Mother Tongue <span className="text-red-500">*</span>
										</label>
							<select
								value={formData.MotherTongue}
								onChange={(e) => handleChange("MotherTongue", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Mother Tongue</option>
								<option value="01 - Urdu">01 - Urdu</option>
								<option value="02 - Gujarati">02 - Gujarati</option>
								<option value="03 - Sindhi">03 - Sindhi</option>
								<option value="04 - Punjabi">04 - Punjabi</option>
								<option value="05 - Khowar">05 - Khowar</option>
								<option value="06 - Kirghiz">06 - Kirghiz</option>
								<option value="07 - Dari">07 - Dari</option>
								<option value="08 - Wakhi">08 - Wakhi</option>
								<option value="10 - Pashto">10 - Pashto</option>
								<option value="11 - Shina">11 - Shina</option>
								<option value="12 - Burushaski">12 - Burushaski</option>
								<option value="13 - Khojki">13 - Khojki</option>
								<option value="14 - Balti">14 - Balti</option>
								<option value="15 - English">15 - English</option>
							</select>
									</div>

									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Residential Address <span className="text-red-500">*</span>
										</label>
										<textarea
								value={formData.ResidentialAddress}
								onChange={(e) => handleChange("ResidentialAddress", e.target.value)}
											required
								rows={3}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter residential address"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Primary Contact Number <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
								value={formData.PrimaryContactNumber}
								onChange={(e) => handleChange("PrimaryContactNumber", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter primary contact number"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Secondary Contact Number
							</label>
							<input
								type="text"
								value={formData.SecondaryContactNumber}
								onChange={(e) => handleChange("SecondaryContactNumber", e.target.value)}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter secondary contact number (optional)"
							/>
						</div>
					</div>
				</div>

				{/* Location Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Location Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Regional Community <span className="text-red-500">*</span>
										</label>
										<select
								value={formData.RegionalCommunity}
								onChange={(e) => handleChange("RegionalCommunity", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
								<option value="">Select Regional Community</option>
											{regionalCommunities.map((rc) => (
												<option key={rc} value={rc}>
													{rc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Local Community <span className="text-red-500">*</span>
										</label>
										<select
								value={formData.LocalCommunity}
								onChange={(e) => handleChange("LocalCommunity", e.target.value)}
											required
								disabled={!formData.RegionalCommunity || loadingLocalCommunities}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										>
								<option value="">
									{loadingLocalCommunities 
										? "Loading..." 
										: formData.RegionalCommunity 
											? "Select Local Community" 
											: "Select Regional Community first"}
								</option>
								{localCommunities.map((lc) => (
												<option key={lc} value={lc}>
													{lc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
								Current Community Center <span className="text-red-500">*</span>
										</label>
										<select
								value={formData.CurrentCommunityCenter}
								onChange={(e) => handleChange("CurrentCommunityCenter", e.target.value)}
											required
								disabled={!formData.RegionalCommunity || !formData.LocalCommunity || loadingCommunityCenters}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										>
								<option value="">
									{loadingCommunityCenters 
										? "Loading..." 
										: formData.RegionalCommunity && formData.LocalCommunity 
											? "Select Current Community Center" 
											: "Select Regional and Local Community first"}
								</option>
								{communityCenters.map((jk) => (
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
								value={formData.PrimaryLocationSettlement}
								onChange={(e) => handleChange("PrimaryLocationSettlement", e.target.value)}
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
											value={formData.AreaOfOrigin}
											onChange={(e) => handleChange("AreaOfOrigin", e.target.value)}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter area of origin"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Area Type <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											value={formData.Area_Type}
											readOnly
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
											placeholder="Auto-populated based on Regional & Local Community"
										/>
										<p className="mt-1 text-xs text-gray-500">Automatically set based on Regional Community and Local Community selection</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Intake Family Income
										</label>
										<input
											type="text"
											value={formData.Intake_family_Income}
											readOnly
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
											placeholder="Auto-populated based on Regional & Local Community"
										/>
										<p className="mt-1 text-xs text-gray-500">Automatically set based on Regional Community and Local Community selection</p>
								</div>
							</div>
					</div>

				{/* Financial Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Financial Information</h2>
					<div className="space-y-6">
						{/* ASSETS Section */}
									<div>
							<h3 className="text-lg font-semibold text-gray-800 mb-4">ASSETS</h3>
							<div className="mb-6">
										<label className="block text-sm font-medium text-gray-700 mb-2">
									[Q.1] The house that you live in is: <span className="text-red-500">*</span>
								</label>
								<div className="mt-2 space-y-2">
									<div className="flex items-center">
										<input
											id="owned"
											name="houseOwnership"
											type="radio"
											value="Owned"
											checked={formData.HouseOwnershipStatus === "Owned"}
											onChange={(e) => handleChange("HouseOwnershipStatus", e.target.value)}
											required
											className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
										/>
										<label htmlFor="owned" className="ml-3 block text-sm text-gray-700">
											1) Owned
										</label>
									</div>
									<div className="flex items-center">
										<input
											id="rented"
											name="houseOwnership"
											type="radio"
											value="Rented"
											checked={formData.HouseOwnershipStatus === "Rented"}
											onChange={(e) => handleChange("HouseOwnershipStatus", e.target.value)}
											required
											className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
										/>
										<label htmlFor="rented" className="ml-3 block text-sm text-gray-700">
											2) Rented
										</label>
									</div>
									<div className="flex items-center">
										<input
											id="rent-free"
											name="houseOwnership"
											type="radio"
											value="Rent Free"
											checked={formData.HouseOwnershipStatus === "Rent Free"}
											onChange={(e) => handleChange("HouseOwnershipStatus", e.target.value)}
											required
											className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
										/>
										<label htmlFor="rent-free" className="ml-3 block text-sm text-gray-700">
											3) Rent Free
										</label>
									</div>
									<div className="flex items-center">
										<input
											id="humanitarian-shelter"
											name="houseOwnership"
											type="radio"
											value="Humanitarian Shelter"
											checked={formData.HouseOwnershipStatus === "Humanitarian Shelter"}
											onChange={(e) => handleChange("HouseOwnershipStatus", e.target.value)}
											required
											className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
										/>
										<label htmlFor="humanitarian-shelter" className="ml-3 block text-sm text-gray-700">
											4) Humanitarian Shelter
										</label>
									</div>
								</div>
							</div>

							<div className="mt-6">
								<label className="block text-sm font-medium text-gray-700 mb-4">
									[Q.2] What are the assets owned by the family:
								</label>
								<div className="overflow-x-auto">
									<table className="min-w-full border border-gray-300">
										<thead className="bg-gray-50">
											<tr>
												<th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Particulars</th>
												<th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Number</th>
												<th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Approx. Value (Rs.)</th>
											</tr>
										</thead>
										<tbody className="bg-white">
											{/* Land-Barren */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Barren (specify in Kanal)</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Land_Barren_Kanal}
														onChange={(e) => handleAssetsChange("Land_Barren_Kanal", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter Kanal"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Land_Barren_Value_Rs}
														onChange={(e) => handleAssetsChange("Land_Barren_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
											{/* Land-Agriculture */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Agriculture (specify in Kanal)</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Land_Agriculture_Kanal}
														onChange={(e) => handleAssetsChange("Land_Agriculture_Kanal", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter Kanal"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Land_Agriculture_Value_Rs}
														onChange={(e) => handleAssetsChange("Land_Agriculture_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
											{/* Livestock */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Livestock</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Livestock_Number}
														onChange={(e) => handleAssetsChange("Livestock_Number", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter number"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Livestock_Value_Rs}
														onChange={(e) => handleAssetsChange("Livestock_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
											{/* Fruit trees */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Fruit trees</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Fruit_Trees_Number}
														onChange={(e) => handleAssetsChange("Fruit_Trees_Number", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter number"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Fruit_Trees_Value_Rs}
														onChange={(e) => handleAssetsChange("Fruit_Trees_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
											{/* Vehicles (4-wheeler) */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Vehicles (4-wheeler)</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Vehicles_4W_Number}
														onChange={(e) => handleAssetsChange("Vehicles_4W_Number", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter number"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Vehicles_4W_Value_Rs}
														onChange={(e) => handleAssetsChange("Vehicles_4W_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
											{/* Motorcycle (2-wheeler) */}
											<tr>
												<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Motorcycle (2-wheeler)</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Motorcycle_2W_Number}
														onChange={(e) => handleAssetsChange("Motorcycle_2W_Number", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter number"
													/>
												</td>
												<td className="border border-gray-300 px-4 py-2">
													<input
														type="text"
														value={formData.Motorcycle_2W_Value_Rs}
														onChange={(e) => handleAssetsChange("Motorcycle_2W_Value_Rs", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
														placeholder="Enter value in Rs."
													/>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Health Insurance Program */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<label className="block text-sm font-medium text-gray-700 mb-4">
						[Q.3] The family health insurance:
					</label>
					<div className="mb-4">
						<label className="block text-sm text-gray-700 mb-3">
							Are any household members currently covered by any health insurance program, including Micro-Health-Insurance-Program (MHIP)? <span className="text-red-500">*</span>
						</label>
						<div className="flex items-center gap-6">
							<div className="flex items-center">
								<input
									id="health-insurance-yes"
									name="healthInsurance"
									type="radio"
									value="Yes"
									checked={formData.HealthInsuranceProgram === "Yes"}
									onChange={(e) => handleChange("HealthInsuranceProgram", e.target.value)}
									required
									className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
								/>
								<label htmlFor="health-insurance-yes" className="ml-2 block text-sm text-gray-700">
									Yes
								</label>
							</div>
							<div className="flex items-center">
								<input
									id="health-insurance-no"
									name="healthInsurance"
									type="radio"
									value="No"
									checked={formData.HealthInsuranceProgram === "No"}
									onChange={(e) => handleChange("HealthInsuranceProgram", e.target.value)}
									required
									className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
								/>
								<label htmlFor="health-insurance-no" className="ml-2 block text-sm text-gray-700">
									No
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* Family Income Section */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="mb-6">
						<div className="flex items-center gap-3">
							<h3 className="text-lg font-semibold text-gray-800">[Q.6] Family Income</h3>
							{sectionSaved.basic && (
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									✓ Saved
								</span>
							)}
						</div>
					</div>
					<p className="text-sm text-gray-600 mb-2">Please specify the Monthly Income from:</p>
					<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<p className="text-xs text-blue-800">
							<strong>Note:</strong> These fields are required. If no value is entered, it will automatically be set to <strong>0</strong>.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Remittance (Rs. average per month) <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								required
								value={formData.MonthlyIncome_Remittance}
								onChange={(e) => handleChange("MonthlyIncome_Remittance", e.target.value)}
								onBlur={(e) => {
									if (!e.target.value || e.target.value.trim() === "") {
										handleChange("MonthlyIncome_Remittance", "0");
									}
								}}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter amount (0 if none)"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Rental (Rs. average per month) <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								required
								value={formData.MonthlyIncome_Rental}
								onChange={(e) => handleChange("MonthlyIncome_Rental", e.target.value)}
								onBlur={(e) => {
									if (!e.target.value || e.target.value.trim() === "") {
										handleChange("MonthlyIncome_Rental", "0");
									}
								}}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter amount (0 if none)"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								From Other Sources (Rs. average per month) <span className="text-red-500">*</span>
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								required
								value={formData.MonthlyIncome_OtherSources}
								onChange={(e) => handleChange("MonthlyIncome_OtherSources", e.target.value)}
								onBlur={(e) => {
									if (!e.target.value || e.target.value.trim() === "") {
										handleChange("MonthlyIncome_OtherSources", "0");
									}
								}}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter amount (0 if none)"
							/>
						</div>
					</div>
				</div>

				{/* Family Members Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<h2 className="text-xl font-bold text-gray-900">Family Members Information</h2>
							{sectionSaved.members && (
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									✓ Saved
								</span>
							)}
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={addFamilyMember}
								className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
							>
								<Plus className="h-4 w-4" />
								Add Member
							</button>
							<button
								type="button"
								onClick={saveFamilyMembers}
								disabled={savingSection === "members"}
								className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								<Save className="h-4 w-4" />
								{savingSection === "members" ? "Saving..." : "Save Section"}
							</button>
						</div>
					</div>

					{familyMembers.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<p>No family members added yet. Click "Add Family Member" to start.</p>
						</div>
					) : (
						<div className="space-y-6">
							{familyMembers.map((member, index) => {
								const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii'];
								return (
									<div key={index} className="border border-gray-300 rounded-lg p-4">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-lg font-semibold text-gray-800">
												{romanNumerals[index]}) {member.FullName || `Family Member ${index + 1}`}
											</h3>
											<button
												type="button"
												onClick={() => removeFamilyMember(index)}
												className="text-red-600 hover:text-red-800"
											>
												<Trash2 className="h-5 w-5" />
											</button>
										</div>

										{/* Q.4 Family Member Basic Info */}
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.1] Family Member Full Name <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													value={member.FullName}
													onChange={(e) => updateFamilyMember(index, 'FullName', e.target.value)}
													required
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													placeholder="Enter full name"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.2] Relationship with Primary Earner <span className="text-red-500">*</span>
										</label>
										<select
													value={member.RelationshipId}
													onChange={(e) => updateFamilyMember(index, 'RelationshipId', e.target.value)}
													required
													disabled={index === 0} // Disable for first member (must be Self)
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										>
													{index === 0 ? (
														// First member: Only show "Self"
														<>
															<option value="">Select relationship</option>
															<option value="Self">Self</option>
														</>
													) : (
														// Subsequent members: Show all except "Self"
														<>
															<option value="">Select relationship</option>
															<option value="Spouse (husband / wife)">Spouse (husband / wife)</option>
															<option value="Child">Child</option>
															<option value="Parent">Parent</option>
															<option value="Sibling (sister / brother)">Sibling (sister / brother)</option>
															<option value="Stepchild (son / daughter)">Stepchild (son / daughter)</option>
															<option value="Grandparent">Grandparent</option>
															<option value="Niece / nephew">Niece / nephew</option>
															<option value="Grandchild">Grandchild</option>
															<option value="Brother-in-law / sister-in-law">Brother-in-law / sister-in-law</option>
															<option value="Daughter-in-law / son-in-law">Daughter-in-law / son-in-law</option>
															<option value="Stepmother / father">Stepmother / father</option>
															<option value="Uncle / Aunt">Uncle / Aunt</option>
															<option value="Others">Others</option>
														</>
													)}
										</select>
									</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.3] Gender <span className="text-red-500">*</span>
												</label>
												<select
													value={member.GenderId}
													onChange={(e) => updateFamilyMember(index, 'GenderId', e.target.value)}
													required
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select gender</option>
													<option value="Male">Male</option>
													<option value="Female">Female</option>
												</select>
								</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.4] Marital Status <span className="text-red-500">*</span>
												</label>
												<select
													value={member.MaritalStatusId}
													onChange={(e) => updateFamilyMember(index, 'MaritalStatusId', e.target.value)}
													required
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select marital status</option>
													<option value="Single (never married)">Single (never married)</option>
													<option value="Married">Married</option>
													<option value="Separated (not divorced)">Separated (not divorced)</option>
													<option value="Divorced">Divorced</option>
													<option value="Widow">Widow</option>
													<option value="Widower">Widower</option>
												</select>
							</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.5] Date of Birth (mm/yyyy) <span className="text-red-500">*</span>
												</label>
												<div className="grid grid-cols-2 gap-2">
													<select
														value={member.DOBMonth}
														onChange={(e) => updateFamilyMember(index, 'DOBMonth', e.target.value)}
														required
														className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													>
														<option value="">Select month</option>
														<option value="Jan">Jan</option>
														<option value="Feb">Feb</option>
														<option value="Mar">Mar</option>
														<option value="Apr">Apr</option>
														<option value="May">May</option>
														<option value="Jun">Jun</option>
														<option value="Jul">Jul</option>
														<option value="Aug">Aug</option>
														<option value="Sep">Sep</option>
														<option value="Oct">Oct</option>
														<option value="Nov">Nov</option>
														<option value="Dec">Dec</option>
													</select>
													<select
														value={member.DOBYear}
														onChange={(e) => updateFamilyMember(index, 'DOBYear', e.target.value)}
														required
														className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													>
														<option value="">Select year</option>
														{(() => {
															const currentYear = new Date().getFullYear();
															const minYear = 1950;
															const years = [];
															for (let year = currentYear; year >= minYear; year--) {
																years.push(
																	<option key={year} value={year.toString()}>
																		{year}
																	</option>
																);
															}
															return years;
														})()}
													</select>
												</div>
												{member.DOBYear && (parseInt(member.DOBYear) < 1950 || parseInt(member.DOBYear) > new Date().getFullYear()) && (
													<p className="text-xs text-red-500 col-span-2 mt-1">Year must be between 1950 and {new Date().getFullYear()}</p>
												)}
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.6] CNIC/B-form Number
													{(() => {
														const age = calculateAge(member.DOBMonth, member.DOBYear);
														if (age !== null && age >= 18) {
															return <span className="text-red-500"> *</span>;
														}
														return null;
													})()}
												</label>
												<input
													type="text"
													value={member.BFormOrCNIC}
													onChange={(e) => {
														const formatted = formatCNIC(e.target.value);
														updateFamilyMember(index, 'BFormOrCNIC', formatted);
													}}
													maxLength={15}
													required={(() => {
														const age = calculateAge(member.DOBMonth, member.DOBYear);
														return age !== null && age >= 18;
													})()}
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													placeholder="42101-4466917-3"
												/>
												<p className="mt-1 text-xs text-gray-500">
													Format: 42101-4466917-3
													{(() => {
														const age = calculateAge(member.DOBMonth, member.DOBYear);
														if (age !== null && age >= 18) {
															return <span className="text-red-500"> (Required for age 18+)</span>;
														} else if (age !== null && age < 18) {
															return <span className="text-gray-500"> (Optional for age under 18)</span>;
														}
														return null;
													})()}
												</p>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.7] Primary Occupation <span className="text-red-500">*</span>
												</label>
												<select
													value={member.OccupationId}
													onChange={(e) => updateFamilyMember(index, 'OccupationId', e.target.value)}
													required
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												>
													<option value="">Select occupation</option>
													<option value="Salaried (employment)">Salaried (employment)</option>
													<option value="Business">Business</option>
													<option value="Self-employed">Self-employed</option>
													<option value="Agriculture-Live Stock">Agriculture-Live Stock</option>
													<option value="Student">Student</option>
													<option value="Unemployed">Unemployed</option>
													<option value="Home maker">Home maker</option>
													<option value="Retired">Retired</option>
													<option value="Others">Others</option>
												</select>
											</div>

											<div className="md:col-span-2 lg:col-span-3">
												<label className="block text-sm font-medium text-gray-700 mb-2">
													[Q.4.8] Primary Location (Specify) <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													value={member.PrimaryLocation}
													onChange={(e) => updateFamilyMember(index, 'PrimaryLocation', e.target.value)}
													required
													className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													placeholder="Enter primary location"
												/>
												<p className="text-xs text-gray-500 mt-1">Note: Primary location is the place where an individual lives for at least 6 months or longer during the year.</p>
											</div>
										</div>

										{/* Q.5 Education Section */}
										<div className="border-t border-gray-200 pt-4 mt-4">
											<h4 className="text-md font-semibold text-gray-800 mb-4">[Q.5] Education</h4>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														Are you currently studying? <span className="text-red-500">*</span>
													</label>
													<div className="flex items-center gap-6">
														<div className="flex items-center">
															<input
																type="radio"
																name={`studying-${index}`}
																value="Yes"
																checked={member.education.IsCurrentlyStudying === "Yes"}
																onChange={(e) => {
																	// When "Yes" is selected, update both education and livelihood in a single state update
																	const updated = [...familyMembers];
																	updated[index] = {
																		...updated[index],
																		education: {
																			...updated[index].education,
																			IsCurrentlyStudying: e.target.value
																		},
																		livelihood: {
																			...updated[index].livelihood,
																			IsCurrentlyEarning: "",
																			EarningSource: "N/A",
																			JoblessDuration: "N/A",
																			ReasonNotEarning: "N/A"
																		}
																	};
																	setFamilyMembers(updated);
																}}
																className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
															/>
															<label className="ml-2 block text-sm text-gray-700">Yes</label>
														</div>
														<div className="flex items-center">
															<input
																type="radio"
																name={`studying-${index}`}
																value="No"
																checked={member.education.IsCurrentlyStudying === "No"}
																onChange={(e) => {
																	// When "No" is selected, update education and clear N/A from livelihood if needed
																	const updated = [...familyMembers];
																	const currentLivelihood = updated[index].livelihood;
																	updated[index] = {
																		...updated[index],
																		education: {
																			...updated[index].education,
																			IsCurrentlyStudying: e.target.value
																		},
																		livelihood: {
																			...currentLivelihood,
																			IsCurrentlyEarning: currentLivelihood.IsCurrentlyEarning === "N/A" ? "" : currentLivelihood.IsCurrentlyEarning
																		}
																	};
																	setFamilyMembers(updated);
																}}
																className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300"
															/>
															<label className="ml-2 block text-sm text-gray-700">No</label>
														</div>
													</div>
												</div>

												{member.education.IsCurrentlyStudying === "Yes" && (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.5.1] Type of Institution
															</label>
															<select
																value={member.education.InstitutionType}
																onChange={(e) => updateFamilyMember(index, 'education', { InstitutionType: e.target.value })}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select institution type</option>
																<option value="AKES, P">AKES, P</option>
																<option value="AK Community-based school">AK Community-based school</option>
																<option value="Private">Private</option>
																<option value="Government">Government</option>
																<option value="NGO">NGO</option>
																<option value="Others">Others</option>
															</select>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.5.2] Current class
															</label>
															<select
																value={member.education.CurrentClass}
																onChange={(e) => updateFamilyMember(index, 'education', { CurrentClass: e.target.value })}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select current class</option>
																<option value="ECD/pre-primary">ECD/pre-primary</option>
																<option value="Primary">Primary</option>
																<option value="Secondary (Matric / O-Levels)">Secondary (Matric / O-Levels)</option>
																<option value="Higher secondary (Inter / A-Levels)">Higher secondary (Inter / A-Levels)</option>
																<option value="Bachelor's (Graduate)">Bachelor's (Graduate)</option>
																<option value="Master's (Postgraduate)">Master's (Postgraduate)</option>
																<option value="M. Phil / PhD">M. Phil / PhD</option>
																<option value="Diploma">Diploma</option>
																<option value="Professional certification">Professional certification</option>
																<option value="Others">Others</option>
															</select>
														</div>
													</div>
												)}

												{member.education.IsCurrentlyStudying === "No" && (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.5.4] What is your highest qualification?
															</label>
															<select
																value={member.education.HighestQualification}
																onChange={(e) => updateFamilyMember(index, 'education', { HighestQualification: e.target.value })}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select qualification</option>
																<option value="None">None</option>
																<option value="Primary">Primary</option>
																<option value="Secondary (Matric / O-Levels)">Secondary (Matric / O-Levels)</option>
																<option value="Higher secondary (Inter / A-Levels)">Higher secondary (Inter / A-Levels)</option>
																<option value="Bachelor's (Graduate)">Bachelor's (Graduate)</option>
																<option value="Master's (Postgraduate)">Master's (Postgraduate)</option>
																<option value="M. Phil / PhD">M. Phil / PhD</option>
																<option value="Diploma">Diploma</option>
																<option value="Professional certification">Professional certification</option>
																<option value="Others">Others</option>
															</select>
														</div>
													</div>
												)}
											</div>
										</div>

										{/* Q.7 Livelihood Section */}
										<div className="border-t border-gray-200 pt-4 mt-4">
											<h4 className="text-md font-semibold text-gray-800 mb-4">[Q.7] Livelihood</h4>
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-2">
														Are you currently earning? <span className="text-red-500">*</span>
													</label>
													<div className="flex items-center gap-6">
														<div className="flex items-center">
															<input
																type="radio"
																name={`earning-${index}`}
																value="Yes"
																checked={member.livelihood.IsCurrentlyEarning === "Yes"}
																onChange={(e) => updateFamilyMember(index, 'livelihood', { IsCurrentlyEarning: e.target.value })}
																disabled={member.education.IsCurrentlyStudying === "Yes"}
																className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
															/>
															<label className="ml-2 block text-sm text-gray-700">Yes</label>
														</div>
														<div className="flex items-center">
															<input
																type="radio"
																name={`earning-${index}`}
																value="No"
																checked={member.livelihood.IsCurrentlyEarning === "No"}
																onChange={(e) => updateFamilyMember(index, 'livelihood', { IsCurrentlyEarning: e.target.value })}
																disabled={member.education.IsCurrentlyStudying === "Yes"}
																className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
															/>
															<label className="ml-2 block text-sm text-gray-700">No</label>
														</div>
													</div>
													{member.education.IsCurrentlyStudying === "Yes" && (
														<p className="mt-1 text-xs text-gray-500">
															This field is disabled when "Are you currently studying?" is "Yes"
														</p>
													)}
												</div>

												{member.livelihood.IsCurrentlyEarning === "Yes" && member.education.IsCurrentlyStudying !== "Yes" && (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.1] What is the source of your earnings?
															</label>
															<select
																value={member.livelihood.EarningSource}
																onChange={(e) => updateFamilyMember(index, 'livelihood', { EarningSource: e.target.value })}
																disabled={member.education.IsCurrentlyStudying === "Yes"}
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
															>
																<option value="">Select source</option>
																<option value="Salaried">Salaried</option>
																<option value="Business">Business</option>
																<option value="Self-employed">Self-employed</option>
																<option value="Agriculture">Agriculture</option>
																<option value="Livestock">Livestock</option>
																<option value="Wage earner">Wage earner</option>
																<option value="Others">Others</option>
															</select>
														</div>
														{member.livelihood.EarningSource === "Salaried" && (
															<div>
																<label className="block text-sm font-medium text-gray-700 mb-2">
																	[Q.7.2] If Salaried: Where do you currently work?
																</label>
																<select
																	value={member.livelihood.SalariedWorkSector}
																	onChange={(e) => updateFamilyMember(index, 'livelihood', { SalariedWorkSector: e.target.value })}
																	className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
																>
																	<option value="">Select work sector</option>
																	<option value="AKDN">AKDN</option>
																	<option value="Community Institution">Community Institution</option>
																	<option value="Government">Government</option>
																	<option value="Private">Private</option>
																	<option value="NGO">NGO</option>
																	<option value="Others">Others</option>
																</select>
															</div>
														)}
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.3] Provide the Average Income per month
															</label>
															<input
																type="text"
																value={member.livelihood.MonthlyIncome}
																onChange={(e) => updateFamilyMember(index, 'livelihood', { MonthlyIncome: e.target.value })}
																placeholder="Enter amount in Rs."
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															/>
														</div>
													</div>
												)}

												{member.livelihood.IsCurrentlyEarning === "No" && member.education.IsCurrentlyStudying === "No" && (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.4] How long have you been jobless/out of business?*
															</label>
															<select
																value={member.livelihood.JoblessDuration}
																onChange={(e) => {
																	// Clear ReasonNotEarning when JoblessDuration changes
																	updateFamilyMember(index, 'livelihood', { 
																		JoblessDuration: e.target.value,
																		ReasonNotEarning: ""
																	});
																}}
																required
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select duration</option>
																<option value="N/A">N/A</option>
																<option value="Less than 6 months">Less than 6 months</option>
																<option value="6 - 12 months">6 - 12 months</option>
																<option value="12 months to 24 months">12 months to 24 months</option>
																<option value="More than 24 months">More than 24 months</option>
															</select>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.5] Reason for not currently earning?*
															</label>
															<select
																value={member.livelihood.ReasonNotEarning}
																onChange={(e) => updateFamilyMember(index, 'livelihood', { ReasonNotEarning: e.target.value })}
																required
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
															>
																<option value="">Select reason</option>
																{member.livelihood.JoblessDuration === "N/A" ? (
																	<>
																		<option value="Housewife">Housewife</option>
																		<option value="Old age">Old age</option>
																		<option value="Disabled person">Disabled person</option>
																		<option value="Student">Student</option>
																		<option value="Other">Other</option>
																	</>
																) : (
																	<>
																		<option value="Cannot get a job">Cannot get a job</option>
																		<option value="Non-availability of a desirable job">Non-availability of a desirable job</option>
																		<option value="Family does not allow">Family does not allow</option>
																		<option value="Job offers have lower-than-desirable salaries">Job offers have lower-than-desirable salaries</option>
																		<option value="Others">Others</option>
																	</>
																)}
															</select>
														</div>
													</div>
												)}

												{member.education.IsCurrentlyStudying === "Yes" && (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.1] What is the source of your earnings?
															</label>
															<select
																value={member.livelihood.EarningSource}
																disabled
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
															>
																<option value="N/A">N/A</option>
															</select>
															<p className="mt-1 text-xs text-gray-500">Automatically set to N/A when currently studying</p>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.4] How long have you been jobless/out of business?
															</label>
															<select
																value={member.livelihood.JoblessDuration}
																disabled
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
															>
																<option value="N/A">N/A</option>
															</select>
															<p className="mt-1 text-xs text-gray-500">Automatically set to N/A</p>
														</div>
														<div>
															<label className="block text-sm font-medium text-gray-700 mb-2">
																[Q.7.5] Reason for not currently earning?
															</label>
															<select
																value={member.livelihood.ReasonNotEarning}
																disabled
																className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-100 cursor-not-allowed"
															>
																<option value="N/A">N/A</option>
															</select>
															<p className="mt-1 text-xs text-gray-500">Automatically set to N/A</p>
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
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
						disabled={saving || loadingFormNo}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save className="h-4 w-4" />
						{loadingFormNo ? "Loading Form Number..." : saving ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update Application" : "Save Application")}
					</button>
				</div>
			</form>
		</div>
	);
}
