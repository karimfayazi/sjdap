"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit2, Trash2, RefreshCw, X } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type User = {
	UserId: number;
	email_address: string;
	UserFullName: string;
	UserType: string;
	Designation: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	AccessScope: string | null;
	user_create_date: string | null;
	user_update_date: string | null;
};

type UserFormData = {
	email_address: string;
	UserFullName: string;
	Password: string;
	UserType: string;
	Designation: string;
	Regional_Council: string;
	Local_Council: string;
	AccessScope: string;
};

export default function UserDefinePage() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	
	// Search and filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		userType: "",
		accessScope: "",
		regionalCouncil: "",
	});

	// Modal states
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Form data
	const [formData, setFormData] = useState<UserFormData>({
		email_address: "",
		UserFullName: "",
		Password: "",
		UserType: "",
		Designation: "",
		Regional_Council: "",
		Local_Council: "",
		AccessScope: "",
	});

	// Unique values for dropdowns
	const [userTypes, setUserTypes] = useState<string[]>([]);
	const [accessScopes, setAccessScopes] = useState<string[]>([]);
	const [regionalCouncils, setRegionalCouncils] = useState<string[]>([]);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();
			if (searchTerm) params.append("search", searchTerm);
			if (filters.userType) params.append("userType", filters.userType);
			if (filters.accessScope) params.append("accessScope", filters.accessScope);
			if (filters.regionalCouncil) params.append("regionalCouncil", filters.regionalCouncil);

			const response = await fetch(`/api/admin/users?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const users: User[] = (data.users || []) as User[];
				setUsers(users);
				
				// Extract unique values for dropdowns
				const uniqueUserTypes: string[] = Array.from(new Set(users.map((u) => u.UserType).filter((v): v is string => Boolean(v))));
				const uniqueAccessScopes: string[] = Array.from(new Set(users.map((u) => u.AccessScope).filter((v): v is string => Boolean(v))));
				const uniqueRegionalCouncils: string[] = Array.from(new Set(users.map((u) => u.Regional_Council).filter((v): v is string => Boolean(v))));
				
				setUserTypes(uniqueUserTypes.sort());
				setAccessScopes(uniqueAccessScopes.sort());
				setRegionalCouncils(uniqueRegionalCouncils.sort());
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

	const handleAdd = () => {
		// Navigate to add page instead of opening modal
		router.push("/dashboard/admin/user-define/add");
	};

	const handleEdit = (user: User) => {
		// Navigate to edit page instead of opening modal
		router.push(`/dashboard/admin/user-define/edit/${user.UserId}`);
	};

	const handleDelete = (userId: number) => {
		setDeletingUserId(userId);
		setShowDeleteModal(true);
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);

			// Validation
			if (!formData.email_address || !formData.UserFullName || !formData.UserType) {
				setError("email_address, UserFullName, and UserType are required");
				return;
			}

			// Email validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(formData.email_address)) {
				setError("Invalid email format");
				return;
			}

			// Password required for new users
			if (!editingUser && !formData.Password) {
				setError("Password is required for new users");
				return;
			}

			// AccessScope validation
			if (formData.AccessScope && !['ALL', 'REGION', 'LOCAL'].includes(formData.AccessScope.toUpperCase())) {
				setError("AccessScope must be one of: ALL, REGION, LOCAL");
				return;
			}

			const url = editingUser 
				? `/api/admin/users/${editingUser.UserId}`
				: `/api/admin/users`;
			
			const method = editingUser ? "PUT" : "POST";
			
			const body = editingUser
				? {
						...formData,
						// Only include password if provided
						...(formData.Password ? { Password: formData.Password } : {}),
				  }
				: formData;

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (data.success) {
				setSuccessMessage(editingUser ? "User updated successfully!" : "User created successfully!");
				setShowAddModal(false);
				setShowEditModal(false);
				setFormData({
					email_address: "",
					UserFullName: "",
					Password: "",
					UserType: "",
					Designation: "",
					Regional_Council: "",
					Local_Council: "",
					AccessScope: "",
				});
				setEditingUser(null);
				await fetchUsers();
				
				// Clear success message after 3 seconds
				setTimeout(() => setSuccessMessage(null), 3000);
			} else {
				setError(data.message || "Failed to save user");
			}
		} catch (err: any) {
			console.error("Error saving user:", err);
			setError(err.message || "Error saving user");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingUserId) return;

		try {
			setDeleting(true);
			setError(null);

			const response = await fetch(`/api/admin/users/${deletingUserId}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				setSuccessMessage("User deleted successfully!");
				setShowDeleteModal(false);
				setDeletingUserId(null);
				await fetchUsers();
				
				// Clear success message after 3 seconds
				setTimeout(() => setSuccessMessage(null), 3000);
			} else {
				setError(data.message || "Failed to delete user");
			}
		} catch (err: any) {
			console.error("Error deleting user:", err);
			setError(err.message || "Error deleting user");
		} finally {
			setDeleting(false);
		}
	};

	const handleCancel = () => {
		setShowAddModal(false);
		setShowEditModal(false);
		setFormData({
			email_address: "",
			UserFullName: "",
			Password: "",
			UserType: "",
			Designation: "",
			Regional_Council: "",
			Local_Council: "",
			AccessScope: "",
		});
		setEditingUser(null);
		setError(null);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + " " + date.toLocaleTimeString();
		} catch {
			return dateString;
		}
	};

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">User Define</h1>
					<p className="text-gray-600 mt-2">Manage system users</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchUsers}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={handleAdd}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Plus className="h-4 w-4" />
						Add User
					</button>
				</div>
			</div>

			{/* Success/Error Messages */}
			{successMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">{successMessage}</p>
				</div>
			)}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search by email, full name, or user type..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								fetchUsers();
							}
						}}
						className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<select
						value={filters.userType}
						onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All User Types</option>
						{userTypes.map((type) => (
							<option key={type} value={type}>{type}</option>
						))}
					</select>

					<select
						value={filters.accessScope}
						onChange={(e) => setFilters({ ...filters, accessScope: e.target.value })}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All Access Scopes</option>
						{accessScopes.map((scope) => (
							<option key={scope} value={scope}>{scope}</option>
						))}
					</select>

					<select
						value={filters.regionalCouncil}
						onChange={(e) => setFilters({ ...filters, regionalCouncil: e.target.value })}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All Regional Councils</option>
						{regionalCouncils.map((council) => (
							<option key={council} value={council}>{council}</option>
						))}
					</select>
				</div>
				
				<div className="flex gap-2">
					<button
						onClick={fetchUsers}
						className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						Apply Filters
					</button>
					<button
						onClick={() => {
							setSearchTerm("");
							setFilters({ userType: "", accessScope: "", regionalCouncil: "" });
							fetchUsers();
						}}
						className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading users...</span>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Scope</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{users.length === 0 ? (
									<tr>
										<td colSpan={11} className="px-4 py-8 text-center text-gray-500">
											No users found
										</td>
									</tr>
								) : (
									users.map((user) => (
										<tr key={user.UserId} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												<div className="flex items-center gap-2">
													<button
														onClick={() => handleEdit(user)}
														className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDelete(user.UserId)}
														className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.UserId}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.email_address}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.UserFullName}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.UserType}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.Designation || "N/A"}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.Regional_Council || "N/A"}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.Local_Council || "N/A"}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{user.AccessScope || "N/A"}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(user.user_create_date)}</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(user.user_update_date)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Add/Edit Modal */}
			{(showAddModal || showEditModal) && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6 border-b border-gray-200 flex justify-between items-center">
							<h3 className="text-lg font-semibold text-gray-900">
								{editingUser ? "Edit User" : "Add User"}
							</h3>
							<button
								onClick={handleCancel}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email Address <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									value={formData.email_address}
									onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Full Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.UserFullName}
									onChange={(e) => setFormData({ ...formData, UserFullName: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password {!editingUser && <span className="text-red-500">*</span>}
									{editingUser && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
								</label>
								<input
									type="password"
									value={formData.Password}
									onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required={!editingUser}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									User Type <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.UserType}
									onChange={(e) => setFormData({ ...formData, UserType: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Designation
								</label>
								<input
									type="text"
									value={formData.Designation}
									onChange={(e) => setFormData({ ...formData, Designation: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Regional Council
								</label>
								<input
									type="text"
									value={formData.Regional_Council}
									onChange={(e) => setFormData({ ...formData, Regional_Council: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Local Council
								</label>
								<input
									type="text"
									value={formData.Local_Council}
									onChange={(e) => setFormData({ ...formData, Local_Council: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Access Scope
								</label>
								<select
									value={formData.AccessScope}
									onChange={(e) => setFormData({ ...formData, AccessScope: e.target.value })}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Access Scope</option>
									<option value="ALL">ALL</option>
									<option value="REGION">REGION</option>
									<option value="LOCAL">LOCAL</option>
								</select>
							</div>

							{error && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3">
									<p className="text-red-800 text-sm">{error}</p>
								</div>
							)}

							<div className="flex justify-end gap-3 pt-4">
								<button
									onClick={handleCancel}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
									disabled={saving}
								>
									Cancel
								</button>
								<button
									onClick={handleSave}
									disabled={saving}
									className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
								>
									{saving ? "Saving..." : "Save"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
							<p className="text-gray-600 mb-6">
								Are you sure you want to delete this user? This action cannot be undone.
							</p>
							{error && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
									<p className="text-red-800 text-sm">{error}</p>
								</div>
							)}
							<div className="flex justify-end gap-3">
								<button
									onClick={() => {
										setShowDeleteModal(false);
										setDeletingUserId(null);
										setError(null);
									}}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
									disabled={deleting}
								>
									Cancel
								</button>
								<button
									onClick={handleDeleteConfirm}
									disabled={deleting}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
								>
									{deleting ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
		</PageGuard>
	);
}
