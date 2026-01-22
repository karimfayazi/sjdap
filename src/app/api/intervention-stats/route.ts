import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac-utils";
import sql from "mssql";

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

		// Fetch Intervention statistics from PE_Interventions
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userId", userId);

		// Build query based on user type
		let regionalCouncilFilter = "";
		
		if (isSuperAdminUser) {
			// Super Admin: Show all data (no filter)
			regionalCouncilFilter = "";
		} else if (isEditor && userFullName) {
			// Editor: Filter by SubmittedBy matching user's full name
			regionalCouncilFilter = `AND b.[SubmittedBy] = @userFullName`;
			sqlRequest.input("userFullName", sql.NVarChar, userFullName);
		} else if (isEDO) {
			// EDO: Filter by regional councils assigned to user
			regionalCouncilFilter = `
				AND EXISTS (
					SELECT 1
					FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
					INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc
						ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId]
					WHERE ura.[UserId] = @userId
						AND rc.[RegionalCouncilName] = b.[RegionalCommunity]
				)
			`;
		} else if (isRegionalAM) {
			// Regional AM: Show all families (no filter)
			regionalCouncilFilter = "";
		} else {
			// Other users: Show all data (fallback)
			regionalCouncilFilter = "";
		}

		const query = `
			SELECT 
				COUNT(*) as TotalInterventions,
				SUM(CASE 
					WHEN i.[ApprovalStatus] IS NULL OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = '' OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = 'pending' 
					THEN 1 
					ELSE 0 
				END) as PendingInterventions,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) LIKE '%approve%' OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = 'approved' OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = 'complete'
					THEN 1 
					ELSE 0 
				END) as ApprovedInterventions,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) LIKE '%reject%' OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = 'rejected'
					THEN 1 
					ELSE 0 
				END) as RejectedInterventions
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b 
				ON i.[FormNumber] = b.[FormNumber]
			WHERE 1=1 ${regionalCouncilFilter}
		`;

		const result = await sqlRequest.query(query);
		const stats = result.recordset[0] || {
			TotalInterventions: 0,
			PendingInterventions: 0,
			ApprovedInterventions: 0,
			RejectedInterventions: 0,
		};

		return NextResponse.json({
			success: true,
			stats: {
				total: parseInt(stats.TotalInterventions) || 0,
				approved: parseInt(stats.ApprovedInterventions) || 0,
				pending: parseInt(stats.PendingInterventions) || 0,
				rejected: parseInt(stats.RejectedInterventions) || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching intervention statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching intervention statistics: " + errorMessage,
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
