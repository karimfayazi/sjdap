"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import { hasLoanAccess as checkLoanAccess } from "@/lib/loan-access-utils";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type LoanData = {
	Intervention_ID?: number;
	Family_ID: string;
	Letter_Ref?: string;
	Bank_Name?: string;
	Loan_Status?: string;
	bank_send?: boolean;
	bank_send_date?: string;
	collateral_mark?: boolean;
	collateral_date?: string;
	Member_Name?: string;
};

function EditLoanFlagsContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const interventionId = searchParams.get("interventionId");
	const { userProfile, loading: authLoading } = useAuth();

	const [loan, setLoan] = useState<LoanData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasAccess, setHasAccess] = useState<boolean | null>(null);

	// Check loan access permission
	useEffect(() => {
		if (authLoading) return;

		// Check multiple sources for access_loans value
		let accessLoansValue = userProfile?.access_loans;
		
		// Fallback to localStorage if userProfile doesn't have it
		if ((accessLoansValue === null || accessLoansValue === undefined) && typeof window !== "undefined") {
			const storedValue = localStorage.getItem('access_loans');
			if (storedValue) {
				accessLoansValue = storedValue;
			}
			
			const userData = localStorage.getItem('userData');
			if (userData) {
				try {
					const parsedData = JSON.parse(userData);
					if (parsedData.access_loans !== undefined && parsedData.access_loans !== null) {
						accessLoansValue = parsedData.access_loans;
					}
				} catch (e) {
					console.error('Error parsing userData:', e);
				}
			}
		}

		// Check if user has loan access (access_loans = 1 or "Yes")
		const userHasLoanAccess = checkLoanAccess(accessLoansValue);

		// Also check if user is super user (has full access)
		const supperUserValue = userProfile?.supper_user;
		const userIsSuperUser = isSuperUser(supperUserValue);

		// Debug logging
		if (typeof window !== "undefined") {
			console.log("=== EDIT LOAN RECORD ACCESS CHECK ===", {
				username: userProfile?.username,
				access_loans: accessLoansValue,
				hasLoanAccess: userHasLoanAccess,
				isSuperUser: userIsSuperUser,
				willGrantAccess: userHasLoanAccess || userIsSuperUser
			});
		}

		if (!userHasLoanAccess && !userIsSuperUser) {
			setHasAccess(false);
			// DO NOT redirect - user requested to stay on access denied page
		} else {
			setHasAccess(true);
		}
	}, [userProfile, authLoading]);

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
					const item = data.loans[0];
					setLoan({
						Intervention_ID: item.Intervention_ID,
						Family_ID: item.Family_ID,
						Letter_Ref: item.Letter_Ref,
						Bank_Name: item.Bank_Name,
						Loan_Status: item.Loan_Status,
						bank_send: item.bank_send,
						bank_send_date: item.bank_send_date,
						collateral_mark: item.collateral_mark,
						collateral_date: item.collateral_date,
						Member_Name: item.Member_Name,
					});
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

	const handleCheckboxChange = (name: "bank_send" | "collateral_mark", checked: boolean) => {
		if (!loan) return;
		setLoan({
			...loan,
			[name]: checked,
			// clear date when unchecking
			...(name === "bank_send" && !checked ? { bank_send_date: "" } : {}),
			...(name === "collateral_mark" && !checked ? { collateral_date: "" } : {}),
		});
	};

	const handleDateChange = (name: "bank_send_date" | "collateral_date", value: string) => {
		if (!loan) return;
		setLoan({
			...loan,
			[name]: value,
		});
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!loan?.Intervention_ID) return;

		try {
			setSaving(true);
			setError(null);

			// Fetch full loan record first, then overlay the four fields we edit here,
			// so PUT has all required columns.
			const fullResponse = await fetch(`/api/loan-authorization?interventionId=${loan.Intervention_ID}`);
			const fullData = await fullResponse.json();

			if (!fullData.success || !Array.isArray(fullData.loans) || fullData.loans.length === 0) {
				setError(fullData.message || "Unable to load full loan data for update.");
				setSaving(false);
				return;
			}

			const fullLoan = fullData.loans[0];
			const payload = {
				...fullLoan,
				bank_send: loan.bank_send,
				bank_send_date: loan.bank_send_date,
				collateral_mark: loan.collateral_mark,
				collateral_date: loan.collateral_date,
			};

			const response = await fetch("/api/loan-authorization", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			if (result.success) {
				router.push("/dashboard/finance/loan-process");
			} else {
				setError(result.message || "Failed to update loan record.");
			}
		} catch (err) {
			console.error("Error updating loan record:", err);
			setError("Error updating loan record.");
		} finally {
			setSaving(false);
		}
	};

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName="Edit Loan Record" requiredPermission="access_loans" />;
	}

	// Show loading while checking access
	if (hasAccess === null || authLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Edit Loan Flags</h1>
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
						<h1 className="text-3xl font-bold text-gray-900">Edit Loan Flags</h1>
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
					<h1 className="text-3xl font-bold text-gray-900">Edit Bank Send &amp; Collateral</h1>
					<p className="text-gray-600 mt-2">
						<span className="font-semibold text-gray-900">
							{loan.Intervention_ID} ({loan.Family_ID}
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

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700 text-sm">{error}</p>
				</div>
			)}

			<form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-gray-500">Letter Reference</p>
						<p className="font-medium text-gray-900">{loan.Letter_Ref || "N/A"}</p>
					</div>
					<div>
						<p className="text-gray-500">Bank Name</p>
						<p className="font-medium text-gray-900">{loan.Bank_Name || "N/A"}</p>
					</div>
					<div>
						<p className="text-gray-500">Loan Status</p>
						<p className="font-medium text-gray-900">{loan.Loan_Status || "Pending"}</p>
					</div>
				</div>

				<div className="border-t border-gray-200 pt-4 space-y-4">
					<div className="flex items-center gap-3">
						<label className="text-sm font-medium text-gray-700">Bank Send</label>
						<input
							type="checkbox"
							checked={!!loan.bank_send}
							onChange={(e) => handleCheckboxChange("bank_send", e.target.checked)}
							className="h-4 w-4 text-[#0b4d2b] border-gray-300 rounded"
						/>
						{loan.bank_send && (
							<input
								type="date"
								value={loan.bank_send_date || ""}
								onChange={(e) => handleDateChange("bank_send_date", e.target.value)}
								className="ml-4 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						)}
					</div>

					<div className="flex items-center gap-3">
						<label className="text-sm font-medium text-gray-700">Collateral Mark</label>
						<input
							type="checkbox"
							checked={!!loan.collateral_mark}
							onChange={(e) => handleCheckboxChange("collateral_mark", e.target.checked)}
							className="h-4 w-4 text-[#0b4d2b] border-gray-300 rounded"
						/>
						{loan.collateral_mark && (
							<input
								type="date"
								value={loan.collateral_date || ""}
								onChange={(e) => handleDateChange("collateral_date", e.target.value)}
								className="ml-4 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							/>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onClick={() => router.push("/dashboard/finance/loan-process")}
						className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? (
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						) : (
							<Save className="h-4 w-4" />
						)}
						{saving ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</form>
		</div>
	);
}

export default function EditLoanFlagsPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Edit Loan Flags</h1>
						<p className="text-gray-600 mt-2">Loading...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<EditLoanFlagsContent />
		</Suspense>
	);
}

