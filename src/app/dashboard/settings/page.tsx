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
			if (loading) {
				setCheckingAccess(true);
				return;
			}

			setCheckingAccess(true);

			// Get userId from auth cookie first (most reliable)
			const userIdFromCookie = getUserId();

			if (!userIdFromCookie && !userProfile) {
				setAccessDenied(true);
				setShownType("Unknown");
				setCheckingAccess(false);
				return;
			}

			// Use exact logic as specified
			const normalize = (v?: string) => (v || "").trim().toLowerCase();
			const adminValues = ["super admin", "supper admin"];

			const rawType =
				userProfile?.access_level ||
				(userProfile as any)?.AccessLevel ||
				(userProfile as any)?.UserType ||
				(userProfile as any)?.userType ||
				"";

			let isSuperAdmin = adminValues.includes(normalize(rawType));
			let shownType = rawType || "Unknown";

			if (!isSuperAdmin) {
				try {
					const res = await fetch("/api/check-super-admin", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							userId: (userProfile as any)?.UserId ?? (userProfile as any)?.userId ?? userProfile?.username ?? userIdFromCookie,
							email: (userProfile as any)?.email_address ?? userProfile?.email,
						}),
					});
					const data = await res.json();
					if (data?.isSuperAdmin) {
						isSuperAdmin = true;
						shownType = data.userType || "Super Admin";
					} else if (data?.ok && data?.userType) {
						// User found but not Super Admin - use the returned userType
						shownType = data.userType;
					}
				} catch (error) {
					console.error('[SettingsPage] Error checking Super Admin status:', error);
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
