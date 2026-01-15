"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import NoPermissionMessage from "@/components/NoPermissionMessage";

type BankFormData = {
	familyId: string;
	bankName: string;
	accountHolderName: string;
	accountNumber: string;
	cnic: string;
	branchCode: string;
	remarks: string;
	cnicExpiryDate: string;
};

export default function AddBankInformationPage() {
	const router = useRouter();
	const { userProfile, loading: authLoading } = useAuth();
	const [isSuperUserState, setIsSuperUserState] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Check if user is Super User
	useEffect(() => {
		if (authLoading) return;
		
		if (userProfile) {
			const superUserValue = userProfile.supper_user;
			setIsSuperUserState(isSuperUser(superUserValue));
		} else {
			try {
				const stored = localStorage.getItem("userData");
				if (stored) {
					const parsed = JSON.parse(stored);
					const su = parsed.super_user || parsed.supper_user;
					setIsSuperUserState(isSuperUser(su));
				} else {
					setIsSuperUserState(false);
				}
			} catch {
				setIsSuperUserState(false);
			}
		}
	}, [userProfile, authLoading]);

	const [formData, setFormData] = useState<BankFormData>({
		familyId: "",
		bankName: "",
		accountHolderName: "",
		accountNumber: "",
		cnic: "",
		branchCode: "",
		remarks: "",
		cnicExpiryDate: "",
	});

	const handleChange = (field: keyof BankFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await fetch("/api/bank-information", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/finance/bank-information/view");
				}, 1500);
			} else {
				setError(data.message || "Failed to save bank information");
			}
		} catch (err: any) {
			console.error("Error saving bank information:", err);
			setError(err.message || "Error saving bank information");
		} finally {
			setSaving(false);
		}
	};

	// Check Super User status - only Super Users can access this page
	if (isSuperUserState === null || authLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (!isSuperUserState) {
		return <NoPermissionMessage />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add Bank Details</h1>
					<p className="text-gray-600 mt-2">Add new bank information for a family</p>
				</div>
				<button
					onClick={() => router.back()}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back
				</button>
			</div>

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">Bank details saved successfully! Redirecting...</p>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<div className="flex-shrink-0 mt-0.5">
						<svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div className="flex-1">
						<h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
						<p className="text-sm text-red-700">{error}</p>
					</div>
					<button
						onClick={() => setError(null)}
						className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
						aria-label="Close error message"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Family ID */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Family ID <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.familyId}
							onChange={(e) => handleChange("familyId", e.target.value)}
							required
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter Family ID"
						/>
					</div>

					{/* Bank Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Bank Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.bankName}
							onChange={(e) => handleChange("bankName", e.target.value)}
							required
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter Bank Name"
						/>
					</div>

					{/* Account Holder Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Account Holder Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.accountHolderName}
							onChange={(e) => handleChange("accountHolderName", e.target.value)}
							required
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter Account Holder Name"
						/>
					</div>

					{/* Account Number */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Account Number <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.accountNumber}
							onChange={(e) => handleChange("accountNumber", e.target.value)}
							required
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter Account Number"
						/>
					</div>

					{/* CNIC */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">CNIC</label>
						<input
							type="text"
							value={formData.cnic}
							onChange={(e) => handleChange("cnic", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter CNIC"
						/>
					</div>

					{/* Branch Code */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Branch Code</label>
						<input
							type="text"
							value={formData.branchCode}
							onChange={(e) => handleChange("branchCode", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Enter Branch Code"
						/>
					</div>

					{/* CNIC Expiry Date */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">CNIC Expiry Date</label>
						<input
							type="date"
							value={formData.cnicExpiryDate}
							onChange={(e) => handleChange("cnicExpiryDate", e.target.value)}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
				</div>

				{/* Remarks */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
					<textarea
						value={formData.remarks}
						onChange={(e) => handleChange("remarks", e.target.value)}
						rows={4}
						className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						placeholder="Enter any remarks"
					/>
				</div>

				{/* Submit Button */}
				<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save className="h-4 w-4" />
						{saving ? "Saving..." : "Save Bank Details"}
					</button>
				</div>
			</form>
		</div>
	);
}
