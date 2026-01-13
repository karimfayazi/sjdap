import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";

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

		// Fetch baseline statistics filtered by SubmittedBy matching user's name or username
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userFullName", userFullName);
		sqlRequest.input("userName", userName);

		const query = `
			SELECT 
				COUNT(*) as TotalFamilies,
				SUM(CASE 
					WHEN [ApprovalStatus] IS NULL OR LOWER(LTRIM(RTRIM([ApprovalStatus]))) = '' OR LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'pending' 
					THEN 1 
					ELSE 0 
				END) as PendingFamilies,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM([ApprovalStatus]))) LIKE '%approve%' OR LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'approved' OR LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'complete'
					THEN 1 
					ELSE 0 
				END) as ApprovedFamilies,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM([ApprovalStatus]))) LIKE '%reject%' OR LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'rejected'
					THEN 1 
					ELSE 0 
				END) as RejectedFamilies
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [SubmittedBy] = @userFullName OR [SubmittedBy] = @userName
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
		console.error("Error fetching baseline statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching baseline statistics: " + errorMessage,
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
