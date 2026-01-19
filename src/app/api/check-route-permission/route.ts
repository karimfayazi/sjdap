import { NextRequest, NextResponse } from "next/server";
import { hasRoutePermission } from "@/lib/permission-service";
import { hasUserTypeAccess } from "@/lib/accessByUserType";
import { getDb } from "@/lib/db";

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

		// Check UserType-based access FIRST (before RBAC permissions)
		try {
			const pool = await getDb();
			const userRequest = pool.request();
			const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
			
			if (userIdNum !== null && userIdNum > 0) {
				userRequest.input("user_id", userIdNum);
			} else {
				userRequest.input("user_id", userId);
			}
			userRequest.input("email_address", userId);
			
			const userResult = await userRequest.query(`
				SELECT TOP(1) [UserType]
				FROM [SJDA_Users].[dbo].[PE_User]
				WHERE ([UserId] = @user_id OR [email_address] = @email_address)
			`);
			
			const user = userResult.recordset?.[0];
			const userType = user?.UserType || null;
			
			if (userType) {
				const hasUserTypeRouteAccess = hasUserTypeAccess(userType, route);
				if (hasUserTypeRouteAccess) {
					// UserType allows access - grant immediately without checking RBAC
					if (process.env.NODE_ENV === 'development') {
						console.log('[check-route-permission] UserType access granted:', {
							userId,
							route,
							userType,
							action
						});
					}
					return NextResponse.json({
						success: true,
						hasAccess: true,
						route,
						action: action || 'view',
						accessGrantedBy: 'UserType'
					});
				}
			}
		} catch (userTypeError) {
			// If UserType check fails, continue to RBAC check
			console.warn('[check-route-permission] Error checking UserType, falling back to RBAC:', userTypeError);
		}

		// Fall back to RBAC permission check
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
