"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    ChevronRight,
    Users,
    CheckCircle,
    Activity,
    FileBarChart,
    DollarSign,
    Building2,
    Wallet,
    Folder,
} from "lucide-react";

type SidebarProps = {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
};

type NavSubItem = {
	label: string;
	href: string;
};

type NavItem = {
	label: string;
	href?: string;
	icon: React.ComponentType<{ className?: string }>;
	subItems?: NavSubItem[];
	subMenus?: {
		label: string;
		items: NavSubItem[];
	}[];
};

type NavGroup = {
	label?: string;
	items: NavItem[];
	divider?: boolean;
	collapsible?: boolean;
	defaultExpanded?: boolean;
};

const getAllNavigationGroups = (): NavGroup[] => {
	return [
		{
			divider: true,
			items: [
				{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
			],
		},
		{
			label: "Program Level",
			collapsible: true,
			defaultExpanded: true,
			divider: false,
			items: [
				{ label: "Baseline", href: "/dashboard/baseline-qol", icon: BarChart3 },
				{ label: "Family Development Plan", href: "/dashboard/family-development-plan", icon: FileText },
				{ label: "Family Approval Form", href: "/dashboard/family-approval-crc", icon: CheckCircle },
				{ label: "Actual Intervention", href: "/dashboard/actual-intervention", icon: Activity },
				{ label: "ROPs", href: "/dashboard/rops", icon: FileBarChart },
				{ label: "Family Income", href: "/dashboard/family-income", icon: DollarSign },
				{ label: "SWB-Families", href: "/dashboard/swb-families", icon: Users },
			],
		},
		{
			divider: false,
			items: [
				{
					label: "Finance",
					icon: Wallet,
					subItems: [
						{ label: "Loan Process", href: "/dashboard/finance/loan-process" },
					]
				},
				{
					label: "Bank Information",
					icon: Building2,
					subItems: [
						{ label: "Add Bank Details", href: "/dashboard/finance/bank-information/add" },
						{ label: "View Bank Details", href: "/dashboard/finance/bank-information/view" },
					]
				},
			],
		},
		{
			divider: false,
			items: [
				{
					label: "Approval Section",
					icon: CheckCircle,
					subItems: [
						{ label: "Baseline Approval", href: "/dashboard/approval-section/baseline-approval" },
						{ label: "Feasibility Approval", href: "/dashboard/feasibility-approval" },
						{ label: "Family Development Plan Approval", href: "/dashboard/approval-section/family-development-plan-approval" },
						{ label: "Intervention Approval", href: "/dashboard/approval-section/intervention-approval" },
						{ label: "Bank Account Approval", href: "/dashboard/approval-section/bank-account-approval" },
					]
				},
				{
					label: "Admin Section",
					icon: Folder,
					subItems: [
						{ label: "Setting", href: "/dashboard/settings" },
						{ label: "User Define", href: "/dashboard/admin/user-define" },
						{ label: "ROP Update", href: "/dashboard/others/rop-update" },
						{ label: "Delete All", href: "/dashboard/others/delete-all" },
					]
				},
				{ label: "Logout", href: "/logout", icon: LogOut },
			],
		},
	];
};

/**
 * Filters navigation groups based on user type.
 * - Managment: Dashboard + Logout only
 * - JPO: Logout only
 * - Finance and Administration: Dashboard + Finance group + Bank Information + Approval Section (Bank Account Approval only) + Logout
 * - Regional AM: Dashboard + Approval Section (Baseline, Family Development Plan Approval, Intervention) + Logout
 * - Editor users: Dashboard + Program Level group + Logout (NO Feasibility Approval)
 * - EDO users: Dashboard + Feasibility Approval + Logout
 * - All other users: Full menu
 */
const getVisibleNavGroups = (allGroups: NavGroup[], userType: string | null | undefined): NavGroup[] => {
	// Normalize userType for comparison (handle casing/whitespace safely)
	const normalizedUserType = (userType ?? '').trim().toUpperCase();
	
	// Helper function to find Dashboard group
	const findDashboardGroup = () => {
		return allGroups.find(group => 
			group.items.some(item => item.label === "Dashboard")
		);
	};
	
	// Helper function to find Logout item
	const findLogoutItem = () => {
		const logoutGroup = allGroups.find(group => 
			group.items.some(item => item.label === "Logout")
		);
		return logoutGroup?.items.find(item => item.label === "Logout");
	};
	
	// If userType is "Managment" (note spelling as in DB) - Dashboard + Logout only
	if (normalizedUserType === "MANAGMENT") {
		const dashboardGroup = findDashboardGroup();
		const logoutItem = findLogoutItem();
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Dashboard group
		if (dashboardGroup) {
			visibleGroups.push(dashboardGroup);
		}
		
		// Add Logout
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// If userType is "JPO" - Logout only
	if (normalizedUserType === "JPO") {
		const logoutItem = findLogoutItem();
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Logout only
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// If userType is "Finance and Administration" - Dashboard + Finance group + Bank Information + Approval Section (Bank Account Approval only) + Logout
	if (normalizedUserType === "FINANCE AND ADMINISTRATION") {
		const dashboardGroup = findDashboardGroup();
		const logoutItem = findLogoutItem();
		
		// Find Finance group (contains Finance and Bank Information items)
		const financeGroup = allGroups.find(group => 
			group.items.some(item => 
				item.label === "Finance" || item.label === "Bank Information"
			)
		);
		
		// Find "Approval Section" item and extract only "Bank Account Approval" subItem
		const approvalSectionGroup = allGroups.find(group => 
			group.items.some(item => item.label === "Approval Section")
		);
		const approvalSectionItem = approvalSectionGroup?.items.find(
			item => item.label === "Approval Section"
		);
		const bankAccountApprovalSubItem = approvalSectionItem?.subItems?.find(
			subItem => subItem.label === "Bank Account Approval"
		);
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Dashboard group
		if (dashboardGroup) {
			visibleGroups.push(dashboardGroup);
		}
		
		// Add Finance group (contains Finance and Bank Information)
		if (financeGroup) {
			visibleGroups.push(financeGroup);
		}
		
		// Add Approval Section with only Bank Account Approval
		if (approvalSectionItem && bankAccountApprovalSubItem) {
			visibleGroups.push({
				divider: false,
				items: [
					{
						label: approvalSectionItem.label,
						icon: approvalSectionItem.icon,
						subItems: [bankAccountApprovalSubItem],
					},
				],
			});
		}
		
		// Add Logout
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// If userType is "Regional AM" - Dashboard + Approval Section (3 specific items) + Logout
	if (normalizedUserType === "REGIONAL AM") {
		const dashboardGroup = findDashboardGroup();
		const logoutItem = findLogoutItem();
		
		// Find "Approval Section" item and extract only the 3 allowed subItems
		const approvalSectionGroup = allGroups.find(group => 
			group.items.some(item => item.label === "Approval Section")
		);
		const approvalSectionItem = approvalSectionGroup?.items.find(
			item => item.label === "Approval Section"
		);
		
		// Define the allowed routes for Regional AM
		const allowedRoutes = [
			"/dashboard/approval-section/baseline-approval",
			"/dashboard/approval-section/family-development-plan-approval",
			"/dashboard/approval-section/intervention-approval"
		];
		
		// Filter subItems to only include the 3 allowed routes
		const allowedSubItems = approvalSectionItem?.subItems?.filter(subItem => 
			allowedRoutes.includes(subItem.href)
		) || [];
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Dashboard group
		if (dashboardGroup) {
			visibleGroups.push(dashboardGroup);
		}
		
		// Add Approval Section with only the 3 allowed items
		if (approvalSectionItem && allowedSubItems.length > 0) {
			visibleGroups.push({
				divider: false,
				items: [
					{
						label: approvalSectionItem.label,
						icon: approvalSectionItem.icon,
						subItems: allowedSubItems,
					},
				],
			});
		}
		
		// Add Logout
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// If userType is "Editor", return only allowed groups (Dashboard + Program Level + Logout)
	// Editor should NOT see Feasibility Approval
	if (normalizedUserType === "EDITOR") {
		const dashboardGroup = findDashboardGroup();
		const programLevelGroup = allGroups.find(group => group.label === "Program Level");
		const logoutItem = findLogoutItem();
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Dashboard group
		if (dashboardGroup) {
			visibleGroups.push(dashboardGroup);
		}
		
		// Add Program Level group
		if (programLevelGroup) {
			visibleGroups.push(programLevelGroup);
		}
		
		// Add Logout
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// If userType is "EDO", return only Dashboard + Feasibility Approval + Logout
	if (normalizedUserType === "EDO") {
		const dashboardGroup = findDashboardGroup();
		const logoutItem = findLogoutItem();
		
		// Find "Approval Section" item and extract "Feasibility Approval" subItem
		const approvalSectionGroup = allGroups.find(group => 
			group.items.some(item => item.label === "Approval Section")
		);
		const approvalSectionItem = approvalSectionGroup?.items.find(
			item => item.label === "Approval Section"
		);
		const feasibilityApprovalSubItem = approvalSectionItem?.subItems?.find(
			subItem => subItem.label === "Feasibility Approval"
		);
		
		const visibleGroups: NavGroup[] = [];
		
		// Add Dashboard group
		if (dashboardGroup) {
			visibleGroups.push(dashboardGroup);
		}
		
		// Add Feasibility Approval (as a menu item with subItems)
		if (approvalSectionItem && feasibilityApprovalSubItem) {
			visibleGroups.push({
				divider: false,
				items: [
					{
						label: approvalSectionItem.label,
						icon: approvalSectionItem.icon,
						subItems: [feasibilityApprovalSubItem],
					},
				],
			});
		}
		
		// Add Logout
		if (logoutItem) {
			visibleGroups.push({
				divider: false,
				items: [logoutItem],
			});
		}
		
		return visibleGroups;
	}
	
	// For all other user types (Admin, SuperAdmin, etc.), return full menu
	return allGroups;
};

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { userProfile, loading } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
    const [expandedSubMenus, setExpandedSubMenus] = useState<{ [key: string]: boolean }>({});
    
    // Get all navigation groups (memoized since it's a pure function with no dependencies)
    const allGroups = useMemo(() => getAllNavigationGroups(), []);
    
    // Initialize expanded groups state with default expanded state
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>(() => {
		const initial: { [key: string]: boolean } = {};
		const groups = getAllNavigationGroups();
		groups.forEach((group) => {
			if (group.label && group.defaultExpanded !== false) {
				initial[group.label] = true;
			}
		});
		return initial;
	});

	// Filter navigation groups based on user type
	// Use useMemo to avoid recalculating on every render
	const GROUPS = useMemo(() => {
		// While loading, show only Dashboard and Logout
		if (loading) {
			const dashboardGroup = allGroups.find(group => 
				group.items.some(item => item.label === "Dashboard")
			);
			const logoutGroup = allGroups.find(group => 
				group.items.some(item => item.label === "Logout")
			);
			
			const loadingGroups: NavGroup[] = [];
			if (dashboardGroup) {
				loadingGroups.push(dashboardGroup);
			}
			if (logoutGroup) {
				const logoutItem = logoutGroup.items.find(item => item.label === "Logout");
				if (logoutItem) {
					loadingGroups.push({
						divider: false,
						items: [logoutItem],
					});
				}
			}
			return loadingGroups;
		}
		
		// Once profile is loaded, apply filter based on UserType
		const userType = userProfile?.access_level; // access_level contains UserType from database
		const email = userProfile?.email || '';
		
		// Debug logging: Print email + UserType used for filtering
		if (process.env.NODE_ENV === 'development' && userProfile) {
			console.log('[Sidebar] User filtering:', {
				email: email,
				userType: userType,
				normalizedUserType: (userType ?? '').trim().toUpperCase(),
				access_level: userProfile.access_level
			});
		}
		
		return getVisibleNavGroups(allGroups, userType);
	}, [userProfile?.access_level, userProfile?.email, loading, allGroups]);
    
    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    const toggleSubMenu = (label: string) => {
        setExpandedSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    return (
        <nav className={`rounded-lg border border-gray-200 bg-white p-3 text-[12px] shadow-sm transition-all ${collapsed ? "w-12" : "w-full"}`}>
            <div className="mb-2 flex items-center justify-end">
                <button
                    title={collapsed ? "Expand" : "Collapse"}
                    onClick={() => setCollapsed(!collapsed)}
                    className="rounded-md p-1 hover:bg-gray-100"
                >
                    {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </button>
            </div>
			{GROUPS.map((group, groupIdx) => {
				const isGroupExpanded = group.label 
					? (expandedGroups[group.label] ?? group.defaultExpanded ?? true)
					: true;
				const showGroupItems = !group.label || isGroupExpanded;
				
				return (
					<div key={groupIdx} className="mb-3 last:mb-0">
						{group.label && group.collapsible && (
							<button
								onClick={() => toggleGroup(group.label!)}
								className={`flex w-full items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-gray-100 font-medium text-gray-700 ${
									collapsed ? "justify-center" : ""
								}`}
							>
								{!collapsed && (
									<>
										<span className="flex-1 text-left">{group.label}</span>
										{isGroupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
									</>
								)}
							</button>
						)}
						{group.label && !group.collapsible && !collapsed && (
							<div className="px-3 py-2 font-medium text-gray-700 text-sm">
								{group.label}
							</div>
						)}
						{showGroupItems && (
							<ul className="space-y-1">
								{group.items.map((item, itemIdx) => {
							const Icon = item.icon;
							const isLogout = item.label === "Logout";
							const hasSubMenus = item.subMenus && item.subMenus.length > 0;
							const hasSubItems = item.subItems && item.subItems.length > 0;
							const isExpanded = expandedMenus[item.label];
							
							// Check if current path matches the item href or any of its subItems
							const isActive = item.href 
								? pathname === item.href 
								: hasSubItems 
									? item.subItems?.some(subItem => pathname === subItem.href) || false
									: hasSubMenus
										? item.subMenus?.some(subMenu => 
											subMenu.items.some(subItem => pathname === subItem.href)
										) || false
										: false;
							
							return (
								<li key={`${item.label}-${itemIdx}`}>
									{isLogout ? (
										<button
											onClick={async () => {
												await fetch("/api/logout", { method: "POST" });
												window.location.href = "/login";
											}}
                                            className={`flex w-full items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-md py-2 ${collapsed ? "" : "text-left"} transition-colors hover:bg-red-50 hover:text-red-700`}
										>
											<Icon className={`h-4 w-4 ${collapsed ? "flex-shrink-0" : ""}`} />
                                            <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
										</button>
									) : hasSubMenus ? (
										<>
											<button
												onClick={() => toggleMenu(item.label)}
                                                className={`flex w-full items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-md py-2 ${collapsed ? "" : "text-left"} transition-colors hover:bg-green-100`}
											>
												<Icon className={`h-4 w-4 ${collapsed ? "flex-shrink-0" : ""}`} />
                                                {!collapsed && (
													<>
														<span className="flex-1">{item.label}</span>
														{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
													</>
												)}
											</button>
											{isExpanded && !collapsed && item.subMenus && (
												<ul className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
													{item.subMenus.map((subMenu, subMenuIdx) => (
														<li key={subMenuIdx}>
															<button
																onClick={() => toggleSubMenu(subMenu.label)}
																className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-[11px] text-gray-700 transition-colors hover:bg-gray-50"
															>
																<span className="font-medium">{subMenu.label}</span>
																{expandedSubMenus[subMenu.label] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
															</button>
															{expandedSubMenus[subMenu.label] && (
																<ul className="ml-3 mt-1 space-y-0.5">
																	{subMenu.items.map((subItem, subItemIdx) => {
																		const isSubActive = pathname === subItem.href;
																		return (
																			<li key={subItemIdx}>
																				<Link
																					href={subItem.href}
																					className={`block rounded-md px-3 py-1.5 text-[11px] transition-colors ${
																						isSubActive
																							? "bg-[#0b4d2b] text-white font-medium"
																							: "text-gray-600 hover:bg-gray-50"
																					}`}
																				>
																					{subItem.label}
																				</Link>
																			</li>
																		);
																	})}
																</ul>
															)}
														</li>
													))}
												</ul>
											)}
										</>
									) : hasSubItems ? (
										<>
											<button
												onClick={() => toggleMenu(item.label)}
                                                className={`flex w-full items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-md py-2 ${collapsed ? "" : "text-left"} transition-colors ${
													isActive 
														? "bg-[#0b4d2b] text-white font-medium" 
														: "hover:bg-green-100"
												}`}
											>
												<Icon className={`h-4 w-4 ${collapsed ? "flex-shrink-0" : ""}`} />
                                                {!collapsed && (
													<>
														<span className="flex-1">{item.label}</span>
														{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
													</>
												)}
											</button>
											{isExpanded && !collapsed && item.subItems && (
												<ul className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
													{item.subItems.map((subItem, subItemIdx) => {
														const isSubActive = pathname === subItem.href;
														return (
															<li key={subItemIdx}>
																<Link
																	href={subItem.href}
																	className={`block rounded-md px-3 py-1.5 text-[11px] transition-colors ${
																		isSubActive
																			? "bg-[#0b4d2b] text-white font-medium"
																			: "text-gray-600 hover:bg-gray-50"
																	}`}
																>
																	{subItem.label}
																</Link>
															</li>
														);
													})}
												</ul>
											)}
										</>
									) : (
										<Link
											href={item.href!}
											className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-md py-2 ${collapsed ? "" : "text-left"} transition-colors ${
												isActive
													? "bg-[#0b4d2b] text-white font-medium"
													: "hover:bg-green-100"
											}`}
										>
											<Icon className={`h-4 w-4 ${collapsed ? "flex-shrink-0" : ""}`} />
											<span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
										</Link>
									)}
								</li>
							);
						})}
							</ul>
						)}
						{group.divider && groupIdx < GROUPS.length - 1 && (
							<div className="my-3 border-t border-gray-300"></div>
						)}
					</div>
				);
			})}
        </nav>
	);
}


