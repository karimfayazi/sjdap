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
		// Include all permission fields for complete user management
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
				[Finance_Officer],
				[BaselineQOL],
				[Dashboard],
				[PowerBI],
				[Family_Development_Plan],
				[Family_Approval_CRC],
				[Family_Income],
				[ROP],
				[Setting],
				[Other],
				[SWB_Families],
				[EDO],
				[JPO],
				[AM_REGION]
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

		// ALL USERS CAN CREATE USERS - NO PERMISSION CHECKS

		const data = await request.json();

		// Basic validation
		if (!data.USER_ID || !data.USER_FULL_NAME || !data.PASSWORD || !data.USER_TYPE) {
			return NextResponse.json(
				{ success: false, message: "USER_ID, USER_FULL_NAME, PASSWORD, and USER_TYPE are required." },
				{ status: 400 }
			);
		}

		// Helper function to convert boolean/number to 0 or 1
		const toBoolValue = (val: any) => {
			if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return 1;
			if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return 0;
			return 0;
		};

		const insertReq = pool.request();
		(insertReq as any).timeout = 120000;

		insertReq.input("USER_ID", data.USER_ID);
		insertReq.input("USER_FULL_NAME", data.USER_FULL_NAME);
		insertReq.input("PASSWORD", data.PASSWORD);
		insertReq.input("RE_PASSWORD", data.RE_PASSWORD || data.PASSWORD);
		insertReq.input("USER_TYPE", data.USER_TYPE);
		insertReq.input("DESIGNATION", data.DESIGNATION || null);
		insertReq.input("ACTIVE", toBoolValue(data.ACTIVE));
		insertReq.input("CAN_ADD", toBoolValue(data.CAN_ADD));
		insertReq.input("CAN_UPDATE", toBoolValue(data.CAN_UPDATE));
		insertReq.input("CAN_DELETE", toBoolValue(data.CAN_DELETE));
		insertReq.input("CAN_UPLOAD", toBoolValue(data.CAN_UPLOAD));
		insertReq.input("SEE_REPORTS", toBoolValue(data.SEE_REPORTS));
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
		insertReq.input("ROP_EDIT", toBoolValue(data.ROP_EDIT));
		insertReq.input("access_loans", toBoolValue(data.access_loans));
		insertReq.input("baseline_access", toBoolValue(data.baseline_access));
		insertReq.input("bank_account", toBoolValue(data.bank_account));
		insertReq.input("Supper_User", toBoolValue(data.Supper_User));
		insertReq.input("Finance_Officer", data.Finance_Officer || null);
		insertReq.input("BaselineQOL", toBoolValue(data.BaselineQOL));
		insertReq.input("Dashboard", toBoolValue(data.Dashboard));
		insertReq.input("PowerBI", toBoolValue(data.PowerBI));
		insertReq.input("Family_Development_Plan", toBoolValue(data.Family_Development_Plan));
		insertReq.input("Family_Approval_CRC", toBoolValue(data.Family_Approval_CRC));
		insertReq.input("Family_Income", toBoolValue(data.Family_Income));
		insertReq.input("ROP", toBoolValue(data.ROP));
		insertReq.input("Setting", toBoolValue(data.Setting));
		insertReq.input("Other", toBoolValue(data.Other));
		insertReq.input("SWB_Families", toBoolValue(data.SWB_Families));
		insertReq.input("EDO", data.EDO || null);
		insertReq.input("JPO", data.JPO || null);
		insertReq.input("AM_REGION", data.AM_REGION || null);

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
				[Finance_Officer],
				[BaselineQOL],
				[Dashboard],
				[PowerBI],
				[Family_Development_Plan],
				[Family_Approval_CRC],
				[Family_Income],
				[ROP],
				[Setting],
				[Other],
				[SWB_Families],
				[EDO],
				[JPO],
				[AM_REGION]
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
				@Finance_Officer,
				@BaselineQOL,
				@Dashboard,
				@PowerBI,
				@Family_Development_Plan,
				@Family_Approval_CRC,
				@Family_Income,
				@ROP,
				@Setting,
				@Other,
				@SWB_Families,
				@EDO,
				@JPO,
				@AM_REGION
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

export async function PUT(request: NextRequest) {
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
				{ success: false, message: "Access denied. Only Admin or Super User can update users." },
				{ status: 403 }
			);
		}

		const data = await request.json();

		// Basic validation
		if (!data.USER_ID) {
			return NextResponse.json(
				{ success: false, message: "USER_ID is required." },
				{ status: 400 }
			);
		}

		const updateReq = pool.request();
		(updateReq as any).timeout = 120000;

		// Helper function to convert boolean/number to 0 or 1
		const toBoolValue = (val: any) => {
			if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return 1;
			if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return 0;
			return 0;
		};

		updateReq.input("USER_ID", data.USER_ID);
		updateReq.input("USER_FULL_NAME", data.USER_FULL_NAME || null);
		updateReq.input("USER_TYPE", data.USER_TYPE || null);
		updateReq.input("DESIGNATION", data.DESIGNATION || null);
		updateReq.input("ACTIVE", toBoolValue(data.ACTIVE));
		updateReq.input("CAN_ADD", toBoolValue(data.CAN_ADD));
		updateReq.input("CAN_UPDATE", toBoolValue(data.CAN_UPDATE));
		updateReq.input("CAN_DELETE", toBoolValue(data.CAN_DELETE));
		updateReq.input("CAN_UPLOAD", toBoolValue(data.CAN_UPLOAD));
		updateReq.input("SEE_REPORTS", toBoolValue(data.SEE_REPORTS));
		updateReq.input("PROGRAM", data.PROGRAM || null);
		updateReq.input("REGION", data.REGION || null);
		updateReq.input("AREA", data.AREA || null);
		updateReq.input("SECTION", data.SECTION || null);
		updateReq.input("FDP", data.FDP || null);
		updateReq.input("PLAN_INTERVENTION", data.PLAN_INTERVENTION || null);
		updateReq.input("TRACKING_SYSTEM", data.TRACKING_SYSTEM || null);
		updateReq.input("RC", data.RC || null);
		updateReq.input("LC", data.LC || null);
		updateReq.input("REPORT_TO", data.REPORT_TO || null);
		updateReq.input("ROP_EDIT", toBoolValue(data.ROP_EDIT));
		updateReq.input("access_loans", toBoolValue(data.access_loans));
		updateReq.input("baseline_access", toBoolValue(data.baseline_access));
		updateReq.input("bank_account", toBoolValue(data.bank_account));
		updateReq.input("Supper_User", toBoolValue(data.Supper_User));
		updateReq.input("Finance_Officer", data.Finance_Officer || null);
		updateReq.input("BaselineQOL", toBoolValue(data.BaselineQOL));
		updateReq.input("Dashboard", toBoolValue(data.Dashboard));
		updateReq.input("PowerBI", toBoolValue(data.PowerBI));
		updateReq.input("Family_Development_Plan", toBoolValue(data.Family_Development_Plan));
		updateReq.input("Family_Approval_CRC", toBoolValue(data.Family_Approval_CRC));
		updateReq.input("Family_Income", toBoolValue(data.Family_Income));
		updateReq.input("ROP", toBoolValue(data.ROP));
		updateReq.input("Setting", toBoolValue(data.Setting));
		updateReq.input("Other", toBoolValue(data.Other));
		updateReq.input("SWB_Families", toBoolValue(data.SWB_Families));
		updateReq.input("EDO", data.EDO || null);
		updateReq.input("JPO", data.JPO || null);
		updateReq.input("AM_REGION", data.AM_REGION || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[Table_User]
			SET
				[USER_FULL_NAME] = @USER_FULL_NAME,
				[USER_TYPE] = @USER_TYPE,
				[DESIGNATION] = @DESIGNATION,
				[ACTIVE] = @ACTIVE,
				[CAN_ADD] = @CAN_ADD,
				[CAN_UPDATE] = @CAN_UPDATE,
				[CAN_DELETE] = @CAN_DELETE,
				[CAN_UPLOAD] = @CAN_UPLOAD,
				[SEE_REPORTS] = @SEE_REPORTS,
				[UPDATE_DATE] = GETDATE(),
				[PROGRAM] = @PROGRAM,
				[REGION] = @REGION,
				[AREA] = @AREA,
				[SECTION] = @SECTION,
				[FDP] = @FDP,
				[PLAN_INTERVENTION] = @PLAN_INTERVENTION,
				[TRACKING_SYSTEM] = @TRACKING_SYSTEM,
				[RC] = @RC,
				[LC] = @LC,
				[REPORT_TO] = @REPORT_TO,
				[ROP_EDIT] = @ROP_EDIT,
				[access_loans] = @access_loans,
				[baseline_access] = @baseline_access,
				[bank_account] = @bank_account,
				[Supper_User] = @Supper_User,
				[Finance_Officer] = @Finance_Officer,
				[BaselineQOL] = @BaselineQOL,
				[Dashboard] = @Dashboard,
				[PowerBI] = @PowerBI,
				[Family_Development_Plan] = @Family_Development_Plan,
				[Family_Approval_CRC] = @Family_Approval_CRC,
				[Family_Income] = @Family_Income,
				[ROP] = @ROP,
				[Setting] = @Setting,
				[Other] = @Other,
				[SWB_Families] = @SWB_Families,
				[EDO] = @EDO,
				[JPO] = @JPO,
				[AM_REGION] = @AM_REGION
			WHERE [USER_ID] = @USER_ID
		`;

		const result = await updateReq.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found." },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "User updated successfully.",
		});
	} catch (error) {
		console.error("Error updating user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating user: " + errorMessage,
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
				{ success: false, message: "Access denied. Only Admin or Super User can delete users." },
				{ status: 403 }
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "USER_ID is required." },
				{ status: 400 }
			);
		}

		// Prevent deleting yourself
		if (userId === currentUserId) {
			return NextResponse.json(
				{ success: false, message: "You cannot delete your own account." },
				{ status: 400 }
			);
		}

		const deleteReq = pool.request();
		(deleteReq as any).timeout = 120000;

		deleteReq.input("USER_ID", userId);

		const deleteQuery = `
			DELETE FROM [SJDA_Users].[dbo].[Table_User]
			WHERE [USER_ID] = @USER_ID
		`;

		const result = await deleteReq.query(deleteQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found." },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "User deleted successfully.",
		});
	} catch (error) {
		console.error("Error deleting user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error deleting user: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

