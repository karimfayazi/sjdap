import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";
import { checkSuperUserFromDb } from "@/lib/auth-server-utils";
import { isSuperAdmin } from "@/lib/rbac-utils";

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
		const userPool = await getDb();
		
		// Check if user is Super User/Admin
		const isSuperUser = await checkSuperUserFromDb(userId);
		const isSuperAdminUser = await isSuperAdmin(userId);

		// Get user's UserType and full name
		let userFullName: string | null = null;
		let userType: string | null = null;
		let isRegionalAM = false;
		
		if (!isSuperUser && !isSuperAdminUser) {
			const userResult = await userPool
				.request()
				.input("user_id", userId)
				.input("email_address", userId)
				.query(
					"SELECT TOP(1) [UserFullName], [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
				);

			const user = userResult.recordset?.[0];
			if (!user) {
				return NextResponse.json(
					{ success: false, message: "User not found" },
					{ status: 404 }
				);
			}

			userFullName = user.UserFullName;
			userType = user.UserType ? String(user.UserType).trim() : null;
			
			// Check if user is Regional AM (case-insensitive)
			isRegionalAM = userType !== null && userType.toUpperCase() === "REGIONAL AM";
			
			// Log user info for debugging (server-side only)
			console.log("[FDP-Approval] User info:", {
				userId,
				userType,
				isRegionalAM,
				userFullName,
				isSuperUser,
				isSuperAdminUser
			});
			
			// For Regional AM: Check if they have RegionalCouncil access
			if (isRegionalAM) {
				const rcCheckRequest = userPool.request();
				rcCheckRequest.input("userId", userId);
				const rcCheckResult = await rcCheckRequest.query(`
					SELECT COUNT(*) as Count
					FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
					WHERE ura.[UserId] = @userId
				`);
				
				const rcCount = rcCheckResult.recordset?.[0]?.Count || 0;
				console.log("[FDP-Approval] Regional AM RegionalCouncil count:", rcCount);
				
				if (rcCount === 0) {
					return NextResponse.json(
						{ 
							success: false, 
							message: "Regional AM user has no assigned Regional Council. Please contact administrator to assign a Regional Council.",
							data: [],
							total: 0
						},
						{ status: 403 }
					);
				}
			}
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
		
		// Regional AM: Filter by RegionalCommunity using RegionalCouncilAccess table
		// Super User/Admin: No filter (see all records)
		// Other users: Filter by SubmittedBy matching user's full name
		if (isRegionalAM) {
			// Use EXISTS subquery to filter by user's regional councils
			// This matches the pattern used in feasibility-approval route
			whereConditions.push(`EXISTS (SELECT 1 FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId] WHERE ura.[UserId] = @userId AND rc.[RegionalCouncilName] = app.[RegionalCommunity])`);
		} else if (!isSuperUser && !isSuperAdminUser && userFullName) {
			// Filter by SubmittedBy matching user's full name (for non-Regional AM, non-Super users)
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
		if (isRegionalAM) {
			countRequest.input("userId", userId);
		} else if (userFullName) {
			countRequest.input("userFullName", userFullName);
		}
		
		const countQuery = `
			SELECT COUNT(*) as Total
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			${whereClause}
		`;

		const countResult = await countRequest.query(countQuery);
		const total = countResult.recordset[0]?.Total || 0;
		
		// Log query info for debugging
		if (isRegionalAM) {
			console.log("[FDP-Approval] Regional AM query executed:", {
				userId,
				total,
				whereClause: whereClause.substring(0, 200) // First 200 chars
			});
		}

		// Query to get data with pagination - JOIN with PE_FamilyMember to count family members and calculate income
		// Also check approval status from EconomicDevelopment
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
				END as PerCapitaIncome,
				-- Check approval status from EconomicDevelopment
				MAX(CASE 
					WHEN ed.[ApprovalStatus] IS NOT NULL 
						AND (LOWER(LTRIM(RTRIM(ed.[ApprovalStatus]))) = 'accepted' 
							OR LOWER(LTRIM(RTRIM(ed.[ApprovalStatus]))) = 'approved'
							OR LOWER(LTRIM(RTRIM(ed.[ApprovalStatus]))) LIKE '%approve%')
					THEN ed.[ApprovalStatus]
					ELSE NULL
				END) as ApprovalStatus
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			LEFT JOIN (
				SELECT
					[FormNo],
					COUNT(*) as MemberCount,
					SUM(ISNULL([MonthlyIncome], 0)) as TotalMemberIncome
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) fm ON app.[FormNumber] = fm.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment] ed 
				ON app.[FormNumber] = ed.[FormNumber] 
				AND ed.[IsActive] = 1
			${whereClause}
			GROUP BY 
				app.[FormNumber],
				app.[Full_Name],
				app.[CNICNumber],
				app.[RegionalCommunity],
				app.[LocalCommunity],
				app.[Area_Type],
				fm.MemberCount,
				fm.TotalMemberIncome,
				app.[MonthlyIncome_Remittance],
				app.[MonthlyIncome_Rental],
				app.[MonthlyIncome_OtherSources]
			ORDER BY app.[FormNumber] DESC
			OFFSET ${offset} ROWS
			FETCH NEXT ${limit} ROWS ONLY
		`;

		// Execute query with user parameters
		const dataRequest = pool.request();
		if (isRegionalAM) {
			dataRequest.input("userId", userId);
		} else if (userFullName) {
			dataRequest.input("userFullName", userFullName);
		}
		
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

