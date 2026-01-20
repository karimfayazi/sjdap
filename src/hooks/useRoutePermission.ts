"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { isRBACDisabled } from "@/lib/rbac-config";
import { hasUserTypeAccess } from "@/lib/accessByUserType";
import { isBypassedRoute } from "@/lib/rbac-bypass";

/**
 * Hook to check if user has permission for a specific route
 * Uses the permission service API endpoint
 */
export function useRoutePermission(route: string, action?: string) {
	const { userProfile, loading: authLoading, getUserId } = useAuth();
	const [hasAccess, setHasAccess] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (authLoading || !userProfile) {
			setLoading(true);
			return;
		}

		// Check if route is bypassed (accessible to all authenticated users)
		if (isBypassedRoute(route)) {
			setHasAccess(true);
			setLoading(false);
			return;
		}

		// RBAC DISABLED: Grant access to all authenticated users
		if (isRBACDisabled()) {
			setHasAccess(true);
			setLoading(false);
			return;
		}

		// Check UserType-based access FIRST (before RBAC permissions)
		const userType = userProfile.access_level; // access_level contains UserType from database
		const hasUserTypeRouteAccess = hasUserTypeAccess(userType, route);
		
		if (hasUserTypeRouteAccess) {
			// UserType allows access - grant immediately without checking RBAC
			if (process.env.NODE_ENV === 'development') {
				console.log('[useRoutePermission] UserType access granted:', {
					route,
					userType,
					action
				});
			}
			setHasAccess(true);
			setLoading(false);
			return;
		}

		const checkPermission = async () => {
			try {
				setLoading(true);
				const params = new URLSearchParams({ route });
				if (action) {
					params.append("action", action);
				}

				const response = await fetch(`/api/check-route-permission?${params.toString()}`);
				const data = await response.json();

				if (data.success) {
					setHasAccess(data.hasAccess);
				} else {
					console.error('[useRoutePermission] Error:', data.message);
					setHasAccess(false);
				}
			} catch (error) {
				console.error('[useRoutePermission] Error checking permission:', error);
				setHasAccess(false);
			} finally {
				setLoading(false);
			}
		};

		checkPermission();
	}, [userProfile, authLoading, route, action]);

	return {
		hasAccess,
		loading: authLoading || loading
	};
}
