import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const memberId = searchParams.get("memberId");

		if (!memberId) {
			return NextResponse.json(
				{
					success: false,
					message: "Member ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		sqlRequest.input("BeneficiaryID", sql.VarChar, memberId);

		const query = `
			SELECT TOP 1 
				[FullName],
				[BFormOrCNIC]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [BeneficiaryID] = @BeneficiaryID
		`;

		const result = await sqlRequest.query(query);

		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: true,
				data: null,
			});
		}

		const member = result.recordset[0];
		return NextResponse.json({
			success: true,
			data: {
				fullName: member.FullName || null,
				cnic: member.BFormOrCNIC || null,
			},
		});
	} catch (error: any) {
		console.error("Error fetching member by ID:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching member data",
			},
			{ status: 500 }
		);
	}
}
