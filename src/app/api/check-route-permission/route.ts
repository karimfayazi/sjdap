import { NextRequest, NextResponse } from "next/server";
import { hasRoutePermission } from "@/lib/permission-service";

/**
 * API endpoint to check if user has permission for a route
 * GET /api/check-route-permission?route=/dashboard/baseline-qol&action=view
 */
export async function GET(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const route = searchParams.get("route");
		const action = searchParams.get("action") || undefined;

		if (!route) {
			return NextResponse.json(
				{ success: false, message: "Route parameter is required" },
				{ status: 400 }
			);
		}

		const hasAccess = await hasRoutePermission(userId, route, action);

		// Debug logging (dev only)
		if (process.env.NODE_ENV === 'development') {
			console.log('[check-route-permission] User:', userId, 'Route:', route, 'Action:', action, 'Has Access:', hasAccess);
		}

		return NextResponse.json({
			success: true,
			hasAccess,
			route,
			action: action || 'view'
		});
	} catch (error: any) {
		console.error("[check-route-permission] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error checking route permission" },
			{ status: 500 }
		);
	}
}
