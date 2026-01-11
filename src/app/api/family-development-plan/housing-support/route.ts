import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Input parameters
		sqlRequest.input("FamilyID", sql.VarChar, body.FamilyID);
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HabitatMonthlyTotalCost", sql.Decimal(18, 2), body.HabitatMonthlyTotalCost || 0);
		sqlRequest.input("HabitatMonthlyFamilyContribution", sql.Decimal(18, 2), body.HabitatMonthlyFamilyContribution || 0);
		sqlRequest.input("HabitatMonthlyPEContribution", sql.Decimal(18, 2), body.HabitatMonthlyPEContribution || 0);
		sqlRequest.input("HabitatNumberOfMonths", sql.Int, body.HabitatNumberOfMonths || 0);
		sqlRequest.input("CreatedBy", sql.VarChar, body.CreatedBy || "System");

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			(
				[FamilyID], [HeadName], [AreaType],
				[HabitatMonthlyTotalCost], [HabitatMonthlyFamilyContribution],
				[HabitatMonthlyPEContribution], [HabitatNumberOfMonths],
				[CreatedBy], [CreatedAt], [IsActive]
			)
			VALUES
			(
				@FamilyID, @HeadName, @AreaType,
				@HabitatMonthlyTotalCost, @HabitatMonthlyFamilyContribution,
				@HabitatMonthlyPEContribution, @HabitatNumberOfMonths,
				@CreatedBy, GETDATE(), 1
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
			sqlRequest.input("FamilyID", sql.VarChar, familyID);
			query += ` AND [FamilyID] = @FamilyID`;
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
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		sqlRequest.input("FDP_HabitatSupportID", sql.Int, parseInt(fdpHabitatSupportId));
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HabitatMonthlyTotalCost", sql.Decimal(18, 2), body.HabitatMonthlyTotalCost || 0);
		sqlRequest.input("HabitatMonthlyFamilyContribution", sql.Decimal(18, 2), body.HabitatMonthlyFamilyContribution || 0);
		sqlRequest.input("HabitatMonthlyPEContribution", sql.Decimal(18, 2), body.HabitatMonthlyPEContribution || 0);
		sqlRequest.input("HabitatNumberOfMonths", sql.Int, body.HabitatNumberOfMonths || 0);
		sqlRequest.input("UpdatedBy", sql.VarChar, body.UpdatedBy || "System");

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


