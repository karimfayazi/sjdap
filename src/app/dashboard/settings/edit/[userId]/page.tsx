"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { isSuperUser as checkIsSuperUser } from "@/lib/auth-utils";
import { useAuth } from "@/hooks/useAuth";

type UserData = {
	USER_ID: string;
	USER_FULL_NAME: string | null;
	PASSWORD: string | null;
	RE_PASSWORD: string | null;
	USER_TYPE: string | null;
	DESIGNATION: string | null;
	ACTIVE: boolean | number | null;
	CAN_ADD: boolean | number | null;
	CAN_UPDATE: boolean | number | null;
	CAN_DELETE: boolean | number | null;
	CAN_UPLOAD: boolean | number | null;
	SEE_REPORTS: boolean | number | null;
	UPDATE_DATE: string | null;
	PROGRAM: string | null;
	REGION: string | null;
	AREA: string | null;
	SECTION: string | null;
	FDP: string | null;
	PLAN_INTERVENTION: string | null;
	TRACKING_SYSTEM: string | null;
	RC: string | null;
	LC: string | null;
	REPORT_TO: string | null;
	ROP_EDIT: boolean | number | null;
	access_loans: boolean | number | string | null;
	baseline_access: boolean | number | null;
	bank_account: boolean | number | string | null;
	Supper_User: boolean | number | string | null;
	Finance_Officer: string | null;
	BaselineQOL: boolean | number | null;
	Dashboard: boolean | number | null;
	PowerBI: boolean | number | null;
	Family_Development_Plan: boolean | number | null;
	Family_Approval_CRC: boolean | number | null;
	Family_Income: boolean | number | null;
	ROP: boolean | number | null;
	Setting: boolean | number | null;
	Other: boolean | number | null;
	SWB_Families: boolean | number | null;
	EDO: string | null;
	JPO: string | null;
	AM_REGION: string | null;
	ActualIntervention: boolean | number | null;
	FinanceSection: boolean | number | null;
	FeasibilityApproval: boolean | number | null;
	InterventionApproval: boolean | number | null;
	BankAccountApproval: boolean | number | null;
};

export default function EditUserPage() {
	const router = useRouter();
	const params = useParams();
	const userId = decodeURIComponent(params.userId as string);

	const [formData, setFormData] = useState<UserData | null>(null);
	const [originalUser, setOriginalUser] = useState<any>(null); // Store original user data for email_address
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Check Admin access - user must be Admin (UserType='Admin') or super user
	const { userProfile, loading: authLoading } = useAuth();
	const [isSuperUser, setIsSuperUser] = useState(false);
	const [checkingAccess, setCheckingAccess] = useState(true);

	useEffect(() => {
		if (authLoading) return;
		
		if (userProfile) {
			// Check if user is Admin - either through supper_user or access_level (UserType)
			const superUserValue = userProfile.supper_user;
			const accessLevel = userProfile.access_level; // This contains UserType from PE_User
			const isAdminByType = accessLevel && typeof accessLevel === 'string' && accessLevel.trim().toLowerCase() === 'admin';
			const isSuperUserByValue = checkIsSuperUser(superUserValue);
			
			// User is Admin if UserType='Admin' OR supper_user='Yes'
			const hasAccess = isAdminByType || isSuperUserByValue;
			
			console.log("=== EDIT USER PAGE ACCESS CHECK ===", {
				accessLevel,
				superUserValue,
				isAdminByType,
				isSuperUserByValue,
				hasAccess
			});
			
			setIsSuperUser(hasAccess);
			setCheckingAccess(false);

			if (!hasAccess) {
				setLoading(false);
			}
		} else {
			// Fallback to localStorage
			try {
				const stored = localStorage.getItem("userData");
				if (stored) {
					const parsed = JSON.parse(stored);
					const su = parsed.super_user || parsed.supper_user;
					const accessLevel = parsed.access_level || parsed.user_type;
					const isAdminByType = accessLevel && typeof accessLevel === 'string' && accessLevel.trim().toLowerCase() === 'admin';
					const isSuperUserByValue = checkIsSuperUser(su);
					
					// User is Admin if UserType='Admin' OR supper_user='Yes'
					const hasAccess = isAdminByType || isSuperUserByValue;
					
					setIsSuperUser(hasAccess);
					setCheckingAccess(false);

					if (!hasAccess) {
						setLoading(false);
					}
				} else {
					setIsSuperUser(false);
					setCheckingAccess(false);
					setLoading(false);
				}
			} catch {
				setIsSuperUser(false);
				setCheckingAccess(false);
				setLoading(false);
			}
		}
	}, [userProfile, authLoading]);

	useEffect(() => {
		if (!isSuperUser || !userId) return;

		const fetchUserData = async () => {
			try {
				setLoading(true);
				setError(null);

				console.log("Fetching user data for userId:", userId);

				const response = await fetch("/api/users");
				if (!response.ok) {
					throw new Error("Failed to fetch users");
				}

				const result = await response.json();
				console.log("API Response:", result);
				
				if (result.success && result.users) {
					console.log("Total users fetched:", result.users.length);
					console.log("Looking for userId:", userId);
					
					// API returns users with fields: UserId, email_address, UserFullName, etc.
					// Check both UserId and email_address (case-insensitive)
					const user = result.users.find((u: any) => {
						const uId = (u.UserId || "").toString().toLowerCase();
						const uEmail = (u.email_address || "").toString().toLowerCase();
						const searchId = userId.toString().toLowerCase();
						return uId === searchId || uEmail === searchId;
					});
					
					console.log("Found user:", user ? "Yes" : "No");
					
					if (user) {
						console.log("Setting form data for user:", user.UserFullName);
						// Store original user data for email_address
						setOriginalUser(user);
						// Map API response fields to form data structure
						// API returns: UserId, UserFullName, UserType, etc.
						// Form expects: USER_ID, USER_FULL_NAME, USER_TYPE, etc.
						// Helper function to normalize boolean/number values
						const normalizeBool = (val: any): boolean | null => {
							if (val === null || val === undefined) return null;
							return val === 1 || val === true || val === "1" || val === "Yes" || val === "yes";
						};

						const mappedUser: UserData = {
							USER_ID: user.UserId || user.email_address || "",
							USER_FULL_NAME: user.UserFullName || null,
							PASSWORD: user.Password || null,
							RE_PASSWORD: user.Password || null,
							USER_TYPE: user.UserType || null,
							DESIGNATION: user.Designation || null,
							ACTIVE: normalizeBool(user.Active),
							CAN_ADD: null,
							CAN_UPDATE: null,
							CAN_DELETE: null,
							CAN_UPLOAD: null,
							SEE_REPORTS: null,
							UPDATE_DATE: user.user_update_date || null,
							PROGRAM: null,
							REGION: null,
							AREA: null,
							SECTION: null,
							FDP: null,
							PLAN_INTERVENTION: null,
							TRACKING_SYSTEM: null,
							RC: user.Regional_Council || null,
							LC: user.Local_Council || null,
							REPORT_TO: null,
							ROP_EDIT: null,
							access_loans: null,
							baseline_access: null,
							bank_account: normalizeBool(user.BankInformation),
							Supper_User: null,
							Finance_Officer: null,
							BaselineQOL: normalizeBool(user.BaselineApproval),
							Dashboard: null,
							PowerBI: null,
							Family_Development_Plan: normalizeBool(user.FdpApproval),
							Family_Approval_CRC: null,
							Family_Income: null,
							ROP: null,
							Setting: normalizeBool(user.Setting),
							Other: null,
							SWB_Families: normalizeBool(user.SwbFamilies),
							EDO: null,
							JPO: null,
							AM_REGION: null,
							// Add missing fields from database
							ActualIntervention: normalizeBool(user.ActualIntervention),
							FinanceSection: normalizeBool(user.FinanceSection),
							FeasibilityApproval: normalizeBool(user.FeasibilityApproval),
							InterventionApproval: normalizeBool(user.InterventionApproval),
							BankAccountApproval: normalizeBool(user.BankAccountApproval),
						};
						setFormData(mappedUser);
					} else {
						const availableIds = result.users.slice(0, 5).map((u: any) => u.UserId || u.email_address);
						console.log("First 5 available UserIds:", availableIds);
						setError(`User not found: ${userId}`);
					}
				} else {
					setError("No users data returned from API");
				}
			} catch (err) {
				console.error("Error fetching user data:", err);
				setError(err instanceof Error ? err.message : "Failed to load user data");
			} finally {
				setLoading(false);
			}
		};

		fetchUserData();
	}, [userId, isSuperUser]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		if (!formData) return;
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;

		setFormData(prev => prev ? ({
			...prev,
			[name]: type === "checkbox" ? checked : value
		}) : null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			// Helper function to convert boolean/number to 0 or 1
			const toBoolValue = (val: any): number => {
				if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return 1;
				if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return 0;
				return 0;
			};

			// Map form data (USER_ID, USER_FULL_NAME, etc.) to API format (UserId, UserFullName, etc.)
			const apiData: any = {
				UserId: formData.USER_ID,
				email_address: originalUser?.email_address || formData.USER_ID, // Use original email_address if available
				UserFullName: formData.USER_FULL_NAME,
				UserType: formData.USER_TYPE,
				Designation: formData.DESIGNATION,
				Active: toBoolValue(formData.ACTIVE),
				Regional_Council: formData.RC,
				Local_Council: formData.LC,
				Setting: toBoolValue(formData.Setting),
				SwbFamilies: toBoolValue(formData.SWB_Families),
				ActualIntervention: toBoolValue(formData.ActualIntervention),
				FinanceSection: toBoolValue(formData.FinanceSection),
				BankInformation: toBoolValue(formData.bank_account),
				BaselineApproval: toBoolValue(formData.BaselineQOL),
				FeasibilityApproval: toBoolValue(formData.FeasibilityApproval),
				FdpApproval: toBoolValue(formData.Family_Development_Plan),
				InterventionApproval: toBoolValue(formData.InterventionApproval),
				BankAccountApproval: toBoolValue(formData.BankAccountApproval),
			};

			const response = await fetch("/api/users", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(apiData),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to update user");
			}

			setSuccess(true);
			setTimeout(() => {
				router.push("/dashboard/settings?tab=users");
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update user");
		} finally {
			setSaving(false);
		}
	};

	if (checkingAccess) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!isSuperUser) {
		return (
			<div className="p-6">
				<div className="max-w-2xl mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
						<div className="text-red-600 text-lg font-semibold mb-2">Access Denied</div>
						<p className="text-red-700 mb-4">
							You do not have permission to access this section. Only Super Users (Admins) can edit user settings.
						</p>
						<button
							onClick={() => router.push("/dashboard/settings")}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							Back to Settings
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (error && !formData) {
		return (
			<div className="p-6">
				<div className="max-w-2xl mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6">
						<div className="text-red-600 text-lg font-semibold mb-2">⚠️ Error Loading User</div>
						<p className="text-red-700 mb-2">{error}</p>
						<p className="text-sm text-red-600 mb-4">
							User ID: <code className="bg-red-100 px-2 py-1 rounded">{userId}</code>
						</p>
						<div className="text-sm text-gray-700 mb-4">
							<p className="font-semibold mb-1">Troubleshooting:</p>
							<ul className="list-disc list-inside space-y-1">
								<li>Check if the user exists in the system</li>
								<li>Verify the USER_ID is correct</li>
								<li>Check browser console for more details</li>
							</ul>
						</div>
						<button
							onClick={() => router.push("/dashboard/settings?tab=users")}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Back to User List
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!formData) {
		return (
			<div className="p-6">
				<div className="max-w-2xl mx-auto">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
						<p className="text-yellow-700">User not found</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 bg-gray-50 min-h-screen">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<button
							onClick={() => router.push("/dashboard/settings?tab=users")}
							className="flex items-center text-gray-600 hover:text-gray-900 mb-2 transition-colors"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Settings
						</button>
						<h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
						<p className="text-gray-600 mt-1">Update user information and permissions</p>
					</div>
				</div>

				{/* Success Message */}
				{success && (
					<div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-green-800 font-medium">User updated successfully! Redirecting...</p>
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800 font-medium">{error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit}>
					<div className="bg-white rounded-lg shadow-sm border border-gray-200">
						{/* Basic Information */}
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										User ID <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="USER_ID"
										value={formData.USER_ID || ""}
										disabled
										className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Full Name <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="USER_FULL_NAME"
										value={formData.USER_FULL_NAME || ""}
										onChange={handleChange}
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										User Type
									</label>
									<input
										type="text"
										name="USER_TYPE"
										value={formData.USER_TYPE || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Designation
									</label>
									<input
										type="text"
										name="DESIGNATION"
										value={formData.DESIGNATION || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Finance Officer
									</label>
									<input
										type="text"
										name="Finance_Officer"
										value={formData.Finance_Officer || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Report To
									</label>
									<input
										type="text"
										name="REPORT_TO"
										value={formData.REPORT_TO || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
							</div>
						</div>

						{/* Location Information */}
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Location Information</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
									<input
										type="text"
										name="PROGRAM"
										value={formData.PROGRAM || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
									<input
										type="text"
										name="REGION"
										value={formData.REGION || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
									<input
										type="text"
										name="AREA"
										value={formData.AREA || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
									<input
										type="text"
										name="SECTION"
										value={formData.SECTION || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">FDP</label>
									<input
										type="text"
										name="FDP"
										value={formData.FDP || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Plan Intervention</label>
									<input
										type="text"
										name="PLAN_INTERVENTION"
										value={formData.PLAN_INTERVENTION || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Tracking System</label>
									<input
										type="text"
										name="TRACKING_SYSTEM"
										value={formData.TRACKING_SYSTEM || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">RC</label>
									<input
										type="text"
										name="RC"
										value={formData.RC || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">LC</label>
									<input
										type="text"
										name="LC"
										value={formData.LC || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">EDO</label>
									<input
										type="text"
										name="EDO"
										value={formData.EDO || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">JPO</label>
									<input
										type="text"
										name="JPO"
										value={formData.JPO || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">AM Region</label>
									<input
										type="text"
										name="AM_REGION"
										value={formData.AM_REGION || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
							</div>
						</div>

						{/* Permissions */}
						<div className="p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Permissions</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{[
									{ key: "ACTIVE", label: "Active", desc: "User account is active" },
									{ key: "CAN_ADD", label: "Can Add", desc: "Can add new records" },
									{ key: "CAN_UPDATE", label: "Can Update", desc: "Can update records" },
									{ key: "CAN_DELETE", label: "Can Delete", desc: "Can delete records" },
									{ key: "CAN_UPLOAD", label: "Can Upload", desc: "Can upload files" },
									{ key: "SEE_REPORTS", label: "See Reports", desc: "Can view reports" },
									{ key: "ROP_EDIT", label: "ROP Edit", desc: "Can edit ROP" },
									{ key: "access_loans", label: "Access Loans", desc: "Access loans module" },
									{ key: "baseline_access", label: "Baseline Access", desc: "Access baseline data" },
									{ key: "bank_account", label: "Bank Information", desc: "Bank information access" },
									{ key: "Supper_User", label: "Super User", desc: "Admin privileges" },
									{ key: "BaselineQOL", label: "Baseline Approval", desc: "Baseline approval access" },
									{ key: "Dashboard", label: "Dashboard", desc: "Dashboard access" },
									{ key: "PowerBI", label: "Power BI", desc: "Power BI access" },
									{ key: "Family_Development_Plan", label: "FDP Approval", desc: "FDP approval access" },
									{ key: "Family_Approval_CRC", label: "Family Approval CRC", desc: "CRC approval access" },
									{ key: "Family_Income", label: "Family Income", desc: "Family income access" },
									{ key: "ROP", label: "ROP", desc: "ROP access" },
									{ key: "Setting", label: "Setting", desc: "Settings access" },
									{ key: "Other", label: "Other", desc: "Other permissions" },
									{ key: "SWB_Families", label: "SWB Families", desc: "SWB Families access" },
									{ key: "ActualIntervention", label: "Actual Intervention", desc: "Actual intervention access" },
									{ key: "FinanceSection", label: "Finance Section", desc: "Finance section access" },
									{ key: "FeasibilityApproval", label: "Feasibility Approval", desc: "Feasibility approval access" },
									{ key: "InterventionApproval", label: "Intervention Approval", desc: "Intervention approval access" },
									{ key: "BankAccountApproval", label: "Bank Account Approval", desc: "Bank account approval access" },
								].map((item) => {
									const value = formData[item.key as keyof UserData];
									// Explicitly convert to boolean: 1, true, "1", "true" = checked; 0, false, "0", "false", null, undefined = unchecked
									const isChecked = value === 1 || value === true || value === "1" || value === "true";
									
									return (
										<div key={item.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
											<input
												type="checkbox"
												name={item.key}
												checked={isChecked}
												onChange={handleChange}
												className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
											/>
											<div className="flex-1 min-w-0">
												<label className="block text-sm font-medium text-gray-900 cursor-pointer">
													{item.label}
												</label>
												<p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Action Buttons */}
						<div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
							<button
								type="button"
								onClick={() => router.push("/dashboard/settings?tab=users")}
								disabled={saving}
								className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
							>
								{saving ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										<span>Saving...</span>
									</>
								) : (
									<>
										<Save className="w-4 h-4" />
										<span>Save Changes</span>
									</>
								)}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

