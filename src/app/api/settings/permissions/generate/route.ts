import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// POST /api/settings/permissions/generate
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
		const { actions } = body;

		if (!Array.isArray(actions) || actions.length === 0) {
			return NextResponse.json(
				{ success: false, message: "actions must be a non-empty array" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const transaction = new (await import("mssql")).Transaction(pool);
		await transaction.begin();

		try {
			// Get all active pages
			const pagesRequest = new (await import("mssql")).Request(transaction);
			const pagesResult = await pagesRequest.query(`
				SELECT [PageId], [PageKey]
				FROM [SJDA_Users].[dbo].[PE_Rights_Page]
				WHERE [IsActive] = 1
			`);

			const pages = pagesResult.recordset;
			const generated: any[] = [];
			const skipped: any[] = [];

			for (const page of pages) {
				for (const actionKey of actions) {
					const PermKey = `${page.PageKey}:${actionKey}`;

					// Check if permission already exists
					const checkRequest = new (await import("mssql")).Request(transaction);
					checkRequest.input("PermKey", PermKey);
					const checkResult = await checkRequest.query(`
						SELECT [PermissionId]
						FROM [SJDA_Users].[dbo].[PE_Rights_Permission]
						WHERE [PermKey] = @PermKey
					`);

					if (checkResult.recordset.length > 0) {
						skipped.push({ PageKey: page.PageKey, ActionKey: actionKey, reason: "Already exists" });
						continue;
					}

					// Insert new permission
					const insertRequest = new (await import("mssql")).Request(transaction);
					insertRequest.input("PermKey", PermKey);
					insertRequest.input("PageId", page.PageId);
					insertRequest.input("ActionKey", actionKey);

					await insertRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Permission] 
							([PermKey], [PageId], [ActionKey], [IsActive], [CreatedAt])
						VALUES (@PermKey, @PageId, @ActionKey, 1, GETDATE())
					`);

					generated.push({ PageKey: page.PageKey, ActionKey: actionKey });
				}
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Permissions generated successfully",
				generated: generated.length,
				skipped: skipped.length,
				details: { generated, skipped }
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[settings/permissions/generate] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error generating permissions" },
			{ status: 500 }
		);
	}
}
