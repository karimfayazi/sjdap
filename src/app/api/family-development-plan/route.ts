import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";
import { checkSuperUserFromDb } from "@/lib/auth-server-utils";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth check
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

		const pool = await getPeDb();
		
		// Check if user is Super User
		const isSuperUser = await checkSuperUserFromDb(userId);

		// Get user's full name to match with SubmittedBy (only needed if not Super User)
		let userFullName: string | null = null;
		
		if (!isSuperUser) {
			const userResult = await pool
				.request()
				.input("user_id", userId)
				.query(
					"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
				);

			const user = userResult.recordset?.[0];
			if (!user) {
				return NextResponse.json(
					{ success: false, message: "User not found" },
					{ status: 404 }
				);
			}

			userFullName = user.USER_FULL_NAME;
		}

		const { searchParams } = new URL(request.url);
		
		// Get filter parameters
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = (page - 1) * limit;
		const formNumberFilter = (searchParams.get("formNumber") || "").trim();
		const fullNameFilter = (searchParams.get("fullName") || "").trim();
		const cnicNumberFilter = (searchParams.get("cnicNumber") || "").trim();
		const regionalCommunityFilter = (searchParams.get("regionalCommunity") || "").trim();
		const localCommunityFilter = (searchParams.get("localCommunity") || "").trim();
		
		// Build WHERE clause for filters
		const whereConditions: string[] = [];
		
		// Filter by SubmittedBy matching user's full name (only if not Super User)
		if (!isSuperUser && userFullName) {
			whereConditions.push(`app.[SubmittedBy] = @userFullName`);
		}
		
		if (formNumberFilter) {
			whereConditions.push(`app.[FormNumber] LIKE '%${formNumberFilter.replace(/'/g, "''")}%'`);
		}
		if (fullNameFilter) {
			whereConditions.push(`app.[Full_Name] LIKE '%${fullNameFilter.replace(/'/g, "''")}%'`);
		}
		if (cnicNumberFilter) {
			whereConditions.push(`app.[CNICNumber] LIKE '%${cnicNumberFilter.replace(/'/g, "''")}%'`);
		}
		if (regionalCommunityFilter) {
			whereConditions.push(`app.[RegionalCommunity] LIKE '%${regionalCommunityFilter.replace(/'/g, "''")}%'`);
		}
		if (localCommunityFilter) {
			whereConditions.push(`app.[LocalCommunity] LIKE '%${localCommunityFilter.replace(/'/g, "''")}%'`);
		}
		
		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Query to get total count
		const countRequest = pool.request();
		if (userFullName) countRequest.input("userFullName", userFullName);
		
		const countQuery = `
			SELECT COUNT(*) as Total
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			${whereClause}
		`;

		const countResult = await countRequest.query(countQuery);
		const total = countResult.recordset[0]?.Total || 0;

		// Query to get data with pagination - JOIN with PE_FamilyMember to count family members and calculate income
		const query = `
			SELECT 
				app.[FormNumber],
				app.[Full_Name],
				app.[CNICNumber],
				app.[RegionalCommunity],
				app.[LocalCommunity],
				app.[Area_Type],
				ISNULL(fm.MemberCount, 0) as TotalFamilyMembers,
				-- Calculate per capita income for poverty level
				CASE
					WHEN ISNULL(fm.MemberCount, 0) > 0 THEN
						(
							ISNULL(app.[MonthlyIncome_Remittance], 0) +
							ISNULL(app.[MonthlyIncome_Rental], 0) +
							ISNULL(app.[MonthlyIncome_OtherSources], 0) +
							ISNULL(fm.TotalMemberIncome, 0)
						) / ISNULL(fm.MemberCount, 1)
					ELSE 0
				END as PerCapitaIncome
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			LEFT JOIN (
				SELECT
					[FormNo],
					COUNT(*) as MemberCount,
					SUM(ISNULL([MonthlyIncome], 0)) as TotalMemberIncome
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) fm ON app.[FormNumber] = fm.[FormNo]
			${whereClause}
			ORDER BY app.[FormNumber] DESC
			OFFSET ${offset} ROWS
			FETCH NEXT ${limit} ROWS ONLY
		`;

		// Execute query with user parameters
		const dataRequest = pool.request();
		if (userFullName) dataRequest.input("userFullName", userFullName);
		
		const result = await dataRequest.query(query);

		// Calculate Income Level (Poverty Level) for each record
		const recordsWithIncomeLevel = (result.recordset || []).map((record: any) => {
			const perCapitaIncome = record.PerCapitaIncome || 0;
			const areaType = record.Area_Type || "Rural";
			
			// Calculate poverty level based on thresholds
			let incomeLevel = "Level -4"; // Default to Ultra Poverty
			
			const thresholds: { [key: string]: { [key: number]: string } } = {
				"Rural": {
					0: "Level -4",
					2700: "Level -3",
					5400: "Level -2",
					8100: "Level -1",
					10800: "Level 0",
					13500: "Level +1",
				},
				"Urban": {
					0: "Level -4",
					4800: "Level -3",
					9600: "Level -2",
					14400: "Level -1",
					19200: "Level 0",
					24000: "Level +1",
				},
				"Peri-Urban": {
					0: "Level -4",
					4025: "Level -3",
					8100: "Level -2",
					12100: "Level -1",
					16100: "Level 0",
					20100: "Level +1",
				},
			};

			const areaThresholds = thresholds[areaType] || thresholds["Rural"];
			const sortedLevels = Object.keys(areaThresholds)
				.map(Number)
				.sort((a, b) => b - a);

			for (const threshold of sortedLevels) {
				if (perCapitaIncome >= threshold) {
					incomeLevel = areaThresholds[threshold];
					break;
				}
			}

			// Calculate Max Social Support based on Income Level
			let maxSocialSupport = 0;
			switch (incomeLevel) {
				case "Level -4":
					maxSocialSupport = 468000;
					break;
				case "Level -3":
					maxSocialSupport = 360000;
					break;
				case "Level -2":
					maxSocialSupport = 264000;
					break;
				case "Level -1":
					maxSocialSupport = 180000;
					break;
				default:
					maxSocialSupport = 0;
			}

			return {
				...record,
				IncomeLevel: incomeLevel,
				MaxSocialSupport: maxSocialSupport,
			};
		});

		return NextResponse.json({
			success: true,
			data: recordsWithIncomeLevel,
			total: total,
			page: page,
			limit: limit
		});
	} catch (error: any) {
		console.error("Error fetching family development plan data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching family development plan data",
			},
			{ status: 500 }
		);
	}
}

