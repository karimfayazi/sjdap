import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// Helper function to get user full name
async function getUserFullName(userId: string): Promise<string> {
	try {
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		return user?.UserFullName || userId;
	} catch (error) {
		console.error("Error fetching user full name:", error);
		return userId;
	}
}

export async function PATCH(request: NextRequest) {
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
		const { formNumber, approvalStatus, remarks } = body || {};

		// Validate required fields
		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required.",
				},
				{ status: 400 }
			);
		}

		// Validate approvalStatus - must be ONLY 'Approved' or 'Rejected'
		if (!approvalStatus || (approvalStatus !== "Approved" && approvalStatus !== "Rejected")) {
			return NextResponse.json(
				{
					success: false,
					message: "Approval status must be either 'Approved' or 'Rejected'.",
				},
				{ status: 400 }
			);
		}

		// Get user's full name for ActionBy
		const userFullName = await getUserFullName(userId);

		const pool = await getPeDb();
		const transaction = new sql.Transaction(pool);

		try {
			await transaction.begin();

			// 1) Validate existing row and check if status is Pending
			const checkRequest = new sql.Request(transaction);
			checkRequest.input("FormNumber", sql.VarChar, formNumber);
			
			const checkQuery = `
				SELECT TOP 1 [FormNumber], [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
				WHERE [FormNumber] = @FormNumber
			`;

			const checkResult = await checkRequest.query(checkQuery);

			if (checkResult.recordset.length === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{
						success: false,
						message: "Application not found.",
					},
					{ status: 404 }
				);
			}

			const currentStatus = checkResult.recordset[0].ApprovalStatus;
			const currentStatusLower = (currentStatus || "").trim().toLowerCase();
			const isPending = !currentStatus || currentStatusLower === "pending" || currentStatusLower === "";

			// Only allow update if current status is Pending
			if (!isPending) {
				await transaction.rollback();
				return NextResponse.json(
					{
						success: false,
						message: "Already processed. Only applications with 'Pending' status can be updated.",
					},
					{ status: 409 }
				);
			}

			// 2) Update ApprovalStatus in PE_Application_BasicInfo (only if Pending)
			const updateRequest = new sql.Request(transaction);
			updateRequest.input("FormNumber", sql.VarChar, formNumber);
			updateRequest.input("ApprovalStatus", sql.VarChar, approvalStatus);

			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_Application_BasicInfo]
				SET [ApprovalStatus] = @ApprovalStatus
				WHERE [FormNumber] = @FormNumber 
					AND ([ApprovalStatus] IS NULL OR LTRIM(RTRIM([ApprovalStatus])) = '' OR LTRIM(RTRIM([ApprovalStatus])) = 'Pending')
			`;

			const updateResult = await updateRequest.query(updateQuery);

			if (updateResult.rowsAffected[0] === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{
						success: false,
						message: "Failed to update approval status. Record may have been modified.",
					},
					{ status: 409 }
				);
			}

			// 3) Insert into Approval_Log
			const logRequest = new sql.Request(transaction);
			logRequest.input("ModuleName", sql.NVarChar, "Baseline");
			logRequest.input("RecordID", sql.VarChar, formNumber); // Using FormNumber as RecordID for Baseline
			logRequest.input("ActionLevel", sql.VarChar, approvalStatus);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, "Approval");
			logRequest.input("Remarks", sql.NVarChar, remarks && remarks.trim() ? remarks.trim() : null);
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
				message: "Approval status updated successfully.",
			});
		} catch (transactionError) {
			// Rollback transaction on error
			try {
				await transaction.rollback();
			} catch (rollbackError) {
				console.error("Error during transaction rollback:", rollbackError);
			}
			throw transactionError;
		}
	} catch (error) {
		console.error("Error updating approval status:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				success: false,
				message: "Error updating approval status: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

// Keep PUT for backward compatibility (but use same logic as PATCH)
export async function PUT(request: NextRequest) {
	return PATCH(request);
}
