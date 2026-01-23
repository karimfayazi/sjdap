import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");
		const memberId = searchParams.get("memberId");

		if (!formNumber || !memberId) {
			return NextResponse.json(
				{ success: false, message: "Form Number and Member ID are required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);
		sqlRequest.input("MemberId", sql.VarChar, memberId);

		// Get member name
		const memberQuery = `
			SELECT TOP 1 [FullName]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNumber AND [BeneficiaryID] = @MemberId
		`;

		const memberResult = await sqlRequest.query(memberQuery);
		const memberName = memberResult.recordset?.[0]?.FullName || null;

		// Get head name (Relationship = 'Self')
		const headQuery = `
			SELECT TOP 1 [FullName]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNumber 
				AND LOWER(LTRIM(RTRIM([Relationship]))) = 'self'
		`;

		const headResult = await sqlRequest.query(headQuery);
		const headName = headResult.recordset?.[0]?.FullName || null;

		// Get primary section from interventions for this member
		// If multiple sections exist, use the first one (most common approach)
		const sectionQuery = `
			SELECT TOP 1 [Section]
			FROM [SJDA_Users].[dbo].[PE_Interventions]
			WHERE [FormNumber] = @FormNumber
				AND [MemberID] = @MemberId
				AND LOWER(LTRIM(RTRIM([InterventionStatus]))) = 'open'
				AND LOWER(LTRIM(RTRIM([ApprovalStatus]))) = 'approved'
			ORDER BY [InterventionID] DESC
		`;

		const sectionResult = await sqlRequest.query(sectionQuery);
		const section = sectionResult.recordset?.[0]?.Section || null;

		return NextResponse.json({
			success: true,
			headName: headName || "N/A",
			memberName: memberName || "N/A",
			section: section || null
		});

	} catch (error) {
		console.error("Error fetching ROP generate info:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching ROP generate info: " + errorMessage
			},
			{ status: 500 }
		);
	}
}
