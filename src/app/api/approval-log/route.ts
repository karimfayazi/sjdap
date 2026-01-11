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
		const recordId = searchParams.get("recordId");
		const moduleName = searchParams.get("moduleName") || "Feasibility Plan";

		if (!recordId) {
			return NextResponse.json(
				{ success: false, message: "Record ID is required", records: [] },
				{ status: 400 }
			);
		}

		// Fetch approval log data
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("RecordID", sql.Int, parseInt(recordId));
		sqlRequest.input("ModuleName", sql.NVarChar, moduleName);

		const query = `
			SELECT TOP (1000) 
				[LogID],
				[ModuleName],
				[RecordID],
				[ActionLevel],
				[ActionBy],
				[ActionAt],
				[ActionType],
				[Remarks]
			FROM [SJDA_Users].[dbo].[Approval_Log]
			WHERE [RecordID] = @RecordID 
				AND [ModuleName] = @ModuleName
			ORDER BY [ActionAt] DESC
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching approval log data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching approval log data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}
