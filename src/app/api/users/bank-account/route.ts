import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function PUT(request: NextRequest) {
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

		const { userId } = await request.json();
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "User ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();

		// ALL USERS CAN UPDATE - NO PERMISSION CHECKS

		// Remove bank account access for target user
		const request_query = pool.request();
		request_query.input("user_id", userId);
		(request_query as any).timeout = 120000;

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[Table_User]
			SET [bank_account] = 0
			WHERE [USER_ID] = @user_id
		`;

		const result = await request_query.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found or no change made." },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Bank account access removed successfully."
		});
	} catch (error) {
		console.error("Error updating bank account access:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating bank account access: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const pool = await getDb();
		
		// Query to get users with bank_account = 'Yes' or 1
		const query = `
			SELECT 
				[USER_ID],
				[USER_FULL_NAME],
				[bank_account]='Yes' as bank_account
			FROM [SJDA_Users].[dbo].[Table_User]
			WHERE [bank_account] = 1 OR [bank_account] = 'Yes' OR [bank_account] = '1'
			ORDER BY [USER_FULL_NAME]
		`;

		const request_query = pool.request();
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		const users = result.recordset || [];

		return NextResponse.json({
			success: true,
			users: users
		});
	} catch (error) {
		console.error("Error fetching users with bank account permission:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists."
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error fetching users: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

