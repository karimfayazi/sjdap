import { NextRequest, NextResponse } from "next/server";
import { getDb, getFdpDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
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

		// Check designation from SJDA_Users
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [DESIGNATION], [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const designation = (user?.DESIGNATION || "").toString().trim().toUpperCase();

		if (designation !== "EDO") {
			return NextResponse.json(
				{
					success: false,
					message: "Access denied. This dashboard section is only available for EDO designation.",
					records: [],
				},
				{ status: 403 }
			);
		}

		// Fetch feasibility data from SJDA_FDP
		const fdpPool = await getFdpDb();
		const request_query = fdpPool.request();
		(request_query as any).timeout = 120000;

		const query = `
			SELECT TOP (200)
				[FAMILY ID] AS FAMILY_ID,
				[PROGRAM],
				[REGIONAL COUNCIL] AS REGIONAL_COUNCIL,
				[HEAD NAME] AS HEAD_NAME,
				[MENTOR],
				[FDP_APPROVED_DATE],
				[CRC_APPROVAL_FAMILY_INCOME],
				[MEMBER_ID],
				[CURRENT_SITUATION],
				[RATIONALE],
				[PROPOSED_INTERVENTION],
				[PLAN_TYPE],
				[CONTRIBUTION_SUPPORT_FAMILY],
				[CONTRIBUTION_SUPPORT_PROGRAM],
				[TOTAL_PROPOSED_AMOUNT],
				[TOTAL_SALES_REVENUES],
				[TOTAL_DIRECT_COST],
				[TOTAL_INDIRECT_COSTS],
				[TOTAL_COST_DIRECT_INDIRECT_COST],
				[PROFIT_LOSS],
				[NET_PROFIT_LOSS],
				[EXPECTED_INCOME_AFTER_3_MONTHS],
				[EXPECTED_INCOME_AFTER_6_MONTHS],
				[EXPECTED_INCOME_AFTER_1_YEAR],
				[EXPECTED_INCOME_AFTER_2_YEAR],
				[EXPECTED_INCOME_AFTER_3_YEAR],
				[EXPECTED_INCOME_AFTER_4_YEAR],
				[EXPECTED_OUTCOME],
				[REMARKS],
				[UPDATE_DATE],
				[TOTAL MEMBERS] AS TOTAL_MEMBERS,
				[STATUS],
				[AREA] AS AREA,
				FORMAT([FDP_APPROVED_DATE], 'MMM-yyyy') AS FAMILY_INTAKE_MONTH_YEAR
			FROM [SJDA_FDP].[dbo].[View_Family_Feasibility]
			ORDER BY [FAMILY ID]
		`;

		const result = await request_query.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching family feasibility data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching family feasibility data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}


