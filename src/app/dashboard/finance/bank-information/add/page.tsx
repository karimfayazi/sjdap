"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Building2, Eye, EyeOff } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";

type BankData = {
	familyId: string;
	accountHolderName: string;
	bankName: string;
	accountNumber: string;
	branchCode: string;
	remarks: string;
	cnic: string;
	cnicExpiryDate: string;
};

type FamilyInfo = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	AGE?: number | null; // Not selected currently but kept for possible future use
	CNIC: string | null;
	CONTACT: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
};

// Bank list with codes and names
const BANKS = [
	{ code: "054", name: "Habib Bank Ltd/Konnect" },
	{ code: "095", name: "Advans Microfinance Bank Ltd" },
	{ code: "031", name: "Al Baraka Islamic Bank Limited" },
	{ code: "014", name: "Allied Bank Limited" },
	{ code: "011", name: "Apna Microfinance Bank" },
	{ code: "017", name: "Askari Bank Limited" },
	{ code: "053", name: "Bank Alfalah Limited" },
	{ code: "023", name: "Bank Al Habib Limited" },
	{ code: "021", name: "Bank Islami Pakistan Limited" },
	{ code: "061", name: "Bank Of Khyber" },
	{ code: "083", name: "Bank Of Punjab" },
	{ code: "013", name: "Dubai Islamic Bank Limited" },
	{ code: "060", name: "Faysal Bank Limited" },
	{ code: "091", name: "Finca Microfinance Bank" },
	{ code: "106", name: "Finja Emi Bank" },
	{ code: "092", name: "First Women Bank Limited" },
	{ code: "064", name: "Habib Metropolitan Bank Ltd" },
	{ code: "101", name: "HBL Microfinance Bank/FirstPay" },
	{ code: "094", name: "ICBC" },
	{ code: "018", name: "JS Bank Limited" },
	{ code: "102", name: "Khushhali Microfinance Bank Ltd" },
	{ code: "062", name: "MCB Bank Limited" },
	{ code: "097", name: "MCB Islamic Banking" },
	{ code: "089", name: "Meezan Bank Ltd" },
	{ code: "093", name: "Mobilink Microfinance Bank Ltd/Jazz Cash" },
	{ code: "070", name: "National Bank Pakistan" },
	{ code: "104", name: "NayaPay" },
	{ code: "096", name: "NRSP Microfinance Bank Ltd" },
	{ code: "0091", name: "PayMax" },
	{ code: "107", name: "SadaPay" },
	{ code: "028", name: "Samba Bank" },
	{ code: "066", name: "Silk Bank Limited" },
	{ code: "043", name: "Sindh Bank Limited" },
	{ code: "085", name: "Soneri Bank Limited" },
	{ code: "038", name: "Standard Chartered Bank" },
	{ code: "081", name: "Summit Bank" },
	{ code: "105", name: "TAG" },
	{ code: "019", name: "Easypaisa / Telenor Microfinance Bank" },
	{ code: "090", name: "UBank / UPaisa" },
	{ code: "086", name: "United Bank Limited" },
	{ code: "0092", name: "Zarai Taraqiati Bank Limited" },
];

export default function AddBankDetailsPage() {
	const router = useRouter();
	const [formData, setFormData] = useState<BankData>({
		familyId: "",
		accountHolderName: "",
		bankName: "",
		accountNumber: "",
		branchCode: "",
		remarks: "",
		cnic: "",
		cnicExpiryDate: "",
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [checkingPermission, setCheckingPermission] = useState(true);
	const [hasBankAccountPermission, setHasBankAccountPermission] = useState(false);
	const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
	const [familySearchLoading, setFamilySearchLoading] = useState(false);
	const [familySearchError, setFamilySearchError] = useState<string | null>(null);
	const [showFamilyInfo, setShowFamilyInfo] = useState(true);
	const [showConfirmSave, setShowConfirmSave] = useState(false);

	// Check user's bank_account permission
	useEffect(() => {
		const checkBankAccountPermission = async () => {
			try {
				const response = await fetch('/api/user/profile');
				const data = await response.json();
				
				if (data.success && data.user) {
					// Check if bank_account is "Yes" (case-insensitive)
					const bankAccount = data.user.bank_account;
					const hasPermission = 
						bankAccount === "Yes" || 
						bankAccount === "yes" || 
						bankAccount === 1 || 
						bankAccount === "1";
					
					setHasBankAccountPermission(hasPermission);
				} else {
					setHasBankAccountPermission(false);
				}
			} catch (err) {
				console.error("Error checking bank account permission:", err);
				setHasBankAccountPermission(false);
			} finally {
				setCheckingPermission(false);
			}
		};

		checkBankAccountPermission();
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		
		// If bank name is selected, automatically set the bank code
		if (name === "bankName") {
			const selectedBank = BANKS.find(bank => bank.name === value);
			setFormData(prev => ({
				...prev,
				[name]: value,
				branchCode: selectedBank ? selectedBank.code : ""
			}));
		} else {
			setFormData(prev => ({
				...prev,
				[name]: value
			}));
		}
		setError(null);
	};

	const handleSearchFamily = async () => {
		const familyId = formData.familyId.trim();

		if (!familyId) {
			setFamilySearchError("Please enter Family ID before searching.");
			setFamilyInfo(null);
			return;
		}

		setFamilySearchLoading(true);
		setFamilySearchError(null);
		setFamilyInfo(null);

		try {
			// Use dedicated API which enforces same program & area for logged-in user
			const response = await fetch(`/api/family-bank-search?familyId=${encodeURIComponent(familyId)}`);
			const data = await response.json();

			if (!data.success) {
				setFamilySearchError(data.message || "Failed to fetch family information.");
				return;
			}

			const families = data.families || [];

			if (!families.length) {
				setFamilySearchError("Family not found for the provided Family ID.");
				return;
			}

			const family: FamilyInfo = families[0];
			setFamilyInfo(family);
			setShowFamilyInfo(true);

			// Auto-fill account holder name from Head Name if not already entered
			setFormData((prev) => ({
				...prev,
				accountHolderName: prev.accountHolderName || family.HEAD_NAME || "",
			}));
		} catch (err) {
			console.error("Error searching family:", err);
			setFamilySearchError("An error occurred while fetching family information.");
		} finally {
			setFamilySearchLoading(false);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);
		setShowConfirmSave(true);
	};

	const handleConfirmSave = async () => {
		setError(null);
		setSuccess(false);

		// Validate account number length before save
		if (formData.accountNumber.length !== 24) {
			setError("Account Number must be exactly 24 characters (IBAN format)");
			setShowConfirmSave(false);
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/api/bank-information', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				// Reset form
				setFormData({
					familyId: "",
					accountHolderName: "",
					bankName: "",
					accountNumber: "",
					branchCode: "",
					remarks: "",
					cnic: "",
					cnicExpiryDate: "",
				});
				// Redirect to view page after a short delay
				setTimeout(() => {
					router.push('/dashboard/finance/bank-information/view');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save bank details');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred while saving bank details");
		} finally {
			setLoading(false);
			setShowConfirmSave(false);
		}
	};

	// Show loading state while checking permission
	if (checkingPermission) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Add Bank Details</h1>
						<p className="text-gray-600 mt-2">Checking permissions...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have bank_account permission
	if (!hasBankAccountPermission) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Add Bank Details</h1>
						<p className="text-gray-600 mt-2">Add new bank account information for families</p>
					</div>
					<Link
						href="/dashboard/finance/bank-information/view"
						className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to View
					</Link>
				</div>
				<AccessDenied action="add bank information" requiredLevel="Bank Account Access" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add Bank Details</h1>
					<p className="text-gray-600 mt-2">Add new bank account information for families</p>
				</div>
				<Link
					href="/dashboard/bank-information/view"
					className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to View
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-600 text-sm">Bank details saved successfully! Redirecting to view page...</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="p-6 space-y-6">
					{/* Bank Information Section */}
					<div>
						<h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
							<Building2 className="h-5 w-5 text-[#0b4d2b]" />
							Bank Information
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Family ID + Search (always visible) */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Family ID <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										name="familyId"
										value={formData.familyId}
										onChange={(e) => {
											handleInputChange(e);
											setFamilyInfo(null);
											setFamilySearchError(null);
										}}
										required
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										placeholder="Enter Family ID"
									/>
									<button
										type="button"
										onClick={handleSearchFamily}
										disabled={familySearchLoading || !formData.familyId}
										className="px-4 py-2 text-sm font-medium bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{familySearchLoading ? "Searching..." : "Search"}
									</button>
								</div>
								{familySearchError && (
									<p className="mt-1 text-xs text-red-600">{familySearchError}</p>
								)}
							</div>
						</div>
					</div>

					{/* Family Information (from View_FEAP_SEDP), Bank Details & Remarks: only after search */}
					{familyInfo && (
						<>
							<div>
								<div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
									<h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
										Family Information
									</h2>
									<button
										type="button"
										onClick={() => setShowFamilyInfo((prev) => !prev)}
										className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
									>
										{showFamilyInfo ? (
											<>
												<EyeOff className="h-4 w-4" />
												<span>Hide</span>
											</>
										) : (
											<>
												<Eye className="h-4 w-4" />
												<span>Show</span>
											</>
										)}
									</button>
								</div>
								{showFamilyInfo && (
									<div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
										<div>
											<p className="font-medium text-gray-700">Program</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.PROGRAM || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Area</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.AREA || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Regional Council</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.REGIONAL_COUNCIL || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Local Council</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.LOCAL_COUNCIL || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Jamat Khana</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.JAMAT_KHANA || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Head Name</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.HEAD_NAME || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">CNIC</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.CNIC || "N/A"}
											</p>
										</div>
										<div>
											<p className="font-medium text-gray-700">Contact</p>
											<p className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
												{familyInfo.CONTACT || "N/A"}
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Bank details fields - shown after family information */}
							<div className="mt-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-3">
									Bank Details
								</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Account Holder Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="accountHolderName"
											value={formData.accountHolderName}
											onChange={handleInputChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter Account Holder Name"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Bank Name <span className="text-red-500">*</span>
										</label>
										<select
											name="bankName"
											value={formData.bankName}
											onChange={handleInputChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">Select Bank Name</option>
											{BANKS.map((bank) => (
												<option key={bank.code} value={bank.name}>
													{bank.name}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Account Number (IBAN) <span className="text-red-500">*</span>
											<span className="text-xs text-gray-500 ml-2">(24 characters)</span>
										</label>
										<input
											type="text"
											name="accountNumber"
											value={formData.accountNumber}
											onChange={handleInputChange}
											required
											maxLength={24}
											minLength={24}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none font-mono"
											placeholder="Enter 24-character IBAN number"
										/>
										{formData.accountNumber && formData.accountNumber.length !== 24 && (
											<p className="mt-1 text-xs text-red-600">
												Account Number must be exactly 24 characters. Current: {formData.accountNumber.length}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Bank Code
										</label>
										<input
											type="text"
											name="branchCode"
											value={formData.branchCode}
											onChange={handleInputChange}
											readOnly
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none cursor-not-allowed"
											placeholder="Bank code will appear here"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											CNIC
										</label>
										<input
											type="text"
											name="cnic"
											value={formData.cnic}
											onChange={handleInputChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter CNIC (e.g., 12345-1234567-1)"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											CNIC Expiry Date
										</label>
										<input
											type="date"
											name="cnicExpiryDate"
											value={formData.cnicExpiryDate}
											onChange={handleInputChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
									</div>
								</div>
							</div>

							<div className="mt-6">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Remarks
								</label>
								<textarea
									name="remarks"
									value={formData.remarks}
									onChange={handleInputChange}
									rows={3}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder="Enter any additional remarks or notes"
								/>
							</div>
						</>
					)}
				</div>

				{/* Footer buttons (Cancel / Save): only after search */}
				{familyInfo && (
					<div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
						<Link
							href="/dashboard/finance/bank-information/view"
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
						>
							Cancel
						</Link>
						<button
							type="submit"
							disabled={loading}
							className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save className="h-4 w-4" />
							{loading ? "Saving..." : "Save Bank Details"}
						</button>
					</div>
				)}
			</form>

			{/* Nice confirmation modal for save */}
			{showConfirmSave && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
					<div className="bg-white rounded-lg shadow-lg max-w-md w-full">
						<div className="px-6 py-4 border-b border-gray-200">
							<h2 className="text-lg font-semibold text-gray-900">Confirm Save</h2>
						</div>
						<div className="px-6 py-4 space-y-2 text-sm text-gray-700">
							<p>Do you want to save these bank details?</p>
							<p className="text-xs text-gray-500">
								Before saving the data please cross check. Edit options are not allowed after save.
							</p>
						</div>
						<div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setShowConfirmSave(false)}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
								disabled={loading}
							>
								No, Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmSave}
								disabled={loading}
								className="px-4 py-2 text-sm font-medium bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Saving..." : "Yes, Save"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

