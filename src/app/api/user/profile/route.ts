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

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();
		const request_query = pool.request();
		request_query.input("user_id", userId);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
		);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Don't return password fields
		const { PASSWORD, RE_PASSWORD, ...userData } = user;

		return NextResponse.json({
			success: true,
			user: userData
		});
	} catch (error) {
		console.error("Error fetching user profile:", error);
		
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
				message: "Error fetching profile: " + errorMessage
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

		const data = await request.json();

		const pool = await getDb();
		
		// Build update query dynamically based on provided fields
		const updateFields: string[] = [];
		const dbRequest = pool.request().input("user_id", userId);

		if (data.USER_FULL_NAME !== undefined) {
			updateFields.push("[USER_FULL_NAME] = @USER_FULL_NAME");
			dbRequest.input("USER_FULL_NAME", data.USER_FULL_NAME);
		}
		if (data.USER_TYPE !== undefined) {
			updateFields.push("[USER_TYPE] = @USER_TYPE");
			dbRequest.input("USER_TYPE", data.USER_TYPE);
		}
		if (data.DESIGNATION !== undefined) {
			updateFields.push("[DESIGNATION] = @DESIGNATION");
			dbRequest.input("DESIGNATION", data.DESIGNATION);
		}
		if (data.PROGRAM !== undefined) {
			updateFields.push("[PROGRAM] = @PROGRAM");
			dbRequest.input("PROGRAM", data.PROGRAM);
		}
		if (data.REGION !== undefined) {
			updateFields.push("[REGION] = @REGION");
			dbRequest.input("REGION", data.REGION);
		}
		if (data.AREA !== undefined) {
			updateFields.push("[AREA] = @AREA");
			dbRequest.input("AREA", data.AREA);
		}
		if (data.SECTION !== undefined) {
			updateFields.push("[SECTION] = @SECTION");
			dbRequest.input("SECTION", data.SECTION);
		}
		if (data.FDP !== undefined) {
			updateFields.push("[FDP] = @FDP");
			dbRequest.input("FDP", data.FDP);
		}
		if (data.PLAN_INTERVENTION !== undefined) {
			updateFields.push("[PLAN_INTERVENTION] = @PLAN_INTERVENTION");
			dbRequest.input("PLAN_INTERVENTION", data.PLAN_INTERVENTION);
		}
		if (data.TRACKING_SYSTEM !== undefined) {
			updateFields.push("[TRACKING_SYSTEM] = @TRACKING_SYSTEM");
			dbRequest.input("TRACKING_SYSTEM", data.TRACKING_SYSTEM);
		}
		if (data.RC !== undefined) {
			updateFields.push("[RC] = @RC");
			dbRequest.input("RC", data.RC);
		}
		if (data.LC !== undefined) {
			updateFields.push("[LC] = @LC");
			dbRequest.input("LC", data.LC);
		}
		if (data.REPORT_TO !== undefined) {
			updateFields.push("[REPORT_TO] = @REPORT_TO");
			dbRequest.input("REPORT_TO", data.REPORT_TO);
		}
		if (data.CAN_ADD !== undefined) {
			updateFields.push("[CAN_ADD] = @CAN_ADD");
			dbRequest.input("CAN_ADD", data.CAN_ADD ? 1 : 0);
		}
		if (data.CAN_UPDATE !== undefined) {
			updateFields.push("[CAN_UPDATE] = @CAN_UPDATE");
			dbRequest.input("CAN_UPDATE", data.CAN_UPDATE ? 1 : 0);
		}
		if (data.CAN_DELETE !== undefined) {
			updateFields.push("[CAN_DELETE] = @CAN_DELETE");
			dbRequest.input("CAN_DELETE", data.CAN_DELETE ? 1 : 0);
		}
		if (data.CAN_UPLOAD !== undefined) {
			updateFields.push("[CAN_UPLOAD] = @CAN_UPLOAD");
			dbRequest.input("CAN_UPLOAD", data.CAN_UPLOAD ? 1 : 0);
		}
		if (data.SEE_REPORTS !== undefined) {
			updateFields.push("[SEE_REPORTS] = @SEE_REPORTS");
			dbRequest.input("SEE_REPORTS", data.SEE_REPORTS ? 1 : 0);
		}
		if (data.ROP_EDIT !== undefined) {
			updateFields.push("[ROP_EDIT] = @ROP_EDIT");
			dbRequest.input("ROP_EDIT", data.ROP_EDIT ? 1 : 0);
		}
		if (data.access_loans !== undefined) {
			updateFields.push("[access_loans] = @access_loans");
			dbRequest.input("access_loans", data.access_loans ? 1 : 0);
		}
		if (data.baseline_access !== undefined) {
			updateFields.push("[baseline_access] = @baseline_access");
			dbRequest.input("baseline_access", data.baseline_access ? 1 : 0);
		}
		if (data.bank_account !== undefined) {
			updateFields.push("[bank_account] = @bank_account");
			dbRequest.input("bank_account", data.bank_account ? 1 : 0);
		}
		if (data.Supper_User !== undefined) {
			updateFields.push("[Supper_User] = @Supper_User");
			dbRequest.input("Supper_User", data.Supper_User ? 1 : 0);
		}
		if (data.ACTIVE !== undefined) {
			updateFields.push("[ACTIVE] = @ACTIVE");
			dbRequest.input("ACTIVE", data.ACTIVE ? 1 : 0);
		}

		// Always update UPDATE_DATE
		updateFields.push("[UPDATE_DATE] = GETDATE()");

		if (updateFields.length === 1) {
			// Only UPDATE_DATE was added, nothing to update
			return NextResponse.json(
				{ success: false, message: "No fields to update" },
				{ status: 400 }
			);
		}

		const query = `
			UPDATE [SJDA_Users].[dbo].[Table_User]
			SET ${updateFields.join(", ")}
			WHERE [USER_ID] = @user_id
		`;

		(dbRequest as any).timeout = 120000;
		await dbRequest.query(query);

		return NextResponse.json({
			success: true,
			message: "Profile updated successfully"
		});
	} catch (error) {
		console.error("Error updating user profile:", error);
		
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
				message: "Error updating profile: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

