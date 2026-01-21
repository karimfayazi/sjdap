import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		
		// Query to get family members for the given FormNumber
		const query = `
			SELECT 
				[BeneficiaryID],
				[FormNo],
				[FullName],
				[BFormOrCNIC],
				[Relationship],
				[Gender],
				[DOBMonth],
				[DOBYear],
				[Occupation],
				[MonthlyIncome]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @formNumber
			ORDER BY [BeneficiaryID]
		`;

		const sqlRequest = pool.request();
		sqlRequest.input("formNumber", sql.NVarChar, formNumber);
		const result = await sqlRequest.query(query);

		return NextResponse.json({
			success: true,
			data: result.recordset || [],
		});
	} catch (error: any) {
		console.error("Error fetching family members:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching family members",
			},
			{ status: 500 }
		);
	}
}

