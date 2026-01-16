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
		request_query.input("email_address", email);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[PE_User] WHERE [email_address] = @email_address"
		);
		
		const user = result.recordset?.[0];
		
		// No such user
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Invalid email address or password" },
				{ status: 401 }
			);
		}

		// Check if account is active
		// SPECIAL: Admin users (email = "admin") can login even if account is inactive
		const isAdminUser = email && email.toLowerCase() === 'admin';
		const isActive =
			user.Active === 1 ||
			user.Active === "1" ||
			user.Active === true ||
			user.Active === "true";

		// Log admin user login attempt
		if (isAdminUser) {
			console.log('=== ADMIN USER LOGIN ATTEMPT ===');
			console.log('Active field value:', user.Active);
			console.log('Bypassing inactive check for admin user');
		}

		// Allow admin users to bypass inactive check, otherwise check if account is active
		if (!isAdminUser && !isActive) {
			return NextResponse.json(
				{ success: false, message: "Your Account is In-Active - Please contact Manager MIS" },
				{ status: 403 }
			);
		}

		// Check password only after confirming account is active
		if (String(user.Password) !== String(password)) {
			return NextResponse.json(
				{ success: false, message: "Invalid email address or password" },
				{ status: 401 }
			);
		}

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


