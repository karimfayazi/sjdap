/**
 * Centralized Permission Service
 * 
 * This service provides a single source of truth for permission checks.
 * It ONLY uses PE_Rights_UserPermission table - NOT PE_User permission columns.
 */

import { getDb } from "./db";
import { isSuperAdmin } from "./rbac-utils";
import { normalizeRoutePath } from "./route-normalizer";
import { isRBACDisabled } from "./rbac-config";
import { isBypassedRoute } from "./rbac-bypass";

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
	// Check if route is bypassed (accessible to all authenticated users)
	if (isBypassedRoute(routePath)) {
		if (process.env.NODE_ENV === 'development') {
			console.log('[hasRoutePermission] Route bypassed - granting access to:', routePath);
		}
		return true;
	}

	// RBAC DISABLED: Allow all authenticated users
	if (isRBACDisabled()) {
		if (process.env.NODE_ENV === 'development') {
			console.log('[hasRoutePermission] RBAC disabled - granting access to:', routePath);
		}
		return true;
	}

	try {
		// Super Admin has all permissions
		if (await isSuperAdmin(userId)) {
			if (process.env.NODE_ENV === 'development') {
				console.log('[hasRoutePermission] Super Admin - granting access to:', routePath);
			}
			return true;
		}

		// Get action key for route and normalize to uppercase (DB stores ActionKey as uppercase)
		const requiredActionKey = (actionKey || getActionKeyForRoute(routePath)).toUpperCase();

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

		// Normalize route path for consistent matching
		const normalizedRoutePath = normalizeRoutePath(routePath);
		const normalizedRoutePathWithSlash = normalizedRoutePath + '/';
		request.input("normalized_route_path", normalizedRoutePath);
		request.input("normalized_route_path_prefix", normalizedRoutePathWithSlash);

		// Debug: Log what we're checking
		console.log('[hasRoutePermission] Checking permission:', {
			userId,
			routePath,
			normalizedRoutePath,
			requiredActionKey
		});

		// CANONICAL PERMISSION CHECK:
		// 1. Resolve PageId by RoutePath from PE_Rights_Page
		// 2. Resolve PermissionId by PageId + ActionKey (uppercase) AND IsActive=1
		// 3. Check if user has that PermissionId in PE_Rights_UserPermission WHERE IsAllowed=1
		const userPermResult = await request.query(`
			SELECT TOP(1) 
				up.[IsAllowed],
				up.[PermissionId],
				pg.[PageId],
				pg.[RoutePath],
				pg.[PageName],
				p.[ActionKey],
				p.[PermissionId] AS RequiredPermissionId
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
				ON pg.[PageId] = p.[PageId] 
				AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
				AND p.[IsActive] = 1
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_UserPermission] up 
				ON p.[PermissionId] = up.[PermissionId]
				AND (
					up.[IsAllowed] = 1 
					OR up.[IsAllowed] = 'Yes' 
					OR up.[IsAllowed] = 'yes' 
					OR up.[IsAllowed] = 'YES'
					OR up.[IsAllowed] = true
				)
			WHERE (
					-- Exact match with normalized route (trimmed and case-insensitive)
					LTRIM(RTRIM(LOWER(pg.[RoutePath]))) = LOWER(@normalized_route_path)
					-- Or route starts with the normalized path (for sub-routes)
					OR LTRIM(RTRIM(LOWER(pg.[RoutePath]))) LIKE LOWER(@normalized_route_path_prefix) + '%'
				)
				AND pg.[IsActive] = 1
				AND (up.[UserId] = @user_id OR up.[UserId] = @email_address)
			ORDER BY LEN(pg.[RoutePath]) DESC -- Prefer most specific route match
		`);
		
		// Log query parameters for debugging
		console.log('[hasRoutePermission] Query parameters:', {
			user_id: userIdNum !== null ? userIdNum : userId,
			email_address: userId,
			normalized_route_path: normalizedRoutePath,
			action_key: requiredActionKey
		});

		if (userPermResult.recordset.length > 0) {
			const matched = userPermResult.recordset[0];
			console.log('[hasRoutePermission] ✅ User permission found:', {
				userId,
				routePath,
				matchedRoutePath: matched.RoutePath,
				matchedActionKey: matched.ActionKey,
				permissionId: matched.PermissionId,
				pageName: matched.PageName,
				isAllowed: matched.IsAllowed
			});
			return true;
		} else {
			console.log('[hasRoutePermission] ⚠️ No user permission found for:', {
				userId,
				routePath,
				normalizedRoutePath,
				requiredActionKey
			});
		}

		// Check role permissions
		// Use canonical permission check: PageId -> PermissionId -> RolePermission
		const rolePermResult = await request.query(`
			SELECT TOP(1) 
				rp.[IsAllowed],
				rp.[PermissionId],
				pg.[PageId],
				pg.[RoutePath],
				pg.[PageName],
				p.[ActionKey],
				p.[PermissionId] AS RequiredPermissionId,
				r.[RoleName]
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
				ON pg.[PageId] = p.[PageId] 
				AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp 
				ON p.[PermissionId] = rp.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_UserRole] ur 
				ON rp.[RoleId] = ur.[RoleId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r 
				ON ur.[RoleId] = r.[RoleId]
			WHERE (ur.[UserId] = @user_id OR ur.[UserId] = @email_address)
				AND (
					-- Exact match with normalized route (trimmed and case-insensitive)
					LTRIM(RTRIM(LOWER(pg.[RoutePath]))) = LOWER(@normalized_route_path)
					-- Or route starts with the normalized path (for sub-routes)
					OR LTRIM(RTRIM(LOWER(pg.[RoutePath]))) LIKE LOWER(@normalized_route_path_prefix) + '%'
				)
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
			ORDER BY LEN(pg.[RoutePath]) DESC, rp.[IsAllowed] DESC -- Prefer most specific route match
		`);

		if (rolePermResult.recordset.length > 0) {
			const matched = rolePermResult.recordset[0];
			console.log('[hasRoutePermission] ✅ Role permission found:', {
				userId,
				routePath,
				matchedRoutePath: matched.RoutePath,
				matchedActionKey: matched.ActionKey,
				permissionId: matched.PermissionId,
				pageName: matched.PageName,
				roleName: matched.RoleName,
				isAllowed: matched.IsAllowed
			});
			return true;
		} else {
			console.log('[hasRoutePermission] ⚠️ No role permission found for:', {
				userId,
				routePath,
				normalizedRoutePath,
				requiredActionKey
			});
		}

		// No permission found - deny access
		console.log('[hasRoutePermission] ❌ DENIED: No user or role permission found');
		console.log('[hasRoutePermission] Final check result:', {
			userId,
			routePath,
			normalizedRoutePath,
			requiredActionKey,
			hasAccess: false
		});
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

		// First, check if user has ANY rows in PE_Rights_UserPermission (diagnostic)
		const diagnosticResult = await request.query(`
			SELECT 
				COUNT(*) AS TotalRows,
				COUNT(CASE WHEN up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true) THEN 1 END) AS AllowedRows,
				COUNT(CASE WHEN up.[IsAllowed] NOT IN (1, 'Yes', 'yes', 'YES', true) THEN 1 END) AS DeniedRows,
				COUNT(CASE WHEN p.[IsActive] = 1 THEN 1 END) AS ActivePermissionRows,
				COUNT(CASE WHEN pg.[IsActive] = 1 THEN 1 END) AS ActivePageRows
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
			LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
			LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
		`);

		const diagnostic = diagnosticResult.recordset[0];
		console.log('[getUserAllowedPermissions] Diagnostic for userId:', userId, {
			totalRows: diagnostic?.TotalRows || 0,
			allowedRows: diagnostic?.AllowedRows || 0,
			deniedRows: diagnostic?.DeniedRows || 0,
			activePermissionRows: diagnostic?.ActivePermissionRows || 0,
			activePageRows: diagnostic?.ActivePageRows || 0
		});

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

		const permissions = result.recordset.map((row: any) => ({
			PermissionId: row.PermissionId,
			RoutePath: row.RoutePath,
			ActionKey: row.ActionKey,
			PageName: row.PageName
		}));

		if (permissions.length === 0 && diagnostic?.TotalRows > 0) {
			console.warn('[getUserAllowedPermissions] ⚠️ User has rows but none pass filters:', {
				userId,
				totalRows: diagnostic.TotalRows,
				allowedRows: diagnostic.AllowedRows,
				deniedRows: diagnostic.DeniedRows,
				activePermissionRows: diagnostic.ActivePermissionRows,
				activePageRows: diagnostic.ActivePageRows,
				reason: diagnostic.AllowedRows === 0 
					? 'All rows have IsAllowed != Yes/1'
					: diagnostic.ActivePermissionRows === 0
					? 'All permissions are inactive'
					: diagnostic.ActivePageRows === 0
					? 'All pages are inactive'
					: 'Unknown filter issue'
			});
		} else if (permissions.length === 0 && diagnostic?.TotalRows === 0) {
			console.warn('[getUserAllowedPermissions] ⚠️ User has NO rows in PE_Rights_UserPermission:', {
				userId,
				user_id_param: userIdNum !== null ? userIdNum : userId,
				email_address_param: userId,
				note: 'User may need permissions assigned via Settings UI or SQL script'
			});
		}

		return permissions;
	} catch (error) {
		console.error('[getUserAllowedPermissions] Error:', error);
		return [];
	}
}
