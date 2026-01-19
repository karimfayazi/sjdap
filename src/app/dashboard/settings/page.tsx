"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	Users, 
	Shield, 
	FileText, 
	Key, 
	Grid3x3,
	Lock
} from "lucide-react";
import RequirePermission from "@/components/RequirePermission";

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
	const [activeTab, setActiveTab] = useState("users");

	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [searchParams]);

	const tabs = [
		{ id: "users", label: "Users", icon: Users },
		{ id: "roles", label: "Roles", icon: Shield },
		{ id: "pages", label: "Pages", icon: FileText },
		{ id: "permissions", label: "Permissions", icon: Key },
		{ id: "role-permissions", label: "Role Permissions", icon: Grid3x3 },
		{ id: "password", label: "Change Password", icon: Lock },
	];

	return (
		<RequirePermission permission="Settings">
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
		</RequirePermission>
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
