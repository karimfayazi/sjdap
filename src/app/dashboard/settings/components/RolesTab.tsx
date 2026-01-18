"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Loader2, Shield } from "lucide-react";

type Role = {
	RoleId: number;
	RoleName: string;
	RoleDescription: string | null;
	IsActive: boolean;
	CreatedAt: Date | null;
};

export default function RolesTab() {
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingRole, setEditingRole] = useState<Role | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		RoleName: "",
		RoleDescription: "",
		IsActive: true,
	});

	useEffect(() => {
		fetchRoles();
	}, []);

	const fetchRoles = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/settings/roles");
			const data = await response.json();

			if (data.success) {
				setRoles(data.roles || []);
			} else {
				setError(data.message || "Failed to fetch roles");
			}
		} catch (err: any) {
			setError(err.message || "Error fetching roles");
		} finally {
			setLoading(false);
		}
	};

	const handleAdd = () => {
		setShowAddForm(true);
		setEditingRole(null);
		setFormData({ RoleName: "", RoleDescription: "", IsActive: true });
	};

	const handleEdit = (role: Role) => {
		setEditingRole(role);
		setShowAddForm(false);
		setFormData({
			RoleName: role.RoleName,
			RoleDescription: role.RoleDescription || "",
			IsActive: role.IsActive,
		});
	};

	const handleCancel = () => {
		setEditingRole(null);
		setShowAddForm(false);
		setFormData({ RoleName: "", RoleDescription: "", IsActive: true });
	};

	const handleSave = async () => {
		if (!formData.RoleName.trim()) {
			alert("Role name is required");
			return;
		}

		try {
			setSaving(true);
			const url = "/api/settings/roles";
			const method = editingRole ? "PUT" : "POST";
			const body = editingRole
				? { ...formData, RoleId: editingRole.RoleId }
				: formData;

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (data.success) {
				await fetchRoles();
				handleCancel();
				alert(editingRole ? "Role updated successfully!" : "Role created successfully!");
			} else {
				alert(data.message || "Failed to save role");
			}
		} catch (err: any) {
			alert(err.message || "Error saving role");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (role: Role) => {
		if (!confirm(`Are you sure you want to delete role "${role.RoleName}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/settings/roles?roleId=${role.RoleId}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				await fetchRoles();
				alert("Role deleted successfully!");
			} else {
				alert(data.message || "Failed to delete role");
			}
		} catch (err: any) {
			alert(err.message || "Error deleting role");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading roles...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Roles</h2>
				<button
					onClick={handleAdd}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-colors"
				>
					<Plus className="h-4 w-4" />
					Add Role
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Add/Edit Form */}
			{(showAddForm || editingRole) && (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{editingRole ? "Edit Role" : "Add New Role"}
					</h3>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Role Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.RoleName}
								onChange={(e) => setFormData({ ...formData, RoleName: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="e.g., Editor, Viewer, Manager"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Description
							</label>
							<textarea
								value={formData.RoleDescription}
								onChange={(e) => setFormData({ ...formData, RoleDescription: e.target.value })}
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								placeholder="Role description..."
							/>
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
						<div className="flex items-center gap-3">
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
				</div>
			)}

			{/* Roles List */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Role Name
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Description
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
							{roles.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-8 text-center text-gray-500">
										<Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
										<p>No roles found</p>
									</td>
								</tr>
							) : (
								roles.map((role) => (
									<tr key={role.RoleId} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{role.RoleName}
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="text-sm text-gray-500">
												{role.RoleDescription || "—"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													role.IsActive
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{role.IsActive ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleEdit(role)}
													className="text-blue-600 hover:text-blue-800"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(role)}
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
