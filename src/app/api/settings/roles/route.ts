import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/roles
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
				[RoleId],
				[RoleName],
				[RoleDescription],
				[IsActive],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_Rights_Role]
			ORDER BY [RoleName]
		`);

		return NextResponse.json({
			success: true,
			roles: result.recordset
		});
	} catch (error: any) {
		console.error("[settings/roles] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching roles" },
			{ status: 500 }
		);
	}
}

// POST /api/settings/roles
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
		const { RoleName, RoleDescription, IsActive } = body;

		if (!RoleName) {
			return NextResponse.json(
				{ success: false, message: "RoleName is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("RoleName", RoleName);
		sqlRequest.input("RoleDescription", RoleDescription || null);
		sqlRequest.input("IsActive", IsActive !== false);

		const result = await sqlRequest.query(`
			INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Role] 
				([RoleName], [RoleDescription], [IsActive], [CreatedAt])
			VALUES (@RoleName, @RoleDescription, @IsActive, GETDATE())
			SELECT SCOPE_IDENTITY() AS RoleId
		`);

		return NextResponse.json({
			success: true,
			roleId: result.recordset[0].RoleId,
			message: "Role created successfully"
		});
	} catch (error: any) {
		console.error("[settings/roles] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error creating role" },
			{ status: 500 }
		);
	}
}

// PUT /api/settings/roles
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
		const { RoleId: RoleIdParam, RoleName, RoleDescription, IsActive } = body;

		if (!RoleIdParam || !RoleName) {
			return NextResponse.json(
				{ success: false, message: "RoleId and RoleName are required" },
				{ status: 400 }
			);
		}

		const RoleId = typeof RoleIdParam === 'number' ? RoleIdParam : parseInt(String(RoleIdParam), 10);
		if (isNaN(RoleId) || RoleId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid RoleId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("RoleId", RoleId);
		sqlRequest.input("RoleName", RoleName);
		sqlRequest.input("RoleDescription", RoleDescription || null);
		sqlRequest.input("IsActive", IsActive !== false);

		await sqlRequest.query(`
			UPDATE [SJDA_Users].[dbo].[PE_Rights_Role]
			SET 
				[RoleName] = @RoleName,
				[RoleDescription] = @RoleDescription,
				[IsActive] = @IsActive
			WHERE [RoleId] = @RoleId
		`);

		return NextResponse.json({
			success: true,
			message: "Role updated successfully"
		});
	} catch (error: any) {
		console.error("[settings/roles] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating role" },
			{ status: 500 }
		);
	}
}

// DELETE /api/settings/roles
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

		// Check if role is assigned to any users
		const checkResult = await sqlRequest.query(`
			SELECT COUNT(*) AS UserCount
			FROM [SJDA_Users].[dbo].[PE_Rights_UserRole]
			WHERE [RoleId] = @RoleId
		`);

		if (checkResult.recordset[0].UserCount > 0) {
			return NextResponse.json(
				{ success: false, message: "Cannot delete role. It is assigned to one or more users." },
				{ status: 400 }
			);
		}

		// Delete role permissions first
		await sqlRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Rights_RolePermission]
			WHERE [RoleId] = @RoleId
		`);

		// Delete role
		await sqlRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Rights_Role]
			WHERE [RoleId] = @RoleId
		`);

		return NextResponse.json({
			success: true,
			message: "Role deleted successfully"
		});
	} catch (error: any) {
		console.error("[settings/roles] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error deleting role" },
			{ status: 500 }
		);
	}
}
