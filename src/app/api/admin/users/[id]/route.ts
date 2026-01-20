import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";
import sql from "mssql";

export const maxDuration = 120;

// GET /api/admin/users/[id] - Get user details with regional councils
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

		// Handle params - in Next.js 15+, params might be a Promise
		const resolvedParams = params instanceof Promise ? await params : params;
		const rawId = resolvedParams.id;
		
		if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId.trim() === '') {
			console.error('[admin/users/[id]] GET Missing or invalid id param:', rawId);
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". ID is missing or undefined.` },
				{ status: 400 }
			);
		}
		
		const userIdToFetch = Number(rawId);
		
		// Strict validation: must be a finite positive integer
		if (!Number.isFinite(userIdToFetch) || !Number.isInteger(userIdToFetch) || userIdToFetch <= 0) {
			console.error('[admin/users/[id]] Invalid user ID:', rawId, 'parsed:', userIdToFetch);
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". Must be a positive integer.` },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Fetch user details
		sqlRequest.input("UserId", userIdToFetch);
		const userResult = await sqlRequest.query(`
			SELECT 
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

		if (userResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		const user = userResult.recordset[0];

		// Fetch assigned regional councils
		const rcRequest = pool.request();
		rcRequest.input("UserId", userIdToFetch);
		const rcResult = await rcRequest.query(`
			SELECT [RegionalCouncilId]
			FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess]
			WHERE [UserId] = @UserId
		`);

		const assignedRegionalCouncilIds = (rcResult.recordset || []).map((row: any) => row.RegionalCouncilId);

		// Fetch all active regional councils
		const allRcRequest = pool.request();
		const allRcResult = await allRcRequest.query(`
			SELECT 
				[RegionalCouncilId],
				[RegionalCouncilCode],
				[RegionalCouncilName]
			FROM [SJDA_Users].[dbo].[LU_RegionalCouncil]
			WHERE [IsActive] = 1
			ORDER BY [RegionalCouncilName]
		`);

		return NextResponse.json({
			success: true,
			user: {
				UserId: user.UserId,
				email_address: user.email_address,
				UserFullName: user.UserFullName,
				UserType: user.UserType,
				Designation: user.Designation,
				Regional_Council: user.Regional_Council,
				Local_Council: user.Local_Council,
				AccessScope: user.AccessScope,
				user_create_date: user.user_create_date,
				user_update_date: user.user_update_date,
			},
			assignedRegionalCouncilIds,
			regionalCouncils: allRcResult.recordset || [],
		});
	} catch (error: any) {
		console.error("[admin/users/[id]] GET Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching user" },
			{ status: 500 }
		);
	}
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
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

		// Handle params - in Next.js 15+, params might be a Promise
		const resolvedParams = params instanceof Promise ? await params : params;
		const rawId = resolvedParams.id;
		
		if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId.trim() === '') {
			console.error('[admin/users/[id]] PUT Missing or invalid id param:', rawId);
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". ID is missing or undefined.` },
				{ status: 400 }
			);
		}
		
		const userIdToUpdate = Number(rawId);
		
		// Strict validation: must be a finite positive integer
		if (!Number.isFinite(userIdToUpdate) || !Number.isInteger(userIdToUpdate) || userIdToUpdate <= 0) {
			console.error('[admin/users/[id]] PUT Invalid user ID:', rawId, 'parsed:', userIdToUpdate);
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". Must be a positive integer.` },
				{ status: 400 }
			);
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
		if (!email_address || !UserFullName || !UserType) {
			return NextResponse.json(
				{ success: false, message: "email_address, UserFullName, and UserType are required" },
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
			// Check if user exists
			const checkRequest = new sql.Request(transaction);
			checkRequest.input("UserId", userIdToUpdate);
			const userCheck = await checkRequest.query(`
				SELECT TOP(1) [UserId], [email_address] 
				FROM [SJDA_Users].[dbo].[PE_User] 
				WHERE [UserId] = @UserId
			`);

			if (userCheck.recordset.length === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "User not found" },
					{ status: 404 }
				);
			}

			// Verify email_address matches existing user (email cannot be changed)
			const existingEmail = userCheck.recordset[0].email_address;
			if (existingEmail !== email_address) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "Email address cannot be changed" },
					{ status: 400 }
				);
			}

			// Update PE_User table
			const updateRequest = new sql.Request(transaction);
			updateRequest.input("UserId", userIdToUpdate);
			updateRequest.input("UserFullName", UserFullName);
			updateRequest.input("UserType", UserType);
			updateRequest.input("Designation", Designation || null);
			updateRequest.input("Regional_Council", Regional_Council || null);
			updateRequest.input("Local_Council", Local_Council || null);
			updateRequest.input("AccessScope", AccessScope || null);

			let updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_User]
				SET 
					[UserFullName] = @UserFullName,
					[UserType] = @UserType,
					[Designation] = @Designation,
					[Regional_Council] = @Regional_Council,
					[Local_Council] = @Local_Council,
					[AccessScope] = @AccessScope,
					[user_update_date] = GETDATE()
			`;

			// Only update password if provided
			if (Password && Password.trim() !== "") {
				// TODO: Implement password hashing (bcrypt) - currently storing plaintext for compatibility
				updateRequest.input("Password", Password);
				updateQuery += `, [Password] = @Password`;
			}

			updateQuery += ` WHERE [UserId] = @UserId`;

			await updateRequest.query(updateQuery);

			// Handle Regional Councils mapping
			// Delete existing mappings
			const deleteRcRequest = new sql.Request(transaction);
			deleteRcRequest.input("UserId", userIdToUpdate);
			await deleteRcRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess]
				WHERE [UserId] = @UserId
			`);

			// Insert new mappings if provided
			if (RegionalCouncilIds && Array.isArray(RegionalCouncilIds) && RegionalCouncilIds.length > 0) {
				for (const rcId of RegionalCouncilIds) {
					if (rcId) {
						const insertRcRequest = new sql.Request(transaction);
						insertRcRequest.input("UserId", userIdToUpdate);
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
				message: "User updated successfully"
			});
		} catch (error) {
			// Rollback transaction on error
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[admin/users/[id]] PUT Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating user" },
			{ status: 500 }
		);
	}
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
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

		// Handle params - in Next.js 15+, params might be a Promise
		const resolvedParams = params instanceof Promise ? await params : params;
		const rawId = resolvedParams.id;
		
		if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId.trim() === '') {
			console.error('[admin/users/[id]] DELETE Missing or invalid id param:', rawId);
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". ID is missing or undefined.` },
				{ status: 400 }
			);
		}
		
		const userIdToDelete = Number(rawId);
		if (!Number.isFinite(userIdToDelete) || !Number.isInteger(userIdToDelete) || userIdToDelete <= 0) {
			return NextResponse.json(
				{ success: false, message: `Invalid user ID: "${rawId}". Must be a positive integer.` },
				{ status: 400 }
			);
		}

		// Prevent deleting yourself
		const currentUserId = parseInt(userId, 10);
		if (!isNaN(currentUserId) && currentUserId === userIdToDelete) {
			return NextResponse.json(
				{ success: false, message: "Cannot delete your own account" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Check if user exists
		sqlRequest.input("UserId", userIdToDelete);
		const userCheck = await sqlRequest.query(`
			SELECT TOP(1) [UserId], [email_address] 
			FROM [SJDA_Users].[dbo].[PE_User] 
			WHERE [UserId] = @UserId
		`);

		if (userCheck.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Hard delete (no soft delete support in current schema)
		await sqlRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_User]
			WHERE [UserId] = @UserId
		`);

		return NextResponse.json({
			success: true,
			message: "User deleted successfully"
		});
	} catch (error: any) {
		console.error("[admin/users/[id]] DELETE Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error deleting user" },
			{ status: 500 }
		);
	}
}
