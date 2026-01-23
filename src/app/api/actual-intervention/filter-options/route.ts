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
				{ success: false, message: "Unauthorized", options: {} },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", options: {} },
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
					{ success: false, message: "User not found", options: {} },
					{ status: 404 }
				);
			}

			userFullName = user.UserFullName;
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause for user filtering
		let userWhereClause = "";
		if (!isSuperUser && userFullName) {
			userWhereClause = `AND b.[SubmittedBy] = @userFullName`;
			sqlRequest.input("userFullName", userFullName);
		}

		// Get distinct Sections from PE_Interventions
		const sectionQuery = `
			SELECT DISTINCT i.[Section]
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b ON i.[FormNumber] = b.[FormNumber]
			WHERE i.[Section] IS NOT NULL AND i.[Section] != ''
			${userWhereClause}
			ORDER BY i.[Section]
		`;
		const sectionResult = await sqlRequest.query(sectionQuery);
		const sections = (sectionResult.recordset || []).map((r: any) => r.Section).filter(Boolean);

		// Get distinct InterventionCategory
		const categoryQuery = `
			SELECT DISTINCT i.[InterventionCategory]
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b ON i.[FormNumber] = b.[FormNumber]
			WHERE i.[InterventionCategory] IS NOT NULL AND i.[InterventionCategory] != ''
			${userWhereClause}
			ORDER BY i.[InterventionCategory]
		`;
		const categoryResult = await sqlRequest.query(categoryQuery);
		const categories = (categoryResult.recordset || []).map((r: any) => r.InterventionCategory).filter(Boolean);

		// Get distinct InterventionStatus
		const statusQuery = `
			SELECT DISTINCT i.[InterventionStatus]
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b ON i.[FormNumber] = b.[FormNumber]
			WHERE i.[InterventionStatus] IS NOT NULL AND i.[InterventionStatus] != ''
			${userWhereClause}
			ORDER BY i.[InterventionStatus]
		`;
		const statusResult = await sqlRequest.query(statusQuery);
		const statuses = (statusResult.recordset || []).map((r: any) => r.InterventionStatus).filter(Boolean);

		return NextResponse.json({
			success: true,
			options: {
				sections: sections,
				categories: categories,
				statuses: statuses,
			},
		});
	} catch (error) {
		console.error("Error fetching filter options:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching filter options: " + errorMessage,
				options: {},
			},
			{ status: 500 }
		);
	}
}
