"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

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
