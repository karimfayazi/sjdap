/**
 * Helper functions for API route permission checks
 */

import { NextRequest, NextResponse } from "next/server";
import { hasRoutePermission } from "./permission-service";

/**
 * Get userId from auth cookie
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
	const authCookie = request.cookies.get("auth");
	if (!authCookie || !authCookie.value) {
		return null;
	}

	const userId = authCookie.value.split(":")[1];
	return userId || null;
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
	// Check authentication
	const userId = requireAuth(request);
	if (!userId) {
		return {
			hasAccess: false,
			error: NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			)
		};
	}

	// Check permission
	const hasAccess = await hasRoutePermission(userId, routePath, actionKey);
	
	if (!hasAccess) {
		// Debug logging (dev only)
		if (process.env.NODE_ENV === 'development') {
			console.log('[requireRoutePermission] Access denied:', {
				userId,
				routePath,
				actionKey
			});
		}

		return {
			hasAccess: false,
			error: NextResponse.json(
				{ 
					success: false, 
					message: "Access denied. You don't have permission to access this resource." 
				},
				{ status: 403 }
			)
		};
	}

	return { hasAccess: true, userId };
}
