/**
 * RBAC Bypass Configuration
 * Routes that bypass permission checks but still require authentication
 */

import { normalizeRoutePath } from "./route-normalizer";

/**
 * Routes that bypass RBAC permission checks
 * These routes are accessible to ALL authenticated users
 */
export const RBAC_BYPASS_ROUTES = [
	"/dashboard/approval-section/family-development-plan-approval",
	"/dashboard/approval-section/intervention-approval",
];

/**
 * Check if a route is in the bypass list
 * Normalizes the path before checking (removes trailing slash, query string, etc.)
 * 
 * @param pathname - Route path to check
 * @returns true if route bypasses RBAC checks, false otherwise
 */
export function isBypassedRoute(pathname: string): boolean {
	if (!pathname || typeof pathname !== 'string') {
		return false;
	}

	const normalizedPath = normalizeRoutePath(pathname);
	return RBAC_BYPASS_ROUTES.includes(normalizedPath);
}

/**
 * Check if a route or any of its sub-routes is bypassed
 * Useful for checking if a route starts with a bypassed route
 * 
 * @param pathname - Route path to check
 * @returns true if route or parent route bypasses RBAC checks, false otherwise
 */
export function isBypassedRouteOrSubRoute(pathname: string): boolean {
	if (!pathname || typeof pathname !== 'string') {
		return false;
	}

	const normalizedPath = normalizeRoutePath(pathname);
	
	// Check exact match
	if (RBAC_BYPASS_ROUTES.includes(normalizedPath)) {
		return true;
	}

	// Check if path starts with any bypassed route (for sub-routes)
	return RBAC_BYPASS_ROUTES.some(bypassRoute => {
		return normalizedPath.startsWith(bypassRoute + '/') || normalizedPath === bypassRoute;
	});
}
