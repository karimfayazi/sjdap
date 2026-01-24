import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

type ROPReportRow = {
	ROPId: number;
	FormNumber: string;
	BeneficiaryID: string | null;
	BeneficiaryName: string | null;
	InterventionID: string | null;
	InterventionSection: string | null;
	PayableAmount: number | null;
	MonthOfPayment: string | null;
	PaymentType: string | null;
	PayAmount: number | null;
	SubmittedBy: string | null;
	SubmittedAt: string | null;
	Remarks: string | null;
	Payment_Done: string | null;
	BankNo: number | null;
	// Bank Information
	BankName: string | null;
	AccountTitle: string | null;
	AccountNo: string | null;
	BankCode: string | null;
	// Family Information
	FamilyFullName: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
};

type Summary = {
	familiesCount: number;
	interventionsCount: number;
	totalAmount: number;
	economicCount: number;
	economicTotal: number;
	socialCount: number;
	socialTotal: number;
};

type FilterOptions = {
	months: string[];
	sections: string[];
	mentors: string[];
	regionalCouncils: string[];
	localCouncils: string[];
};

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ ok: false, message: "Unauthorized", summary: null, rows: [], filterOptions: null },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ ok: false, message: "Invalid session", summary: null, rows: [], filterOptions: null },
				{ status: 401 }
			);
		}

		// Check UserType - Only allow: Editor, Finance and Administration, Managment
		// Also get UserFullName for Editor mentor filtering
		const userDb = await getDb();
		const userRequest = userDb.request();
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		
		if (userIdNum !== null && userIdNum > 0) {
			userRequest.input("user_id", userIdNum);
		} else {
			userRequest.input("user_id", userId);
		}
		userRequest.input("email_address", userId);
		
		const userResult = await userRequest.query(`
			SELECT TOP(1) [UserType], [UserFullName]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE ([UserId] = @user_id OR [email_address] = @email_address)
		`);
		
		const user = userResult.recordset?.[0];
		const userType = user?.UserType || null;
		const userFullName = user?.UserFullName || null;
		const normalizedUserType = (userType ?? '').trim().toUpperCase();
		
		// Allowed user types for Reports
		const allowedUserTypes = ["EDITOR", "FINANCE AND ADMINISTRATION", "MANAGMENT", "REGIONAL AM", "SUPER ADMIN"];
		const isAllowed = allowedUserTypes.includes(normalizedUserType);
		
		if (!isAllowed) {
			return NextResponse.json(
				{ ok: false, message: "Access denied. This report is only available to Editor, Finance and Administration, Managment, Regional AM, or Super Admin users.", summary: null, rows: [], filterOptions: null },
				{ status: 403 }
			);
		}

		// For Editor users, enforce mentor filter by UserFullName
		const isEditor = normalizedUserType === "EDITOR";

		const { searchParams } = new URL(request.url);
		const regionalCouncilId = searchParams.get("regionalCouncilId") || "";
		const localCouncilId = searchParams.get("localCouncilId") || "";
		const formNumber = searchParams.get("formNumber") || "";
		const headName = searchParams.get("headName") || "";
		const monthOfPayment = searchParams.get("monthOfPayment") || "";
		const section = searchParams.get("section") || "";
		const mentor = searchParams.get("mentor") || "";
		const fromDate = searchParams.get("fromDate") || "";
		const toDate = searchParams.get("toDate") || "";
		const paymentDone = searchParams.get("paymentDone") || "all";
		const searchQuery = searchParams.get("q") || "";
		const page = parseInt(searchParams.get("page") || "1", 10);
		const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
		const sort = searchParams.get("sort") || "ROPId DESC";

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		// Build WHERE clause with filters
		const whereConditions: string[] = [];
		
		// Always filter by ApprovalStatus = 'Approved'
		whereConditions.push(`LOWER(LTRIM(RTRIM(r.[ApprovalStatus]))) = 'approved'`);

		// For Editor users: Filter by mentor (UserFullName must match PE_Application_BasicInfo.SubmittedBy)
		if (isEditor && userFullName) {
			const normalizedUserFullName = userFullName.trim();
			whereConditions.push(`UPPER(LTRIM(RTRIM(b.[SubmittedBy]))) = UPPER(LTRIM(RTRIM(@editorMentorName)))`);
			sqlRequest.input("editorMentorName", sql.NVarChar, normalizedUserFullName);
		}

		if (regionalCouncilId) {
			whereConditions.push(`b.[RegionalCommunity] = @regionalCouncilId`);
			sqlRequest.input("regionalCouncilId", sql.NVarChar, regionalCouncilId.trim());
		}

		if (localCouncilId) {
			whereConditions.push(`b.[LocalCommunity] = @localCouncilId`);
			sqlRequest.input("localCouncilId", sql.NVarChar, localCouncilId.trim());
		}

		if (formNumber) {
			whereConditions.push(`r.[FormNumber] = @formNumber`);
			sqlRequest.input("formNumber", sql.NVarChar, formNumber.trim());
		}

		if (headName) {
			whereConditions.push(`b.[Full_Name] LIKE @headName`);
			sqlRequest.input("headName", sql.NVarChar, `%${headName.trim()}%`);
		}

		if (monthOfPayment) {
			whereConditions.push(`FORMAT(r.[MonthOfPayment], 'yyyy-MM') = @monthOfPayment`);
			sqlRequest.input("monthOfPayment", sql.NVarChar, monthOfPayment.trim());
		}

		if (section) {
			whereConditions.push(`r.[InterventionSection] = @section`);
			sqlRequest.input("section", sql.NVarChar, section.trim());
		}

		// Mentor filter: For non-Editor users, allow manual filter. For Editor, ignore (already filtered above)
		if (mentor && !isEditor) {
			whereConditions.push(`r.[SubmittedBy] LIKE @mentor`);
			sqlRequest.input("mentor", sql.NVarChar, `%${mentor.trim()}%`);
		}

		// Date range filter: ROP Generated Date (SubmittedAt)
		if (fromDate) {
			whereConditions.push(`CAST(r.[SubmittedAt] AS DATE) >= @fromDate`);
			sqlRequest.input("fromDate", sql.Date, fromDate);
		}
		if (toDate) {
			// Inclusive end date: add 1 day and use < comparison
			whereConditions.push(`CAST(r.[SubmittedAt] AS DATE) < DATEADD(day, 1, @toDate)`);
			sqlRequest.input("toDate", sql.Date, toDate);
		}

		// Payment Done filter
		if (paymentDone && paymentDone !== "all") {
			if (paymentDone === "yes") {
				// Check for "Yes", "yes", "1", or any truthy value
				whereConditions.push(`(
					UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = 'YES' 
					OR UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = '1'
					OR CAST(ISNULL(r.[Payment_Done], 0) AS BIT) = 1
				)`);
			} else if (paymentDone === "no") {
				// Check for "No", "no", "0", NULL, or any falsy value
				whereConditions.push(`(
					UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = 'NO' 
					OR UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = '0'
					OR CAST(ISNULL(r.[Payment_Done], 0) AS BIT) = 0
					OR r.[Payment_Done] IS NULL
					OR LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50)))) = ''
				)`);
			}
		}

		// Search query filter (FormNumber, BeneficiaryName, Mentor/SubmittedBy)
		if (searchQuery) {
			whereConditions.push(`(
				r.[FormNumber] LIKE @searchQuery 
				OR fm.[FullName] LIKE @searchQuery 
				OR r.[SubmittedBy] LIKE @searchQuery
			)`);
			sqlRequest.input("searchQuery", sql.NVarChar, `%${searchQuery.trim()}%`);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Calculate summary statistics (use same WHERE clause and parameters)
		const summaryQuery = `
			SELECT 
				COUNT(DISTINCT r.[FormNumber]) as familiesCount,
				COUNT(DISTINCT r.[InterventionID]) as interventionsCount,
				SUM(ISNULL(r.[PayableAmount], 0)) as totalAmount,
				SUM(CASE 
					WHEN UPPER(r.[InterventionSection]) LIKE '%ECON%' THEN 1 
					ELSE 0 
				END) as economicCount,
				SUM(CASE 
					WHEN UPPER(r.[InterventionSection]) LIKE '%ECON%' THEN ISNULL(r.[PayableAmount], 0) 
					ELSE 0 
				END) as economicTotal,
				SUM(CASE 
					WHEN UPPER(r.[InterventionSection]) LIKE '%SOC%' THEN 1 
					ELSE 0 
				END) as socialCount,
				SUM(CASE 
					WHEN UPPER(r.[InterventionSection]) LIKE '%SOC%' THEN ISNULL(r.[PayableAmount], 0) 
					ELSE 0 
				END) as socialTotal
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] fm
				ON r.[BeneficiaryID] = fm.[BeneficiaryID]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			${whereClause}
		`;

		const summaryResult = await sqlRequest.query(summaryQuery);
		const summaryData = summaryResult.recordset[0] || {};
		const summary: Summary = {
			familiesCount: summaryData.familiesCount || 0,
			interventionsCount: summaryData.interventionsCount || 0,
			totalAmount: parseFloat(summaryData.totalAmount || 0),
			economicCount: summaryData.economicCount || 0,
			economicTotal: parseFloat(summaryData.economicTotal || 0),
			socialCount: summaryData.socialCount || 0,
			socialTotal: parseFloat(summaryData.socialTotal || 0),
		};

		// Fetch rows with pagination
		const offset = (page - 1) * pageSize;
		const orderBy = sort || "r.[ROPId] DESC";

		const rowsQuery = `
			SELECT 
				r.[ROPId],
				r.[FormNumber],
				r.[BeneficiaryID],
				fm.[FullName] as BeneficiaryName,
				r.[InterventionID],
				r.[InterventionSection],
				r.[PayableAmount],
				r.[MonthOfPayment],
				r.[PaymentType],
				r.[PayAmount],
				r.[SubmittedBy],
				r.[SubmittedAt],
				r.[Remarks],
				r.[Payment_Done],
				r.[BankNo],
				-- Bank Information
				bank.[BankName],
				bank.[AccountTitle],
				bank.[AccountNo],
				bank.[BankCode],
				-- Family Information
				b.[Full_Name] as FamilyFullName,
				b.[RegionalCommunity],
				b.[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] fm
				ON r.[BeneficiaryID] = fm.[BeneficiaryID]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			${whereClause}
			ORDER BY ${orderBy}
			OFFSET ${offset} ROWS
			FETCH NEXT ${pageSize} ROWS ONLY
		`;

		const rowsResult = await sqlRequest.query(rowsQuery);
		const rows: ROPReportRow[] = (rowsResult.recordset || []).map((row: any) => ({
			ROPId: row.ROPId || 0,
			FormNumber: row.FormNumber || "",
			BeneficiaryID: row.BeneficiaryID || null,
			BeneficiaryName: row.BeneficiaryName || null,
			InterventionID: row.InterventionID || null,
			InterventionSection: row.InterventionSection || null,
			PayableAmount: row.PayableAmount ? parseFloat(row.PayableAmount) : null,
			MonthOfPayment: row.MonthOfPayment ? String(row.MonthOfPayment) : null,
			PaymentType: row.PaymentType || null,
			PayAmount: row.PayAmount ? parseFloat(row.PayAmount) : null,
			SubmittedBy: row.SubmittedBy || null,
			SubmittedAt: row.SubmittedAt ? String(row.SubmittedAt) : null,
			Remarks: row.Remarks || null,
			Payment_Done: row.Payment_Done || null,
			BankNo: row.BankNo || null,
			BankName: row.BankName || null,
			AccountTitle: row.AccountTitle || null,
			AccountNo: row.AccountNo || null,
			BankCode: row.BankCode || null,
			FamilyFullName: row.FamilyFullName || null,
			RegionalCommunity: row.RegionalCommunity || null,
			LocalCommunity: row.LocalCommunity || null,
		}));

		// Get total count for pagination
		const countRequest = pool.request();
		(countRequest as any).timeout = 120000;
		
		// Apply same filters including Editor mentor filter
		if (isEditor && userFullName) {
			const normalizedUserFullName = userFullName.trim();
			countRequest.input("editorMentorName", sql.NVarChar, normalizedUserFullName);
		}
		if (regionalCouncilId) countRequest.input("regionalCouncilId", sql.NVarChar, regionalCouncilId.trim());
		if (localCouncilId) countRequest.input("localCouncilId", sql.NVarChar, localCouncilId.trim());
		if (formNumber) countRequest.input("formNumber", sql.NVarChar, formNumber.trim());
		if (headName) countRequest.input("headName", sql.NVarChar, `%${headName.trim()}%`);
		if (monthOfPayment) countRequest.input("monthOfPayment", sql.NVarChar, monthOfPayment.trim());
		if (section) countRequest.input("section", sql.NVarChar, section.trim());
		if (mentor && !isEditor) {
			countRequest.input("mentor", sql.NVarChar, `%${mentor.trim()}%`);
		}
		if (fromDate) countRequest.input("fromDate", sql.Date, fromDate);
		if (toDate) countRequest.input("toDate", sql.Date, toDate);
		if (paymentDone && paymentDone !== "all") {
			// Payment Done filter is handled in WHERE clause with OR conditions, no parameter needed
		}
		if (searchQuery) countRequest.input("searchQuery", sql.NVarChar, `%${searchQuery.trim()}%`);

		const countQuery = `
			SELECT COUNT(*) as total
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] fm
				ON r.[BeneficiaryID] = fm.[BeneficiaryID]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			${whereClause}
		`;
		const countResult = await countRequest.query(countQuery);
		const total = countResult.recordset[0]?.total || 0;

		// Fetch filter options (unique values from all approved ROPs)
		// For Editor users, filter options should only show their own mentor data
		const optionsRequest = pool.request();
		(optionsRequest as any).timeout = 120000;
		optionsRequest.input("approvedStatus", sql.NVarChar, "Approved");
		
		// Build WHERE clause for options query
		const optionsWhereConditions: string[] = [];
		optionsWhereConditions.push(`LOWER(LTRIM(RTRIM(r.[ApprovalStatus]))) = LOWER(LTRIM(RTRIM(@approvedStatus)))`);
		optionsWhereConditions.push(`r.[MonthOfPayment] IS NOT NULL`);
		optionsWhereConditions.push(`r.[InterventionSection] IS NOT NULL`);
		optionsWhereConditions.push(`r.[SubmittedBy] IS NOT NULL`);
		
		// For Editor users: Filter by mentor (UserFullName must match PE_Application_BasicInfo.SubmittedBy)
		if (isEditor && userFullName) {
			const normalizedUserFullName = userFullName.trim();
			optionsWhereConditions.push(`UPPER(LTRIM(RTRIM(b.[SubmittedBy]))) = UPPER(LTRIM(RTRIM(@editorMentorNameOptions)))`);
			optionsRequest.input("editorMentorNameOptions", sql.NVarChar, normalizedUserFullName);
		}
		
		// Apply date range and payment filters to options query as well
		if (fromDate) {
			optionsWhereConditions.push(`CAST(r.[SubmittedAt] AS DATE) >= @fromDateOptions`);
			optionsRequest.input("fromDateOptions", sql.Date, fromDate);
		}
		if (toDate) {
			optionsWhereConditions.push(`CAST(r.[SubmittedAt] AS DATE) < DATEADD(day, 1, @toDateOptions)`);
			optionsRequest.input("toDateOptions", sql.Date, toDate);
		}
		if (paymentDone && paymentDone !== "all") {
			if (paymentDone === "yes") {
				optionsWhereConditions.push(`(
					UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = 'YES' 
					OR UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = '1'
					OR CAST(ISNULL(r.[Payment_Done], 0) AS BIT) = 1
				)`);
			} else if (paymentDone === "no") {
				optionsWhereConditions.push(`(
					UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = 'NO' 
					OR UPPER(LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50))))) = '0'
					OR CAST(ISNULL(r.[Payment_Done], 0) AS BIT) = 0
					OR r.[Payment_Done] IS NULL
					OR LTRIM(RTRIM(CAST(ISNULL(r.[Payment_Done], '') AS NVARCHAR(50)))) = ''
				)`);
			}
		}
		if (searchQuery) {
			optionsWhereConditions.push(`(
				r.[FormNumber] LIKE @searchQueryOptions 
				OR fm.[FullName] LIKE @searchQueryOptions 
				OR r.[SubmittedBy] LIKE @searchQueryOptions
			)`);
			optionsRequest.input("searchQueryOptions", sql.NVarChar, `%${searchQuery.trim()}%`);
		}
		
		const optionsWhereClause = optionsWhereConditions.length > 0 ? `WHERE ${optionsWhereConditions.join(" AND ")}` : "";

		const optionsQuery = `
			SELECT DISTINCT
				FORMAT(r.[MonthOfPayment], 'yyyy-MM') as MonthOfPayment,
				r.[InterventionSection],
				r.[SubmittedBy],
				b.[RegionalCommunity],
				b.[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_ROP] r
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON r.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] fm
				ON r.[BeneficiaryID] = fm.[BeneficiaryID]
			LEFT JOIN [SJDA_Users].[dbo].[PE_BankInformation] bank
				ON r.[BankNo] = bank.[BankNo]
			${optionsWhereClause}
			ORDER BY FORMAT(r.[MonthOfPayment], 'yyyy-MM') DESC, r.[InterventionSection], r.[SubmittedBy]
		`;

		const optionsResult = await optionsRequest.query(optionsQuery);
		const optionsData = optionsResult.recordset || [];

		const filterOptions: FilterOptions = {
			months: Array.from(new Set(
				optionsData.map((row: any) => row.MonthOfPayment).filter((v: any): v is string => Boolean(v))
			)).sort().reverse(),
			sections: Array.from(new Set(
				optionsData.map((row: any) => row.InterventionSection).filter((v: any): v is string => Boolean(v))
			)).sort(),
			mentors: Array.from(new Set(
				optionsData.map((row: any) => row.SubmittedBy).filter((v: any): v is string => Boolean(v))
			)).sort(),
			regionalCouncils: Array.from(new Set(
				optionsData.map((row: any) => row.RegionalCommunity).filter((v: any): v is string => Boolean(v))
			)).sort(),
			localCouncils: Array.from(new Set(
				optionsData.map((row: any) => row.LocalCommunity).filter((v: any): v is string => Boolean(v))
			)).sort(),
		};

		return NextResponse.json({
			ok: true,
			summary,
			rows,
			filterOptions,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		});
	} catch (error) {
		console.error("Error fetching ROPs report:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{
				ok: false,
				message: "Error fetching ROPs report: " + errorMessage,
				summary: null,
				rows: [],
				filterOptions: null,
			},
			{ status: 500 }
		);
	}
}
