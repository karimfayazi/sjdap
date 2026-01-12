import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getBaselineDb } from "@/lib/db";
import { checkSuperUserFromDb } from "@/lib/auth-server-utils";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
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

		// Get user's full name, user type, program and area
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_TYPE], [PROGRAM], [AREA] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.USER_FULL_NAME || null;
		const isAdmin = user?.USER_TYPE?.toLowerCase() === "admin";
		const userProgram = user?.PROGRAM || null;
		const userArea = user?.AREA || null;

		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId") || "";
		const program = searchParams.get("program") || "";
		const headName = searchParams.get("headName") || "";
		const familyProgressStatus = searchParams.get("familyProgressStatus") || "";
		const mentor = searchParams.get("mentor") || "";
		const bankName = searchParams.get("bankName") || "";
		const accountTitle = searchParams.get("accountTitle") || "";
		const accountNo = searchParams.get("accountNo") || "";
		const cnic = searchParams.get("cnic") || "";
		const accountType = searchParams.get("accountType") || "";

		const pool = await getDb();
		
		// Build dynamic query with filters
		let query = `
			SELECT TOP (1000) 
				[FAMILY_ID],
				[PROGRAM],
				[AREA],
				[HEAD NAME] as HEAD_NAME,
				[FAMILY_PROGRESS_STATUS],
				[MENTOR],
				[BANK_NAME],
				[ACCOUNT_TITLE],
				[ACCOUNT_NO],
				[CNIC],
				[ACCOUNT_TYPE]
			FROM [SJDA_Tracking_System].[dbo].[View_Show_Bank_Informtion]
			WHERE 1=1
		`;

		const request_query = pool.request();

		if (familyId) {
			query += " AND [FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (program) {
			query += " AND [PROGRAM] = @program";
			request_query.input("program", program);
		}

		if (headName) {
			query += " AND [HEAD NAME] LIKE @headName";
			request_query.input("headName", `%${headName}%`);
		}

		if (familyProgressStatus) {
			query += " AND [FAMILY_PROGRESS_STATUS] = @familyProgressStatus";
			request_query.input("familyProgressStatus", familyProgressStatus);
		}

		if (mentor) {
			query += " AND [MENTOR] LIKE @mentor";
			request_query.input("mentor", `%${mentor}%`);
		}

		if (bankName) {
			query += " AND [BANK_NAME] LIKE @bankName";
			request_query.input("bankName", `%${bankName}%`);
		}

		if (accountTitle) {
			query += " AND [ACCOUNT_TITLE] LIKE @accountTitle";
			request_query.input("accountTitle", `%${accountTitle}%`);
		}

		if (accountNo) {
			query += " AND [ACCOUNT_NO] LIKE @accountNo";
			request_query.input("accountNo", `%${accountNo}%`);
		}

		if (cnic) {
			query += " AND [CNIC] LIKE @cnic";
			request_query.input("cnic", `%${cnic}%`);
		}

		if (accountType) {
			query += " AND [ACCOUNT_TYPE] = @accountType";
			request_query.input("accountType", accountType);
		}

		// Non-admin users: restrict by PROGRAM and AREA based on logged-in user
		if (!isAdmin) {
			if (userProgram) {
				query += " AND LTRIM(RTRIM([PROGRAM])) = LTRIM(RTRIM(@userProgram))";
				request_query.input("userProgram", userProgram);
			}
			if (userArea) {
				query += " AND LTRIM(RTRIM([AREA])) = LTRIM(RTRIM(@userArea))";
				request_query.input("userArea", userArea);
			}
		}

		query += " ORDER BY [FAMILY_ID]";

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		const banks = result.recordset || [];

		return NextResponse.json({
			success: true,
			banks: banks
		});
	} catch (error) {
		console.error("Error fetching bank information:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists."
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error fetching bank information: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

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

		// ALL USERS CAN ADD - NO PERMISSION CHECKS

		// Get user's full name to set as MENTOR
		const userPool = await getDb();
		const userFullNameResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const userFullName = userFullNameResult.recordset?.[0]?.USER_FULL_NAME || null;

		if (!userFullName) {
			return NextResponse.json(
				{ success: false, message: "User full name not found" },
				{ status: 404 }
			);
		}

		// Get the bank data from request body
		const bankData = await request.json();

		// Validate required fields
		if (!bankData.familyId || !bankData.bankName || !bankData.accountHolderName || !bankData.accountNumber) {
			return NextResponse.json(
				{ success: false, message: "Family ID, Bank Name, Account Holder Name, and Account Number are required" },
				{ status: 400 }
			);
		}

		// Check if Bank Account Number already exists
		const pool = await getDb();
		const accountCheckRequest = pool.request();
		accountCheckRequest.input("ACCOUNT_NO", bankData.accountNumber.trim());
		const accountCheckQuery = `
			SELECT [FAMILY_ID], [ACCOUNT_NO]
			FROM [SJDA_Tracking_System].[dbo].[Table_BANK_INFORMATION]
			WHERE LTRIM(RTRIM([ACCOUNT_NO])) = LTRIM(RTRIM(@ACCOUNT_NO))
		`;
		const accountCheckResult = await accountCheckRequest.query(accountCheckQuery);

		if (accountCheckResult.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "This Bank Account is already used. Please use a different account number." },
				{ status: 400 }
			);
		}

		// Check if CNIC already exists (if provided)
		if (bankData.cnic && bankData.cnic.trim() !== "") {
			const cnicCheckRequest = pool.request();
			cnicCheckRequest.input("CNIC", bankData.cnic.trim());
			const cnicCheckQuery = `
				SELECT [FAMILY_ID], [CNIC]
				FROM [SJDA_Tracking_System].[dbo].[Table_BANK_INFORMATION]
				WHERE LTRIM(RTRIM([CNIC])) = LTRIM(RTRIM(@CNIC))
			`;
			const cnicCheckResult = await cnicCheckRequest.query(cnicCheckQuery);

			if (cnicCheckResult.recordset.length > 0) {
				return NextResponse.json(
					{ success: false, message: "This CNIC is already used. Please use a different CNIC number." },
					{ status: 400 }
				);
			}
		}

		// Insert into database
		const insertQuery = `
			INSERT INTO [SJDA_Tracking_System].[dbo].[Table_BANK_INFORMATION]
			(
				[FAMILY_ID],
				[BANK_NAME],
				[ACCOUNT_TITLE],
				[ACCOUNT_NO],
				[MENTOR],
				[REMARKS],
				[CNIC],
				[BANK_CODE],
				[LAST_UPDATE],
				[UPDATED_DATE],
				[CNIC_Expriy_Date]
			)
			VALUES
			(
				@FAMILY_ID,
				@BANK_NAME,
				@ACCOUNT_TITLE,
				@ACCOUNT_NO,
				@MENTOR,
				@REMARKS,
				@CNIC,
				@BANK_CODE,
				GETDATE(),
				GETDATE(),
				@CNIC_Expriy_Date
			)
		`;

		const request_query = pool.request();
		request_query.input("FAMILY_ID", bankData.familyId);
		request_query.input("BANK_NAME", bankData.bankName);
		request_query.input("ACCOUNT_TITLE", bankData.accountHolderName);
		request_query.input("ACCOUNT_NO", bankData.accountNumber);
		request_query.input("MENTOR", userFullName);
		request_query.input("REMARKS", bankData.remarks || null);
		request_query.input("CNIC", bankData.cnic || null);
		request_query.input("BANK_CODE", bankData.branchCode || null);
		request_query.input("CNIC_Expriy_Date", bankData.cnicExpiryDate || null);
		(request_query as any).timeout = 120000;

		await request_query.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Bank details saved successfully"
		});

	} catch (error) {
		console.error("Error saving bank information:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists."
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error saving bank information: " + errorMessage
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

		// Check if user is Super User - Super Users can bypass all permission checks
		const isSuperUser = await checkSuperUserFromDb(userId);
		
		// If not Super User, check for specific permissions (bank_account)
		if (!isSuperUser) {
			const userPool = await getDb();
			const userResult = await userPool
				.request()
				.input("user_id", userId)
				.query(
					"SELECT TOP(1) [bank_account], [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
				);

			const user = userResult.recordset?.[0];

			if (!user) {
				return NextResponse.json(
					{ success: false, message: "User not found" },
					{ status: 404 }
				);
			}

			// Check if bank_account is "Yes" (case-insensitive)
			const bankAccount = user.bank_account;
			const hasPermission = 
				bankAccount === "Yes" || 
				bankAccount === "yes" || 
				bankAccount === 1 || 
				bankAccount === "1";

			if (!hasPermission) {
				return NextResponse.json(
					{ 
						success: false, 
						message: "Access denied. You do not have permission to update bank information. Bank account access is required." 
					},
					{ status: 403 }
				);
			}
		}

		// Get the bank data from request body
		const bankData = await request.json();

		// Validate required fields
		if (!bankData.familyId || !bankData.bankName || !bankData.accountHolderName || !bankData.accountNumber) {
			return NextResponse.json(
				{ success: false, message: "Family ID, Bank Name, Account Holder Name, and Account Number are required" },
				{ status: 400 }
			);
		}

		// Update database
		const pool = await getDb();
		const updateQuery = `
			UPDATE [SJDA_Tracking_System].[dbo].[Table_BANK_INFORMATION]
			SET
				[BANK_NAME] = @BANK_NAME,
				[ACCOUNT_TITLE] = @ACCOUNT_TITLE,
				[ACCOUNT_NO] = @ACCOUNT_NO,
				[REMARKS] = @REMARKS,
				[CNIC] = @CNIC,
				[BANK_CODE] = @BANK_CODE,
				[UPDATED_DATE] = GETDATE(),
				[CNIC_Expriy_Date] = @CNIC_Expriy_Date
			WHERE
				[FAMILY_ID] = @FAMILY_ID
				AND [ACCOUNT_NO] = @ACCOUNT_NO
		`;

		const request_query = pool.request();
		request_query.input("FAMILY_ID", bankData.familyId);
		request_query.input("BANK_NAME", bankData.bankName);
		request_query.input("ACCOUNT_TITLE", bankData.accountHolderName);
		request_query.input("ACCOUNT_NO", bankData.accountNumber);
		request_query.input("REMARKS", bankData.remarks || null);
		request_query.input("CNIC", bankData.cnic || null);
		request_query.input("BANK_CODE", bankData.branchCode || null);
		request_query.input("CNIC_Expriy_Date", bankData.cnicExpiryDate || null);
		(request_query as any).timeout = 120000;

		const result = await request_query.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found to update" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Bank details updated successfully"
		});

	} catch (error) {
		console.error("Error updating bank information:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists."
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error updating bank information: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
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

		// Check if user is Super User - Super Users can bypass all permission checks
		const isSuperUser = await checkSuperUserFromDb(userId);
		
		// If not Super User, check for specific permissions (bank_account)
		if (!isSuperUser) {
			const userPool = await getDb();
			const userResult = await userPool
				.request()
				.input("user_id", userId)
				.query(
					"SELECT TOP(1) [bank_account] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
				);

			const user = userResult.recordset?.[0];

			if (!user) {
				return NextResponse.json(
					{ success: false, message: "User not found" },
					{ status: 404 }
				);
			}

			// Check if bank_account is "Yes" (case-insensitive)
			const bankAccount = user.bank_account;
			const hasPermission = 
				bankAccount === "Yes" || 
				bankAccount === "yes" || 
				bankAccount === 1 || 
				bankAccount === "1";

			if (!hasPermission) {
				return NextResponse.json(
					{ 
						success: false, 
						message: "Access denied. You do not have permission to delete bank information. Bank account access is required." 
					},
					{ status: 403 }
				);
			}
		}

		// Get the family ID and account number from query params
		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId");
		const accountNo = searchParams.get("accountNo");

		if (!familyId || !accountNo) {
			return NextResponse.json(
				{ success: false, message: "Family ID and Account Number are required" },
				{ status: 400 }
			);
		}

		// Delete from database
		const pool = await getDb();
		const deleteQuery = `
			DELETE FROM [SJDA_Tracking_System].[dbo].[Table_BANK_INFORMATION]
			WHERE
				[FAMILY_ID] = @FAMILY_ID
				AND [ACCOUNT_NO] = @ACCOUNT_NO
		`;

		const request_query = pool.request();
		request_query.input("FAMILY_ID", familyId);
		request_query.input("ACCOUNT_NO", accountNo);
		(request_query as any).timeout = 120000;

		const result = await request_query.query(deleteQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found to delete" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Bank details deleted successfully"
		});

	} catch (error) {
		console.error("Error deleting bank information:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists."
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error deleting bank information: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

