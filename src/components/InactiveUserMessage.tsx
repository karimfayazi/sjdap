"use client";

import { AlertCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InactiveUserMessage() {
	const router = useRouter();

	const handleLogout = () => {
		// Clear auth cookie
		if (typeof document !== 'undefined') {
			document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
			// Clear localStorage
			localStorage.clear();
		}
		// Redirect to login
		router.push("/login");
	};

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
			<div className="text-center max-w-md w-full">
				<div className="mb-8">
					<div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
						<AlertCircle className="h-10 w-10 text-red-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-3">Account Inactive</h2>
					<p className="text-lg text-red-600 font-semibold mb-4">
						User is not active please contact MIS Manager
					</p>
					<p className="text-sm text-gray-600 mb-6">
						Your account has been deactivated. Please contact the MIS Manager to reactivate your account.
					</p>
				</div>
				
				<button
					onClick={handleLogout}
					className="inline-flex items-center gap-2 px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-all shadow-md hover:shadow-lg font-medium"
				>
					<LogOut className="h-5 w-5" />
					Return to Login
				</button>
			</div>
		</div>
	);
}
