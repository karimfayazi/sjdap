import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const { userId, oldPassword, newPassword } = await request.json();

		if (!userId || !oldPassword || !newPassword) {
			return NextResponse.json(
				{ success: false, message: "User ID, old password, and new password are required" },
				{ status: 400 }
			);
		}

		if (newPassword.length < 6) {
			return NextResponse.json(
				{ success: false, message: "New password must be at least 6 characters" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		// Verify old password
		const verifyRequest = pool.request();
		verifyRequest.input("user_id", userId);
		(verifyRequest as any).timeout = 120000;
		const verifyResult = await verifyRequest.query(
			"SELECT TOP(1) [PASSWORD] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id AND [ACTIVE] = 1"
		);

		const user = verifyResult.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found or inactive" },
				{ status: 404 }
			);
		}

		if (String(user.PASSWORD) !== String(oldPassword)) {
			return NextResponse.json(
				{ success: false, message: "Old password is incorrect" },
				{ status: 401 }
			);
		}

		// Update password
		const updateRequest = pool.request();
		updateRequest.input("user_id", userId);
		updateRequest.input("new_password", newPassword);
		updateRequest.input("re_password", newPassword);
		(updateRequest as any).timeout = 120000;
		await updateRequest.query(
			`UPDATE [SJDA_Users].[dbo].[Table_User]
			 SET [PASSWORD] = @new_password, [RE_PASSWORD] = @re_password, [UPDATE_DATE] = GETDATE()
			 WHERE [USER_ID] = @user_id`
		);

		return NextResponse.json({
			success: true,
			message: "Password changed successfully"
		});
	} catch (error) {
		console.error("Error changing password:", error);
		
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
				message: "Error changing password: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

