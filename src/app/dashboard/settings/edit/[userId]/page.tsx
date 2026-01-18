"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { isSuperUser as checkIsSuperUser } from "@/lib/auth-utils";
import { useAuth } from "@/hooks/useAuth";

// UserData type based on PE_User table structure from SJDA_Users database
type UserData = {
	USER_ID: string;
	email_address: string | null;
	USER_FULL_NAME: string | null;
	PASSWORD: string | null;
	USER_TYPE: string | null;
	DESIGNATION: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	user_create_date: string | null;
	user_update_date: string | null;
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
	const [regionalCouncils, setRegionalCouncils] = useState<any[]>([]);
	const [selectedRegionalCouncils, setSelectedRegionalCouncils] = useState<number[]>([]);
	const [loadingRegionalCouncils, setLoadingRegionalCouncils] = useState(true);

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
			const accessLevelLower = accessLevel && typeof accessLevel === 'string' ? accessLevel.trim().toLowerCase() : '';
			const isAdminByType = accessLevelLower === 'admin' || accessLevelLower === 'super admin';
			const isSuperUserByValue = checkIsSuperUser(superUserValue);
			
			// User is Admin if UserType='Admin' OR UserType='Super Admin' OR supper_user='Yes'
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
					const accessLevelLower = accessLevel && typeof accessLevel === 'string' ? accessLevel.trim().toLowerCase() : '';
					const isAdminByType = accessLevelLower === 'admin' || accessLevelLower === 'super admin';
					const isSuperUserByValue = checkIsSuperUser(su);
					
					// User is Admin if UserType='Admin' OR UserType='Super Admin' OR supper_user='Yes'
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

						// Map only fields that exist in PE_User table
						const mappedUser: UserData = {
							USER_ID: user.UserId || user.email_address || "",
							email_address: user.email_address || null,
							USER_FULL_NAME: user.UserFullName || null,
							PASSWORD: user.Password || null,
							USER_TYPE: user.UserType || null,
							DESIGNATION: user.Designation || null,
							Regional_Council: user.Regional_Council || null,
							Local_Council: user.Local_Council || null,
							user_create_date: user.user_create_date || null,
							user_update_date: user.user_update_date || null,
						};
						setFormData(mappedUser);
						
						// Extract RegionalCouncils from user data
						if (user.RegionalCouncils && Array.isArray(user.RegionalCouncils)) {
							const rcIds = user.RegionalCouncils.map((rc: any) => rc.RegionalCouncilId).filter(Boolean);
							setSelectedRegionalCouncils(rcIds);
						} else {
							setSelectedRegionalCouncils([]);
						}
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

	const handleRegionalCouncilChange = (regionalCouncilId: number, checked: boolean) => {
		if (checked) {
			setSelectedRegionalCouncils(prev => {
				if (!prev.includes(regionalCouncilId)) {
					return [...prev, regionalCouncilId];
				}
				return prev;
			});
		} else {
			setSelectedRegionalCouncils(prev => prev.filter(id => id !== regionalCouncilId));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData) return;

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			// Map form data to API format - only include fields from PE_User table
			const apiData: any = {
				UserId: formData.USER_ID,
				email_address: formData.email_address || originalUser?.email_address || formData.USER_ID,
				UserFullName: formData.USER_FULL_NAME,
				UserType: formData.USER_TYPE,
				Designation: formData.DESIGNATION,
				Regional_Council: formData.Regional_Council,
				Local_Council: formData.Local_Council,
				RegionalCouncils: selectedRegionalCouncils,
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
										Email Address <span className="text-red-500">*</span>
									</label>
									<input
										type="email"
										name="email_address"
										value={formData.email_address || ""}
										readOnly
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
										User Type <span className="text-red-500">*</span>
									</label>
									<select
										name="USER_TYPE"
										value={formData.USER_TYPE || ""}
										onChange={handleChange}
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="">Select User Type</option>
										<option value="Editor">Editor</option>
										<option value="Viewer">Viewer</option>
										<option value="Admin">Admin</option>
										<option value="Super Admin">Super Admin</option>
										<option value="Economic-Approval">Economic-Approval</option>
									</select>
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
										Created Date
									</label>
									<input
										type="text"
										value={formData.user_create_date ? new Date(formData.user_create_date).toLocaleString() : "N/A"}
										disabled
										className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Last Updated
									</label>
									<input
										type="text"
										value={formData.user_update_date ? new Date(formData.user_update_date).toLocaleString() : "N/A"}
										disabled
										className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
									/>
								</div>
							</div>
						</div>

						{/* Location Information */}
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">Location Information</h2>
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
														id={`edit-rc-${rc.RegionalCouncilId}`}
														checked={selectedRegionalCouncils.includes(rc.RegionalCouncilId)}
														onChange={(e) => handleRegionalCouncilChange(rc.RegionalCouncilId, e.target.checked)}
														className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
													/>
													<label
														htmlFor={`edit-rc-${rc.RegionalCouncilId}`}
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
									{selectedRegionalCouncils.length > 0 && (
										<div className="mt-2 text-xs text-gray-600">
											Selected: {selectedRegionalCouncils.length} regional council(s)
										</div>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Local Council (Legacy)</label>
									<input
										type="text"
										name="Local_Council"
										value={formData.Local_Council || ""}
										onChange={handleChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
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

