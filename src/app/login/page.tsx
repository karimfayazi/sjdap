"use client";

import { useState } from "react";
import MasterLayout from "@/components/MasterLayout";
import { X } from "lucide-react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// Change Password Modal State
	const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
	const [changePasswordUserId, setChangePasswordUserId] = useState("");
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changePasswordLoading, setChangePasswordLoading] = useState(false);
	const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
	const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		if (!email || !password) {
			setError("User ID and password are required");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			
			let data;
			try {
				data = await res.json();
			} catch (parseError) {
				// If JSON parsing fails, use default error message
				setError("Login failed - Invalid response from server");
				setLoading(false);
				return;
			}
			
			if (!res.ok) {
				// Handle error response gracefully without throwing
				const errorMessage = data?.message || "Login failed";
				setError(errorMessage);
				setLoading(false);
				return;
			}
			
			// Store user data in localStorage for fallback
			if (data.user) {
				localStorage.setItem('userData', JSON.stringify(data.user));
				// Store individual permission flags for easy access
				localStorage.setItem('super_user', String(data.user.super_user || ''));
				localStorage.setItem('baseline_qol', String(data.user.baseline_qol || ''));
				localStorage.setItem('dashboard', String(data.user.dashboard || ''));
				localStorage.setItem('power_bi', String(data.user.power_bi || ''));
				localStorage.setItem('family_development_plan', String(data.user.family_development_plan || ''));
				localStorage.setItem('family_approval_crc', String(data.user.family_approval_crc || ''));
				localStorage.setItem('family_income', String(data.user.family_income || ''));
				localStorage.setItem('rop', String(data.user.rop || ''));
				localStorage.setItem('setting', String(data.user.setting || ''));
				localStorage.setItem('other', String(data.user.other || ''));
				localStorage.setItem('swb_families', String(data.user.swb_families || ''));
				localStorage.setItem('access_loans', String(data.user.access_loans || ''));
				localStorage.setItem('baseline_access', String(data.user.baseline_access || ''));
				localStorage.setItem('bank_account', String(data.user.bank_account || ''));
			}
			
			// Redirect based on designation (EDO -> EDO dashboard, others -> main dashboard)
			const designationRaw = data.user?.designation ?? data.user?.DESIGNATION;
			const designation = (designationRaw || "").toString().trim().toUpperCase();

			if (designation === "EDO") {
				window.location.href = "/dashboard/edo/dashboard";
			} else {
				window.location.href = "/dashboard";
			}
			
		} catch (e: unknown) {
			// Only catch network errors or unexpected errors
			console.error("Login error:", e);
			const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred. Please try again.";
			setError(errorMessage);
			setLoading(false);
		}
	}

	const handleChangePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setChangePasswordError(null);
		setChangePasswordSuccess(false);

		if (!changePasswordUserId || !oldPassword || !newPassword || !confirmPassword) {
			setChangePasswordError("All fields are required");
			return;
		}

		if (newPassword !== confirmPassword) {
			setChangePasswordError("New passwords do not match");
			return;
		}

		if (newPassword.length < 6) {
			setChangePasswordError("New password must be at least 6 characters");
			return;
		}

		setChangePasswordLoading(true);
		try {
			const res = await fetch("/api/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: changePasswordUserId,
					oldPassword: oldPassword,
					newPassword: newPassword,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.message || "Failed to change password");
			}

			setChangePasswordSuccess(true);
			// Reset form
			setChangePasswordUserId("");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");

			// Close modal after 2 seconds
			setTimeout(() => {
				setShowChangePasswordModal(false);
				setChangePasswordSuccess(false);
			}, 2000);
		} catch (e: unknown) {
			console.error("Change password error:", e);
			const errorMessage = e instanceof Error ? e.message : "Failed to change password";
			setChangePasswordError(errorMessage);
		} finally {
			setChangePasswordLoading(false);
		}
	};

	const handleCloseModal = () => {
		setShowChangePasswordModal(false);
		setChangePasswordUserId("");
		setOldPassword("");
		setNewPassword("");
		setConfirmPassword("");
		setChangePasswordError(null);
		setChangePasswordSuccess(false);
	};

	return (
		<div className="h-full w-full bg-gray-50 flex flex-col">
			{/* Main Content - Takes remaining space */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
					{/* Login Form */}
					<div className="w-full p-8 flex flex-col justify-center">
					<h1 className="mb-6 text-2xl font-bold text-center text-gray-800">Sign in to SJDA</h1>
					<form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">User ID</label>
							<input
								type="text"
								className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter User ID"
								autoComplete="off"
								required
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
							<input
								type="password"
								className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="********"
								autoComplete="new-password"
								required
							/>
						</div>
							{error && (
								<p className="text-sm text-red-600 text-center bg-red-50 py-2 rounded-md">{error}</p>
							)}
							<button
								type="submit"
								disabled={loading}
								className="w-full rounded-md bg-[#0b4d2b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a3d22] disabled:opacity-60 transition-colors shadow-md"
							>
								{loading ? "Signing in..." : "Sign in"}
							</button>
							<button
								type="button"
								onClick={() => setShowChangePasswordModal(true)}
								className="w-full mt-3 rounded-md border border-[#0b4d2b] px-4 py-3 text-sm font-semibold text-[#0b4d2b] hover:bg-[#0b4d2b] hover:text-white disabled:opacity-60 transition-colors"
							>
								Change Password
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* Change Password Modal */}
			{showChangePasswordModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
							<button
								onClick={handleCloseModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Modal Body */}
						<form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
							{changePasswordSuccess && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-4">
									<p className="text-sm text-green-800 font-medium">
										Password changed successfully!
									</p>
								</div>
							)}

							{changePasswordError && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-4">
									<p className="text-sm text-red-800 font-medium">{changePasswordError}</p>
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									User ID <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={changePasswordUserId}
									onChange={(e) => setChangePasswordUserId(e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									placeholder="Enter User ID"
									required
									autoComplete="off"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Enter Old Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									placeholder="Enter old password"
									required
									autoComplete="off"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									New Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									placeholder="Enter new password"
									required
									autoComplete="new-password"
									minLength={6}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Re-type New Password <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									placeholder="Re-enter new password"
									required
									autoComplete="new-password"
									minLength={6}
								/>
							</div>

							{/* Modal Footer */}
							<div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
								<button
									type="button"
									onClick={handleCloseModal}
									disabled={changePasswordLoading}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={changePasswordLoading}
									className="px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-md hover:bg-[#0a3d22] disabled:opacity-50 transition-colors"
								>
									{changePasswordLoading ? "Saving..." : "Save"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}


