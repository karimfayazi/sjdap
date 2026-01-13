import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
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

		// Get user's full name to match with SubmittedBy
		const userPool = await getPeDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_ID] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		const userFullName = user.USER_FULL_NAME;
		const userName = user.USER_ID;

		// Fetch Intervention statistics filtered by SubmittedBy
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userFullName", userFullName);
		sqlRequest.input("userName", userName);

		const query = `
			WITH FamilyStatus AS (
				SELECT DISTINCT 
					i1.[FormNumber],
					CASE 
						WHEN EXISTS (
							SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i2 
							WHERE i2.[FormNumber] = i1.[FormNumber] 
							AND (LOWER(LTRIM(RTRIM(i2.[ApprovalStatus]))) LIKE '%approve%' 
								OR LOWER(LTRIM(RTRIM(i2.[ApprovalStatus]))) = 'approved' 
								OR LOWER(LTRIM(RTRIM(i2.[ApprovalStatus]))) = 'complete')
						) THEN 'Approved'
						WHEN EXISTS (
							SELECT 1 FROM [SJDA_Users].[dbo].[PE_Interventions] i2 
							WHERE i2.[FormNumber] = i1.[FormNumber] 
							AND (LOWER(LTRIM(RTRIM(i2.[ApprovalStatus]))) LIKE '%reject%' 
								OR LOWER(LTRIM(RTRIM(i2.[ApprovalStatus]))) = 'rejected')
						) THEN 'Rejected'
						ELSE 'Pending'
					END as ApprovalStatus
				FROM [SJDA_Users].[dbo].[PE_Interventions] i1
				INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] app ON i1.[FormNumber] = app.[FormNumber]
				WHERE app.[SubmittedBy] = @userFullName OR app.[SubmittedBy] = @userName
			)
			SELECT 
				COUNT(*) as TotalFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Pending' THEN 1 ELSE 0 END) as PendingFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as ApprovedFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Rejected' THEN 1 ELSE 0 END) as RejectedFamilies
			FROM FamilyStatus
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
