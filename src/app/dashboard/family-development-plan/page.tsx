"use client";

import { useEffect, useState, Fragment } from "react";
import { Download, Users } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type FamilyDetailedData = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	CNIC: string | null;
	CONTACT: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
};

type FamilyMember = {
	FAMILY_ID: string | null;
	MEMBER_ID: string | null;
	FULL_NAME: string | null;
	CNIC: string | null;
	RELATION: string | null;
	GENDER: string | null;
	AGE: number | null;
	MARITAL_STATUS: string | null;
	OCCUPATION: string | null;
	CURRENT_EDUCATION: string | null;
	HIGHEST_QLF: string | null;
	EARNING_SOURCE: string | null;
	MONTHLY_INCOME: number | null;
};

type FDPMenuItem = {
	id: string;
	title: string;
	href: string;
	imageUrl?: string;
	category: string;
};

const FDP_MENU_ITEMS: FDPMenuItem[] = [
	{
		id: "review-notes",
		title: "Review Notes",
		href: "/dashboard/family-development-plan/review-notes",
		imageUrl: "/img/_icons/fdp_icons/_Review_Notes.jpg",
		category: "overview"
	},
	{
		id: "education",
		title: "Education",
		href: "/dashboard/family-development-plan/education",
		imageUrl: "/img/_icons/fdp_icons/_Education.jpg",
		category: "basic-services"
	},
	{
		id: "health",
		title: "Health",
		href: "/dashboard/family-development-plan/health",
		imageUrl: "/img/_icons/fdp_icons/_Health.jpg",
		category: "basic-services"
	},
	{
		id: "food-nutrition",
		title: "Food Nutrition",
		href: "/dashboard/family-development-plan/food-nutrition",
		imageUrl: "/img/_icons/fdp_icons/_Food_Nutration.jpg",
		category: "basic-services"
	},
	{
		id: "housing-habitat",
		title: "Housing / Habitat",
		href: "/dashboard/family-development-plan/housing-habitat",
		imageUrl: "/img/_icons/fdp_icons/_Housing.jpg",
		category: "basic-services"
	},
	{
		id: "livelihood",
		title: "Livelihood",
		href: "/dashboard/family-development-plan/livelihood",
		imageUrl: "/img/_icons/fdp_icons/_Livelihood.jpg",
		category: "financial"
	},
	{
		id: "spending-pattern",
		title: "Spending Pattern",
		href: "/dashboard/family-development-plan/spending-pattern",
		imageUrl: "/img/_icons/fdp_icons/_Spending_Pattern.jpg",
		category: "financial"
	},
	{
		id: "financial-support-decision",
		title: "Financial Support Decision",
		href: "/dashboard/family-development-plan/financial-support-decision",
		imageUrl: "/img/_icons/fdp_icons/_Financial_Support_Decision.jpg",
		category: "financial"
	},
	{
		id: "access-to-finance",
		title: "Access to Finance",
		href: "/dashboard/family-development-plan/access-to-finance",
		imageUrl: "/img/_icons/fdp_icons/_Access_to_Fianace.jpg",
		category: "financial"
	},
	{
		id: "social-inclusion",
		title: "Social Inclusion",
		href: "/dashboard/family-development-plan/social-inclusion",
		imageUrl: "/img/_icons/fdp_icons/_Inclusion.png",
		category: "planning"
	},
	{
		id: "feasibility-plan",
		title: "Feasibility Plan",
		href: "/dashboard/family-development-plan/feasibility-plan",
		imageUrl: "/img/_icons/fdp_icons/_Feasibility_Plan.jpg",
		category: "planning"
	}
];

// Get menu items from Education to Feasibility Plan (exclude Review Notes and Family Profile)
const TAB_MENU_ITEMS = FDP_MENU_ITEMS.filter(item => 
	item.id !== "review-notes" && item.id !== "family-profile"
);

export default function FamilyDevelopmentPlanPage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Family_Development_Plan");
	const [families, setFamilies] = useState<FamilyDetailedData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;
	const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
	const [membersMap, setMembersMap] = useState<Record<string, FamilyMember[]>>({});
	const [loadingMembersMap, setLoadingMembersMap] = useState<Record<string, boolean>>({});
	const [activeTab, setActiveTab] = useState("education");
	
	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/families-detailed');
			const data = await response.json();

			if (data.success) {
				setFamilies(data.families || []);
			} else {
				setError(data.message || "Failed to fetch families");
			}
		} catch (err) {
			setError("Error fetching families");
			console.error("Error fetching families:", err);
		} finally {
			setLoading(false);
		}
	};

	// Filter families based on search term
	const filteredFamilies = families.filter((family) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			(family.FAMILY_ID?.toLowerCase().includes(searchLower)) ||
			(family.HEAD_NAME?.toLowerCase().includes(searchLower)) ||
			(family.CNIC?.toLowerCase().includes(searchLower)) ||
			(family.PROGRAM?.toLowerCase().includes(searchLower)) ||
			(family.AREA?.toLowerCase().includes(searchLower)) ||
			(family.REGIONAL_COUNCIL?.toLowerCase().includes(searchLower)) ||
			(family.LOCAL_COUNCIL?.toLowerCase().includes(searchLower)) ||
			(family.JAMAT_KHANA?.toLowerCase().includes(searchLower)) ||
			(family.CONTACT?.toLowerCase().includes(searchLower)) ||
			(family.AREA_TYPE?.toLowerCase().includes(searchLower))
		);
	});

	// Pagination
	const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedFamilies = filteredFamilies.slice(startIndex, startIndex + itemsPerPage);

	// Fetch family members
	const fetchFamilyMembers = async (familyId: string) => {
		// If already expanded, collapse it
		if (expandedFamilyId === familyId) {
			setExpandedFamilyId(null);
			return;
		}

		// If members already loaded, just expand
		if (membersMap[familyId]) {
			setExpandedFamilyId(familyId);
			return;
		}

		// Fetch members
		try {
			setLoadingMembersMap(prev => ({ ...prev, [familyId]: true }));
			setError(null);
			const response = await fetch(`/api/family-members?familyId=${encodeURIComponent(familyId)}`);
			const data = await response.json();

			if (data.success) {
				setMembersMap(prev => ({ ...prev, [familyId]: data.members || [] }));
				setExpandedFamilyId(familyId);
			} else {
				setError(data.message || "Failed to fetch family members");
			}
		} catch (err) {
			setError("Error fetching family members");
			console.error("Error fetching family members:", err);
		} finally {
			setLoadingMembersMap(prev => ({ ...prev, [familyId]: false }));
		}
	};

	// CSV Export
	const exportToCSV = () => {
		const headers = [
			"Family ID",
			"Program",
			"Area",
			"Regional Council",
			"Local Council",
			"Jamat Khana",
			"Head Name",
			"CNIC",
			"Contact",
			"Per Capita Income",
			"Total Family Member",
			"Area Type"
		];

		// Helper function to escape CSV values
		const escapeCSVValue = (value: any): string => {
			if (value === null || value === undefined) return "";
			const stringValue = String(value);
			// If value contains comma, quote, or newline, wrap in quotes and escape quotes
			if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}
			return stringValue;
		};

		const csvContent = [
			headers.map(escapeCSVValue).join(","),
			...filteredFamilies.map((family) =>
				[
					family.FAMILY_ID,
					family.PROGRAM,
					family.AREA,
					family.REGIONAL_COUNCIL,
					family.LOCAL_COUNCIL,
					family.JAMAT_KHANA,
					family.HEAD_NAME,
					family.CNIC,
					family.CONTACT,
					family.PER_CAPITA_INCOME,
					family.TOTAL_FAMILY_MEMBER,
					family.AREA_TYPE
				].map(escapeCSVValue).join(",")
			)
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `families_detailed_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="Family Development Plan" />;
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
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Family Development Plan</h1>
				<p className="text-gray-600 mt-2">Manage and track family development plans</p>
			</div>
			
			{/* Data Table Section */}
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h2 className="text-2xl font-bold text-gray-900">Family Data</h2>
					<button
						onClick={exportToCSV}
						className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-600 text-sm">{error}</p>
					</div>
				)}

				{/* Search */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<input
						type="text"
						placeholder="Search by Family ID, Head Name, CNIC, Program, Area, etc..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setCurrentPage(1);
						}}
						className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>

				{/* Table */}
				{loading ? (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
						<div className="flex items-center justify-center">
							<div className="text-center">
								<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
								<p className="mt-4 text-gray-600">Loading families...</p>
							</div>
						</div>
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jamat Khana</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Capita Income</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Family Member</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Type</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{paginatedFamilies.length === 0 ? (
										<tr>
											<td colSpan={13} className="px-4 py-8 text-center text-gray-500">
												{searchTerm ? "No families found matching your search" : "No families found"}
											</td>
										</tr>
									) : (
										paginatedFamilies.map((family, index) => {
											const familyId = family.FAMILY_ID || "";
											const isExpanded = expandedFamilyId === familyId;
											const members = membersMap[familyId] || [];
											const isLoading = loadingMembersMap[familyId] || false;

											return (
												<Fragment key={familyId || index}>
													<tr className="hover:bg-gray-50">
														<td className="px-4 py-3 whitespace-nowrap text-sm">
															<button
																onClick={() => familyId && fetchFamilyMembers(familyId)}
																disabled={isLoading || !familyId}
																className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium ${
																	isExpanded
																		? "bg-gray-600 text-white hover:bg-gray-700"
																		: "bg-[#0b4d2b] text-white hover:bg-[#0a3d22]"
																}`}
															>
																<Users className="h-3 w-3" />
																{isExpanded ? "Hide Members" : "Show Members"}
															</button>
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
															{familyId || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.PROGRAM || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.AREA || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.REGIONAL_COUNCIL || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.LOCAL_COUNCIL || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.JAMAT_KHANA || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.HEAD_NAME || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.CNIC || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.CONTACT || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.PER_CAPITA_INCOME ? family.PER_CAPITA_INCOME.toLocaleString() : "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.TOTAL_FAMILY_MEMBER || "N/A"}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
															{family.AREA_TYPE || "N/A"}
														</td>
													</tr>
													{/* Expanded Members Row */}
													{isExpanded && (
														<tr>
															<td colSpan={13} className="px-0 py-0 bg-gray-50">
																<div className="p-4">
																	<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
																		<div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
																			<h3 className="text-lg font-semibold text-gray-900">
																				Family Members - {familyId}
																			</h3>
																		</div>
																		{isLoading ? (
																			<div className="flex items-center justify-center py-8">
																				<div className="text-center">
																					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
																					<p className="mt-2 text-sm text-gray-600">Loading members...</p>
																				</div>
																			</div>
																		) : members.length === 0 ? (
																			<div className="text-center py-8 text-gray-500">
																				No members found for this family.
																			</div>
																		) : (
																			<div className="overflow-x-auto">
																				<table className="min-w-full divide-y divide-gray-200">
																					<thead className="bg-gray-50">
																						<tr>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member ID</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relation</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marital Status</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Education</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Qualification</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earning Source</th>
																							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Income</th>
																						</tr>
																					</thead>
																					<tbody className="bg-white divide-y divide-gray-200">
																						{members.map((member, memberIndex) => (
																							<tr key={member.MEMBER_ID || memberIndex} className="hover:bg-gray-50">
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.MEMBER_ID || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.FULL_NAME || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.CNIC || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.RELATION || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.GENDER || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.AGE || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.MARITAL_STATUS || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.OCCUPATION || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.CURRENT_EDUCATION || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.HIGHEST_QLF || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.EARNING_SOURCE || "N/A"}
																								</td>
																								<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																									{member.MONTHLY_INCOME ? member.MONTHLY_INCOME.toLocaleString() : "N/A"}
																								</td>
																							</tr>
																						))}
																					</tbody>
																				</table>
																			</div>
																		)}
																	</div>
																</div>
															</td>
														</tr>
													)}
												</Fragment>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
								<div className="flex items-center justify-between">
									<div className="text-sm text-gray-700">
										Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
										<span className="font-medium">
											{Math.min(startIndex + itemsPerPage, filteredFamilies.length)}
										</span>{" "}
										of <span className="font-medium">{filteredFamilies.length}</span> results
									</div>
									<nav className="flex gap-2">
										<button
											onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
											disabled={currentPage === 1}
											className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
										>
											Previous
										</button>
										<button
											onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
											disabled={currentPage === totalPages}
											className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
										>
											Next
										</button>
									</nav>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Tabs Section Below Gridview */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{/* Tabs Navigation */}
				<div className="border-b border-gray-200 bg-gray-50">
					<nav className="flex -mb-px overflow-x-auto">
						{TAB_MENU_ITEMS.map((item) => (
							<button
								key={item.id}
								onClick={() => setActiveTab(item.id)}
								className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
									activeTab === item.id
										? "border-[#0b4d2b] text-[#0b4d2b] bg-white"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100"
								}`}
							>
								{item.title}
							</button>
						))}
					</nav>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{TAB_MENU_ITEMS.map((item) => (
						activeTab === item.id && (
							<div key={item.id}>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">{item.title}</h3>
								<div className="text-gray-600">
									<p>Content for {item.title} will be displayed here.</p>
								</div>
							</div>
						)
					))}
				</div>
			</div>

		</div>
	);
}

