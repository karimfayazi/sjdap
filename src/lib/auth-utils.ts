/**
 * Utility functions for authentication and authorization
 * These functions are client-safe and can be used in both client and server components
 */

/**
 * Normalize permission value from database (1/0, Yes/No, True/False) to boolean
 * Returns true if value indicates permission granted, false otherwise
 * 
 * Database fields can return as:
 * - boolean: true/false
 * - number: 1/0
 * - string: "1"/"0", "Yes"/"No", "yes"/"no", "YES"/"NO", "true"/"false", "True"/"False"
 * 
 * Note: Database fields are now VARCHAR(3) with "Yes"/"No" values
 */
export function normalizePermission(value: any): boolean {
	// Handle null/undefined first
	if (value === null || value === undefined) {
		return false;
	}

	// Handle boolean
	if (typeof value === 'boolean') {
		return value === true;
	}

	// Handle number (legacy support for 1/0)
	if (typeof value === 'number') {
		// Check for 1 (explicitly check for 1 to be safe)
		return value === 1 || value === 1.0;
	}

	// Handle string - normalize and check
	// Database now uses VARCHAR(3) with "Yes"/"No" values
	if (typeof value === 'string') {
		const normalized = value.trim();
		const lowerNormalized = normalized.toLowerCase();
		
		// Check for "Yes" (case-insensitive) - this is the new format
		// Handles: "Yes", "yes", "YES", "Yes ", " yes", etc.
		if (lowerNormalized === 'yes') {
			return true;
		}
		
		// Check for "No" (case-insensitive) - explicitly deny
		// Handles: "No", "no", "NO", "No ", " no", etc.
		if (lowerNormalized === 'no') {
			return false;
		}
		
		// Legacy support for "1", "true" (case-insensitive)
		if (lowerNormalized === '1' || lowerNormalized === 'true') {
			return true;
		}
		
		// Legacy support for "0", "false" (case-insensitive)
		if (lowerNormalized === '0' || lowerNormalized === 'false') {
			return false;
		}
		
		// Default: no access for unknown string values
		return false;
	}

	// Handle Buffer (legacy support)
	if (Buffer.isBuffer(value)) {
		return value[0] === 1;
	}

	// Default: no access
	return false;
}

/**
 * Check if a user is a super user based on the Supper_User field
 * Handles all possible variations: "Yes", "yes", "YES", 1, true, "1", "true", etc.
 * 
 * IMPORTANT: Super users have FULL ACCESS to ALL sections regardless of individual permissions
 * 
 * Database values that grant Super User access:
 * - Number: 1
 * - String: "1", "Yes", "yes", "YES", "true", "True", "TRUE"
 * - Boolean: true
 * 
 * @param supperUserValue - The Supper_User field value from database (can be 1, "Yes", true, etc.)
 * @returns true if user is Super User, false otherwise
 */
export function isSuperUser(supperUserValue: string | boolean | number | null | undefined): boolean {
	return normalizePermission(supperUserValue);
}

/**
 * Check if a user is an admin user (user_id = "admin")
 * Admin users have FULL ACCESS to ALL pages and sections
 * 
 * @param username - The username/user_id to check (can be string, number, or null/undefined)
 * @returns true if username is "admin" (case-insensitive), false otherwise
 */
export function isAdminUser(username: string | number | null | undefined): boolean {
	if (!username) return false;
	// Convert to string if it's a number
	const usernameStr = typeof username === 'string' ? username : String(username);
	return usernameStr.toLowerCase() === 'admin';
}

/**
 * Check if a user is Super Admin by UserType from database
 * UserType='Super Admin' from [SJDA_Users].[dbo].[PE_User] table grants access to all sections and pages
 * 
 * @param accessLevel - The access_level field (which contains UserType from database)
 * @returns true if UserType is 'Super Admin', false otherwise
 */
export function isSuperAdminByUserType(accessLevel: string | null | undefined): boolean {
	if (!accessLevel || typeof accessLevel !== 'string') {
		return false;
	}
	return accessLevel.trim() === 'Super Admin';
}

/**
 * Check if a user has full access (either admin user, super user, or Super Admin by UserType)
 * This is the main function to use for access control checks
 * 
 * @param username - The username/user_id to check (can be string or number)
 * @param supperUserValue - The Supper_User field value from database
 * @param accessLevel - The access_level field (which contains UserType from database)
 * @returns true if user is admin, super user, or Super Admin by UserType, false otherwise
 */
export function hasFullAccess(
	username: string | number | null | undefined,
	supperUserValue: string | boolean | number | null | undefined,
	accessLevel?: string | null | undefined
): boolean {
	return isAdminUser(username) || isSuperUser(supperUserValue) || isSuperAdminByUserType(accessLevel);
}

/**
 * Check if a user has access to a specific route based on UserType
 * 
 * Access rules:
 * - Super Admin: Access to all pages
 * - Editor: Access to baseline-qol, family-income, rops, family-development-plan, actual-intervention
 * - Economic-Approval: Access ONLY to /dashboard and /dashboard/feasibility-approval (all other pages blocked)
 * 
 * @param userType - The UserType from database (Editor, Super Admin, Economic-Approval, etc.)
 * @param route - The route path (e.g., '/dashboard/baseline-qol')
 * @returns true if user has access, false otherwise
 */
export function hasRouteAccess(userType: string | null | undefined, route: string): boolean {
	// RBAC DISABLED: Allow all authenticated users
	// Use try-catch to handle both server and client contexts
	try {
		const { isRBACDisabled } = require("./rbac-config");
		if (isRBACDisabled()) {
			return true;
		}
	} catch (e) {
		// If import fails, check env var directly
		if (process.env.NEXT_PUBLIC_DISABLE_RBAC === '1' || process.env.NEXT_PUBLIC_DISABLE_RBAC === 'true') {
			return true;
		}
	}

	if (!userType || typeof userType !== 'string') {
		return false;
	}

	const normalizedUserType = userType.trim();
	
	// Check UserType-based access FIRST (before legacy UserType rules)
	try {
		const { hasUserTypeAccess } = require("./accessByUserType");
		if (hasUserTypeAccess(userType, route)) {
			return true;
		}
	} catch (e) {
		// If import fails, continue with legacy rules
	}

	// Super Admin has access to all pages
	if (normalizedUserType === 'Super Admin') {
		return true;
	}

	// Economic-Approval access - ONLY dashboard and feasibility-approval (strictly block everything else)
	if (normalizedUserType === 'Economic-Approval') {
		// Allow access to main dashboard (exact match or with trailing slash)
		if (route === '/dashboard' || route === '/dashboard/') {
			return true;
		}
		// Allow access to feasibility-approval and its sub-routes
		if (route.startsWith('/dashboard/feasibility-approval')) {
			return true;
		}
		// Block ALL other routes for Economic-Approval users
		return false;
	}

	// Editor access (excluding Family Income and SWB-Families)
	if (normalizedUserType === 'Editor') {
		const editorRoutes = [
			'/dashboard/baseline-qol',
			'/dashboard/rops',
			'/dashboard/family-development-plan',
			'/dashboard/actual-intervention'
		];
		// Check if route starts with any of the allowed routes (includes sub-routes)
		return editorRoutes.some(r => route.startsWith(r));
	}

	// Default: no access
	return false;
}

