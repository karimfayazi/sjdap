/**
 * Server-only utility functions for authentication and authorization
 * These functions require database access and should only be used in API routes or server components
 */

import { getDb } from "./db";
import { isSuperUser, isAdminUser } from "./auth-utils";

/**
 * Check if a user is a Super User by querying the database
 * This is useful for API routes where you need to check Super User status
 * 
 * @param userId - The user ID to check
 * @returns Promise<boolean> - true if user is Super User, false otherwise
 */
export async function checkSuperUserFromDb(userId: string | null | undefined): Promise<boolean> {
	if (!userId) return false;

	try {
		const pool = await getDb();
		const result = await pool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [Supper_User], [USER_ID] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = result.recordset?.[0];
		if (!user) return false;

		// Check if user is admin (by username)
		if (isAdminUser(user.USER_ID)) {
			return true;
		}

		// Check if user is Super User (by Supper_User field)
		return isSuperUser(user.Supper_User);
	} catch (error) {
		console.error("Error checking Super User status:", error);
		return false;
	}
}

