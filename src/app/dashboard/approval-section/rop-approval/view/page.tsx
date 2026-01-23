"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type ROP = {
	ROPId: number;
	FormNumber: string;
	BeneficiaryID: string | null;
	BankNo: number | null;
	InterventionID: string | null;
	InterventionSection: string | null;
	PayableAmount: number | null;
	PayAmount: number | null;
	MonthOfPayment: string | null;
	PaymentType: string | null;
	ApprovalStatus: string | null;
	SubmittedBy: string | null;
	SubmittedAt: string | null;
	Remarks: string | null;
	Payment_Done: string | null;
	// Family Information
	FamilyFullName: string | null;
	FamilyCNIC: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	// Member Information
	MemberName: string | null;
	MemberCNIC: string | null;
	// Bank Information
	BankName: string | null;
	AccountNo: string | null;
	AccountTitle: string | null;
};

function ViewROPContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const ropId = searchParams?.get("ropId");

	const [rop, setRop] = useState<ROP | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!ropId) {
			setError("ROP ID is missing from URL");
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/approval/rop-approval/${ropId}`);
				const data = await response.json();

				if (data.success) {
					setRop(data.rop);
				} else {
					setError(data.message || "Failed to load ROP details");
				}
			} catch (err: any) {
				console.error("Error fetching ROP details:", err);
				setError(err.message || "Failed to load ROP details");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [ropId]);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return `PKR ${amount.toLocaleString()}`;
	};

	const getStatusBadge = (status: string | null) => {
		if (!status || status === "Pending") {
			return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>;
		}
		const statusUpper = String(status).trim().toUpperCase();
		if (statusUpper === "APPROVED" || statusUpper === "APPROVAL" || statusUpper === "ACCEPTED") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approved</span>;
		} else if (statusUpper === "REJECTED" || statusUpper === "REJECTION") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejected</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>;
	};

	const getPaymentDoneBadge = (paymentDone: string | null) => {
		if (!paymentDone) return null;
		const upper = String(paymentDone).trim().toUpperCase();
		if (upper === "DONE" || upper === "PAYMENT") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Done</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">Not Done</span>;
	};

	if (loading) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
						<span className="ml-3 text-gray-600">Loading ROP details...</span>
					</div>
				</div>
			</PageGuard>
		);
	}

	if (error) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800">{error}</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/rop-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
			</PageGuard>
		);
	}

	if (!rop) {
		return (
			<PageGuard requiredAction="view">
				<div className="space-y-6">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-yellow-800">ROP not found</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/rop-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
			</PageGuard>
		);
	}

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">View ROP</h1>
						<p className="text-gray-600 mt-2">ROP ID: {rop.ROPId}</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/approval-section/rop-approval")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>

				{rop && (
					<>
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Information</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
									<p className="text-sm text-gray-900">{rop.FormNumber || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Family Head Name</label>
									<p className="text-sm text-gray-900">{rop.FamilyFullName || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
									<p className="text-sm text-gray-900">{rop.FamilyCNIC || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Regional / Local Community</label>
									<p className="text-sm text-gray-900">
										{rop.RegionalCommunity || "N/A"} / {rop.LocalCommunity || "N/A"}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">ROP Details</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">ROP ID</label>
									<p className="text-sm text-gray-900">{rop.ROPId}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intervention ID</label>
									<p className="text-sm text-gray-900">{rop.InterventionID || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
									<p className="text-sm text-gray-900">{rop.FormNumber || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
									<p className="text-sm text-gray-900">{rop.InterventionSection || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary ID</label>
									<p className="text-sm text-gray-900">{rop.BeneficiaryID || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Member Name</label>
									<p className="text-sm text-gray-900">{rop.MemberName || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Payable Amount</label>
									<p className="text-sm text-gray-900">{formatCurrency(rop.PayableAmount)}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Pay Amount</label>
									<p className="text-sm text-gray-900">{formatCurrency(rop.PayAmount)}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Month of Payment</label>
									<p className="text-sm text-gray-900">{rop.MonthOfPayment ? formatDate(rop.MonthOfPayment) : "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
									<p className="text-sm text-gray-900">{rop.PaymentType || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Bank No</label>
									<p className="text-sm text-gray-900">{rop.BankNo || "N/A"}</p>
								</div>
								{rop.BankName && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
										<p className="text-sm text-gray-900">{rop.BankName}</p>
									</div>
								)}
								{rop.AccountNo && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
										<p className="text-sm text-gray-900 font-mono">{rop.AccountNo}</p>
									</div>
								)}
								{rop.AccountTitle && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Account Title</label>
										<p className="text-sm text-gray-900">{rop.AccountTitle}</p>
									</div>
								)}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
									<div className="mt-1">{getStatusBadge(rop.ApprovalStatus)}</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Payment Done</label>
									<div className="mt-1">{getPaymentDoneBadge(rop.Payment_Done) || "N/A"}</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
									<p className="text-sm text-gray-900">{rop.SubmittedBy || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Submitted At</label>
									<p className="text-sm text-gray-900">{formatDate(rop.SubmittedAt)}</p>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
									<p className="text-sm text-gray-900 whitespace-pre-wrap">{rop.Remarks || "N/A"}</p>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</PageGuard>
	);
}

export default function ViewROPPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ViewROPContent />
		</Suspense>
	);
}
