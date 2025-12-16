"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
	const router = useRouter();
	const [userId, setUserId] = useState("");
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setSuccess(false);

		if (!userId || !oldPassword || !newPassword || !confirmPassword) {
			setError("All fields are required");
			return;
		}

		if (newPassword.length < 6) {
			setError("New password must be at least 6 characters");
			return;
		}

		if (newPassword !== confirmPassword) {
			setError("New password and confirm password do not match");
			return;
		}

		if (oldPassword === newPassword) {
			setError("New password must be different from old password");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, oldPassword, newPassword }),
			});
			
			const data = await res.json().catch(() => ({}));
			
			if (!res.ok) {
				throw new Error(data?.message || "Failed to change password");
			}
			
			setSuccess(true);
			// Clear form
			setUserId("");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
			
			// Redirect to login after 2 seconds
			setTimeout(() => {
				router.push("/login");
			}, 2000);
			
		} catch (e: unknown) {
			console.error("Change password error:", e);
			const errorMessage = e instanceof Error ? e.message : "Failed to change password";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="h-full w-full bg-gray-50 flex flex-col">
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
					<div className="w-full p-8 flex flex-col justify-center">
						<h1 className="mb-6 text-2xl font-bold text-center text-gray-800">Change Password</h1>
						<form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700">User ID</label>
								<input
									type="text"
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									value={userId}
									onChange={(e) => setUserId(e.target.value)}
									placeholder="Enter User ID"
									autoComplete="off"
									required
								/>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700">Old Password</label>
								<input
									type="password"
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									placeholder="Enter old password"
									autoComplete="off"
									required
								/>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700">New Password</label>
								<input
									type="password"
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Enter new password (min. 6 characters)"
									autoComplete="new-password"
									required
								/>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700">Confirm New Password</label>
								<input
									type="password"
									className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Confirm new password"
									autoComplete="new-password"
									required
								/>
							</div>
							{error && (
								<p className="text-sm text-red-600 text-center bg-red-50 py-2 rounded-md">{error}</p>
							)}
							{success && (
								<p className="text-sm text-green-600 text-center bg-green-50 py-2 rounded-md">
									Password changed successfully! Redirecting to login...
								</p>
							)}
							<button
								type="submit"
								disabled={loading || success}
								className="w-full rounded-md bg-[#0b4d2b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a3d22] disabled:opacity-60 transition-colors shadow-md"
							>
								{loading ? "Changing Password..." : "Change Password"}
							</button>
							<div className="mt-4 text-center">
								<Link 
									href="/login"
									className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
								>
									Back to Login
								</Link>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}

