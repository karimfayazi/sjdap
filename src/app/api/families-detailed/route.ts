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
		
		// Build query
		const pool = await getBaselineDb();
		let query = `
			SELECT  
				[FAMILY_ID],
				[PROGRAM],
				[AREA],
				[REGIONAL COUNCIL] as REGIONAL_COUNCIL,
				[LOCAL COUNCIL] as LOCAL_COUNCIL,
				[JAMAT KHANA] as JAMAT_KHANA,
				[HEAD NAME] as HEAD_NAME,
				[CNIC],
				[CONTACT],
				[PER CAPITA INCOME] as PER_CAPITA_INCOME,
				[TOTAL FAMILY MEMBER] as TOTAL_FAMILY_MEMBER,
				[AREA TYPE] as AREA_TYPE
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
			WHERE 1=1
		`;
		
		const request_query = pool.request();
		
		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;
		
		// Note: This view might not have MENTOR field, so we'll skip mentor filtering for now
		// If you need mentor filtering, we can add it based on the view structure
		
		query += " ORDER BY [FAMILY_ID]";
		
		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			families: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching families detailed:", error);
		
		// Check for database connection errors
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
					families: []
				},
				{ status: 503 }
			);
		}
		
		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					families: []
				},
				{ status: 504 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching families detailed: " + errorMessage,
				families: []
			},
			{ status: 500 }
		);
	}
}

