"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Loader2, Key, Zap } from "lucide-react";

type Permission = {
	PermissionId: number;
	PermKey: string;
	PageId: number;
	ActionKey: string;
	IsActive: boolean;
	PageKey?: string;
	PageName?: string;
	RoutePath?: string;
	SectionKey?: string;
};

type Page = {
	PageId: number;
	PageKey: string;
	PageName: string;
	RoutePath: string;
	IsActive: boolean;
};

const ACTION_KEYS = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT"];

export default function PermissionsTab() {
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [pages, setPages] = useState<Page[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [formData, setFormData] = useState({
		PageId: "",
		ActionKey: "",
		IsActive: true,
	});

	useEffect(() => {
		fetchPermissions();
		fetchPages();
	}, []);

	const fetchPermissions = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/settings/permissions");
			const data = await response.json();

			if (data.success) {
				setPermissions(data.permissions || []);
			} else {
				setError(data.message || "Failed to fetch permissions");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching permissions");
		} finally {
			setLoading(false);
		}
	};

	const fetchPages = async () => {
		try {
			const response = await fetch("/api/settings/pages");
			const data = await response.json();
			if (data.success) {
				setPages((data.pages || []).filter((p: Page) => p.IsActive));
			}
		} catch (err) {
			console.error("Error fetching pages:", err);
		}
	};

	const handleAdd = () => {
		setShowAddForm(true);
		setEditingPermission(null);
		setFormData({ PageId: "", ActionKey: "", IsActive: true });
	};

	const handleEdit = (permission: Permission) => {
		setEditingPermission(permission);
		setShowAddForm(false);
		setFormData({
			PageId: permission.PageId.toString(),
			ActionKey: permission.ActionKey,
			IsActive: permission.IsActive,
		});
	};

	const handleCancel = () => {
		setEditingPermission(null);
		setShowAddForm(false);
		setFormData({ PageId: "", ActionKey: "", IsActive: true });
	};

	const handleSave = async () => {
		if (!formData.PageId || !formData.ActionKey) {
			alert("Page and Action are required");
			return;
		}

		try {
			setSaving(true);
			const url = "/api/settings/permissions";
			const method = editingPermission ? "PUT" : "POST";
			const body = editingPermission
				? {
						...formData,
						PermissionId: editingPermission.PermissionId,
						PageId: parseInt(formData.PageId),
				  }
				: {
						...formData,
						PageId: parseInt(formData.PageId),
				  };

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (data.success) {
				await fetchPermissions();
				handleCancel();
				alert(
					editingPermission
						? "Permission updated successfully!"
						: "Permission created successfully!"
				);
			} else {
				alert(data.message || "Failed to save permission");
			}
		} catch (err: any) {
			alert(err.message || "Error saving permission");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (permission: Permission) => {
		if (
			!confirm(
				`Are you sure you want to delete permission "${permission.PermKey}"?`
			)
		) {
			return;
		}

		try {
			const response = await fetch(
				`/api/settings/permissions?permissionId=${permission.PermissionId}`,
				{
					method: "DELETE",
				}
			);

			const data = await response.json();

			if (data.success) {
				await fetchPermissions();
				alert("Permission deleted successfully!");
			} else {
				alert(data.message || "Failed to delete permission");
			}
		} catch (err: any) {
			alert(err.message || "Error deleting permission");
		}
	};

	const handleGenerate = async (actions: string[]) => {
		if (!confirm(`Generate ${actions.join(", ")} permissions for all active pages?`)) {
			return;
		}

		try {
			setGenerating(true);
			const response = await fetch("/api/settings/permissions/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ actions }),
			});

			const data = await response.json();

			if (data.success) {
				await fetchPermissions();
				alert(
					`Generated ${data.generated} permissions! Skipped: ${data.skipped}`
				);
			} else {
				alert(data.message || "Failed to generate permissions");
			}
		} catch (err: any) {
			alert(err.message || "Error generating permissions");
		} finally {
			setGenerating(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading permissions...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Permissions</h2>
				<div className="flex items-center gap-3">
					<button
						onClick={() => handleGenerate(["VIEW"])}
						disabled={generating}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
					>
						<Zap className="h-4 w-4" />
						Generate VIEW
					</button>
					<button
						onClick={() => handleGenerate(ACTION_KEYS)}
						disabled={generating}
						className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
					>
						<Zap className="h-4 w-4" />
						Generate All Actions
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add Permission
					</button>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Add/Edit Form */}
			{(showAddForm || editingPermission) && (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{editingPermission ? "Edit Permission" : "Add New Permission"}
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Page <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.PageId}
								onChange={(e) => setFormData({ ...formData, PageId: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">Select Page</option>
								{pages.map((page) => (
									<option key={page.PageId} value={page.PageId}>
										{page.PageName} ({page.RoutePath})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Action <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.ActionKey}
								onChange={(e) => setFormData({ ...formData, ActionKey: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">Select Action</option>
								{ACTION_KEYS.map((action) => (
									<option key={action} value={action}>
										{action}
									</option>
								))}
							</select>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="isActive"
								checked={formData.IsActive}
								onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
								className="w-4 h-4 text-[#0b4d2b] rounded focus:ring-[#0b4d2b]"
							/>
							<label htmlFor="isActive" className="text-sm text-gray-700">
								Active
							</label>
						</div>
					</div>
					<div className="flex items-center gap-3 mt-4">
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
									Save
								</>
							)}
						</button>
						<button
							onClick={handleCancel}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
						>
							<X className="h-4 w-4" />
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Permissions List */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Permission Key
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Page
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Action
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Route
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{permissions.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
										<Key className="h-12 w-12 text-gray-400 mx-auto mb-3" />
										<p>No permissions found</p>
									</td>
								</tr>
							) : (
								permissions.map((permission) => (
									<tr key={permission.PermissionId} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{permission.PermKey}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{permission.PageName || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{permission.ActionKey}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-500">
												{permission.RoutePath || "—"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													permission.IsActive
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{permission.IsActive ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(permission)}
													className="text-blue-600 hover:text-blue-800"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(permission)}
													className="text-red-600 hover:text-red-800"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
