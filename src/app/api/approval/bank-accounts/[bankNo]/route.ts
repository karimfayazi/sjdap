import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// GET /api/approval/bank-accounts/[bankNo] - Get bank account details
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ bankNo: string }> | { bankNo: string } }
) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie?.value) {
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

		// Handle params - in Next.js 15+, params might be a Promise
		const resolvedParams = params instanceof Promise ? await params : params;
		const bankNo = resolvedParams.bankNo;

		if (!bankNo) {
			return NextResponse.json(
				{ success: false, message: "Bank Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Fetch bank information
		sqlRequest.input("bankNo", sql.Int, parseInt(bankNo));
		const bankResult = await sqlRequest.query(`
			SELECT 
				b.[BankNo],
				b.[FormNumber],
				b.[BeneficiaryID],
				b.[BankName],
				b.[AccountTitle],
				b.[AccountNo],
				b.[CNIC],
				b.[BankCode],
				b.[SubmittedAt],
				b.[SubmittedBy],
				b.[ApprovalStatus],
				b.[Remarks],
				b.[BankChequeImagePath]
			FROM [SJDA_Users].[dbo].[PE_BankInformation] b
			WHERE b.[BankNo] = @bankNo
		`);

		if (bankResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Bank account not found" },
				{ status: 404 }
			);
		}

		const bankInfo = bankResult.recordset[0];

		// Fetch basic info
		const basicInfoRequest = pool.request();
		basicInfoRequest.input("formNumber", bankInfo.FormNumber);
		const basicInfoResult = await basicInfoRequest.query(`
			SELECT 
				[FormNumber],
				[Full_Name],
				[CNICNumber],
				[MotherTongue],
				[RegionalCommunity],
				[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`);

		const basicInfo = basicInfoResult.recordset[0] || null;

		// Fetch approval logs
		const logRequest = pool.request();
		logRequest.input("recordId", sql.Int, parseInt(bankNo));
		logRequest.input("moduleName", "Bank Account");
		const logResult = await logRequest.query(`
			SELECT 
				[LogID],
				[ModuleName],
				[RecordID],
				[ActionLevel],
				[ActionBy],
				[ActionAt],
				[ActionType],
				[Remarks],
				[FormNumber]
			FROM [SJDA_Users].[dbo].[Approval_Log]
			WHERE [RecordID] = @recordId 
				AND [ModuleName] = @moduleName
			ORDER BY [ActionAt] DESC
		`);

		return NextResponse.json({
			success: true,
			bankInformation: bankInfo,
			basicInfo: basicInfo,
			approvalLogs: logResult.recordset || []
		});
	} catch (error: any) {
		console.error("[approval/bank-accounts/[bankNo]] GET Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error fetching bank account details" },
			{ status: 500 }
		);
	}
}

// PUT /api/approval/bank-accounts/[bankNo] - Update approval status
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ bankNo: string }> | { bankNo: string } }
) {
	try {
		// Auth check
		const authCookie = request.cookies.get("auth");
		if (!authCookie?.value) {
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

		// Handle params
		const resolvedParams = params instanceof Promise ? await params : params;
		const bankNo = resolvedParams.bankNo;

		if (!bankNo) {
			return NextResponse.json(
				{ success: false, message: "Bank Number is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { approvalStatus, remarks } = body;

		// Validation
		if (!approvalStatus || (approvalStatus !== "APPROVED" && approvalStatus !== "REJECTED")) {
			return NextResponse.json(
				{ success: false, message: "ApprovalStatus must be 'APPROVED' or 'REJECTED'" },
				{ status: 400 }
			);
		}

		const pool = await getDb();

		// Start transaction
		const transaction = new sql.Transaction(pool);
		await transaction.begin();

		try {
			// Get FormNumber from bank record
			const getFormRequest = new sql.Request(transaction);
			getFormRequest.input("bankNo", sql.Int, parseInt(bankNo));
			const formResult = await getFormRequest.query(`
				SELECT [FormNumber], [ApprovalStatus] as CurrentStatus
				FROM [SJDA_Users].[dbo].[PE_BankInformation]
				WHERE [BankNo] = @bankNo
			`);

			if (formResult.recordset.length === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "Bank account not found" },
					{ status: 404 }
				);
			}

			const formNumber = formResult.recordset[0].FormNumber;

			// Update PE_BankInformation
			const updateRequest = new sql.Request(transaction);
			updateRequest.input("bankNo", sql.Int, parseInt(bankNo));
			updateRequest.input("approvalStatus", approvalStatus);
			updateRequest.input("remarks", remarks || null);

			await updateRequest.query(`
				UPDATE [SJDA_Users].[dbo].[PE_BankInformation]
				SET 
					[ApprovalStatus] = @approvalStatus,
					[Remarks] = @remarks
				WHERE [BankNo] = @bankNo
			`);

			// Insert into Approval_Log
			const logRequest = new sql.Request(transaction);
			logRequest.input("ModuleName", sql.NVarChar, "Bank Account");
			logRequest.input("RecordID", sql.Int, parseInt(bankNo));
			logRequest.input("ActionLevel", sql.VarChar, "Finance"); // Using Finance as ActionLevel for bank approvals
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, approvalStatus);
			logRequest.input("Remarks", sql.NVarChar, remarks || null);
			logRequest.input("FormNumber", sql.VarChar, formNumber);

			await logRequest.query(`
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks], [FormNumber])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks, @FormNumber)
			`);

			// Commit transaction
			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Approval status updated successfully"
			});
		} catch (error) {
			// Rollback transaction on error
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("[approval/bank-accounts/[bankNo]] PUT Error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Error updating approval status" },
			{ status: 500 }
		);
	}
}
