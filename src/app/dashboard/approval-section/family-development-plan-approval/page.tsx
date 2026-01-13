"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, CheckCircle, XCircle, Clock } from "lucide-react";

type ApprovalStatus = {
	healthSupport: any[];
	foodSupport: any[];
	educationSupport: any[];
	housingSupport: any[];
	economicSupport: any[];
};

function FamilyDevelopmentPlanApprovalContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber") || "";

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [approvalData, setApprovalData] = useState<ApprovalStatus | null>(null);
	const [searchFormNumber, setSearchFormNumber] = useState(formNumber);

	const fetchApprovalStatus = async (formNum: string) => {
		if (!formNum.trim()) {
			setError("Please enter a Form Number");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await fetch(
				`/api/family-development-plan/approval-status?formNumber=${encodeURIComponent(formNum)}`
			);
			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to fetch approval status");
			}

			setApprovalData(data.data);
		} catch (err) {
			console.error("Error fetching approval status:", err);
			setError(err instanceof Error ? err.message : "Error fetching approval status");
			setApprovalData(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (formNumber) {
			fetchApprovalStatus(formNumber);
		}
	}, [formNumber]);

	const handleSearch = () => {
		if (searchFormNumber) {
			router.push(`/dashboard/approval-section/family-development-plan-approval?formNumber=${encodeURIComponent(searchFormNumber)}`);
		}
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return null;
		
		const statusLower = status.toLowerCase();
		if (statusLower === "approved") {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
					<CheckCircle className="h-3 w-3 mr-1" />
					Approved
				</span>
			);
		} else if (statusLower === "rejected") {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
					<XCircle className="h-3 w-3 mr-1" />
					Rejected
				</span>
			);
		} else {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					<Clock className="h-3 w-3 mr-1" />
					{status || "Pending"}
				</span>
			);
		}
	};

	const formatCurrency = (value: number | null | undefined): string => {
		if (value === null || value === undefined) return "N/A";
		return `PKR ${parseFloat(value.toString()).toLocaleString()}`;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Family Development Plan Approval</h1>
					<p className="text-gray-600 mt-2">View section-wise approval status for family development plans</p>
				</div>
				<button
					onClick={() => router.push("/dashboard")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Dashboard
				</button>
			</div>

			{/* Search Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="flex gap-4 items-end">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Form Number
						</label>
						<input
							type="text"
							value={searchFormNumber}
							onChange={(e) => setSearchFormNumber(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleSearch();
								}
							}}
							placeholder="Enter Form Number (e.g., PE-00005)"
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<button
						onClick={handleSearch}
						disabled={loading}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Search className="h-4 w-4" />
						Search
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading approval status...</span>
				</div>
			)}

			{/* Approval Status Sections */}
			{approvalData && !loading && (
				<div className="space-y-6">
					{/* Health Support Section */}
					{approvalData.healthSupport.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="bg-[#0b4d2b] px-6 py-4">
								<h2 className="text-xl font-semibold text-white">Health Support</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary ID with Name</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{approvalData.healthSupport.map((record) => (
											<tr key={record.FDP_HealthSupportID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_HealthSupportID}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{record.BeneficiaryID || "N/A"} {record.BeneficiaryName && `- ${record.BeneficiaryName}`}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.HealthMonthlyTotalCost)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.HealthMonthlyPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.HealthNumberOfMonths || "N/A"}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(record.HealthTotalPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.ApprovalStatus)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<button
														onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval/view?section=Health&recordId=${record.FDP_HealthSupportID}&formNumber=${encodeURIComponent(formNumber)}`)}
														className="text-[#0b4d2b] hover:text-[#0a3d22] font-medium"
													>
														View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Food Support Section */}
					{approvalData.foodSupport.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="bg-[#0b4d2b] px-6 py-4">
								<h2 className="text-xl font-semibold text-white">Food Support</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary ID with Name</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{approvalData.foodSupport.map((record) => (
											<tr key={record.FDP_FoodSupportID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_FoodSupportID}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{record.FamilyID || "N/A"} {record.HeadName && `- ${record.HeadName}`}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.FoodSupportMonthlyTotalCost)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.FoodSupportMonthlyPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FoodSupportNumberOfMonths || "N/A"}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(record.FoodSupportTotalPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.ApprovalStatus)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<button
														onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval/view?section=Food&recordId=${record.FDP_FoodSupportID}&formNumber=${encodeURIComponent(formNumber)}`)}
														className="text-[#0b4d2b] hover:text-[#0a3d22] font-medium"
													>
														View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Education Support Section */}
					{approvalData.educationSupport.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="bg-[#0b4d2b] px-6 py-4">
								<h2 className="text-xl font-semibold text-white">Education Support</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary ID with Name</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{approvalData.educationSupport.map((record) => {
											// Calculate monthly total cost (tuition + hostel + transport)
											const monthlyTotalCost = 
												(parseFloat(record.EduMonthlyTuitionTotalCost) || 0) +
												(parseFloat(record.EduMonthlyHostelTotalCost) || 0) +
												(parseFloat(record.EduMonthlyTransportTotalCost) || 0);
											
											// Calculate monthly PE contribution (tuition + hostel + transport)
											const monthlyPEContribution = 
												(parseFloat(record.EduMonthlyTuitionPEContribution) || 0) +
												(parseFloat(record.EduMonthlyHostelPEContribution) || 0) +
												(parseFloat(record.EduMonthlyTransportPEContribution) || 0);
											
											// Get max number of months
											const numberOfMonths = Math.max(
												parseInt(record.EduTuitionNumberOfMonths) || 0,
												parseInt(record.EduHostelNumberOfMonths) || 0,
												parseInt(record.EduTransportNumberOfMonths) || 0
											);
											
											return (
												<tr key={record.FDP_SocialEduID} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_SocialEduID}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{record.BeneficiaryID || "N/A"} {record.BeneficiaryName && `- ${record.BeneficiaryName}`}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(monthlyTotalCost)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(monthlyPEContribution)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{numberOfMonths > 0 ? numberOfMonths : "N/A"}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(record.EduTotalPEContribution)}</td>
													<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.ApprovalStatus)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
														<button
															onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval/view?section=Education&recordId=${record.FDP_SocialEduID}&formNumber=${encodeURIComponent(formNumber)}`)}
															className="text-[#0b4d2b] hover:text-[#0a3d22] font-medium"
														>
															View
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Housing Support Section */}
					{approvalData.housingSupport.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="bg-[#0b4d2b] px-6 py-4">
								<h2 className="text-xl font-semibold text-white">Housing Support</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary ID with Name</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total Cost</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Months</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{approvalData.housingSupport.map((record) => (
											<tr key={record.FDP_HabitatSupportID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_HabitatSupportID}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{record.FamilyID || "N/A"} {record.HeadName && `- ${record.HeadName}`}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.HabitatMonthlyTotalCost)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.HabitatMonthlyPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.HabitatNumberOfMonths || "N/A"}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(record.HabitatTotalPEContribution)}</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.ApprovalStatus)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<button
														onClick={() => router.push(`/dashboard/approval-section/family-development-plan-approval/view?section=Habitat&recordId=${record.FDP_HabitatSupportID}&formNumber=${encodeURIComponent(formNumber)}`)}
														className="text-[#0b4d2b] hover:text-[#0a3d22] font-medium"
													>
														View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Economic Support Section */}
					{approvalData.economicSupport.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="bg-[#0b4d2b] px-6 py-4">
								<h2 className="text-xl font-semibold text-white">Economic Support</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Number</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trade</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Required</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{approvalData.economicSupport.map((record) => (
											<tr key={record.FDP_EconomicID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_EconomicID}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FormNumber}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{record.BeneficiaryID || "N/A"} {record.BeneficiaryName && `- ${record.BeneficiaryName}`}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.InterventionType || "N/A"}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.Trade || record.SubFieldOfInvestment || "N/A"}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.InvestmentRequiredTotal)}</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(record.InvestmentFromPEProgram)}</td>
												<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.ApprovalStatus)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* No Data Message */}
					{approvalData.healthSupport.length === 0 &&
						approvalData.foodSupport.length === 0 &&
						approvalData.educationSupport.length === 0 &&
						approvalData.housingSupport.length === 0 &&
						approvalData.economicSupport.length === 0 && (
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
								<p className="text-gray-500 text-lg">No approval records found for this Form Number.</p>
							</div>
						)}
				</div>
			)}
		</div>
	);
}

export default function FamilyDevelopmentPlanApprovalPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FamilyDevelopmentPlanApprovalContent />
		</Suspense>
	);
}
