"use client";

import { useAuth } from "@/hooks/useAuth";
import { normalizePermission, isSuperUser } from "@/lib/auth-utils";
import { UserCircle, CheckCircle2, XCircle, Loader2, Mail, User, Building2, MapPin, Phone, Shield, Key, Calendar, Lock, Briefcase, Users as UsersIcon } from "lucide-react";
import { useState, useEffect } from "react";

// Define all sections with their display names and permission fields
const sections = [
	{ name: "Settings", permission: "Setting", url: "/dashboard/settings" },
	{ name: "SWB Families", permission: "SWB_Families", url: "/dashboard/swb-families" },
	{ name: "Actual Intervention", permission: "ActualIntervention", url: "/dashboard/actual-intervention" },
	{ name: "Finance - Loan Process", permission: "FinanceSection", url: "/dashboard/finance/loan-process" },
	{ name: "Finance - Bank Information", permission: "BankInformation", url: "/dashboard/finance/bank-information/view" },
	{ name: "Approval - Baseline Approval", permission: "BaselineApproval", url: "/dashboard/approval-section/baseline-approval" },
	{ name: "Approval - Feasibility Approval", permission: "FeasibilityApproval", url: "/dashboard/feasibility-approval" },
	{ name: "Approval - FDP Approval", permission: "FdpApproval", url: "/dashboard/approval-section/family-development-plan-approval" },
	{ name: "Approval - Intervention Approval", permission: "InterventionApproval", url: "/dashboard/approval-section/intervention-approval" },
	{ name: "Approval - Bank Account Approval", permission: "BankAccountApproval", url: "/dashboard/approval-section/bank-account-approval" },
	{ name: "Baseline QOL", permission: "BaselineQOL", url: "/dashboard/baseline-qol" },
	{ name: "Family Development Plan", permission: "Family_Development_Plan", url: "/dashboard/family-development-plan" },
	{ name: "ROPs", permission: "ROP", url: "/dashboard/rops" },
	{ name: "Family Income", permission: "Family_Income", url: "/dashboard/family-income" },
];

export default function UserInformationPage() {
	const { userProfile, user, loading, error, refreshUser } = useAuth();
	const [rawUserData, setRawUserData] = useState<any>(null);
	const [loadingRawData, setLoadingRawData] = useState(false);

	// Fetch raw user data from database
	useEffect(() => {
		const fetchRawUserData = async () => {
			if (!userProfile) return;
			
			setLoadingRawData(true);
			try {
				const cacheBuster = `?raw=true&t=${Date.now()}`;
				const res = await fetch(`/api/user-profile${cacheBuster}`);
				const data = await res.json();
				if (data.success) {
					if (data.rawUser) {
						console.log('[UserInformationPage] Raw user data loaded:', data.rawUser);
						console.log('[UserInformationPage] Raw user data keys:', Object.keys(data.rawUser));
						setRawUserData(data.rawUser);
					} else {
						console.warn("Raw user data not available in API response. Response:", data);
					}
				} else {
					console.error("Failed to fetch raw user data:", data.message, data);
				}
			} catch (err) {
				console.error("Error fetching raw user data:", err);
			} finally {
				setLoadingRawData(false);
			}
		};

		if (userProfile) {
			fetchRawUserData();
		}
	}, [userProfile]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto text-[#0b4d2b]" />
					<p className="mt-4 text-gray-600">Loading user information...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen p-6">
				<div className="text-center max-w-2xl">
					<XCircle className="h-8 w-8 mx-auto text-red-500" />
					<p className="mt-4 text-red-600 font-semibold">Error Loading User Information</p>
					<p className="mt-2 text-gray-600">{error}</p>
					<div className="mt-4 space-y-2">
						<button
							onClick={() => refreshUser()}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
						>
							Retry
						</button>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
						>
							Refresh Page
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!userProfile) {
		return (
			<div className="flex items-center justify-center min-h-screen p-6">
				<div className="text-center max-w-2xl">
					<XCircle className="h-8 w-8 mx-auto text-red-500" />
					<p className="mt-4 text-red-600 font-semibold mb-2">Unable to load user information</p>
					<p className="text-gray-600 mb-4">The user profile could not be loaded. This might be due to:</p>
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left">
						<h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
						<ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 mb-4">
							<li>Make sure you are logged in</li>
							<li>Check if you can access other pages in the dashboard</li>
							<li>Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
							<li>Check if the API endpoint is accessible</li>
							<li>Check browser console for errors (F12)</li>
						</ol>
						<div className="mt-4 space-y-2">
							<button
								onClick={() => refreshUser()}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
							>
								Retry Loading
							</button>
							<button
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
							>
								Refresh Page
							</button>
						</div>
						<div className="mt-4 pt-4 border-t border-blue-200">
							<p className="text-xs text-blue-700 mb-2">
								<strong>Debug Info:</strong>
							</p>
							<div className="text-xs text-blue-700 space-y-1 bg-blue-100 p-3 rounded">
								<p>Loading: {String(loading)}</p>
								<p>Error: {error || "None"}</p>
								<p>User: {user ? `Loaded (${user.email || user.username || user.id})` : "Not loaded"}</p>
								<p>UserProfile: {userProfile ? "Loaded" : "Not loaded"}</p>
								<p>Loading Raw Data: {String(loadingRawData)}</p>
								<p>Raw User Data: {rawUserData ? "Loaded" : "Not loaded"}</p>
							</div>
							<div className="mt-3">
								<button
									onClick={async () => {
										try {
											const res = await fetch('/api/user-profile');
											const data = await res.json();
											alert(`API Response: ${JSON.stringify(data, null, 2)}`);
										} catch (err) {
											alert(`API Error: ${err}`);
										}
									}}
									className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
								>
									Test API Endpoint
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Check if user is Super Admin
	const isSuperAdminUser = userProfile.access_level && typeof userProfile.access_level === 'string' && userProfile.access_level.trim() === 'Super Admin';
	const isSuperUserByValue = isSuperUser(userProfile.supper_user);
	const isSuperAdmin = isSuperAdminUser || isSuperUserByValue;

	// Get permission status for a section
	const getPermissionStatus = (permissionField: keyof typeof userProfile) => {
		if (isSuperAdmin) {
			return { hasAccess: true, value: "Super Admin" };
		}
		const permissionValue = userProfile[permissionField];
		const hasAccess = normalizePermission(permissionValue);
		return { hasAccess, value: permissionValue };
	};

	// Format date for display
	const formatDate = (date: any) => {
		if (!date) return "N/A";
		try {
			const d = new Date(date);
			return d.toLocaleString();
		} catch {
			return String(date);
		}
	};

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<div className="flex items-center gap-3 mb-4">
					<UserCircle className="h-8 w-8 text-[#0b4d2b]" />
					<h1 className="text-3xl font-bold text-gray-900">User Information</h1>
				</div>
				<p className="text-gray-600">View your account details and access permissions from database</p>
			</div>

			{/* Basic User Information Card */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<User className="h-5 w-5 text-[#0b4d2b]" />
					Basic Information
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex items-start gap-3">
						<User className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">User ID</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.UserId || userProfile.username || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Mail className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Email Address</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.email_address || userProfile.email || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<User className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Full Name</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.UserFullName || userProfile.full_name || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Shield className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">User Type</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.UserType || userProfile.access_level || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Briefcase className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Designation</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.Designation || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<MapPin className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Regional Council</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.Regional_Council || userProfile.region || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<UsersIcon className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Local Council</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.Local_Council || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Key className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Access Scope</p>
							<p className="text-base font-medium text-gray-900">{rawUserData?.AccessScope || "N/A"}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle2 className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">Active Status</p>
							<p className="text-base font-medium text-gray-900">
								{rawUserData?.Active !== null && rawUserData?.Active !== undefined ? (
									normalizePermission(rawUserData.Active) ? (
										<span className="text-green-600">Active</span>
									) : (
										<span className="text-red-600">Inactive</span>
									)
								) : (
									"N/A"
								)}
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Calendar className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">User Create Date</p>
							<p className="text-base font-medium text-gray-900">{formatDate(rawUserData?.user_create_date)}</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<Calendar className="h-5 w-5 text-gray-400 mt-1" />
						<div>
							<p className="text-sm text-gray-500">User Update Date</p>
							<p className="text-base font-medium text-gray-900">{formatDate(rawUserData?.user_update_date)}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Permission Fields from Database */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Shield className="h-5 w-5 text-[#0b4d2b]" />
					Permission Fields (Raw Database Values)
				</h2>
				{isSuperAdmin && (
					<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-sm text-green-800">
							<strong>Super Admin:</strong> You have full access to all pages and sections regardless of individual permissions.
						</p>
					</div>
				)}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{rawUserData && (
						<>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">Setting</p>
								<p className="text-lg font-semibold">{String(rawUserData.Setting ?? rawUserData.setting ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">SwbFamilies</p>
								<p className="text-lg font-semibold">{String(rawUserData.SwbFamilies ?? rawUserData.swbFamilies ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">ActualIntervention</p>
								<p className="text-lg font-semibold">{String(rawUserData.ActualIntervention ?? rawUserData.actualIntervention ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">FinanceSection</p>
								<p className="text-lg font-semibold">{String(rawUserData.FinanceSection ?? rawUserData.financeSection ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">BankInformation</p>
								<p className="text-lg font-semibold">{String(rawUserData.BankInformation ?? rawUserData.bankInformation ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">BaselineApproval</p>
								<p className="text-lg font-semibold">{String(rawUserData.BaselineApproval ?? rawUserData.baselineApproval ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">FeasibilityApproval</p>
								<p className="text-lg font-semibold">{String(rawUserData.FeasibilityApproval ?? rawUserData.feasibilityApproval ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">FdpApproval</p>
								<p className="text-lg font-semibold">{String(rawUserData.FdpApproval ?? rawUserData.fdpApproval ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">InterventionApproval</p>
								<p className="text-lg font-semibold">{String(rawUserData.InterventionApproval ?? rawUserData.interventionApproval ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">BankAccountApproval</p>
								<p className="text-lg font-semibold">{String(rawUserData.BankAccountApproval ?? rawUserData.bankAccountApproval ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">Baseline</p>
								<p className="text-lg font-semibold">{String(rawUserData.Baseline ?? rawUserData.baseline ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">FamilyDevelopmentPlan</p>
								<p className="text-lg font-semibold">{String(rawUserData.FamilyDevelopmentPlan ?? rawUserData.familyDevelopmentPlan ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">ROPs</p>
								<p className="text-lg font-semibold">{String(rawUserData.ROPs ?? rawUserData.rops ?? rawUserData.Rops ?? "N/A")}</p>
							</div>
							<div className="p-4 border rounded-lg">
								<p className="text-sm font-medium text-gray-700 mb-1">FamilyIncome</p>
								<p className="text-lg font-semibold">{String(rawUserData.FamilyIncome ?? rawUserData.familyIncome ?? "N/A")}</p>
							</div>
						</>
					)}
					{!rawUserData && (
						<div className="col-span-full text-center py-8 text-gray-500">
							<Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
							<p>Loading raw database values...</p>
						</div>
					)}
				</div>
			</div>

			{/* Page Access Permissions Table */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Shield className="h-5 w-5 text-[#0b4d2b]" />
					Page Access Permissions
				</h2>
				{isSuperAdmin && (
					<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-sm text-green-800">
							<strong>Super Admin:</strong> You have full access to all pages and sections.
						</p>
					</div>
				)}
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Page/Section
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Permission Field
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Access Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Raw Value
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									URL
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{sections.map((section, index) => {
								const permissionField = section.permission as keyof typeof userProfile;
								const { hasAccess, value } = getPermissionStatus(permissionField);
								// Get raw database value
								const rawDbField = section.permission === "Setting" ? "Setting" :
									section.permission === "SWB_Families" ? "SwbFamilies" :
									section.permission === "BaselineQOL" ? "Baseline" :
									section.permission === "Family_Development_Plan" ? "FamilyDevelopmentPlan" :
									section.permission === "Family_Income" ? "FamilyIncome" :
									section.permission === "ROP" ? "ROPs" :
									section.permission;
								const rawValue = rawUserData ? rawUserData[rawDbField] ?? rawUserData[rawDbField.toLowerCase()] : null;
								
								return (
									<tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{section.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{section.permission}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{hasAccess ? (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													<CheckCircle2 className="h-3 w-3 mr-1" />
													Allowed
												</span>
											) : (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
													<XCircle className="h-3 w-3 mr-1" />
													Denied
												</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{rawValue !== null && rawValue !== undefined ? String(rawValue) : (isSuperAdmin ? "Super Admin" : "null")}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
											<a href={section.url} className="hover:underline" target="_blank" rel="noopener noreferrer">
												{section.url}
											</a>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Additional Permissions Card */}
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<Key className="h-5 w-5 text-[#0b4d2b]" />
					Additional Permissions
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Access Loans</span>
						{normalizePermission(userProfile.access_loans) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Bank Account</span>
						{normalizePermission(userProfile.bank_account) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Can Add</span>
						{normalizePermission(userProfile.access_add) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Can Edit</span>
						{normalizePermission(userProfile.access_edit) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Can Delete</span>
						{normalizePermission(userProfile.access_delete) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<span className="text-sm font-medium text-gray-700">Can View Reports</span>
						{normalizePermission(userProfile.access_reports) ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<XCircle className="h-5 w-5 text-red-500" />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
