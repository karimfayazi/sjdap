import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// Cache for allowed values from constraint
let cachedAllowedValues: string[] | null = null;

/**
 * Query the database to get allowed ApprovalStatus values from the CHECK constraint
 */
async function getAllowedApprovalStatusValues(): Promise<string[]> {
	// Return cached values if available
	if (cachedAllowedValues) {
		return cachedAllowedValues;
	}

	try {
		const pool = await getPeDb();
		const request = pool.request();
		
		const query = `
			SELECT cc.definition
			FROM sys.check_constraints cc
			JOIN sys.columns c ON c.object_id = cc.parent_object_id
			JOIN sys.tables t ON t.object_id = cc.parent_object_id
			WHERE t.name = 'PE_ROP'
			  AND cc.name = 'CK_PE_ROP_ApprovalStatus'
		`;
		
		const result = await request.query(query);
		
		if (result.recordset.length === 0) {
			console.warn("Constraint CK_PE_ROP_ApprovalStatus not found, using defaults: ['Accepted', 'Rejected']");
			cachedAllowedValues = ['Accepted', 'Rejected'];
			return cachedAllowedValues;
		}
		
		const definition = result.recordset[0].definition;
		console.log("Constraint definition:", definition);
		
		// Parse the constraint definition to extract allowed values
		// Example: "([ApprovalStatus]='Accepted' OR [ApprovalStatus]='Rejected' OR [ApprovalStatus] IS NULL)"
		// or: "([ApprovalStatus] IN ('Accepted','Rejected') OR [ApprovalStatus] IS NULL)"
		const allowedValues: string[] = [];
		
		// Match patterns like 'Accepted' or 'Rejected' (with quotes)
		const valueMatches = definition.match(/'([^']+)'/g);
		if (valueMatches) {
			allowedValues.push(...valueMatches.map(m => m.replace(/'/g, '')));
		}
		
		// If no values found, use defaults
		if (allowedValues.length === 0) {
			console.warn("Could not parse constraint values, using defaults: ['Accepted', 'Rejected']");
			cachedAllowedValues = ['Accepted', 'Rejected'];
		} else {
			cachedAllowedValues = allowedValues;
			console.log("Parsed allowed values from constraint:", cachedAllowedValues);
		}
		
		return cachedAllowedValues;
	} catch (error) {
		console.error("Error querying constraint:", error);
		// Fallback to defaults
		cachedAllowedValues = ['Accepted', 'Rejected'];
		return cachedAllowedValues;
	}
}

/**
 * Map UI input values to DB-allowed values
 * Supports: 'approved', 'accept', 'accepted' -> DB approved value
 *           'rejected', 'reject' -> DB rejected value
 */
async function mapApprovalStatusToDbValue(uiValue: string): Promise<string | null> {
	const allowedValues = await getAllowedApprovalStatusValues();
	const normalized = (uiValue || '').trim().toLowerCase();
	
	// Map approved variants
	if (normalized === 'approved' || normalized === 'accept' || normalized === 'accepted') {
		// Find the approved value in allowed values (could be 'Accepted' or 'Approved')
		const approvedValue = allowedValues.find(v => 
			v.toLowerCase() === 'accepted' || v.toLowerCase() === 'approved'
		);
		if (approvedValue) {
			return approvedValue;
		}
		// Fallback: use first value if it contains 'accept' or 'approv'
		const fallback = allowedValues.find(v => 
			v.toLowerCase().includes('accept') || v.toLowerCase().includes('approv')
		);
		if (fallback) {
			return fallback;
		}
		// Last resort: use first allowed value
		return allowedValues[0] || null;
	}
	
	// Map rejected variants
	if (normalized === 'rejected' || normalized === 'reject') {
		// Find the rejected value in allowed values
		const rejectedValue = allowedValues.find(v => 
			v.toLowerCase() === 'rejected'
		);
		if (rejectedValue) {
			return rejectedValue;
		}
		// Fallback: use value that contains 'reject'
		const fallback = allowedValues.find(v => 
			v.toLowerCase().includes('reject')
		);
		if (fallback) {
			return fallback;
		}
		// Last resort: use last allowed value
		return allowedValues[allowedValues.length - 1] || null;
	}
	
	return null;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ ropId: string }> | { ropId: string } }
) {
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

		const resolvedParams = params instanceof Promise ? await params : params;
		const ropId = resolvedParams.ropId;
		
		if (!ropId) {
			return NextResponse.json(
				{ success: false, message: "ROP ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("ROPId", sql.Int, parseInt(ropId));

		const query = `
			SELECT 
				r.[ROPId],
				r.[FormNumber],
				r.[BeneficiaryID],
				r.[InterventionID],
				r.[InterventionSection],
				r.[PayableAmount],
				r.[PayAmount],
				r.[MonthOfPayment],
				r.[PaymentType],
				r.[SubmittedBy],
				r.[SubmittedAt],
				r.[Remarks],
				r.[Payment_Done],
				r.[ApprovalStatus],
				r.[BankNo],
				-- Family Information
				b.[Full_Name] as FamilyFullName,
				b.[CNICNumber] as FamilyCNIC,
				b.[RegionalCommunity],
				b.[LocalCommunity],
				-- Member Information
				m.[FullName] as MemberName,
				m.[BFormOrCNIC] as MemberCNIC,
				-- Bank Information
				bank.[BankName],
				bank.[AccountNo],
				bank.[AccountTitle]
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m
				ON r.[BeneficiaryID] = m.[BeneficiaryID] AND r.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			WHERE r.[ROPId] = @ROPId
		`;

		const result = await sqlRequest.query(query);
		const rop = result.recordset[0];

		if (!rop) {
			return NextResponse.json(
				{ success: false, message: "ROP not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			rop,
		});
	} catch (error) {
		console.error("Error fetching ROP:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching ROP: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ ropId: string }> | { ropId: string } }
) {
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

		const resolvedParams = params instanceof Promise ? await params : params;
		const ropId = resolvedParams.ropId;
		
		if (!ropId) {
			return NextResponse.json(
				{ success: false, message: "ROP ID is required" },
				{ status: 400 }
			);
		}

		// Validate ropId is numeric
		const ropIdNum = parseInt(ropId, 10);
		if (isNaN(ropIdNum) || ropIdNum <= 0) {
			return NextResponse.json(
				{ success: false, message: "ROP ID must be a valid positive number" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { approvalStatus, remarks } = body;

		if (!approvalStatus) {
			return NextResponse.json(
				{ success: false, message: "Approval Status is required" },
				{ status: 400 }
			);
		}

		// Map UI value to DB-allowed value
		const dbStatus = await mapApprovalStatusToDbValue(approvalStatus);
		if (!dbStatus) {
			const allowedValues = await getAllowedApprovalStatusValues();
			return NextResponse.json(
				{ 
					success: false, 
					message: `Invalid ApprovalStatus. Allowed values are: ${allowedValues.join(', ')}` 
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const transaction = new sql.Transaction(pool);
		
		try {
			await transaction.begin();

			// Check if ROP is already approved/rejected (locked)
			const checkRequest = new sql.Request(transaction);
			checkRequest.input("ROPId", sql.Int, ropIdNum);
			const checkQuery = `
				SELECT [ApprovalStatus], [FormNumber]
				FROM [SJDA_Users].[dbo].[PE_ROP]
				WHERE [ROPId] = @ROPId
			`;
			const checkResult = await checkRequest.query(checkQuery);
			
			if (checkResult.recordset.length === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "ROP not found" },
					{ status: 404 }
				);
			}

			const currentStatus = checkResult.recordset[0].ApprovalStatus;
			const formNumber = checkResult.recordset[0].FormNumber;
			
			// Allow updates: only block if already Approved/Accepted (but allow Rejected -> Approved transitions)
			const statusUpper = currentStatus ? String(currentStatus).trim().toUpperCase() : "";
			
			// If current status is Approved/Accepted, block any changes
			if (statusUpper === "ACCEPTED" || statusUpper === "APPROVED") {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "This ROP has already been approved and cannot be modified" },
					{ status: 400 }
				);
			}
			
			// Allow switching from Rejected to Approved, or updating Rejected to Rejected (with new remarks)
			// Allow updating Pending/null to any status

			// Update ROP
			const updateRequest = new sql.Request(transaction);
			updateRequest.input("ROPId", sql.Int, ropIdNum);
			updateRequest.input("ApprovalStatus", sql.NVarChar, dbStatus);
			updateRequest.input("Remarks", sql.NVarChar, remarks?.trim() || null);

			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_ROP]
				SET 
					[ApprovalStatus] = @ApprovalStatus,
					[Remarks] = @Remarks
				WHERE [ROPId] = @ROPId
			`;

			await updateRequest.query(updateQuery);

			// Insert into Approval_Log
			const logRequest = new sql.Request(transaction);
			logRequest.input("ModuleName", sql.NVarChar, "ROP");
			logRequest.input("RecordID", sql.Int, ropIdNum);
			logRequest.input("ActionLevel", sql.VarChar, dbStatus);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			// Determine ActionType based on dbStatus
			const isApproved = dbStatus.toUpperCase() === "ACCEPTED" || dbStatus.toUpperCase() === "APPROVED";
			logRequest.input("ActionType", sql.VarChar, isApproved ? "Approval" : "Rejection");
			logRequest.input("Remarks", sql.NVarChar, remarks?.trim() || null);
			logRequest.input("FormNumber", sql.VarChar, formNumber);

			const insertLogQuery = `
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks], [FormNumber])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks, @FormNumber)
			`;

			await logRequest.query(insertLogQuery);

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "ROP approval status updated successfully",
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error) {
		console.error("Error updating ROP approval:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating ROP approval: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
