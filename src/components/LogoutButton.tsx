"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function handleLogout() {
		setLoading(true);
		try {
			await fetch("/api/logout", { method: "POST" });
			router.replace("/login");
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			onClick={handleLogout}
			disabled={loading}
			className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
		>
			{loading ? "Logging out..." : "Logout"}
		</button>
	);
}


