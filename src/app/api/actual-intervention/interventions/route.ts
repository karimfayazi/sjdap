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

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required", records: [] },
				{ status: 400 }
			);
		}

		// Fetch interventions
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);

		const query = `
			SELECT TOP (1000) 
				[InterventionID],
				[FormNumber],
				[Section],
				[InterventionStatus],
				[InterventionCategory],
				[SubCategory],
				[FrameworkDimensions],
				[MainIntervention],
				[InterventionType],
				[FinancialCategory],
				[Frequency],
				[FrequencyUnit],
				[Amount],
				[TotalAmount],
				[InterventionStartDate],
				[InterventionEndDate],
				[Remarks],
				[MemberID],
				[MainTrade],
				[SubTrades],
				[SpecialtyTrade],
				[CNIC],
				[AmountType],
				[ApprovalStatus],
				[CreatedBy],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_Interventions]
			WHERE [FormNumber] = @FormNumber
			ORDER BY [InterventionID] DESC
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		return NextResponse.json({
			success: true,
			records,
		});
	} catch (error) {
		console.error("Error fetching interventions:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching interventions: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}

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

		// Get user's full name
		const { getDb } = await import("@/lib/db");
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.USER_FULL_NAME || userId;

		const body = await request.json().catch(() => ({}));
		const {
			FormNumber,
			Section,
			InterventionStatus,
			InterventionCategory,
			SubCategory,
			FrameworkDimensions,
			MainIntervention,
			InterventionType,
			FinancialCategory,
			Frequency,
			FrequencyUnit,
			Amount,
			TotalAmount,
			InterventionStartDate,
			InterventionEndDate,
			Remarks,
			MemberID,
			MainTrade,
			SubTrades,
			SpecialtyTrade,
			CNIC,
			AmountType,
			ApprovalStatus,
		} = body;

		if (!FormNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, FormNumber);
		sqlRequest.input("Section", sql.NVarChar, Section || null);
		sqlRequest.input("InterventionStatus", sql.NVarChar, InterventionStatus || null);
		sqlRequest.input("InterventionCategory", sql.NVarChar, InterventionCategory || null);
		sqlRequest.input("SubCategory", sql.NVarChar, SubCategory || null);
		sqlRequest.input("FrameworkDimensions", sql.NVarChar, FrameworkDimensions || null);
		sqlRequest.input("MainIntervention", sql.NVarChar, MainIntervention || null);
		sqlRequest.input("InterventionType", sql.NVarChar, InterventionType || null);
		sqlRequest.input("FinancialCategory", sql.NVarChar, FinancialCategory || null);
		sqlRequest.input("Frequency", sql.Int, Frequency || null);
		sqlRequest.input("FrequencyUnit", sql.NVarChar, FrequencyUnit || null);
		sqlRequest.input("Amount", sql.Decimal(18, 2), Amount || null);
		sqlRequest.input("TotalAmount", sql.Decimal(18, 2), TotalAmount || null);
		sqlRequest.input("InterventionStartDate", sql.DateTime, InterventionStartDate || null);
		sqlRequest.input("InterventionEndDate", sql.DateTime, InterventionEndDate || null);
		sqlRequest.input("Remarks", sql.NVarChar, Remarks || null);
		sqlRequest.input("MemberID", sql.VarChar, MemberID || null);
		sqlRequest.input("MainTrade", sql.NVarChar, MainTrade || null);
		sqlRequest.input("SubTrades", sql.NVarChar, SubTrades || null);
		sqlRequest.input("SpecialtyTrade", sql.NVarChar, SpecialtyTrade || null);
		sqlRequest.input("CNIC", sql.VarChar, CNIC || null);
		sqlRequest.input("AmountType", sql.NVarChar, AmountType || null);
		sqlRequest.input("ApprovalStatus", sql.NVarChar, ApprovalStatus || null);
		sqlRequest.input("CreatedBy", sql.NVarChar, userFullName);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_Interventions]
			([FormNumber], [Section], [InterventionStatus], [InterventionCategory], [SubCategory],
			 [FrameworkDimensions], [MainIntervention], [InterventionType], [FinancialCategory],
			 [Frequency], [FrequencyUnit], [Amount], [TotalAmount], [InterventionStartDate],
			 [InterventionEndDate], [Remarks], [MemberID], [MainTrade], [SubTrades], [SpecialtyTrade],
			 [CNIC], [AmountType], [ApprovalStatus], [CreatedBy], [CreatedAt])
			VALUES
			(@FormNumber, @Section, @InterventionStatus, @InterventionCategory, @SubCategory,
			 @FrameworkDimensions, @MainIntervention, @InterventionType, @FinancialCategory,
			 @Frequency, @FrequencyUnit, @Amount, @TotalAmount, @InterventionStartDate,
			 @InterventionEndDate, @Remarks, @MemberID, @MainTrade, @SubTrades, @SpecialtyTrade,
			 @CNIC, @AmountType, @ApprovalStatus, @CreatedBy, GETDATE())
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Intervention created successfully",
		});
	} catch (error) {
		console.error("Error creating intervention:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error creating intervention: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
