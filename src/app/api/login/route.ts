import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendLoginNotification } from "@/lib/notification-service";
import { normalizeApiError, createErrorResponse } from "@/lib/api-error-handler";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();
		
		if (!email || !password) {
			return NextResponse.json({ success: false, message: "Missing credentials" }, { status: 400 });
		}

		// Query PE_User table from SJDA_Users database to find user by email_address
		// Wrap getDb() in try-catch to catch connection errors
		let pool;
		try {
			pool = await getDb();
		} catch (dbError) {
			// Database connection failed - normalize and return VPN error
			const normalized = normalizeApiError(dbError);
			return NextResponse.json(
				{
					success: false,
					code: normalized.type === 'VPN_REQUIRED' ? 'VPN_REQUIRED' : undefined,
					message: normalized.message
				},
				{ status: normalized.statusCode }
			);
		}
		
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
				local_council: user.Local_Council
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
		// Log error with minimal info (no passwords)
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorName = error instanceof Error ? error.name : typeof error;
		console.error("Login error:", {
			errorName,
			message: errorMessage,
			// Explicitly exclude password from logs
		});
		
		// Normalize error to determine type
		const normalized = normalizeApiError(error);
		
		// Return appropriate response based on error type
		if (normalized.type === 'VPN_REQUIRED') {
			return NextResponse.json(
				{
					success: false,
					code: 'VPN_REQUIRED',
					message: normalized.message
				},
				{ status: normalized.statusCode }
			);
		}
		
		if (normalized.type === 'TIMEOUT') {
			return NextResponse.json(
				{
					success: false,
					message: normalized.message
				},
				{ status: normalized.statusCode }
			);
		}
		
		// For other errors, return generic error message (don't expose internal details)
		return NextResponse.json(
			{
				success: false,
				message: "Login failed. Please try again."
			},
			{ status: normalized.statusCode }
		);
	}
}


