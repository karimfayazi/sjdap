"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type BankInformation = {
	BankNo: number;
	FormNumber: string;
	BeneficiaryID: string | null;
	BankName: string | null;
	AccountTitle: string | null;
	AccountNo: string | null;
	CNIC: string | null;
	BankCode: string | null;
	SubmittedAt: string | null;
	SubmittedBy: string | null;
	ApprovalStatus: string | null;
	Remarks: string | null;
	BankChequeImagePath: string | null;
};

type BasicInfo = {
	FormNumber: string;
	Full_Name: string | null;
	CNICNumber: string | null;
	MotherTongue: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

type ApprovalLog = {
	LogID: number;
	ModuleName: string;
	RecordID: number;
	ActionLevel: string | null;
	ActionBy: string | null;
	ActionAt: string | null;
	ActionType: string | null;
	Remarks: string | null;
	FormNumber: string | null;
};

function ViewBankAccountContent() {
	const router = useRouter();
	const params = useParams();
	const bankNo = params?.bankNo as string | undefined;

	const [bankInfo, setBankInfo] = useState<BankInformation | null>(null);
	const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
	const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!bankNo) {
			setError("Bank Number is missing from URL");
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/approval/bank-accounts/${bankNo}`);
				const data = await response.json();

				if (data.success) {
					setBankInfo(data.bankInformation);
					setBasicInfo(data.basicInfo);
					setApprovalLogs(data.approvalLogs || []);
				} else {
					setError(data.message || "Failed to load bank account details");
				}
			} catch (err: any) {
				console.error("Error fetching bank account details:", err);
				setError(err.message || "Failed to load bank account details");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [bankNo]);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + " " + date.toLocaleTimeString();
		} catch {
			return dateString;
		}
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">Pending</span>;
		const statusUpper = status.toUpperCase();
		if (statusUpper === "APPROVAL" || statusUpper === "APPROVED") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approval</span>;
		} else if (statusUpper === "REJECTION" || statusUpper === "REJECTED") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejection</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">{status}</span>;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b]" />
					<span className="text-gray-600">Loading bank account details...</span>
				</div>
			</div>
		);
	}

	if (error && !bankInfo) {
		return (
			<div className="p-6">
				<div className="max-w-2xl mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
						<div className="text-red-600 text-lg font-semibold mb-2">Error</div>
						<p className="text-red-700 mb-4">{error}</p>
						<button
							onClick={() => router.push("/dashboard/approval-section/bank-account-approval")}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							Back to Bank Accounts
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							onClick={() => router.push("/dashboard/approval-section/bank-account-approval")}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						>
							<ArrowLeft className="h-5 w-5 text-gray-600" />
						</button>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Bank Account Details</h1>
							<p className="text-gray-600 mt-2">View bank account information and approval history</p>
						</div>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800 font-medium">Error: {error}</p>
					</div>
				)}

				{/* Family Information */}
				{basicInfo && (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
								<p className="text-sm text-gray-900">{basicInfo.FormNumber || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
								<p className="text-sm text-gray-900">{basicInfo.Full_Name || "N/A"}</p>
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
								<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
								<p className="text-sm text-gray-900">{basicInfo.RegionalCommunity || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
								<p className="text-sm text-gray-900">{basicInfo.LocalCommunity || "N/A"}</p>
							</div>
						</div>
					</div>
				)}

				{/* Bank Information */}
				{bankInfo && (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Bank Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Bank No</label>
								<p className="text-sm text-gray-900">{bankInfo.BankNo}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
								<p className="text-sm text-gray-900">{bankInfo.FormNumber || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary ID</label>
								<p className="text-sm text-gray-900">{bankInfo.BeneficiaryID || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
								<p className="text-sm text-gray-900">{bankInfo.BankName || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
								<p className="text-sm text-gray-900">{bankInfo.AccountTitle || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
								<p className="text-sm text-gray-900">{bankInfo.AccountNo || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
								<p className="text-sm text-gray-900">{bankInfo.CNIC || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Bank Code</label>
								<p className="text-sm text-gray-900">{bankInfo.BankCode || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted At</label>
								<p className="text-sm text-gray-900">{formatDate(bankInfo.SubmittedAt)}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted By</label>
								<p className="text-sm text-gray-900">{bankInfo.SubmittedBy || "N/A"}</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
								<div className="mt-1">{getStatusBadge(bankInfo.ApprovalStatus)}</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
								<p className="text-sm text-gray-900">{bankInfo.Remarks || "N/A"}</p>
							</div>
						</div>

						{/* Cheque Image */}
						{bankInfo.BankChequeImagePath && (
							<div className="mt-6">
								<label className="block text-sm font-medium text-gray-700 mb-2">Cheque Image</label>
								<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
									<img
										src={bankInfo.BankChequeImagePath}
										alt="Bank Cheque"
										className="max-w-full h-auto rounded-lg shadow-sm"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = "none";
											const parent = (e.target as HTMLImageElement).parentElement;
											if (parent) {
												parent.innerHTML =
													'<p class="text-sm text-gray-500">Image not available</p>';
											}
										}}
									/>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Approval Logs */}
				{approvalLogs.length > 0 && (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Approval History</h2>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Date</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action By</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Type</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Level</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{approvalLogs.map((log) => (
										<tr key={log.LogID} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(log.ActionAt)}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionBy || "N/A"}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">{getStatusBadge(log.ActionType)}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionLevel || "N/A"}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{log.Remarks || "N/A"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</PageGuard>
	);
}

export default function ViewBankAccountPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b]" />
				</div>
			}
		>
			<ViewBankAccountContent />
		</Suspense>
	);
}
