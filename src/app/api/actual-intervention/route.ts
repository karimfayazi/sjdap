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

		// Fetch families with member counts
		// Super Users see all families, others see only their own (matching SubmittedBy with UserFullName)
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		
		let whereClause = "";
		if (!isSuperUser && userFullName) {
			whereClause = `WHERE b.[SubmittedBy] = @userFullName`;
			sqlRequest.input("userFullName", userFullName);
		}

		const query = `
			SELECT 
				b.[FormNumber],
				b.[Full_Name],
				b.[CNICNumber],
				b.[RegionalCommunity],
				b.[LocalCommunity],
				ISNULL(m.[TotalMembers], 0) AS TotalMembers,
				ISNULL(u.[UserFullName], b.[SubmittedBy]) AS SubmittedBy
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
			LEFT JOIN (
				SELECT 
					[FormNo],
					COUNT(*) AS TotalMembers
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) m ON b.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON b.[SubmittedBy] = u.[UserFullName]
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
