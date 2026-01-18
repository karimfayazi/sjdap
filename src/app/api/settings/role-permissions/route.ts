import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/role-permissions?roleId=#
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
		const roleIdParam = searchParams.get("roleId");

		if (!roleIdParam) {
			return NextResponse.json(
				{ success: false, message: "roleId is required" },
				{ status: 400 }
			);
		}

		const roleId = parseInt(roleIdParam, 10);
		if (isNaN(roleId) || roleId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid roleId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("RoleId", roleId);

		// Get all pages with their permissions
		const pagesResult = await sqlRequest.query(`
			SELECT 
				pg.[PageId],
				pg.[PageKey],
				pg.[PageName],
				pg.[RoutePath],
				pg.[SectionKey],
				pg.[SortOrder]
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			WHERE pg.[IsActive] = 1
			ORDER BY pg.[SectionKey], pg.[SortOrder], pg.[PageName]
		`);

		// Get all permissions for these pages
		const permsResult = await sqlRequest.query(`
			SELECT 
				p.[PermissionId],
				p.[PermKey],
				p.[ActionKey],
				p.[PageId]
			FROM [SJDA_Users].[dbo].[PE_Rights_Permission] p
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE p.[IsActive] = 1 AND pg.[IsActive] = 1
			ORDER BY p.[PageId], p.[ActionKey]
		`);

		// Get role permissions
		const rolePermsResult = await sqlRequest.query(`
			SELECT 
				[PermissionId],
				[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_RolePermission]
			WHERE [RoleId] = @RoleId
		`);

		// Create a map of permissionId -> isAllowed
		const rolePermsMap = new Map<number, boolean>();
		for (const rp of rolePermsResult.recordset) {
			const isAllowed = rp.IsAllowed === true || rp.IsAllowed === 1 || rp.IsAllowed === 'Yes';
			rolePermsMap.set(rp.PermissionId, isAllowed);
		}

		// Group permissions by page
		const pagesWithPerms = pagesResult.recordset.map((page: any) => {
			const pagePerms = permsResult.recordset
				.filter((p: any) => p.PageId === page.PageId)
				.map((p: any) => ({
					PermissionId: p.PermissionId,
					PermKey: p.PermKey,
					ActionKey: p.ActionKey,
					IsAllowed: rolePermsMap.get(p.PermissionId) || false
				}));

			return {
				...page,
				permissions: pagePerms
			};
		});

		return NextResponse.json({
			success: true,
			pages: pagesWithPerms
		});
	} catch (error: any) {
		console.error("[settings/role-permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching role permissions" },
			{ status: 500 }
		);
	}
}

// PUT /api/settings/role-permissions
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
		const { roleId: roleIdParam, updates } = body;

		if (!roleIdParam || !Array.isArray(updates)) {
			return NextResponse.json(
				{ success: false, message: "roleId and updates array are required" },
				{ status: 400 }
			);
		}

		// Validate and convert roleId to integer
		const roleId = typeof roleIdParam === 'number' ? roleIdParam : parseInt(String(roleIdParam), 10);
		if (isNaN(roleId) || roleId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid roleId. Must be a positive integer." },
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
					console.warn(`[settings/role-permissions] Skipping invalid update:`, update);
					continue; // Skip invalid updates
				}

				// Validate and convert permissionId to integer
				const permissionId = typeof permissionIdParam === 'number' ? permissionIdParam : parseInt(String(permissionIdParam), 10);
				if (isNaN(permissionId) || permissionId <= 0) {
					console.warn(`[settings/role-permissions] Invalid permissionId: ${permissionIdParam}, skipping`);
					continue;
				}

				const request = new (await import("mssql")).Request(transaction);
				request.input("RoleId", roleId);
				request.input("PermissionId", permissionId);
				request.input("IsAllowed", isAllowed);

				// Check if record exists
				const checkResult = await request.query(`
					SELECT COUNT(*) AS Count
					FROM [SJDA_Users].[dbo].[PE_Rights_RolePermission]
					WHERE [RoleId] = @RoleId AND [PermissionId] = @PermissionId
				`);

				if (checkResult.recordset[0].Count > 0) {
					// Update existing
					await request.query(`
						UPDATE [SJDA_Users].[dbo].[PE_Rights_RolePermission]
						SET [IsAllowed] = @IsAllowed
						WHERE [RoleId] = @RoleId AND [PermissionId] = @PermissionId
					`);
				} else {
					// Insert new
					await request.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_Rights_RolePermission] 
							([RoleId], [PermissionId], [IsAllowed], [GrantedAt])
						VALUES (@RoleId, @PermissionId, @IsAllowed, GETDATE())
					`);
				}
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Role permissions updated successfully"
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[settings/role-permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating role permissions" },
			{ status: 500 }
		);
	}
}
