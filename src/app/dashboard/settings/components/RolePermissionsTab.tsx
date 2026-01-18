"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Grid3x3, Shield } from "lucide-react";

type Page = {
	PageId: number;
	PageKey: string;
	PageName: string;
	RoutePath: string;
	SectionKey: string | null;
	permissions: Array<{
		PermissionId: number;
		PermKey: string;
		ActionKey: string;
		IsAllowed: boolean;
	}>;
};

type Role = {
	RoleId: number;
	RoleName: string;
	RoleDescription: string | null;
	IsActive: boolean;
};

const ACTION_KEYS = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT"];

export default function RolePermissionsTab() {
	const [roles, setRoles] = useState<Role[]>([]);
	const [selectedRoleId, setSelectedRoleId] = useState<string>("");
	const [pages, setPages] = useState<Page[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [permissionChanges, setPermissionChanges] = useState<
		Map<number, boolean>
	>(new Map());

	useEffect(() => {
		fetchRoles();
	}, []);

	useEffect(() => {
		if (selectedRoleId) {
			fetchRolePermissions();
		} else {
			setPages([]);
		}
	}, [selectedRoleId]);

	const fetchRoles = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/settings/roles");
			const data = await response.json();

			if (data.success) {
				setRoles((data.roles || []).filter((r: Role) => r.IsActive));
			} else {
				setError(data.message || "Failed to fetch roles");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching roles");
		} finally {
			setLoading(false);
		}
	};

	const fetchRolePermissions = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`/api/settings/role-permissions?roleId=${selectedRoleId}`
			);
			const data = await response.json();

			if (data.success) {
				setPages(data.pages || []);
				setPermissionChanges(new Map());
			} else {
				setError(data.message || "Failed to fetch role permissions");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching role permissions");
		} finally {
			setLoading(false);
		}
	};

	const handlePermissionToggle = (permissionId: number, currentValue: boolean) => {
		const newChanges = new Map(permissionChanges);
		const newValue = !currentValue;
		newChanges.set(permissionId, newValue);
		setPermissionChanges(newChanges);
	};

	const handleSave = async () => {
		if (!selectedRoleId) {
			alert("Please select a role");
			return;
		}

		if (permissionChanges.size === 0) {
			alert("No changes to save");
			return;
		}

		try {
			setSaving(true);
			const updates = Array.from(permissionChanges.entries()).map(([permissionId, isAllowed]) => ({
				permissionId,
				isAllowed,
			}));

			const response = await fetch("/api/settings/role-permissions", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					roleId: parseInt(selectedRoleId),
					updates,
				}),
			});

			const data = await response.json();

			if (data.success) {
				await fetchRolePermissions();
				alert("Role permissions updated successfully!");
			} else {
				alert(data.message || "Failed to update role permissions");
			}
		} catch (err: any) {
			alert(err.message || "Error updating role permissions");
		} finally {
			setSaving(false);
		}
	};

	// Group pages by SectionKey
	const pagesBySection = pages.reduce((acc, page) => {
		const section = page.SectionKey || "Other";
		if (!acc[section]) {
			acc[section] = [];
		}
		acc[section].push(page);
		return acc;
	}, {} as Record<string, Page[]>);

	const getPermissionValue = (permission: { PermissionId: number; IsAllowed: boolean }) => {
		if (permissionChanges.has(permission.PermissionId)) {
			return permissionChanges.get(permission.PermissionId)!;
		}
		return permission.IsAllowed;
	};

	if (loading && !selectedRoleId) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Role Permissions Matrix</h2>
				{selectedRoleId && permissionChanges.size > 0 && (
					<button
						onClick={handleSave}
						disabled={saving}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
					>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								Save Changes ({permissionChanges.size})
							</>
						)}
					</button>
				)}
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Role Selector */}
			<div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Role
				</label>
				<select
					value={selectedRoleId}
					onChange={(e) => setSelectedRoleId(e.target.value)}
					className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
				>
					<option value="">-- Select a Role --</option>
					{roles.map((role) => (
						<option key={role.RoleId} value={role.RoleId}>
							{role.RoleName}
						</option>
					))}
				</select>
			</div>

			{/* Permissions Matrix */}
			{selectedRoleId && (
				<div className="space-y-6">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
							<span className="ml-3 text-gray-600">Loading permissions...</span>
						</div>
					) : pages.length === 0 ? (
						<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
							<Grid3x3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-gray-500">No pages found</p>
						</div>
					) : (
						Object.entries(pagesBySection).map(([section, sectionPages]) => (
							<div key={section} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
								<div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
									<h3 className="text-sm font-semibold text-gray-900 uppercase">
										{section}
									</h3>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Page
												</th>
												{ACTION_KEYS.map((action) => (
													<th
														key={action}
														className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
													>
														{action}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{sectionPages.map((page) => (
												<tr key={page.PageId} className="hover:bg-gray-50">
													<td className="px-4 py-3 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">
															{page.PageName}
														</div>
														<div className="text-xs text-gray-500">
															{page.RoutePath}
														</div>
													</td>
													{ACTION_KEYS.map((action) => {
														const permission = page.permissions.find(
															(p) => p.ActionKey === action
														);
														if (!permission) {
															return (
																<td
																	key={action}
																	className="px-4 py-3 text-center"
																>
																	<span className="text-xs text-gray-400">—</span>
																</td>
															);
														}
														const isAllowed = getPermissionValue(permission);
														return (
															<td
																key={action}
																className="px-4 py-3 text-center"
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
																	className="w-4 h-4 text-[#0b4d2b] rounded focus:ring-[#0b4d2b]"
																/>
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{!selectedRoleId && (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-gray-500">Please select a role to view and manage permissions</p>
				</div>
			)}
		</div>
	);
}
