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

		// Get user's full name to match with SubmittedBy
		const pool = await getPeDb();
		const userResult = await pool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_ID] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found", records: [] },
				{ status: 404 }
			);
		}

		const userFullName = user.USER_FULL_NAME;
		const userName = user.USER_ID;

		// Fetch families with member counts, filtered by SubmittedBy
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		
		// Add user parameters
		if (userFullName) sqlRequest.input("userFullName", userFullName);
		if (userName) sqlRequest.input("userName", userName);

		const whereClause = userFullName && userName 
			? `WHERE (b.[SubmittedBy] = @userFullName OR b.[SubmittedBy] = @userName)`
			: userFullName 
			? `WHERE b.[SubmittedBy] = @userFullName`
			: userName 
			? `WHERE b.[SubmittedBy] = @userName`
			: ``;

		const query = `
			SELECT 
				b.[FormNumber],
				b.[Full_Name],
				b.[CNICNumber],
				b.[RegionalCommunity],
				b.[LocalCommunity],
				ISNULL(m.[TotalMembers], 0) AS TotalMembers
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
			LEFT JOIN (
				SELECT 
					[FormNo],
					COUNT(*) AS TotalMembers
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) m ON b.[FormNumber] = m.[FormNo]
			${whereClause}
			ORDER BY b.[FormNumber]
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
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
