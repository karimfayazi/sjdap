import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		// Auth
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

		// Get user's full name (username) for CreatedBy
		const { getDb } = await import("@/lib/db");
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.UserFullName || userId;

		const body = await request.json();

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Check if record already exists
		const checkRequest = pool.request();
		checkRequest.input("FormNumber", sql.NVarChar, body.FormNumber);
		checkRequest.input("MemberID", sql.NVarChar, body.MemberID);
		const checkQuery = `
			SELECT TOP 1 [FDP_ID]
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FormNumber] = @FormNumber AND [MemberID] = @MemberID
			ORDER BY [FDP_ID] DESC
		`;
		const checkResult = await checkRequest.query(checkQuery);
		const existingRecord = checkResult.recordset[0];

		// Set all input parameters
		sqlRequest.input("FormNumber", sql.NVarChar, body.FormNumber);
		sqlRequest.input("MemberID", sql.NVarChar, body.MemberID);
		sqlRequest.input("MemberName", sql.NVarChar, body.MemberName || null);
		sqlRequest.input("PlanCategory", sql.VarChar, body.PlanCategory);
		// Note: CurrentBaselineIncome column has been removed from the database

		// Economic fields
		// FeasibilityType: Convert empty string to null
		const feasibilityType = body.FeasibilityType && body.FeasibilityType.trim() !== "" 
			? body.FeasibilityType.trim() 
			: null;
		sqlRequest.input("FeasibilityType", sql.VarChar, feasibilityType);
		sqlRequest.input("InvestmentRationale", sql.NVarChar, body.InvestmentRationale || null);
		sqlRequest.input("MarketBusinessAnalysis", sql.NVarChar, body.MarketBusinessAnalysis || null);
		sqlRequest.input("TotalSalesRevenue", sql.Decimal(18, 2), body.TotalSalesRevenue || null);
		sqlRequest.input("TotalDirectCosts", sql.Decimal(18, 2), body.TotalDirectCosts || null);
		sqlRequest.input("TotalIndirectCosts", sql.Decimal(18, 2), body.TotalIndirectCosts || null);
		sqlRequest.input("NetProfitLoss", sql.Decimal(18, 2), body.NetProfitLoss || null);
		sqlRequest.input("TotalInvestmentRequired", sql.Decimal(18, 2), body.TotalInvestmentRequired || null);
		sqlRequest.input("InvestmentFromPEProgram", sql.Decimal(18, 2), body.InvestmentFromPEProgram || null);

		// Skills fields
		// Map MainTrade from frontend to Trade column in database
		// If PlanCategory is ECONOMIC, Trade should be NULL
		// If PlanCategory is SKILLS, Trade should have the value from MainTrade
		const tradeValue = body.PlanCategory === "ECONOMIC" ? null : (body.MainTrade || null);
		sqlRequest.input("Trade", sql.NVarChar, tradeValue);
		// Map SubTrade from frontend to SubField column in database
		// If PlanCategory is ECONOMIC, SubField should be NULL
		const subFieldValue = body.PlanCategory === "ECONOMIC" ? null : (body.SubTrade || null);
		sqlRequest.input("SubField", sql.NVarChar, subFieldValue);
		// Note: SkillsdevelopmentInstitution column does not exist in the database table
		sqlRequest.input("TrainingInstitution", sql.NVarChar, body.TrainingInstitution || null);
		// InstitutionType: Convert empty string to null to satisfy potential CHECK constraint
		const institutionType = body.InstitutionType && body.InstitutionType.trim() !== "" 
			? body.InstitutionType.trim() 
			: null;
		sqlRequest.input("InstitutionType", sql.VarChar, institutionType);
		// InstitutionCertifiedBy: Convert empty string to null
		const institutionCertifiedBy = body.InstitutionCertifiedBy && body.InstitutionCertifiedBy.trim() !== "" 
			? body.InstitutionCertifiedBy.trim() 
			: null;
		sqlRequest.input("InstitutionCertifiedBy", sql.VarChar, institutionCertifiedBy);
		sqlRequest.input("CourseTitle", sql.NVarChar, body.CourseTitle || null);
		// CourseDeliveryType: 
		// - For ECONOMIC category, always set to NULL
		// - For SKILLS category, validate and use the value, or NULL if empty/invalid
		// - Convert empty string to null to satisfy CHECK constraint
		let courseDeliveryType = null;
		if (body.PlanCategory === "SKILLS") {
			const allowedValues = ["In-Person", "Online", "Hybrid"];
			const trimmedValue = body.CourseDeliveryType ? String(body.CourseDeliveryType).trim() : "";
			if (trimmedValue && allowedValues.includes(trimmedValue)) {
				courseDeliveryType = trimmedValue;
			} else {
				// If SKILLS but invalid/empty, return error
				return NextResponse.json(
					{
						success: false,
						message: "Course Delivery Type is required for Skills Development and must be one of: In-Person, Online, or Hybrid",
					},
					{ status: 400 }
				);
			}
		}
		// For ECONOMIC category, courseDeliveryType remains null
		sqlRequest.input("CourseDeliveryType", sql.VarChar, courseDeliveryType);
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
		sqlRequest.input("CreatedBy", sql.VarChar, userFullName);

		if (existingRecord) {
			// Update existing record
			sqlRequest.input("FDP_ID", sql.Int, existingRecord.FDP_ID);
			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
				SET
					[MemberName] = @MemberName,
					[PlanCategory] = @PlanCategory,
					[FeasibilityType] = @FeasibilityType,
					[InvestmentRationale] = @InvestmentRationale,
					[MarketBusinessAnalysis] = @MarketBusinessAnalysis,
					[TotalSalesRevenue] = @TotalSalesRevenue,
					[TotalDirectCosts] = @TotalDirectCosts,
					[TotalIndirectCosts] = @TotalIndirectCosts,
					[NetProfitLoss] = @NetProfitLoss,
					[TotalInvestmentRequired] = @TotalInvestmentRequired,
					[InvestmentFromPEProgram] = @InvestmentFromPEProgram,
					[Trade] = @Trade,
					[SubField] = @SubField,
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
					[FormNumber], [MemberID], [MemberName], [PlanCategory],
					[FeasibilityType], [InvestmentRationale], [MarketBusinessAnalysis],
					[TotalSalesRevenue], [TotalDirectCosts], [TotalIndirectCosts], [NetProfitLoss],
					[TotalInvestmentRequired], [InvestmentFromPEProgram],
					[Trade], [SubField],
					[TrainingInstitution], [InstitutionType], [InstitutionCertifiedBy],
					[CourseTitle], [CourseDeliveryType], [HoursOfInstruction], [DurationWeeks],
					[StartDate], [EndDate], [CostPerParticipant], [ExpectedStartingSalary],
					[FeasibilityPdfPath], [ApprovalStatus], [ApprovalRemarks], [CreatedBy]
				)
				VALUES
				(
					@FormNumber, @MemberID, @MemberName, @PlanCategory,
					@FeasibilityType, @InvestmentRationale, @MarketBusinessAnalysis,
					@TotalSalesRevenue, @TotalDirectCosts, @TotalIndirectCosts, @NetProfitLoss,
					@TotalInvestmentRequired, @InvestmentFromPEProgram,
					@Trade, @SubField,
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
		sqlRequest.input("FormNumber", sql.NVarChar, familyID);
		sqlRequest.input("MemberID", sql.NVarChar, memberID);

		const query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FormNumber] = @FormNumber AND [MemberID] = @MemberID
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

