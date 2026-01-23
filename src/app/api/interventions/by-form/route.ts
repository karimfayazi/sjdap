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
				{ ok: false, message: "Unauthorized", data: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ ok: false, message: "Invalid session", data: [] },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ ok: false, message: "Form Number is required", data: [] },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber.trim());

		const query = `
			SELECT 
				[InterventionID],
				[FormNumber],
				[Section],
				[MemberID],
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_Interventions]
			WHERE [FormNumber] = @FormNumber
		`;

		const result = await sqlRequest.query(query);
		const interventions = (result.recordset || []).map((row: any) => ({
			InterventionID: row.InterventionID || null,
			FormNumber: row.FormNumber || null,
			Section: row.Section || null,
			MemberID: row.MemberID || null,
			ApprovalStatus: row.ApprovalStatus || null,
		}));

		return NextResponse.json({
			ok: true,
			data: interventions,
		});
	} catch (error) {
		console.error("Error fetching interventions by form number:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{
				ok: false,
				message: "Error fetching interventions: " + errorMessage,
				data: [],
			},
			{ status: 500 }
		);
	}
}
