/**
 * Centralized Permission Service
 * 
 * This service provides a single source of truth for permission checks.
 * It ONLY uses PE_Rights_UserPermission table - NOT PE_User permission columns.
 */

import { getDb } from "./db";
import { isSuperAdmin } from "./rbac-utils";

/**
 * Route to Permission Action Key mapping
 * Maps route paths to their required action keys for permission checks
 * 
 * Default action key is "view" for most pages, but can be customized per route
 */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
	// Dashboard
	"/dashboard": "view",
	
	// Baseline QOL
	"/dashboard/baseline-qol": "view",
	"/dashboard/baseline-qol/add": "add",
	"/dashboard/baseline-qol/view": "view",
	"/dashboard/baseline-qol/edit": "edit",
	
	// Family Development Plan
	"/dashboard/family-development-plan": "view",
	"/dashboard/family-development-plan/add": "add",
	"/dashboard/family-development-plan/view": "view",
	"/dashboard/family-development-plan/edit": "edit",
	
	// Family Income
	"/dashboard/family-income": "view",
	
	// ROPs
	"/dashboard/rops": "view",
	
	// Actual Intervention
	"/dashboard/actual-intervention": "view",
	"/dashboard/actual-intervention/add": "add",
	"/dashboard/actual-intervention/view": "view",
	"/dashboard/actual-intervention/edit": "edit",
	
	// SWB Families
	"/dashboard/swb-families": "view",
	"/dashboard/swb-families/add": "add",
	"/dashboard/swb-families/view": "view",
	"/dashboard/swb-families/edit": "edit",
	
	// Finance
	"/dashboard/finance": "view",
	"/dashboard/finance/loan-process": "view",
	"/dashboard/finance/loan-process/add": "add",
	"/dashboard/finance/loan-process/view": "view",
	"/dashboard/finance/loan-process/edit": "edit",
	"/dashboard/finance/bank-information": "view",
	"/dashboard/finance/bank-information/add": "add",
	"/dashboard/finance/bank-information/view": "view",
	
	// Approval Section
	"/dashboard/approval-section": "view",
	"/dashboard/approval-section/baseline-approval": "view",
	"/dashboard/approval-section/feasibility-approval": "view",
	"/dashboard/approval-section/family-development-plan-approval": "view",
	"/dashboard/approval-section/intervention-approval": "view",
	"/dashboard/approval-section/bank-account-approval": "view",
	
	// Feasibility Approval
	"/dashboard/feasibility-approval": "view",
	"/dashboard/feasibility-approval/view": "view",
	
	// Family Approval CRC
	"/dashboard/family-approval-crc": "view",
	"/dashboard/family-approval-crc/add": "add",
	
	// Settings
	"/dashboard/settings": "view",
	"/dashboard/settings/edit": "edit",
	
	// Reports
	"/dashboard/reports": "view",
	
	// Documents
	"/dashboard/documents": "view",
	"/dashboard/documents/upload": "add",
	
	// Profile
	"/dashboard/profile": "view",
	
	// Others
	"/dashboard/others": "view",
	"/dashboard/others/rop-update": "edit",
	"/dashboard/others/delete-all": "delete",
	"/dashboard/others/delete-family": "delete",
	
	// Last Night Updates
	"/dashboard/last-night-updates": "view",
	
	// Family Status
	"/dashboard/family-status": "view",
	
	// EDO Dashboard
	"/dashboard/edo/dashboard": "view",
	
	// Families Detailed
	"/dashboard/families-detailed": "view",
};

/**
 * Get the action key for a route path
 * Falls back to "view" if route not found in map
 */
export function getActionKeyForRoute(routePath: string): string {
	// Try exact match first
	if (ROUTE_PERMISSION_MAP[routePath]) {
		return ROUTE_PERMISSION_MAP[routePath];
	}
	
	// Try to find a parent route that matches
	// Sort by length (longest first) to match most specific route
	const sortedRoutes = Object.keys(ROUTE_PERMISSION_MAP).sort((a, b) => b.length - a.length);
	for (const route of sortedRoutes) {
		if (routePath.startsWith(route)) {
			return ROUTE_PERMISSION_MAP[route];
		}
	}
	
	// Default to "view"
	return "view";
}

/**
 * Get all allowed PermissionIds for a user from PE_Rights_UserPermission
 * This is the SINGLE SOURCE OF TRUTH for user permissions
 * 
 * @param userId - User ID (numeric) or email address
 * @returns Array of allowed PermissionIds (where IsAllowed = 1 or 'Yes')
 */
export async function getAllowedPermissionIds(userId: string | number): Promise<number[]> {
	try {
		// Super Admin has all permissions (we'll return empty array and handle separately)
		if (await isSuperAdmin(userId)) {
			return []; // Empty means "all permissions" - check with isSuperAdmin separately
		}

		const pool = await getDb();
		const request = pool.request();
		
		// Handle both numeric UserId and string email_address
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		
		if (userIdNum !== null && userIdNum > 0) {
			request.input("user_id", userIdNum);
		} else {
			request.input("user_id", userId);
		}
		request.input("email_address", userId);

		// Get ONLY allowed permissions (IsAllowed = 1 or 'Yes')
		const result = await request.query(`
			SELECT DISTINCT up.[PermissionId]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
				AND (
					up.[IsAllowed] = 1 
					OR up.[IsAllowed] = 'Yes' 
					OR up.[IsAllowed] = 'yes' 
					OR up.[IsAllowed] = 'YES'
					OR up.[IsAllowed] = true
				)
				AND p.[IsActive] = 1
		`);

		const permissionIds = result.recordset.map((row: any) => row.PermissionId);
		
		// Debug logging (dev only)
		if (process.env.NODE_ENV === 'development') {
			console.log('[getAllowedPermissionIds] User:', userId, 'Allowed PermissionIds:', permissionIds);
		}
		
		return permissionIds;
	} catch (error) {
		console.error('[getAllowedPermissionIds] Error fetching permissions:', error);
		return [];
	}
}

/**
 * Check if user has permission for a specific route
 * Uses PE_Rights_UserPermission as the source of truth
 * 
 * @param userId - User ID (numeric) or email address
 * @param routePath - Route path (e.g., "/dashboard/baseline-qol")
 * @param actionKey - Optional action key (defaults to "view" or from ROUTE_PERMISSION_MAP)
 * @returns true if user has permission, false otherwise
 */
export async function hasRoutePermission(
	userId: string | number,
	routePath: string,
	actionKey?: string
): Promise<boolean> {
	try {
		// Super Admin has all permissions
		if (await isSuperAdmin(userId)) {
			if (process.env.NODE_ENV === 'development') {
				console.log('[hasRoutePermission] Super Admin - granting access to:', routePath);
			}
			return true;
		}

		// Get action key for route
		const requiredActionKey = actionKey || getActionKeyForRoute(routePath);

		const pool = await getDb();
		const request = pool.request();
		
		// Handle both numeric UserId and string email_address
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		
		if (userIdNum !== null && userIdNum > 0) {
			request.input("user_id", userIdNum);
		} else {
			request.input("user_id", userId);
		}
		request.input("email_address", userId);
		request.input("route_path", routePath);
		request.input("action_key", requiredActionKey);

		// Check user permission overrides first (most specific)
		const userPermResult = await request.query(`
			SELECT TOP(1) up.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
				AND pg.[RoutePath] = @route_path
				AND p.[ActionKey] = @action_key
				AND (
					up.[IsAllowed] = 1 
					OR up.[IsAllowed] = 'Yes' 
					OR up.[IsAllowed] = 'yes' 
					OR up.[IsAllowed] = 'YES'
					OR up.[IsAllowed] = true
				)
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
		`);

		if (userPermResult.recordset.length > 0) {
			const hasAccess = true; // Already filtered by IsAllowed in WHERE clause
			if (process.env.NODE_ENV === 'development') {
				console.log('[hasRoutePermission] User:', userId, 'Route:', routePath, 'Action:', requiredActionKey, 'Result: ALLOWED (user permission)');
			}
			return hasAccess;
		}

		// Check role permissions
		const rolePermResult = await request.query(`
			SELECT TOP(1) rp.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp ON ur.[RoleId] = rp.[RoleId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON rp.[PermissionId] = p.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r ON ur.[RoleId] = r.[RoleId]
			WHERE (ur.[UserId] = @user_id OR ur.[UserId] = @email_address)
				AND pg.[RoutePath] = @route_path
				AND p.[ActionKey] = @action_key
				AND (
					rp.[IsAllowed] = 1 
					OR rp.[IsAllowed] = 'Yes' 
					OR rp.[IsAllowed] = 'yes' 
					OR rp.[IsAllowed] = 'YES'
					OR rp.[IsAllowed] = true
				)
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
				AND r.[IsActive] = 1
			ORDER BY rp.[IsAllowed] DESC
		`);

		if (rolePermResult.recordset.length > 0) {
			const hasAccess = true; // Already filtered by IsAllowed in WHERE clause
			if (process.env.NODE_ENV === 'development') {
				console.log('[hasRoutePermission] User:', userId, 'Route:', routePath, 'Action:', requiredActionKey, 'Result: ALLOWED (role permission)');
			}
			return hasAccess;
		}

		// No permission found - deny access
		if (process.env.NODE_ENV === 'development') {
			console.log('[hasRoutePermission] User:', userId, 'Route:', routePath, 'Action:', requiredActionKey, 'Result: DENIED (no permission found)');
		}
		return false;
	} catch (error) {
		console.error('[hasRoutePermission] Error checking permission:', error);
		return false;
	}
}

/**
 * Get user's allowed permissions with route and action details
 * Useful for debugging and UI display
 */
export async function getUserAllowedPermissions(userId: string | number): Promise<Array<{
	PermissionId: number;
	RoutePath: string;
	ActionKey: string;
	PageName: string;
}>> {
	try {
		// Super Admin - return empty array (they have all permissions)
		if (await isSuperAdmin(userId)) {
			return [];
		}

		const pool = await getDb();
		const request = pool.request();
		
		// Handle both numeric UserId and string email_address
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		
		if (userIdNum !== null && userIdNum > 0) {
			request.input("user_id", userIdNum);
		} else {
			request.input("user_id", userId);
		}
		request.input("email_address", userId);

		// Get user permissions with route and action details
		const result = await request.query(`
			SELECT DISTINCT
				up.[PermissionId],
				pg.[RoutePath],
				p.[ActionKey],
				pg.[PageName]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
				AND (
					up.[IsAllowed] = 1 
					OR up.[IsAllowed] = 'Yes' 
					OR up.[IsAllowed] = 'yes' 
					OR up.[IsAllowed] = 'YES'
					OR up.[IsAllowed] = true
				)
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
			ORDER BY pg.[RoutePath], p.[ActionKey]
		`);

		return result.recordset.map((row: any) => ({
			PermissionId: row.PermissionId,
			RoutePath: row.RoutePath,
			ActionKey: row.ActionKey,
			PageName: row.PageName
		}));
	} catch (error) {
		console.error('[getUserAllowedPermissions] Error:', error);
		return [];
	}
}
