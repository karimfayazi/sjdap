import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ ok: false, message: "Unauthorized", banks: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ ok: false, message: "Invalid session", banks: [] },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");
		const beneficiaryId = searchParams.get("beneficiaryId");
		const scope = searchParams.get("scope"); // "economic" or "social"

		if (!formNumber) {
			return NextResponse.json(
				{ ok: false, message: "Form Number is required", banks: [] },
				{ status: 400 }
			);
		}

		if (!scope || (scope !== "economic" && scope !== "social")) {
			return NextResponse.json(
				{ ok: false, message: "Scope must be 'economic' or 'social'", banks: [] },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("formNumber", sql.VarChar, formNumber.trim());

		// Build query based on scope
		let query = `
			SELECT 
				[BankNo],
				[FormNumber],
				[BeneficiaryID],
				[BankName],
				[AccountNo]
			FROM [SJDA_Users].[dbo].[PE_BankInformation]
			WHERE LTRIM(RTRIM([FormNumber])) = LTRIM(RTRIM(@formNumber))
		`;

		if (scope === "economic") {
			// For ECONOMIC: filter by FormNumber AND BeneficiaryID
			if (!beneficiaryId) {
				return NextResponse.json(
					{ ok: false, message: "BeneficiaryID is required for economic scope", banks: [] },
					{ status: 400 }
				);
			}
			sqlRequest.input("beneficiaryId", sql.VarChar, beneficiaryId.trim());
			query += " AND LTRIM(RTRIM([BeneficiaryID])) = LTRIM(RTRIM(@beneficiaryId))";
		} else {
			// For SOCIAL: filter by FormNumber only (all family members)
			// No additional BeneficiaryID filter needed
		}

		query += " ORDER BY [BankNo]";

		const result = await sqlRequest.query(query);
		const banks = (result.recordset || []).map((row: any) => ({
			BankNo: row.BankNo || null,
			BankName: row.BankName || null,
			AccountNo: row.AccountNo || null,
			BeneficiaryID: row.BeneficiaryID || null,
		}));

		return NextResponse.json({
			ok: true,
			banks: banks,
		});
	} catch (error) {
		console.error("Error fetching bank information:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{
				ok: false,
				message: "Error fetching bank information: " + errorMessage,
				banks: [],
			},
			{ status: 500 }
		);
	}
}
