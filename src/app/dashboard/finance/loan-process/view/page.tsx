"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

type LoanData = {
	Intervention_ID?: number;
	Family_ID: string;
	Member_ID?: string;
	Letter_Ref?: string;
	Letter_Date?: string;
	Bank_Name?: string;
	Bank_Branch?: string;
	Account_Title?: string;
	Account_Number?: string;
	Account_Branch?: string;
	Lien_Percentage?: number;
	Beneficiary_Name?: string;
	Beneficiary_CNIC?: string;
	Beneficiary_Contact?: string;
	Beneficiary_Address?: string;
	Loan_Type?: string;
	Loan_Purpose?: string;
	Recommended_Amount?: number;
	Recommended_Tenure_Months?: number;
	Grace_Period_Months?: number;
	Recommended_Branch?: string;
	Loan_Status?: string;
	Post_Date?: string;
	Post_By?: string;
	Approved_Date?: string;
	Approved_By?: string;
	CNIC_Path?: string;
	KYC_Path?: string;
	Agreement_Letter_Path?: string;
	bank_send?: boolean;
	bank_send_date?: string;
	collateral_mark?: boolean;
	collateral_date?: string;
	Member_Name?: string;
};

function ViewLoanRecordContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const interventionId = searchParams.get("interventionId");

	const [loan, setLoan] = useState<LoanData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchLoan = async () => {
			if (!interventionId) {
				setError("Missing Intervention ID in the URL.");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/loan-authorization?interventionId=${encodeURIComponent(interventionId)}`);
				const data = await response.json();

				if (data.success && Array.isArray(data.loans) && data.loans.length > 0) {
					setLoan(data.loans[0]);
				} else {
					setError(data.message || "Loan record not found.");
				}
			} catch (err) {
				console.error("Error fetching loan record:", err);
				setError("Error fetching loan record.");
			} finally {
				setLoading(false);
			}
		};

		fetchLoan();
	}, [interventionId]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
						<p className="text-gray-600 mt-2">Loading loan record...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	if (error || !loan) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
						<p className="text-gray-600 mt-2">Unable to load loan record</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/finance/loan-process")}
						className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Loan Process
					</button>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700 text-sm">{error || "Loan record not found."}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
					<p className="text-gray-600 mt-2">
						Complete information for{" "}
						<span className="font-semibold text-gray-900">
							Intervention ID {loan.Intervention_ID} ({loan.Family_ID}
							{loan.Member_Name && <> - {loan.Member_Name}</>})
						</span>
					</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/finance/loan-process")}
					className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Loan Process
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Basic Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Intervention ID</p>
							<p className="font-medium text-gray-900">{loan.Intervention_ID}</p>
						</div>
						<div>
							<p className="text-gray-500">Family ID</p>
							<p className="font-medium text-gray-900">{loan.Family_ID}</p>
						</div>
						<div>
							<p className="text-gray-500">Member ID</p>
							<p className="font-medium text-gray-900">{loan.Member_ID || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Letter Reference</p>
							<p className="font-medium text-gray-900">{loan.Letter_Ref || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Letter Date</p>
							<p className="font-medium text-gray-900">{formatDate(loan.Letter_Date)}</p>
						</div>
						<div>
							<p className="text-gray-500">Loan Status</p>
							<p className="font-medium text-gray-900">{loan.Loan_Status || "Pending"}</p>
						</div>
						<div>
							<p className="text-gray-500">Post Date</p>
							<p className="font-medium text-gray-900">{formatDate(loan.Post_Date)}</p>
						</div>
						<div>
							<p className="text-gray-500">Post By</p>
							<p className="font-medium text-gray-900">{loan.Post_By || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Approved Date</p>
							<p className="font-medium text-gray-900">{formatDate(loan.Approved_Date)}</p>
						</div>
						<div>
							<p className="text-gray-500">Approved By</p>
							<p className="font-medium text-gray-900">{loan.Approved_By || "N/A"}</p>
						</div>
					</div>
				</div>

				{/* Bank and Account Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">Bank &amp; Account Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Bank Name</p>
							<p className="font-medium text-gray-900">{loan.Bank_Name || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Bank Branch</p>
							<p className="font-medium text-gray-900">{loan.Bank_Branch || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Account Title</p>
							<p className="font-medium text-gray-900">{loan.Account_Title || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Account Number (IBAN)</p>
							<p className="font-mono text-sm text-gray-900 break-all">{loan.Account_Number || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Account Branch</p>
							<p className="font-medium text-gray-900">{loan.Account_Branch || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Lien Percentage</p>
							<p className="font-medium text-gray-900">
								{loan.Lien_Percentage !== undefined && loan.Lien_Percentage !== null
									? `${loan.Lien_Percentage}%`
									: "N/A"}
							</p>
						</div>
					</div>
				</div>

				{/* Beneficiary Information */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">Beneficiary Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Beneficiary Name</p>
							<p className="font-medium text-gray-900">{loan.Beneficiary_Name || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Beneficiary CNIC</p>
							<p className="font-medium text-gray-900">{loan.Beneficiary_CNIC || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Beneficiary Contact</p>
							<p className="font-medium text-gray-900">{loan.Beneficiary_Contact || "N/A"}</p>
						</div>
						<div className="md:col-span-2">
							<p className="text-gray-500">Beneficiary Address</p>
							<p className="font-medium text-gray-900">{loan.Beneficiary_Address || "N/A"}</p>
						</div>
					</div>
				</div>

				{/* Loan Details */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">Loan Details</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Loan Type</p>
							<p className="font-medium text-gray-900">{loan.Loan_Type || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Loan Purpose</p>
							<p className="font-medium text-gray-900">{loan.Loan_Purpose || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Recommended Amount</p>
							<p className="font-medium text-gray-900">
								{loan.Recommended_Amount !== undefined && loan.Recommended_Amount !== null
									? loan.Recommended_Amount.toLocaleString("en-PK", {
											style: "currency",
											currency: "PKR",
									  })
									: "N/A"}
							</p>
						</div>
						<div>
							<p className="text-gray-500">Recommended Tenure (Months)</p>
							<p className="font-medium text-gray-900">
								{loan.Recommended_Tenure_Months !== undefined && loan.Recommended_Tenure_Months !== null
									? loan.Recommended_Tenure_Months
									: "N/A"}
							</p>
						</div>
						<div>
							<p className="text-gray-500">Grace Period (Months)</p>
							<p className="font-medium text-gray-900">
								{loan.Grace_Period_Months !== undefined && loan.Grace_Period_Months !== null
									? loan.Grace_Period_Months
									: "N/A"}
							</p>
						</div>
						<div>
							<p className="text-gray-500">Recommended Branch</p>
							<p className="font-medium text-gray-900">{loan.Recommended_Branch || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Bank Send</p>
							<p className="font-medium text-gray-900">
								{loan.bank_send ? "Yes" : "No"}
								{loan.bank_send_date && (
									<span className="ml-2 text-xs text-gray-500">
										({formatDate(loan.bank_send_date)})
									</span>
								)}
							</p>
						</div>
						<div>
							<p className="text-gray-500">Collateral Mark</p>
							<p className="font-medium text-gray-900">
								{loan.collateral_mark ? "Yes" : "No"}
								{loan.collateral_date && (
									<span className="ml-2 text-xs text-gray-500">
										({formatDate(loan.collateral_date)})
									</span>
								)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Documents Section */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
				<h2 className="text-lg font-semibold text-gray-900">Documents</h2>
				<p className="text-sm text-gray-600">
					Click on a document to open it in a new tab (if your browser supports the file type).
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div className="border border-gray-200 rounded-md p-4 flex flex-col gap-2">
						<p className="text-gray-500">CNIC Document</p>
						{loan.CNIC_Path ? (
							<a
								href={loan.CNIC_Path}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-[#0b4d2b] hover:underline"
							>
								<FileText className="h-4 w-4" />
								View CNIC
							</a>
						) : (
							<p className="text-gray-400">No CNIC document uploaded.</p>
						)}
					</div>

					<div className="border border-gray-200 rounded-md p-4 flex flex-col gap-2">
						<p className="text-gray-500">KYC Document</p>
						{loan.KYC_Path ? (
							<a
								href={loan.KYC_Path}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-[#0b4d2b] hover:underline"
							>
								<FileText className="h-4 w-4" />
								View KYC
							</a>
						) : (
							<p className="text-gray-400">No KYC document uploaded.</p>
						)}
					</div>

					<div className="border border-gray-200 rounded-md p-4 flex flex-col gap-2">
						<p className="text-gray-500">Agreement Letter</p>
						{loan.Agreement_Letter_Path ? (
							<a
								href={loan.Agreement_Letter_Path}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-[#0b4d2b] hover:underline"
							>
								<FileText className="h-4 w-4" />
								View Agreement Letter
							</a>
						) : (
							<p className="text-gray-400">No agreement letter uploaded.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ViewLoanRecordPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">View Loan Record</h1>
						<p className="text-gray-600 mt-2">Loading...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ViewLoanRecordContent />
		</Suspense>
	);
}

