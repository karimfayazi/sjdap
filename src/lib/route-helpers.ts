/**
 * Helper functions for route-to-section mapping
 */

/**
 * Get a human-readable section name from a route path
 * Used for display in AccessRestricted component
 */
export function getSectionNameFromRoute(route: string): string {
	const routeToSectionNameMap: Record<string, string> = {
		'/dashboard': 'Dashboard',
		'/dashboard/baseline-qol': 'Baseline QOL',
		'/dashboard/family-development-plan': 'Family Development Plan',
		'/dashboard/family-income': 'Family Income',
		'/dashboard/rops': 'ROPs',
		'/dashboard/actual-intervention': 'Actual Intervention',
		'/dashboard/swb-families': 'SWB Families',
		'/dashboard/finance': 'Finance Section',
		'/dashboard/finance/loan-process': 'Loan Process',
		'/dashboard/finance/bank-information': 'Bank Information',
		'/dashboard/finance/bank-information/view': 'Bank Information',
		'/dashboard/finance/bank-information/add': 'Bank Information',
		'/dashboard/settings': 'Settings',
		'/dashboard/approval-section': 'Approval Section',
		'/dashboard/approval-section/baseline-approval': 'Baseline Approval',
		'/dashboard/approval-section/feasibility-approval': 'Feasibility Approval',
		'/dashboard/approval-section/family-development-plan-approval': 'Family Development Plan Approval',
		'/dashboard/approval-section/intervention-approval': 'Intervention Approval',
		'/dashboard/approval-section/bank-account-approval': 'Bank Account Approval',
		'/dashboard/feasibility-approval': 'Feasibility Approval',
		'/dashboard/reports': 'Reports',
		'/dashboard/documents': 'Documents',
		'/dashboard/others': 'Others',
	};

	// Try exact match first
	if (routeToSectionNameMap[route]) {
		return routeToSectionNameMap[route];
	}

	// Try to find parent route (sorted by length, longest first)
	const sortedRoutes = Object.keys(routeToSectionNameMap).sort((a, b) => b.length - a.length);
	for (const mappedRoute of sortedRoutes) {
		if (route.startsWith(mappedRoute)) {
			return routeToSectionNameMap[mappedRoute];
		}
	}

	// Fallback: format route path as section name
	// Remove /dashboard prefix and format
	const cleaned = route.replace(/^\/dashboard\/?/, '').replace(/-/g, ' ');
	return cleaned
		.split('/')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ') || 'Dashboard';
}
