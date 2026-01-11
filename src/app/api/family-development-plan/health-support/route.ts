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

		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Input parameters
		sqlRequest.input("FormNumber", sql.VarChar, body.FormNumber);
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HealthMonthlyTotalCost", sql.Decimal(18, 2), body.HealthMonthlyTotalCost || null);
		sqlRequest.input("HealthMonthlyFamilyContribution", sql.Decimal(18, 2), body.HealthMonthlyFamilyContribution || null);
		sqlRequest.input("HealthMonthlyPEContribution", sql.Decimal(18, 2), body.HealthMonthlyPEContribution || null);
		sqlRequest.input("HealthNumberOfMonths", sql.Int, body.HealthNumberOfMonths || null);
		sqlRequest.input("HealthTotalCost", sql.Decimal(18, 2), body.HealthTotalCost || null);
		sqlRequest.input("HealthTotalFamilyContribution", sql.Decimal(18, 2), body.HealthTotalFamilyContribution || null);
		sqlRequest.input("HealthTotalPEContribution", sql.Decimal(18, 2), body.HealthTotalPEContribution || null);
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID || null);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || null);
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || null);
		sqlRequest.input("BeneficiaryGender", sql.VarChar, body.BeneficiaryGender || null);
		sqlRequest.input("ApprovalStatus", sql.VarChar, body.ApprovalStatus || "Pending");
		sqlRequest.input("CreatedBy", sql.VarChar, userFullName);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
			(
				[FormNumber], [HeadName], [AreaType],
				[HealthMonthlyTotalCost], [HealthMonthlyFamilyContribution], [HealthMonthlyPEContribution],
				[HealthNumberOfMonths],
				[HealthTotalCost], [HealthTotalFamilyContribution], [HealthTotalPEContribution],
				[BeneficiaryID], [BeneficiaryName], [BeneficiaryAge], [BeneficiaryGender],
				[ApprovalStatus], [CreatedBy], [CreatedAt], [IsActive]
			)
			VALUES
			(
				@FormNumber, @HeadName, @AreaType,
				@HealthMonthlyTotalCost, @HealthMonthlyFamilyContribution, @HealthMonthlyPEContribution,
				@HealthNumberOfMonths,
				@HealthTotalCost, @HealthTotalFamilyContribution, @HealthTotalPEContribution,
				@BeneficiaryID, @BeneficiaryName, @BeneficiaryAge, @BeneficiaryGender,
				@ApprovalStatus, @CreatedBy, GETDATE(), 1
			)
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Health Support data saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving Health Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving Health Support data",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
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

		const { searchParams } = new URL(request.url);
		const fdpHealthSupportId = searchParams.get("fdpHealthSupportId");
		const familyID = searchParams.get("familyID");

		if (!fdpHealthSupportId && !familyID) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Health Support ID or Family ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		let query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
			WHERE [IsActive] = 1
		`;

		if (fdpHealthSupportId) {
			sqlRequest.input("FDP_HealthSupportID", sql.Int, parseInt(fdpHealthSupportId));
			query += ` AND [FDP_HealthSupportID] = @FDP_HealthSupportID`;
		} else if (familyID) {
			sqlRequest.input("FamilyID", sql.VarChar, familyID);
			query += ` AND [FormNumber] = @FamilyID`;
			query += ` ORDER BY [FDP_HealthSupportID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// If fdpHealthSupportId is provided, return single record; otherwise return all records
		if (fdpHealthSupportId) {
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
		console.error("Error fetching Health Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching Health Support data",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
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

		const { searchParams } = new URL(request.url);
		const fdpHealthSupportId = searchParams.get("fdpHealthSupportId");

		if (!fdpHealthSupportId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Health Support ID is required for update",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		sqlRequest.input("FDP_HealthSupportID", sql.Int, parseInt(fdpHealthSupportId));
		sqlRequest.input("HeadName", sql.NVarChar, body.HeadName || null);
		sqlRequest.input("AreaType", sql.VarChar, body.AreaType || null);
		sqlRequest.input("HealthMonthlyTotalCost", sql.Decimal(18, 2), body.HealthMonthlyTotalCost || null);
		sqlRequest.input("HealthMonthlyFamilyContribution", sql.Decimal(18, 2), body.HealthMonthlyFamilyContribution || null);
		sqlRequest.input("HealthMonthlyPEContribution", sql.Decimal(18, 2), body.HealthMonthlyPEContribution || null);
		sqlRequest.input("HealthNumberOfMonths", sql.Int, body.HealthNumberOfMonths || null);
		sqlRequest.input("HealthTotalCost", sql.Decimal(18, 2), body.HealthTotalCost || null);
		sqlRequest.input("HealthTotalFamilyContribution", sql.Decimal(18, 2), body.HealthTotalFamilyContribution || null);
		sqlRequest.input("HealthTotalPEContribution", sql.Decimal(18, 2), body.HealthTotalPEContribution || null);
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID || null);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || null);
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || null);
		sqlRequest.input("BeneficiaryGender", sql.VarChar, body.BeneficiaryGender || null);
		sqlRequest.input("ApprovalStatus", sql.VarChar, body.ApprovalStatus || null);
		sqlRequest.input("UpdatedBy", sql.VarChar, userFullName);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
			SET
				[HeadName] = @HeadName,
				[AreaType] = @AreaType,
				[HealthMonthlyTotalCost] = @HealthMonthlyTotalCost,
				[HealthMonthlyFamilyContribution] = @HealthMonthlyFamilyContribution,
				[HealthMonthlyPEContribution] = @HealthMonthlyPEContribution,
				[HealthNumberOfMonths] = @HealthNumberOfMonths,
				[HealthTotalCost] = @HealthTotalCost,
				[HealthTotalFamilyContribution] = @HealthTotalFamilyContribution,
				[HealthTotalPEContribution] = @HealthTotalPEContribution,
				[BeneficiaryID] = @BeneficiaryID,
				[BeneficiaryName] = @BeneficiaryName,
				[BeneficiaryAge] = @BeneficiaryAge,
				[BeneficiaryGender] = @BeneficiaryGender,
				[ApprovalStatus] = @ApprovalStatus,
				[UpdatedBy] = @UpdatedBy,
				[UpdatedAt] = GETDATE()
			WHERE [FDP_HealthSupportID] = @FDP_HealthSupportID
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Health Support data updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating Health Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating Health Support data",
			},
			{ status: 500 }
		);
	}
}
