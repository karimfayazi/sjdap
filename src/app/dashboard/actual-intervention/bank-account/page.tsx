"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, RefreshCw, Plus, X, Save, Upload, Image as ImageIcon } from "lucide-react";

type BankInformation = {
	BankNo: number | null;
	FormNumber: string | null;
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

const BANK_LIST = [
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

function BankAccountContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams?.get("formNumber") || "";
	const memberId = searchParams?.get("memberId") || "";

	const [banks, setBanks] = useState<BankInformation[]>([]);
	const [member, setMember] = useState<FamilyMember | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState(false);
	const [accountNoError, setAccountNoError] = useState<string | null>(null);
	const [chequeImage, setChequeImage] = useState<File | null>(null);
	const [chequeImagePreview, setChequeImagePreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [formData, setFormData] = useState({
		formNumber: formNumber,
		beneficiaryId: memberId || "",
		bankName: "",
		accountTitle: "",
		accountNo: "",
		cnic: "",
		bankCode: "",
		approvalStatus: "Pending",
		remarks: "",
	});

	const fetchBankAccount = async () => {
		if (!formNumber) {
			setError("Form Number is required");
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Fetch bank information from PE_BankInformation table
			const bankParams = new URLSearchParams();
			bankParams.append("formNumber", formNumber);
			if (memberId) {
				bankParams.append("beneficiaryId", memberId);
			}
			const bankResponse = await fetch(`/api/actual-intervention/pe-bank-information?${bankParams.toString()}`);
			const bankData = await bankResponse.json();

			if (bankData.success) {
				setBanks(bankData.banks || []);
			} else {
				setError(bankData.message || "Failed to fetch bank information");
			}

			// Fetch member information if memberId is provided
			if (memberId && formNumber) {
				const memberResponse = await fetch(`/api/actual-intervention/members?formNumber=${encodeURIComponent(formNumber)}`);
				const memberData = await memberResponse.json();

				if (memberData.success && memberData.members) {
					const foundMember = memberData.members.find((m: FamilyMember) => m.MemberNo === memberId);
					if (foundMember) {
						setMember(foundMember);
					}
				}
			}
		} catch (err: any) {
			console.error("Error fetching bank account information:", err);
			setError(err.message || "Error fetching bank account information");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBankAccount();
	}, [formNumber, memberId]);

	// Auto-populate form data when member is loaded
	useEffect(() => {
		if (member) {
			setFormData(prev => ({
				...prev,
				cnic: member.BFormOrCNIC || "",
				accountTitle: member.FullName || "",
			}));
		}
	}, [member]);

	// Update form data when formNumber or memberId changes
	useEffect(() => {
		setFormData(prev => ({
			...prev,
			formNumber: formNumber,
			beneficiaryId: memberId || "",
		}));
	}, [formNumber, memberId]);

	const handleInputChange = (field: string, value: string) => {
		// Remove spaces for IBAN validation
		const cleanedValue = field === "accountNo" ? value.replace(/\s/g, "") : value;
		
		setFormData(prev => {
			const updated = {
				...prev,
				[field]: cleanedValue,
			};
			
			// Auto-populate Bank Code when Bank Name is selected
			if (field === "bankName" && cleanedValue) {
				const selectedBank = BANK_LIST.find(bank => bank.name === cleanedValue);
				if (selectedBank) {
					updated.bankCode = selectedBank.code;
				}
			}
			
			// Validate IBAN length (24 characters)
			if (field === "accountNo") {
				if (cleanedValue && cleanedValue.length !== 24) {
					setAccountNoError("IBAN number must be exactly 24 characters");
				} else {
					setAccountNoError(null);
				}
			}
			
			return updated;
		});
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type (images only)
			if (!file.type.startsWith("image/")) {
				setError("Please upload an image file");
				return;
			}
			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				setError("Image size must be less than 5MB");
				return;
			}
			setChequeImage(file);
			// Create preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setChequeImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!formData.formNumber || !formData.bankName || !formData.accountTitle || !formData.accountNo) {
			setError("Form Number, Bank Name, Account Title, and Account Number are required");
			return;
		}

		// Validate IBAN length
		const cleanedAccountNo = formData.accountNo.replace(/\s/g, "");
		if (cleanedAccountNo.length !== 24) {
			setError("IBAN number must be exactly 24 characters");
			setAccountNoError("IBAN number must be exactly 24 characters");
			return;
		}

		// Validate cheque image is required
		if (!chequeImage) {
			setError("Bank Cheque Image is required");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setAccountNoError(null);
			setSuccess(false);

			// Create FormData for file upload
			const submitFormData = new FormData();
			submitFormData.append("formNumber", formData.formNumber);
			submitFormData.append("beneficiaryId", formData.beneficiaryId || "");
			submitFormData.append("bankName", formData.bankName);
			submitFormData.append("accountTitle", formData.accountTitle);
			submitFormData.append("accountNo", cleanedAccountNo);
			submitFormData.append("cnic", formData.cnic || "");
			submitFormData.append("bankCode", formData.bankCode || "");
			submitFormData.append("approvalStatus", "Pending");
			submitFormData.append("remarks", formData.remarks || "");
			// Cheque image is required, so it should always be present at this point
			submitFormData.append("chequeImage", chequeImage);

			const response = await fetch("/api/actual-intervention/pe-bank-information", {
				method: "POST",
				body: submitFormData,
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setFormData({
					formNumber: formNumber,
					beneficiaryId: memberId || "",
					bankName: "",
					accountTitle: member?.FullName || "",
					accountNo: "",
					cnic: member?.BFormOrCNIC || "",
					bankCode: "",
					approvalStatus: "Pending",
					remarks: "",
				});
				setChequeImage(null);
				setChequeImagePreview(null);
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
				// Refresh the bank account list
				setTimeout(() => {
					fetchBankAccount();
					setSuccess(false);
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

	const formatDateOfBirth = (month: number | null, year: number | null): string => {
		if (!month || !year) return "N/A";
		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		return `${monthNames[month - 1] || month} ${year}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<p className="mt-4 text-gray-600">Loading bank account information...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push("/dashboard/actual-intervention")}
						className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
							<CreditCard className="h-8 w-8" />
							Bank Account Information
						</h1>
						<p className="text-gray-600 mt-2">
							Form Number: {formNumber || "N/A"}
							{member && ` - Member: ${member.MemberNo} (${member.FullName})`}
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={fetchBankAccount}
					className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

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

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-600 text-sm font-medium">Bank account information saved successfully!</p>
				</div>
			)}

			{/* Member Information Card */}
			{member && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Member Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Member No</p>
							<p className="font-medium text-gray-900">{member.MemberNo || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Full Name</p>
							<p className="font-medium text-gray-900">{member.FullName || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">B-Form/CNIC</p>
							<p className="font-medium text-gray-900">{member.BFormOrCNIC || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Relationship</p>
							<p className="font-medium text-gray-900">{member.Relationship || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Gender</p>
							<p className="font-medium text-gray-900">{member.Gender || "N/A"}</p>
						</div>
						<div>
							<p className="text-gray-500">Date of Birth</p>
							<p className="font-medium text-gray-900">{formatDateOfBirth(member.DOBMonth, member.DOBYear)}</p>
						</div>
					</div>
				</div>
			)}

			{/* Add Bank Account Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">Add Bank Account Information</h2>
					<form onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Form Number <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.formNumber}
									onChange={(e) => handleInputChange("formNumber", e.target.value)}
									required
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Beneficiary ID
								</label>
								<input
									type="text"
									value={formData.beneficiaryId}
									onChange={(e) => handleInputChange("beneficiaryId", e.target.value)}
									readOnly={!!memberId}
									className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										memberId ? "bg-gray-50" : ""
									}`}
									placeholder="Leave empty for family-level account"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bank Name <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.bankName}
									onChange={(e) => handleInputChange("bankName", e.target.value)}
									required
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Bank Name</option>
									{BANK_LIST.map((bank) => (
										<option key={bank.code} value={bank.name}>
											{bank.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Account Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.accountTitle}
									readOnly
									required
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none cursor-not-allowed"
									placeholder="Auto-filled from member name"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Account Number (IBAN) <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.accountNo}
									onChange={(e) => handleInputChange("accountNo", e.target.value)}
									required
									maxLength={24}
									className={`w-full rounded-md border px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-opacity-20 focus:outline-none ${
										accountNoError
											? "border-red-300 focus:border-red-500 focus:ring-red-500"
											: "border-gray-300 focus:border-[#0b4d2b] focus:ring-[#0b4d2b]"
									}`}
									placeholder="Enter IBAN number (24 characters)"
								/>
								{accountNoError && (
									<p className="mt-1 text-xs text-red-600">{accountNoError}</p>
								)}
								{formData.accountNo && !accountNoError && (
									<p className="mt-1 text-xs text-gray-500">
										{formData.accountNo.replace(/\s/g, "").length}/24 characters
									</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									CNIC
								</label>
								<input
									type="text"
									value={formData.cnic}
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none cursor-not-allowed"
									placeholder="Auto-filled from member data"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bank Code
								</label>
								<input
									type="text"
									value={formData.bankCode}
									onChange={(e) => handleInputChange("bankCode", e.target.value)}
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none cursor-not-allowed"
									placeholder="Auto-filled from bank name"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Approval Status
								</label>
								<input
									type="text"
									value="Pending"
									readOnly
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none cursor-not-allowed"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Remarks
								</label>
								<textarea
									value={formData.remarks}
									onChange={(e) => handleInputChange("remarks", e.target.value)}
									rows={3}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder="Enter any remarks or notes"
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bank Cheque Image <span className="text-red-500">*</span>
								</label>
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
											<Upload className="h-4 w-4" />
											{chequeImage ? "Change Image" : "Upload Image"}
											<input
												ref={fileInputRef}
												type="file"
												accept="image/*"
												onChange={handleFileChange}
												className="hidden"
											/>
										</label>
										{chequeImage && (
											<button
												type="button"
												onClick={() => {
													setChequeImage(null);
													setChequeImagePreview(null);
												}}
												className="text-sm text-red-600 hover:text-red-700"
											>
												Remove
											</button>
										)}
									</div>
									{chequeImagePreview && (
										<div className="mt-2">
											<img
												src={chequeImagePreview}
												alt="Cheque preview"
												className="max-w-xs h-auto border border-gray-300 rounded-md"
											/>
											<p className="text-xs text-gray-500 mt-1">{chequeImage?.name}</p>
										</div>
									)}
									<p className="text-xs text-gray-500">Upload bank cheque image (Max 5MB, Images only)</p>
								</div>
							</div>
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									setError(null);
									setAccountNoError(null);
									setSuccess(false);
									setFormData({
										formNumber: formNumber,
										beneficiaryId: memberId || "",
										bankName: "",
										accountTitle: member?.FullName || "",
										accountNo: "",
										cnic: member?.BFormOrCNIC || "",
										bankCode: "",
										approvalStatus: "Pending",
										remarks: "",
									});
									setChequeImage(null);
									setChequeImagePreview(null);
									if (fileInputRef.current) {
										fileInputRef.current.value = "";
									}
								}}
								className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
							>
								Reset Form
							</button>
							<button
								type="submit"
								disabled={saving}
								className="inline-flex items-center gap-2 rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22] disabled:opacity-50"
							>
								<Save className="h-4 w-4" />
								{saving ? "Saving..." : "Save"}
							</button>
						</div>
					</form>
				</div>

			{/* Bank Account Information Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
					<h2 className="text-lg font-semibold text-gray-900">Bank Account Details</h2>
				</div>
				<div className="overflow-x-auto">
					{banks.length === 0 ? (
						<div className="px-6 py-12 text-center">
							<CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500 text-sm">No bank account information found for this form number{memberId ? ` and beneficiary` : ""}.</p>
						</div>
					) : (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Bank No
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Form Number
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Beneficiary ID
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Bank Name
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Account Title
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Account Number
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										CNIC
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Bank Code
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Submitted At
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Submitted By
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Approval Status
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Remarks
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Cheque Image
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{banks.map((bank, index) => (
									<tr key={bank.BankNo || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.BankNo || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.FormNumber || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.BeneficiaryID || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.BankName || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.AccountTitle || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
											{bank.AccountNo || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
											{bank.CNIC || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.BankCode || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.SubmittedAt ? new Date(bank.SubmittedAt).toLocaleString() : "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{bank.SubmittedBy || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											{bank.ApprovalStatus ? (
												<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
													bank.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
													bank.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
													"bg-yellow-100 text-yellow-800"
												}`}>
													{bank.ApprovalStatus}
												</span>
											) : (
												"N/A"
											)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
											{bank.Remarks ? (
												<span className="truncate block" title={bank.Remarks}>
													{bank.Remarks}
												</span>
											) : (
												"N/A"
											)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											{bank.BankChequeImagePath ? (
												<a
													href={bank.BankChequeImagePath}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
												>
													<ImageIcon className="h-4 w-4" />
													View Image
												</a>
											) : (
												"N/A"
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
}

export default function BankAccountPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				</div>
			}
		>
			<BankAccountContent />
		</Suspense>
	);
}
