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
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
		);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Map database fields to UserProfile type
		// Handle Supper_User field - it might be stored as bit (0/1), string ('Yes'/'No'), or boolean
		let supperUserValue = null;
		if (user.Supper_User !== null && user.Supper_User !== undefined) {
			if (typeof user.Supper_User === 'string') {
				supperUserValue = user.Supper_User;
			} else if (typeof user.Supper_User === 'boolean') {
				supperUserValue = user.Supper_User ? 'Yes' : 'No';
			} else if (typeof user.Supper_User === 'number') {
				supperUserValue = user.Supper_User === 1 ? 'Yes' : 'No';
			} else {
				supperUserValue = String(user.Supper_User);
			}
		}

		const userProfile = {
			username: user.USER_ID || "",
			email: user.USER_ID || "", // Using USER_ID as email if no email field exists
			full_name: user.USER_FULL_NAME || null,
			department: user.PROGRAM || null,
			region: user.REGION || null,
			address: null, // Add if field exists in database
			contact_no: null, // Add if field exists in database
			access_level: user.USER_TYPE || null,
			access_add: user.CAN_ADD ? (typeof user.CAN_ADD === 'boolean' ? user.CAN_ADD : user.CAN_ADD === 1) : null,
			access_edit: user.CAN_UPDATE ? (typeof user.CAN_UPDATE === 'boolean' ? user.CAN_UPDATE : user.CAN_UPDATE === 1) : null,
			access_delete: user.CAN_DELETE ? (typeof user.CAN_DELETE === 'boolean' ? user.CAN_DELETE : user.CAN_DELETE === 1) : null,
			access_reports: user.SEE_REPORTS ? (typeof user.SEE_REPORTS === 'boolean' ? user.SEE_REPORTS : user.SEE_REPORTS === 1) : null,
			section: user.SECTION || null,
			supper_user: supperUserValue,
		};

		return NextResponse.json({
			success: true,
			user: userProfile
		});
	} catch (error) {
		console.error("Error fetching user profile:", error);
		
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
				message: "Error fetching user profile: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

