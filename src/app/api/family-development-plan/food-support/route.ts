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
		sqlRequest.input("BaselineFamilyIncome", sql.Decimal(18, 2), body.BaselineFamilyIncome || null);
		sqlRequest.input("FamilyMembersCount", sql.Int, body.FamilyMembersCount || null);
		sqlRequest.input("SelfSufficiencyIncomePerCapita", sql.Decimal(18, 2), body.SelfSufficiencyIncomePerCapita || null);
		sqlRequest.input("BaselinePovertyLevel", sql.VarChar, body.BaselinePovertyLevel || null);
		sqlRequest.input("MaxSocialSupportAmount", sql.Decimal(18, 2), body.MaxSocialSupportAmount || null);
		sqlRequest.input("FoodSupportMonthlyTotalCost", sql.Decimal(18, 2), body.FoodSupportMonthlyTotalCost || 0);
		sqlRequest.input("FoodSupportMonthlyFamilyContribution", sql.Decimal(18, 2), body.FoodSupportMonthlyFamilyContribution || 0);
		sqlRequest.input("FoodSupportMonthlyPEContribution", sql.Decimal(18, 2), body.FoodSupportMonthlyPEContribution || 0);
		sqlRequest.input("FoodSupportNumberOfMonths", sql.Int, body.FoodSupportNumberOfMonths || 0);
		sqlRequest.input("CreatedBy", sql.VarChar, body.CreatedBy || "System");

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
			(
				[FamilyID], [HeadName], [BaselineFamilyIncome], [FamilyMembersCount],
				[SelfSufficiencyIncomePerCapita], [BaselinePovertyLevel], [MaxSocialSupportAmount],
				[FoodSupportMonthlyTotalCost], [FoodSupportMonthlyFamilyContribution],
				[FoodSupportMonthlyPEContribution], [FoodSupportNumberOfMonths],
				[CreatedBy], [CreatedAt], [IsActive]
			)
			VALUES
			(
				@FamilyID, @HeadName, @BaselineFamilyIncome, @FamilyMembersCount,
				@SelfSufficiencyIncomePerCapita, @BaselinePovertyLevel, @MaxSocialSupportAmount,
				@FoodSupportMonthlyTotalCost, @FoodSupportMonthlyFamilyContribution,
				@FoodSupportMonthlyPEContribution, @FoodSupportNumberOfMonths,
				@CreatedBy, GETDATE(), 1
			)
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Food Support data saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving Food Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving Food Support data",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpFoodSupportId = searchParams.get("fdpFoodSupportId");
		const familyID = searchParams.get("familyID");

		if (!fdpFoodSupportId && !familyID) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Food Support ID or Family ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		let query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
			WHERE [IsActive] = 1
		`;

		if (fdpFoodSupportId) {
			sqlRequest.input("FDP_FoodSupportID", sql.Int, parseInt(fdpFoodSupportId));
			query += ` AND [FDP_FoodSupportID] = @FDP_FoodSupportID`;
		} else if (familyID) {
			sqlRequest.input("FamilyID", sql.VarChar, familyID);
			query += ` AND [FamilyID] = @FamilyID`;
			query += ` ORDER BY [FDP_FoodSupportID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// If fdpFoodSupportId is provided, return single record; otherwise return all records
		if (fdpFoodSupportId) {
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
		console.error("Error fetching Food Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching Food Support data",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpFoodSupportId = searchParams.get("fdpFoodSupportId");

		if (!fdpFoodSupportId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Food Support ID is required for update",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		sqlRequest.input("FDP_FoodSupportID", sql.Int, parseInt(fdpFoodSupportId));
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("BaselineFamilyIncome", sql.Decimal(18, 2), body.BaselineFamilyIncome || null);
		sqlRequest.input("FamilyMembersCount", sql.Int, body.FamilyMembersCount || null);
		sqlRequest.input("SelfSufficiencyIncomePerCapita", sql.Decimal(18, 2), body.SelfSufficiencyIncomePerCapita || null);
		sqlRequest.input("BaselinePovertyLevel", sql.VarChar, body.BaselinePovertyLevel || null);
		sqlRequest.input("MaxSocialSupportAmount", sql.Decimal(18, 2), body.MaxSocialSupportAmount || null);
		sqlRequest.input("FoodSupportMonthlyTotalCost", sql.Decimal(18, 2), body.FoodSupportMonthlyTotalCost || 0);
		sqlRequest.input("FoodSupportMonthlyFamilyContribution", sql.Decimal(18, 2), body.FoodSupportMonthlyFamilyContribution || 0);
		sqlRequest.input("FoodSupportMonthlyPEContribution", sql.Decimal(18, 2), body.FoodSupportMonthlyPEContribution || 0);
		sqlRequest.input("FoodSupportNumberOfMonths", sql.Int, body.FoodSupportNumberOfMonths || 0);
		sqlRequest.input("UpdatedBy", sql.VarChar, body.UpdatedBy || "System");

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
			SET
				[HeadName] = @HeadName,
				[BaselineFamilyIncome] = @BaselineFamilyIncome,
				[FamilyMembersCount] = @FamilyMembersCount,
				[SelfSufficiencyIncomePerCapita] = @SelfSufficiencyIncomePerCapita,
				[BaselinePovertyLevel] = @BaselinePovertyLevel,
				[MaxSocialSupportAmount] = @MaxSocialSupportAmount,
				[FoodSupportMonthlyTotalCost] = @FoodSupportMonthlyTotalCost,
				[FoodSupportMonthlyFamilyContribution] = @FoodSupportMonthlyFamilyContribution,
				[FoodSupportMonthlyPEContribution] = @FoodSupportMonthlyPEContribution,
				[FoodSupportNumberOfMonths] = @FoodSupportNumberOfMonths,
				[UpdatedBy] = @UpdatedBy,
				[UpdatedAt] = GETDATE()
			WHERE [FDP_FoodSupportID] = @FDP_FoodSupportID
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Food Support data updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating Food Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating Food Support data",
			},
			{ status: 500 }
		);
	}
}


