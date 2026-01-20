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
		sqlRequest.input("BaselineFamilyIncome", sql.Decimal(18, 2), body.BaselineFamilyIncome || 0);
		sqlRequest.input("FamilyMembersCount", sql.Int, body.FamilyMembersCount || 0);
		sqlRequest.input("SelfSufficiencyIncomePerCapita", sql.Decimal(18, 2), body.SelfSufficiencyIncomePerCapita || 0);
		sqlRequest.input("BaselinePovertyLevel", sql.NVarChar, body.BaselinePovertyLevel || "");
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || "");
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || 0);
		sqlRequest.input("BeneficiaryGender", sql.NVarChar, body.BeneficiaryGender || "");
		sqlRequest.input("BeneficiaryCurrentOccupation", sql.NVarChar, body.BeneficiaryCurrentOccupation || "");
		sqlRequest.input("InterventionType", sql.NVarChar, body.InterventionType || "");
		sqlRequest.input("FieldOfInvestment", sql.NVarChar, body.FieldOfInvestment || "");
		sqlRequest.input("SubFieldOfInvestment", sql.NVarChar, body.SubFieldOfInvestment || "");
		sqlRequest.input("Trade", sql.NVarChar, body.Trade || "");
		sqlRequest.input("SkillsDevelopmentCourse", sql.NVarChar, body.SkillsDevelopmentCourse || "");
		sqlRequest.input("Institution", sql.NVarChar, body.Institution || "");
		sqlRequest.input("InvestmentRequiredTotal", sql.Decimal(18, 2), body.InvestmentRequiredTotal || 0);
		sqlRequest.input("ContributionFromBeneficiary", sql.Decimal(18, 2), body.ContributionFromBeneficiary || 0);
		sqlRequest.input("InvestmentFromPEProgram", sql.Decimal(18, 2), body.InvestmentFromPEProgram || 0);
		sqlRequest.input("GrantAmount", sql.Decimal(18, 2), body.GrantAmount || 0);
		sqlRequest.input("LoanAmount", sql.Decimal(18, 2), body.LoanAmount || 0);
		// InvestmentValidationStatus is int: 1 = Valid, 0 = Invalid
		const validationStatus = body.InvestmentValidationStatus === "Valid" || body.InvestmentValidationStatus === 1 || body.InvestmentValidationStatus === "1" ? 1 : 0;
		sqlRequest.input("InvestmentValidationStatus", sql.Int, validationStatus);
		sqlRequest.input("PlannedMonthlyIncome", sql.Decimal(18, 2), body.PlannedMonthlyIncome || 0);
		sqlRequest.input("CurrentMonthlyIncome", sql.Decimal(18, 2), body.CurrentMonthlyIncome || 0);
		sqlRequest.input("IncrementalMonthlyIncome", sql.Decimal(18, 2), body.IncrementalMonthlyIncome || 0);
		sqlRequest.input("FeasibilityID", sql.Int, body.FeasibilityID ? parseInt(body.FeasibilityID) : null);
		sqlRequest.input("ApprovalStatus", sql.NVarChar, body.ApprovalStatus || "Pending");
		sqlRequest.input("ApprovalRemarks", sql.NVarChar, body.ApprovalRemarks || "");
		sqlRequest.input("CreatedBy", sql.VarChar, body.CreatedBy || "System");

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			(
				[FamilyID], [BaselineFamilyIncome], [FamilyMembersCount],
				[SelfSufficiencyIncomePerCapita], [BaselinePovertyLevel],
				[BeneficiaryID], [BeneficiaryName], [BeneficiaryAge], [BeneficiaryGender],
				[BeneficiaryCurrentOccupation], [InterventionType], [FieldOfInvestment],
				[SubFieldOfInvestment], [Trade], [SkillsDevelopmentCourse], [Institution],
				[InvestmentRequiredTotal], [ContributionFromBeneficiary], [InvestmentFromPEProgram],
				[GrantAmount], [LoanAmount], [InvestmentValidationStatus],
				[PlannedMonthlyIncome], [CurrentMonthlyIncome], [IncrementalMonthlyIncome],
				[FeasibilityID], [ApprovalStatus], [ApprovalRemarks],
				[CreatedBy], [CreatedAt], [UpdatedAt], [IsActive]
			)
			VALUES
			(
				@FamilyID, @BaselineFamilyIncome, @FamilyMembersCount,
				@SelfSufficiencyIncomePerCapita, @BaselinePovertyLevel,
				@BeneficiaryID, @BeneficiaryName, @BeneficiaryAge, @BeneficiaryGender,
				@BeneficiaryCurrentOccupation, @InterventionType, @FieldOfInvestment,
				@SubFieldOfInvestment, @Trade, @SkillsDevelopmentCourse, @Institution,
				@InvestmentRequiredTotal, @ContributionFromBeneficiary, @InvestmentFromPEProgram,
				@GrantAmount, @LoanAmount, @InvestmentValidationStatus,
				@PlannedMonthlyIncome, @CurrentMonthlyIncome, @IncrementalMonthlyIncome,
				@FeasibilityID, @ApprovalStatus, @ApprovalRemarks,
				@CreatedBy, GETDATE(), GETDATE(), 1
			)
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "FDP Economic Development data saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving FDP Economic Development data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving FDP Economic Development data",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpEconomicId = searchParams.get("fdpEconomicId");
		const familyID = searchParams.get("familyID");
		const beneficiaryID = searchParams.get("beneficiaryID");

		if (!fdpEconomicId && !familyID) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Economic ID or Family ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		let query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [IsActive] = 1
		`;

		if (fdpEconomicId) {
			sqlRequest.input("FDP_EconomicID", sql.Int, parseInt(fdpEconomicId));
			query += ` AND [FDP_EconomicID] = @FDP_EconomicID`;
			query += ` ORDER BY [FDP_EconomicID] DESC`;
		} else if (familyID) {
			sqlRequest.input("FamilyID", sql.VarChar, familyID);
			query += ` AND [FamilyID] = @FamilyID`;
			if (beneficiaryID) {
				sqlRequest.input("BeneficiaryID", sql.VarChar, beneficiaryID);
				query += ` AND [BeneficiaryID] = @BeneficiaryID`;
			}
			query += ` ORDER BY [FDP_EconomicID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// If fdpEconomicId is provided, return single record; otherwise return all records
		if (fdpEconomicId) {
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
		console.error("Error fetching FDP Economic Development data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching FDP Economic Development data",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpEconomicId = searchParams.get("fdpEconomicId");

		if (!fdpEconomicId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Economic ID is required for update",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const pool = await getPeDb();
		
		// Check if FDP is already approved - reject edits if approved
		const checkRequest = pool.request();
		checkRequest.input("FDP_EconomicID", sql.Int, parseInt(fdpEconomicId));
		const checkQuery = `
			SELECT TOP 1 [FamilyID], [ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FDP_EconomicID] = @FDP_EconomicID
				AND [IsActive] = 1
		`;
		const checkResult = await checkRequest.query(checkQuery);
		const record = checkResult.recordset?.[0];
		
		if (record) {
			const approvalStatus = (record.ApprovalStatus || "").toString().trim().toLowerCase();
			if (approvalStatus === "accepted" || approvalStatus === "approved" || approvalStatus.includes("approve")) {
				return NextResponse.json(
					{
						success: false,
						message: "Cannot edit FDP that has already been approved.",
					},
					{ status: 409 } // Conflict
				);
			}
		}

		const sqlRequest = pool.request();
		sqlRequest.input("FDP_EconomicID", sql.Int, parseInt(fdpEconomicId));
		sqlRequest.input("BaselineFamilyIncome", sql.Decimal(18, 2), body.BaselineFamilyIncome || 0);
		sqlRequest.input("FamilyMembersCount", sql.Int, body.FamilyMembersCount || 0);
		sqlRequest.input("SelfSufficiencyIncomePerCapita", sql.Decimal(18, 2), body.SelfSufficiencyIncomePerCapita || 0);
		sqlRequest.input("BaselinePovertyLevel", sql.NVarChar, body.BaselinePovertyLevel || "");
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || "");
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || 0);
		sqlRequest.input("BeneficiaryGender", sql.NVarChar, body.BeneficiaryGender || "");
		sqlRequest.input("BeneficiaryCurrentOccupation", sql.NVarChar, body.BeneficiaryCurrentOccupation || "");
		sqlRequest.input("InterventionType", sql.NVarChar, body.InterventionType || "");
		sqlRequest.input("FieldOfInvestment", sql.NVarChar, body.FieldOfInvestment || "");
		sqlRequest.input("SubFieldOfInvestment", sql.NVarChar, body.SubFieldOfInvestment || "");
		sqlRequest.input("Trade", sql.NVarChar, body.Trade || "");
		sqlRequest.input("SkillsDevelopmentCourse", sql.NVarChar, body.SkillsDevelopmentCourse || "");
		sqlRequest.input("Institution", sql.NVarChar, body.Institution || "");
		sqlRequest.input("InvestmentRequiredTotal", sql.Decimal(18, 2), body.InvestmentRequiredTotal || 0);
		sqlRequest.input("ContributionFromBeneficiary", sql.Decimal(18, 2), body.ContributionFromBeneficiary || 0);
		sqlRequest.input("InvestmentFromPEProgram", sql.Decimal(18, 2), body.InvestmentFromPEProgram || 0);
		sqlRequest.input("GrantAmount", sql.Decimal(18, 2), body.GrantAmount || 0);
		sqlRequest.input("LoanAmount", sql.Decimal(18, 2), body.LoanAmount || 0);
		// InvestmentValidationStatus is int: 1 = Valid, 0 = Invalid
		const validationStatus = body.InvestmentValidationStatus === "Valid" || body.InvestmentValidationStatus === 1 || body.InvestmentValidationStatus === "1" ? 1 : 0;
		sqlRequest.input("InvestmentValidationStatus", sql.Int, validationStatus);
		sqlRequest.input("PlannedMonthlyIncome", sql.Decimal(18, 2), body.PlannedMonthlyIncome || 0);
		sqlRequest.input("CurrentMonthlyIncome", sql.Decimal(18, 2), body.CurrentMonthlyIncome || 0);
		sqlRequest.input("IncrementalMonthlyIncome", sql.Decimal(18, 2), body.IncrementalMonthlyIncome || 0);
		sqlRequest.input("FeasibilityID", sql.Int, body.FeasibilityID ? parseInt(body.FeasibilityID) : null);
		sqlRequest.input("ApprovalStatus", sql.NVarChar, body.ApprovalStatus || "Pending");
		sqlRequest.input("ApprovalRemarks", sql.NVarChar, body.ApprovalRemarks || "");
		sqlRequest.input("UpdatedBy", sql.VarChar, body.UpdatedBy || "System");

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			SET
				[BaselineFamilyIncome] = @BaselineFamilyIncome,
				[FamilyMembersCount] = @FamilyMembersCount,
				[SelfSufficiencyIncomePerCapita] = @SelfSufficiencyIncomePerCapita,
				[BaselinePovertyLevel] = @BaselinePovertyLevel,
				[BeneficiaryID] = @BeneficiaryID,
				[BeneficiaryName] = @BeneficiaryName,
				[BeneficiaryAge] = @BeneficiaryAge,
				[BeneficiaryGender] = @BeneficiaryGender,
				[BeneficiaryCurrentOccupation] = @BeneficiaryCurrentOccupation,
				[InterventionType] = @InterventionType,
				[FieldOfInvestment] = @FieldOfInvestment,
				[SubFieldOfInvestment] = @SubFieldOfInvestment,
				[Trade] = @Trade,
				[SkillsDevelopmentCourse] = @SkillsDevelopmentCourse,
				[Institution] = @Institution,
				[InvestmentRequiredTotal] = @InvestmentRequiredTotal,
				[ContributionFromBeneficiary] = @ContributionFromBeneficiary,
				[InvestmentFromPEProgram] = @InvestmentFromPEProgram,
				[GrantAmount] = @GrantAmount,
				[LoanAmount] = @LoanAmount,
				[InvestmentValidationStatus] = @InvestmentValidationStatus,
				[PlannedMonthlyIncome] = @PlannedMonthlyIncome,
				[CurrentMonthlyIncome] = @CurrentMonthlyIncome,
				[IncrementalMonthlyIncome] = @IncrementalMonthlyIncome,
				[FeasibilityID] = @FeasibilityID,
				[ApprovalStatus] = @ApprovalStatus,
				[ApprovalRemarks] = @ApprovalRemarks,
				[UpdatedBy] = @UpdatedBy,
				[UpdatedAt] = GETDATE()
			WHERE [FDP_EconomicID] = @FDP_EconomicID
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "FDP Economic Development data updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating FDP Economic Development data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating FDP Economic Development data",
			},
			{ status: 500 }
		);
	}
}


