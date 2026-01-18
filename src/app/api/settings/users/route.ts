import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// GET /api/settings/users?search=&userType=&regionalCouncil=
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
		const search = searchParams.get("search") || "";
		const userType = searchParams.get("userType") || "";
		const regionalCouncil = searchParams.get("regionalCouncil") || "";

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause
		let whereConditions: string[] = [];
		
		if (search) {
			sqlRequest.input("search", `%${search}%`);
			whereConditions.push(`(
				[email_address] LIKE @search 
				OR [UserFullName] LIKE @search
				OR CAST([UserId] AS NVARCHAR) LIKE @search
			)`);
		}

		if (userType) {
			sqlRequest.input("userType", userType);
			whereConditions.push(`[UserType] = @userType`);
		}

		if (regionalCouncil) {
			sqlRequest.input("regionalCouncil", regionalCouncil);
			whereConditions.push(`[Regional_Council] = @regionalCouncil`);
		}

		const whereClause = whereConditions.length > 0 
			? `WHERE ${whereConditions.join(" AND ")}`
			: "";

		// Using only columns marked as ✅ Keep or ⚠️ Optional from the table specification
		// NOTE: Password is excluded - never expose in UI
		const query = `
			SELECT 
				[UserId],              -- ✅ Primary key, used by RBAC mappings
				[email_address],       -- ✅ Login + user identification
				[UserFullName],        -- ✅ Display
				[UserType],            -- ⚠️ Optional - Legacy / admin shortcut
				[Designation],         -- ✅ Informational
				[Regional_Council],    -- ⚠️ Optional - Can be replaced by mapping table
				[Local_Council],       -- ⚠️ Optional - Same as above
				[AccessScope],         -- ✅ Data-scope filter
				[user_create_date],    -- ✅ Audit
				[user_update_date]     -- ✅ Audit
			FROM [SJDA_Users].[dbo].[PE_User]
			${whereClause}
			ORDER BY [UserFullName], [email_address]
		`;

		const result = await sqlRequest.query(query);

		// Log first user to verify UserId is present
		if (result.recordset && result.recordset.length > 0) {
			console.log("[settings/users] First user sample:", {
				UserId: result.recordset[0].UserId,
				hasUserId: 'UserId' in result.recordset[0],
				keys: Object.keys(result.recordset[0]),
				email: result.recordset[0].email_address
			});
		}

		// Ensure all users have UserId - map and validate
		// Normalize UserId to PascalCase and ensure it's a number
		const usersWithUserId = result.recordset.map((user: any) => {
			// Ensure UserId is present - check multiple possible property names
			let userId = user.UserId ?? user.userId ?? user.ID ?? user.id;
			
			// Convert to number if valid
			if (userId !== null && userId !== undefined) {
				const numUserId = Number(userId);
				if (Number.isFinite(numUserId) && numUserId > 0) {
					userId = numUserId;
				}
			}
			
			// Always set UserId in PascalCase for consistency
			const normalizedUser = {
				...user,
				UserId: userId
			};
			
			// Warn if UserId is still missing
			if (normalizedUser.UserId === null || normalizedUser.UserId === undefined) {
				console.warn("[settings/users] User missing UserId:", {
					user: normalizedUser,
					keys: Object.keys(normalizedUser)
				});
			}
			
			return normalizedUser;
		});

		return NextResponse.json({
			success: true,
			users: usersWithUserId
		});
	} catch (error: any) {
		console.error("[settings/users] Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching users" },
			{ status: 500 }
		);
	}
}
