import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";
import { checkSuperUserFromDb } from "@/lib/auth-server-utils";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", records: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", records: [] },
				{ status: 401 }
			);
		}

		// Check if user is Super User
		const isSuperUser = await checkSuperUserFromDb(userId);

		// Get user's full name to match with SubmittedBy (only needed if not Super User)
		let userFullName: string | null = null;
		
		if (!isSuperUser) {
			const pool = await getPeDb();
			const userResult = await pool
				.request()
				.input("user_id", userId)
				.input("email_address", userId)
				.query(
					"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
				);

			const user = userResult.recordset?.[0];
			if (!user) {
				return NextResponse.json(
					{ success: false, message: "User not found", records: [] },
					{ status: 404 }
				);
			}

			userFullName = user.UserFullName;
		}

		// Get filter parameters from query string
		const { searchParams } = new URL(request.url);
		const search = searchParams.get("q") || "";
		const cnic = searchParams.get("cnic") || "";
		const section = searchParams.get("section") || "";
		const category = searchParams.get("category") || "";
		const status = searchParams.get("status") || "";
		const fromDate = searchParams.get("from") || "";
		const toDate = searchParams.get("to") || "";
		const page = parseInt(searchParams.get("page") || "1");
		const pageSize = parseInt(searchParams.get("pageSize") || "20");
		const sortBy = searchParams.get("sortBy") || "FormNumber";
		const sortDir = searchParams.get("sortDir") || "ASC";

		// Fetch families with member counts
		// Super Users see all families, others see only their own (matching SubmittedBy with UserFullName)
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		
		// Build WHERE conditions dynamically
		const whereConditions: string[] = [];
		
		// User permission filter
		if (!isSuperUser && userFullName) {
			whereConditions.push(`b.[SubmittedBy] = @userFullName`);
			sqlRequest.input("userFullName", userFullName);
		}

		// Search filter (matches FormNumber, Full_Name, or MemberID from interventions)
		if (search && search.trim()) {
			const searchPattern = `%${search.trim()}%`;
			sqlRequest.input("searchPattern", sql.NVarChar, searchPattern);
			whereConditions.push(`(
				b.[FormNumber] LIKE @searchPattern 
				OR b.[Full_Name] LIKE @searchPattern
				OR EXISTS (
					SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
					WHERE i.[FormNumber] = b.[FormNumber] 
					AND (i.[MemberID] LIKE @searchPattern OR i.[InterventionID] LIKE @searchPattern)
				)
			)`);
		}

		// CNIC filter (exact or partial match)
		if (cnic && cnic.trim()) {
			const cnicPattern = `%${cnic.trim()}%`;
			sqlRequest.input("cnicPattern", sql.NVarChar, cnicPattern);
			whereConditions.push(`b.[CNICNumber] LIKE @cnicPattern`);
		}

		// Section filter (from PE_Interventions)
		if (section && section !== "All") {
			sqlRequest.input("section", sql.NVarChar, section);
			whereConditions.push(`EXISTS (
				SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
				WHERE i.[FormNumber] = b.[FormNumber] 
				AND i.[Section] = @section
			)`);
		}

		// Category filter (from PE_Interventions)
		if (category && category !== "All") {
			sqlRequest.input("category", sql.NVarChar, category);
			whereConditions.push(`EXISTS (
				SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
				WHERE i.[FormNumber] = b.[FormNumber] 
				AND i.[InterventionCategory] = @category
			)`);
		}

		// Status filter (from PE_Interventions)
		if (status && status !== "All") {
			sqlRequest.input("status", sql.NVarChar, status);
			whereConditions.push(`EXISTS (
				SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
				WHERE i.[FormNumber] = b.[FormNumber] 
				AND i.[InterventionStatus] = @status
			)`);
		}

		// Date range filter (on CreatedAt from PE_Interventions)
		if (fromDate) {
			const fromDateObj = new Date(fromDate);
			fromDateObj.setHours(0, 0, 0, 0);
			sqlRequest.input("fromDate", sql.DateTime, fromDateObj);
			whereConditions.push(`EXISTS (
				SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
				WHERE i.[FormNumber] = b.[FormNumber] 
				AND CAST(i.[CreatedAt] AS DATE) >= CAST(@fromDate AS DATE)
			)`);
		}

		if (toDate) {
			const toDateObj = new Date(toDate);
			toDateObj.setHours(23, 59, 59, 999);
			sqlRequest.input("toDate", sql.DateTime, toDateObj);
			whereConditions.push(`EXISTS (
				SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i 
				WHERE i.[FormNumber] = b.[FormNumber] 
				AND CAST(i.[CreatedAt] AS DATE) <= CAST(@toDate AS DATE)
			)`);
		}

		const whereClause = whereConditions.length > 0 
			? `WHERE ${whereConditions.join(" AND ")}`
			: "";

		// Validate sortBy and sortDir
		const allowedSortColumns = ["FormNumber", "Full_Name", "CNICNumber", "TotalMembers", "SubmittedBy"];
		const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "FormNumber";
		const safeSortDir = sortDir.toUpperCase() === "DESC" ? "DESC" : "ASC";

		// Get total count first (for pagination)
		const countQuery = `
			SELECT COUNT(DISTINCT b.[FormNumber]) AS TotalCount
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
			LEFT JOIN (
				SELECT 
					[FormNo],
					COUNT(*) AS TotalMembers
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) m ON b.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON b.[SubmittedBy] = u.[UserFullName]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([EduTotalPEContribution], 0)) AS peInvestmentSupportAmount
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) edu ON edu.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([InvestmentFromPEProgram], 0)) AS totalPEInvestment
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) econ ON econ.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([HealthTotalPEContribution], 0)) AS totalHealthSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) health ON health.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([FoodSupportTotalPEContribution], 0)) AS totalFoodSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) food ON food.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([HabitatTotalPEContribution], 0)) AS totalHousingSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) housing ON housing.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([TotalAmount], 0)) AS InterventionPESupportAmount
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [ApprovalStatus] = 'Approved'
				GROUP BY [FormNumber]
			) interventions ON interventions.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(CASE WHEN LOWER(LTRIM(RTRIM([Section]))) = 'economic' THEN ISNULL([TotalAmount], 0) ELSE 0 END) AS EconomicAmount,
					SUM(CASE 
						WHEN LOWER(LTRIM(RTRIM([Section]))) IN ('social support', 'social', 'socialsupport') 
						THEN ISNULL([TotalAmount], 0) 
						ELSE 0 
					END) AS SocialSupportAmount,
					SUM(CASE 
						WHEN LOWER(LTRIM(RTRIM([Section]))) IN ('economic', 'social support', 'social', 'socialsupport') 
						THEN ISNULL([TotalAmount], 0)
						ELSE 0
					END) AS TotalPESupportAmount
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [ApprovalStatus] = 'Approved'
				GROUP BY [FormNumber]
			) interventionSupport ON interventionSupport.[FormNumber] = b.[FormNumber]
			${whereClause}
		`;

		const countResult = await sqlRequest.query(countQuery);
		const totalCount = countResult.recordset?.[0]?.TotalCount || 0;

		// TEMPORARY: Query distinct Section values from PE_Interventions to confirm mapping
		// This will be removed after confirming the Section values
		try {
			const sectionCheckQuery = `
				SELECT DISTINCT [Section]
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [ApprovalStatus] = 'Approved'
				ORDER BY [Section]
			`;
			const sectionResult = await sqlRequest.query(sectionCheckQuery);
			const distinctSections = sectionResult.recordset?.map((r: any) => r.Section) || [];
			console.log("[DEBUG] Distinct Section values from PE_Interventions (Approved only):", distinctSections);
		} catch (sectionError) {
			console.warn("[DEBUG] Could not fetch distinct Section values:", sectionError);
		}

		// Calculate pagination
		const offset = (page - 1) * pageSize;
		sqlRequest.input("offset", sql.Int, offset);
		sqlRequest.input("pageSize", sql.Int, pageSize);

		// Main query with pagination
		const query = `
			SELECT 
				b.[FormNumber],
				b.[Full_Name],
				b.[CNICNumber],
				b.[RegionalCommunity],
				b.[LocalCommunity],
				ISNULL(m.[TotalMembers], 0) AS TotalMembers,
				ISNULL(u.[UserFullName], b.[SubmittedBy]) AS SubmittedBy,
				ISNULL(edu.[peInvestmentSupportAmount], 0) AS peInvestmentSupportAmount,
				ISNULL(econ.[totalPEInvestment], 0) AS EconomicAmount,
				ISNULL(health.[totalHealthSupport], 0) AS totalHealthSupport,
				ISNULL(food.[totalFoodSupport], 0) AS totalFoodSupport,
				ISNULL(housing.[totalHousingSupport], 0) AS totalHousingSupport,
				ISNULL(edu.[peInvestmentSupportAmount], 0) + 
				ISNULL(health.[totalHealthSupport], 0) + 
				ISNULL(food.[totalFoodSupport], 0) + 
				ISNULL(housing.[totalHousingSupport], 0) AS SocialSupportAmount,
				ISNULL(econ.[totalPEInvestment], 0) + 
				ISNULL(edu.[peInvestmentSupportAmount], 0) + 
				ISNULL(health.[totalHealthSupport], 0) + 
				ISNULL(food.[totalFoodSupport], 0) + 
				ISNULL(housing.[totalHousingSupport], 0) AS TotalPESupportAmount,
				ISNULL(interventions.[InterventionPESupportAmount], 0) AS InterventionPESupportAmount,
				ISNULL(interventionSupport.[EconomicAmount], 0) AS EconomicAmountFromInterventions,
				ISNULL(interventionSupport.[SocialSupportAmount], 0) AS SocialSupportAmountFromInterventions,
				ISNULL(interventionSupport.[TotalPESupportAmount], 0) AS TotalPESupportAmountFromInterventions
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
			LEFT JOIN (
				SELECT 
					[FormNo],
					COUNT(*) AS TotalMembers
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) m ON b.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON b.[SubmittedBy] = u.[UserFullName]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([EduTotalPEContribution], 0)) AS peInvestmentSupportAmount
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) edu ON edu.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([InvestmentFromPEProgram], 0)) AS totalPEInvestment
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) econ ON econ.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([HealthTotalPEContribution], 0)) AS totalHealthSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) health ON health.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([FoodSupportTotalPEContribution], 0)) AS totalFoodSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) food ON food.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([HabitatTotalPEContribution], 0)) AS totalHousingSupport
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [IsActive] = 1
				GROUP BY [FormNumber]
			) housing ON housing.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(ISNULL([TotalAmount], 0)) AS InterventionPESupportAmount
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [ApprovalStatus] = 'Approved'
				GROUP BY [FormNumber]
			) interventions ON interventions.[FormNumber] = b.[FormNumber]
			LEFT JOIN (
				SELECT
					[FormNumber],
					SUM(CASE WHEN LOWER(LTRIM(RTRIM([Section]))) = 'economic' THEN ISNULL([TotalAmount], 0) ELSE 0 END) AS EconomicAmount,
					SUM(CASE 
						WHEN LOWER(LTRIM(RTRIM([Section]))) IN ('social support', 'social', 'socialsupport') 
						THEN ISNULL([TotalAmount], 0) 
						ELSE 0 
					END) AS SocialSupportAmount,
					SUM(CASE 
						WHEN LOWER(LTRIM(RTRIM([Section]))) IN ('economic', 'social support', 'social', 'socialsupport') 
						THEN ISNULL([TotalAmount], 0)
						ELSE 0
					END) AS TotalPESupportAmount
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [ApprovalStatus] = 'Approved'
				GROUP BY [FormNumber]
			) interventionSupport ON interventionSupport.[FormNumber] = b.[FormNumber]
			${whereClause}
			ORDER BY b.[${safeSortBy}] ${safeSortDir}
			OFFSET @offset ROWS
			FETCH NEXT @pageSize ROWS ONLY
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		// Calculate summary totals
		let totalPEInvestmentSupportAmount = 0;
		let totalSocialSupport = 0;

		records.forEach((record: any) => {
			// Total PE Investment/Support Amount (Economic)
			totalPEInvestmentSupportAmount += parseFloat(record.totalPEInvestment || 0);
			
			// Total Social Support (Education + Health + Food + Housing)
			const education = parseFloat(record.peInvestmentSupportAmount || 0);
			const health = parseFloat(record.totalHealthSupport || 0);
			const food = parseFloat(record.totalFoodSupport || 0);
			const housing = parseFloat(record.totalHousingSupport || 0);
			totalSocialSupport += education + health + food + housing;
		});

		return NextResponse.json({
			success: true,
			records,
			totalCount,
			page,
			pageSize,
			totalPages: Math.ceil(totalCount / pageSize),
			summary: {
				totalPEInvestmentSupportAmount,
				totalSocialSupport,
			},
		});
	} catch (error) {
		console.error("Error fetching actual intervention data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching actual intervention data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}
