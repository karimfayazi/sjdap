"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type LocationHierarchy = {
	LocationId: number;
	RC: string;
	LC: string;
	JK: string;
};

type LocationFormData = {
	RC: string;
	LC: string;
	JK: string;
};

export default function AddValuesPage() {
	const router = useRouter();
	const { userProfile } = useAuth();
	const [locations, setLocations] = useState<LocationHierarchy[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [isSuperUser, setIsSuperUser] = useState(false);
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [formData, setFormData] = useState<LocationFormData>({
		RC: "",
		LC: "",
		JK: "",
	});
	const [editFormData, setEditFormData] = useState<LocationFormData>({
		RC: "",
		LC: "",
		JK: "",
	});

	// Check if user is Super User
	useEffect(() => {
		if (typeof window === "undefined") return;
		
		// Check from userProfile first
		if (userProfile?.supper_user !== null && userProfile?.supper_user !== undefined) {
			const su = userProfile.supper_user;
			const isSu =
				su === 1 ||
				su === "1" ||
				su === true ||
				su === "true" ||
				su === "Yes" ||
				su === "yes";
			setIsSuperUser(isSu);
			setCheckingAccess(false);
			return;
		}

		// Fallback to localStorage
		try {
			const stored = localStorage.getItem("userData");
			if (stored) {
				const parsed = JSON.parse(stored);
				const su = parsed.super_user;
				const isSu =
					su === 1 ||
					su === "1" ||
					su === true ||
					su === "true" ||
					su === "Yes" ||
					su === "yes";
				setIsSuperUser(isSu);
			}
		} catch {
			// ignore localStorage errors
		} finally {
			setCheckingAccess(false);
		}
	}, [userProfile]);

	useEffect(() => {
		if (!checkingAccess && isSuperUser) {
			fetchLocations();
		}
	}, [checkingAccess, isSuperUser]);

	const fetchLocations = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch("/api/location-hierarchy");
			const data = await response.json();

			if (data.success) {
				setLocations(data.data || []);
			} else {
				setError(data.message || "Failed to fetch location hierarchy");
			}
		} catch (err: any) {
			console.error("Error fetching locations:", err);
			setError(err.message || "Error fetching location hierarchy");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof LocationFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleEditInputChange = (field: keyof LocationFormData, value: string) => {
		setEditFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			if (!formData.RC || !formData.LC || !formData.JK) {
				setError("All fields are required");
				setSaving(false);
				return;
			}

			const response = await fetch("/api/location-hierarchy", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess("Location hierarchy added successfully");
				setFormData({ RC: "", LC: "", JK: "" });
				fetchLocations();
				setTimeout(() => setSuccess(null), 3000);
			} else {
				setError(data.message || "Failed to add location hierarchy");
			}
		} catch (err: any) {
			console.error("Error adding location:", err);
			setError(err.message || "Error adding location hierarchy");
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (location: LocationHierarchy) => {
		setEditingId(location.LocationId);
		setEditFormData({
			RC: location.RC,
			LC: location.LC,
			JK: location.JK,
		});
	};

	const handleUpdate = async (locationId: number) => {
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			if (!editFormData.RC || !editFormData.LC || !editFormData.JK) {
				setError("All fields are required");
				setSaving(false);
				return;
			}

			const response = await fetch("/api/location-hierarchy", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					LocationId: locationId,
					...editFormData,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess("Location hierarchy updated successfully");
				setEditingId(null);
				fetchLocations();
				setTimeout(() => setSuccess(null), 3000);
			} else {
				setError(data.message || "Failed to update location hierarchy");
			}
		} catch (err: any) {
			console.error("Error updating location:", err);
			setError(err.message || "Error updating location hierarchy");
		} finally {
			setSaving(false);
		}
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditFormData({ RC: "", LC: "", JK: "" });
	};

	const handleDelete = async (locationId: number) => {
		if (!confirm("Are you sure you want to delete this location hierarchy?")) {
			return;
		}

		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(`/api/location-hierarchy?locationId=${locationId}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				setSuccess("Location hierarchy deleted successfully");
				fetchLocations();
				setTimeout(() => setSuccess(null), 3000);
			} else {
				setError(data.message || "Failed to delete location hierarchy");
			}
		} catch (err: any) {
			console.error("Error deleting location:", err);
			setError(err.message || "Error deleting location hierarchy");
		} finally {
			setSaving(false);
		}
	};

	if (checkingAccess) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking access...</span>
				</div>
			</div>
		);
	}

	if (!isSuperUser) {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
					<div className="max-w-md mx-auto">
						<h2 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h2>
						<p className="text-red-600 mb-6">
							You don't have permission to access this page.
						</p>
						<p className="text-sm text-red-500 mb-6">
							This action requires Super User level access. Please contact your administrator if you believe this is an error.
						</p>
						<p className="text-xs text-gray-500 mb-6">
							Restricted to Super User users only
						</p>
						<button
							onClick={() => router.push("/dashboard/baseline-qol")}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to QOL
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add Values</h1>
					<p className="text-gray-600 mt-2">Manage Regional Council, Local Council, and Jamat Khana</p>
				</div>
				<button
					onClick={() => router.push("/dashboard/baseline-qol")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to List
				</button>
			</div>

			{/* Success/Error Messages */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-800">{success}</p>
				</div>
			)}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Add Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<h2 className="text-xl font-bold text-gray-900 mb-6">Add New Location Hierarchy</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Regional Council (RC) <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.RC}
								onChange={(e) => handleInputChange("RC", e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter Regional Council"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Local Council (LC) <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.LC}
								onChange={(e) => handleInputChange("LC", e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter Local Council"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Jamat Khana (JK) <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.JK}
								onChange={(e) => handleInputChange("JK", e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter Jamat Khana"
							/>
						</div>
					</div>
					<div className="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Plus className="h-4 w-4" />
							{saving ? "Adding..." : "Add Location"}
						</button>
					</div>
				</form>
			</div>

			{/* Locations Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-xl font-bold text-gray-900">Location Hierarchy List</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Location ID
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Regional Council (RC)
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Local Council (LC)
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Jamat Khana (JK)
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{locations.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-6 py-8 text-center text-gray-500">
										No location hierarchy records found
									</td>
								</tr>
							) : (
								locations.map((location) => (
									<tr key={location.LocationId} className="hover:bg-gray-50">
										{editingId === location.LocationId ? (
											<>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
													{location.LocationId}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<input
														type="text"
														value={editFormData.RC}
														onChange={(e) => handleEditInputChange("RC", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<input
														type="text"
														value={editFormData.LC}
														onChange={(e) => handleEditInputChange("LC", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<input
														type="text"
														value={editFormData.JK}
														onChange={(e) => handleEditInputChange("JK", e.target.value)}
														className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex justify-end gap-2">
														<button
															onClick={() => handleUpdate(location.LocationId)}
															disabled={saving}
															className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
														>
															<Save className="h-3 w-3" />
															Save
														</button>
														<button
															onClick={handleCancelEdit}
															disabled={saving}
															className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
														>
															<X className="h-3 w-3" />
															Cancel
														</button>
													</div>
												</td>
											</>
										) : (
											<>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
													{location.LocationId}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{location.RC}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{location.LC}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{location.JK}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex justify-end gap-2">
														<button
															onClick={() => handleEdit(location)}
															className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
														>
															<Edit2 className="h-3 w-3" />
															Edit
														</button>
														<button
															onClick={() => handleDelete(location.LocationId)}
															disabled={saving}
															className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
														>
															<Trash2 className="h-3 w-3" />
															Delete
														</button>
													</div>
												</td>
											</>
										)}
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
