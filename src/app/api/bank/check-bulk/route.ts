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

		// Parse request body
		const body = await request.json();
		const { formNumber, beneficiaryIds } = body;

		if (!formNumber || typeof formNumber !== 'string' || formNumber.trim() === '') {
			return NextResponse.json(
				{ success: false, message: "FormNumber is required and must be a non-empty string" },
				{ status: 400 }
			);
		}

		if (!beneficiaryIds || !Array.isArray(beneficiaryIds) || beneficiaryIds.length === 0) {
			return NextResponse.json(
				{ success: false, message: "beneficiaryIds array is required and must not be empty" },
				{ status: 400 }
			);
		}

		// Validate all beneficiaryIds are strings
		const validBeneficiaryIds = beneficiaryIds
			.map(id => String(id || '').trim())
			.filter(id => id !== '');

		if (validBeneficiaryIds.length === 0) {
			return NextResponse.json(
				{ success: false, message: "At least one valid BeneficiaryID is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		// Build parameterized query for bulk check
		// Using IN clause with parameterized values
		const placeholders: string[] = [];
		validBeneficiaryIds.forEach((id, index) => {
			const paramName = `beneficiaryId${index}`;
			placeholders.push(`@${paramName}`);
			request_query.input(paramName, sql.VarChar, id);
		});

		const query = `
			SELECT 
				[BeneficiaryID],
				MAX([BankNo]) AS BankNo
			FROM [SJDA_Users].[dbo].[PE_BankInformation]
			WHERE [FormNumber] = @FormNumber
				AND [BeneficiaryID] IN (${placeholders.join(', ')})
			GROUP BY [BeneficiaryID]
		`;

		request_query.input("FormNumber", sql.VarChar, formNumber.trim());

		const result = await request_query.query(query);

		// Create a map of beneficiaryId -> hasBank
		const bankStatusMap: Record<string, { hasBank: boolean; bankNo?: number }> = {};

		// Initialize all as false
		validBeneficiaryIds.forEach(id => {
			bankStatusMap[id] = { hasBank: false };
		});

		// Update with actual results
		if (result.recordset && result.recordset.length > 0) {
			result.recordset.forEach((row: any) => {
				const beneficiaryId = String(row.BeneficiaryID || '').trim();
				if (beneficiaryId && bankStatusMap[beneficiaryId] !== undefined) {
					bankStatusMap[beneficiaryId] = {
						hasBank: true,
						bankNo: row.BankNo ? parseInt(row.BankNo, 10) : undefined
					};
				}
			});
		}

		return NextResponse.json({
			success: true,
			bankStatusMap
		});

	} catch (error) {
		console.error("Error checking bank accounts:", error);
		
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
				message: "Error checking bank accounts: " + errorMessage
			},
			{ status: 500 }
		);
	}
}
