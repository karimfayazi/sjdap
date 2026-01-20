/**
 * Helper functions for API route permission checks
 */

import { NextRequest, NextResponse } from "next/server";
import { hasRoutePermission } from "./permission-service";
import { getUserIdFromNextRequest } from "./auth";
import { isRBACDisabled } from "./rbac-config";
import { isBypassedRoute } from "./rbac-bypass";

/**
 * Get userId from auth cookie (uses robust parsing)
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
	return getUserIdFromNextRequest(request);
}

/**
 * Check if user is authenticated
 * Returns userId if authenticated, null otherwise
 */
export function requireAuth(request: NextRequest): string | null {
	const userId = getUserIdFromRequest(request);
	if (!userId) {
		return null;
	}
	return userId;
}

/**
 * Check if user has permission for a route
 * Returns { hasAccess: true, userId } if allowed, or { hasAccess: false, error } if denied
 */
export async function requireRoutePermission(
	request: NextRequest,
	routePath: string,
	actionKey: string = "view"
): Promise<{ hasAccess: true; userId: string } | { hasAccess: false; error: NextResponse }> {
	// Debug: Log request details
	const requestUrl = new URL(request.url);
	const rawCookies = request.headers.get("cookie") || "";
	const authCookie = request.cookies.get("auth");
	
	console.log('[requireRoutePermission] === PERMISSION CHECK START ===');
	console.log('[requireRoutePermission] Request URL:', requestUrl.pathname);
	console.log('[requireRoutePermission] Route Path:', routePath);
	console.log('[requireRoutePermission] Action Key:', actionKey);
	console.log('[requireRoutePermission] Raw Cookies:', rawCookies);
	console.log('[requireRoutePermission] Auth Cookie:', authCookie ? authCookie.value : 'NOT FOUND');
	
	// Check authentication
	const userId = requireAuth(request);
	console.log('[requireRoutePermission] Extracted UserId:', userId);
	
	if (!userId) {
		console.log('[requireRoutePermission] ❌ DENIED: No userId (401 Unauthorized)');
		console.log('[requireRoutePermission] === PERMISSION CHECK END ===');
		return {
			hasAccess: false,
			error: NextResponse.json(
				{ 
					success: false, 
					message: "Unauthorized",
					error: "Unauthorized",
					route: routePath,
					requiredPermission: `${routePath}:${actionKey}`,
					userId: null
				},
				{ status: 401 }
			)
		};
	}

	// Check if route is bypassed (accessible to all authenticated users)
	if (isBypassedRoute(routePath)) {
		console.log('[requireRoutePermission] Route bypassed - granting access to:', routePath);
		return { hasAccess: true, userId };
	}

	// RBAC DISABLED: Skip permission check, allow all authenticated users
	if (isRBACDisabled()) {
		console.log('[requireRoutePermission] RBAC disabled - granting access to:', routePath);
		return { hasAccess: true, userId };
	}

	// Check permission
	console.log('[requireRoutePermission] Checking permission for userId:', userId, 'route:', routePath, 'action:', actionKey);
	const hasAccess = await hasRoutePermission(userId, routePath, actionKey);
	console.log('[requireRoutePermission] Permission check result:', hasAccess);
	
	if (!hasAccess) {
		// Get user's permissions for debugging
		const { getUserAllowedPermissions } = await import("./permission-service");
		const userPermissions = await getUserAllowedPermissions(userId);
		const userPermissionIds = userPermissions.map(p => p.PermissionId);
		
		// CANONICAL PERMISSION LOOKUP:
		// 1. Resolve PageId by RoutePath from PE_Rights_Page
		// 2. Resolve required PermissionId by PageId + ActionKey (uppercase)
		const { getDb } = await import("./db");
		const pool = await getDb();
		const diagRequest = pool.request();
		diagRequest.input("route_path", routePath);
		// Normalize action key to uppercase (DB stores ActionKey as uppercase)
		const normalizedActionKey = actionKey.toUpperCase();
		diagRequest.input("action_key", normalizedActionKey);
		
		// Normalize route path for matching
		const { normalizeRoutePath } = await import("./route-normalizer");
		const normalizedRoutePath = normalizeRoutePath(routePath);
		diagRequest.input("normalized_route_path", normalizedRoutePath);
		diagRequest.input("normalized_route_path_prefix", normalizedRoutePath + '/');
		
		const permissionExistsResult = await diagRequest.query(`
			SELECT 
				pg.[PageId],
				pg.[PageName],
				pg.[RoutePath],
				pg.[IsActive] AS PageIsActive,
				p.[PermissionId] AS RequiredPermissionId,
				p.[ActionKey],
				p.[IsActive] AS PermissionIsActive
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
				ON pg.[PageId] = p.[PageId] 
				AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
			WHERE (
				LTRIM(RTRIM(LOWER(pg.[RoutePath]))) = LOWER(@normalized_route_path)
				OR LTRIM(RTRIM(LOWER(pg.[RoutePath]))) LIKE LOWER(@normalized_route_path_prefix) + '%'
			)
			ORDER BY pg.[RoutePath]
		`);
		
		const permissionExists = permissionExistsResult.recordset.length > 0;
		const permissionDetails = permissionExistsResult.recordset[0] || null;
		const requiredPermissionId = permissionDetails?.RequiredPermissionId || null;
		const requiredPageId = permissionDetails?.PageId || null;
		
		// Check if user has ANY rows in PE_Rights_UserPermission
		const userRowsRequest = pool.request();
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		if (userIdNum !== null && userIdNum > 0) {
			userRowsRequest.input("user_id", userIdNum);
		} else {
			userRowsRequest.input("user_id", userId);
		}
		userRowsRequest.input("email_address", userId);
		
		const userRowsResult = await userRowsRequest.query(`
			SELECT COUNT(*) AS TotalRows
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission]
			WHERE [UserId] = @user_id OR [UserId] = @email_address
		`);
		const totalUserRows = userRowsResult.recordset[0]?.TotalRows || 0;
		
		// Check if user has the required PermissionId
		const hasRequiredPermissionId = requiredPermissionId !== null && userPermissionIds.includes(requiredPermissionId);
		
		console.log('[requireRoutePermission] ❌ DENIED: No permission found');
		console.log('[requireRoutePermission] Route:', routePath);
		console.log('[requireRoutePermission] Required Action:', normalizedActionKey);
		console.log('[requireRoutePermission] Required PageId:', requiredPageId);
		console.log('[requireRoutePermission] Required PermissionId:', requiredPermissionId);
		console.log('[requireRoutePermission] User PermissionIds:', userPermissionIds);
		console.log('[requireRoutePermission] User has required PermissionId:', hasRequiredPermissionId);
		console.log('[requireRoutePermission] User Permissions:', userPermissions.map(p => `${p.RoutePath}:${p.ActionKey} (PermissionId: ${p.PermissionId})`));
		console.log('[requireRoutePermission] Permission exists in DB:', permissionExists);
		console.log('[requireRoutePermission] Permission details:', permissionDetails);
		console.log('[requireRoutePermission] User has rows in PE_Rights_UserPermission:', totalUserRows);
		console.log('[requireRoutePermission] === PERMISSION CHECK END ===');

		const errorPayload = { 
			success: false, 
			message: "Access denied. You don't have permission to access this resource.",
			error: "Forbidden",
			route: routePath,
			pageId: requiredPageId,
			requiredAction: normalizedActionKey,
			requiredPermissionId: requiredPermissionId,
			// Keep requiredPermission string for backward compatibility, but don't use it for matching
			requiredPermission: `${routePath}:${actionKey}`,
			userId: userId,
			userPermissionIds: userPermissionIds,
			userPermissions: userPermissions.map(p => ({
				permissionId: p.PermissionId,
				routePath: p.RoutePath,
				actionKey: p.ActionKey,
				pageName: p.PageName
			})),
			diagnostics: {
				permissionExistsInDb: permissionExists,
				hasRequiredPermissionId: hasRequiredPermissionId,
				permissionDetails: permissionDetails ? {
					pageId: permissionDetails.PageId,
					pageName: permissionDetails.PageName,
					routePath: permissionDetails.RoutePath,
					permissionId: permissionDetails.RequiredPermissionId,
					actionKey: permissionDetails.ActionKey,
					pageIsActive: permissionDetails.PageIsActive,
					permissionIsActive: permissionDetails.PermissionIsActive
				} : null,
				totalUserRowsInTable: totalUserRows,
				userHasAnyPermissions: userPermissions.length > 0
			}
		};
		
		// Log the payload being returned
		console.log("[requireRoutePermission] Returning 403 error payload:", JSON.stringify(errorPayload, null, 2));
		
		// Single-line RBAC deny log for quick debugging
		console.log('[RBAC DENY]', { 
			userId, 
			route: routePath, 
			pageId: requiredPageId, 
			requiredPermissionId, 
			userPermissionIds 
		});
		
		const errorResponse = NextResponse.json(errorPayload, { status: 403 });
		errorResponse.headers.set("Content-Type", "application/json; charset=utf-8");
		
		return {
			hasAccess: false,
			error: errorResponse
		};
	}

	console.log('[requireRoutePermission] ✅ ALLOWED: User has permission');
	console.log('[requireRoutePermission] === PERMISSION CHECK END ===');
	return { hasAccess: true, userId };
}
