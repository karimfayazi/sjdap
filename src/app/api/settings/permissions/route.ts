import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/permissions
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

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		const result = await sqlRequest.query(`
			SELECT 
				p.[PermissionId],
				p.[PermKey],
				p.[PageId],
				p.[ActionKey],
				p.[IsActive],
				p.[CreatedAt],
				pg.[PageKey],
				pg.[PageName],
				pg.[RoutePath],
				pg.[SectionKey]
			FROM [SJDA_Users].[dbo].[PE_Rights_Permission] p
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			ORDER BY pg.[SectionKey], pg.[PageName], p.[ActionKey]
		`);

		return NextResponse.json({
			success: true,
			permissions: result.recordset
		});
	} catch (error: any) {
		console.error("[settings/permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching permissions" },
			{ status: 500 }
		);
	}
}

// POST /api/settings/permissions
export async function POST(request: NextRequest) {
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
		const { PageId: PageIdParam, ActionKey, IsActive } = body;

		if (!PageIdParam || !ActionKey) {
			return NextResponse.json(
				{ success: false, message: "PageId and ActionKey are required" },
				{ status: 400 }
			);
		}

		// Validate and convert PageId to integer
		const PageId = typeof PageIdParam === 'number' ? PageIdParam : parseInt(String(PageIdParam), 10);
		if (isNaN(PageId) || PageId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid PageId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		// Get PageKey for PermKey generation
		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PageId", PageId);

		const pageResult = await sqlRequest.query(`
			SELECT [PageKey] 
			FROM [SJDA_Users].[dbo].[PE_Rights_Page]
			WHERE [PageId] = @PageId
		`);

		if (pageResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Page not found" },
				{ status: 404 }
			);
		}

		const PageKey = pageResult.recordset[0].PageKey;
		const PermKey = `${PageKey}:${ActionKey}`;

		sqlRequest.input("PermKey", PermKey);
		sqlRequest.input("ActionKey", ActionKey);
		sqlRequest.input("IsActive", IsActive !== false);

		const result = await sqlRequest.query(`
			INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Permission] 
				([PermKey], [PageId], [ActionKey], [IsActive], [CreatedAt])
			VALUES (@PermKey, @PageId, @ActionKey, @IsActive, GETDATE())
			SELECT SCOPE_IDENTITY() AS PermissionId
		`);

		return NextResponse.json({
			success: true,
			permissionId: result.recordset[0].PermissionId,
			message: "Permission created successfully"
		});
	} catch (error: any) {
		console.error("[settings/permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error creating permission" },
			{ status: 500 }
		);
	}
}

// PUT /api/settings/permissions
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
		const { PermissionId: PermissionIdParam, PageId: PageIdParam, ActionKey, IsActive } = body;

		if (!PermissionIdParam || !PageIdParam || !ActionKey) {
			return NextResponse.json(
				{ success: false, message: "PermissionId, PageId, and ActionKey are required" },
				{ status: 400 }
			);
		}

		// Validate and convert IDs to integers
		const PermissionId = typeof PermissionIdParam === 'number' ? PermissionIdParam : parseInt(String(PermissionIdParam), 10);
		const PageId = typeof PageIdParam === 'number' ? PageIdParam : parseInt(String(PageIdParam), 10);
		
		if (isNaN(PermissionId) || PermissionId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid PermissionId. Must be a positive integer." },
				{ status: 400 }
			);
		}
		
		if (isNaN(PageId) || PageId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid PageId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		// Get PageKey for PermKey generation
		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PageId", PageId);
		sqlRequest.input("PermissionId", PermissionId);

		const pageResult = await sqlRequest.query(`
			SELECT [PageKey] 
			FROM [SJDA_Users].[dbo].[PE_Rights_Page]
			WHERE [PageId] = @PageId
		`);

		if (pageResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Page not found" },
				{ status: 404 }
			);
		}

		const PageKey = pageResult.recordset[0].PageKey;
		const PermKey = `${PageKey}:${ActionKey}`;

		sqlRequest.input("PermissionId", PermissionId);
		sqlRequest.input("PermKey", PermKey);
		sqlRequest.input("ActionKey", ActionKey);
		sqlRequest.input("IsActive", IsActive !== false);

		await sqlRequest.query(`
			UPDATE [SJDA_Users].[dbo].[PE_Rights_Permission]
			SET 
				[PermKey] = @PermKey,
				[ActionKey] = @ActionKey,
				[IsActive] = @IsActive
			WHERE [PermissionId] = @PermissionId
		`);

		return NextResponse.json({
			success: true,
			message: "Permission updated successfully"
		});
	} catch (error: any) {
		console.error("[settings/permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating permission" },
			{ status: 500 }
		);
	}
}

// DELETE /api/settings/permissions
export async function DELETE(request: NextRequest) {
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
		const permissionIdParam = searchParams.get("permissionId");

		if (!permissionIdParam) {
			return NextResponse.json(
				{ success: false, message: "permissionId is required" },
				{ status: 400 }
			);
		}

		const permissionId = parseInt(permissionIdParam, 10);
		if (isNaN(permissionId) || permissionId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid permissionId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PermissionId", permissionId);

		// Check if permission is used in role permissions
		const checkResult = await sqlRequest.query(`
			SELECT COUNT(*) AS RolePermCount
			FROM [SJDA_Users].[dbo].[PE_Rights_RolePermission]
			WHERE [PermissionId] = @PermissionId
		`);

		if (checkResult.recordset[0].RolePermCount > 0) {
			return NextResponse.json(
				{ success: false, message: "Cannot delete permission. It is assigned to one or more roles." },
				{ status: 400 }
			);
		}

		// Delete permission
		await sqlRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Rights_Permission]
			WHERE [PermissionId] = @PermissionId
		`);

		return NextResponse.json({
			success: true,
			message: "Permission deleted successfully"
		});
	} catch (error: any) {
		console.error("[settings/permissions] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error deleting permission" },
			{ status: 500 }
		);
	}
}
