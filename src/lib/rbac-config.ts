/**
 * RBAC Feature Flag Configuration
 * 
 * Set RBAC_DISABLED to true to temporarily disable all permission checks.
 * When disabled:
 * - All logged-in users can access all pages and APIs
 * - Authentication is still required (users must be logged in)
 * - Permission checks return true for all authenticated users
 * - No 403 Forbidden errors for permission reasons
 */

// Feature flag: Set to true to disable RBAC, false to enable
// Can be controlled via environment variable NEXT_PUBLIC_DISABLE_RBAC=1
// Or set directly here: true = RBAC disabled, false = RBAC enabled
export const RBAC_DISABLED = process.env.NEXT_PUBLIC_DISABLE_RBAC === '1' || 
                               process.env.NEXT_PUBLIC_DISABLE_RBAC === 'true' ||
                               true; // Temporarily hardcoded to true - change to false to re-enable RBAC

/**
 * Check if RBAC is disabled
 */
export function isRBACDisabled(): boolean {
	return RBAC_DISABLED;
}
