"use client";

import { useState } from "react";
import { Save, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PasswordTab() {
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [formData, setFormData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const { userProfile } = useAuth();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (formData.newPassword !== formData.confirmPassword) {
			setMessage({ type: "error", text: "New passwords do not match" });
			return;
		}

		if (formData.newPassword.length < 6) {
			setMessage({ type: "error", text: "New password must be at least 6 characters" });
			return;
		}

		setSaving(true);
		setMessage(null);

		try {
			// Get user identifier (email_address or UserId)
			const userId = userProfile?.email || userProfile?.username || "";

			if (!userId) {
				setMessage({ type: "error", text: "User information not found. Please log in again." });
				setSaving(false);
				return;
			}

			const response = await fetch("/api/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: userId,
					oldPassword: formData.currentPassword,
					newPassword: formData.newPassword,
				}),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.message || "Failed to change password");
			}

			setMessage({ type: "success", text: "Password updated successfully!" });
			setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
		} catch (err: any) {
			setMessage({ type: "error", text: err.message || "Failed to change password" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			<h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
				<Lock className="h-5 w-5" />
				Change Password
			</h2>
			{message && (
				<div
					className={`mb-4 p-4 rounded-lg ${
						message.type === "success"
							? "bg-green-50 text-green-800 border border-green-200"
							: "bg-red-50 text-red-800 border border-red-200"
					}`}
				>
					{message.text}
				</div>
			)}
			<form onSubmit={handleSubmit} className="space-y-6 max-w-md">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Current Password
					</label>
					<input
						type="password"
						value={formData.currentPassword}
						onChange={(e) =>
							setFormData({ ...formData, currentPassword: e.target.value })
						}
						required
						className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						New Password
					</label>
					<input
						type="password"
						value={formData.newPassword}
						onChange={(e) =>
							setFormData({ ...formData, newPassword: e.target.value })
						}
						required
						className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Confirm New Password
					</label>
					<input
						type="password"
						value={formData.confirmPassword}
						onChange={(e) =>
							setFormData({ ...formData, confirmPassword: e.target.value })
						}
						required
						className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
					>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								Update Password
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
