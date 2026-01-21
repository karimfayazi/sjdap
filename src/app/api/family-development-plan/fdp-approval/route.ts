import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
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

		// Get user's full name for ActionBy
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

		const body = await request.json().catch(() => ({}));
		const { formNumber, approvalStatus, approvalRemarks } = body || {};

		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required.",
				},
				{ status: 400 }
			);
		}

		if (!approvalStatus || (approvalStatus !== "Accepted" && approvalStatus !== "Rejected")) {
			return NextResponse.json(
				{
					success: false,
					message: "Approval Status must be 'Accepted' or 'Rejected'.",
				},
				{ status: 400 }
			);
		}

		// Normalize approval status to consistent format
		// Use "Accepted" and "Rejected" as the standard values
		const normalizedStatus = approvalStatus === "Accepted" ? "Accepted" : "Rejected";
		const actionType = normalizedStatus === "Accepted" ? "ACCEPTED" : "REJECTED";

		const pool = await getPeDb();
		
		// Start transaction
		const transaction = new sql.Transaction(pool);
		await transaction.begin();

		try {
			// Update all FDP tables by FormNumber
			// 1. PE_FDP_EconomicDevelopment
			const economicRequest = new sql.Request(transaction);
			economicRequest.input("formNumber", sql.VarChar, formNumber);
			economicRequest.input("approvalStatus", sql.VarChar, normalizedStatus);
			economicRequest.input("approvalRemarks", sql.NVarChar, approvalRemarks || null);
			
			const economicUpdateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				SET 
					[ApprovalStatus] = @approvalStatus,
					[ApprovalDate] = GETDATE(),
					[ApprovalRemarks] = @approvalRemarks
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			await economicRequest.query(economicUpdateQuery);

			// 2. PE_FDP_FoodSupport
			const foodRequest = new sql.Request(transaction);
			foodRequest.input("formNumber", sql.VarChar, formNumber);
			foodRequest.input("approvalStatus", sql.VarChar, normalizedStatus);
			
			const foodUpdateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				SET 
					[ApprovalStatus] = @approvalStatus
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			await foodRequest.query(foodUpdateQuery);

			// 3. PE_FDP_HabitatSupport
			const habitatRequest = new sql.Request(transaction);
			habitatRequest.input("formNumber", sql.VarChar, formNumber);
			habitatRequest.input("approvalStatus", sql.VarChar, normalizedStatus);
			
			const habitatUpdateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				SET 
					[ApprovalStatus] = @approvalStatus
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			await habitatRequest.query(habitatUpdateQuery);

			// 4. PE_FDP_HealthSupport
			const healthRequest = new sql.Request(transaction);
			healthRequest.input("formNumber", sql.VarChar, formNumber);
			healthRequest.input("approvalStatus", sql.VarChar, normalizedStatus);
			
			const healthUpdateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				SET 
					[ApprovalStatus] = @approvalStatus
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			await healthRequest.query(healthUpdateQuery);

			// 5. PE_FDP_SocialEducation
			const educationRequest = new sql.Request(transaction);
			educationRequest.input("formNumber", sql.VarChar, formNumber);
			educationRequest.input("approvalStatus", sql.VarChar, normalizedStatus);
			
			const educationUpdateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				SET 
					[ApprovalStatus] = @approvalStatus
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			await educationRequest.query(educationUpdateQuery);

			// Get a RecordID from EconomicDevelopment for Approval_Log (use first active record)
			const recordIdRequest = new sql.Request(transaction);
			recordIdRequest.input("formNumber", sql.VarChar, formNumber);
			const recordIdQuery = `
				SELECT TOP 1 [FDP_EconomicID] as RecordID
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
				ORDER BY [FDP_EconomicID] ASC
			`;
			const recordIdResult = await recordIdRequest.query(recordIdQuery);
			const recordId = recordIdResult.recordset?.[0]?.RecordID || formNumber;

			// Insert into Approval_Log
			const logRequest = new sql.Request(transaction);
			logRequest.input("ModuleName", sql.NVarChar, "FDP");
			logRequest.input("RecordID", sql.VarChar, recordId.toString());
			logRequest.input("ActionLevel", sql.VarChar, "CRC");
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, actionType);
			logRequest.input("Remarks", sql.NVarChar, approvalRemarks || null);
			logRequest.input("FormNumber", sql.VarChar, formNumber);

			const insertLogQuery = `
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks], [FormNumber])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks, @FormNumber)
			`;

			await logRequest.query(insertLogQuery);

			// Commit transaction
			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Approval information saved successfully.",
			});
		} catch (error) {
			// Rollback transaction on error
			await transaction.rollback();
			throw error;
		}
	} catch (error) {
		console.error("Error saving FDP approval:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				success: false,
				message: "Error saving approval information: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
