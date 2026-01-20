"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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

function EditBankAccountContent() {
	const router = useRouter();
	const params = useParams();
	const bankNo = params?.bankNo as string | undefined;

	const [bankInfo, setBankInfo] = useState<BankInformation | null>(null);
	const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
	const [approvalStatus, setApprovalStatus] = useState<string>("");
	const [remarks, setRemarks] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

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
					setApprovalStatus(data.bankInformation.ApprovalStatus || "");
					setRemarks(data.bankInformation.Remarks || "");
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!approvalStatus || (approvalStatus !== "APPROVED" && approvalStatus !== "REJECTED")) {
			setError("Please select an approval status (APPROVED or REJECTED)");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			const response = await fetch(`/api/approval/bank-accounts/${bankNo}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					approvalStatus,
					remarks,
				}),
			});

			// Safely parse response JSON
			let data;
			try {
				const responseText = await response.text();
				data = responseText ? JSON.parse(responseText) : {};
			} catch (parseError) {
				throw new Error("Failed to parse server response");
			}

			if (!response.ok) {
				const errorMessage = data.message || `Server error: ${response.status} ${response.statusText}`;
				throw new Error(errorMessage);
			}

			if (!data.success) {
				throw new Error(data.message || "Failed to update approval status");
			}

			setSuccess(true);
			setTimeout(() => {
				router.push("/dashboard/approval-section/bank-account-approval");
			}, 1500);
		} catch (err: any) {
			console.error("Error updating approval status:", err);
			setError(err.message || "Failed to update approval status");
		} finally {
			setSaving(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + " " + date.toLocaleTimeString();
		} catch {
			return dateString;
		}
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
		<PageGuard requiredAction="edit">
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
							<h1 className="text-3xl font-bold text-gray-900">Approve/Reject Bank Account</h1>
							<p className="text-gray-600 mt-2">Review and approve or reject bank account information</p>
						</div>
					</div>
				</div>

				{/* Success Message */}
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-green-800 font-medium">Approval status updated successfully! Redirecting...</p>
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800 font-medium">Error: {error}</p>
					</div>
				)}

				{/* Form */}
				{bankInfo && (
					<form onSubmit={handleSubmit} className="space-y-6">
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
												(e.target as HTMLImageElement).style.display = 'none';
												const parent = (e.target as HTMLImageElement).parentElement;
												if (parent) {
													parent.innerHTML = '<p class="text-sm text-gray-500">Image not available</p>';
												}
											}}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Approval Section */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Approval Decision</h2>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Approval Status <span className="text-red-500">*</span>
									</label>
									<div className="flex gap-4">
										<label className="flex items-center">
											<input
												type="radio"
												name="approvalStatus"
												value="APPROVED"
												checked={approvalStatus === "APPROVED"}
												onChange={(e) => setApprovalStatus(e.target.value)}
												className="mr-2 text-green-600 focus:ring-green-500"
											/>
											<span className="text-sm text-gray-700">APPROVED</span>
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												name="approvalStatus"
												value="REJECTED"
												checked={approvalStatus === "REJECTED"}
												onChange={(e) => setApprovalStatus(e.target.value)}
												className="mr-2 text-red-600 focus:ring-red-500"
											/>
											<span className="text-sm text-gray-700">REJECTED</span>
										</label>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Remarks
									</label>
									<textarea
										value={remarks}
										onChange={(e) => setRemarks(e.target.value)}
										rows={4}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										placeholder="Enter approval remarks..."
									/>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
							<button
								type="button"
								onClick={() => router.push("/dashboard/approval-section/bank-account-approval")}
								disabled={saving}
								className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{saving ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="w-4 h-4" />
										Save Approval
									</>
								)}
							</button>
						</div>
					</form>
				)}
			</div>
		</PageGuard>
	);
}

export default function EditBankAccountPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b]" />
				</div>
			}
		>
			<EditBankAccountContent />
		</Suspense>
	);
}
