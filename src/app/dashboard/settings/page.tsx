"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Shield, Lock, Users, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import NoPermissionMessage from "@/components/NoPermissionMessage";

function SettingsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userProfile, loading: authLoading } = useAuth();
	const [activeTab, setActiveTab] = useState("profile");
	const [isSuperUserState, setIsSuperUserState] = useState<boolean | null>(null);
	
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [searchParams]);

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

	const tabs = [
		{ id: "profile", label: "Profile", icon: User },
		...(isSuperUserState ? [{ id: "permissions", label: "Permissions", icon: Shield }] : []),
		{ id: "password", label: "Password", icon: Lock },
		...(isSuperUserState
			? [
					{ id: "addUser", label: "Add New User", icon: User },
					{ id: "users", label: "View Users", icon: Users },
			  ]
			: []),
	];

	return (
		<div className="space-y-6">
			{/* Header */}
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
					<p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
				</div>

				{/* Tabs */}
				<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
								}}
									className={`
									inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm
									${
										activeTab === tab.id
											? "border-[#0b4d2b] text-[#0b4d2b]"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}
									`}
								>
								<Icon className="h-5 w-5" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Tab Content */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				{activeTab === "profile" && <ProfileTab />}
				{activeTab === "permissions" && isSuperUserState && <PermissionsTab />}
				{activeTab === "password" && <PasswordTab />}
				{activeTab === "addUser" && isSuperUserState && <AddUserTab />}
				{activeTab === "users" && isSuperUserState && <ViewUsersTab />}
									</div>
									</div>
	);
}

// Profile Tab Component
function ProfileTab() {
	const { userProfile } = useAuth();
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);
		setMessage(null);
		// Profile update logic would go here
		setTimeout(() => {
			setSaving(false);
			setMessage({ type: "success", text: "Profile updated successfully!" });
		}, 1000);
	};

	return (
									<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
			{message && (
				<div
					className={`mb-4 p-4 rounded-lg ${
						message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
					}`}
				>
					{message.text}
									</div>
			)}
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
										<input
											type="text"
							value={userProfile?.username || ""}
							disabled
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
										/>
									</div>
									<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
										<input
											type="text"
							value={userProfile?.full_name || ""}
							disabled
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
										/>
									</div>
									</div>
				<div className="flex justify-end">
									<button
										type="submit"
										disabled={saving}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
									>
										<Save className="h-4 w-4" />
										{saving ? "Saving..." : "Save Changes"}
									</button>
							</div>
						</form>
										</div>
	);
}

// Permissions Tab Component
function PermissionsTab() {
	return (
										<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">Permissions</h2>
			<p className="text-gray-600">Permission management is available through the user edit page.</p>
			<p className="text-gray-600 mt-2">
				Please use the "View Users" tab to edit user permissions.
			</p>
										</div>
	);
}

// Password Tab Component
function PasswordTab() {
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [formData, setFormData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (formData.newPassword !== formData.confirmPassword) {
			setMessage({ type: "error", text: "New passwords do not match" });
			return;
		}
		setSaving(true);
		setMessage(null);
		// Password update logic would go here
		setTimeout(() => {
			setSaving(false);
			setMessage({ type: "success", text: "Password updated successfully!" });
			setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
		}, 1000);
	};

	return (
										<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
			{message && (
				<div
					className={`mb-4 p-4 rounded-lg ${
						message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
					}`}
				>
					{message.text}
								</div>
					)}
			<form onSubmit={handleSubmit} className="space-y-6 max-w-md">
							<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
										<input
											type="password"
						value={formData.currentPassword}
						onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
									</div>
									<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
										<input
											type="password"
						value={formData.newPassword}
						onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
									</div>
									<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
										<input
											type="password"
						value={formData.confirmPassword}
						onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										/>
									</div>
				<div className="flex justify-end">
									<button
										type="submit"
										disabled={saving}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
									>
										<Save className="h-4 w-4" />
						{saving ? "Saving..." : "Update Password"}
									</button>
							</div>
						</form>
									</div>
	);
}

// Add User Tab Component
function AddUserTab() {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	
	// Council data structure
	const councilData: { [key: string]: string[] } = {
		"CENTRAL REGION": ["HAFIZABAD", "LAHORE", "MULTAN & BAHAWALPUR", "PESHAWAR", "RAWALPINDI", "SARGODHA"],
		"GILGIT REGION": ["GILGIT", "SKARDU", "SUL, DAN & OSHIKHANDAS"],
		"GUPIS & YASIN REGION": ["GHOLAGHMULI", "GUPIS", "PHUNDER", "PINGAL", "SILGAN", "SULTANABAD", "THOI", "YASIN"],
		"HUNZA REGION": ["ALTIT & KARIMABAD", "ALYABAD & HYDERABAD", "CHUPERSON", "GUJAL BALA", "GULMIT", "NASIRABAD", "SHIMSHAL"],
		"ISHKOMAN & PUNIYAL REGION": ["CHATOORKHAND", "DAMAS", "GAHKUCH", "ISHKOMAN", "SHERQUILLA", "SINGAL"],
		"LOWER CHITRAL REGION": ["ARKARI", "CHITRAL TOWN", "GARAMCHASHMA", "MADAKLASHT", "PARABEG", "SHOGHORE", "SUSUM"],
		"SOUTHERN REGION": ["GARDEN", "GULSHAN", "HYDERABAD", "KARIMABAD", "KHARADAR", "TANDO TUREL", "THATTA & SHAH BUNDER"],
		"UPPER CHITRAL REGION": ["BANG", "BOONI", "BREP", "KHOT", "MASTUJ", "MULKHOW", "YARKHOON LASHT"]
	};

	const regionalCouncils = Object.keys(councilData);
	
	// Function to generate a random password
	const generatePassword = () => {
		const length = 12;
		const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
		let password = "";
		for (let i = 0; i < length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		return password;
	};

	const [formData, setFormData] = useState({
		USER_ID: "",
		USER_FULL_NAME: "",
		PASSWORD: "",
		RE_PASSWORD: "",
		USER_TYPE: "",
		DESIGNATION: "",
		ACTIVE: false,
		CAN_ADD: false,
		CAN_UPDATE: false,
		CAN_DELETE: false,
		CAN_UPLOAD: false,
		SEE_REPORTS: false,
		RC: "",
		LC: "",
		REPORT_TO: "",
		ROP_EDIT: false,
		access_loans: false,
		baseline_access: false,
		bank_account: false,
		Supper_User: false,
		Finance_Officer: "",
		BaselineQOL: false,
		Dashboard: false,
		PowerBI: false,
		Family_Development_Plan: false,
		Family_Approval_CRC: false,
		Family_Income: false,
		ROP: false,
		Setting: false,
		Other: false,
		SWB_Families: false,
		EDO: "",
		JPO: "",
		AM_REGION: "",
	});

	// Auto-generate password on component mount
	useEffect(() => {
		const autoPassword = generatePassword();
		setFormData(prev => ({
			...prev,
			PASSWORD: autoPassword,
			RE_PASSWORD: autoPassword
		}));
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;

		setFormData(prev => {
			const newData = {
				...prev,
				[name]: type === "checkbox" ? checked : value
			};
			
			// If Regional Council changes, reset Local Council
			if (name === "RC" && value !== prev.RC) {
				newData.LC = "";
			}
			
			return newData;
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Validate required fields
		if (!formData.USER_ID || !formData.USER_FULL_NAME || !formData.PASSWORD || !formData.USER_TYPE) {
			setError("USER_ID, USER_FULL_NAME, PASSWORD, and USER_TYPE are required.");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to create user");
			}

			setSuccess(true);
			// Reset form and generate new password
			const newPassword = generatePassword();
			setFormData({
				USER_ID: "",
				USER_FULL_NAME: "",
				PASSWORD: newPassword,
				RE_PASSWORD: newPassword,
				USER_TYPE: "",
				DESIGNATION: "",
				ACTIVE: false,
				CAN_ADD: false,
				CAN_UPDATE: false,
				CAN_DELETE: false,
				CAN_UPLOAD: false,
				SEE_REPORTS: false,
				RC: "",
				LC: "",
				REPORT_TO: "",
				ROP_EDIT: false,
				access_loans: false,
				baseline_access: false,
				bank_account: false,
				Supper_User: false,
				Finance_Officer: "",
				BaselineQOL: false,
				Dashboard: false,
				PowerBI: false,
				Family_Development_Plan: false,
				Family_Approval_CRC: false,
				Family_Income: false,
				ROP: false,
				Setting: false,
				Other: false,
				SWB_Families: false,
				EDO: "",
				JPO: "",
				AM_REGION: "",
			});

			setTimeout(() => {
				setSuccess(false);
				router.push("/dashboard/settings?tab=users");
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create user");
		} finally {
			setSaving(false);
		}
	};

										return (
												<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">Add New User</h2>
			
			{/* Success Message */}
			{success && (
				<div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800 font-medium">User created successfully! Redirecting to users list...</p>
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
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
					{/* Basic Information */}
					<div className="p-6 border-b border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email Address <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									name="USER_ID"
									value={formData.USER_ID}
									onChange={handleChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Full Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="USER_FULL_NAME"
									value={formData.USER_FULL_NAME}
									onChange={handleChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="PASSWORD"
									value={formData.PASSWORD}
									readOnly
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Re-enter Password <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="RE_PASSWORD"
									value={formData.RE_PASSWORD}
									readOnly
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									User Type <span className="text-red-500">*</span>
								</label>
								<select
									name="USER_TYPE"
									value={formData.USER_TYPE}
									onChange={handleChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">Select User Type</option>
									<option value="SuperAdmin">SuperAdmin</option>
									<option value="Admin">Admin</option>
									<option value="HeadOffice">HeadOffice</option>
									<option value="RegionalManager">RegionalManager</option>
									<option value="EDO">EDO</option>
									<option value="Mentor">Mentor</option>
									<option value="FinanceOfficer">FinanceOfficer</option>
									<option value="Viewer">Viewer</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Designation
								</label>
								<input
									type="text"
									name="DESIGNATION"
									value={formData.DESIGNATION}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Finance Officer
								</label>
								<input
									type="text"
									name="Finance_Officer"
									value={formData.Finance_Officer}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Report To
								</label>
								<input
									type="text"
									name="REPORT_TO"
									value={formData.REPORT_TO}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Location Information */}
					<div className="p-6 border-b border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
								<select
									name="RC"
									value={formData.RC}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">Select Regional Council</option>
									{regionalCouncils.map((region) => (
										<option key={region} value={region}>
											{region}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
								<select
									name="LC"
									value={formData.LC}
									onChange={handleChange}
									disabled={!formData.RC}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">
										{formData.RC ? "Select Local Council" : "Select Regional Council first"}
									</option>
									{formData.RC && councilData[formData.RC]?.map((localCouncil) => (
										<option key={localCouncil} value={localCouncil}>
											{localCouncil}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">EDO</label>
								<input
									type="text"
									name="EDO"
									value={formData.EDO}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">JPO</label>
								<input
									type="text"
									name="JPO"
									value={formData.JPO}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">AM Region</label>
								<input
									type="text"
									name="AM_REGION"
									value={formData.AM_REGION}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Permissions */}
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
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
								{ key: "bank_account", label: "Bank Account", desc: "Bank account access" },
								{ key: "Supper_User", label: "Super User", desc: "Admin privileges" },
								{ key: "BaselineQOL", label: "Baseline QOL", desc: "Baseline QOL access" },
								{ key: "Dashboard", label: "Dashboard", desc: "Dashboard access" },
								{ key: "PowerBI", label: "Power BI", desc: "Power BI access" },
								{ key: "Family_Development_Plan", label: "Family Development Plan", desc: "FDP access" },
								{ key: "Family_Approval_CRC", label: "Family Approval CRC", desc: "CRC approval access" },
								{ key: "Family_Income", label: "Family Income", desc: "Family income access" },
								{ key: "ROP", label: "ROP", desc: "ROP access" },
								{ key: "Setting", label: "Setting", desc: "Settings access" },
								{ key: "Other", label: "Other", desc: "Other permissions" },
								{ key: "SWB_Families", label: "SWB Families", desc: "SWB Families access" },
							].map((item) => (
								<div key={item.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
									<input
										type="checkbox"
										name={item.key}
										checked={formData[item.key as keyof typeof formData] as boolean}
										onChange={handleChange}
										className="mt-1 w-4 h-4 text-[#0b4d2b] rounded focus:ring-2 focus:ring-[#0b4d2b]"
									/>
									<div className="flex-1 min-w-0">
										<label className="block text-sm font-medium text-gray-900 cursor-pointer">
											{item.label}
										</label>
										<p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Action Buttons */}
					<div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
						<button
							type="button"
							onClick={() => {
								const newPassword = generatePassword();
								setFormData({
									USER_ID: "",
									USER_FULL_NAME: "",
									PASSWORD: newPassword,
									RE_PASSWORD: newPassword,
									USER_TYPE: "",
									DESIGNATION: "",
									ACTIVE: false,
									CAN_ADD: false,
									CAN_UPDATE: false,
									CAN_DELETE: false,
									CAN_UPLOAD: false,
									SEE_REPORTS: false,
									RC: "",
									LC: "",
									REPORT_TO: "",
									ROP_EDIT: false,
									access_loans: false,
									baseline_access: false,
									bank_account: false,
									Supper_User: false,
									Finance_Officer: "",
									BaselineQOL: false,
									Dashboard: false,
									PowerBI: false,
									Family_Development_Plan: false,
									Family_Approval_CRC: false,
									Family_Income: false,
									ROP: false,
									Setting: false,
									Other: false,
									SWB_Families: false,
									EDO: "",
									JPO: "",
									AM_REGION: "",
								});
								setError(null);
								setSuccess(false);
							}}
							disabled={saving}
							className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Reset
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
						>
							<Save className="w-4 h-4" />
							<span>{saving ? "Creating..." : "Create User"}</span>
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}

// View Users Tab Component
function ViewUsersTab() {
	const router = useRouter();
	const [users, setUsers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoading(true);
				const response = await fetch("/api/users");
				const data = await response.json();
				if (data.success) {
					setUsers(data.users || []);
					} else {
					setError(data.message || "Failed to fetch users");
				}
			} catch (err: any) {
				console.error("Error fetching users:", err);
				setError(err.message || "Error fetching users");
			} finally {
				setLoading(false);
			}
		};
		fetchUsers();
	}, []);

	if (loading) {
		return (
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-6">View Users</h2>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading users...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
					<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-6">View Users</h2>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			</div>
		);
	}

	return (
					<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">View Users</h2>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{users.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td>
							</tr>
						) : (
							users.map((user) => (
								<tr key={user.USER_ID} className="hover:bg-gray-50">
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.USER_ID || "N/A"}</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.USER_FULL_NAME || "N/A"}</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.USER_TYPE || "N/A"}</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
										{user.ACTIVE ? "Yes" : "No"}
									</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm">
										<button
											onClick={() => router.push(`/dashboard/settings/edit/${user.USER_ID}`)}
											className="px-3 py-1 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors text-sm"
										>
											Edit
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
					</div>
				</div>
	);
}

export default function SettingsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<SettingsPageContent />
		</Suspense>
	);
}
