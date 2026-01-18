import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// POST /api/settings/pages/sync
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
		const { pages } = body;

		if (!Array.isArray(pages)) {
			return NextResponse.json(
				{ success: false, message: "pages must be an array" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const transaction = new (await import("mssql")).Transaction(pool);
		await transaction.begin();

		try {
			const inserted: any[] = [];
			const updated: any[] = [];
			const skipped: any[] = [];

			for (const page of pages) {
				const { PageKey, PageName, RoutePath, SectionKey, SortOrder } = page;

				if (!PageKey || !PageName || !RoutePath) {
					skipped.push({ page, reason: "Missing required fields" });
					continue;
				}

				const request = new (await import("mssql")).Request(transaction);
				request.input("PageKey", PageKey);
				request.input("RoutePath", RoutePath);

				// Check if page exists by PageKey or RoutePath
				const checkResult = await request.query(`
					SELECT [PageId] 
					FROM [SJDA_Users].[dbo].[PE_Rights_Page]
					WHERE [PageKey] = @PageKey OR [RoutePath] = @RoutePath
				`);

				if (checkResult.recordset.length > 0) {
					// Update existing
					const updateRequest = new (await import("mssql")).Request(transaction);
					updateRequest.input("PageId", checkResult.recordset[0].PageId);
					updateRequest.input("PageKey", PageKey);
					updateRequest.input("PageName", PageName);
					updateRequest.input("RoutePath", RoutePath);
					updateRequest.input("SectionKey", SectionKey || null);
					updateRequest.input("SortOrder", SortOrder || null);

					await updateRequest.query(`
						UPDATE [SJDA_Users].[dbo].[PE_Rights_Page]
						SET 
							[PageName] = @PageName,
							[RoutePath] = @RoutePath,
							[SectionKey] = @SectionKey,
							[SortOrder] = @SortOrder,
							[IsActive] = 1
						WHERE [PageId] = @PageId
					`);

					updated.push({ PageKey, PageName });
				} else {
					// Insert new
					const insertRequest = new (await import("mssql")).Request(transaction);
					insertRequest.input("PageKey", PageKey);
					insertRequest.input("PageName", PageName);
					insertRequest.input("RoutePath", RoutePath);
					insertRequest.input("SectionKey", SectionKey || null);
					insertRequest.input("SortOrder", SortOrder || null);

					await insertRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Page] 
							([PageKey], [PageName], [RoutePath], [SectionKey], [SortOrder], [IsActive], [CreatedAt])
						VALUES (@PageKey, @PageName, @RoutePath, @SectionKey, @SortOrder, 1, GETDATE())
					`);

					inserted.push({ PageKey, PageName });
				}
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Pages synced successfully",
				inserted: inserted.length,
				updated: updated.length,
				skipped: skipped.length,
				details: { inserted, updated, skipped }
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[settings/pages/sync] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error syncing pages" },
			{ status: 500 }
		);
	}
}
