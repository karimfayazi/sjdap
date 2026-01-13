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

		// Fetch baseline QOL data with family member count
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		const query = `
			SELECT 
				app.[FormNumber],
				app.[Full_Name],
				app.[CNICNumber],
				app.[RegionalCommunity],
				app.[LocalCommunity],
				app.[CurrentCommunityCenter],
				app.[Area_Type],
				app.[ApprovalStatus],
				ISNULL(fm.MemberCount, 0) as TotalMembers
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			LEFT JOIN (
				SELECT 
					[FormNo],
					COUNT(*) as MemberCount
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) fm ON app.[FormNumber] = fm.[FormNo]
			ORDER BY app.[FormNumber] DESC
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching baseline QOL approval data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching baseline QOL approval data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}
