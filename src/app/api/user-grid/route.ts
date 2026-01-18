import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const maxDuration = 120;

const unauthorizedResponse = (message = "Unauthorized") =>
	NextResponse.json({ success: false, message }, { status: 401 });

const extractUserIdentifier = (request: NextRequest): string | null => {
	const authCookie = request.cookies.get("auth");
	if (!authCookie || !authCookie.value) {
		return null;
	}

	const value = authCookie.value;
	if (value.startsWith("authenticated:")) {
		const [, userId] = value.split(":");
		return userId || null;
	}

	// Fallback to raw value
	return value || null;
};

export async function GET(request: NextRequest) {
	try {
		const userId = extractUserIdentifier(request);
		if (!userId) {
			return unauthorizedResponse();
		}

		const pool = await getDb();
		const authRequest = pool.request();
		authRequest.input("user_id", userId);
		authRequest.input("email_address", userId);
		(authRequest as any).timeout = 120000;
		const authResult = await authRequest.query(
			`SELECT TOP(1)
				[UserId],
				[email_address],
				[UserType]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE [UserId] = @user_id OR [email_address] = @email_address`
		);

		const profileRow = authResult.recordset?.[0];
		if (!profileRow) {
			return unauthorizedResponse("Session invalid");
		}

		// Get optional email filter from query parameters
		const searchParams = request.nextUrl.searchParams;
		const filterEmail = searchParams.get("email");

		const gridRequest = pool.request();
		(gridRequest as any).timeout = 120000;
		
		// Build query with optional email filter (permission columns have been removed)
		let query = `SELECT TOP (1000)
				[UserId],
				[email_address],
				[UserFullName],
				[Password],
				[UserType],
				[Designation],
				[Regional_Council],
				[Local_Council],
				[user_create_date],
				[user_update_date],
				[AccessScope]
			FROM [SJDA_Users].[dbo].[PE_User]`;
		
		if (filterEmail) {
			query += ` WHERE [email_address] = @filterEmail`;
			gridRequest.input("filterEmail", filterEmail);
		}
		
		query += ` ORDER BY [UserId] ASC`;
		
		const gridResult = await gridRequest.query(query);

		const sanitizedRows = (gridResult.recordset || []).map((row: any) => ({
			UserId: row.UserId ?? null,
			email_address: row.email_address ?? null,
			UserFullName: row.UserFullName ?? null,
			Password: row.Password ? "***" : null,
			UserType: row.UserType ?? null,
			Designation: row.Designation ?? null,
			Regional_Council: row.Regional_Council ?? null,
			Local_Council: row.Local_Council ?? null,
			user_create_date: row.user_create_date ?? null,
			user_update_date: row.user_update_date ?? null,
			AccessScope: row.AccessScope ?? null,
			Active: row.Active ?? null,
			Setting: row.Setting ?? null,
			SwbFamilies: row.SwbFamilies ?? null,
			ActualIntervention: row.ActualIntervention ?? null,
			FinanceSection: row.FinanceSection ?? null,
			BankInformation: row.BankInformation ?? null,
			BaselineApproval: row.BaselineApproval ?? null,
			FeasibilityApproval: row.FeasibilityApproval ?? null,
			FdpApproval: row.FdpApproval ?? null,
			InterventionApproval: row.InterventionApproval ?? null,
			BankAccountApproval: row.BankAccountApproval ?? null,
			Baseline: row.Baseline ?? null,
			FamilyDevelopmentPlan: row.FamilyDevelopmentPlan ?? null,
			ROPs: row.ROPs ?? null,
			FamilyIncome: row.FamilyIncome ?? null,
		}));

		return NextResponse.json({
			success: true,
			users: sanitizedRows,
			total: sanitizedRows.length,
		});
	} catch (error) {
		console.error("[user-grid] Error fetching PE_User grid:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching PE_User grid: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
