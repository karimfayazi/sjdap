import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/pages
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
				[PageId],
				[PageKey],
				[PageName],
				[RoutePath],
				[SectionKey],
				[SortOrder],
				[IsActive],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_Rights_Page]
			ORDER BY [SectionKey], [SortOrder], [PageName]
		`);

		return NextResponse.json({
			success: true,
			pages: result.recordset
		});
	} catch (error: any) {
		console.error("[settings/pages] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching pages" },
			{ status: 500 }
		);
	}
}

// POST /api/settings/pages
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
		const { PageKey, PageName, RoutePath, SectionKey, SortOrder, IsActive } = body;

		if (!PageKey || !PageName || !RoutePath) {
			return NextResponse.json(
				{ success: false, message: "PageKey, PageName, and RoutePath are required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PageKey", PageKey);
		sqlRequest.input("PageName", PageName);
		sqlRequest.input("RoutePath", RoutePath);
		sqlRequest.input("SectionKey", SectionKey || null);
		sqlRequest.input("SortOrder", SortOrder || null);
		sqlRequest.input("IsActive", IsActive !== false);

		const result = await sqlRequest.query(`
			INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Page] 
				([PageKey], [PageName], [RoutePath], [SectionKey], [SortOrder], [IsActive], [CreatedAt])
			VALUES (@PageKey, @PageName, @RoutePath, @SectionKey, @SortOrder, @IsActive, GETDATE())
			SELECT SCOPE_IDENTITY() AS PageId
		`);

		return NextResponse.json({
			success: true,
			pageId: result.recordset[0].PageId,
			message: "Page created successfully"
		});
	} catch (error: any) {
		console.error("[settings/pages] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error creating page" },
			{ status: 500 }
		);
	}
}

// PUT /api/settings/pages
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
		const { PageId: PageIdParam, PageKey, PageName, RoutePath, SectionKey, SortOrder, IsActive } = body;

		if (!PageIdParam || !PageKey || !PageName || !RoutePath) {
			return NextResponse.json(
				{ success: false, message: "PageId, PageKey, PageName, and RoutePath are required" },
				{ status: 400 }
			);
		}

		const PageId = typeof PageIdParam === 'number' ? PageIdParam : parseInt(String(PageIdParam), 10);
		if (isNaN(PageId) || PageId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid PageId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PageId", PageId);
		sqlRequest.input("PageKey", PageKey);
		sqlRequest.input("PageName", PageName);
		sqlRequest.input("RoutePath", RoutePath);
		sqlRequest.input("SectionKey", SectionKey || null);
		sqlRequest.input("SortOrder", SortOrder || null);
		sqlRequest.input("IsActive", IsActive !== false);

		await sqlRequest.query(`
			UPDATE [SJDA_Users].[dbo].[PE_Rights_Page]
			SET 
				[PageKey] = @PageKey,
				[PageName] = @PageName,
				[RoutePath] = @RoutePath,
				[SectionKey] = @SectionKey,
				[SortOrder] = @SortOrder,
				[IsActive] = @IsActive
			WHERE [PageId] = @PageId
		`);

		return NextResponse.json({
			success: true,
			message: "Page updated successfully"
		});
	} catch (error: any) {
		console.error("[settings/pages] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating page" },
			{ status: 500 }
		);
	}
}

// DELETE /api/settings/pages
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
		const pageIdParam = searchParams.get("pageId");

		if (!pageIdParam) {
			return NextResponse.json(
				{ success: false, message: "pageId is required" },
				{ status: 400 }
			);
		}

		const pageId = parseInt(pageIdParam, 10);
		if (isNaN(pageId) || pageId <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid pageId. Must be a positive integer." },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("PageId", pageId);

		// Check if page has permissions
		const checkResult = await sqlRequest.query(`
			SELECT COUNT(*) AS PermCount
			FROM [SJDA_Users].[dbo].[PE_Rights_Permission]
			WHERE [PageId] = @PageId
		`);

		if (checkResult.recordset[0].PermCount > 0) {
			return NextResponse.json(
				{ success: false, message: "Cannot delete page. It has associated permissions." },
				{ status: 400 }
			);
		}

		// Delete page
		await sqlRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Rights_Page]
			WHERE [PageId] = @PageId
		`);

		return NextResponse.json({
			success: true,
			message: "Page deleted successfully"
		});
	} catch (error: any) {
		console.error("[settings/pages] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error deleting page" },
			{ status: 500 }
		);
	}
}
