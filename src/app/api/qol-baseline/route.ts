import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.FAMILY_ID || !data.HEAD_NAME || !data.CNIC) {
			return NextResponse.json(
				{ success: false, message: "Family ID, Head Name, and CNIC are required" },
				{ status: 400 }
			);
		}

		const pool = await getBaselineDb();

		// TODO: Update with the actual table name and structure
		// This is a placeholder - you'll need to adjust based on your actual database schema
		const query = `
			INSERT INTO [SJDA_BASELINEDB].[dbo].[Table_Name] 
			(
				[FAMILY_ID], [PROGRAM], [AREA], [REGIONAL COUNCIL], [LOCAL COUNCIL], 
				[JAMAT KHANA], [HEAD NAME], [AGE], [CNIC], [AREA TYPE], 
				[FAMILY_PROGRESS_STATUS], [MENTOR], [FDP_APPROVED_DATE], [FAMILY_TYPE], 
				[CRC_APPROVAL_FAMILY_INCOME], [EXPECTED_GRADUCATION_DATE], [PROGRAM_TYPE], 
				[FAMILY_FROM], [TOTAL MEMBERS], [STATUS_DATE]
			)
			VALUES 
			(
				@FAMILY_ID, @PROGRAM, @AREA, @REGIONAL_COUNCIL, @LOCAL_COUNCIL,
				@JAMAT_KHANA, @HEAD_NAME, @AGE, @CNIC, @AREA_TYPE,
				@FAMILY_PROGRESS_STATUS, @MENTOR, @FDP_APPROVED_DATE, @FAMILY_TYPE,
				@CRC_APPROVAL_FAMILY_INCOME, @EXPECTED_GRADUCATION_DATE, @PROGRAM_TYPE,
				@FAMILY_FROM, @TOTAL_MEMBERS, @STATUS_DATE
			)
		`;

		const dbRequest = pool.request();
		dbRequest.input("FAMILY_ID", data.FAMILY_ID);
		dbRequest.input("PROGRAM", data.PROGRAM || null);
		dbRequest.input("AREA", data.AREA || null);
		dbRequest.input("REGIONAL_COUNCIL", data.REGIONAL_COUNCIL || null);
		dbRequest.input("LOCAL_COUNCIL", data.LOCAL_COUNCIL || null);
		dbRequest.input("JAMAT_KHANA", data.JAMAT_KHANA || null);
		dbRequest.input("HEAD_NAME", data.HEAD_NAME);
		dbRequest.input("AGE", data.AGE ? parseInt(data.AGE) : null);
		dbRequest.input("CNIC", data.CNIC);
		dbRequest.input("AREA_TYPE", data.AREA_TYPE || null);
		dbRequest.input("FAMILY_PROGRESS_STATUS", data.FAMILY_PROGRESS_STATUS || null);
		dbRequest.input("MENTOR", data.MENTOR || null);
		dbRequest.input("FDP_APPROVED_DATE", data.FDP_APPROVED_DATE || null);
		dbRequest.input("FAMILY_TYPE", data.FAMILY_TYPE || null);
		dbRequest.input("CRC_APPROVAL_FAMILY_INCOME", data.CRC_APPROVAL_FAMILY_INCOME || null);
		dbRequest.input("EXPECTED_GRADUCATION_DATE", data.EXPECTED_GRADUCATION_DATE || null);
		dbRequest.input("PROGRAM_TYPE", data.PROGRAM_TYPE || null);
		dbRequest.input("FAMILY_FROM", data.FAMILY_FROM || null);
		dbRequest.input("TOTAL_MEMBERS", data.TOTAL_MEMBERS ? parseInt(data.TOTAL_MEMBERS) : null);
		dbRequest.input("STATUS_DATE", data.STATUS_DATE || null);
		(dbRequest as any).timeout = 120000;
		const result = await dbRequest.query(query);

		return NextResponse.json({
			success: true,
			message: "QOL-Baseline data saved successfully",
			data: result
		});
	} catch (error) {
		console.error("Error saving QOL-Baseline data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Failed to save data: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

