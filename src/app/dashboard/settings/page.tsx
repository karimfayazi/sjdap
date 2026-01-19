"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	Users, 
	Shield, 
	FileText, 
	Key, 
	Grid3x3,
	Lock,
	AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Import tab components
import UsersTab from "./components/UsersTab";
import RolesTab from "./components/RolesTab";
import PagesTab from "./components/PagesTab";
import PermissionsTab from "./components/PermissionsTab";
import RolePermissionsTab from "./components/RolePermissionsTab";
import PasswordTab from "./components/PasswordTab";

function SettingsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userProfile, loading, getUserId } = useAuth();
	const [activeTab, setActiveTab] = useState("users");
	const [accessDenied, setAccessDenied] = useState(false);
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [shownType, setShownType] = useState<string>("Unknown");

	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [searchParams]);

	// Check Super Admin access
	useEffect(() => {
		const checkSuperAdminAccess = async () => {
			// Wait for loading to complete - CRITICAL: Don't check until auth is fully loaded
			if (loading) {
				setCheckingAccess(true);
				return;
			}

			setCheckingAccess(true);

			// Get userId from auth cookie first (most reliable)
			const userIdFromCookie = getUserId();

			// Debug logging (dev only)
			if (process.env.NODE_ENV === 'development') {
				console.log('[SettingsPage] Auth state check:', {
					loading,
					userIdFromCookie,
					hasUserProfile: !!userProfile,
					userProfileKeys: userProfile ? Object.keys(userProfile) : [],
					cookies: typeof document !== 'undefined' ? document.cookie : 'N/A (SSR)',
					allCookies: typeof document !== 'undefined' ? document.cookie.split('; ') : []
				});
			}

			// If no userId from cookie AND no profile after loading is complete, check if cookie exists
			if (!userIdFromCookie && !userProfile) {
				// Double-check: maybe cookie exists but getUserId() failed to parse it
				if (typeof window !== 'undefined') {
					const allCookies = document.cookie.split('; ');
					const authCookie = allCookies.find((row) => row.startsWith("auth="));
					
					if (process.env.NODE_ENV === 'development') {
						console.log('[SettingsPage] No userId/profile found, checking cookies:', {
							authCookie,
							allCookies,
							hasAuthCookie: !!authCookie
						});
					}

					// If auth cookie exists but getUserId() returned null, there might be a parsing issue
					if (authCookie) {
						// Cookie exists but parsing failed - wait a bit and retry, or show error
						console.warn('[SettingsPage] Auth cookie exists but getUserId() returned null. Cookie:', authCookie);
						// Don't deny access yet - try to fetch profile directly
						try {
							const res = await fetch("/api/user-profile?t=" + Date.now());
							const data = await res.json();
							if (data.success && data.user) {
								// Profile exists - use it
								const profile = data.user;
								const rawType = profile.access_level || "";
								const normalize = (v?: string | null) => (v || "").trim().toLowerCase();
								const adminValues = ["super admin", "supper admin"];
								const isSuperAdmin = adminValues.includes(normalize(rawType));
								
								setShownType(rawType || "Error: UserType not found");
								setAccessDenied(!isSuperAdmin);
								setCheckingAccess(false);
								return;
							}
						} catch (error) {
							console.error('[SettingsPage] Error fetching profile as fallback:', error);
						}
					}
				}

				// Only show "Not Authenticated" if we're certain there's no session
				setAccessDenied(true);
				setShownType("Not Authenticated");
				setCheckingAccess(false);
				return;
			}

			// Use exact logic as specified
			const normalize = (v?: string | null) => (v || "").trim().toLowerCase();
			const adminValues = ["super admin", "supper admin"];

			// Read UserType from access_level (which contains UserType from database)
			// The user-profile API returns access_level: userTypeValue where userTypeValue = user.UserType
			// Use 'let' instead of 'const' because rawType may be reassigned when fetching profile
			let rawType = userProfile?.access_level || "";

			// Debug logging (dev only)
			if (process.env.NODE_ENV === 'development') {
				console.log('[SettingsPage] Checking Super Admin access:', {
					userIdFromCookie,
					hasUserProfile: !!userProfile,
					access_level: userProfile?.access_level,
					rawType,
					normalized: normalize(rawType),
					email: userProfile?.email,
					username: userProfile?.username,
					fullProfile: userProfile
				});
			}

			let isSuperAdmin = adminValues.includes(normalize(rawType));
			let shownType = rawType || "Loading...";

			// If we don't have a profile yet but have userIdFromCookie, try to fetch it
			if (!userProfile && userIdFromCookie) {
				if (process.env.NODE_ENV === 'development') {
					console.log('[SettingsPage] Profile not loaded, fetching directly...');
				}
				try {
					const res = await fetch("/api/user-profile?t=" + Date.now(), {
						credentials: 'include', // Include cookies
					});
					const data = await res.json();
					if (data.success && data.user) {
						// Use the fetched profile
						const fetchedProfile = data.user;
						const fetchedRawType = fetchedProfile.access_level || "";
						if (fetchedRawType) {
							rawType = fetchedRawType;
							isSuperAdmin = adminValues.includes(normalize(fetchedRawType));
							shownType = fetchedRawType;
							
							if (process.env.NODE_ENV === 'development') {
								console.log('[SettingsPage] Profile fetched successfully:', {
									access_level: fetchedRawType,
									isSuperAdmin
								});
							}
						}
					}
				} catch (error) {
					console.error('[SettingsPage] Error fetching profile:', error);
				}
			}

			// If not Super Admin based on access_level, check via API as fallback
			if (!isSuperAdmin) {
				try {
					const res = await fetch("/api/check-super-admin", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						credentials: 'include', // Include cookies
						body: JSON.stringify({
							userId: userProfile?.username ?? userIdFromCookie,
							email: userProfile?.email,
						}),
					});
					const data = await res.json();
					
					if (process.env.NODE_ENV === 'development') {
						console.log('[SettingsPage] check-super-admin API response:', data);
					}
					
					if (data?.isSuperAdmin) {
						isSuperAdmin = true;
						shownType = data.userType || "Super Admin";
					} else if (data?.ok && data?.userType) {
						// User found but not Super Admin - use the returned userType
						shownType = data.userType;
					} else if (data?.ok && !data?.userType && rawType) {
						// API returned ok but no userType - use rawType from profile
						shownType = rawType;
					} else if (!data?.ok && rawType) {
						// API failed but we have rawType - use it
						shownType = rawType;
					} else if (!data?.ok && !rawType) {
						// Both failed - show error message
						shownType = "Error loading user type";
					}
				} catch (error) {
					console.error('[SettingsPage] Error checking Super Admin status:', error);
					// If API call fails but we have rawType, use it
					if (rawType) {
						shownType = rawType;
					} else {
						shownType = "Error checking access";
					}
				}
			} else {
				// User is Super Admin based on access_level
				shownType = rawType; // Use the actual value from database
			}

			// Never show "Unknown" - if we have a session, we should have a userType
			if (shownType === "Unknown" || shownType === "") {
				if (userIdFromCookie || userProfile) {
					// We have a session but no userType - this is an error
					console.error('[SettingsPage] User session exists but UserType is missing:', {
						userIdFromCookie,
						userProfile,
						access_level: userProfile?.access_level
					});
					shownType = "Error: UserType not found";
				} else {
					shownType = "Not Authenticated";
				}
			}

			setShownType(shownType);
			setAccessDenied(!isSuperAdmin);
			setCheckingAccess(false);
		};

		checkSuperAdminAccess();
	}, [userProfile, loading, getUserId]);

	const tabs = [
		{ id: "users", label: "Users", icon: Users },
		{ id: "roles", label: "Roles", icon: Shield },
		{ id: "pages", label: "Pages", icon: FileText },
		{ id: "permissions", label: "Permissions", icon: Key },
		{ id: "role-permissions", label: "Role Permissions", icon: Grid3x3 },
		{ id: "password", label: "Change Password", icon: Lock },
	];

	if (loading || checkingAccess) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading...</span>
			</div>
		);
	}

	if (accessDenied) {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<div className="flex items-start gap-4">
						<AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
						<div>
							<h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
							<p className="text-red-800">
								This page is only accessible to Super Admin users or authorized personnel. Your current user type: <strong>{shownType}</strong>
							</p>
							{userProfile && (
								<div className="mt-4 p-3 bg-red-100 rounded text-xs text-red-900">
									<strong>Debug Info:</strong>
									<ul className="list-disc list-inside mt-2 space-y-1">
										<li>Username: {userProfile.username || 'N/A'}</li>
										<li>Email: {userProfile.email || 'N/A'}</li>
										<li>Access Level: {userProfile.access_level || 'null/undefined'}</li>
										<li>Full Name: {userProfile.full_name || 'N/A'}</li>
									</ul>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<div className="flex items-center gap-3 mb-2">
					<h1 className="text-3xl font-bold text-gray-900">RBAC Settings</h1>
				</div>
				<p className="text-gray-600 mt-2">Manage user access rights, roles, pages, and permissions</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8 overflow-x-auto">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<button
								key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
								}}
								className={`
									inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap
									${
										activeTab === tab.id
											? "border-[#0b4d2b] text-[#0b4d2b]"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
									}
								`}
							>
								<Icon className="h-5 w-5" />
								{tab.label}
							</button>
						);
					})}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				{activeTab === "users" && <UsersTab />}
				{activeTab === "roles" && <RolesTab />}
				{activeTab === "pages" && <PagesTab />}
				{activeTab === "permissions" && <PermissionsTab />}
				{activeTab === "role-permissions" && <RolePermissionsTab />}
				{activeTab === "password" && <PasswordTab />}
			</div>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<SettingsPageContent />
		</Suspense>
	);
}
