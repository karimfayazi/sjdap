import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPasswordChangeEmail } from "@/lib/email-service";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const { userId, oldPassword, newPassword } = await request.json();

		if (!userId || !oldPassword || !newPassword) {
			return NextResponse.json(
				{ success: false, message: "Email address, old password, and new password are required" },
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
		
		// Verify old password and get user details
		// Try email_address first, then UserId as fallback
		const verifyRequest = pool.request();
		verifyRequest.input("email_address", userId);
		verifyRequest.input("user_id", userId);
		(verifyRequest as any).timeout = 120000;
		const verifyResult = await verifyRequest.query(
			"SELECT TOP(1) [Password], [UserFullName], [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE ([email_address] = @email_address OR [UserId] = @user_id) AND [Active] = 1"
		);

		const user = verifyResult.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found or inactive" },
				{ status: 404 }
			);
		}

		if (String(user.Password) !== String(oldPassword)) {
			return NextResponse.json(
				{ success: false, message: "Old password is incorrect" },
				{ status: 401 }
			);
		}

		// Update password - use email_address or UserId for update
		const updateRequest = pool.request();
		const lookupValue = user.email_address || user.UserId;
		updateRequest.input("lookup_value", lookupValue);
		updateRequest.input("new_password", newPassword);
		(updateRequest as any).timeout = 120000;
		await updateRequest.query(
			`UPDATE [SJDA_Users].[dbo].[PE_User]
			 SET [Password] = @new_password, [user_update_date] = GETDATE()
			 WHERE ([email_address] = @lookup_value OR [UserId] = @lookup_value)`
		);

		// Send email notification (don't await - run in background)
		sendPasswordChangeEmail(
			user.email_address || user.UserId || userId, // Use email_address if available
			user.UserFullName || userId,
			new Date()
		).catch(error => {
			// Log error but don't fail the password change
			console.error('Failed to send password change email:', error);
		});

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

