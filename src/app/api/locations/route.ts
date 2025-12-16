import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Optional: require auth so only logged-in users can read locations
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", locations: [] },
				{ status: 401 }
			);
		}

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const query = `
			SELECT DISTINCT
				[AREA],
				[REGIONAL COUNCIL] as REGIONAL_COUNCIL,
				[LOCAL COUNCIL] as LOCAL_COUNCIL
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
			WHERE [AREA] IS NOT NULL
		`;

		const result = await request_query.query(query);
		const locations = result.recordset || [];

		return NextResponse.json({
			success: true,
			locations,
		});
	} catch (error) {
		console.error("Error fetching locations:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching locations: " + errorMessage,
				locations: [],
			},
			{ status: 500 }
		);
	}
}


