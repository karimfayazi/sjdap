import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/users/[id]
export async function GET(
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
		const rawId = resolvedParams.id;
		
		console.log("[settings/users/[id]] Received params.id:", rawId, "Type:", typeof rawId);
		
		// Validate id parameter
		if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId.trim() === '') {
			return NextResponse.json(
				{ 
					success: false, 
					message: `Invalid userId. UserId is missing or undefined. Received: ${rawId}`,
					receivedId: rawId
				},
				{ status: 400 }
			);
		}

		// Parse and validate userId
		const parsedUserId = Number(rawId);
		
		if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
			return NextResponse.json(
				{ 
					success: false, 
					message: `Invalid userId. Expected positive number, got: ${rawId}`,
					receivedId: rawId
				},
				{ status: 400 }
			);
		}

		console.log("[settings/users/[id]] Parsed userId:", parsedUserId);

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		
		// Use INT parameter for UserId lookup
		sqlRequest.input("UserId", parsedUserId);

		// Get user by UserId only
		const userResult = await sqlRequest.query(`
			SELECT TOP(1)
				[UserId],
				[email_address],
				[UserFullName],
				[UserType],
				[Designation],
				[Regional_Council],
				[Local_Council],
				[AccessScope],
				[user_create_date],
				[user_update_date]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE [UserId] = @UserId
		`);
		
		console.log("[settings/users/[id]] Query result count:", userResult.recordset.length);

		if (userResult.recordset.length === 0) {
			console.error("[settings/users/[id]] User not found:", {
				receivedId: rawId,
				parsedUserId
			});
			return NextResponse.json(
				{ 
					success: false, 
					message: `User not found with UserId: ${parsedUserId}`
				},
				{ status: 404 }
			);
		}

		const user = userResult.recordset[0];
		const dbUserId = user.UserId; // This is the INT UserId from the database

		// Validate that UserId exists and is a valid integer
		if (dbUserId === null || dbUserId === undefined) {
			return NextResponse.json(
				{ success: false, message: "User ID is null or undefined in database" },
				{ status: 400 }
			);
		}

		// Convert to number if needed
		const userRoleId = typeof dbUserId === 'number' 
			? dbUserId 
			: parseInt(String(dbUserId), 10);
		
		if (isNaN(userRoleId) || userRoleId < 0) {
			return NextResponse.json(
				{ success: false, message: `Invalid User ID in database: ${dbUserId}` },
				{ status: 400 }
			);
		}

		// Get user roles - use the actual UserId (INT) from the user record
		const rolesRequest = pool.request();
		(rolesRequest as any).timeout = 120000;
		rolesRequest.input("actual_user_id", userRoleId);
		
		const rolesResult = await rolesRequest.query(`
			SELECT 
				ur.[RoleId],
				ur.[AssignedAt],
				r.[RoleName],
				r.[RoleDescription],
				r.[IsActive]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r ON ur.[RoleId] = r.[RoleId]
			WHERE ur.[UserId] = @actual_user_id
			ORDER BY r.[RoleName]
		`);

		// Get all available roles
		const allRolesResult = await sqlRequest.query(`
			SELECT 
				[RoleId],
				[RoleName],
				[RoleDescription],
				[IsActive]
			FROM [SJDA_Users].[dbo].[PE_Rights_Role]
			WHERE [IsActive] = 1
			ORDER BY [RoleName]
		`);

		// Get user permission overrides (if table exists)
		let userPermissions: any[] = [];
		try {
			const userPermsRequest = pool.request();
			(userPermsRequest as any).timeout = 120000;
			userPermsRequest.input("actual_user_id", userRoleId);
			
			const userPermsResult = await userPermsRequest.query(`
				SELECT 
					up.[PermissionId],
					up.[IsAllowed],
					up.[AssignedAt],
					p.[PermKey],
					p.[ActionKey],
					p.[PageId],
					pg.[PageKey],
					pg.[PageName],
					pg.[RoutePath]
				FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
				INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
				INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
				WHERE up.[UserId] = @actual_user_id
				ORDER BY pg.[PageName], p.[ActionKey]
			`);
			userPermissions = userPermsResult.recordset;
		} catch (err) {
			// Table might not exist, ignore
			console.log("[settings/users/[id]] UserPermission table not found or error:", err);
		}

		// Remove Password from response for security
		const { Password, ...userWithoutPassword } = user;

		// CRITICAL: Ensure UserId is always present in the response
		// Even if it was removed by destructuring, explicitly add it back
		const userResponse = {
			...userWithoutPassword,
			UserId: userRoleId // Use the validated numeric UserId
		};

		console.log("[settings/users/[id]] Returning user response:", {
			userId: userResponse.UserId,
			userIdType: typeof userResponse.UserId,
			hasUserId: 'UserId' in userResponse,
			userKeys: Object.keys(userResponse)
		});

		return NextResponse.json({
			success: true,
			ok: true,
			user: userResponse,
			assignedRoles: rolesResult.recordset,
			availableRoles: allRolesResult.recordset,
			userPermissions
		});
	} catch (error: any) {
		console.error("[settings/users/[id]] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching user" },
			{ status: 500 }
		);
	}
}
