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

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");
		const section = searchParams.get("section");
		const memberId = searchParams.get("memberId");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required", records: [] },
				{ status: 400 }
			);
		}

		// Validate formNumber format
		if (typeof formNumber !== "string" || formNumber.length > 50) {
			return NextResponse.json(
				{ success: false, message: "Invalid Form Number format", records: [] },
				{ status: 400 }
			);
		}

		// Fetch interventions filtered by formNumber, section, and memberId
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);

		let query = `
			SELECT TOP (1000) 
				[InterventionID],
				[FormNumber],
				[Section],
				[InterventionStatus],
				[InterventionCategory],
				[SubCategory],
				[MainIntervention],
				[InterventionType],
				[FinancialCategory],
				[TotalAmount],
				[InterventionStartDate],
				[InterventionEndDate],
				[Remarks],
				[MemberID],
				[ApprovalStatus],
				[CreatedBy],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_Interventions]
			WHERE [FormNumber] = @FormNumber
				AND LOWER(LTRIM(RTRIM([InterventionStatus]))) = 'open'
				AND LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'approved'
		`;

		// Filter by section if provided
		if (section) {
			query += " AND LOWER(LTRIM(RTRIM([Section]))) = LOWER(LTRIM(RTRIM(@Section)))";
			sqlRequest.input("Section", sql.NVarChar, section);
		}

		// Filter by memberId if provided
		if (memberId) {
			query += " AND [MemberID] = @MemberID";
			sqlRequest.input("MemberID", sql.VarChar, memberId);
		}

		query += " ORDER BY [InterventionID] DESC";

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching ROPS interventions:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching ROPS interventions: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}
