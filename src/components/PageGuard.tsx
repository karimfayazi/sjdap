"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useRoutePermission } from "@/hooks/useRoutePermission";
import AccessDenied from "./AccessDenied";
import { isRBACDisabled } from "@/lib/rbac-config";
import { isBypassedRoute } from "@/lib/rbac-bypass";

type PageGuardProps = {
	children: React.ReactNode;
	requiredAction?: string;
	fallbackRoute?: string;
};

/**
 * PageGuard component - protects pages based on route permissions
 * Shows AccessDenied if user doesn't have permission
 */
export default function PageGuard({ 
	children, 
	requiredAction = "view",
	fallbackRoute = "/dashboard"
}: PageGuardProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { hasAccess, loading } = useRoutePermission(pathname || "", requiredAction);
	const [mounted, setMounted] = useState(false);

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

	// Wait for mount and permission check
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

	// If no access, show AccessDenied
	if (hasAccess === false) {
		// Debug logging (dev only)
		if (process.env.NODE_ENV === 'development') {
			console.log('[PageGuard] Access denied for route:', pathname, 'Action:', requiredAction);
		}
		return <AccessDenied />;
	}

	// User has access, render children
	return <>{children}</>;
}
