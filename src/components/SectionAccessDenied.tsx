"use client";

import { Shield, Lock, AlertCircle, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SectionAccessDeniedProps = {
	sectionName: string;
	requiredPermission?: string;
	permissionValue?: any; // The actual permission value from database (1, true, 0, false, etc.)
};

export default function SectionAccessDenied({ 
	sectionName, 
	requiredPermission,
	permissionValue
}: SectionAccessDeniedProps) {
	const router = useRouter();

	// Helper function to format permission value for display
	const formatPermissionValue = (value: any): string => {
		if (value === null || value === undefined) return "Not Set (null/undefined)";
		if (typeof value === 'boolean') return value ? "true" : "false";
		if (typeof value === 'number') return value.toString();
		if (typeof value === 'string') return value;
		return String(value);
	};

	return (
		<div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
			<div className="text-center max-w-lg w-full">
				<div className="mb-8">
					<div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
						<Shield className="h-12 w-12 text-red-600" />
					</div>
					<h2 className="text-3xl font-bold text-gray-900 mb-3">Access Restricted</h2>
					<p className="text-lg text-gray-600 mb-2">
						You don't have permission to access this section.
					</p>
					{requiredPermission && (
						<p className="text-sm text-gray-500">
							Required Permission: <span className="font-semibold text-gray-700">{requiredPermission}</span>
						</p>
					)}
					{permissionValue !== undefined && (
						<p className="text-xs text-gray-400 mt-1">
							Current Value: <span className="font-mono">{formatPermissionValue(permissionValue)}</span> ({typeof permissionValue})
						</p>
					)}
				</div>
				
				<div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 mb-8 shadow-md">
					<div className="flex items-start">
						<AlertCircle className="h-6 w-6 text-red-500 mr-4 mt-1 flex-shrink-0" />
						<div className="text-left flex-1">
							<h3 className="text-base font-semibold text-red-800 mb-2">
								Section: {sectionName}
							</h3>
							<p className="text-sm text-red-700 leading-relaxed mb-4">
								This section requires specific access permissions. Your account does not have the necessary 
								permissions to view or interact with this content. Please contact your system administrator 
								if you believe you should have access to this section.
							</p>
							
							{/* Display Permission Value if provided */}
							{permissionValue !== undefined && (
								<div className="mt-4 pt-4 border-t border-red-200">
									<div className="bg-white rounded-lg p-4 border border-red-300">
										<h4 className="text-sm font-semibold text-gray-800 mb-3">Current Permission Value:</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
											<div>
												<span className="font-medium text-gray-600">Database Value:</span>
												<span className="ml-2 font-mono font-semibold text-gray-900">
													{formatPermissionValue(permissionValue)}
												</span>
											</div>
											<div>
												<span className="font-medium text-gray-600">Value Type:</span>
												<span className="ml-2 font-mono text-gray-900">
													{permissionValue !== null && permissionValue !== undefined 
														? typeof permissionValue 
														: 'N/A'}
												</span>
											</div>
										</div>
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-xs text-gray-600">
												<strong>Note:</strong> Access is granted when the permission value is <strong>1</strong> or <strong>true</strong>. 
												Current value: <strong className="text-red-700">{formatPermissionValue(permissionValue)}</strong> does not grant access.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				
				<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
					<button
						onClick={() => router.push("/dashboard")}
						className="inline-flex items-center gap-2 px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-all shadow-md hover:shadow-lg font-medium"
					>
						<Home className="h-5 w-5" />
						Go to Dashboard
					</button>
					<button
						onClick={() => router.back()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-md hover:shadow-lg font-medium"
					>
						Go Back
					</button>
				</div>
				
				<div className="mt-8 flex items-center justify-center space-x-2 text-sm text-gray-500">
					<Lock className="h-4 w-4" />
					<span>Access is restricted based on your user permissions</span>
				</div>
			</div>
		</div>
	);
}







