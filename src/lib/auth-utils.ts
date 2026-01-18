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
		if (lowerNormalized === 'yes') {
			return true;
		}
		
		// Check for "No" (case-insensitive) - explicitly deny
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
 * @param username - The username/user_id to check
 * @returns true if username is "admin" (case-insensitive), false otherwise
 */
export function isAdminUser(username: string | null | undefined): boolean {
	if (!username) return false;
	return username.toLowerCase() === 'admin';
}

/**
 * Check if a user has full access (either admin user or super user)
 * This is the main function to use for access control checks
 * 
 * @param username - The username/user_id to check
 * @param supperUserValue - The Supper_User field value from database
 * @returns true if user is admin or super user, false otherwise
 */
export function hasFullAccess(
	username: string | null | undefined,
	supperUserValue: string | boolean | number | null | undefined
): boolean {
	return isAdminUser(username) || isSuperUser(supperUserValue);
}

