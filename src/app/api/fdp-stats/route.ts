import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
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

		// Get user type and check if Super Admin
		const userPool = await getDb();
		const userRequest = userPool.request();
		userRequest.input("user_id", userId);
		userRequest.input("email_address", userId);
		const userResult = await userRequest.query(
			"SELECT TOP(1) [UserType], [UserId], [email_address], [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
		);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		const userType = user.UserType ? String(user.UserType).trim() : null;
		const userFullName = user.UserFullName || null;
		const isSuperAdminUser = await isSuperAdmin(userId);
		const isEDO = userType && userType.toUpperCase() === "EDO";
		const isRegionalAM = userType && userType.toUpperCase() === "REGIONAL AM";
		const isEditor = userType && userType.toLowerCase() === "editor";

		// Fetch Family Development Plan statistics
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userId", userId);

		// Get total families from baseline stats (using same logic as baseline-stats API)
		let baselineWhereClause = "";
		if (isSuperAdminUser) {
			baselineWhereClause = "";
		} else if (isEditor && userFullName) {
			baselineWhereClause = `WHERE app.[SubmittedBy] = @userFullName`;
			sqlRequest.input("userFullName", sql.NVarChar, userFullName);
		} else if (isEDO) {
			baselineWhereClause = `
				WHERE EXISTS (
					SELECT 1
					FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
					INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc
						ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId]
					WHERE ura.[UserId] = @userId
						AND rc.[RegionalCouncilName] = app.[RegionalCommunity]
				)
			`;
		} else if (isRegionalAM) {
			baselineWhereClause = "";
		} else {
			baselineWhereClause = "";
		}

		// Get approval counts from Approval_Log where ModuleName='FDP'
		// Filter by ActionBy matching logged-in user's username (if not super admin)
		let approvalLogFilter = "";
		if (!isSuperAdminUser && userFullName) {
			approvalLogFilter = `AND al.[ActionBy] = @userFullName`;
		}

		const query = `
			-- Get total families from baseline
			WITH BaselineFamilies AS (
				SELECT COUNT(*) as TotalFamilies
				FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
				${baselineWhereClause}
			),
			-- Get approval counts from Approval_Log
			ApprovalLogStats AS (
				SELECT 
					COUNT(DISTINCT CASE 
						WHEN LTRIM(RTRIM(al.[ActionLevel])) = 'Approved' 
						THEN al.[FormNumber] 
						ELSE NULL 
					END) as ApprovedFamilies,
					COUNT(DISTINCT CASE 
						WHEN al.[ActionLevel] IS NULL 
							OR LTRIM(RTRIM(al.[ActionLevel])) = '' 
							OR (LTRIM(RTRIM(al.[ActionLevel])) != 'Approved' AND LTRIM(RTRIM(al.[ActionLevel])) != 'Rejected')
						THEN al.[FormNumber] 
						ELSE NULL 
					END) as PendingFamilies,
					COUNT(DISTINCT CASE 
						WHEN LTRIM(RTRIM(al.[ActionLevel])) = 'Rejected' 
						THEN al.[FormNumber] 
						ELSE NULL 
					END) as RejectedFamilies
				FROM [SJDA_Users].[dbo].[Approval_Log] al
				WHERE al.[ModuleName] = 'FDP'
					AND al.[FormNumber] IS NOT NULL
					${approvalLogFilter}
			)
			SELECT 
				bf.TotalFamilies,
				COALESCE(als.ApprovedFamilies, 0) as ApprovedFamilies,
				COALESCE(als.PendingFamilies, 0) as PendingFamilies,
				COALESCE(als.RejectedFamilies, 0) as RejectedFamilies
			FROM BaselineFamilies bf
			CROSS JOIN ApprovalLogStats als
		`;

		const result = await sqlRequest.query(query);
		const stats = result.recordset[0] || {
			TotalFamilies: 0,
			PendingFamilies: 0,
			ApprovedFamilies: 0,
			RejectedFamilies: 0,
		};

		return NextResponse.json({
			success: true,
			stats: {
				total: parseInt(stats.TotalFamilies) || 0,
				approved: parseInt(stats.ApprovedFamilies) || 0,
				pending: parseInt(stats.PendingFamilies) || 0,
				rejected: parseInt(stats.RejectedFamilies) || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching FDP statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching FDP statistics: " + errorMessage,
				stats: {
					total: 0,
					approved: 0,
					pending: 0,
					rejected: 0,
				},
			},
			{ status: 500 }
		);
	}
}
