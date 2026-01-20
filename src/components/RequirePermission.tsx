"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { canAccessRoute } from "@/hooks/useCanAccessRoute";
import { useRoutePermission } from "@/hooks/useRoutePermission";
import { getSectionNameFromRoute } from "@/lib/route-helpers";
import AccessRestricted from "./AccessRestricted";
import { isRBACDisabled } from "@/lib/rbac-config";
import { hasUserTypeAccess } from "@/lib/accessByUserType";
import { isBypassedRoute } from "@/lib/rbac-bypass";

type RequirePermissionProps = {
	children: React.ReactNode;
	permission?: string; // Optional: override section name for display
	requiredAction?: string; // Optional: action key (view, add, edit, delete)
	useApiCheck?: boolean; // If true, uses API permission check; if false, uses client-side canAccessRoute
};

/**
 * RequirePermission wrapper component
 * Checks if user has permission to access the current route
 * Shows AccessRestricted if access denied
 * 
 * By default, uses API permission check (useRoutePermission) for accurate server-side permission validation
 * Set useApiCheck={false} to use client-side canAccessRoute check (faster but less accurate)
 */
export default function RequirePermission({
	children,
	permission,
	requiredAction = "view",
	useApiCheck = true,
}: RequirePermissionProps) {
	const pathname = usePathname();
	const { userProfile, loading: authLoading } = useAuth();
	const [mounted, setMounted] = useState(false);

	// Get section name from route or use provided permission
	const sectionName = permission || getSectionNameFromRoute(pathname || "");

	// API-based permission check (more accurate, uses server-side permission service)
	const { hasAccess: apiHasAccess, loading: apiLoading } = useRoutePermission(
		pathname || "",
		requiredAction
	);

	// Client-side permission check (faster, uses userProfile flags)
	const clientHasAccess = canAccessRoute(userProfile, pathname || "", authLoading);

	// Determine which check to use
	const hasAccess = useApiCheck ? apiHasAccess : clientHasAccess;
	const loading = useApiCheck 
		? (authLoading || apiLoading) 
		: authLoading;

	useEffect(() => {
		setMounted(true);
	}, []);

	// Check if route is bypassed (accessible to all authenticated users)
	if (pathname && isBypassedRoute(pathname)) {
		return <>{children}</>;
	}

	// RBAC DISABLED: Always allow access for authenticated users
	if (isRBACDisabled()) {
		return <>{children}</>;
	}

	// Check UserType-based access FIRST (before RBAC permissions)
	// This allows UserType rules to bypass RBAC permission checks
	if (userProfile && pathname) {
		const userType = userProfile.access_level; // access_level contains UserType from database
		const hasUserTypeRouteAccess = hasUserTypeAccess(userType, pathname);
		
		if (hasUserTypeRouteAccess) {
			// UserType allows access - grant immediately without checking RBAC
			if (process.env.NODE_ENV === 'development') {
				console.log('[RequirePermission] UserType access granted:', {
					route: pathname,
					userType: userType,
					section: sectionName
				});
			}
			return <>{children}</>;
		}
	}

	// Wait for mount and auth to load
	if (!mounted || loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<span className="text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	// If no access, show AccessRestricted
	if (hasAccess === false) {
		// Debug logging (dev only)
		if (process.env.NODE_ENV === 'development') {
			console.log('[RequirePermission] Access denied for route:', pathname, 'Action:', requiredAction, 'Section:', sectionName);
		}
		return (
			<AccessRestricted
				sectionName={sectionName}
				requiredPermission={permission || sectionName}
			/>
		);
	}

	// User has access, render children
	return <>{children}</>;
}
