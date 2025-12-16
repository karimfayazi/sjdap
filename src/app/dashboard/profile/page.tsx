"use client";

import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
	const { userProfile, loading, error } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-64">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading your profile...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<div className="flex items-center">
					<div className="text-red-400 mr-3">
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h3 className="text-lg font-medium text-red-800">Error Loading Profile</h3>
						<p className="text-red-600">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
				<div className="text-sm text-gray-500">
					Last updated: {new Date().toLocaleDateString()}
				</div>
			</div>

			{/* Profile Card */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
					<h2 className="text-xl font-semibold text-white">Personal Information</h2>
					<p className="text-green-100">Your account details and information</p>
				</div>
				
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* User ID */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								User ID
							</label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<p className="text-sm text-gray-900 font-mono">
									{userProfile?.username || "Not available"}
								</p>
							</div>
						</div>

						{/* Full Name */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Full Name
							</label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<p className="text-sm text-gray-900">
									{userProfile?.full_name || "Not provided"}
								</p>
							</div>
						</div>

						{/* User Type */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								User Type
							</label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
									userProfile?.access_level === 'Admin' 
										? 'bg-red-100 text-red-800' 
										: 'bg-blue-100 text-blue-800'
								}`}>
									{userProfile?.access_level || "Not specified"}
								</span>
							</div>
						</div>

						{/* Designation */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Designation
							</label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<p className="text-sm text-gray-900">
									{userProfile?.department || "Not specified"}
								</p>
							</div>
						</div>
					</div>

					{/* Additional Info */}
					<div className="mt-6 pt-6 border-t border-gray-200">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
							<div className="p-4 bg-green-50 rounded-lg">
								<div className="text-2xl font-bold text-green-700">
									{userProfile?.access_level === 'Admin' ? 'Admin' : 'User'}
								</div>
								<div className="text-sm text-green-600">Account Type</div>
							</div>
							<div className="p-4 bg-blue-50 rounded-lg">
								<div className="text-2xl font-bold text-blue-700">
									{userProfile?.full_name ? '✓' : '✗'}
								</div>
								<div className="text-sm text-blue-600">Profile Complete</div>
							</div>
							<div className="p-4 bg-purple-50 rounded-lg">
								<div className="text-2xl font-bold text-purple-700">
									Active
								</div>
								<div className="text-sm text-purple-600">Account Status</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
						<div className="text-sm font-medium text-gray-900">Update Profile</div>
						<div className="text-xs text-gray-500">Edit your information</div>
					</button>
					<button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
						<div className="text-sm font-medium text-gray-900">Change Password</div>
						<div className="text-xs text-gray-500">Update your password</div>
					</button>
					<button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
						<div className="text-sm font-medium text-gray-900">View Reports</div>
						<div className="text-xs text-gray-500">Access your data</div>
					</button>
					<button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
						<div className="text-sm font-medium text-gray-900">Settings</div>
						<div className="text-xs text-gray-500">Account preferences</div>
					</button>
				</div>
			</div>
		</div>
	);
}
