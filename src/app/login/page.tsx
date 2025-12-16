"use client";

import { useState } from "react";
import Link from "next/link";
import MasterLayout from "@/components/MasterLayout";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
			
			const data = await res.json().catch(() => ({}));
			
			if (!res.ok) {
				throw new Error(data?.message || "Login failed");
			}
			
			// Store user data in localStorage for fallback
			if (data.user) {
				localStorage.setItem('userData', JSON.stringify(data.user));
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
			console.error("Login error:", e); // Debug log
			const errorMessage = e instanceof Error ? e.message : "Login failed";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

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
							<div className="mt-4 text-center">
								<Link 
									href="/change-password"
									className="text-sm text-[#0b4d2b] hover:text-[#0a3d22] hover:underline font-medium"
								>
									Change Password
								</Link>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}


