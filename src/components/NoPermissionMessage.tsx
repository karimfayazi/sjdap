"use client";

import { Shield, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NoPermissionMessage() {
	const router = useRouter();

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
			<div className="text-center max-w-md w-full">
				<div className="mb-8">
					<div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
						<Shield className="h-10 w-10 text-red-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
					<p className="text-lg text-red-600 font-semibold mb-4">
						No permission this section
					</p>
					<p className="text-sm text-gray-600">
						This section is only accessible to Super Users. Please contact your administrator if you need access.
					</p>
				</div>
				
				<button
					onClick={() => router.push("/dashboard")}
					className="inline-flex items-center gap-2 px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-all shadow-md hover:shadow-lg font-medium"
				>
					<Home className="h-5 w-5" />
					Go to Dashboard
				</button>
			</div>
		</div>
	);
}
