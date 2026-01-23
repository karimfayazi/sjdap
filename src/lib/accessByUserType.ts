/**
 * UserType-based Access Control
 * 
 * This file defines which routes each UserType can access.
 * This is checked BEFORE RBAC permission checks.
 * 
 * If a user's UserType allows access to a route, they can access it
 * regardless of their RBAC permissions.
 */

export type UserType = string;

/**
 * Map of UserType to allowed routes
 * Routes are matched using startsWith, so sub-routes are included
 */
export const USER_TYPE_ROUTE_ACCESS: Record<string, string[]> = {
	// Regional AM: Dashboard + Approval Section (3 specific routes) + Logout
	"REGIONAL AM": [
		"/dashboard",
		"/dashboard/approval-section/baseline-approval",
		"/dashboard/approval-section/family-development-plan-approval",
		"/dashboard/approval-section/intervention-approval",
		"/logout",
	],
	
	// Managment: Dashboard + Logout only
	"MANAGMENT": [
		"/dashboard",
		"/logout",
	],
	
	// JPO: Logout only
	"JPO": [
		"/logout",
	],
	
	// Finance and Administration: Dashboard + Finance routes + Logout
	"FINANCE AND ADMINISTRATION": [
		"/dashboard",
		"/dashboard/finance",
		"/dashboard/finance/loan-process",
		"/dashboard/finance/bank-information",
		"/logout",
	],
	
	// Editor: Dashboard + Program Level routes (excluding Family Income and SWB-Families) + Logout
	"EDITOR": [
		"/dashboard",
		"/dashboard/baseline-qol",
		"/dashboard/family-development-plan",
		"/dashboard/actual-intervention",
		"/dashboard/rops",
		"/logout",
	],
	
	// EDO: Dashboard + Feasibility Approval + Logout
	"EDO": [
		"/dashboard",
		"/dashboard/feasibility-approval",
		"/logout",
	],
};

/**
 * Map of routes to section names (for useSectionAccess compatibility)
 * Used when checking UserType access for section-based pages
 */
export const ROUTE_TO_SECTION: Record<string, string> = {
	"/dashboard/approval-section/baseline-approval": "BaselineApproval",
	"/dashboard/approval-section/family-development-plan-approval": "FdpApproval",
	"/dashboard/approval-section/intervention-approval": "InterventionApproval",
	"/dashboard/approval-section/feasibility-approval": "FeasibilityApproval",
	"/dashboard/approval-section/bank-account-approval": "BankAccountApproval",
	"/dashboard/family-development-plan": "Family_Development_Plan",
	"/dashboard/baseline-qol": "BaselineQOL",
	"/dashboard/actual-intervention": "ActualIntervention",
	"/dashboard/rops": "ROP",
	"/dashboard/family-income": "Family_Income",
	"/dashboard/swb-families": "SWB_Families",
	"/dashboard/feasibility-approval": "FeasibilityApproval",
	"/dashboard/finance": "FinanceSection",
	"/dashboard/finance/loan-process": "FinanceSection",
	"/dashboard/finance/bank-information": "BankInformation",
	"/dashboard/settings": "Setting",
};

/**
 * Check if a UserType has access to a specific route
 * 
 * @param userType - The UserType from database (normalized to uppercase)
 * @param route - The route path (e.g., '/dashboard/approval-section/baseline-approval')
 * @returns true if userType has access, false otherwise
 */
export function hasUserTypeAccess(userType: string | null | undefined, route: string): boolean {
	if (!userType) {
		return false;
	}
	
	const normalizedUserType = (userType ?? '').trim().toUpperCase();
	const allowedRoutes = USER_TYPE_ROUTE_ACCESS[normalizedUserType];
	
	if (!allowedRoutes || allowedRoutes.length === 0) {
		// UserType not in mapping - no special access (will fall back to RBAC)
		return false;
	}
	
	// Check if route starts with any allowed route (includes sub-routes)
	return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute));
}

/**
 * Check if a UserType has access to a specific section
 * 
 * @param userType - The UserType from database (normalized to uppercase)
 * @param section - The section name (e.g., 'FdpApproval', 'InterventionApproval')
 * @returns true if userType has access, false otherwise
 */
export function hasUserTypeSectionAccess(userType: string | null | undefined, section: string): boolean {
	if (!userType) {
		return false;
	}
	
	const normalizedUserType = (userType ?? '').trim().toUpperCase();
	const allowedRoutes = USER_TYPE_ROUTE_ACCESS[normalizedUserType];
	
	if (!allowedRoutes || allowedRoutes.length === 0) {
		return false;
	}
	
	// Find routes that map to this section
	const routesForSection = Object.entries(ROUTE_TO_SECTION)
		.filter(([_, sectionName]) => sectionName === section)
		.map(([route, _]) => route);
	
	if (routesForSection.length === 0) {
		return false;
	}
	
	// Check if any route for this section is in the allowed routes
	return routesForSection.some(route => 
		allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute))
	);
}
