"use client";

import { Shield, Lock, AlertCircle } from "lucide-react";

type AccessDeniedProps = {
	action: string;
	requiredLevel?: string;
};

export default function AccessDenied({ action, requiredLevel = "Admin" }: AccessDeniedProps) {
	return (
		<div className="min-h-[400px] flex items-center justify-center p-8">
			<div className="text-center max-w-md">
				<div className="mb-6">
					<div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
						<Shield className="h-10 w-10 text-red-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600 mb-4">
						You don&apos;t have permission to {action.toLowerCase()}.
					</p>
				</div>
				
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
					<div className="flex items-start">
						<AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
						<div className="text-left">
							<h3 className="text-sm font-medium text-red-800 mb-1">
								Insufficient Permissions
							</h3>
							<p className="text-sm text-red-700">
								This action requires <span className="font-semibold">{requiredLevel}</span> level access. 
								Please contact your administrator if you believe this is an error.
							</p>
						</div>
					</div>
				</div>
				
				<div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
					<Lock className="h-4 w-4" />
					<span>Restricted to {requiredLevel} users only</span>
				</div>
			</div>
		</div>
	);
}
