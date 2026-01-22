"use client";

import { normalizePermission } from "@/lib/auth-utils";
import type { UserProfile } from "./useAuth";
import { isRBACDisabled } from "@/lib/rbac-config";
import { hasUserTypeAccess } from "@/lib/accessByUserType";
import { isBypassedRoute } from "@/lib/rbac-bypass";

/**
 * Pure function to check if user can access a route based on section permissions
 * Uses userProfile section flags (which are now based on PE_Rights_UserPermission)
 * 
 * This is a pure function (no hooks) that can be called inside loops/maps/filters
 */
export function canAccessRoute(userProfile: UserProfile | null, route: string, loading: boolean = false): boolean {
	// Check if route is bypassed (accessible to all authenticated users)
	if (isBypassedRoute(route)) {
		return true;
	}

	// RBAC DISABLED: Allow all authenticated users
	if (isRBACDisabled()) {
		return true;
	}

	if (loading || !userProfile) {
		return false;
	}

	// Check UserType-based access FIRST (before RBAC permissions)
	const userType = userProfile.access_level; // access_level contains UserType from database
	const hasUserTypeRouteAccess = hasUserTypeAccess(userType, route);
	
	if (hasUserTypeRouteAccess) {
		// UserType allows access - grant immediately without checking RBAC
		return true;
	}

	// Super Admin has access to all routes
	if (userProfile.supper_user === 'Yes' || userProfile.supper_user === true || userProfile.supper_user === 1) {
		return true;
	}

	// Map routes to section permissions
	const routeToSectionMap: Record<string, keyof UserProfile> = {
		'/dashboard': 'Dashboard',
		'/dashboard/baseline-qol': 'BaselineQOL',
		'/dashboard/family-development-plan': 'Family_Development_Plan',
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
	let sectionKey: keyof UserProfile | undefined;
	
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

/**
 * Hook to check if user can access a route based on section permissions
 * This hook calls useAuth() internally - use canAccessRoute() pure function instead when possible
 * 
 * @deprecated Use canAccessRoute(userProfile, route, loading) pure function instead when calling inside loops/maps
 */
export function useCanAccessRoute(route: string): boolean {
	// This hook is kept for backward compatibility but should be avoided in loops
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { userProfile, loading } = require("./useAuth").useAuth();
	return canAccessRoute(userProfile, route, loading);
}
