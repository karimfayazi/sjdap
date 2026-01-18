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

		// Query PE_User table from SJDA_Users database to find user by email_address
		const pool = await getDb();
		const request_query = pool.request();
		request_query.input("email_address", email);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[PE_User] WHERE [email_address] = @email_address"
		);
		
		const user = result.recordset?.[0];
		
		// No such user found with this email_address
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Invalid email address or password" },
				{ status: 401 }
			);
		}

		// Check if account is active
		// Check if UserType is 'Super Admin' - Super Admin can login even if account is inactive
		const isSuperAdmin = user.UserType && typeof user.UserType === 'string' && user.UserType.trim() === 'Super Admin';
		const isActive =
			user.Active === 1 ||
			user.Active === "1" ||
			user.Active === true ||
			user.Active === "true";

		// Allow Super Admin users to bypass inactive check, otherwise check if account is active
		if (!isSuperAdmin && !isActive) {
			return NextResponse.json(
				{ success: false, message: "User id is not active please contact Manager MIS" },
				{ status: 403 }
			);
		}

		// Verify password matches - compare email_address and password from form with database
		if (String(user.Password) !== String(password)) {
			return NextResponse.json(
				{ success: false, message: "Invalid email address or password" },
				{ status: 401 }
			);
		}

		// Email and password matched successfully - proceed with login

		// Send login notification (don't await - run in background)
		sendLoginNotification(
			user.UserFullName || user.email_address,
			user.UserId || user.email_address,
			new Date()
		).catch(error => {
			// Log error but don't fail the login
			console.error('Failed to send login notification:', error);
		});

		const response = NextResponse.json({ 
			success: true, 
			user: { 
				id: user.UserId, 
				name: user.UserFullName, 
				username: user.UserId,
				email_address: user.email_address,
				user_type: user.UserType,
				designation: user.Designation,
				regional_council: user.Regional_Council,
				local_council: user.Local_Council,
				setting: user.Setting,
				swb_families: user.SwbFamilies,
				actual_intervention: user.ActualIntervention,
				finance_section: user.FinanceSection,
				bank_information: user.BankInformation,
				baseline_approval: user.BaselineApproval,
				feasibility_approval: user.FeasibilityApproval,
				fdp_approval: user.FdpApproval,
				intervention_approval: user.InterventionApproval,
				bank_account_approval: user.BankAccountApproval
			},
			full_name: user.UserFullName
		});
		response.cookies.set({
			name: "auth",
			value: `authenticated:${user.UserId || user.email_address}`,
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


