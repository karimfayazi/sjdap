import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
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

		const pool = await getDb();
		const request_query = pool.request();
		request_query.input("user_id", userId);
		request_query.input("email_address", userId);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) [UserId], [email_address], [UserFullName], [Regional_Council], [Local_Council] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
		);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Map database fields to UserInfo type
		const userInfo = {
			id: user.UserId || user.email_address,
			name: user.UserFullName,
			username: user.UserId || user.email_address,
			department: null, // PE_User doesn't have PROGRAM field
			region: user.Regional_Council || null,
		};

		return NextResponse.json({
			success: true,
			user: userInfo
		});
	} catch (error) {
		console.error("Error fetching user info:", error);
		
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
				message: "Error fetching user info: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

