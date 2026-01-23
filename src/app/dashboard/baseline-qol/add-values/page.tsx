"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, FileText, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type BasicInfo = {
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
	HouseOwnershipStatus: string;
	HealthInsuranceProgram: string;
	MonthlyIncome_Remittance: number | null;
	MonthlyIncome_Rental: number | null;
	MonthlyIncome_OtherSources: number | null;
	// Financial Assets fields (now in same table)
	Land_Barren_Kanal: number | string | null;
	Land_Barren_Value_Rs: number | null;
	Land_Agriculture_Kanal: number | string | null;
	Land_Agriculture_Value_Rs: number | null;
	Livestock_Number: number | string | null;
	Livestock_Value_Rs: number | null;
	Fruit_Trees_Number: number | string | null;
	Fruit_Trees_Value_Rs: number | null;
	Vehicles_4W_Number: number | string | null;
	Vehicles_4W_Value_Rs: number | null;
	Motorcycle_2W_Number: number | string | null;
	Motorcycle_2W_Value_Rs: number | null;
	Status: string | null;
	CurrentLevel: string | null;
	SubmittedAt: string | null;
	SubmittedBy: string | null;
	Locked: boolean | null;
	CreatedAt: string;
	UpdatedAt: string;
};

type FinancialAssets = {
	Family_ID: string;
	Land_Barren_Kanal: number | null;
	Land_Barren_Value_Rs: number | null;
	Land_Agriculture_Kanal: number | null;
	Land_Agriculture_Value_Rs: number | null;
	Livestock_Number: number | null;
	Livestock_Value_Rs: number | null;
	Fruit_Trees_Number: number | null;
	Fruit_Trees_Value_Rs: number | null;
	Vehicles_4W_Number: number | null;
	Vehicles_4W_Value_Rs: number | null;
	Motorcycle_2W_Number: number | null;
	Motorcycle_2W_Value_Rs: number | null;
	Entry_Date: string;
	Updated_Date: string;
};

type FamilyMember = {
	FormNo: string;
	BeneficiaryID: string;
	FullName: string;
	BFormOrCNIC: string;
	RelationshipId: number;
	RelationshipOther: string | null;
	GenderId: number;
	MaritalStatusId: number;
	DOBMonth: string;
	DOBYear: string;
	OccupationId: number | null;
	OccupationOther: string | null;
	PrimaryLocation: string;
	IsPrimaryEarner: boolean | null;
};

function AddValuesPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userProfile } = useAuth();
	const [formNumber, setFormNumber] = useState<string>("");
	const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
	const [financialAssets, setFinancialAssets] = useState<FinancialAssets | null>(null);
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const formNo = searchParams.get("formNo");
		if (formNo) {
			setFormNumber(formNo);
			fetchData(formNo);
		}
	}, [searchParams]);

	const fetchData = async (formNo: string) => {
		setLoading(true);
		setError(null);

		try {
			// Fetch Basic Info (now includes financial assets)
			const basicInfoResponse = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNo)}`);
			const basicInfoData = await basicInfoResponse.json();
			
			if (basicInfoData.success && basicInfoData.data) {
				setBasicInfo(basicInfoData.data);
				// Financial assets are now part of basicInfo, so set them from there
				if (basicInfoData.data) {
					setFinancialAssets({
						Family_ID: basicInfoData.data.FormNumber,
						Land_Barren_Kanal: basicInfoData.data.Land_Barren_Kanal,
						Land_Barren_Value_Rs: basicInfoData.data.Land_Barren_Value_Rs,
						Land_Agriculture_Kanal: basicInfoData.data.Land_Agriculture_Kanal,
						Land_Agriculture_Value_Rs: basicInfoData.data.Land_Agriculture_Value_Rs,
						Livestock_Number: basicInfoData.data.Livestock_Number,
						Livestock_Value_Rs: basicInfoData.data.Livestock_Value_Rs,
						Fruit_Trees_Number: basicInfoData.data.Fruit_Trees_Number,
						Fruit_Trees_Value_Rs: basicInfoData.data.Fruit_Trees_Value_Rs,
						Vehicles_4W_Number: basicInfoData.data.Vehicles_4W_Number,
						Vehicles_4W_Value_Rs: basicInfoData.data.Vehicles_4W_Value_Rs,
						Motorcycle_2W_Number: basicInfoData.data.Motorcycle_2W_Number,
						Motorcycle_2W_Value_Rs: basicInfoData.data.Motorcycle_2W_Value_Rs,
						Entry_Date: basicInfoData.data.CreatedAt || "",
						Updated_Date: basicInfoData.data.UpdatedAt || "",
					});
				}
			}

			// Fetch Family Members
			const membersResponse = await fetch(`/api/baseline-applications/family-members-data?formNumber=${encodeURIComponent(formNo)}`);
			const membersData = await membersResponse.json();
			
			if (membersData.success && membersData.data) {
				setFamilyMembers(membersData.data);
			}
		} catch (err: any) {
			console.error("Error fetching data:", err);
			setError(err.message || "Failed to fetch data");
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		if (formNumber.trim()) {
			fetchData(formNumber.trim());
		} else {
			setError("Please enter a Form Number");
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (value: number | null) => {
		if (value === null || value === undefined) return "N/A";
		return `Rs. ${value.toLocaleString()}`;
	};

	const getRelationshipName = (id: number) => {
		const relationships: { [key: number]: string } = {
			1: "Self",
			2: "Spouse (husband / wife)",
			3: "Child",
			4: "Parent",
			5: "Sibling (sister / brother)",
			6: "Stepchild (son / daughter)",
			7: "Grandparent",
			8: "Niece / nephew",
			9: "Grandchild",
			10: "Brother-in-law / sister-in-law",
			11: "Daughter-in-law / son-in-law",
			12: "Stepmother / father",
			13: "Uncle / Aunt",
			98: "Others",
		};
		return relationships[id] || `Unknown (${id})`;
	};

	const getGenderName = (id: number) => {
		return id === 1 ? "Male" : id === 2 ? "Female" : `Unknown (${id})`;
	};

	const getMaritalStatusName = (id: number) => {
		const statuses: { [key: number]: string } = {
			1: "Single (never married)",
			2: "Married",
			3: "Separated (not divorced)",
			4: "Divorced",
			5: "Widow",
			6: "Widower",
		};
		return statuses[id] || `Unknown (${id})`;
	};

	const getOccupationName = (id: number | null) => {
		if (!id) return "N/A";
		const occupations: { [key: number]: string } = {
			1: "Salaried (employment)",
			2: "Business",
			3: "Self-employed",
			4: "Agriculture-Live Stock",
			5: "Student",
			6: "Unemployed",
			7: "Home maker",
			8: "Retired",
			98: "Others",
		};
		return occupations[id] || `Unknown (${id})`;
	};

	if (loading && !basicInfo) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Baseline Application Details</h1>
					<p className="text-gray-600 mt-2">View family information, assets, and family members</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/baseline-qol")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to List
				</button>
			</div>

			{/* Search Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="flex items-end gap-4">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Form Number
						</label>
						<input
							type="text"
							value={formNumber}
							onChange={(e) => setFormNumber(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							placeholder="Enter Form Number (e.g., PE-00001)"
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<button
						onClick={handleSearch}
						disabled={loading}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Search className="h-4 w-4" />
						{loading ? "Searching..." : "Search"}
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Basic Information */}
			{basicInfo && (
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Family Information (PE_Application_BasicInfo)</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
							<p className="text-sm text-gray-900 font-semibold">{basicInfo.FormNumber}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
							<p className="text-sm text-gray-900">{formatDate(basicInfo.ApplicationDate)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Received By Name</label>
							<p className="text-sm text-gray-900">{basicInfo.ReceivedByName || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Received By Date</label>
							<p className="text-sm text-gray-900">{formatDate(basicInfo.ReceivedByDate)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
							<p className="text-sm text-gray-900">{basicInfo.Full_Name}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
							<p className="text-sm text-gray-900">{formatDate(basicInfo.DateOfBirth)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC Number</label>
							<p className="text-sm text-gray-900">{basicInfo.CNICNumber || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mother Tongue</label>
							<p className="text-sm text-gray-900">{basicInfo.MotherTongue || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
							<p className="text-sm text-gray-900">{basicInfo.ResidentialAddress || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Number</label>
							<p className="text-sm text-gray-900">{basicInfo.PrimaryContactNumber || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Secondary Contact Number</label>
							<p className="text-sm text-gray-900">{basicInfo.SecondaryContactNumber || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
							<p className="text-sm text-gray-900">{basicInfo.RegionalCommunity || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
							<p className="text-sm text-gray-900">{basicInfo.LocalCommunity || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Current Community Center</label>
							<p className="text-sm text-gray-900">{basicInfo.CurrentCommunityCenter || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Primary Location Settlement</label>
							<p className="text-sm text-gray-900">{basicInfo.PrimaryLocationSettlement || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Area of Origin</label>
							<p className="text-sm text-gray-900">{basicInfo.AreaOfOrigin || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">House Ownership Status</label>
							<p className="text-sm text-gray-900">{basicInfo.HouseOwnershipStatus || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Health Insurance Program</label>
							<p className="text-sm text-gray-900">{basicInfo.HealthInsuranceProgram || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Remittance</label>
							<p className="text-sm text-gray-900">{formatCurrency(basicInfo.MonthlyIncome_Remittance)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Rental</label>
							<p className="text-sm text-gray-900">{formatCurrency(basicInfo.MonthlyIncome_Rental)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Other Sources</label>
							<p className="text-sm text-gray-900">{formatCurrency(basicInfo.MonthlyIncome_OtherSources)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
							<p className="text-sm text-gray-900">{formatDate(basicInfo.CreatedAt)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
							<p className="text-sm text-gray-900">{formatDate(basicInfo.UpdatedAt)}</p>
						</div>
						{basicInfo.Status && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
								<p className="text-sm text-gray-900">{basicInfo.Status}</p>
							</div>
						)}
						{basicInfo.CurrentLevel && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Current Level</label>
								<p className="text-sm text-gray-900">{basicInfo.CurrentLevel}</p>
							</div>
						)}
						{basicInfo.SubmittedAt && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted At</label>
								<p className="text-sm text-gray-900">{formatDate(basicInfo.SubmittedAt)}</p>
							</div>
						)}
						{basicInfo.SubmittedBy && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted By</label>
								<p className="text-sm text-gray-900">{basicInfo.SubmittedBy}</p>
							</div>
						)}
						{basicInfo.Locked !== null && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Locked</label>
								<p className="text-sm text-gray-900">{basicInfo.Locked ? "Yes" : "No"}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Financial Assets */}
			{financialAssets && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Financial Assets (PE_Application_BasicInfo)</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full border border-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Particulars</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Number/Kanal</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Approx. Value (Rs.)</th>
								</tr>
							</thead>
							<tbody className="bg-white">
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Barren (Kanal)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Land_Barren_Kanal || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Land_Barren_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Agriculture (Kanal)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Land_Agriculture_Kanal || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Land_Agriculture_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Livestock</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Livestock_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Livestock_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Fruit Trees</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Fruit_Trees_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Fruit_Trees_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Vehicles (4-wheeler)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Vehicles_4W_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Vehicles_4W_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Motorcycle (2-wheeler)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{financialAssets.Motorcycle_2W_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(financialAssets.Motorcycle_2W_Value_Rs)}</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="mt-4 text-sm text-gray-600">
						<p><strong>Entry Date:</strong> {formatDate(financialAssets.Entry_Date)}</p>
						<p><strong>Updated Date:</strong> {formatDate(financialAssets.Updated_Date)}</p>
			</div>
				</div>
			)}

			{/* Family Members */}
			{familyMembers.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-6">Family Members (PE_FamilyMember)</h2>
				<div className="overflow-x-auto">
						<table className="min-w-full border border-gray-300">
						<thead className="bg-gray-50">
							<tr>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Member No</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Full Name</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Relationship</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Gender</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Marital Status</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Date of Birth</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">CNIC/B-form</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Occupation</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Primary Location</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Primary Earner</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
								{familyMembers.map((member, index) => {
									// Extract member number from BeneficiaryID (format: PE-{FormNo}-{MemberNumber})
									const memberNo = member.BeneficiaryID ? member.BeneficiaryID.split('-').pop() || member.BeneficiaryID : '';
									return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{memberNo}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium">{member.FullName}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
											{getRelationshipName(member.RelationshipId)}
											{member.RelationshipOther && ` (${member.RelationshipOther})`}
									</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{getGenderName(member.GenderId)}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{getMaritalStatusName(member.MaritalStatusId)}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
											{member.DOBMonth && member.DOBYear ? `${member.DOBMonth}/${member.DOBYear}` : "N/A"}
												</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{member.BFormOrCNIC || "N/A"}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
											{getOccupationName(member.OccupationId)}
											{member.OccupationOther && ` (${member.OccupationOther})`}
												</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{member.PrimaryLocation || "N/A"}</td>
										<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
											{member.IsPrimaryEarner ? (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													Yes
												</span>
											) : (
												<span className="text-gray-500">No</span>
											)}
												</td>
									</tr>
									);
								})}
						</tbody>
					</table>
					</div>
					<div className="mt-4 text-sm text-gray-600">
						<p><strong>Total Members:</strong> {familyMembers.length}</p>
					</div>
				</div>
			)}

			{/* No Data Message */}
			{!loading && !basicInfo && !financialAssets && familyMembers.length === 0 && formNumber && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
					<p className="text-yellow-800">No data found for Form Number: <strong>{formNumber}</strong></p>
					<p className="text-sm text-yellow-600 mt-2">Please check the Form Number and try again.</p>
			</div>
			)}
		</div>
	);
}

export default function AddValuesPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<AddValuesPageContent />
		</Suspense>
	);
}
