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
				{ success: false, message: "Unauthorized", rops: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", rops: [] },
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
			whereConditions.push(`(r.[FormNumber] LIKE @searchTerm OR r.[BeneficiaryID] LIKE @searchTerm OR r.[InterventionID] LIKE @searchTerm OR b.[Full_Name] LIKE @searchTerm)`);
			sqlRequest.input("searchTerm", sql.NVarChar, `%${searchTerm}%`);
		}

		if (approvalStatus) {
			if (approvalStatus === "Pending") {
				whereConditions.push(`(r.[ApprovalStatus] IS NULL OR r.[ApprovalStatus] = '' OR LOWER(LTRIM(RTRIM(r.[ApprovalStatus]))) = 'pending')`);
			} else {
				whereConditions.push(`LOWER(LTRIM(RTRIM(r.[ApprovalStatus]))) = LOWER(LTRIM(RTRIM(@approvalStatus)))`);
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
				r.[ROPId],
				r.[FormNumber],
				r.[BeneficiaryID],
				r.[InterventionID],
				r.[InterventionSection],
				r.[PayableAmount],
				r.[PayAmount],
				r.[MonthOfPayment],
				r.[PaymentType],
				r.[SubmittedBy],
				r.[SubmittedAt],
				r.[Remarks],
				r.[Payment_Done],
				r.[ApprovalStatus],
				r.[BankNo],
				-- Family Information
				b.[Full_Name] as FamilyFullName,
				b.[CNICNumber] as FamilyCNIC,
				b.[RegionalCommunity],
				b.[LocalCommunity],
				-- Member Information
				m.[FullName] as MemberName,
				m.[BFormOrCNIC] as MemberCNIC,
				-- Bank Information
				bank.[BankName],
				bank.[AccountNo]
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m
				ON r.[BeneficiaryID] = m.[BeneficiaryID] AND r.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			${whereClause}
			ORDER BY r.[ROPId] DESC
		`;

		const result = await sqlRequest.query(query);
		const rops = result.recordset || [];

		return NextResponse.json({
			success: true,
			rops,
		});
	} catch (error) {
		console.error("Error fetching ROPs for approval:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching ROPs: " + errorMessage,
				rops: [],
			},
			{ status: 500 }
		);
	}
}
