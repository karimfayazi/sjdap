import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const maxDuration = 120;

// GET /api/approval/bank-accounts - List bank accounts with filters
export async function GET(request: NextRequest) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie?.value) {
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
		const approvalStatus = searchParams.get("approvalStatus") || "";
		const regionalCommunity = searchParams.get("regionalCommunity") || "";
		const search = searchParams.get("search") || "";

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause dynamically
		let whereConditions = ["1=1"];

		if (approvalStatus) {
			whereConditions.push("b.[ApprovalStatus] = @approvalStatus");
			sqlRequest.input("approvalStatus", approvalStatus);
		}

		if (regionalCommunity) {
			whereConditions.push("bi.[RegionalCommunity] = @regionalCommunity");
			sqlRequest.input("regionalCommunity", regionalCommunity);
		}

		if (search) {
			whereConditions.push(`(
				b.[FormNumber] LIKE @search 
				OR bi.[Full_Name] LIKE @search 
				OR bi.[CNICNumber] LIKE @search
				OR b.[AccountNo] LIKE @search
			)`);
			sqlRequest.input("search", `%${search}%`);
		}

		const whereClause = whereConditions.join(" AND ");

		const query = `
			SELECT TOP (1000)
				b.[BankNo],
				b.[FormNumber],
				bi.[Full_Name],
				bi.[CNICNumber],
				bi.[MotherTongue],
				bi.[RegionalCommunity],
				bi.[LocalCommunity],
				b.[BankName],
				b.[AccountTitle],
				b.[AccountNo],
				b.[CNIC] as BankCNIC,
				b.[BankCode],
				b.[SubmittedAt],
				b.[SubmittedBy],
				b.[ApprovalStatus],
				b.[Remarks],
				b.[BankChequeImagePath]
			FROM [SJDA_Users].[dbo].[PE_BankInformation] b
			INNER JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] bi
				ON b.[FormNumber] = bi.[FormNumber]
			WHERE ${whereClause}
			ORDER BY b.[SubmittedAt] DESC
		`;

		const result = await sqlRequest.query(query);

		return NextResponse.json({
			success: true,
			bankAccounts: result.recordset || []
		});
	} catch (error: any) {
		console.error("[approval/bank-accounts] GET Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching bank accounts" },
			{ status: 500 }
		);
	}
}
