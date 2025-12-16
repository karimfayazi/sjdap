import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb, getDb } from "@/lib/db";

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
		const familyId = searchParams.get("familyId");
		const program = searchParams.get("program");
		const area = searchParams.get("area");
		const regionalCouncil = searchParams.get("regionalCouncil");
		const localCouncil = searchParams.get("localCouncil");
		const jamatKhana = searchParams.get("jamatKhana");
		const headName = searchParams.get("headName");
		const cnic = searchParams.get("cnic");
		const povertyLevel = searchParams.get("povertyLevel");
		const getOptions = searchParams.get("getOptions");
		const getCascadingOptions = searchParams.get("getCascadingOptions");

		// Build query
		const pool = await getBaselineDb();
		let query = `
			SELECT [FAMILY_ID]
				,[PROGRAM]
				,[AREA]
				,[REGIONAL COUNCIL] as REGIONAL_COUNCIL
				,[LOCAL COUNCIL] as LOCAL_COUNCIL
				,[JAMAT KHANA] as JAMAT_KHANA
				,[HEAD NAME] as HEAD_NAME
				,[CNIC]
				,[PER CAPITA INCOME] as PER_CAPITA_INCOME
				,[TOTAL FAMILY MEMBER] as TOTAL_FAMILY_MEMBER
				,[AREA TYPE] as AREA_TYPE
				,[POVERTY LEVEL] as POVERTY_LEVEL
			FROM [SJDA_BASELINEDB].[dbo].[View_QOL_Levels]
			WHERE 1=1
		`;

		const request_query = pool.request();

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;

		// If requesting cascading dropdown options
		if (getCascadingOptions) {
			const areaFilter = searchParams.get("area");
			const rcFilter = searchParams.get("regionalCouncil");
			const lcFilter = searchParams.get("localCouncil");

			const cascadingRequest = pool.request();
			(cascadingRequest as any).timeout = 120000;

			let cascadingQuery = `
				SELECT DISTINCT 
					[AREA],
					[REGIONAL COUNCIL] as REGIONAL_COUNCIL,
					[LOCAL COUNCIL] as LOCAL_COUNCIL,
					[JAMAT KHANA] as JAMAT_KHANA
				FROM [SJDA_BASELINEDB].[dbo].[View_QOL_Levels]
				WHERE 1=1
			`;

			if (areaFilter) {
				cascadingQuery += " AND [AREA] = @areaFilter";
				cascadingRequest.input("areaFilter", areaFilter);
			}

			if (rcFilter) {
				cascadingQuery += " AND [REGIONAL COUNCIL] = @rcFilter";
				cascadingRequest.input("rcFilter", rcFilter);
			}

			if (lcFilter) {
				cascadingQuery += " AND [LOCAL COUNCIL] = @lcFilter";
				cascadingRequest.input("lcFilter", lcFilter);
			}

			cascadingQuery += " ORDER BY [AREA], [REGIONAL COUNCIL], [LOCAL COUNCIL], [JAMAT KHANA]";

			const cascadingResult = await cascadingRequest.query(cascadingQuery);
			const cascadingRecords = cascadingResult.recordset || [];

			const regionalCouncils = [...new Set(
				cascadingRecords
					.filter((r: any) => !areaFilter || r.AREA === areaFilter)
					.map((r: any) => r.REGIONAL_COUNCIL)
					.filter(Boolean)
			)].sort();

			const localCouncils = [...new Set(
				cascadingRecords
					.filter((r: any) => 
						(!areaFilter || r.AREA === areaFilter) &&
						(!rcFilter || r.REGIONAL_COUNCIL === rcFilter)
					)
					.map((r: any) => r.LOCAL_COUNCIL)
					.filter(Boolean)
			)].sort();

			const jamatKhanas = [...new Set(
				cascadingRecords
					.filter((r: any) => 
						(!areaFilter || r.AREA === areaFilter) &&
						(!rcFilter || r.REGIONAL_COUNCIL === rcFilter) &&
						(!lcFilter || r.LOCAL_COUNCIL === lcFilter)
					)
					.map((r: any) => r.JAMAT_KHANA)
					.filter(Boolean)
			)].sort();

			return NextResponse.json({
				success: true,
				regionalCouncils,
				localCouncils,
				jamatKhanas
			});
		}

		// If requesting dropdown options
		if (getOptions) {
			const optionsQuery = `
				SELECT DISTINCT 
					[PROGRAM],
					[AREA],
					[POVERTY LEVEL] as POVERTY_LEVEL
				FROM [SJDA_BASELINEDB].[dbo].[View_QOL_Levels]
				WHERE ([PROGRAM] IS NOT NULL AND [PROGRAM] != '')
					OR ([AREA] IS NOT NULL AND [AREA] != '')
					OR ([POVERTY LEVEL] IS NOT NULL AND [POVERTY LEVEL] != '')
				ORDER BY [PROGRAM], [AREA], [POVERTY LEVEL]
			`;

			const optionsResult = await request_query.query(optionsQuery);
			const records = optionsResult.recordset || [];
			
			const programs = [...new Set(records.map((r: any) => r.PROGRAM).filter(Boolean))].sort();
			const areas = [...new Set(records.map((r: any) => r.AREA).filter(Boolean))].sort();
			const povertyLevels = [...new Set(records.map((r: any) => r.POVERTY_LEVEL).filter(Boolean))].sort();

			return NextResponse.json({
				success: true,
				programs,
				areas,
				povertyLevels
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

		if (headName) {
			query += " AND [HEAD NAME] LIKE @headName";
			request_query.input("headName", `%${headName}%`);
		}

		if (cnic) {
			query += " AND [CNIC] LIKE @cnic";
			request_query.input("cnic", `%${cnic}%`);
		}

		if (povertyLevel) {
			query += " AND [POVERTY LEVEL] = @povertyLevel";
			request_query.input("povertyLevel", povertyLevel);
		}

		query += " ORDER BY [FAMILY_ID]";

		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			families: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching QOL baseline data:", error);
		
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
				message: "Error fetching QOL baseline data: " + errorMessage,
				families: []
			},
			{ status: 500 }
		);
	}
}
