"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import { hasLoanAccess as checkLoanAccess } from "@/lib/loan-access-utils";
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
    FileCheck,
    CheckCircle,
    Activity,
    FileBarChart,
    DollarSign,
    TrendingUp,
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
	items: NavItem[];
	divider?: boolean;
};

const getNavigationGroups = (
	userSection?: string | null, 
	isLoading?: boolean,
	accessLoans?: boolean | number | string | null,
	bankAccount?: boolean | number | string | null
): NavGroup[] => {
	// If still loading user data, return minimal navigation
	if (isLoading) {
		return [
			{
				divider: true,
				items: [
					{ label: "Baseline QOL", href: "/dashboard/baseline-qol", icon: BarChart3 },
					{ label: "Logout", href: "/logout", icon: LogOut },
				],
			},
		];
	}

	// Check permissions - normalize to boolean
	const hasLoanAccess = 
		accessLoans === "Yes" || 
		accessLoans === "yes" || 
		accessLoans === 1 || 
		accessLoans === true ||
		accessLoans === "1";
	
	const hasBankAccountAccess = 
		bankAccount === "Yes" || 
		bankAccount === "yes" || 
		bankAccount === 1 || 
		bankAccount === true ||
		bankAccount === "1";

	// Default navigation - show all menus but access will be restricted
	return [
		{
			divider: true,
			items: [
				{ label: "Baseline QOL", href: "/dashboard/baseline-qol", icon: BarChart3 },
				{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
				{ label: "Power BI", href: "/dashboard/power-bi", icon: TrendingUp },
				{ label: "QOL-Baseline", href: "/dashboard/qol-baseline", icon: BarChart3 },
				{ label: "Family Development Plan", href: "/dashboard/family-development-plan", icon: FileText },
				{ label: "Family Approval from CRC", href: "/dashboard/family-approval-crc", icon: CheckCircle },
				{ label: "Actual Intervention", href: "/dashboard/actual-intervention", icon: Activity },
				{ label: "ROPs", href: "/dashboard/rops", icon: FileBarChart },
				{ label: "Family Income", href: "/dashboard/family-income", icon: DollarSign },
				{ label: "SWB-Families", href: "/dashboard/swb-families", icon: Users },
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
			divider: true,
			items: [
				{ label: "Setting", href: "/dashboard/settings", icon: Settings },
				{
					label: "Others",
					icon: Folder,
					subItems: [
						{ label: "ROP Update", href: "/dashboard/others/rop-update" },
					]
				},
				{ label: "Logout", href: "/logout", icon: LogOut },
			],
		},
	];
	};

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
	const { userProfile, loading } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
	const [effectiveSection, setEffectiveSection] = useState<string | null | undefined>(userProfile?.section);

	// Derive section from profile or from localStorage fallback
	useEffect(() => {
		if (userProfile?.section) {
			setEffectiveSection(userProfile.section);
			return;
		}

		if (typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem("userData");
				if (stored) {
					const parsed = JSON.parse(stored);
					if (parsed.section) {
						setEffectiveSection(parsed.section);
					}
				}
			} catch {
				// ignore JSON errors
			}
		}
	}, [userProfile?.section]);

	// Check permissions using utility functions
	// When access_loans = 'Yes' in database, user can access Loan Process section
	// The checkLoanAccess function handles: "Yes", "yes", 1, true, "1", etc.
	const hasLoanAccess = checkLoanAccess(userProfile?.access_loans);
	
	const hasBankAccountAccess = 
		userProfile?.bank_account === "Yes" || 
		userProfile?.bank_account === "yes" || 
		userProfile?.bank_account === 1 || 
		userProfile?.bank_account === true ||
		userProfile?.bank_account === "1";

	// Check if user is super user (has full access)
	const supperUserValue = userProfile?.supper_user;
	const userIsSuperUser = isSuperUser(supperUserValue);

	// Debug logging for admin user or users with loan access
	if (typeof window !== "undefined") {
		const isAdmin = userProfile?.username?.toLowerCase() === 'admin';
		if (isAdmin || hasLoanAccess || process.env.NODE_ENV === "development") {
			console.log("=== SIDEBAR ACCESS CHECK ===", {
				username: userProfile?.username,
				supper_user: supperUserValue,
				isSuperUser: userIsSuperUser,
				access_loans: userProfile?.access_loans,
				hasLoanAccess: hasLoanAccess,
				bank_account: userProfile?.bank_account,
				hasBankAccountAccess: hasBankAccountAccess
			});
		}
	}

	const GROUPS = getNavigationGroups(effectiveSection, loading, userProfile?.access_loans, userProfile?.bank_account);

	// Helper function to check section permission
	const hasSectionPermission = (permission: boolean | number | null | undefined): boolean => {
		if (permission === null || permission === undefined) return false;
		if (typeof permission === 'boolean') return permission;
		if (typeof permission === 'number') return permission === 1;
		return false;
	};

	// Helper function to check if a route is accessible
	const isRouteAccessible = (href: string): boolean => {
		// TEMPORARY: Allow all users to access all routes
		// TODO: Remove this bypass and restore permission checks when needed
		console.log(`✅ ALLOWING ROUTE ACCESS: ${href} for all users`);
		return true;

		// Original permission check code (commented out for now)
		/*
		// Super users (Supper_User = "Yes") have full access to ALL sections and routes
		if (userIsSuperUser) {
			return true;
		}

		// Map routes to permission fields
		const routePermissionMap: { [key: string]: boolean | number | null | undefined } = {
			"/dashboard/baseline-qol": userProfile?.BaselineQOL,
			"/dashboard": userProfile?.Dashboard,
			"/dashboard/power-bi": userProfile?.PowerBI,
			"/dashboard/family-development-plan": userProfile?.Family_Development_Plan,
			"/dashboard/family-approval-crc": userProfile?.Family_Approval_CRC,
			"/dashboard/family-income": userProfile?.Family_Income,
			"/dashboard/rops": userProfile?.ROP,
			"/dashboard/settings": userProfile?.Setting,
			"/dashboard/others/rop-update": userProfile?.Other,
			"/dashboard/swb-families": userProfile?.SWB_Families,
		};

		// Check finance routes
		if (href.startsWith("/dashboard/finance/loan-process")) {
			return hasLoanAccess;
		}
		if (href.startsWith("/dashboard/finance/bank-information")) {
			return hasBankAccountAccess;
		}

		// Check exact route match first
		if (routePermissionMap[href] !== undefined) {
			return hasSectionPermission(routePermissionMap[href]);
		}

		// Check route starts with any mapped route
		for (const [route, permission] of Object.entries(routePermissionMap)) {
			if (href.startsWith(route)) {
				return hasSectionPermission(permission);
			}
		}

		// Default: if no specific permission found, allow access (for backward compatibility)
		// But check if user has restricted finance access
		if (hasLoanAccess && !hasBankAccountAccess) {
			// User has only loan access, block everything else
			return false;
		}
		if (hasBankAccountAccess && !hasLoanAccess) {
			// User has only bank account access, block everything else
			return false;
		}

		// For other routes, allow if user doesn't have restricted access
		return true;
		*/
	};

	// Handle navigation with permission check
	const handleNavigation = (href: string, e?: React.MouseEvent) => {
		if (!isRouteAccessible(href)) {
			e?.preventDefault();
			alert("Access Denied: You don't have permission to access this section.");
			return false;
		}
		return true;
	};
    const [expandedSubMenus, setExpandedSubMenus] = useState<{ [key: string]: boolean }>({});
    
    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    const toggleSubMenu = (label: string) => {
        setExpandedSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
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
			{GROUPS.map((group, groupIdx) => (
				<div key={groupIdx} className="mb-3 last:mb-0">
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
																		const isAccessible = isRouteAccessible(subItem.href);
																		return (
																			<li key={subItemIdx}>
																				{isAccessible ? (
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
																				) : (
																					<span
																						onClick={(e) => {
																							e.preventDefault();
																							alert("Access Denied: You don't have permission to access this section.");
																						}}
																						className="block rounded-md px-3 py-1.5 text-[11px] text-gray-400 cursor-not-allowed opacity-50"
																						title="Access Denied"
																					>
																						{subItem.label}
																					</span>
																				)}
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
														const isAccessible = isRouteAccessible(subItem.href);
														return (
															<li key={subItemIdx}>
																{isAccessible ? (
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
																) : (
																	<span
																		onClick={(e) => {
																			e.preventDefault();
																			alert("Access Denied: You don't have permission to access this section.");
																		}}
																		className="block rounded-md px-3 py-1.5 text-[11px] text-gray-400 cursor-not-allowed opacity-50"
																		title="Access Denied"
																	>
																		{subItem.label}
																	</span>
																)}
															</li>
														);
													})}
												</ul>
											)}
										</>
									) : (
										(() => {
											const isAccessible = item.href ? isRouteAccessible(item.href) : true;
											return isAccessible ? (
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
											) : (
												<span
													onClick={(e) => {
														e.preventDefault();
														alert("Access Denied: You don't have permission to access this section.");
													}}
													className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-2 px-3"} rounded-md py-2 ${collapsed ? "" : "text-left"} text-gray-400 cursor-not-allowed opacity-50`}
													title="Access Denied"
												>
													<Icon className={`h-4 w-4 ${collapsed ? "flex-shrink-0" : ""}`} />
													<span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
												</span>
											);
										})()
									)}
								</li>
							);
						})}
					</ul>
					{group.divider && groupIdx < GROUPS.length - 1 && (
						<div className="my-3 border-t border-gray-300"></div>
					)}
				</div>
			))}
        </nav>
	);
}


