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

		// Get user's full name and user type for ActionBy and permission check
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName], [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.UserFullName || userId;
		const userType = user?.UserType || null;
		
		// Normalize user type for comparison
		const normalizeUserType = (type: string | null | undefined): string => {
			if (!type) return "";
			return String(type).trim().toLowerCase();
		};
		
		const normalizedUserType = normalizeUserType(userType);
		const isEditor = normalizedUserType === "editor";
		const isRegionalAM = normalizedUserType === "regional am";

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

		// Validation: If Rejected, remarks are required
		if (approvalStatus === "Rejected" && (!approvalRemarks || approvalRemarks.trim() === "")) {
			return NextResponse.json(
				{
					success: false,
					message: "Approval Remarks are required when status is Rejected.",
				},
				{ status: 400 }
			);
		}

		// Normalize approval status to consistent format
		// Use "Accepted" and "Rejected" as the standard values
		const normalizedStatus = approvalStatus === "Accepted" ? "Accepted" : "Rejected";
		const actionType = normalizedStatus === "Accepted" ? "ACCEPTED" : "REJECTED";

		const pool = await getPeDb();
		
		// Fetch current approval status from database (needed for both Editor and Regional AM checks)
		const checkRequest = pool.request();
		checkRequest.input("formNumber", sql.VarChar, formNumber);
		
		const checkQuery = `
			SELECT TOP 1 [ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FormNumber] = @formNumber
				AND [IsActive] = 1
			ORDER BY [FDP_EconomicID] ASC
		`;
		
		const checkResult = await checkRequest.query(checkQuery);
		const currentStatus = checkResult.recordset?.[0]?.ApprovalStatus || null;
		
		// Normalize approval status for comparison
		const normalizeApprovalStatus = (status: string | null | undefined): string => {
			if (!status) return "";
			return String(status).trim().toLowerCase();
		};
		
		const normalizedCurrentStatus = normalizeApprovalStatus(currentStatus);
		const isCurrentlyApproved = normalizedCurrentStatus === "approved" || normalizedCurrentStatus === "accepted";
		const isFinalized = isCurrentlyApproved; // FDP is finalized if status is Approved/Accepted
		
		// Server-side validation: Editor users cannot modify approval status at all
		if (isEditor) {
			// Reject if Editor tries to modify approval status (regardless of current status)
			// If approved, show specific message; otherwise show general restriction
			if (isCurrentlyApproved) {
				return NextResponse.json(
					{
						success: false,
						message: "Approved record cannot be modified by Editor",
					},
					{ status: 403 }
				);
			} else {
				// Editor cannot modify any approval status (including Pending)
				return NextResponse.json(
					{
						success: false,
						message: "Editor users cannot modify approval status",
					},
					{ status: 403 }
				);
			}
		}
		
		// Server-side validation: Regional AM cannot modify finalized (approved) records
		if (isRegionalAM && isFinalized) {
			return NextResponse.json(
				{
					success: false,
					message: "This FDP has already been approved and cannot be modified.",
				},
				{ status: 403 }
			);
		}
		
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
