import { NextRequest, NextResponse } from "next/server";
import { getPlanInterventionDb, getDb, getBaselineDb } from "@/lib/db";

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

		// Get user's full name and user type for filtering
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

		// Get query parameters for filtering
		const searchParams = request.nextUrl.searchParams;
		const interventionId = searchParams.get("interventionId") || "";
		const monthRop = searchParams.get("monthRop") || "";
		const mentor = searchParams.get("mentor") || "";
		const paymentType = searchParams.get("paymentType") || "";
		const familyId = searchParams.get("familyId") || "";
		const headName = searchParams.get("headName") || "";
		const program = searchParams.get("program") || "";
		const regionalCouncil = searchParams.get("regionalCouncil") || "";
		const localCouncil = searchParams.get("localCouncil") || "";
		const familyStatus = searchParams.get("familyStatus") || "";

		// Check if requesting dropdown options
		const getOptions = searchParams.get("getOptions");
		if (getOptions) {
			const pool = await getBaselineDb();
			const request_query = pool.request();
			(request_query as any).timeout = 120000;

			const optionsQuery = `
				SELECT DISTINCT
					f.[PROGRAM],
					f.[REGIONAL COUNCIL] AS Regional_Council,
					f.[LOCAL COUNCIL] AS Local_Council,
					f.[MENTOR],
					f.[FAMILY_PROGRESS_STATUS] AS Family_Progress_Status
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies] f
				INNER JOIN [SJDA_Plan_Intervetnion].[dbo].[View_ROP] r
					ON f.[FAMILY_ID] = r.[FAMILY_ID]
				INNER JOIN [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP] t
					ON r.[INTERVENTION_ID] = t.[INTERVENTION_ID]
				WHERE f.[PROGRAM] IS NOT NULL 
					OR f.[REGIONAL COUNCIL] IS NOT NULL
					OR f.[LOCAL COUNCIL] IS NOT NULL
					OR f.[MENTOR] IS NOT NULL
					OR f.[FAMILY_PROGRESS_STATUS] IS NOT NULL
				ORDER BY f.[PROGRAM], f.[REGIONAL COUNCIL], f.[LOCAL COUNCIL], f.[MENTOR], f.[FAMILY_PROGRESS_STATUS]
			`;

			const result = await request_query.query(optionsQuery);
			const records = result.recordset || [];

			const programs = [...new Set(records.map(r => r.PROGRAM).filter(Boolean))].sort();
			const regionalCouncils = [...new Set(records.map(r => r.Regional_Council).filter(Boolean))].sort();
			const localCouncils = [...new Set(records.map(r => r.Local_Council).filter(Boolean))].sort();
			const mentors = [...new Set(records.map(r => r.MENTOR).filter(Boolean))].sort();
			const familyStatuses = [...new Set(records.map(r => r.Family_Progress_Status).filter(Boolean))].sort();

			return NextResponse.json({
				success: true,
				programs,
				regionalCouncils,
				localCouncils,
				mentors,
				familyStatuses
			});
		}

		// Build query using the new SQL structure
		const pool = await getBaselineDb();
		let query = `
			SELECT
				f.[FAMILY_ID],
				f.[PROGRAM],
				f.[AREA],
				f.[REGIONAL COUNCIL] AS Regional_Council,
				f.[LOCAL COUNCIL] AS Local_Council,
				f.[HEAD NAME] AS Head_Name,
				f.[FAMILY_PROGRESS_STATUS] AS Family_Progress_Status,
				f.[MENTOR],
				f.[FDP_APPROVED_DATE] AS FDP_Approved_Date,
				r.[INTERVENTION_ID],
				r.[INTERVENTION_FRAMEWORK_DIMENSIONS] AS Intervention_Framework_Dimensions,
				r.[MAIN_INTERVENTION] AS Main_Intervention,
				r.[AMOUNT] AS Intervention_Amount,
				r.[ACTIVE],
				r.[MEMBER_ID],
				r.[AMOUNT_TYPE] AS Amount_Type,
				t.[MONTH_ROP] AS Month_ROP,
				t.[AMOUNT] AS ROP_Amount,
				t.[Payment_Type] AS Payment_Type
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies] f
			INNER JOIN [SJDA_Plan_Intervetnion].[dbo].[View_ROP] r
				ON f.[FAMILY_ID] = r.[FAMILY_ID]
			INNER JOIN [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP] t
				ON r.[INTERVENTION_ID] = t.[INTERVENTION_ID]
			WHERE 1=1
		`;

		const request_query = pool.request();

		if (interventionId) {
			query += " AND r.[INTERVENTION_ID] LIKE @interventionId";
			request_query.input("interventionId", `%${interventionId}%`);
		}

		if (monthRop) {
			query += " AND t.[MONTH_ROP] LIKE @monthRop";
			request_query.input("monthRop", `%${monthRop}%`);
		}

		if (mentor) {
			query += " AND f.[MENTOR] LIKE @mentor";
			request_query.input("mentor", `%${mentor}%`);
		}

		if (paymentType) {
			query += " AND t.[Payment_Type] LIKE @paymentType";
			request_query.input("paymentType", `%${paymentType}%`);
		}

		if (familyId) {
			query += " AND f.[FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (headName) {
			query += " AND f.[HEAD NAME] LIKE @headName";
			request_query.input("headName", `%${headName}%`);
		}

		if (program) {
			query += " AND f.[PROGRAM] = @program";
			request_query.input("program", program);
		}

		if (regionalCouncil) {
			query += " AND f.[REGIONAL COUNCIL] = @regionalCouncil";
			request_query.input("regionalCouncil", regionalCouncil);
		}

		if (localCouncil) {
			query += " AND f.[LOCAL COUNCIL] = @localCouncil";
			request_query.input("localCouncil", localCouncil);
		}

		if (familyStatus) {
			query += " AND f.[FAMILY_PROGRESS_STATUS] = @familyStatus";
			request_query.input("familyStatus", familyStatus);
		}

		if (mentor) {
			query += " AND f.[MENTOR] = @mentor";
			request_query.input("mentor", mentor);
		}

		// Filter by mentor if user is not admin (only if mentor filter is not set)
		if (!isAdmin && userFullName && !mentor) {
			query += " AND f.[MENTOR] = @userMentor";
			request_query.input("userMentor", userFullName);
		}

		query += " ORDER BY r.[INTERVENTION_ID] DESC, t.[MONTH_ROP]";

		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			rops: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching ROPs:", error);
		
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
					rops: []
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					rops: []
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching ROPs: " + errorMessage,
				rops: []
			},
			{ status: 500 }
		);
	}
}

