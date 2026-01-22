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

		// Fetch Feasibility statistics from PE_FamilyDevelopmentPlan_Feasibility
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userId", userId);

		// Filter by CreatedBy matching user's login username (UserFullName)
		let createdByFilter = "";
		if (userFullName) {
			createdByFilter = `AND f.[CreatedBy] = @userFullName`;
			sqlRequest.input("userFullName", sql.NVarChar, userFullName);
		}

		const query = `
			SELECT 
				COUNT(DISTINCT f.[FormNumber]) as TotalFamilies,
				COUNT(*) as TotalFeasibility,
				SUM(CASE 
					WHEN f.[ApprovalStatus] IS NULL 
						OR LTRIM(RTRIM(f.[ApprovalStatus])) = '' 
						OR LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) IN ('pending', 'submitted', 'in process')
					THEN 1 
					ELSE 0 
				END) as PendingFeasibility,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) IN ('approved', 'accepted')
					THEN 1 
					ELSE 0 
				END) as ApprovedFeasibility,
				SUM(CASE 
					WHEN LOWER(LTRIM(RTRIM(f.[ApprovalStatus]))) IN ('rejected', 'declined')
					THEN 1 
					ELSE 0 
				END) as RejectedFeasibility
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility] f
			WHERE 1=1 ${createdByFilter}
		`;

		const result = await sqlRequest.query(query);
		const stats = result.recordset[0] || {
			TotalFamilies: 0,
			TotalFeasibility: 0,
			PendingFeasibility: 0,
			ApprovedFeasibility: 0,
			RejectedFeasibility: 0,
		};

		return NextResponse.json({
			success: true,
			families: parseInt(stats.TotalFamilies) || 0,
			feasibility: parseInt(stats.TotalFeasibility) || 0,
			pending: parseInt(stats.PendingFeasibility) || 0,
			approved: parseInt(stats.ApprovedFeasibility) || 0,
			rejected: parseInt(stats.RejectedFeasibility) || 0,
		});
	} catch (error) {
		console.error("Error fetching feasibility statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching feasibility statistics: " + errorMessage,
				families: 0,
				feasibility: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
			},
			{ status: 500 }
		);
	}
}
