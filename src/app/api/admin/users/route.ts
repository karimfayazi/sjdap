import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";
import sql from "mssql";

export const maxDuration = 120;

// GET /api/admin/users - List users with filters
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

		// Check if Super Admin or Admin
		const isAdmin = await isSuperAdmin(userId);
		if (!isAdmin) {
			// Also check if UserType is Admin (not just Super Admin)
			const pool = await getDb();
			const userCheck = pool.request();
			userCheck.input("user_id", userId);
			userCheck.input("email_address", userId);
			const userResult = await userCheck.query(`
				SELECT TOP(1) [UserType] 
				FROM [SJDA_Users].[dbo].[PE_User] 
				WHERE ([UserId] = @user_id OR [email_address] = @email_address)
			`);
			const userType = userResult.recordset?.[0]?.UserType;
			const normalizedUserType = userType ? String(userType).trim().toLowerCase() : '';
			if (normalizedUserType !== 'admin' && normalizedUserType !== 'super admin') {
				return NextResponse.json(
					{ success: false, message: "Access denied. Admin only." },
					{ status: 403 }
				);
			}
		}

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const search = searchParams.get("search") || "";
		const userType = searchParams.get("userType") || "";
		const accessScope = searchParams.get("accessScope") || "";
		const regionalCouncil = searchParams.get("regionalCouncil") || "";

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause dynamically
		let whereConditions = [];
		let params: { [key: string]: any } = {};

		if (search) {
			whereConditions.push(`(
				[email_address] LIKE @search 
				OR [UserFullName] LIKE @search 
				OR [UserType] LIKE @search
			)`);
			params.search = `%${search}%`;
		}

		if (userType) {
			whereConditions.push(`[UserType] = @userType`);
			params.userType = userType;
		}

		if (accessScope) {
			whereConditions.push(`[AccessScope] = @accessScope`);
			params.accessScope = accessScope;
		}

		if (regionalCouncil) {
			whereConditions.push(`[Regional_Council] = @regionalCouncil`);
			params.regionalCouncil = regionalCouncil;
		}

		const whereClause = whereConditions.length > 0 
			? `WHERE ${whereConditions.join(" AND ")}` 
			: "";

		// Set parameters
		Object.entries(params).forEach(([key, value]) => {
			sqlRequest.input(key, value);
		});

		const query = `
			SELECT TOP 1000
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
			${whereClause}
			ORDER BY [user_create_date] DESC
		`;

		const result = await sqlRequest.query(query);

		return NextResponse.json({
			success: true,
			users: result.recordset
		});
	} catch (error: any) {
		console.error("[admin/users] GET Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching users" },
			{ status: 500 }
		);
	}
}

// POST /api/admin/users - Create new user
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

		// Check if Super Admin or Admin
		const isAdmin = await isSuperAdmin(userId);
		if (!isAdmin) {
			const pool = await getDb();
			const userCheck = pool.request();
			userCheck.input("user_id", userId);
			userCheck.input("email_address", userId);
			const userResult = await userCheck.query(`
				SELECT TOP(1) [UserType] 
				FROM [SJDA_Users].[dbo].[PE_User] 
				WHERE ([UserId] = @user_id OR [email_address] = @email_address)
			`);
			const userType = userResult.recordset?.[0]?.UserType;
			const normalizedUserType = userType ? String(userType).trim().toLowerCase() : '';
			if (normalizedUserType !== 'admin' && normalizedUserType !== 'super admin') {
				return NextResponse.json(
					{ success: false, message: "Access denied. Admin only." },
					{ status: 403 }
				);
			}
		}

		const body = await request.json();
		const { 
			email_address, 
			UserFullName, 
			Password, 
			UserType, 
			Designation, 
			Regional_Council, 
			Local_Council, 
			AccessScope,
			RegionalCouncilIds // Array of RegionalCouncilId values from checkboxes
		} = body;

		// Validation
		if (!email_address || !UserFullName || !Password || !UserType) {
			return NextResponse.json(
				{ success: false, message: "email_address, UserFullName, Password, and UserType are required" },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email_address)) {
			return NextResponse.json(
				{ success: false, message: "Invalid email format" },
				{ status: 400 }
			);
		}

		// Validate AccessScope if provided
		if (AccessScope && !['ALL', 'REGION', 'LOCAL'].includes(AccessScope.toUpperCase())) {
			return NextResponse.json(
				{ success: false, message: "AccessScope must be one of: ALL, REGION, LOCAL" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		// Start transaction
		const transaction = new sql.Transaction(pool);
		await transaction.begin();

		try {
			// Check if email already exists
			const checkRequest = new sql.Request(transaction);
			checkRequest.input("email_address", email_address);
			const checkResult = await checkRequest.query(`
				SELECT TOP(1) [UserId] 
				FROM [SJDA_Users].[dbo].[PE_User] 
				WHERE [email_address] = @email_address
			`);

			if (checkResult.recordset.length > 0) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "Email address already exists" },
					{ status: 400 }
				);
			}

			// TODO: Implement password hashing (bcrypt) - currently storing plaintext for compatibility
			// For now, store password as-is to maintain compatibility with existing system
			const insertRequest = new sql.Request(transaction);
			insertRequest.input("email_address", email_address);
			insertRequest.input("UserFullName", UserFullName);
			insertRequest.input("Password", Password);
			insertRequest.input("UserType", UserType);
			insertRequest.input("Designation", Designation || null);
			insertRequest.input("Regional_Council", Regional_Council || null);
			insertRequest.input("Local_Council", Local_Council || null);
			insertRequest.input("AccessScope", AccessScope || null);

			const result = await insertRequest.query(`
				INSERT INTO [SJDA_Users].[dbo].[PE_User] 
					([email_address], [UserFullName], [Password], [UserType], [Designation], 
					 [Regional_Council], [Local_Council], [AccessScope], [user_create_date], [user_update_date])
				VALUES (@email_address, @UserFullName, @Password, @UserType, @Designation, 
						@Regional_Council, @Local_Council, @AccessScope, GETDATE(), GETDATE())
				SELECT SCOPE_IDENTITY() AS UserId
			`);

			const newUserId = result.recordset[0].UserId;

			// Handle Regional Councils mapping
			// Insert new mappings if provided
			if (RegionalCouncilIds && Array.isArray(RegionalCouncilIds) && RegionalCouncilIds.length > 0) {
				for (const rcId of RegionalCouncilIds) {
					if (rcId) {
						const insertRcRequest = new sql.Request(transaction);
						insertRcRequest.input("UserId", newUserId);
						insertRcRequest.input("RegionalCouncilId", sql.Int, parseInt(rcId));
						await insertRcRequest.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ([UserId], [RegionalCouncilId])
							VALUES (@UserId, @RegionalCouncilId)
						`);
					}
				}
			}

			// Commit transaction
			await transaction.commit();

			return NextResponse.json({
				success: true,
				userId: newUserId,
				message: "User created successfully"
			});
		} catch (error) {
			// Rollback transaction on error
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[admin/users] POST Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error creating user" },
			{ status: 500 }
		);
	}
}
