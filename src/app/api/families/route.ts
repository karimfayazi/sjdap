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
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName], [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.UserFullName || null;
		const isAdmin = user?.UserType?.toLowerCase() === "admin";

		// Build query with optional Family ID filter and mentor filter
		const pool = await getBaselineDb();
		let query = `
			SELECT [FAMILY_ID]
				,[PROGRAM]
				,[AREA]
				,[REGIONAL COUNCIL] as REGIONAL_COUNCIL
				,[LOCAL COUNCIL] as LOCAL_COUNCIL
				,[JAMAT KHANA] as JAMAT_KHANA
				,[HEAD NAME] as HEAD_NAME
				,[AGE]
				,[CNIC]
				,[CONTACT]
				,[PER CAPITA INCOME] as PER_CAPITA_INCOME
				,[TOTAL FAMILY MEMBER] as TOTAL_FAMILY_MEMBER
				,[AREA TYPE] as AREA_TYPE
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
			WHERE 1=1
		`;

		const request_query = pool.request();

		// Read optional filters from query string
		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId");
		const program = searchParams.get("program");
		const area = searchParams.get("area");
		const regionalCouncil = searchParams.get("regionalCouncil");
		const localCouncil = searchParams.get("localCouncil");
		const jamatKhana = searchParams.get("jamatKhana");
		const areaType = searchParams.get("areaType");
		const getOptions = searchParams.get("getOptions");
		
		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;

		// If requesting dropdown options
		if (getOptions) {
			const optionsQuery = `
				SELECT DISTINCT 
					[PROGRAM],
					[AREA],
					[REGIONAL COUNCIL] as REGIONAL_COUNCIL,
					[LOCAL COUNCIL] as LOCAL_COUNCIL,
					[JAMAT KHANA] as JAMAT_KHANA,
					[AREA TYPE] as AREA_TYPE
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
				WHERE ([PROGRAM] IS NOT NULL AND [PROGRAM] != '')
					OR ([AREA] IS NOT NULL AND [AREA] != '')
					OR ([REGIONAL COUNCIL] IS NOT NULL AND [REGIONAL COUNCIL] != '')
					OR ([LOCAL COUNCIL] IS NOT NULL AND [LOCAL COUNCIL] != '')
					OR ([JAMAT KHANA] IS NOT NULL AND [JAMAT KHANA] != '')
					OR ([AREA TYPE] IS NOT NULL AND [AREA TYPE] != '')
				ORDER BY [PROGRAM], [AREA], [REGIONAL COUNCIL], [LOCAL COUNCIL], [JAMAT KHANA], [AREA TYPE]
			`;

			const optionsResult = await request_query.query(optionsQuery);
			const records = optionsResult.recordset || [];
			
			const programs = [...new Set(records.map((r: any) => r.PROGRAM).filter(Boolean))].sort();
			const areas = [...new Set(records.map((r: any) => r.AREA).filter(Boolean))].sort();
			const regionalCouncils = [...new Set(records.map((r: any) => r.REGIONAL_COUNCIL).filter(Boolean))].sort();
			const localCouncils = [...new Set(records.map((r: any) => r.LOCAL_COUNCIL).filter(Boolean))].sort();
			const jamatKhanas = [...new Set(records.map((r: any) => r.JAMAT_KHANA).filter(Boolean))].sort();
			const areaTypes = [...new Set(records.map((r: any) => r.AREA_TYPE).filter(Boolean))].sort();

			return NextResponse.json({
				success: true,
				programs,
				areas,
				regionalCouncils,
				localCouncils,
				jamatKhanas,
				areaTypes
			});
		}

		// Apply filters
		if (familyId) {
			query += " AND [FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (program) {
			query += " AND [PROGRAM] = @program";
			request_query.input("program", program);
		}

		if (area) {
			query += " AND [AREA] = @area";
			request_query.input("area", area);
		}

		if (regionalCouncil) {
			query += " AND [REGIONAL COUNCIL] = @regionalCouncil";
			request_query.input("regionalCouncil", regionalCouncil);
		}

		if (localCouncil) {
			query += " AND [LOCAL COUNCIL] = @localCouncil";
			request_query.input("localCouncil", localCouncil);
		}

		if (jamatKhana) {
			query += " AND [JAMAT KHANA] = @jamatKhana";
			request_query.input("jamatKhana", jamatKhana);
		}

		if (areaType) {
			query += " AND [AREA TYPE] = @areaType";
			request_query.input("areaType", areaType);
		}

		query += " ORDER BY [FAMILY_ID]";

		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			families: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching families:", error);
		
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
				message: "Error fetching families: " + errorMessage,
				families: []
			},
			{ status: 500 }
		);
	}
}

