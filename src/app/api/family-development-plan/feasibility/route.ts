import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Check if record already exists
		const checkRequest = pool.request();
		checkRequest.input("FamilyID", sql.NVarChar, body.FamilyID);
		checkRequest.input("MemberID", sql.NVarChar, body.MemberID);
		const checkQuery = `
			SELECT TOP 1 [FDP_ID]
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FamilyID] = @FamilyID AND [MemberID] = @MemberID
			ORDER BY [FDP_ID] DESC
		`;
		const checkResult = await checkRequest.query(checkQuery);
		const existingRecord = checkResult.recordset[0];

		// Set all input parameters
		sqlRequest.input("FamilyID", sql.NVarChar, body.FamilyID);
		sqlRequest.input("MemberID", sql.NVarChar, body.MemberID);
		sqlRequest.input("MemberName", sql.NVarChar, body.MemberName || null);
		sqlRequest.input("PlanCategory", sql.VarChar, body.PlanCategory);
		sqlRequest.input("CurrentBaselineIncome", sql.Decimal(18, 2), body.CurrentBaselineIncome || null);

		// Economic fields
		sqlRequest.input("FeasibilityType", sql.VarChar, body.FeasibilityType || null);
		sqlRequest.input("InvestmentRationale", sql.NVarChar, body.InvestmentRationale || null);
		sqlRequest.input("MarketBusinessAnalysis", sql.NVarChar, body.MarketBusinessAnalysis || null);
		sqlRequest.input("TotalSalesRevenue", sql.Decimal(18, 2), body.TotalSalesRevenue || null);
		sqlRequest.input("TotalDirectCosts", sql.Decimal(18, 2), body.TotalDirectCosts || null);
		sqlRequest.input("TotalIndirectCosts", sql.Decimal(18, 2), body.TotalIndirectCosts || null);
		sqlRequest.input("NetProfitLoss", sql.Decimal(18, 2), body.NetProfitLoss || null);
		sqlRequest.input("TotalInvestmentRequired", sql.Decimal(18, 2), body.TotalInvestmentRequired || null);
		sqlRequest.input("InvestmentFromPEProgram", sql.Decimal(18, 2), body.InvestmentFromPEProgram || null);

		// Skills fields
		sqlRequest.input("PrimaryIndustry", sql.NVarChar, body.PrimaryIndustry || null);
		sqlRequest.input("SubField", sql.NVarChar, body.SubField || null);
		sqlRequest.input("Trade", sql.NVarChar, body.Trade || null);
		sqlRequest.input("TrainingInstitution", sql.NVarChar, body.TrainingInstitution || null);
		sqlRequest.input("InstitutionType", sql.VarChar, body.InstitutionType || null);
		sqlRequest.input("InstitutionCertifiedBy", sql.VarChar, body.InstitutionCertifiedBy || null);
		sqlRequest.input("CourseTitle", sql.NVarChar, body.CourseTitle || null);
		sqlRequest.input("CourseDeliveryType", sql.VarChar, body.CourseDeliveryType || null);
		sqlRequest.input("HoursOfInstruction", sql.Int, body.HoursOfInstruction || null);
		sqlRequest.input("DurationWeeks", sql.Int, body.DurationWeeks || null);
		sqlRequest.input("StartDate", sql.Date, body.StartDate || null);
		sqlRequest.input("EndDate", sql.Date, body.EndDate || null);
		sqlRequest.input("CostPerParticipant", sql.Decimal(18, 2), body.CostPerParticipant || null);
		sqlRequest.input("ExpectedStartingSalary", sql.Decimal(18, 2), body.ExpectedStartingSalary || null);

		// Common fields
		sqlRequest.input("FeasibilityPdfPath", sql.NVarChar, body.FeasibilityPdfPath);
		sqlRequest.input("ApprovalStatus", sql.VarChar, body.ApprovalStatus || "Pending");
		sqlRequest.input("ApprovalRemarks", sql.NVarChar, body.ApprovalRemarks || null);
		sqlRequest.input("CreatedBy", sql.VarChar, body.CreatedBy || null);

		if (existingRecord) {
			// Update existing record
			sqlRequest.input("FDP_ID", sql.Int, existingRecord.FDP_ID);
			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
				SET
					[MemberName] = @MemberName,
					[PlanCategory] = @PlanCategory,
					[CurrentBaselineIncome] = @CurrentBaselineIncome,
					[FeasibilityType] = @FeasibilityType,
					[InvestmentRationale] = @InvestmentRationale,
					[MarketBusinessAnalysis] = @MarketBusinessAnalysis,
					[TotalSalesRevenue] = @TotalSalesRevenue,
					[TotalDirectCosts] = @TotalDirectCosts,
					[TotalIndirectCosts] = @TotalIndirectCosts,
					[NetProfitLoss] = @NetProfitLoss,
					[TotalInvestmentRequired] = @TotalInvestmentRequired,
					[InvestmentFromPEProgram] = @InvestmentFromPEProgram,
					[PrimaryIndustry] = @PrimaryIndustry,
					[SubField] = @SubField,
					[Trade] = @Trade,
					[TrainingInstitution] = @TrainingInstitution,
					[InstitutionType] = @InstitutionType,
					[InstitutionCertifiedBy] = @InstitutionCertifiedBy,
					[CourseTitle] = @CourseTitle,
					[CourseDeliveryType] = @CourseDeliveryType,
					[HoursOfInstruction] = @HoursOfInstruction,
					[DurationWeeks] = @DurationWeeks,
					[StartDate] = @StartDate,
					[EndDate] = @EndDate,
					[CostPerParticipant] = @CostPerParticipant,
					[ExpectedStartingSalary] = @ExpectedStartingSalary,
					[FeasibilityPdfPath] = @FeasibilityPdfPath,
					[ApprovalStatus] = @ApprovalStatus,
					[ApprovalRemarks] = @ApprovalRemarks
				WHERE [FDP_ID] = @FDP_ID
			`;
			await sqlRequest.query(updateQuery);
		} else {
			// Insert new record
			const insertQuery = `
				INSERT INTO [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
				(
					[FamilyID], [MemberID], [MemberName], [PlanCategory], [CurrentBaselineIncome],
					[FeasibilityType], [InvestmentRationale], [MarketBusinessAnalysis],
					[TotalSalesRevenue], [TotalDirectCosts], [TotalIndirectCosts], [NetProfitLoss],
					[TotalInvestmentRequired], [InvestmentFromPEProgram],
					[PrimaryIndustry], [SubField], [Trade],
					[TrainingInstitution], [InstitutionType], [InstitutionCertifiedBy],
					[CourseTitle], [CourseDeliveryType], [HoursOfInstruction], [DurationWeeks],
					[StartDate], [EndDate], [CostPerParticipant], [ExpectedStartingSalary],
					[FeasibilityPdfPath], [ApprovalStatus], [ApprovalRemarks], [CreatedBy]
				)
				VALUES
				(
					@FamilyID, @MemberID, @MemberName, @PlanCategory, @CurrentBaselineIncome,
					@FeasibilityType, @InvestmentRationale, @MarketBusinessAnalysis,
					@TotalSalesRevenue, @TotalDirectCosts, @TotalIndirectCosts, @NetProfitLoss,
					@TotalInvestmentRequired, @InvestmentFromPEProgram,
					@PrimaryIndustry, @SubField, @Trade,
					@TrainingInstitution, @InstitutionType, @InstitutionCertifiedBy,
					@CourseTitle, @CourseDeliveryType, @HoursOfInstruction, @DurationWeeks,
					@StartDate, @EndDate, @CostPerParticipant, @ExpectedStartingSalary,
					@FeasibilityPdfPath, @ApprovalStatus, @ApprovalRemarks, @CreatedBy
				)
			`;
			await sqlRequest.query(insertQuery);
		}

		return NextResponse.json({
			success: true,
			message: "Feasibility study saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving feasibility study:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving feasibility study",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const familyID = searchParams.get("familyID");
		const memberID = searchParams.get("memberID");

		if (!familyID || !memberID) {
			return NextResponse.json(
				{ success: false, message: "Family ID and Member ID are required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		sqlRequest.input("FamilyID", sql.NVarChar, familyID);
		sqlRequest.input("MemberID", sql.NVarChar, memberID);

		const query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FamilyID] = @FamilyID AND [MemberID] = @MemberID
			ORDER BY [FDP_ID] DESC
		`;

		const result = await sqlRequest.query(query);

		return NextResponse.json({
			success: true,
			data: result.recordset || [],
		});
	} catch (error: any) {
		console.error("Error fetching feasibility study:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching feasibility study",
			},
			{ status: 500 }
		);
	}
}

