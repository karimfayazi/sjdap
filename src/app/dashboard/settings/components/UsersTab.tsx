"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Check, X, Loader2, User, Shield, Key, Save } from "lucide-react";

type User = {
	UserId: number;
	email_address: string;
	UserFullName: string | null;
	UserType: string | null;
	Designation: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	AccessScope: string | null;
};

type Role = {
	RoleId: number;
	RoleName: string;
	RoleDescription: string | null;
	IsActive: boolean;
};

type Permission = {
	PermissionId: number;
	PermKey: string;
	ActionKey: string;
	PageId: number;
	IsAllowed: boolean;
};

type Page = {
	PageId: number;
	PageKey: string;
	PageName: string;
	RoutePath: string;
	SectionKey: string | null;
	permissions: Permission[];
};

const ACTION_KEYS = ["View", "Create", "Update", "Delete"];

export default function UsersTab() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterUserType, setFilterUserType] = useState("");
	const [filterRegionalCouncil, setFilterRegionalCouncil] = useState("");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [userRoles, setUserRoles] = useState<Role[]>([]);
	const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
	const [savingRoles, setSavingRoles] = useState(false);
	const [loadingUserDetails, setLoadingUserDetails] = useState(false);
	
	// Permissions state
	const [pages, setPages] = useState<Page[]>([]);
	const [permissionChanges, setPermissionChanges] = useState<Map<number, boolean>>(new Map());
	const [savingPermissions, setSavingPermissions] = useState(false);
	const [loadingPermissions, setLoadingPermissions] = useState(false);

	// Fetch users
	useEffect(() => {
		fetchUsers();
		fetchAvailableRoles();
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (searchTerm) params.append("search", searchTerm);
			if (filterUserType) params.append("userType", filterUserType);
			if (filterRegionalCouncil) params.append("regionalCouncil", filterRegionalCouncil);

			const response = await fetch(`/api/settings/users?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const usersList = data.users || [];
				console.log("[UsersTab] Raw users data sample:", usersList.length > 0 ? usersList[0] : "No users");
				
				// Validate and normalize users - ensure UserId is present and numeric
				const validUsers = usersList.map((u: any, idx: number) => {
					// Check for UserId in various possible property names (normalize casing)
					let userId = u.UserId ?? u.userId ?? u.userid ?? u.USERID ?? u.ID ?? u.id;
					
					// Convert to number if it's a valid numeric value
					if (userId !== null && userId !== undefined) {
						const numUserId = Number(userId);
						if (Number.isFinite(numUserId) && numUserId > 0) {
							userId = numUserId;
						}
					}
					
					// Log if UserId is missing
					if (userId === null || userId === undefined) {
						console.error(`[UsersTab] User at index ${idx} missing UserId:`, {
							user: u,
							keys: Object.keys(u),
							allEntries: Object.entries(u)
						});
					} else {
						// Ensure UserId is set in the standard property name as a number
						u.UserId = userId;
					}
					
					return u;
				}).filter((u: any) => {
					// Filter out users without valid UserId
					const hasUserId = u.UserId !== null && 
						u.UserId !== undefined && 
						Number.isFinite(Number(u.UserId)) && 
						Number(u.UserId) > 0;
					if (!hasUserId) {
						console.warn("[UsersTab] Filtering out user without valid UserId:", u.email_address || u.UserFullName);
					}
					return hasUserId;
				});
				
				console.log("[UsersTab] Fetched users:", validUsers.length, "valid users out of", usersList.length, "total");
				if (validUsers.length > 0) {
					console.log("[UsersTab] First user UserId:", validUsers[0].UserId, "Type:", typeof validUsers[0].UserId);
				}
				setUsers(validUsers);
			} else {
				setError(data.message || "Failed to fetch users");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching users");
		} finally {
			setLoading(false);
		}
	};

	const fetchAvailableRoles = async () => {
		try {
			const response = await fetch("/api/settings/roles");
			const data = await response.json();
			if (data.success) {
				setAvailableRoles(data.roles || []);
			}
		} catch (err) {
			console.error("Error fetching roles:", err);
		}
	};

	const handleUserClick = async (user: User) => {
		console.log("[UsersTab] clicked user", user);
		
		setError(null); // Clear previous errors
		
		try {
			// Use exact extraction code as specified
			const rawId = user?.UserId ?? (user as any)?.userId ?? (user as any)?.ID ?? (user as any)?.id;
			const userId = Number(rawId);

			if (!Number.isFinite(userId) || userId <= 0) {
				const msg = `Invalid User ID. UserId is missing or undefined. Received: ${rawId}`;
				console.error("[UsersTab] Error:", msg, { clickedUser: user });
				setError(msg);
				setLoadingUserDetails(false);
				return;
			}

			// Ensure selectedUser always has a valid numeric UserId
			const userWithValidId = { ...user, UserId: userId };
			console.log("[UsersTab] Setting selectedUser with validated UserId:", {
				userId,
				userWithValidId,
				userWithValidIdUserId: userWithValidId.UserId,
				originalUser: user
			});
			setSelectedUser(userWithValidId);
			setLoadingUserDetails(true);

			console.log("[UsersTab] Fetching user details for userId:", userId);
			
			const response = await fetch(`/api/settings/users/${userId}`);
			
			// Check response status before parsing JSON
			if (!response.ok) {
				let errorData;
				try {
					errorData = await response.json();
				} catch {
					errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
				}
				const errorMsg = errorData.message || `Failed to fetch user details (${response.status})`;
				console.error("[UsersTab] API error response:", {
					status: response.status,
					statusText: response.statusText,
					errorData,
					userId
				});
				setError(errorMsg);
				setLoadingUserDetails(false);
				return;
			}

			const data = await response.json();

			console.log("[UsersTab] API response:", data);

			if (data.success || data.ok) {
				setUserRoles(data.assignedRoles || []);
				// Filter out any undefined/null RoleIds
				const validRoleIds = (data.assignedRoles || [])
					.map((r: Role) => r.RoleId)
					.filter((id: any) => id !== null && id !== undefined && !isNaN(Number(id)));
				setSelectedRoleIds(validRoleIds);
				
			// Update selectedUser with API response data, but preserve UserId
			// CRITICAL: Always ensure UserId is preserved in selectedUser state
			if (data.user) {
				const updatedUser = { ...data.user, UserId: userId };
				console.log("[UsersTab] Updating selectedUser with API response:", {
					userId,
					apiUserHasUserId: 'UserId' in data.user,
					apiUserUserId: data.user.UserId,
					updatedUserUserId: updatedUser.UserId,
					updatedUserKeys: Object.keys(updatedUser)
				});
				setSelectedUser(updatedUser);
			} else {
				// Ensure selectedUser still has UserId even if API doesn't return user object
				console.log("[UsersTab] API didn't return user object, preserving UserId:", { userId, previousUser: user });
				setSelectedUser((prev) => {
					const preserved = prev ? { ...prev, UserId: userId } : { ...user, UserId: userId };
					console.log("[UsersTab] Preserved selectedUser:", { preserved, preservedUserId: preserved.UserId });
					return preserved;
				});
			}
			
			// Fetch user permissions
			await fetchUserPermissions(userId);
			} else {
				const errorMsg = data.message || "Failed to fetch user details";
				console.error("[UsersTab] Error:", errorMsg, data);
				setError(errorMsg);
			}
		} catch (err: any) {
			console.error("[UsersTab] Exception:", err);
			setError(err.message || "Error fetching user details");
		} finally {
			setLoadingUserDetails(false);
		}
	};

	const handleRoleToggle = (roleId: number) => {
		setSelectedRoleIds((prev) =>
			prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
		);
	};

	const fetchUserPermissions = async (userId: number) => {
		try {
			setLoadingPermissions(true);
			
			// Fetch all pages with permissions structure (use a dummy roleId to get structure)
			// We'll get all permissions and then overlay user's specific permissions
			const pagesResponse = await fetch("/api/settings/role-permissions?roleId=1");
			const pagesData = await pagesResponse.json();
			
			if (!pagesData.success) {
				console.error("[UsersTab] Failed to fetch pages structure");
				setPages([]);
				return;
			}
			
			// Fetch user's current permissions
			const userPermsResponse = await fetch(`/api/settings/user-permissions?userId=${userId}`);
			const userPermsData = await userPermsResponse.json();
			
			// Create a map of user's permissions
			const userPermsMap = new Map<number, boolean>();
			if (userPermsData.success && userPermsData.permissions) {
				for (const up of userPermsData.permissions) {
					const isAllowed = up.IsAllowed === true || up.IsAllowed === 1 || up.IsAllowed === 'Yes';
					userPermsMap.set(up.PermissionId, isAllowed);
				}
			}
			
			// Map pages with user permissions (default to false if not set)
			const pagesWithUserPerms = pagesData.pages.map((page: any) => ({
				...page,
				permissions: page.permissions.map((perm: any) => ({
					...perm,
					IsAllowed: userPermsMap.get(perm.PermissionId) || false
				}))
			}));
			
			setPages(pagesWithUserPerms);
			setPermissionChanges(new Map());
		} catch (err: any) {
			console.error("[UsersTab] Error fetching user permissions:", err);
			setPages([]);
		} finally {
			setLoadingPermissions(false);
		}
	};

	const handlePermissionToggle = (permissionId: number, currentValue: boolean) => {
		const newChanges = new Map(permissionChanges);
		const newValue = !currentValue;
		newChanges.set(permissionId, newValue);
		setPermissionChanges(newChanges);
	};

	const getPermissionValue = (permission: Permission) => {
		if (permissionChanges.has(permission.PermissionId)) {
			return permissionChanges.get(permission.PermissionId)!;
		}
		return permission.IsAllowed;
	};

	const handleSavePermissions = async () => {
		if (!selectedUser) {
			setError("No user selected. Please select a user first.");
			return;
		}

		if (permissionChanges.size === 0) {
			alert("No permission changes to save");
			return;
		}

		try {
			setSavingPermissions(true);
			setError(null);
			
			const rawId = selectedUser?.UserId ?? (selectedUser as any)?.userId ?? (selectedUser as any)?.id;
			const userId = Number(rawId);

			if (!Number.isFinite(userId) || userId <= 0) {
				const msg = `Invalid User ID format. Expected numeric UserId, got: ${rawId}`;
				setError(msg);
				setSavingPermissions(false);
				return;
			}
			
			const updates = Array.from(permissionChanges.entries()).map(([permissionId, isAllowed]) => ({
				permissionId,
				isAllowed,
			}));
			
			console.log("[UsersTab] Saving permissions:", {
				userId,
				updatesCount: updates.length,
				updates
			});
			
			const response = await fetch("/api/settings/user-permissions", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: userId,
					updates: updates
				}),
			});

			const data = await response.json();

			if (data.success) {
				await fetchUserPermissions(userId);
				alert("User permissions updated successfully!");
			} else {
				const errorMsg = data.message || "Failed to update permissions";
				setError(errorMsg);
				alert(errorMsg);
			}
		} catch (err: any) {
			const errorMsg = err.message || "Error updating permissions";
			console.error("[UsersTab] Save permissions exception:", err);
			setError(errorMsg);
			alert(errorMsg);
		} finally {
			setSavingPermissions(false);
		}
	};

	const handleSaveRoles = async () => {
		if (!selectedUser) {
			setError("No user selected. Please select a user first.");
			return;
		}

		try {
			setSavingRoles(true);
			setError(null);
			
			// Extract UserId with fallback support - use exact pattern as specified
			const rawId =
				selectedUser?.UserId ??
				(selectedUser as any)?.userId ??
				(selectedUser as any)?.id;

			// Enhanced logging to track the issue
			console.log("[UsersTab] handleSaveRoles - Full state check:", {
				selectedUser,
				hasSelectedUser: !!selectedUser,
				selectedUserKeys: selectedUser ? Object.keys(selectedUser) : [],
				rawId,
				rawIdType: typeof rawId,
				selectedUserUserId: selectedUser?.UserId,
				selectedUserUserIdType: typeof selectedUser?.UserId,
			});

			const userId = Number(rawId);

			// Debug log before save
			console.log("[UsersTab] saving for user", { selectedUser, rawId, userId, userIdIsValid: Number.isFinite(userId) && userId > 0 });

			if (!Number.isFinite(userId) || userId <= 0) {
				const msg = `Invalid User ID format. Expected numeric UserId, got: ${rawId}`;
				console.error("[UsersTab] Save Error:", msg, { 
					selectedUser, 
					selectedUserStringified: JSON.stringify(selectedUser),
					allSelectedUserProps: selectedUser ? Object.entries(selectedUser).map(([k, v]) => `${k}:${v}(${typeof v})`) : []
				});
				setError(msg);
				setSavingRoles(false);
				return;
			}
			
			// Filter out any invalid roleIds and convert to numbers before sending
			const validRoleIds = selectedRoleIds
				.filter((id) => id !== null && id !== undefined)
				.map((id) => {
					const num = typeof id === 'number' ? id : parseInt(String(id), 10);
					return isNaN(num) || num <= 0 ? null : num;
				})
				.filter((id): id is number => id !== null);
			
			console.log("[UsersTab] Saving roles - API call:", {
				userId,
				userIdType: typeof userId,
				url: `/api/settings/users/${userId}/roles`,
				selectedRoleIds,
				validRoleIds,
				payload: { roleIds: validRoleIds }
			});
			
			const response = await fetch(`/api/settings/users/${userId}/roles`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roleIds: validRoleIds }),
			});

			const data = await response.json();

			if (data.success) {
				// Refresh user details - ensure we pass the user with valid UserId
				const userWithValidId = { ...selectedUser, UserId: userId };
				await handleUserClick(userWithValidId);
				alert("Roles updated successfully!");
			} else {
				const errorMsg = data.message || "Failed to update roles";
				setError(errorMsg);
				alert(errorMsg);
			}
		} catch (err: any) {
			const errorMsg = err.message || "Error updating roles";
			console.error("[UsersTab] Save exception:", err);
			setError(errorMsg);
			alert(errorMsg);
		} finally {
			setSavingRoles(false);
		}
	};

	// Get unique values for filters
	const userTypes = Array.from(new Set(users.map((u) => u.UserType).filter((t): t is string => Boolean(t)))).sort();
	const regionalCouncils = Array.from(
		new Set(users.map((u) => u.Regional_Council).filter((c): c is string => Boolean(c)))
	).sort();

	// Filter users
	const filteredUsers = users.filter((user) => {
		const searchLower = searchTerm.toLowerCase();
		const matchesSearch =
			!searchTerm ||
			(user.email_address?.toLowerCase().includes(searchLower) ||
				user.UserFullName?.toLowerCase().includes(searchLower) ||
				String(user.UserId).includes(searchLower));
		const matchesType = !filterUserType || user.UserType === filterUserType;
		const matchesCouncil =
			!filterRegionalCouncil || user.Regional_Council === filterRegionalCouncil;
		return matchesSearch && matchesType && matchesCouncil;
	});

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading users...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Users</h2>
				<div className="text-sm text-gray-600">
					Total: <span className="font-semibold">{filteredUsers.length}</span> user
					{filteredUsers.length !== 1 ? "s" : ""}
				</div>
			</div>

			{/* Filters */}
			<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<input
						type="text"
						placeholder="Search by email or name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
					/>

					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<select
							value={filterUserType || ""}
							onChange={(e) => setFilterUserType(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
						>
							<option value="">All User Types</option>
							{userTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>

					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<select
							value={filterRegionalCouncil || ""}
							onChange={(e) => setFilterRegionalCouncil(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent text-sm"
						>
							<option value="">All Regional Councils</option>
							{regionalCouncils.map((council) => (
								<option key={council} value={council}>
									{council}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Users Grid */}
				<div className="lg:col-span-2">
					{filteredUsers.length === 0 ? (
						<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
							<User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-gray-500 font-medium">No users found</p>
						</div>
					) : (
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												User ID
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												User
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Type
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Regional Council
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{filteredUsers.map((user, index) => {
											return (
											<tr
												key={user.UserId || user.email_address || `user-${index}`}
												onClick={() => {
													// If using TanStack Table, use: onClick={() => handleUserClick(row.original)}
													// For regular table, we pass the full user object directly
													console.log("[UsersTab] row.original", user);
													handleUserClick(user);
												}}
												className={`cursor-pointer hover:bg-gray-50 ${
													selectedUser?.UserId === user.UserId ? "bg-[#0b4d2b] text-white" : ""
												}`}
											>
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="text-sm font-semibold text-gray-900">
														{user.UserId !== null && user.UserId !== undefined ? user.UserId : "N/A"}
													</div>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<div className="text-sm font-medium">
														{user.UserFullName || "N/A"}
													</div>
													<div className="text-xs text-gray-500">
														{user.email_address}
													</div>
												</td>
												<td className="px-4 py-3 whitespace-nowrap">
													<span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
														{user.UserType || "N/A"}
													</span>
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-sm">
													{user.Regional_Council || "N/A"}
												</td>
											</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Right Panel - User Details */}
				<div className="lg:col-span-1">
					{selectedUser ? (
						<div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">
								{selectedUser.UserFullName || selectedUser.email_address}
							</h3>

							{loadingUserDetails ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-6 w-6 animate-spin text-[#0b4d2b]" />
								</div>
							) : (
								<div className="space-y-6">
									{/* User Info */}
									<div>
										<h4 className="text-sm font-medium text-gray-700 mb-2">User Information</h4>
										<div className="space-y-2 text-sm">
											<div>
												<span className="text-gray-500">Email:</span>{" "}
												<span className="font-medium">{selectedUser.email_address}</span>
											</div>
											<div>
												<span className="text-gray-500">Type:</span>{" "}
												<span className="font-medium">{selectedUser.UserType || "N/A"}</span>
											</div>
											<div>
												<span className="text-gray-500">Designation:</span>{" "}
												<span className="font-medium">
													{selectedUser.Designation || "N/A"}
												</span>
											</div>
										</div>
									</div>

									{/* Assigned Roles */}
									<div>
										<h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
											<Shield className="h-4 w-4" />
											Assigned Roles
										</h4>
										<div className="space-y-2 max-h-64 overflow-y-auto">
											{availableRoles
												.filter((role) => role.RoleId !== null && role.RoleId !== undefined && !isNaN(Number(role.RoleId)))
												.map((role) => (
													<label
														key={role.RoleId}
														className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
													>
														<input
															type="checkbox"
															checked={selectedRoleIds.includes(Number(role.RoleId))}
															onChange={() => handleRoleToggle(Number(role.RoleId))}
															className="w-4 h-4 text-[#0b4d2b] rounded focus:ring-[#0b4d2b]"
														/>
														<span className="text-sm">{role.RoleName}</span>
													</label>
												))}
										</div>
										<button
											onClick={handleSaveRoles}
											disabled={savingRoles || !selectedUser || !selectedUser.UserId || !Number.isFinite(Number(selectedUser.UserId)) || Number(selectedUser.UserId) <= 0}
											className="mt-4 w-full px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
										>
											{savingRoles ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Saving...
												</>
											) : (
												<>
													<Check className="h-4 w-4" />
													Save Roles
												</>
											)}
										</button>
									</div>

									{/* User Permissions */}
									<div>
										<div className="flex items-center justify-between mb-3">
											<h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
												<Key className="h-4 w-4" />
												User Permissions
											</h4>
											{permissionChanges.size > 0 && (
												<button
													onClick={handleSavePermissions}
													disabled={savingPermissions}
													className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-[#0b4d2b] text-white rounded hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
												>
													{savingPermissions ? (
														<Loader2 className="h-3 w-3 animate-spin" />
													) : (
														<Save className="h-3 w-3" />
													)}
													Save ({permissionChanges.size})
												</button>
											)}
										</div>
										{loadingPermissions ? (
											<div className="flex items-center justify-center py-4">
												<Loader2 className="h-4 w-4 animate-spin text-[#0b4d2b]" />
												<span className="ml-2 text-xs text-gray-600">Loading permissions...</span>
											</div>
										) : pages.length === 0 ? (
											<p className="text-xs text-gray-500">No permissions available</p>
										) : (
											<div className="space-y-3 max-h-96 overflow-y-auto">
												{Object.entries(
													pages.reduce((acc, page) => {
														const section = page.SectionKey || "Other";
														if (!acc[section]) acc[section] = [];
														acc[section].push(page);
														return acc;
													}, {} as Record<string, Page[]>)
												).map(([section, sectionPages]) => (
													<div key={section} className="border border-gray-200 rounded p-2">
														<div className="text-xs font-semibold text-gray-700 mb-2 uppercase">
															{section}
														</div>
														{sectionPages.map((page) => (
															<div key={page.PageId} className="mb-2 last:mb-0">
																<div className="text-xs font-medium text-gray-600 mb-1">
																	{page.PageName}
																</div>
																<div className="flex flex-wrap gap-2 ml-2">
																	{page.permissions.map((permission) => {
																		const isAllowed = getPermissionValue(permission);
																		return (
																			<label
																				key={permission.PermissionId}
																				className="flex items-center gap-1 text-xs cursor-pointer"
																			>
																				<input
																					type="checkbox"
																					checked={isAllowed}
																					onChange={() =>
																						handlePermissionToggle(
																							permission.PermissionId,
																							isAllowed
																						)
																					}
																					className="w-3 h-3 text-[#0b4d2b] rounded focus:ring-[#0b4d2b]"
																				/>
																				<span className="text-gray-600">{permission.ActionKey}</span>
																			</label>
																		);
																	})}
																</div>
															</div>
														))}
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
							<User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-500">Select a user to view details</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
