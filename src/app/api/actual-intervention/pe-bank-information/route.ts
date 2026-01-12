import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

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

		const searchParams = request.nextUrl.searchParams;
		const formNumber = searchParams.get("formNumber") || "";
		const beneficiaryId = searchParams.get("beneficiaryId") || "";

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		// Build query for PE_BankInformation table
		let query = `
			SELECT TOP (1000) 
				[BankNo],
				[FormNumber],
				[BeneficiaryID],
				[BankName],
				[AccountTitle],
				[AccountNo],
				[CNIC],
				[BankCode],
				[SubmittedAt],
				[SubmittedBy],
				[ApprovalStatus],
				[Remarks],
				[BankChequeImagePath]
			FROM [SJDA_Users].[dbo].[PE_BankInformation]
			WHERE LTRIM(RTRIM([FormNumber])) = LTRIM(RTRIM(@formNumber))
		`;

		const request_query = pool.request();
		request_query.input("formNumber", formNumber);

		if (beneficiaryId) {
			// Match exact BeneficiaryID (with trim) or NULL (for family-level accounts)
			query += " AND (LTRIM(RTRIM([BeneficiaryID])) = LTRIM(RTRIM(@beneficiaryId)) OR [BeneficiaryID] IS NULL)";
			request_query.input("beneficiaryId", beneficiaryId);
		}

		query += " ORDER BY [SubmittedAt] DESC";

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		const banks = result.recordset || [];

		console.log(`PE Bank Information Query - FormNumber: ${formNumber}, BeneficiaryID: ${beneficiaryId || 'N/A'}, Results: ${banks.length}`);

		return NextResponse.json({
			success: true,
			banks: banks,
			count: banks.length
		});
	} catch (error) {
		console.error("Error fetching PE bank information:", error);
		
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
				message: "Error fetching PE bank information: " + errorMessage
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

		// Get user's full name to set as SubmittedBy
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

		// Get the bank data from FormData (for file upload support)
		const formData = await request.formData();
		const formNumber = formData.get("formNumber") as string;
		const beneficiaryId = formData.get("beneficiaryId") as string;
		const bankName = formData.get("bankName") as string;
		const accountTitle = formData.get("accountTitle") as string;
		const accountNo = formData.get("accountNo") as string;
		const cnic = formData.get("cnic") as string;
		const bankCode = formData.get("bankCode") as string;
		const approvalStatus = formData.get("approvalStatus") as string;
		const remarks = formData.get("remarks") as string;
		const chequeImage = formData.get("chequeImage") as File | null;

		// Validate required fields
		if (!formNumber || !bankName || !accountTitle || !accountNo) {
			return NextResponse.json(
				{ success: false, message: "Form Number, Bank Name, Account Title, and Account Number are required" },
				{ status: 400 }
			);
		}

		// Check if Bank Account Number already exists
		const pool = await getDb();
		const accountCheckRequest = pool.request();
		const cleanedAccountNo = accountNo.replace(/\s/g, "").trim();
		accountCheckRequest.input("AccountNo", cleanedAccountNo);
		const accountCheckQuery = `
			SELECT [FormNumber], [AccountNo]
			FROM [SJDA_Users].[dbo].[PE_BankInformation]
			WHERE LTRIM(RTRIM(REPLACE([AccountNo], ' ', ''))) = LTRIM(RTRIM(@AccountNo))
		`;
		const accountCheckResult = await accountCheckRequest.query(accountCheckQuery);

		if (accountCheckResult.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "This Bank Account is already used. Please use a different account number." },
				{ status: 400 }
			);
		}

		// Check if CNIC already exists (if provided)
		if (cnic && cnic.trim() !== "") {
			const cnicCheckRequest = pool.request();
			cnicCheckRequest.input("CNIC", cnic.trim());
			const cnicCheckQuery = `
				SELECT [FormNumber], [CNIC]
				FROM [SJDA_Users].[dbo].[PE_BankInformation]
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

		// Handle file upload if provided
		let chequeImagePath: string | null = null;
		if (chequeImage) {
			try {
				// Check if it's actually a File object
				if (!(chequeImage instanceof File)) {
					console.error("chequeImage is not a File object:", typeof chequeImage, chequeImage);
					return NextResponse.json(
						{ success: false, message: "Invalid file object received" },
						{ status: 400 }
					);
				}

				// Check file size
				if (chequeImage.size === 0) {
					return NextResponse.json(
						{ success: false, message: "File is empty" },
						{ status: 400 }
					);
				}

				// Validate file type
				if (!chequeImage.type || !chequeImage.type.startsWith("image/")) {
					return NextResponse.json(
						{ success: false, message: "Only image files are allowed for cheque upload" },
						{ status: 400 }
					);
				}

				// Validate file size (max 5MB)
				if (chequeImage.size > 5 * 1024 * 1024) {
					return NextResponse.json(
						{ success: false, message: "Image size must be less than 5MB" },
						{ status: 400 }
					);
				}

				// Ensure public/uploads directory exists
				const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
				if (!existsSync(publicUploadsDir)) {
					mkdirSync(publicUploadsDir, { recursive: true });
				}

				// Create directory structure: public/uploads/bank-cheque/{formNumber}/
				const uploadDir = path.join(process.cwd(), "public", "uploads", "bank-cheque", formNumber || "unknown");
				
				if (!existsSync(uploadDir)) {
					mkdirSync(uploadDir, { recursive: true });
				}

				// Generate unique filename
				const timestamp = Date.now();
				const fileExtension = path.extname(chequeImage.name) || ".jpg";
				const sanitizedFormNumber = (formNumber || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
				const sanitizedBeneficiaryId = (beneficiaryId || "FAMILY").replace(/[^a-zA-Z0-9-]/g, "_");
				const fileName = `Cheque_${sanitizedFormNumber}_${sanitizedBeneficiaryId}_${timestamp}${fileExtension}`;
				const filePath = path.join(uploadDir, fileName);

				console.log(`Attempting to save file: ${filePath}`);
				console.log(`File details - Name: ${chequeImage.name}, Size: ${chequeImage.size}, Type: ${chequeImage.type}`);

				// Save file
				const bytes = await chequeImage.arrayBuffer();
				const buffer = Buffer.from(bytes);
				await writeFile(filePath, buffer);

				// Return relative path for database storage
				chequeImagePath = `/uploads/bank-cheque/${formNumber}/${fileName}`;
				console.log(`Cheque image uploaded successfully: ${chequeImagePath}`);
			} catch (fileError) {
				console.error("Error uploading cheque image - Full error:", fileError);
				const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
				const errorStack = fileError instanceof Error ? fileError.stack : undefined;
				console.error("Error stack:", errorStack);
				return NextResponse.json(
					{ success: false, message: `Error uploading cheque image: ${errorMessage}` },
					{ status: 500 }
				);
			}
		}

		// Insert into database
		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_BankInformation]
			(
				[FormNumber],
				[BeneficiaryID],
				[BankName],
				[AccountTitle],
				[AccountNo],
				[CNIC],
				[BankCode],
				[SubmittedAt],
				[SubmittedBy],
				[ApprovalStatus],
				[Remarks],
				[BankChequeImagePath]
			)
			VALUES
			(
				@FormNumber,
				@BeneficiaryID,
				@BankName,
				@AccountTitle,
				@AccountNo,
				@CNIC,
				@BankCode,
				GETDATE(),
				@SubmittedBy,
				@ApprovalStatus,
				@Remarks,
				@BankChequeImagePath
			)
		`;

		const request_query = pool.request();
		request_query.input("FormNumber", formNumber);
		request_query.input("BeneficiaryID", beneficiaryId || null);
		request_query.input("BankName", bankName);
		request_query.input("AccountTitle", accountTitle);
		request_query.input("AccountNo", accountNo);
		request_query.input("CNIC", cnic || null);
		request_query.input("BankCode", bankCode || null);
		request_query.input("SubmittedBy", userFullName);
		request_query.input("ApprovalStatus", approvalStatus || null);
		request_query.input("Remarks", remarks || null);
		request_query.input("BankChequeImagePath", chequeImagePath);
		(request_query as any).timeout = 120000;

		await request_query.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Bank details saved successfully"
		});

	} catch (error) {
		console.error("Error saving PE bank information:", error);
		
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
				message: "Error saving PE bank information: " + errorMessage
			},
			{ status: 500 }
		);
	}
}
