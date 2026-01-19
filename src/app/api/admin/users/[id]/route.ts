import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

// PUT /api/admin/users/[id] - Update user
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
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

		const userIdToUpdate = parseInt(params.id, 10);
		if (isNaN(userIdToUpdate) || userIdToUpdate <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid user ID" },
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
			AccessScope 
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
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Check if user exists
		sqlRequest.input("UserId", userIdToUpdate);
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

		// Check if email already exists (for another user)
		sqlRequest.input("email_address", email_address);
		const emailCheck = await sqlRequest.query(`
			SELECT TOP(1) [UserId] 
			FROM [SJDA_Users].[dbo].[PE_User] 
			WHERE [email_address] = @email_address AND [UserId] != @UserId
		`);

		if (emailCheck.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "Email address already exists" },
				{ status: 400 }
			);
		}

		// Build update query - only update password if provided
		sqlRequest.input("UserFullName", UserFullName);
		sqlRequest.input("UserType", UserType);
		sqlRequest.input("Designation", Designation || null);
		sqlRequest.input("Regional_Council", Regional_Council || null);
		sqlRequest.input("Local_Council", Local_Council || null);
		sqlRequest.input("AccessScope", AccessScope || null);

		let updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_User]
			SET 
				[email_address] = @email_address,
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
			sqlRequest.input("Password", Password);
			updateQuery += `, [Password] = @Password`;
		}

		updateQuery += ` WHERE [UserId] = @UserId`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "User updated successfully"
		});
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
	{ params }: { params: { id: string } }
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

		const userIdToDelete = parseInt(params.id, 10);
		if (isNaN(userIdToDelete) || userIdToDelete <= 0) {
			return NextResponse.json(
				{ success: false, message: "Invalid user ID" },
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
