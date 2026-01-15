import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import { checkSuperUserFromDb } from "@/lib/auth-server-utils";

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

		// Check if user is Super User
		const isSuperUser = await checkSuperUserFromDb(userId);

		// Get user's full name to match with SubmittedBy (only needed if not Super User)
		let userFullName: string | null = null;
		
		if (!isSuperUser) {
			const userPool = await getPeDb();
			const userResult = await userPool
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

		// Fetch Feasibility statistics from PE_FamilyDevelopmentPlan_Feasibility
		// Super Users see all families, others see only their own (matching SubmittedBy with USER_FULL_NAME)
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build query based on user's SQL structure
		// Simple query matching: SELECT [FamilyID], [ApprovalStatus] FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
		let query = `
			SELECT 
				COUNT(*) as TotalFeasibility,
				SUM(CASE 
					WHEN f.[ApprovalStatus] IS NULL OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) = '' OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) = 'pending' 
					THEN 1 
					ELSE 0 
				END) as PendingFeasibility,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) LIKE '%approve%' OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) = 'approved' OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) = 'complete'
					THEN 1 
					ELSE 0 
				END) as ApprovedFeasibility,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) LIKE '%reject%' OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) = 'rejected'
					THEN 1 
					ELSE 0 
				END) as RejectedFeasibility
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility] f
		`;

		// Add join and filter for non-Super Users
		if (!isSuperUser && userFullName) {
			query += `
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] app ON f.[FamilyID] = app.[FormNumber]
			WHERE app.[SubmittedBy] = @userFullName
			`;
			sqlRequest.input("userFullName", userFullName);
		}

		const result = await sqlRequest.query(query);
		const stats = result.recordset[0] || {
			TotalFeasibility: 0,
			PendingFeasibility: 0,
			ApprovedFeasibility: 0,
			RejectedFeasibility: 0,
		};

		return NextResponse.json({
			success: true,
			stats: {
				total: parseInt(stats.TotalFeasibility) || 0,
				approved: parseInt(stats.ApprovedFeasibility) || 0,
				pending: parseInt(stats.PendingFeasibility) || 0,
				rejected: parseInt(stats.RejectedFeasibility) || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching feasibility statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching feasibility statistics: " + errorMessage,
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
