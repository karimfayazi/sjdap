/**
 * Route normalization utilities
 * Ensures consistent route path matching across the application
 */

/**
 * Normalize a route path for consistent comparison
 * - Removes trailing slashes (except root)
 * - Converts to lowercase
 * - Removes query strings and fragments
 * - Trims whitespace
 * 
 * @param route - Route path to normalize
 * @returns Normalized route path
 */
export function normalizeRoutePath(route: string): string {
	if (!route || typeof route !== 'string') {
		return '';
	}

	// Remove query string and hash fragments
	const withoutQuery = route.split('?')[0].split('#')[0];

	// Trim whitespace
	let normalized = withoutQuery.trim();

	// Remove trailing slash (except for root path)
	if (normalized.length > 1 && normalized.endsWith('/')) {
		normalized = normalized.slice(0, -1);
	}

	// Ensure it starts with /
	if (!normalized.startsWith('/')) {
		normalized = '/' + normalized;
	}

	return normalized;
}

/**
 * Check if two routes match (with normalization)
 * 
 * @param route1 - First route path
 * @param route2 - Second route path
 * @returns true if routes match after normalization
 */
export function routesMatch(route1: string, route2: string): boolean {
	return normalizeRoutePath(route1) === normalizeRoutePath(route2);
}

/**
 * Check if a route starts with a prefix (with normalization)
 * 
 * @param route - Route path to check
 * @param prefix - Prefix to check against
 * @returns true if route starts with prefix after normalization
 */
export function routeStartsWith(route: string, prefix: string): boolean {
	const normalizedRoute = normalizeRoutePath(route);
	const normalizedPrefix = normalizeRoutePath(prefix);
	
	// Exact match
	if (normalizedRoute === normalizedPrefix) {
		return true;
	}
	
	// Prefix match (with trailing slash)
	return normalizedRoute.startsWith(normalizedPrefix + '/');
}
