import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

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
			AccessScope 
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
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Check if email already exists
		sqlRequest.input("email_address", email_address);
		const checkResult = await sqlRequest.query(`
			SELECT TOP(1) [UserId] 
			FROM [SJDA_Users].[dbo].[PE_User] 
			WHERE [email_address] = @email_address
		`);

		if (checkResult.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "Email address already exists" },
				{ status: 400 }
			);
		}

		// TODO: Implement password hashing (bcrypt) - currently storing plaintext for compatibility
		// For now, store password as-is to maintain compatibility with existing system
		sqlRequest.input("UserFullName", UserFullName);
		sqlRequest.input("Password", Password);
		sqlRequest.input("UserType", UserType);
		sqlRequest.input("Designation", Designation || null);
		sqlRequest.input("Regional_Council", Regional_Council || null);
		sqlRequest.input("Local_Council", Local_Council || null);
		sqlRequest.input("AccessScope", AccessScope || null);

		const result = await sqlRequest.query(`
			INSERT INTO [SJDA_Users].[dbo].[PE_User] 
				([email_address], [UserFullName], [Password], [UserType], [Designation], 
				 [Regional_Council], [Local_Council], [AccessScope], [user_create_date], [user_update_date])
			VALUES (@email_address, @UserFullName, @Password, @UserType, @Designation, 
					@Regional_Council, @Local_Council, @AccessScope, GETDATE(), GETDATE())
			SELECT SCOPE_IDENTITY() AS UserId
		`);

		return NextResponse.json({
			success: true,
			userId: result.recordset[0].UserId,
			message: "User created successfully"
		});
	} catch (error: any) {
		console.error("[admin/users] POST Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error creating user" },
			{ status: 500 }
		);
	}
}
