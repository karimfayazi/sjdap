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
				{ success: false, message: "Unauthorized", interventions: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", interventions: [] },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const searchTerm = searchParams.get("search") || "";
		const approvalStatus = searchParams.get("approvalStatus") || "";
		const regionalCommunity = searchParams.get("regionalCommunity") || "";

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause
		let whereConditions: string[] = [];
		
		if (searchTerm) {
			whereConditions.push(`(i.[FormNumber] LIKE @searchTerm OR b.[Full_Name] LIKE @searchTerm)`);
			sqlRequest.input("searchTerm", sql.NVarChar, `%${searchTerm}%`);
		}

		if (approvalStatus) {
			if (approvalStatus === "Pending") {
				whereConditions.push(`(i.[ApprovalStatus] IS NULL OR i.[ApprovalStatus] = '' OR LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = 'pending')`);
			} else {
				whereConditions.push(`LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = LOWER(LTRIM(RTRIM(@approvalStatus)))`);
				sqlRequest.input("approvalStatus", sql.NVarChar, approvalStatus);
			}
		}

		if (regionalCommunity) {
			whereConditions.push(`b.[RegionalCommunity] = @regionalCommunity`);
			sqlRequest.input("regionalCommunity", sql.NVarChar, regionalCommunity);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		const query = `
			SELECT TOP (1000)
				i.[InterventionID],
				i.[FormNumber],
				i.[Section],
				i.[InterventionStatus],
				i.[InterventionCategory],
				i.[SubCategory],
				i.[MainIntervention],
				i.[InterventionType],
				i.[FinancialCategory],
				i.[TotalAmount],
				i.[InterventionStartDate],
				i.[InterventionEndDate],
				i.[Remarks],
				i.[MemberID],
				i.[ApprovalStatus],
				i.[CreatedBy] as Mentor,
				i.[CreatedAt],
				b.[Full_Name] as FamilyFullName,
				b.[CNICNumber] as FamilyCNIC,
				b.[RegionalCommunity],
				b.[LocalCommunity],
				m.[FullName] as MemberName
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON i.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m
				ON i.[MemberID] = m.[BeneficiaryID]
			${whereClause}
			ORDER BY i.[InterventionID] DESC
		`;

		const result = await sqlRequest.query(query);
		const interventions = result.recordset || [];

		return NextResponse.json({
			success: true,
			interventions,
		});
	} catch (error) {
		console.error("Error fetching interventions for approval:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching interventions: " + errorMessage,
				interventions: [],
			},
			{ status: 500 }
		);
	}
}
