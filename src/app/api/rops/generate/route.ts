import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		// Auth check
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

		// Get user's full name to set as SubmittedBy
		const userPool = await getDb();
		const userFullNameResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userFullNameResult.recordset?.[0];
		const submittedBy = user?.UserFullName || user?.email_address || userId;

		if (!submittedBy) {
			return NextResponse.json(
				{ success: false, message: "User information not found" },
				{ status: 404 }
			);
		}

		// Parse request body
		const body = await request.json();
		const { items } = body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Items array is required and must not be empty" },
				{ status: 400 }
			);
		}

		// Temporary debug logging for formNumber PE-00006
		const firstItem = items[0];
		if (firstItem?.FormNumber === "PE-00006") {
			console.log("[DEBUG PE-00006 API] Received items:", JSON.stringify(items, null, 2));
			console.log("[DEBUG PE-00006 API] First item InterventionID:", firstItem.InterventionID, "Type:", typeof firstItem.InterventionID);
		}

		// Validate each item
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const itemIndex = i + 1;

			// Validate FormNumber
			if (!item.FormNumber || typeof item.FormNumber !== 'string' || item.FormNumber.trim() === '') {
				return NextResponse.json(
					{ success: false, message: `Item ${itemIndex}: FormNumber is required and must be a non-empty string` },
					{ status: 400 }
				);
			}

			// Validate BeneficiaryID
			if (!item.BeneficiaryID || typeof item.BeneficiaryID !== 'string' || item.BeneficiaryID.trim() === '') {
				return NextResponse.json(
					{ success: false, message: `Item ${itemIndex}: BeneficiaryID is required and must be a non-empty string` },
					{ status: 400 }
				);
			}

			// Validate InterventionID
			if (!item.InterventionID || typeof item.InterventionID !== 'string' || item.InterventionID.trim() === '') {
				return NextResponse.json(
					{ success: false, message: `Item ${itemIndex}: InterventionID is required and must be a non-empty string. Received: ${JSON.stringify(item.InterventionID)}` },
					{ status: 400 }
				);
			}

			if (!item.MonthOfPayment) {
				return NextResponse.json(
					{ success: false, message: `Item ${itemIndex}: MonthOfPayment is required` },
					{ status: 400 }
				);
			}

			// Validate PaymentType
			if (!item.PaymentType || typeof item.PaymentType !== 'string' || item.PaymentType.trim() === '') {
				return NextResponse.json(
					{ success: false, message: `Item ${itemIndex}: PaymentType is required and must be a non-empty string` },
					{ status: 400 }
				);
			}

			// Validate amounts
			const payableAmount = parseFloat(item.PayableAmount) || 0;
			const payAmount = parseFloat(item.PayAmount) || 0;

			if (payableAmount < 0 || payAmount < 0) {
				return NextResponse.json(
					{ success: false, message: "PayableAmount and PayAmount must be >= 0" },
					{ status: 400 }
				);
			}

			if (payAmount > payableAmount) {
				return NextResponse.json(
					{ success: false, message: `PayAmount (${payAmount}) cannot exceed PayableAmount (${payableAmount})` },
					{ status: 400 }
				);
			}
		}

		// Insert ROP records
		const pool = await getDb();
		const insertedIds: number[] = [];

		// Fetch bank details for all items in bulk to avoid N+1 queries
		const bankDetailsMap: Record<string, number | null> = {};
		const uniqueBeneficiaries = new Set<string>();
		items.forEach(item => {
			const key = `${String(item.FormNumber || '').trim()}:${String(item.BeneficiaryID || '').trim()}`;
			if (key !== ':') {
				uniqueBeneficiaries.add(key);
			}
		});

		if (uniqueBeneficiaries.size > 0) {
			try {
				const bankRequest = pool.request();
				// Build OR conditions for each (FormNumber, BeneficiaryID) pair
				const conditions: string[] = [];
				Array.from(uniqueBeneficiaries).forEach((key, index) => {
					const [formNumber, beneficiaryID] = key.split(':');
					const formParam = `formNum${index}`;
					const benefParam = `benef${index}`;
					bankRequest.input(formParam, sql.VarChar, formNumber);
					bankRequest.input(benefParam, sql.VarChar, beneficiaryID);
					conditions.push(`([FormNumber] = @${formParam} AND [BeneficiaryID] = @${benefParam})`);
				});

				const bankQuery = `
					SELECT 
						[FormNumber],
						[BeneficiaryID],
						MAX([BankNo]) AS BankNo
					FROM [SJDA_Users].[dbo].[PE_BankInformation]
					WHERE ${conditions.join(' OR ')}
					GROUP BY [FormNumber], [BeneficiaryID]
				`;
				(bankRequest as any).timeout = 120000;
				const bankResult = await bankRequest.query(bankQuery);
				
				(bankResult.recordset || []).forEach((row: any) => {
					const key = `${String(row.FormNumber || '').trim()}:${String(row.BeneficiaryID || '').trim()}`;
					bankDetailsMap[key] = row.BankNo ? parseInt(row.BankNo, 10) : null;
				});
			} catch (bankError) {
				console.error("Error fetching bank details:", bankError);
				// Continue - will validate per item
			}
		}

		for (const item of items) {
			// Convert MonthOfPayment to DATE (first day of the month)
			// Expected format from textbox: YYYY-MM (e.g., "2026-01")
			// This will be stored as DATE in SQL Server (first day of the selected month)
			let monthOfPaymentDate: Date;
			const monthStr = String(item.MonthOfPayment || '').trim();
			
			if (!monthStr || monthStr === '') {
				return NextResponse.json(
					{ success: false, message: `MonthOfPayment is required and cannot be empty` },
					{ status: 400 }
				);
			}

			try {
				// Handle YYYY-MM format (from month input type)
				if (monthStr.includes('-')) {
					const parts = monthStr.split('-');
					if (parts.length >= 2) {
						const year = parseInt(parts[0], 10);
						const month = parseInt(parts[1], 10);
						
						// Validate year and month
						if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
							return NextResponse.json(
								{ success: false, message: `Invalid MonthOfPayment format: ${monthStr}. Expected format: YYYY-MM (e.g., 2026-01)` },
								{ status: 400 }
							);
						}
						
						// Create date as first day of the month (UTC to avoid timezone issues)
						monthOfPaymentDate = new Date(Date.UTC(year, month - 1, 1));
						
						// Verify the date is valid
						if (isNaN(monthOfPaymentDate.getTime())) {
							return NextResponse.json(
								{ success: false, message: `Invalid MonthOfPayment date: ${monthStr}` },
								{ status: 400 }
							);
						}
					} else {
						monthOfPaymentDate = new Date(monthStr);
						if (isNaN(monthOfPaymentDate.getTime())) {
							return NextResponse.json(
								{ success: false, message: `Invalid MonthOfPayment format: ${monthStr}. Expected format: YYYY-MM` },
								{ status: 400 }
							);
						}
					}
				} else {
					// Try to parse as date string
					monthOfPaymentDate = new Date(monthStr);
					if (isNaN(monthOfPaymentDate.getTime())) {
						return NextResponse.json(
							{ success: false, message: `Invalid MonthOfPayment format: ${monthStr}. Expected format: YYYY-MM` },
							{ status: 400 }
						);
					}
				}

				// Debug logging for formNumber PE-00006
				if (item.FormNumber === "PE-00006") {
					console.log(`[DEBUG PE-00006] MonthOfPayment conversion:`, {
						original: monthStr,
						parsedDate: monthOfPaymentDate.toISOString(),
						year: monthOfPaymentDate.getUTCFullYear(),
						month: monthOfPaymentDate.getUTCMonth() + 1,
						day: monthOfPaymentDate.getUTCDate()
					});
				}
			} catch (error) {
				return NextResponse.json(
					{ success: false, message: `Invalid MonthOfPayment format: ${monthStr}. Expected format: YYYY-MM (e.g., 2026-01)` },
					{ status: 400 }
				);
			}

			const insertQuery = `
				INSERT INTO [SJDA_Users].[dbo].[PE_ROP]
				(
					[FormNumber],
					[BeneficiaryID],
					[InterventionID],
					[InterventionSection],
					[PayableAmount],
					[MonthOfPayment],
					[PaymentType],
					[PayAmount],
					[SubmittedBy],
					[SubmittedAt],
					[Remarks],
					[Payment_Done],
					[ApprovalStatus],
					[BankNo]
				)
				VALUES
				(
					@FormNumber,
					@BeneficiaryID,
					@InterventionID,
					@InterventionSection,
					@PayableAmount,
					@MonthOfPayment,
					@PaymentType,
					@PayAmount,
					@SubmittedBy,
					GETDATE(),
					@Remarks,
					@Payment_Done,
					'Pending',
					@BankNo
				);
				SELECT SCOPE_IDENTITY() AS ROPId;
			`;

			const request_query = pool.request();
			
			// Ensure all string values are properly trimmed and validated
			const formNumber = String(item.FormNumber || '').trim();
			const beneficiaryID = String(item.BeneficiaryID || '').trim();
			const interventionID = String(item.InterventionID || '').trim();
			
			// Additional validation before SQL parameter binding
			if (!formNumber || formNumber === '') {
				return NextResponse.json(
					{ success: false, message: `FormNumber is required and cannot be empty` },
					{ status: 400 }
				);
			}
			
			if (!beneficiaryID || beneficiaryID === '') {
				return NextResponse.json(
					{ success: false, message: `BeneficiaryID is required and cannot be empty` },
					{ status: 400 }
				);
			}
			
			if (!interventionID || interventionID === '') {
				return NextResponse.json(
					{ success: false, message: `InterventionID is required and cannot be empty. Received value: ${JSON.stringify(item.InterventionID)}` },
					{ status: 400 }
				);
			}

			// Fetch BankNo for this FormNumber + BeneficiaryID
			const bankKey = `${formNumber}:${beneficiaryID}`;
			let bankNo: number | null = bankDetailsMap[bankKey] || null;
			
			// If not found in bulk query, try individual query
			if (bankNo === null || bankNo === undefined) {
				try {
					const bankCheckRequest = pool.request();
					bankCheckRequest.input("FormNumber", sql.VarChar, formNumber);
					bankCheckRequest.input("BeneficiaryID", sql.VarChar, beneficiaryID);
					const bankCheckQuery = `
						SELECT TOP 1 [BankNo]
						FROM [SJDA_Users].[dbo].[PE_BankInformation]
						WHERE [FormNumber] = @FormNumber
							AND [BeneficiaryID] = @BeneficiaryID
					`;
					(bankCheckRequest as any).timeout = 30000;
					const bankCheckResult = await bankCheckRequest.query(bankCheckQuery);
					
					if (bankCheckResult.recordset && bankCheckResult.recordset.length > 0) {
						bankNo = bankCheckResult.recordset[0].BankNo ? parseInt(bankCheckResult.recordset[0].BankNo, 10) : null;
					}
				} catch (bankCheckError) {
					console.error("Error checking bank for individual item:", bankCheckError);
				}
			}

			// Validate bank exists
			if (bankNo === null || bankNo === undefined) {
				return NextResponse.json(
					{ success: false, message: "Bank account is not defined." },
					{ status: 400 }
				);
			}

			request_query.input("FormNumber", sql.VarChar, formNumber);
			request_query.input("BeneficiaryID", sql.VarChar, beneficiaryID);
			request_query.input("InterventionID", sql.VarChar, interventionID);
			request_query.input("InterventionSection", sql.NVarChar, item.InterventionSection ? String(item.InterventionSection).trim() : null);
			request_query.input("PayableAmount", sql.Decimal(18, 2), parseFloat(item.PayableAmount) || 0);
			// Store MonthOfPayment as DATE (first day of the selected month)
			// The value comes from the month input textbox in format YYYY-MM
			request_query.input("MonthOfPayment", sql.Date, monthOfPaymentDate);
			request_query.input("PaymentType", sql.NVarChar, String(item.PaymentType || '').trim());
			request_query.input("PayAmount", sql.Decimal(18, 2), parseFloat(item.PayAmount) || 0);
			request_query.input("SubmittedBy", sql.NVarChar, submittedBy);
			request_query.input("Remarks", sql.NVarChar, item.Remarks || null);
			request_query.input("Payment_Done", sql.NVarChar, item.Payment_Done || "Not-Payment");
			request_query.input("BankNo", sql.Int, bankNo);
			(request_query as any).timeout = 120000;

			const result = await request_query.query(insertQuery);
			const ropId = result.recordset?.[0]?.ROPId;
			if (ropId) {
				insertedIds.push(ropId);
			}
		}

		return NextResponse.json({
			success: true,
			message: `Successfully inserted ${insertedIds.length} ROP record(s)`,
			insertedIds,
			count: insertedIds.length
		});

	} catch (error) {
		console.error("Error generating ROP:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Check for SQL parameter validation errors
		if (errorMessage.includes("Validation failed for parameter") || errorMessage.includes("Invalid string")) {
			return NextResponse.json(
				{
					success: false,
					message: `Invalid data provided: ${errorMessage}. Please ensure all required fields (FormNumber, BeneficiaryID, InterventionID) are valid non-empty strings.`
				},
				{ status: 400 }
			);
		}

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
				message: `Error generating ROP: ${errorMessage}. Please check that all interventions have valid InterventionIDs and try again.`
			},
			{ status: 500 }
		);
	}
}
