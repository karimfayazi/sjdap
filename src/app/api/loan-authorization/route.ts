import { NextRequest, NextResponse } from "next/server";
import { getTrackingSystemDb, getBaselineDb, getDb, getPlanInterventionDb } from "@/lib/db";

export const maxDuration = 120;

// GET - Fetch all loan authorization records
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

		// Check if requesting dropdown options
		const searchParams = request.nextUrl.searchParams;
		const getOptions = searchParams.get("getOptions");

		if (getOptions) {
			const pool = await getTrackingSystemDb();
			const request_query = pool.request();
			(request_query as any).timeout = 120000;

			const financeOfficerQuery = `
				SELECT DISTINCT [Finance_Officer]
				FROM [SJDA_Tracking_System].[dbo].[View_Loan_for_Bank]
				WHERE [Finance_Officer] IS NOT NULL 
					AND [Finance_Officer] != ''
				ORDER BY [Finance_Officer]
			`;

			const regionalCouncilQuery = `
				SELECT DISTINCT [REGIONAL COUNCIL] AS Regional_Council
				FROM [SJDA_Tracking_System].[dbo].[View_Loan_for_Bank]
				WHERE [REGIONAL COUNCIL] IS NOT NULL 
					AND [REGIONAL COUNCIL] != ''
				ORDER BY [REGIONAL COUNCIL]
			`;

			const financeOfficerResult = await request_query.query(financeOfficerQuery);
			const regionalCouncilResult = await request_query.query(regionalCouncilQuery);

			const financeOfficers = (financeOfficerResult.recordset || [])
				.map(r => r.Finance_Officer)
				.filter(Boolean)
				.sort();

			const regionalCouncils = (regionalCouncilResult.recordset || [])
				.map(r => r.Regional_Council)
				.filter(Boolean)
				.sort();

			return NextResponse.json({
				success: true,
				financeOfficers,
				regionalCouncils
			});
		}

		// Check if requesting next letter reference
		const getNextRef = searchParams.get("getNextRef");

		if (getNextRef) {
			const pool = await getTrackingSystemDb();
			const refQuery = `
				SELECT TOP 1 [Letter_Ref]
				FROM [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
				WHERE [Letter_Ref] LIKE 'RL-%'
				ORDER BY [Letter_Ref] DESC
			`;

			const request_query = pool.request();
			(request_query as any).timeout = 120000;

			const result = await request_query.query(refQuery);
			let nextRef = "RL-0001";

			if (result.recordset && result.recordset.length > 0) {
				const lastRef = result.recordset[0].Letter_Ref;
				if (lastRef && lastRef.startsWith('RL-')) {
					const num = parseInt(lastRef.substring(3)) + 1;
					nextRef = `RL-${num.toString().padStart(4, '0')}`;
				}
			}

			return NextResponse.json({
				success: true,
				nextRef: nextRef
			});
		}

		// Get query parameters for filtering
		const interventionId = searchParams.get("interventionId") || "";
		const familyId = searchParams.get("familyId") || "";
		const memberId = searchParams.get("memberId") || "";
		const letterRefParam = searchParams.get("letterRef") || "";
		const loanStatus = searchParams.get("loanStatus") || "";
		const memberName = searchParams.get("memberName") || "";
		const financeOfficer = searchParams.get("financeOfficer") || "";
		const regionalCouncil = searchParams.get("regionalCouncil") || "";
		const loanAmount = searchParams.get("loanAmount") || "";
		const cnic = searchParams.get("cnic") || "";
		const bankSend = searchParams.get("bankSend") || "";
		const bankSendDate = searchParams.get("bankSendDate") || "";

		const pool = await getTrackingSystemDb();
		let query = `
			SELECT TOP (1000)
				v.[Intervention_ID],
				v.[Family_ID],
				v.[Member_ID],
				v.[Account_Number],
				v.[Beneficiary_CNIC],
				v.[FULL NAME] AS Member_Name,
				v.[Finance_Officer],
				v.[MAIN_TRADE] AS Main_Trade,
				v.[SUB_TRADES] AS Sub_Trades,
				v.[LOAN_AMOUNT] AS Loan_Amount,
				v.[Letter_Ref],
				v.[REGIONAL COUNCIL] AS Regional_Council,
				v.[Loan_Status],
				v.[Post_Date],
				v.[Post_By],
				v.[bank_send],
				v.[bank_send_date],
				v.[collateral_mark],
				v.[collateral_date],
				lap.[CNIC_Path],
				lap.[KYC_Path],
				lap.[Agreement_Letter_Path]
			FROM [SJDA_Tracking_System].[dbo].[View_Loan_for_Bank] v
			LEFT JOIN [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process] lap
				ON lap.[Intervention_ID] = v.[Intervention_ID]
			WHERE 1=1
		`;

		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		if (interventionId) {
			query += " AND v.[Intervention_ID] = @interventionId";
			request_query.input("interventionId", interventionId);
		}

		if (familyId) {
			query += " AND v.[Family_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (memberId) {
			query += " AND v.[Member_ID] LIKE @memberId";
			request_query.input("memberId", `%${memberId}%`);
		}

		if (letterRefParam) {
			query += " AND v.[Letter_Ref] LIKE @letterRef";
			request_query.input("letterRef", `%${letterRefParam}%`);
		}

		if (loanStatus) {
			query += " AND v.[Loan_Status] = @loanStatus";
			request_query.input("loanStatus", loanStatus);
		}

		if (memberName) {
			query += " AND v.[FULL NAME] LIKE @memberName";
			request_query.input("memberName", `%${memberName}%`);
		}

		if (financeOfficer) {
			query += " AND v.[Finance_Officer] = @financeOfficer";
			request_query.input("financeOfficer", financeOfficer);
		}

		if (regionalCouncil) {
			query += " AND v.[REGIONAL COUNCIL] = @regionalCouncil";
			request_query.input("regionalCouncil", regionalCouncil);
		}

		if (loanAmount) {
			query += " AND v.[LOAN_AMOUNT] = @loanAmount";
			request_query.input("loanAmount", parseFloat(loanAmount));
		}

		if (cnic) {
			query += " AND v.[Beneficiary_CNIC] LIKE @cnic";
			request_query.input("cnic", `%${cnic}%`);
		}

		if (bankSend !== "") {
			if (bankSend === "true" || bankSend === "1") {
				query += " AND v.[bank_send] = 1";
				if (bankSendDate) {
					query += " AND CAST(v.[bank_send_date] AS DATE) = @bankSendDate";
					request_query.input("bankSendDate", bankSendDate);
				}
			} else {
				query += " AND (v.[bank_send] = 0 OR v.[bank_send] IS NULL)";
			}
		}

		query += " ORDER BY v.[Intervention_ID] DESC";

		const result = await request_query.query(query);
		
		return NextResponse.json({
			success: true,
			loans: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching loan authorization records:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN",
					loans: []
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error fetching loan authorization records: " + errorMessage,
				loans: []
			},
			{ status: 500 }
		);
	}
}

// POST - Insert new loan authorization record
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

		// Get user's full name
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const userFullName = userResult.recordset?.[0]?.UserFullName || userId;

		const loanData = await request.json();
		console.log('Received loan data:', loanData);

		// Extract Intervention_ID which is required
		const { Intervention_ID, ...insertData } = loanData;

		// Validate required fields
		if (!Intervention_ID) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required" },
				{ status: 400 }
			);
		}

		if (!insertData.Family_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getTrackingSystemDb();
		const insertQuery = `
			INSERT INTO [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
			(
				[Intervention_ID],
				[Family_ID],
				[Member_ID],
				[Letter_Ref],
				[Letter_Date],
				[Bank_Name],
				[Bank_Branch],
				[Account_Title],
				[Account_Number],
				[Account_Branch],
				[Lien_Percentage],
				[Beneficiary_Name],
				[Beneficiary_CNIC],
				[Beneficiary_Contact],
				[Beneficiary_Address],
				[Loan_Type],
				[Loan_Purpose],
				[Recommended_Amount],
				[Recommended_Tenure_Months],
				[Grace_Period_Months],
				[Recommended_Branch],
				[Loan_Status],
				[Post_Date],
				[Post_By],
				[CNIC_Path],
				[KYC_Path],
				[Agreement_Letter_Path]
				,[bank_send]
				,[bank_send_date]
				,[collateral_mark]
				,[collateral_date]
			)
			VALUES
			(
				@Intervention_ID,
				@Family_ID,
				@Member_ID,
				@Letter_Ref,
				@Letter_Date,
				@Bank_Name,
				@Bank_Branch,
				@Account_Title,
				@Account_Number,
				@Account_Branch,
				@Lien_Percentage,
				@Beneficiary_Name,
				@Beneficiary_CNIC,
				@Beneficiary_Contact,
				@Beneficiary_Address,
				@Loan_Type,
				@Loan_Purpose,
				@Recommended_Amount,
				@Recommended_Tenure_Months,
				@Grace_Period_Months,
				@Recommended_Branch,
				@Loan_Status,
				GETDATE(),
				@Post_By,
				@CNIC_Path,
				@KYC_Path,
				@Agreement_Letter_Path
				,@bank_send
				,@bank_send_date
				,@collateral_mark
				,@collateral_date
			)
		`;

		const request_query = pool.request();

		// Safely clamp numeric values to avoid SQL arithmetic overflow against NUMERIC columns
		const rawLien = Number(insertData.Lien_Percentage ?? 0);
		const safeLien =
			Number.isFinite(rawLien) && rawLien > 0
				? Math.min(rawLien, 999.99) // keep within a typical NUMERIC(5,2) range
				: null;

		const rawRecommendedAmount = Number(insertData.Recommended_Amount ?? 0);
		const safeRecommendedAmount =
			Number.isFinite(rawRecommendedAmount) && rawRecommendedAmount > 0
				? Math.min(rawRecommendedAmount, 99999999.99) // very generous cap to stay in realistic ranges
				: null;

		request_query.input("Intervention_ID", Intervention_ID);
		request_query.input("Family_ID", insertData.Family_ID);
		request_query.input("Member_ID", insertData.Member_ID || null);
		request_query.input("Letter_Ref", insertData.Letter_Ref || null);
		request_query.input("Letter_Date", insertData.Letter_Date || null);
		request_query.input("Bank_Name", insertData.Bank_Name || null);
		request_query.input("Bank_Branch", insertData.Bank_Branch || null);
		request_query.input("Account_Title", insertData.Account_Title || null);
		request_query.input("Account_Number", insertData.Account_Number || null);
		request_query.input("Account_Branch", insertData.Account_Branch || null);
		request_query.input("Lien_Percentage", safeLien);
		request_query.input("Beneficiary_Name", insertData.Beneficiary_Name || null);
		request_query.input("Beneficiary_CNIC", insertData.Beneficiary_CNIC || null);
		request_query.input("Beneficiary_Contact", insertData.Beneficiary_Contact || null);
		request_query.input("Beneficiary_Address", insertData.Beneficiary_Address || null);
		request_query.input("Loan_Type", insertData.Loan_Type || null);
		request_query.input("Loan_Purpose", insertData.Loan_Purpose || null);
		request_query.input("Recommended_Amount", safeRecommendedAmount);
		request_query.input("Recommended_Tenure_Months", insertData.Recommended_Tenure_Months || null);
		request_query.input("Grace_Period_Months", insertData.Grace_Period_Months || null);
		request_query.input("Recommended_Branch", insertData.Recommended_Branch || null);
		request_query.input("Loan_Status", insertData.Loan_Status || null);
		request_query.input("CNIC_Path", insertData.cnic_path || null);
		request_query.input("KYC_Path", insertData.kyc_path || null);
		request_query.input("Agreement_Letter_Path", insertData.agreement_letter_path || null);
		request_query.input("bank_send", insertData.bank_send ?? null);
		request_query.input("bank_send_date", insertData.bank_send_date || null);
		request_query.input("collateral_mark", insertData.collateral_mark ?? null);
		request_query.input("collateral_date", insertData.collateral_date || null);
		request_query.input("Post_By", userFullName);
		(request_query as any).timeout = 120000;

		await request_query.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Loan authorization record created successfully"
		});
	} catch (error) {
		console.error("Error creating loan authorization record:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error creating loan authorization record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

// PUT - Update loan authorization record
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

		// Get user's full name
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const userFullName = userResult.recordset?.[0]?.UserFullName || userId;

		const loanData = await request.json();

		if (!loanData.Intervention_ID) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required for update" },
				{ status: 400 }
			);
		}

		const pool = await getTrackingSystemDb();
		const updateQuery = `
			UPDATE [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
			SET
				[Family_ID] = @Family_ID,
				[Member_ID] = @Member_ID,
				[Letter_Ref] = @Letter_Ref,
				[Letter_Date] = @Letter_Date,
				[Bank_Name] = @Bank_Name,
				[Bank_Branch] = @Bank_Branch,
				[Account_Title] = @Account_Title,
				[Account_Number] = @Account_Number,
				[Account_Branch] = @Account_Branch,
				[Lien_Percentage] = @Lien_Percentage,
				[Beneficiary_Name] = @Beneficiary_Name,
				[Beneficiary_CNIC] = @Beneficiary_CNIC,
				[Beneficiary_Contact] = @Beneficiary_Contact,
				[Beneficiary_Address] = @Beneficiary_Address,
				[Loan_Type] = @Loan_Type,
				[Loan_Purpose] = @Loan_Purpose,
				[Recommended_Amount] = @Recommended_Amount,
				[Recommended_Tenure_Months] = @Recommended_Tenure_Months,
				[Grace_Period_Months] = @Grace_Period_Months,
				[Recommended_Branch] = @Recommended_Branch,
				[Loan_Status] = @Loan_Status,
				[Approved_Date] = @Approved_Date,
				[Approved_By] = @Approved_By,
				[bank_send] = @bank_send,
				[bank_send_date] = @bank_send_date,
				[collateral_mark] = @collateral_mark,
				[collateral_date] = @collateral_date
			WHERE [Intervention_ID] = @Intervention_ID
		`;

		const request_query = pool.request();
		request_query.input("Intervention_ID", loanData.Intervention_ID);
		request_query.input("Family_ID", loanData.Family_ID);
		request_query.input("Member_ID", loanData.Member_ID || null);
		request_query.input("Letter_Ref", loanData.Letter_Ref || null);
		request_query.input("Letter_Date", loanData.Letter_Date || null);
		request_query.input("Bank_Name", loanData.Bank_Name || null);
		request_query.input("Bank_Branch", loanData.Bank_Branch || null);
		request_query.input("Account_Title", loanData.Account_Title || null);
		request_query.input("Account_Number", loanData.Account_Number || null);
		request_query.input("Account_Branch", loanData.Account_Branch || null);
		request_query.input("Lien_Percentage", loanData.Lien_Percentage || null);
		request_query.input("Beneficiary_Name", loanData.Beneficiary_Name || null);
		request_query.input("Beneficiary_CNIC", loanData.Beneficiary_CNIC || null);
		request_query.input("Beneficiary_Contact", loanData.Beneficiary_Contact || null);
		request_query.input("Beneficiary_Address", loanData.Beneficiary_Address || null);
		request_query.input("Loan_Type", loanData.Loan_Type || null);
		request_query.input("Loan_Purpose", loanData.Loan_Purpose || null);
		request_query.input("Recommended_Amount", loanData.Recommended_Amount || null);
		request_query.input("Recommended_Tenure_Months", loanData.Recommended_Tenure_Months || null);
		request_query.input("Grace_Period_Months", loanData.Grace_Period_Months || null);
		request_query.input("Recommended_Branch", loanData.Recommended_Branch || null);
		request_query.input("Loan_Status", loanData.Loan_Status || null);
		request_query.input("Approved_Date", loanData.Approved_Date || null);
		request_query.input("Approved_By", loanData.Approved_By || null);
		request_query.input("bank_send", loanData.bank_send ?? null);
		request_query.input("bank_send_date", loanData.bank_send_date || null);
		request_query.input("collateral_mark", loanData.collateral_mark ?? null);
		request_query.input("collateral_date", loanData.collateral_date || null);
		(request_query as any).timeout = 120000;

		await request_query.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Loan authorization record updated successfully"
		});
	} catch (error) {
		console.error("Error updating loan authorization record:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating loan authorization record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete loan authorization record
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

		const searchParams = request.nextUrl.searchParams;
		const interventionId = searchParams.get("interventionId");

		if (!interventionId) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getTrackingSystemDb();
		const deleteQuery = `
			DELETE FROM [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
			WHERE [Intervention_ID] = @Intervention_ID
		`;

		const request_query = pool.request();
		request_query.input("Intervention_ID", interventionId);
		(request_query as any).timeout = 120000;

		await request_query.query(deleteQuery);

		return NextResponse.json({
			success: true,
			message: "Loan authorization record deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting loan authorization record:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error deleting loan authorization record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

