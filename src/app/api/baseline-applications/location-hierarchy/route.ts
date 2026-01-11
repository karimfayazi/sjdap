import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const regionalCouncil = searchParams.get("regionalCouncil");
		const localCouncil = searchParams.get("localCouncil");

		const pool = await getBaselineDb();

		// If regionalCouncil is provided, return Local Councils for that Regional Council
		if (regionalCouncil && !localCouncil) {
			const query = `
				SELECT DISTINCT [LOCAL COUNCIL] as LocalCouncil
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
				WHERE [REGIONAL COUNCIL] = @regionalCouncil
				ORDER BY [LOCAL COUNCIL]
			`;
			const request = pool.request();
			request.input("regionalCouncil", regionalCouncil);
			const result = await request.query(query);
			
			return NextResponse.json({
				success: true,
				data: result.recordset.map((row: any) => row.LocalCouncil),
			});
		}

		// If both regionalCouncil and localCouncil are provided, return Jamat Khanas
		if (regionalCouncil && localCouncil) {
			const query = `
				SELECT DISTINCT [JAMAT KHANA] as JamatKhana
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
				WHERE [REGIONAL COUNCIL] = @regionalCouncil
				AND [LOCAL COUNCIL] = @localCouncil
				ORDER BY [JAMAT KHANA]
			`;
			const request = pool.request();
			request.input("regionalCouncil", regionalCouncil);
			request.input("localCouncil", localCouncil);
			const result = await request.query(query);
			
			return NextResponse.json({
				success: true,
				data: result.recordset.map((row: any) => row.JamatKhana),
			});
		}

		// If no filters, return all Regional Councils
		const query = `
			SELECT DISTINCT [REGIONAL COUNCIL] as RegionalCouncil
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
			ORDER BY [REGIONAL COUNCIL]
		`;
		const result = await pool.request().query(query);

		return NextResponse.json({
			success: true,
			data: result.recordset.map((row: any) => row.RegionalCouncil),
		});
	} catch (error: any) {
		console.error("Error fetching location hierarchy:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch location hierarchy",
			},
			{ status: 500 }
		);
	}
}










