/**
 * Utility functions for authentication and authorization
 */

/**
 * Normalize permission value from database (1/0, Yes/No, True/False) to boolean
 * Returns true if value indicates permission granted, false otherwise
 */
export function normalizePermission(value: any): boolean {
	if (value === null || value === undefined) {
		return false;
	}

	// Handle boolean
	if (typeof value === 'boolean') {
		return value === true;
	}

	// Handle number
	if (typeof value === 'number') {
		return value === 1;
	}

	// Handle string - normalize and check
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		return normalized === 'yes' || normalized === '1' || normalized === 'true';
	}

	return false;
}

/**
 * Check if a user is a super user based on the Supper_User field
 * Handles all possible variations: "Yes", "yes", "YES", 1, true, "1", "true", etc.
 * 
 * IMPORTANT: Super users have FULL ACCESS to ALL sections regardless of individual permissions
 */
export function isSuperUser(supperUserValue: string | boolean | number | null | undefined): boolean {
	return normalizePermission(supperUserValue);
}

