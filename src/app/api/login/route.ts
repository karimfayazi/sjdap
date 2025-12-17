import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendLoginNotification } from "@/lib/notification-service";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();
		
		if (!email || !password) {
			return NextResponse.json({ success: false, message: "Missing credentials" }, { status: 400 });
		}

		const pool = await getDb();
		const request_query = pool.request();
		request_query.input("user_id", email);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
		);
		
		const user = result.recordset?.[0];
		
		// No such user
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Invalid user ID or password" },
				{ status: 401 }
			);
		}

		// Check if account is active
		const isActive =
			user.ACTIVE === 1 ||
			user.ACTIVE === "1" ||
			user.ACTIVE === true ||
			user.ACTIVE === "true";

		if (!isActive) {
			return NextResponse.json(
				{ success: false, message: "Your Account is In-Active - Please contact Manager MIS" },
				{ status: 403 }
			);
		}

		// Check password only after confirming account is active
		if (String(user.PASSWORD) !== String(password)) {
			return NextResponse.json(
				{ success: false, message: "Invalid user ID or password" },
				{ status: 401 }
			);
		}

		// Send login notification (don't await - run in background)
		sendLoginNotification(
			user.USER_FULL_NAME || user.USER_ID,
			user.USER_ID,
			new Date()
		).catch(error => {
			// Log error but don't fail the login
			console.error('Failed to send login notification:', error);
		});

		const response = NextResponse.json({ 
			success: true, 
			user: { 
				id: user.USER_ID, 
				name: user.USER_FULL_NAME, 
				username: user.USER_ID,
				user_type: user.USER_TYPE,
				designation: user.DESIGNATION,
				region: user.REGION,
				program: user.PROGRAM,
				area: user.AREA,
				section: user.SECTION,
				finance_officer: user.Finance_Officer ?? null,
				can_add: user.CAN_ADD,
				can_update: user.CAN_UPDATE,
				can_delete: user.CAN_DELETE,
				can_upload: user.CAN_UPLOAD,
				see_reports: user.SEE_REPORTS,
				fdp: user.FDP,
				plan_intervention: user.PLAN_INTERVENTION,
				tracking_system: user.TRACKING_SYSTEM,
				rc: user.RC,
				lc: user.LC,
				report_to: user.REPORT_TO,
				rop_edit: user.ROP_EDIT,
				access_loans: user.access_loans,
				baseline_access: user.baseline_access,
				bank_account: user.bank_account,
				super_user: user.Supper_User,
				baseline_qol: user.BaselineQOL,
				dashboard: user.Dashboard,
				power_bi: user.PowerBI,
				family_development_plan: user.Family_Development_Plan,
				family_approval_crc: user.Family_Approval_CRC,
				family_income: user.Family_Income,
				rop: user.ROP,
				setting: user.Setting,
				other: user.Other,
				swb_families: user.SWB_Families
			},
			full_name: user.USER_FULL_NAME
		});
		response.cookies.set({
			name: "auth",
			value: `authenticated:${user.USER_ID}`,
			httpOnly: false, // Allow JavaScript to read the cookie
			secure: process.env.NODE_ENV === "production", // Only secure in production
			path: "/",
			sameSite: "lax",
			maxAge: 60 * 60 * 8, // 8 hours
		});
		return response;
	} catch (error) {
		console.error("Login error:", error);
		
		// Check for database connection errors
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
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Login error: " + errorMessage
			},
			{ status: 500 }
		);
	}
}


