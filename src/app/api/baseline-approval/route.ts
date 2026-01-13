import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

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

		const body = await request.json().catch(() => ({}));
		const { formNumber, approvalStatus, remarks } = body || {};

		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required.",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);
		sqlRequest.input("ApprovalStatus", sql.VarChar, approvalStatus || null);

		// Update ApprovalStatus in PE_Application_BasicInfo
		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			SET 
				[ApprovalStatus] = ISNULL(@ApprovalStatus, [ApprovalStatus])
			WHERE [FormNumber] = @FormNumber
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
			logRequest.input("ModuleName", sql.NVarChar, "Baseline");
			logRequest.input("RecordID", sql.VarChar, formNumber); // Using FormNumber as RecordID for Baseline
			logRequest.input("ActionLevel", sql.VarChar, approvalStatus || null);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, approvalStatus === "Approved" ? "Approval" : approvalStatus === "Rejected" ? "Rejection" : "Update");
			logRequest.input("Remarks", sql.NVarChar, remarks || null);

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
