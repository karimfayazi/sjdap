import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

/**
 * Bulk update UserType for all users
 * Sets all users to 'Editor' except karim.fayazi@sjdap.org which is set to 'Super Admin'
 * 
 * POST /api/users/bulk-update-usertype
 */
export async function POST(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const currentUserId = authCookie.value.split(":")[1];
		if (!currentUserId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();

		// Check permissions of current user (must be admin or super admin)
		const permResult = await pool
			.request()
			.input("current_user_id", currentUserId)
			.input("current_email", currentUserId)
			.query(
				"SELECT TOP(1) [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @current_user_id OR [email_address] = @current_email"
			);

		const permUser = permResult.recordset?.[0];
		const isAdmin = permUser?.UserType && (
			typeof permUser.UserType === 'string' && 
			(permUser.UserType.trim().toLowerCase() === 'admin' || 
			 permUser.UserType.trim().toLowerCase() === 'super admin')
		);
		const isAdminByIdentifier = currentUserId && currentUserId.toLowerCase() === 'admin';

		if (!isAdmin && !isAdminByIdentifier) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin or Super Admin users can perform bulk updates." },
				{ status: 403 }
			);
		}

		const specialEmail = 'karim.fayazi@sjdap.org';

		// First, set karim.fayazi@sjdap.org to 'Super Admin'
		const specialUserReq = pool.request();
		(specialUserReq as any).timeout = 120000;
		specialUserReq.input("email", specialEmail);
		
		const specialUserResult = await specialUserReq.query(`
			UPDATE [SJDA_Users].[dbo].[PE_User]
			SET [UserType] = 'Super Admin',
				[user_update_date] = GETDATE()
			WHERE [email_address] = @email
		`);

		// Then, set all other users to 'Editor'
		const allUsersReq = pool.request();
		(allUsersReq as any).timeout = 120000;
		allUsersReq.input("email", specialEmail);
		
		const allUsersResult = await allUsersReq.query(`
			UPDATE [SJDA_Users].[dbo].[PE_User]
			SET [UserType] = 'Editor',
				[user_update_date] = GETDATE()
			WHERE [email_address] IS NULL 
			   OR ([email_address] IS NOT NULL AND [email_address] != @email)
		`);

		// Get summary of updates
		const summaryResult = await pool.request().query(`
			SELECT [UserType], COUNT(*) as count
			FROM [SJDA_Users].[dbo].[PE_User]
			GROUP BY [UserType]
			ORDER BY [UserType]
		`);

		const summary: { [key: string]: number } = {};
		summaryResult.recordset.forEach((row: any) => {
			summary[row.UserType || 'NULL'] = row.count;
		});

		return NextResponse.json({
			success: true,
			message: "User types updated successfully",
			summary: {
				superAdminUpdated: specialUserResult.rowsAffected[0],
				editorUpdated: allUsersResult.rowsAffected[0],
				currentDistribution: summary
			}
		});
	} catch (error) {
		console.error("Error bulk updating user types:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error bulk updating user types: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
