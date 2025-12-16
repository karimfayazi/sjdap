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

		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId");
		const memberId = searchParams.get("memberId");

		// Build query
		const pool = await getBaselineDb();
		let query = ``;

		const request_query = pool.request();

		if (memberId) {
			// Search by Member ID - return single member
			query = `
				SELECT TOP(1)
					[FAMILY_ID],
					[MEMBER_ID],
					[FULL NAME] as FULL_NAME,
					[CNIC],
					[RELATION],
					[GENDER],
					[AGE],
					[MARITAL_STATUS],
					[OCCUPATION],
					[CURRENT EDUCATION] as CURRENT_EDUCATION,
					[HIGHEST QLF] as HIGHEST_QLF,
					[EARNING SOURCE] as EARNING_SOURCE,
					[MONTHLY INCOME] as MONTHLY_INCOME
				FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_MEMBERS]
				WHERE [MEMBER_ID] = @memberId
			`;
			request_query.input("memberId", memberId);
		} else if (familyId) {
			// Search by Family ID - return all members
			query = `
				SELECT 
					[FAMILY_ID],
					[MEMBER_ID],
					[FULL NAME] as FULL_NAME,
					[CNIC],
					[RELATION],
					[GENDER],
					[AGE],
					[MARITAL_STATUS],
					[OCCUPATION],
					[CURRENT EDUCATION] as CURRENT_EDUCATION,
					[HIGHEST QLF] as HIGHEST_QLF,
					[EARNING SOURCE] as EARNING_SOURCE,
					[MONTHLY INCOME] as MONTHLY_INCOME
				FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_MEMBERS]
				WHERE [FAMILY_ID] = @familyId
				ORDER BY [MEMBER_ID]
			`;
			request_query.input("familyId", familyId);
		} else {
			return NextResponse.json(
				{ success: false, message: "Family ID or Member ID is required" },
				{ status: 400 }
			);
		}

		// Set request timeout to 60 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		
		if (memberId) {
			// Return single member when searching by Member ID
			return NextResponse.json({ 
				success: true, 
				member: result.recordset?.[0] || null
			});
		} else {
			// Return array of members when searching by Family ID
			return NextResponse.json({ 
				success: true, 
				members: result.recordset || []
			});
		}
	} catch (error) {
		console.error("Error fetching family members:", error);
		
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
					members: [],
					member: null
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					members: [],
					member: null
				},
				{ status: 504 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching family members: " + errorMessage,
				members: [],
				member: null
			},
			{ status: 500 }
		);
	}
}

