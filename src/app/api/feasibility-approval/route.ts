import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", records: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", records: [] },
				{ status: 401 }
			);
		}

		// Fetch feasibility data with joins
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		const query = `
			SELECT 
				f.[FDP_ID],
				f.[FamilyID],
				f.[MemberID],
				f.[MemberName],
				f.[PlanCategory],
				f.[CurrentBaselineIncome],
				f.[FeasibilityType],
				f.[InvestmentRationale],
				f.[MarketBusinessAnalysis],
				f.[TotalSalesRevenue],
				f.[TotalDirectCosts],
				f.[DirectCostPercentage],
				f.[TotalIndirectCosts],
				f.[TotalCosts],
				f.[MonthlyProfitLoss],
				f.[NetProfitLoss],
				f.[TotalInvestmentRequired],
				f.[InvestmentFromPEProgram],
				f.[PrimaryIndustry],
				f.[SubField],
				f.[Trade],
				f.[TrainingInstitution],
				f.[InstitutionType],
				f.[InstitutionCertifiedBy],
				f.[CourseTitle],
				f.[CourseDeliveryType],
				f.[HoursOfInstruction],
				f.[DurationWeeks],
				f.[StartDate],
				f.[EndDate],
				f.[CostPerParticipant],
				f.[ExpectedStartingSalary],
				f.[FeasibilityPdfPath],
				f.[ApprovalStatus],
				f.[ApprovalRemarks],
				f.[SystemDate],
				f.[CreatedBy],
				-- Family Member Info
				m.[MemberNo],
				m.[FormNo] AS MemberFormNo,
				m.[FullName] AS MemberFullName,
				m.[BFormOrCNIC] AS MemberBFormOrCNIC,
				m.[Gender] AS MemberGender,
				-- Application Basic Info
				b.[FormNumber],
				b.[Full_Name] AS ApplicationFullName,
				b.[CNICNumber],
				b.[RegionalCommunity],
				b.[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility] f
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m 
				ON f.[MemberID] = m.[MemberNo] AND f.[FamilyID] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b 
				ON f.[FamilyID] = b.[FormNumber]
			ORDER BY f.[FDP_ID] DESC
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching feasibility approval data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching feasibility approval data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
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

		const body = await request.json().catch(() => ({}));
		const { fdpId, approvalStatus, approvalRemarks } = body || {};

		if (!fdpId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP_ID is required.",
				},
				{ status: 400 }
			);
		}

		// Get user's full name for ActionBy
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.USER_FULL_NAME || userId;

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FDP_ID", sql.Int, fdpId);
		sqlRequest.input("ApprovalStatus", sql.VarChar, approvalStatus || null);
		sqlRequest.input("ApprovalRemarks", sql.NVarChar, approvalRemarks || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			SET 
				[ApprovalStatus] = ISNULL(@ApprovalStatus, [ApprovalStatus]),
				[ApprovalRemarks] = @ApprovalRemarks
			WHERE [FDP_ID] = @FDP_ID
		`;

		const result = await sqlRequest.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Record not found or not updateable.",
				},
				{ status: 404 }
			);
		}

		// Insert into Approval_Log
		try {
			const logRequest = pool.request();
			logRequest.input("ModuleName", sql.NVarChar, "Feasibility Plan");
			logRequest.input("RecordID", sql.Int, fdpId);
			logRequest.input("ActionLevel", sql.VarChar, approvalStatus || null);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, "Approval");
			logRequest.input("Remarks", sql.NVarChar, approvalRemarks || null);

			const insertLogQuery = `
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks)
			`;

			await logRequest.query(insertLogQuery);
		} catch (logError) {
			// Log error but don't fail the main operation
			console.error("Error inserting into Approval_Log:", logError);
		}

		return NextResponse.json({
			success: true,
			message: "Approval status updated successfully.",
		});
	} catch (error) {
		console.error("Error updating feasibility approval status:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				success: false,
				message: "Error updating feasibility approval status: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
