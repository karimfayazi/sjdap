/**
 * Utility functions for bank account access checking
 */

import { normalizePermission } from "./auth-utils";

/**
 * Check if a user has bank account access based on the bank_account field
 * Handles all possible variations: "Yes", "yes", "YES", 1, true, "1", "true", etc.
 */
export function hasBankAccess(bankAccountValue: string | boolean | number | null | undefined): boolean {
	return normalizePermission(bankAccountValue);
}

