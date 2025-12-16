import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Get logged-in user information
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

		// Get user's full name and user type
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_TYPE] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.USER_FULL_NAME || null;
		const isAdmin = user?.USER_TYPE?.toLowerCase() === "admin";

		// Build query - fetch all columns from the view
		const pool = await getBaselineDb();
		const query = `
			SELECT *
			FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_Intervnetion_All]
			ORDER BY [FAMILY_ID]
		`;

		const request_query = pool.request();
		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;

		// Note: Add mentor filtering if needed based on view structure
		// if (!isAdmin && userFullName) {
		// 	query += " AND [MENTOR] = @mentor";
		// 	request_query.input("mentor", userFullName);
		// }

		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			interventions: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching actual interventions:", error);
		
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
					message: "Please Re-Connect VPN",
					interventions: []
				},
				{ status: 503 }
			);
		}
		
		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					interventions: []
				},
				{ status: 504 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching actual interventions: " + errorMessage,
				interventions: []
			},
			{ status: 500 }
		);
	}
}

