"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

type AccessRestrictedProps = {
	sectionName: string;
	requiredPermission?: string;
};

export default function AccessRestricted({ 
	sectionName, 
	requiredPermission 
}: AccessRestrictedProps) {
	const router = useRouter();
	const displayPermission = requiredPermission || sectionName;

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
			<div className="max-w-2xl w-full">
				{/* Centered Card */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
					{/* Icon */}
					<div className="flex justify-center mb-6">
						<div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
							<Shield className="h-10 w-10 text-red-600" />
						</div>
					</div>

					{/* Title */}
					<h1 className="text-3xl font-bold text-gray-900 text-center mb-3">
						Access Restricted
					</h1>

					{/* Subtitle */}
					<p className="text-lg text-gray-600 text-center mb-8">
						You don&apos;t have permission to access this section.
					</p>

					{/* Permission Info */}
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
						<div className="space-y-3">
							<div>
								<span className="text-sm font-medium text-gray-700">Required Permission:</span>
								<span className="ml-2 text-sm text-gray-900 font-semibold">{displayPermission}</span>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-700">Section:</span>
								<span className="ml-2 text-sm text-gray-900 font-semibold">{sectionName}</span>
							</div>
						</div>
					</div>

					{/* Body Text */}
					<div className="mb-8">
						<p className="text-gray-700 text-center leading-relaxed">
							This section requires specific access permissions. Your account does not have the necessary permissions to view or interact with this content. Please contact your system administrator if you believe you should have access to this section.
						</p>
					</div>

					{/* Buttons */}
					<div className="flex justify-center gap-4 mb-6">
						<button
							onClick={() => router.push("/dashboard")}
							className="px-6 py-2.5 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors font-medium"
						>
							Go to Dashboard
						</button>
						<button
							onClick={() => router.back()}
							className="px-6 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
						>
							Go Back
						</button>
					</div>

					{/* Footer Note */}
					<div className="text-center">
						<p className="text-xs text-gray-500">
							Access is restricted based on your user permissions
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
