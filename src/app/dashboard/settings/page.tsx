"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Users, Save, Search, Filter, Edit, Trash2, X, Check, Loader2, AlertTriangle, UserPlus } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import { useAuth } from "@/hooks/useAuth";
import NoPermissionMessage from "@/components/NoPermissionMessage";
import PermissionStatusLabel from "@/components/PermissionStatusLabel";

function SettingsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Setting");
	const { userProfile } = useAuth(); // Must be called at top level, not conditionally
	const [activeTab, setActiveTab] = useState("users");
	
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [searchParams]);

	// Check Setting access - only users with Setting = "Yes" can access this page
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (hasAccess === false) {
		return (
			<div className="space-y-6 p-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-red-800 mb-4">Access Denied</h2>
					<p className="text-red-700 mb-4">You do not have permission to access the Settings page.</p>
					<div className="bg-white rounded p-4 mt-4">
						<h3 className="font-semibold text-gray-900 mb-2">Detailed Debug Information:</h3>
						<div className="space-y-2 text-sm">
							<p><strong>Has Access:</strong> {String(hasAccess)}</p>
							<p><strong>Section Name:</strong> {sectionName}</p>
							<p><strong>Loading:</strong> {String(accessLoading)}</p>
							{userProfile && (
								<>
									<p><strong>Setting Permission Value:</strong> {String(userProfile.Setting ?? "null")}</p>
									<p><strong>Setting Permission Type:</strong> {typeof userProfile.Setting}</p>
									<p><strong>Is Super Admin:</strong> {userProfile.access_level === "Super Admin" ? "Yes" : "No"}</p>
									<p><strong>Super User Value:</strong> {String(userProfile.supper_user ?? "null")}</p>
									<p><strong>Your Email:</strong> {userProfile.email}</p>
									<p><strong>Your Username:</strong> {userProfile.username}</p>
								</>
							)}
							{!userProfile && (
								<p className="text-red-600"><strong>⚠️ Warning:</strong> User profile is not loaded!</p>
							)}
						</div>
						<details className="mt-4">
							<summary className="cursor-pointer text-sm font-semibold text-gray-700">View Full User Profile Data</summary>
							<pre className="text-xs bg-gray-100 p-3 rounded overflow-auto mt-2 max-h-96">
								{JSON.stringify(userProfile, null, 2)}
							</pre>
						</details>
					</div>
					<div className="mt-4 space-y-2">
						<a 
							href="/dashboard/user-information" 
							className="block text-blue-600 hover:text-blue-800 underline"
						>
							View Your User Information and Permissions →
						</a>
						<button
							onClick={() => window.location.reload()}
							className="text-blue-600 hover:text-blue-800 underline"
						>
							Refresh Page to Reload Permissions
						</button>
					</div>
				</div>
			</div>
		);
	}

	const tabs = [
		{ id: "users", label: "View Users", icon: Users },
		{ id: "addUser", label: "Add New User", icon: UserPlus },
		{ id: "password", label: "Password", icon: Lock },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
						<PermissionStatusLabel permission="Setting" />
					</div>
					<p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
					
					{/* Visible Debug Information - Shows permission status on the page */}
					{userProfile && (
						<div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h3 className="font-semibold text-blue-900 mb-2">🔍 Permission Debug Information:</h3>
							<div className="text-sm text-blue-800 space-y-1">
								<p><strong>Setting Permission Value:</strong> {String(userProfile.Setting ?? "null")}</p>
								<p><strong>Setting Permission Type:</strong> {typeof userProfile.Setting}</p>
								<p><strong>Has Access:</strong> {hasAccess ? "✅ Yes" : "❌ No"}</p>
								<p><strong>Is Super Admin:</strong> {userProfile.access_level === "Super Admin" ? "✅ Yes" : "❌ No"}</p>
								<p><strong>Super User Value:</strong> {String(userProfile.supper_user ?? "null")}</p>
								<p><strong>Your Email:</strong> {userProfile.email}</p>
								<p><strong>Loading:</strong> {accessLoading ? "Yes" : "No"}</p>
							</div>
						</div>
					)}
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
				{activeTab === "users" && hasSettingAccess && <ViewUsersTab />}
				{activeTab === "addUser" && hasSettingAccess && <AddUserTab />}
				{activeTab === "password" && <PasswordTab />}
									</div>
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

	const { userProfile } = useAuth();
	
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (formData.newPassword !== formData.confirmPassword) {
			setMessage({ type: "error", text: "New passwords do not match" });
			return;
		}
		
		if (formData.newPassword.length < 6) {
			setMessage({ type: "error", text: "New password must be at least 6 characters" });
			return;
		}
		
		setSaving(true);
		setMessage(null);
		
		try {
			// Get user identifier (email_address or UserId)
			const userId = userProfile?.email || userProfile?.username || "";
			
			if (!userId) {
				setMessage({ type: "error", text: "User information not found. Please log in again." });
				setSaving(false);
				return;
			}
			
			const response = await fetch("/api/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: userId,
					oldPassword: formData.currentPassword,
					newPassword: formData.newPassword,
				}),
			});
			
			const data = await response.json();
			
			if (!response.ok || !data.success) {
				throw new Error(data.message || "Failed to change password");
			}
			
			setMessage({ type: "success", text: "Password updated successfully!" });
			setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
		} catch (err: any) {
			setMessage({ type: "error", text: err.message || "Failed to change password" });
		} finally {
			setSaving(false);
		}
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
	const [regionalCouncils, setRegionalCouncils] = useState<any[]>([]);
	const [loadingRegionalCouncils, setLoadingRegionalCouncils] = useState(true);
	
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

	// Fetch regional councils from API
	useEffect(() => {
		const fetchRegionalCouncils = async () => {
			try {
				setLoadingRegionalCouncils(true);
				const response = await fetch("/api/regional-councils");
				const data = await response.json();
				if (data.success && data.regionalCouncils) {
					setRegionalCouncils(data.regionalCouncils);
				}
			} catch (err) {
				console.error("Error fetching regional councils:", err);
			} finally {
				setLoadingRegionalCouncils(false);
			}
		};
		fetchRegionalCouncils();
	}, []);
	
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
		UserId: "",
		email_address: "",
		UserFullName: "",
		Password: "",
		UserType: "",
		Designation: "",
		Active: false,
		Regional_Council: "",
		Local_Council: "",
		RegionalCouncils: [] as number[],
		Setting: false,
		SwbFamilies: false,
		ActualIntervention: false,
		FinanceSection: false,
		BankInformation: false,
		BaselineApproval: false,
		FeasibilityApproval: false,
		FdpApproval: false,
		InterventionApproval: false,
		BankAccountApproval: false,
		Baseline: false,
		FamilyDevelopmentPlan: false,
		ROPs: false,
		FamilyIncome: false,
	});

		// Auto-generate password on component mount
		useEffect(() => {
			const autoPassword = generatePassword();
			setFormData(prev => ({
				...prev,
				Password: autoPassword
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
			if (name === "Regional_Council" && value !== prev.Regional_Council) {
				newData.Local_Council = "";
			}
			
			return newData;
		});
	};

	const handleRegionalCouncilChange = (regionalCouncilId: number, checked: boolean) => {
		setFormData(prev => {
			const currentCouncils = prev.RegionalCouncils || [];
			if (checked) {
				// Add if not already in array
				if (!currentCouncils.includes(regionalCouncilId)) {
					return {
						...prev,
						RegionalCouncils: [...currentCouncils, regionalCouncilId]
					};
				}
			} else {
				// Remove from array
				return {
					...prev,
					RegionalCouncils: currentCouncils.filter(id => id !== regionalCouncilId)
				};
			}
			return prev;
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Validate required fields
		if (!formData.email_address || !formData.UserFullName || !formData.Password || !formData.UserType) {
			setError("Email Address, Full Name, Password, and User Type are required.");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			// Prepare data for API - include RegionalCouncils array
			const apiData = {
				...formData,
				RegionalCouncils: formData.RegionalCouncils || []
			};

			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(apiData),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to create user");
			}

			setSuccess(true);
			// Reset form and generate new password
			const newPassword = generatePassword();
			setFormData({
				UserId: "",
				email_address: "",
				UserFullName: "",
				Password: newPassword,
				UserType: "",
				Designation: "",
				Active: false,
				Regional_Council: "",
				Local_Council: "",
				RegionalCouncils: [],
				Setting: false,
				SwbFamilies: false,
				ActualIntervention: false,
				FinanceSection: false,
				BankInformation: false,
				BaselineApproval: false,
				FeasibilityApproval: false,
				FdpApproval: false,
				InterventionApproval: false,
				BankAccountApproval: false,
				Baseline: false,
				FamilyDevelopmentPlan: false,
				ROPs: false,
				FamilyIncome: false,
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
									name="email_address"
									value={formData.email_address}
									onChange={handleChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									User ID (Optional - auto-generated if empty)
								</label>
								<input
									type="text"
									name="UserId"
									value={formData.UserId}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Full Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="UserFullName"
									value={formData.UserFullName}
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
									name="Password"
									value={formData.Password}
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
									name="UserType"
									value={formData.UserType}
									onChange={handleChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">Select User Type</option>
									<option value="Editor">Editor</option>
									<option value="Viewer">Viewer</option>
									<option value="Admin">Admin</option>
									<option value="Super Admin">Super Admin</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Designation
								</label>
								<input
									type="text"
									name="Designation"
									value={formData.Designation}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
						</div>
					</div>

					{/* Location Information */}
					<div className="p-6 border-b border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-3">
									Regional Councils <span className="text-gray-500 text-xs">(Select one or more)</span>
								</label>
								{loadingRegionalCouncils ? (
									<div className="text-sm text-gray-500">Loading regional councils...</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
										{regionalCouncils.map((rc) => (
											<div key={rc.RegionalCouncilId} className="flex items-start space-x-2">
												<input
													type="checkbox"
													id={`rc-${rc.RegionalCouncilId}`}
													checked={formData.RegionalCouncils.includes(rc.RegionalCouncilId)}
													onChange={(e) => handleRegionalCouncilChange(rc.RegionalCouncilId, e.target.checked)}
													className="mt-1 w-4 h-4 text-[#0b4d2b] rounded focus:ring-2 focus:ring-[#0b4d2b]"
												/>
												<label
													htmlFor={`rc-${rc.RegionalCouncilId}`}
													className="text-sm text-gray-700 cursor-pointer flex-1"
												>
													{rc.RegionalCouncilName}
													{rc.RegionalCouncilCode && (
														<span className="text-xs text-gray-500 ml-1">({rc.RegionalCouncilCode})</span>
													)}
												</label>
											</div>
										))}
									</div>
								)}
								{formData.RegionalCouncils.length > 0 && (
									<div className="mt-2 text-xs text-gray-600">
										Selected: {formData.RegionalCouncils.length} regional council(s)
									</div>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Local Council (Legacy)</label>
								<select
									name="Local_Council"
									value={formData.Local_Council}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">Select Local Council (Optional)</option>
									{Object.keys(councilData).map((region) => (
										councilData[region].map((localCouncil) => (
											<option key={`${region}-${localCouncil}`} value={localCouncil}>
												{localCouncil}
											</option>
										))
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Permissions */}
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{[
								{ key: "Active", label: "Active", desc: "User account is active" },
								{ key: "Setting", label: "Setting", desc: "Settings access" },
								{ key: "SwbFamilies", label: "SWB Families", desc: "SWB Families access" },
								{ key: "ActualIntervention", label: "Actual Intervention", desc: "Actual intervention access" },
								{ key: "FinanceSection", label: "Finance Section", desc: "Finance section access" },
								{ key: "BankInformation", label: "Bank Information", desc: "Bank information access" },
								{ key: "BaselineApproval", label: "Baseline Approval", desc: "Baseline approval access" },
								{ key: "FeasibilityApproval", label: "Feasibility Approval", desc: "Feasibility approval access" },
								{ key: "FdpApproval", label: "FDP Approval", desc: "FDP approval access" },
								{ key: "InterventionApproval", label: "Intervention Approval", desc: "Intervention approval access" },
								{ key: "BankAccountApproval", label: "Bank Account Approval", desc: "Bank account approval access" },
								{ key: "Baseline", label: "Baseline", desc: "Baseline QOL access" },
								{ key: "FamilyDevelopmentPlan", label: "Family Development Plan", desc: "Family Development Plan access" },
								{ key: "ROPs", label: "ROPs", desc: "ROPs access" },
								{ key: "FamilyIncome", label: "Family Income", desc: "Family Income access" },
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
									UserId: "",
									email_address: "",
									UserFullName: "",
									Password: newPassword,
									UserType: "",
									Designation: "",
									Active: false,
									Regional_Council: "",
									Local_Council: "",
									RegionalCouncils: [],
									Setting: false,
									SwbFamilies: false,
									ActualIntervention: false,
									FinanceSection: false,
									BankInformation: false,
									BaselineApproval: false,
									FeasibilityApproval: false,
									FdpApproval: false,
									InterventionApproval: false,
									BankAccountApproval: false,
									Baseline: false,
									FamilyDevelopmentPlan: false,
									ROPs: false,
									FamilyIncome: false,
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
	const [searchTerm, setSearchTerm] = useState("");
	const [filterUserType, setFilterUserType] = useState("");
	const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
	const [editingUser, setEditingUser] = useState<string | null>(null);
	const [editFormData, setEditFormData] = useState<any>(null);
	const [updating, setUpdating] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; userId: string | null; userName: string | null }>({
		show: false,
		userId: null,
		userName: null,
	});
	const [deleting, setDeleting] = useState(false);

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

	// Get unique user types for filter
	const userTypes = Array.from(new Set(users.map((u) => u.UserType).filter(Boolean))).sort();

	// Filter users
	const filteredUsers = users.filter((user) => {
		const searchLower = searchTerm.toLowerCase();
		const matchesSearch =
			!searchTerm ||
			(user.UserId != null && String(user.UserId).toLowerCase().includes(searchLower)) ||
			(user.email_address != null && String(user.email_address).toLowerCase().includes(searchLower)) ||
			(user.UserFullName != null && String(user.UserFullName).toLowerCase().includes(searchLower));
		const matchesType = !filterUserType || user.UserType === filterUserType;
		const matchesActive =
			filterActive === "all" ||
			(filterActive === "active" && user.Active) ||
			(filterActive === "inactive" && !user.Active);
		return matchesSearch && matchesType && matchesActive;
	});

	const handleEditClick = (user: any) => {
		const userId = user.UserId || user.email_address;
		setEditingUser(userId);
		setEditFormData({
			UserFullName: user.UserFullName || "",
			UserType: user.UserType || "",
			Designation: user.Designation || "",
			Active: user.Active === 1 || user.Active === true || user.Active === "1" || user.Active === "true" || (user.Active && typeof user.Active === 'string' && user.Active.trim().toLowerCase() === 'yes'),
		});
	};

	const handleCancelEdit = () => {
		setEditingUser(null);
		setEditFormData(null);
	};

	const handleUpdateUser = async (userId: string) => {
		if (!editFormData) return;

		try {
			setUpdating(true);
			const response = await fetch("/api/users", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email_address: userId,
					UserId: userId,
					UserFullName: editFormData.UserFullName,
					UserType: editFormData.UserType,
					Designation: editFormData.Designation,
					Active: editFormData.Active,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to update user");
			}

			// Refresh users list
			const refreshResponse = await fetch("/api/users");
			const refreshData = await refreshResponse.json();
			if (refreshData.success) {
				setUsers(refreshData.users || []);
			}

			setEditingUser(null);
			setEditFormData(null);
		} catch (err: any) {
			console.error("Error updating user:", err);
			alert(err.message || "Failed to update user");
		} finally {
			setUpdating(false);
		}
	};

	const handleDeleteClick = (userId: string, userName: string) => {
		setDeleteConfirm({ show: true, userId, userName });
	};

	const handleConfirmDelete = async () => {
		if (!deleteConfirm.userId) return;

		try {
			setDeleting(true);
			const response = await fetch(`/api/users?userId=${encodeURIComponent(deleteConfirm.userId)}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to delete user");
			}

			// Refresh users list
			const refreshResponse = await fetch("/api/users");
			const refreshData = await refreshResponse.json();
			if (refreshData.success) {
				setUsers(refreshData.users || []);
			}

			setDeleteConfirm({ show: false, userId: null, userName: null });
		} catch (err: any) {
			console.error("Error deleting user:", err);
			alert(err.message || "Failed to delete user");
		} finally {
			setDeleting(false);
		}
	};

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
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-semibold text-gray-900">View Users</h2>
				<div className="text-sm text-gray-600">
					Total: <span className="font-semibold text-gray-900">{filteredUsers.length}</span> user{filteredUsers.length !== 1 ? "s" : ""}
				</div>
			</div>

			{/* Filters */}
			<div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search by Email, User ID or Name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
						/>
					</div>

					{/* User Type Filter */}
					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<select
							value={filterUserType}
							onChange={(e) => setFilterUserType(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm appearance-none bg-white"
						>
							<option value="">All User Types</option>
							{userTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>

					{/* Active Status Filter */}
					<select
						value={filterActive}
						onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm bg-white"
					>
						<option value="all">All Status</option>
						<option value="active">Active Only</option>
						<option value="inactive">Inactive Only</option>
					</select>
				</div>
			</div>

			{/* Users Grid View */}
			{filteredUsers.length === 0 ? (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
					<div className="flex flex-col items-center justify-center">
						<Users className="h-12 w-12 text-gray-400 mb-3" />
						<p className="text-gray-500 font-medium">No users found</p>
						<p className="text-sm text-gray-400 mt-1">
							{searchTerm || filterUserType || filterActive !== "all"
								? "Try adjusting your filters"
								: "No users in the system"}
						</p>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{filteredUsers.map((user) => {
						const userId = user.UserId || user.email_address;
						return (
							<div
								key={userId}
								className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
							>
								{editingUser === userId ? (
									<div className="space-y-4">
										<div>
											<label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
											<input
												type="text"
												value={editFormData?.UserFullName || ""}
												onChange={(e) =>
													setEditFormData({ ...editFormData, UserFullName: e.target.value })
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-500 mb-1">User Type</label>
											<select
												value={editFormData?.UserType || ""}
												onChange={(e) =>
													setEditFormData({ ...editFormData, UserType: e.target.value })
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
											>
												<option value="">Select User Type</option>
												<option value="Editor">Editor</option>
												<option value="Viewer">Viewer</option>
												<option value="Admin">Admin</option>
												<option value="Super Admin">Super Admin</option>
											</select>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
											<input
												type="text"
												value={editFormData?.Designation || ""}
												onChange={(e) =>
													setEditFormData({ ...editFormData, Designation: e.target.value })
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
											/>
										</div>
										<div className="flex items-center space-x-2 pt-2">
											<button
												onClick={() => handleUpdateUser(userId)}
												disabled={updating}
												className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
											>
												{updating ? (
													<Loader2 className="h-3 w-3 animate-spin mr-1" />
												) : (
													<Check className="h-3 w-3 mr-1" />
												)}
												Save
											</button>
											<button
												onClick={handleCancelEdit}
												disabled={updating}
												className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
											>
												<X className="h-3 w-3 mr-1" />
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div className="space-y-4">
										{/* User Full Name */}
										<div>
											<p className="text-xs font-medium text-gray-500 mb-1">Full Name</p>
											<p className="text-base font-semibold text-gray-900">
												{user.UserFullName || "N/A"}
											</p>
										</div>

										{/* User Type */}
										<div>
											<p className="text-xs font-medium text-gray-500 mb-1">User Type</p>
											<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{user.UserType || "N/A"}
											</span>
										</div>

										{/* Designation */}
										<div>
											<p className="text-xs font-medium text-gray-500 mb-1">Designation</p>
											<p className="text-sm text-gray-700">
												{user.Designation || "N/A"}
											</p>
										</div>

										{/* Email/User ID (small text) */}
										<div className="pt-2 border-t border-gray-200">
											<p className="text-xs text-gray-400">
												{user.email_address || user.UserId || "N/A"}
											</p>
										</div>

										{/* Actions */}
										<div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
											<button
												onClick={() => router.push(`/dashboard/settings/edit/${encodeURIComponent(userId)}`)}
												className="inline-flex items-center px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
												title="Full Edit"
											>
												<Edit className="h-3 w-3 mr-1" />
												Update
											</button>
											<button
												onClick={() => handleDeleteClick(userId, user.UserFullName || userId)}
												className="inline-flex items-center px-2 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
												title="Delete User"
											>
												<Trash2 className="h-3 w-3 mr-1" />
												Delete
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="p-6">
							<div className="flex items-start gap-4 mb-4">
								<div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
									<AlertTriangle className="h-6 w-6 text-red-600" />
								</div>
								<div className="flex-1">
									<h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
									<p className="text-gray-700 mb-2">
										Are you sure you want to delete user <strong>{deleteConfirm.userName}</strong>?
									</p>
									<p className="text-sm text-red-600 font-semibold">
										This action cannot be undone. All user data will be permanently deleted.
									</p>
								</div>
							</div>
							<div className="flex justify-end gap-3">
								<button
									onClick={() => setDeleteConfirm({ show: false, userId: null, userName: null })}
									disabled={deleting}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Cancel
								</button>
								<button
									onClick={handleConfirmDelete}
									disabled={deleting}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								>
									{deleting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Deleting...
										</>
									) : (
										<>
											<Trash2 className="h-4 w-4" />
											Delete User
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
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
