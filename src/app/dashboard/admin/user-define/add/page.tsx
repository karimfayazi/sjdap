"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type RegionalCouncil = {
	RegionalCouncilId: number;
	RegionalCouncilCode: string;
	RegionalCouncilName: string;
};

type UserFormData = {
	email_address: string;
	UserFullName: string;
	Password: string;
	UserType: string;
	Designation: string;
	AccessScope: string;
};

function AddUserContent() {
	const router = useRouter();

	const [formData, setFormData] = useState<UserFormData>({
		email_address: "",
		UserFullName: "",
		Password: "",
		UserType: "",
		Designation: "",
		AccessScope: "",
	});
	const [regionalCouncils, setRegionalCouncils] = useState<RegionalCouncil[]>([]);
	const [selectedRegionalCouncilIds, setSelectedRegionalCouncilIds] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		const fetchRegionalCouncils = async () => {
			try {
				setLoading(true);
				setError(null);

				// Fetch all active regional councils
				const response = await fetch("/api/regional-councils");
				const data = await response.json();

				if (data.success) {
					setRegionalCouncils(data.regionalCouncils || []);
				} else {
					setError(data.message || "Failed to load regional councils");
				}
			} catch (err: any) {
				console.error("Error fetching regional councils:", err);
				setError(err.message || "Failed to load regional councils");
			} finally {
				setLoading(false);
			}
		};

		fetchRegionalCouncils();
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleRegionalCouncilChange = (regionalCouncilId: number, checked: boolean) => {
		if (checked) {
			setSelectedRegionalCouncilIds((prev) => {
				if (!prev.includes(regionalCouncilId)) {
					return [...prev, regionalCouncilId];
				}
				return prev;
			});
		} else {
			setSelectedRegionalCouncilIds((prev) => prev.filter((id) => id !== regionalCouncilId));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.UserFullName || !formData.UserType || !formData.email_address || !formData.Password) {
			setError("Full Name, Email Address, Password, and User Type are required");
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email_address)) {
			setError("Invalid email format");
			return;
		}

		// Validate AccessScope if provided
		if (formData.AccessScope && !['ALL', 'REGION', 'LOCAL'].includes(formData.AccessScope.toUpperCase())) {
			setError("AccessScope must be one of: ALL, REGION, LOCAL");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(false);

			const response = await fetch(`/api/admin/users`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email_address: formData.email_address,
					UserFullName: formData.UserFullName,
					Password: formData.Password,
					UserType: formData.UserType,
					Designation: formData.Designation || null,
					AccessScope: formData.AccessScope || null,
					RegionalCouncilIds: selectedRegionalCouncilIds,
				}),
			});

			// Safely parse response JSON
			let data;
			try {
				const responseText = await response.text();
				data = responseText ? JSON.parse(responseText) : {};
			} catch (parseError) {
				throw new Error("Failed to parse server response");
			}

			if (!response.ok) {
				// Handle API error responses (400, 404, etc.)
				const errorMessage = data.message || `Server error: ${response.status} ${response.statusText}`;
				throw new Error(errorMessage);
			}

			if (!data.success) {
				throw new Error(data.message || "Failed to create user");
			}

			setSuccess(true);
			setTimeout(() => {
				router.push("/dashboard/admin/user-define");
			}, 1500);
		} catch (err: any) {
			console.error("Error creating user:", err);
			setError(err.message || "Failed to create user");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b]" />
					<span className="text-gray-600">Loading regional councils...</span>
				</div>
			</div>
		);
	}

	return (
		<PageGuard requiredAction="edit">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							onClick={() => router.push("/dashboard/admin/user-define")}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						>
							<ArrowLeft className="h-5 w-5 text-gray-600" />
						</button>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
							<p className="text-gray-600 mt-2">Create a new user account with regional council assignments</p>
						</div>
					</div>
				</div>

				{/* Success Message */}
				{success && (
					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-green-800 font-medium">User created successfully! Redirecting...</p>
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800 font-medium">Error: {error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
					{/* Basic Information */}
					<div>
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
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
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
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
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									name="Password"
									value={formData.Password}
									onChange={handleChange}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									User Type <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="UserType"
									value={formData.UserType}
									onChange={handleChange}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
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
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Access Scope
								</label>
								<select
									name="AccessScope"
									value={formData.AccessScope}
									onChange={handleChange}
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Access Scope</option>
									<option value="ALL">ALL</option>
									<option value="REGION">REGION</option>
									<option value="LOCAL">LOCAL</option>
								</select>
							</div>
						</div>
					</div>

					{/* Regional Councils */}
					<div>
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Regional Councils</h2>
						<p className="text-sm text-gray-600 mb-4">Select one or more regional councils for this user</p>
						
						{regionalCouncils.length === 0 ? (
							<div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
								No regional councils available
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
								{regionalCouncils.map((rc) => (
									<div key={rc.RegionalCouncilId} className="flex items-start space-x-2">
										<input
											type="checkbox"
											id={`rc-${rc.RegionalCouncilId}`}
											checked={selectedRegionalCouncilIds.includes(rc.RegionalCouncilId)}
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
						
						{selectedRegionalCouncilIds.length > 0 && (
							<div className="mt-2 text-sm text-gray-600">
								Selected: {selectedRegionalCouncilIds.length} regional council(s)
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.push("/dashboard/admin/user-define")}
							disabled={saving}
							className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{saving ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4" />
									Create User
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</PageGuard>
	);
}

export default function AddUserPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b]" />
				</div>
			}
		>
			<AddUserContent />
		</Suspense>
	);
}
