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
			try {
				const userPool = await getPeDb();
				const userRequest = userPool.request();
				userRequest.input("user_id", userId);
				userRequest.input("email_address", userId);
				const userResult = await userRequest.query(
					"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
				);

				const user = userResult.recordset?.[0];
				if (user && user.UserFullName) {
					userFullName = user.UserFullName;
				}
			} catch (userError) {
				console.error("Error fetching user full name:", userError);
				// Continue without user filter - will show all stats
			}
		}

		// Fetch Intervention statistics from PE_Interventions
		// Super Users see all interventions, others see only their own (matching SubmittedBy with UserFullName)
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build query based on user's SQL structure
		// Simple query matching: SELECT [InterventionID], [FormNumber], [ApprovalStatus] FROM [SJDA_Users].[dbo].[PE_Interventions]
		let query = `
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
		`;

		// Add join and filter for non-Super Users
		if (!isSuperUser && userFullName) {
			query += `
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] app ON i.[FormNumber] = app.[FormNumber]
			WHERE app.[SubmittedBy] = @userFullName
			`;
			sqlRequest.input("userFullName", userFullName);
		}

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
