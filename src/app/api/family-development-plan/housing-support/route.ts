import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// Helper function to get current user's full name
async function getCurrentUserFullName(request: NextRequest): Promise<string> {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return "System";
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return "System";
		}

		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName], [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		// Return UserFullName if available, otherwise fallback to UserId or email_address
		const userName = user?.UserFullName || user?.UserId || user?.email_address || userId;
		
		// Ensure it's a valid non-empty string
		const trimmedName = typeof userName === "string" ? userName.trim() : String(userName).trim();
		return trimmedName.length > 0 ? trimmedName : "System";
	} catch (error) {
		console.error("Error fetching user full name:", error);
		return "System";
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		
		// Get current user's full name (server-side)
		const createdBy = await getCurrentUserFullName(request);
		
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Input parameters - ignore CreatedBy/UpdatedBy/ApprovalStatus from client
		// Note: HabitatTotalCost, HabitatTotalFamilyContribution, HabitatTotalPEContribution are computed columns
		// and should not be included in INSERT/UPDATE statements
		sqlRequest.input("FormNumber", sql.VarChar, body.FormNumber);
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HabitatMonthlyTotalCost", sql.Decimal(18, 2), body.HabitatMonthlyTotalCost || 0);
		sqlRequest.input("HabitatMonthlyFamilyContribution", sql.Decimal(18, 2), body.HabitatMonthlyFamilyContribution || 0);
		sqlRequest.input("HabitatMonthlyPEContribution", sql.Decimal(18, 2), body.HabitatMonthlyPEContribution || 0);
		sqlRequest.input("HabitatNumberOfMonths", sql.Int, body.HabitatNumberOfMonths || 0);
		sqlRequest.input("CreatedBy", sql.VarChar, createdBy); // Server-side only

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			(
				[FormNumber], [HeadName], [AreaType],
				[HabitatMonthlyTotalCost], [HabitatMonthlyFamilyContribution],
				[HabitatMonthlyPEContribution], [HabitatNumberOfMonths],
				[CreatedBy], [CreatedAt], [IsActive], [ApprovalStatus]
			)
			VALUES
			(
				@FormNumber, @HeadName, @AreaType,
				@HabitatMonthlyTotalCost, @HabitatMonthlyFamilyContribution,
				@HabitatMonthlyPEContribution, @HabitatNumberOfMonths,
				@CreatedBy, GETDATE(), 1, 'Pending'
			)
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Housing Support data saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving Housing Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving Housing Support data",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpHabitatSupportId = searchParams.get("fdpHabitatSupportId");
		const familyID = searchParams.get("familyID");

		if (!fdpHabitatSupportId && !familyID) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Habitat Support ID or Family ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		let query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			WHERE [IsActive] = 1
		`;

		if (fdpHabitatSupportId) {
			sqlRequest.input("FDP_HabitatSupportID", sql.Int, parseInt(fdpHabitatSupportId));
			query += ` AND [FDP_HabitatSupportID] = @FDP_HabitatSupportID`;
		} else if (familyID) {
			sqlRequest.input("FormNumber", sql.VarChar, familyID);
			query += ` AND [FormNumber] = @FormNumber`;
			query += ` ORDER BY [FDP_HabitatSupportID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// If fdpHabitatSupportId is provided, return single record; otherwise return all records
		if (fdpHabitatSupportId) {
			return NextResponse.json({
				success: true,
				data: result.recordset[0] || null,
			});
		} else {
			return NextResponse.json({
				success: true,
				data: result.recordset || [],
			});
		}
	} catch (error: any) {
		console.error("Error fetching Housing Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching Housing Support data",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpHabitatSupportId = searchParams.get("fdpHabitatSupportId");

		if (!fdpHabitatSupportId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Habitat Support ID is required for update",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		
		// Get current user's full name (server-side)
		const updatedBy = await getCurrentUserFullName(request);
		
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Note: HabitatTotalCost, HabitatTotalFamilyContribution, HabitatTotalPEContribution are computed columns
		// and should not be included in UPDATE statements
		sqlRequest.input("FDP_HabitatSupportID", sql.Int, parseInt(fdpHabitatSupportId));
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HabitatMonthlyTotalCost", sql.Decimal(18, 2), body.HabitatMonthlyTotalCost || 0);
		sqlRequest.input("HabitatMonthlyFamilyContribution", sql.Decimal(18, 2), body.HabitatMonthlyFamilyContribution || 0);
		sqlRequest.input("HabitatMonthlyPEContribution", sql.Decimal(18, 2), body.HabitatMonthlyPEContribution || 0);
		sqlRequest.input("HabitatNumberOfMonths", sql.Int, body.HabitatNumberOfMonths || 0);
		sqlRequest.input("UpdatedBy", sql.VarChar, updatedBy); // Server-side only

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			SET
				[HeadName] = @HeadName,
				[AreaType] = @AreaType,
				[HabitatMonthlyTotalCost] = @HabitatMonthlyTotalCost,
				[HabitatMonthlyFamilyContribution] = @HabitatMonthlyFamilyContribution,
				[HabitatMonthlyPEContribution] = @HabitatMonthlyPEContribution,
				[HabitatNumberOfMonths] = @HabitatNumberOfMonths,
				[UpdatedBy] = @UpdatedBy,
				[UpdatedAt] = GETDATE()
			WHERE [FDP_HabitatSupportID] = @FDP_HabitatSupportID
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Housing Support data updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating Housing Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating Housing Support data",
			},
			{ status: 500 }
		);
	}
}


