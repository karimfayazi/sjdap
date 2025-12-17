/**
 * Utility functions for loan access checking
 */

import { normalizePermission } from "./auth-utils";

/**
 * Check if a user has loan access based on the access_loans field
 * Handles all possible variations: "Yes", "yes", "YES", 1, true, "1", "true", etc.
 */
export function hasLoanAccess(accessLoansValue: string | boolean | number | null | undefined): boolean {
	// Additional debug logging
	if (typeof window !== "undefined") {
		console.log("hasLoanAccess called with:", accessLoansValue, "Type:", typeof accessLoansValue);
	}
	
	const result = normalizePermission(accessLoansValue);
	
	if (typeof window !== "undefined") {
		console.log("hasLoanAccess result:", result);
	}
	
	return result;
}

