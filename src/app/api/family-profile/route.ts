import { NextRequest, NextResponse } from "next/server";
import { getFdpDb, getDb } from "@/lib/db";

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

		// Get query parameters for filtering
		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId") || "";
		const memberId = searchParams.get("memberId") || "";
		const fullName = searchParams.get("fullName") || "";

		// Build query
		const pool = await getFdpDb();
		let query = `
			SELECT TOP (1000) 
				[PROFILE_ID],
				[FAMILY_ID],
				[MEMBER_ID],
				[FULL_NAME],
				[GENDER],
				[CURR_DATE],
				[FUTURE_ASPIRATION],
				[MONTHLY_INCOME],
				[REMARKS]
			FROM [SJDA_FDP].[dbo].[Table_FDP_FAMILY_PROFILE]
			WHERE 1=1
		`;

		const request_query = pool.request();

		if (familyId) {
			query += " AND [FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (memberId) {
			query += " AND [MEMBER_ID] LIKE @memberId";
			request_query.input("memberId", `%${memberId}%`);
		}

		if (fullName) {
			query += " AND [FULL_NAME] LIKE @fullName";
			request_query.input("fullName", `%${fullName}%`);
		}

		query += " ORDER BY [PROFILE_ID] DESC";

		// Set request timeout to 60 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			profiles: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching family profile:", error);
		
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
					profiles: []
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					profiles: []
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching family profile: " + errorMessage,
				profiles: []
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
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

		// ALL USERS CAN ADD - NO PERMISSION CHECKS

		const data = await request.json();

		// Validate required fields
		if (!data.FAMILY_ID || !data.MEMBER_ID || !data.FULL_NAME) {
			return NextResponse.json(
				{ success: false, message: "Family ID, Member ID, and Full Name are required" },
				{ status: 400 }
			);
		}

		const pool = await getFdpDb();
		
		const query = `
			INSERT INTO [SJDA_FDP].[dbo].[Table_FDP_FAMILY_PROFILE]
			(
				[FAMILY_ID],
				[MEMBER_ID],
				[FULL_NAME],
				[GENDER],
				[CURR_DATE],
				[FUTURE_ASPIRATION],
				[MONTHLY_INCOME],
				[REMARKS]
			)
			VALUES
			(
				@FAMILY_ID,
				@MEMBER_ID,
				@FULL_NAME,
				@GENDER,
				@CURR_DATE,
				@FUTURE_ASPIRATION,
				@MONTHLY_INCOME,
				@REMARKS
			)
		`;

		const dbRequest = pool.request();
		dbRequest.input("FAMILY_ID", data.FAMILY_ID);
		dbRequest.input("MEMBER_ID", data.MEMBER_ID);
		dbRequest.input("FULL_NAME", data.FULL_NAME);
		dbRequest.input("GENDER", data.GENDER || null);
		dbRequest.input("CURR_DATE", data.CURR_DATE ? new Date(data.CURR_DATE) : new Date());
		dbRequest.input("FUTURE_ASPIRATION", data.FUTURE_ASPIRATION || null);
		dbRequest.input("MONTHLY_INCOME", data.MONTHLY_INCOME ? parseFloat(data.MONTHLY_INCOME) : null);
		dbRequest.input("REMARKS", data.REMARKS || null);
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		await dbRequest.query(query);

		return NextResponse.json({
			success: true,
			message: "Family profile saved successfully"
		});
	} catch (error) {
		console.error("Error saving family profile:", error);
		
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
				message: "Error saving family profile: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

