"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, XCircle, CreditCard } from "lucide-react";

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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<p className="mt-4 text-gray-600">Loading families...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Actual Intervention</h1>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
				</div>
			)}

			{!error && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Form #
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Full Name
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										CNIC
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Regional / Local
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Total Members
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{records.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
											No families found.
										</td>
									</tr>
								) : (
									records.map((record) => (
										<tr key={record.FormNumber} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{record.FormNumber || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{record.Full_Name || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{record.CNICNumber || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{formatRegionalLocal(record.RegionalCommunity, record.LocalCommunity)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{record.TotalMembers || 0}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												<button
													type="button"
													onClick={() => handleShowMembers(record.FormNumber)}
													className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
												>
													<Eye className="h-3.5 w-3.5" />
													Show Member
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
						<div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
								<h2 className="text-xl font-bold text-gray-900">Family Members</h2>
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="text-gray-400 hover:text-gray-600"
								>
									<XCircle className="h-5 w-5" />
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
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Member No
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Full Name
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																B-Form/CNIC
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Relationship
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Gender
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Date of Birth
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Monthly Income
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Interventions
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{members.map((member) => {
															const interventions = memberInterventions[member.MemberNo] || {
																economic: false,
																education: false,
																food: false,
																habitat: false,
															};

															return (
																<tr key={member.MemberNo} className="hover:bg-gray-50">
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.MemberNo || "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.FullName || "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.BFormOrCNIC || "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.Relationship || "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.Gender || "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{formatDateOfBirth(member.DOBMonth, member.DOBYear)}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																		{member.MonthlyIncome != null
																			? member.MonthlyIncome.toLocaleString()
																			: "N/A"}
																	</td>
																	<td className="px-4 py-3 whitespace-nowrap text-sm">
																		{interventions.economic || interventions.education || interventions.food || interventions.habitat ? (
																			<div className="flex flex-wrap gap-2">
																				{interventions.economic && (
																					<>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "economic", member.MemberNo)}
																							className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
																						>
																							Economic
																						</button>
																						<button
																							type="button"
																							onClick={() => selectedFormNumber && handleBankAccountClick(selectedFormNumber, member.MemberNo)}
																							className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 transition-colors cursor-pointer"
																						>
																							<CreditCard className="h-3 w-3" />
																							Bank Account
																						</button>
																					</>
																				)}
																				{interventions.education && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "education", member.MemberNo)}
																						className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold bg-green-500 text-white shadow-sm hover:bg-green-600 transition-colors cursor-pointer"
																					>
																						Education
																					</button>
																				)}
																				{interventions.food && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "food", member.MemberNo)}
																						className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
																					>
																						Food
																					</button>
																				)}
																				{interventions.habitat && (
																					<button
																						type="button"
																						onClick={() => selectedFormNumber && handleInterventionClick(selectedFormNumber, "habitat", member.MemberNo)}
																						className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold bg-purple-500 text-white shadow-sm hover:bg-purple-600 transition-colors cursor-pointer"
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

							<div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setShowMemberModal(false);
										setSelectedFormNumber(null);
										setMembers([]);
										setMemberInterventions({});
									}}
									className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
