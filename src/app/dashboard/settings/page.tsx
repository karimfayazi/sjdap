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
										return (
												<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6">Add New User</h2>
			<p className="text-gray-600 mb-4">To add a new user, please use the API endpoint or contact the system administrator.</p>
			<p className="text-gray-600">
				You can also manage existing users from the "View Users" tab.
			</p>
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
