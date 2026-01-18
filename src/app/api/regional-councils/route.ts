import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const pool = await getDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const query = `
			SELECT 
				[RegionalCouncilId],
				[RegionalCouncilCode],
				[RegionalCouncilName],
				[IsActive]
			FROM [SJDA_Users].[dbo].[LU_RegionalCouncil]
			WHERE [IsActive] = 1
			ORDER BY [RegionalCouncilName]
		`;

		const result = await request_query.query(query);
		const regionalCouncils = result.recordset || [];

		return NextResponse.json({
			success: true,
			regionalCouncils: regionalCouncils
		});
	} catch (error) {
		console.error("Error fetching regional councils:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching regional councils: " + errorMessage,
				regionalCouncils: []
			},
			{ status: 500 }
		);
	}
}
