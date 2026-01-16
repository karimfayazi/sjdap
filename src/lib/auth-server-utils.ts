/**
 * Server-only utility functions for authentication and authorization
 * These functions require database access and should only be used in API routes or server components
 */

import { getDb } from "./db";
import { isSuperUser, isAdminUser } from "./auth-utils";

/**
 * Check if a user is a Super User by querying the database
 * This checks if UserType='Admin' in PE_User table
 * Admin users have FULL ACCESS to ALL sections regardless of individual permissions
 * 
 * @param userId - The user ID to check
 * @returns Promise<boolean> - true if user is Admin (UserType='Admin'), false otherwise
 */
export async function checkSuperUserFromDb(userId: string | null | undefined): Promise<boolean> {
	if (!userId) return false;

	try {
		const pool = await getDb();
		const result = await pool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserId], [email_address], [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = result.recordset?.[0];
		if (!user) return false;

		// Check if user is admin (by username or email)
		const userIdentifier = user.UserId || user.email_address;
		if (isAdminUser(userIdentifier)) {
			return true;
		}

		// Check if UserType is 'Admin' (case-insensitive)
		const userType = user.UserType;
		if (userType && typeof userType === 'string' && userType.trim().toLowerCase() === 'admin') {
			return true;
		}

		return false;
	} catch (error) {
		console.error("Error checking Super User status:", error);
		return false;
	}
}

