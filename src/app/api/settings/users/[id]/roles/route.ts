import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";
import sql from "mssql";

export const maxDuration = 120;

// PUT /api/settings/users/[id]/roles
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

		// Handle params - in Next.js 15+, params might be a Promise
		const resolvedParams = params instanceof Promise ? await params : params;
		const targetUserId = decodeURIComponent(resolvedParams.id);
		
		console.log("[settings/users/[id]/roles] Received request:", {
			rawParams: resolvedParams,
			targetUserId,
			targetUserIdType: typeof targetUserId,
			targetUserIdLength: targetUserId?.length,
			url: request.url
		});
		
		const body = await request.json();
		const { roleIds } = body;
		
		console.log("[settings/users/[id]/roles] Request body:", {
			roleIds,
			roleIdsType: Array.isArray(roleIds) ? 'array' : typeof roleIds,
			roleIdsLength: Array.isArray(roleIds) ? roleIds.length : 'N/A'
		});

		if (!Array.isArray(roleIds)) {
			return NextResponse.json(
				{ success: false, message: "roleIds must be an array" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		// Parse UserId - must be numeric
		const parsedUserId = parseInt(targetUserId, 10);
		const isNumeric = !isNaN(parsedUserId) && parsedUserId >= 0 && /^\d+$/.test(targetUserId.trim());
		
		if (!isNumeric) {
			return NextResponse.json(
				{ 
					success: false, 
					message: `Invalid User ID format. Expected numeric UserId, got: ${targetUserId}` 
				},
				{ status: 400 }
			);
		}
		
		// Get the actual UserId (INT) from the database using UserId only
		const getUserRequest = pool.request();
		(getUserRequest as any).timeout = 120000;
		getUserRequest.input("user_id", parsedUserId);
		
		const userResult = await getUserRequest.query(`
			SELECT TOP(1) [UserId]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE [UserId] = @user_id
		`);
		
		if (userResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}
		
		const userRecord = userResult.recordset[0];
		const userIdFromDb = userRecord?.UserId;
		
		// Validate that UserId exists and is a valid integer
		if (!userRecord || userIdFromDb === null || userIdFromDb === undefined) {
			console.error("[settings/users/[id]/roles] UserId is null/undefined:", { userRecord, userIdFromDb });
			return NextResponse.json(
				{ success: false, message: "User ID is null or undefined in database" },
				{ status: 400 }
			);
		}
		
		// Convert to integer, handling various types
		let actualUserId: number;
		if (typeof userIdFromDb === 'number') {
			actualUserId = userIdFromDb;
		} else if (typeof userIdFromDb === 'string') {
			actualUserId = parseInt(userIdFromDb, 10);
		} else {
			actualUserId = parseInt(String(userIdFromDb), 10);
		}
		
		if (isNaN(actualUserId) || actualUserId < 0) {
			console.error("[settings/users/[id]/roles] Invalid UserId:", { userIdFromDb, actualUserId, type: typeof userIdFromDb });
			return NextResponse.json(
				{ success: false, message: `Invalid User ID in database: ${userIdFromDb}` },
				{ status: 400 }
			);
		}

		// Filter out invalid roleIds before processing
		const validRoleIds: number[] = [];
		for (const roleId of roleIds) {
			if (roleId === null || roleId === undefined) {
				console.warn("[settings/users/[id]/roles] Skipping null/undefined roleId");
				continue;
			}
			
			let roleIdNum: number;
			if (typeof roleId === 'number') {
				roleIdNum = roleId;
			} else if (typeof roleId === 'string') {
				roleIdNum = parseInt(roleId, 10);
			} else {
				roleIdNum = parseInt(String(roleId), 10);
			}
			
			if (isNaN(roleIdNum) || roleIdNum <= 0) {
				console.warn("[settings/users/[id]/roles] Skipping invalid roleId:", roleId);
				continue;
			}
			
			validRoleIds.push(roleIdNum);
		}
		
		console.log("[settings/users/[id]/roles] Processing:", {
			targetUserId,
			actualUserId,
			roleIdsCount: roleIds.length,
			validRoleIdsCount: validRoleIds.length,
			validRoleIds
		});

		const transaction = new (await import("mssql")).Transaction(pool);
		await transaction.begin();

		try {
			const request = new (await import("mssql")).Request(transaction);
			(request as any).timeout = 120000;
			request.input("actual_user_id", sql.Int, actualUserId);

			// Delete existing roles using the actual UserId (INT)
			await request.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_Rights_UserRole]
				WHERE [UserId] = @actual_user_id
			`);

			// Insert new roles
			for (const roleIdNum of validRoleIds) {
				// Double-check values before inserting
				if (typeof actualUserId !== 'number' || isNaN(actualUserId) || actualUserId <= 0) {
					console.error("[settings/users/[id]/roles] Invalid actualUserId in loop:", actualUserId);
					throw new Error(`Invalid UserId: ${actualUserId}`);
				}
				
				if (typeof roleIdNum !== 'number' || isNaN(roleIdNum) || roleIdNum <= 0) {
					console.error("[settings/users/[id]/roles] Invalid roleIdNum in loop:", roleIdNum);
					continue;
				}
				
				const insertRequest = new (await import("mssql")).Request(transaction);
				insertRequest.input("actual_user_id", sql.Int, actualUserId);
				insertRequest.input("role_id", sql.Int, roleIdNum);

				await insertRequest.query(`
					INSERT INTO [SJDA_Users].[dbo].[PE_Rights_UserRole] ([UserId], [RoleId], [AssignedAt])
					VALUES (@actual_user_id, @role_id, GETDATE())
				`);
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "User roles updated successfully"
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[settings/users/[id]/roles] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating user roles" },
			{ status: 500 }
		);
	}
}
