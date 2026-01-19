"use client";

import { useAuth } from "./useAuth";
import { normalizePermission } from "@/lib/auth-utils";

/**
 * Hook to check if user can access a route based on section permissions
 * Uses userProfile section flags (which are now based on PE_Rights_UserPermission)
 */
export function useCanAccessRoute(route: string): boolean {
	const { userProfile, loading } = useAuth();

	if (loading || !userProfile) {
		return false;
	}

	// Super Admin has access to all routes
	if (userProfile.supper_user === 'Yes' || userProfile.supper_user === true || userProfile.supper_user === 1) {
		return true;
	}

	// Map routes to section permissions
	const routeToSectionMap: Record<string, keyof typeof userProfile> = {
		'/dashboard': 'Dashboard',
		'/dashboard/baseline-qol': 'BaselineQOL',
		'/dashboard/family-development-plan': 'Family_Development_Plan',
		'/dashboard/family-approval-crc': 'Family_Approval_CRC',
		'/dashboard/family-income': 'Family_Income',
		'/dashboard/rops': 'ROP',
		'/dashboard/actual-intervention': 'ActualIntervention',
		'/dashboard/swb-families': 'SWB_Families',
		'/dashboard/finance': 'FinanceSection',
		'/dashboard/finance/loan-process': 'FinanceSection',
		'/dashboard/finance/bank-information': 'BankInformation',
		'/dashboard/settings': 'Setting',
		'/dashboard/approval-section': 'BaselineApproval', // Use one of the approval sections
		'/dashboard/approval-section/baseline-approval': 'BaselineApproval',
		'/dashboard/approval-section/feasibility-approval': 'FeasibilityApproval',
		'/dashboard/approval-section/family-development-plan-approval': 'FdpApproval',
		'/dashboard/approval-section/intervention-approval': 'InterventionApproval',
		'/dashboard/approval-section/bank-account-approval': 'BankAccountApproval',
		'/dashboard/feasibility-approval': 'FeasibilityApproval',
		'/dashboard/reports': 'Other',
		'/dashboard/documents': 'Other',
		'/dashboard/others': 'Other',
	};

	// Find matching section for route
	let sectionKey: keyof typeof userProfile | undefined;
	
	// Try exact match first
	if (routeToSectionMap[route]) {
		sectionKey = routeToSectionMap[route];
	} else {
		// Try to find parent route
		const sortedRoutes = Object.keys(routeToSectionMap).sort((a, b) => b.length - a.length);
		for (const mappedRoute of sortedRoutes) {
			if (route.startsWith(mappedRoute)) {
				sectionKey = routeToSectionMap[mappedRoute];
				break;
			}
		}
	}

	if (!sectionKey) {
		// Route not in map - default to false for safety
		return false;
	}

	const permissionValue = userProfile[sectionKey];
	return normalizePermission(permissionValue);
}
