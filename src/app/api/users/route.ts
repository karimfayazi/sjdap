import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId") || "";
		const fullName = searchParams.get("fullName") || "";
		const userType = searchParams.get("userType") || "";
		const designation = searchParams.get("designation") || "";
		const program = searchParams.get("program") || "";
		const region = searchParams.get("region") || "";
		const area = searchParams.get("area") || "";
		const section = searchParams.get("section") || "";
		const active = searchParams.get("active") || "";
		const bankAccount = searchParams.get("bankAccount") || "";

		const pool = await getDb();
		
		// Build dynamic query with filters (aligned with Table_User definition)
		let query = `
			SELECT TOP (1000) 
				[USER_ID],
				[USER_FULL_NAME],
				[PASSWORD],
				[RE_PASSWORD],
				[USER_TYPE],
				[DESIGNATION],
				[ACTIVE],
				[CAN_ADD],
				[CAN_UPDATE],
				[CAN_DELETE],
				[CAN_UPLOAD],
				[SEE_REPORTS],
				[UPDATE_DATE],
				[PROGRAM],
				[REGION],
				[AREA],
				[SECTION],
				[FDP],
				[PLAN_INTERVENTION],
				[TRACKING_SYSTEM],
				[RC],
				[LC],
				[REPORT_TO],
				[ROP_EDIT],
				[access_loans],
				[baseline_access],
				[bank_account],
				[Supper_User],
				[Finance_Officer]
			FROM [SJDA_Users].[dbo].[Table_User]
			WHERE 1=1
		`;

		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		if (userId) {
			query += " AND [USER_ID] LIKE @userId";
			request_query.input("userId", `%${userId}%`);
		}

		if (fullName) {
			query += " AND [USER_FULL_NAME] LIKE @fullName";
			request_query.input("fullName", `%${fullName}%`);
		}

		if (userType) {
			query += " AND [USER_TYPE] = @userType";
			request_query.input("userType", userType);
		}

		if (designation) {
			query += " AND [DESIGNATION] LIKE @designation";
			request_query.input("designation", `%${designation}%`);
		}

		if (program) {
			query += " AND [PROGRAM] = @program";
			request_query.input("program", program);
		}

		if (region) {
			query += " AND [REGION] LIKE @region";
			request_query.input("region", `%${region}%`);
		}

		if (area) {
			query += " AND [AREA] LIKE @area";
			request_query.input("area", `%${area}%`);
		}

		if (section) {
			query += " AND [SECTION] LIKE @section";
			request_query.input("section", `%${section}%`);
		}

		if (active !== "") {
			query += " AND [ACTIVE] = @active";
			request_query.input("active", active === "true" ? 1 : 0);
		}

		if (bankAccount === "Yes" || bankAccount === "true") {
			query += " AND ([bank_account] = 1 OR [bank_account] = 'Yes' OR [bank_account] = '1')";
		}

		query += " ORDER BY [USER_ID]";

		const result = await request_query.query(query);
		const users = result.recordset || [];

		return NextResponse.json({
			success: true,
			users: users
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		
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
				message: "Error fetching users: " + errorMessage
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

		const currentUserId = authCookie.value.split(":")[1];
		if (!currentUserId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();

		// Check permissions of current user (must be admin or super user)
		const permResult = await pool
			.request()
			.input("current_user_id", currentUserId)
			.query(
				"SELECT TOP(1) [USER_TYPE], [Supper_User] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @current_user_id"
			);

		const permUser = permResult.recordset?.[0];
		const isAdmin = permUser?.USER_TYPE?.toLowerCase() === "admin";
		const isSuperUser =
			permUser?.Supper_User === 1 ||
			permUser?.Supper_User === "1" ||
			permUser?.Supper_User === true ||
			permUser?.Supper_User === "true";

		if (!isAdmin && !isSuperUser) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin or Super User can create users." },
				{ status: 403 }
			);
		}

		const data = await request.json();

		// Basic validation
		if (!data.USER_ID || !data.USER_FULL_NAME || !data.PASSWORD || !data.USER_TYPE) {
			return NextResponse.json(
				{ success: false, message: "USER_ID, USER_FULL_NAME, PASSWORD, and USER_TYPE are required." },
				{ status: 400 }
			);
		}

		const insertReq = pool.request();
		(insertReq as any).timeout = 120000;

		insertReq.input("USER_ID", data.USER_ID);
		insertReq.input("USER_FULL_NAME", data.USER_FULL_NAME);
		insertReq.input("PASSWORD", data.PASSWORD);
		insertReq.input("RE_PASSWORD", data.RE_PASSWORD || data.PASSWORD);
		insertReq.input("USER_TYPE", data.USER_TYPE);
		insertReq.input("DESIGNATION", data.DESIGNATION || null);
		insertReq.input("ACTIVE", data.ACTIVE ? 1 : 0);
		insertReq.input("CAN_ADD", data.CAN_ADD ? 1 : 0);
		insertReq.input("CAN_UPDATE", data.CAN_UPDATE ? 1 : 0);
		insertReq.input("CAN_DELETE", data.CAN_DELETE ? 1 : 0);
		insertReq.input("CAN_UPLOAD", data.CAN_UPLOAD ? 1 : 0);
		insertReq.input("SEE_REPORTS", data.SEE_REPORTS ? 1 : 0);
		insertReq.input("PROGRAM", data.PROGRAM || null);
		insertReq.input("REGION", data.REGION || null);
		insertReq.input("AREA", data.AREA || null);
		insertReq.input("SECTION", data.SECTION || null);
		insertReq.input("FDP", data.FDP || null);
		insertReq.input("PLAN_INTERVENTION", data.PLAN_INTERVENTION || null);
		insertReq.input("TRACKING_SYSTEM", data.TRACKING_SYSTEM || null);
		insertReq.input("RC", data.RC || null);
		insertReq.input("LC", data.LC || null);
		insertReq.input("REPORT_TO", data.REPORT_TO || null);
		insertReq.input("ROP_EDIT", data.ROP_EDIT ? 1 : 0);
		insertReq.input("access_loans", data.access_loans ? 1 : 0);
		insertReq.input("baseline_access", data.baseline_access ? 1 : 0);
		insertReq.input("bank_account", data.bank_account ? 1 : 0);
		insertReq.input("Supper_User", data.Supper_User ? 1 : 0);
		insertReq.input("Finance_Officer", data.Finance_Officer || null);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[Table_User] (
				[USER_ID],
				[USER_FULL_NAME],
				[PASSWORD],
				[RE_PASSWORD],
				[USER_TYPE],
				[DESIGNATION],
				[ACTIVE],
				[CAN_ADD],
				[CAN_UPDATE],
				[CAN_DELETE],
				[CAN_UPLOAD],
				[SEE_REPORTS],
				[UPDATE_DATE],
				[PROGRAM],
				[REGION],
				[AREA],
				[SECTION],
				[FDP],
				[PLAN_INTERVENTION],
				[TRACKING_SYSTEM],
				[RC],
				[LC],
				[REPORT_TO],
				[ROP_EDIT],
				[access_loans],
				[baseline_access],
				[bank_account],
				[Supper_User],
				[Finance_Officer]
			)
			VALUES (
				@USER_ID,
				@USER_FULL_NAME,
				@PASSWORD,
				@RE_PASSWORD,
				@USER_TYPE,
				@DESIGNATION,
				@ACTIVE,
				@CAN_ADD,
				@CAN_UPDATE,
				@CAN_DELETE,
				@CAN_UPLOAD,
				@SEE_REPORTS,
				GETDATE(),
				@PROGRAM,
				@REGION,
				@AREA,
				@SECTION,
				@FDP,
				@PLAN_INTERVENTION,
				@TRACKING_SYSTEM,
				@RC,
				@LC,
				@REPORT_TO,
				@ROP_EDIT,
				@access_loans,
				@baseline_access,
				@bank_account,
				@Supper_User,
				@Finance_Officer
			)
		`;

		await insertReq.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "User created successfully.",
		});
	} catch (error) {
		console.error("Error creating user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error creating user: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

