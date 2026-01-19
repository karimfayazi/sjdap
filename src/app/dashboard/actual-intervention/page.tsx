"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, XCircle, CreditCard, RefreshCw, Users, FileText, MapPin, Hash } from "lucide-react";
import RequirePermission from "@/components/RequirePermission";

type FamilyRecord = {
	FormNumber: string;
	Full_Name: string;
	CNICNumber: string;
	RegionalCommunity: string;
	LocalCommunity: string;
	TotalMembers: number;
};

type FamilyMember = {
	MemberNo: string;
	FullName: string;
	BFormOrCNIC: string;
	Relationship: string;
	Gender: string;
	DOBMonth: number | null;
	DOBYear: number | null;
	MonthlyIncome: number | null;
};

type MemberInterventions = {
	economic: boolean;
	education: boolean;
	food: boolean;
	habitat: boolean;
};

export default function ActualInterventionPage() {
	const router = useRouter();
	const [records, setRecords] = useState<FamilyRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Member modal state
	const [showMemberModal, setShowMemberModal] = useState(false);
	const [selectedFormNumber, setSelectedFormNumber] = useState<string | null>(null);
	const [members, setMembers] = useState<FamilyMember[]>([]);
	const [memberInterventions, setMemberInterventions] = useState<Record<string, MemberInterventions>>({});
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [memberError, setMemberError] = useState<string | null>(null);


	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/actual-intervention");
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setError(data?.message || "Failed to load families");
				return;
			}

			setRecords(data.records || []);
		} catch (err) {
			console.error("Error fetching families:", err);
			setError("Error fetching families");
		} finally {
			setLoading(false);
		}
	};

	const handleShowMembers = async (formNumber: string) => {
		setSelectedFormNumber(formNumber);
		setShowMemberModal(true);
		setLoadingMembers(true);
		setMemberError(null);
		setMembers([]);
		setMemberInterventions({});

		try {
			const response = await fetch(`/api/actual-intervention/members?formNumber=${encodeURIComponent(formNumber)}`);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setMemberError(data?.message || "Failed to load members");
				return;
			}

			setMembers(data.members || []);
			setMemberInterventions(data.interventions || {});
		} catch (err) {
			console.error("Error fetching members:", err);
			setMemberError("Error fetching members");
		} finally {
			setLoadingMembers(false);
		}
	};

	const handleInterventionClick = (formNumber: string, interventionType: string, memberId: string) => {
		router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}/add?type=${interventionType}&memberId=${encodeURIComponent(memberId)}`);
	};

	const handleBankAccountClick = (formNumber: string, memberId: string) => {
		router.push(`/dashboard/actual-intervention/bank-account?formNumber=${encodeURIComponent(formNumber)}&memberId=${encodeURIComponent(memberId)}`);
	};

	const formatDateOfBirth = (month: number | null, year: number | null): string => {
		if (!month || !year) return "N/A";
		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		return `${monthNames[month - 1] || month} ${year}`;
	};

	const formatRegionalLocal = (regional: string | null, local: string | null): string => {
		const parts = [];
		if (regional) parts.push(regional);
		if (local) parts.push(local);
		return parts.length > 0 ? parts.join(" / ") : "N/A";
	};

	return (
		<RequirePermission permission="Actual Intervention">
			{loading ? (
				<div className="space-y-6">
					<div className="flex justify-between items-center bg-white rounded-xl shadow-md border border-gray-200 p-6">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
								Actual Intervention
							</h1>
							<p className="text-gray-600 mt-2 font-medium">Manage family interventions and member details</p>
						</div>
					</div>
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="text-center">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
							<p className="mt-4 text-gray-600 font-medium">Loading families...</p>
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center bg-white rounded-xl shadow-md border border-gray-200 p-6">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] bg-clip-text text-transparent">
							Actual Intervention
						</h1>
					</div>
					<p className="text-gray-600 mt-2 font-medium">Manage family interventions and member details</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchFamilies}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg font-semibold"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
					<div className="flex items-center gap-3">
						<XCircle className="h-5 w-5 text-red-600" />
						<p className="text-red-600 text-sm font-semibold">Error: {error}</p>
					</div>
				</div>
			)}

			{!error && (
				<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
					{/* Table Header Section */}
					<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b] px-6 py-4 border-b-2 border-[#0a3d22]">
						<h3 className="text-lg font-bold text-white flex items-center gap-2">
							<Users className="h-5 w-5" />
							Family Records
						</h3>
						<p className="text-sm text-white/80 mt-1">Total Families: {records.length}</p>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4" />
											Form #
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										Full Name
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<Hash className="h-4 w-4" />
											CNIC
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center gap-2">
											<MapPin className="h-4 w-4" />
											Regional / Local
										</div>
									</th>
									<th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
										<div className="flex items-center justify-center gap-2">
											<Users className="h-4 w-4" />
											Total Members
										</div>
									</th>
									<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{records.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-6 py-16 text-center">
											<div className="flex flex-col items-center justify-center">
												<div className="p-4 bg-gray-100 rounded-full mb-4">
													<Users className="h-8 w-8 text-gray-400" />
												</div>
												<p className="text-lg font-semibold text-gray-700">No families found</p>
												<p className="text-sm text-gray-500 mt-2">No family records available for your account</p>
											</div>
										</td>
									</tr>
								) : (
									records.map((record, index) => (
										<tr 
											key={record.FormNumber} 
											className={`transition-all duration-150 ${
												index % 2 === 0 
													? 'bg-white hover:bg-blue-50' 
													: 'bg-gray-50 hover:bg-blue-100'
											}`}
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm font-semibold text-[#0b4d2b]">{record.FormNumber || "N/A"}</span>
											</td>
											<td className="px-6 py-4">
												<span className="text-sm font-medium text-gray-900">{record.Full_Name || "N/A"}</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-gray-700">{record.CNICNumber || "N/A"}</span>
											</td>
											<td className="px-6 py-4">
												<span className="text-sm text-gray-700">
													{formatRegionalLocal(record.RegionalCommunity, record.LocalCommunity)}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-center">
												<span className="inline-flex items-center justify-center w-10 h-10 bg-[#0b4d2b]/10 text-[#0b4d2b] rounded-full font-bold">
													{record.TotalMembers || 0}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<button
													type="button"
													onClick={() => handleShowMembers(record.FormNumber)}
													className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
												>
													<Eye className="h-4 w-4" />
													View Members
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Member Modal */}
			{showMemberModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-black bg-opacity-50"
							onClick={() => {
								setShowMemberModal(false);
								setSelectedFormNumber(null);
								setMembers([]);
								setMemberInterventions({});
							}}
						></div>
						<div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b]">
								<div>
									<h2 className="text-2xl font-bold text-white flex items-center gap-2">
										<Users className="h-6 w-6" />
										Family Members
									</h2>
									<p className="text-sm text-white/80 mt-1">Form Number: {selectedFormNumber}</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-gray-200"
								>
									<XCircle className="h-6 w-6" />
								</button>
							</div>

							<div className="flex-1 overflow-y-auto px-6 py-4">
								{loadingMembers ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
											<span className="ml-3 text-gray-600 mt-3 block">Loading members...</span>
										</div>
									</div>
								) : memberError ? (
									<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
										{memberError}
									</div>
								) : members.length === 0 ? (
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
										<p className="text-gray-600">No members found for this family.</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
														<tr>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Member No
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Full Name
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																B-Form/CNIC
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Relationship
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Gender
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Date of Birth
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
																Monthly Income
															</th>
															<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
																Interventions
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{members.map((member, index) => {
															const interventions = memberInterventions[member.MemberNo] || {
																economic: false,
																education: false,
																food: false,
																habitat: false,
															};

															return (
																<tr 
																	key={member.MemberNo} 
																	className={`transition-colors ${
																		index % 2 === 0 
																			? "bg-white hover:bg-blue-50" 
																			: "bg-gray-50 hover:bg-blue-50"
																	}`}
																>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm font-semibold text-[#0b4d2b]">{member.MemberNo || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm font-medium text-gray-900">{member.FullName || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm text-gray-700">{member.BFormOrCNIC || "N/A"}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
																			{member.Relationship || "N/A"}
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
																			{member.Gender || "N/A"}
																		</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		<span className="text-sm text-gray-700">{formatDateOfBirth(member.DOBMonth, member.DOBYear)}</span>
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap">
																		{member.MonthlyIncome != null ? (
																			<span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-semibold">
																				Rs. {member.MonthlyIncome.toLocaleString()}
																			</span>
																		) : (
																			<span className="text-sm text-gray-400">N/A</span>
																		)}
																	</td>
																	<td className="px-6 py-4 whitespace-nowrap text-sm">
																		{interventions.economic || interventions.education || interventions.food || interventions.habitat ? (
																			<div className="flex flex-wrap gap-2">
																				{interventions.economic && (
																					<>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "economic", member.MemberNo)}
																							className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer"
																						>
																							Economic
																						</button>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleBankAccountClick(selectedFormNumber, member.MemberNo)}
																							className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer"
																						>
																							<CreditCard className="h-3.5 w-3.5" />
																							Bank Account
																						</button>
																					</>
																				)}
																				{interventions.education && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "education", member.MemberNo)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 transition-all cursor-pointer"
																					>
																						Education
																					</button>
																				)}
																				{interventions.food && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "food", member.MemberNo)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md hover:from-amber-700 hover:to-amber-800 transition-all cursor-pointer"
																					>
																						Food
																					</button>
																				)}
																				{interventions.habitat && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "habitat", member.MemberNo)}
																						className="inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md hover:from-purple-700 hover:to-purple-800 transition-all cursor-pointer"
																					>
																						Habitat
																					</button>
																				)}
																			</div>
																		) : (
																			<span className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 italic">
																				No intervention defined in FDP
																			</span>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="border-t-2 border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="px-6 py-2.5 bg-gradient-to-r from-[#0b4d2b] to-[#0d5d35] text-white rounded-lg text-sm font-semibold hover:from-[#0a3d22] hover:to-[#0b4d2b] transition-all shadow-md hover:shadow-lg"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
			)}
		</RequirePermission>
	);
}
