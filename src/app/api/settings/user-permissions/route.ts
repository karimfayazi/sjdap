import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/user-permissions?userId=#
export async function GET(request: NextRequest) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie?.value) {
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

		// Check if Super Admin
		if (!(await isSuperAdmin(userId))) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Super Admin only." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get("userId");

		if (!targetUserId) {
			return NextResponse.json(
				{ success: false, message: "userId is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("user_id", targetUserId);
		sqlRequest.input("email_address", targetUserId);

		try {
			const result = await sqlRequest.query(`
				SELECT 
					up.[PermissionId],
					up.[IsAllowed],
					up.[AssignedAt],
					p.[PermKey],
					p.[ActionKey],
					p.[PageId],
					pg.[PageKey],
					pg.[PageName],
					pg.[RoutePath],
					pg.[SectionKey]
				FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
				INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
				INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
				WHERE up.[UserId] = @user_id OR up.[UserId] = @email_address
				ORDER BY pg.[SectionKey], pg.[PageName], p.[ActionKey]
			`);

			return NextResponse.json({
				success: true,
				permissions: result.recordset
			});
		} catch (err: any) {
			// Table might not exist
			if (err.message?.includes("Invalid object name") || err.message?.includes("does not exist")) {
				return NextResponse.json({
					success: true,
					permissions: [],
					message: "UserPermission table does not exist"
				});
			}
			throw err;
		}
	} catch (error: any) {
		console.error("[settings/user-permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching user permissions" },
			{ status: 500 }
		);
	}
}

// PUT /api/settings/user-permissions
export async function PUT(request: NextRequest) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie?.value) {
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

		// Check if Super Admin
		if (!(await isSuperAdmin(userId))) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Super Admin only." },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { userId: targetUserId, updates } = body;

		if (!targetUserId || !Array.isArray(updates)) {
			return NextResponse.json(
				{ success: false, message: "userId and updates array are required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const transaction = new (await import("mssql")).Transaction(pool);
		await transaction.begin();

		try {
			for (const update of updates) {
				const { permissionId: permissionIdParam, isAllowed } = update;

				if (typeof permissionIdParam === 'undefined' || permissionIdParam === null || typeof isAllowed !== 'boolean') {
					console.warn(`[settings/user-permissions] Skipping invalid update:`, update);
					continue; // Skip invalid updates
				}

				// Validate and convert permissionId to integer
				const permissionId = typeof permissionIdParam === 'number' ? permissionIdParam : parseInt(String(permissionIdParam), 10);
				if (isNaN(permissionId) || permissionId <= 0) {
					console.warn(`[settings/user-permissions] Invalid permissionId: ${permissionIdParam}, skipping`);
					continue;
				}

				const request = new (await import("mssql")).Request(transaction);
				request.input("UserId", targetUserId);
				request.input("PermissionId", permissionId);
				request.input("IsAllowed", isAllowed);

				// Check if record exists
				const checkResult = await request.query(`
					SELECT COUNT(*) AS Count
					FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission]
					WHERE [UserId] = @UserId AND [PermissionId] = @PermissionId
				`);

				if (checkResult.recordset[0].Count > 0) {
					// Update existing
					await request.query(`
						UPDATE [SJDA_Users].[dbo].[PE_Rights_UserPermission]
						SET [IsAllowed] = @IsAllowed
						WHERE [UserId] = @UserId AND [PermissionId] = @PermissionId
					`);
				} else {
					// Insert new
					await request.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_Rights_UserPermission] 
							([UserId], [PermissionId], [IsAllowed], [AssignedAt])
						VALUES (@UserId, @PermissionId, @IsAllowed, GETDATE())
					`);
				}
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "User permissions updated successfully"
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[settings/user-permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating user permissions" },
			{ status: 500 }
		);
	}
}
