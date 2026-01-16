import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperUser } from "@/lib/auth-utils";

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
		request_query.input("email_address", userId);
		(request_query as any).timeout = 120000;
		const result = await request_query.query(
			"SELECT TOP(1) * FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
		);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}
		
		// Debug logging for specific user
		if (userId === 'barkat.ebrahim@sjdap.org' || user.email_address === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DATABASE RAW DATA FOR barkat.ebrahim@sjdap.org ===');
			console.log('All user fields:', Object.keys(user));
			console.log('=========================================================');
		}

		// Map database fields to UserProfile type
		// Note: PE_User table has different structure, so we'll map available fields
		// Check if UserType is 'Admin' - Admin users have full access to all sections
		const isAdminUserType = user.UserType && typeof user.UserType === 'string' && user.UserType.trim().toLowerCase() === 'admin';
		const userIdentifier = user.UserId || user.email_address;
		const isAdminByIdentifier = userIdentifier && userIdentifier.toLowerCase() === 'admin';
		const isAdmin = isAdminUserType || isAdminByIdentifier;
		
		// Set supper_user to 'Yes' if admin, otherwise null
		let supperUserValue: string | boolean | number | null = isAdmin ? 'Yes' : null;
		
		// Debug logging for admin user - log all permission fields
		if (userId && userId.toLowerCase() === 'admin') {
			console.log('=== ADMIN USER PROFILE DEBUG ===');
			console.log('Section Permissions:', {
				BaselineApproval: (user as any).BaselineApproval,
				Setting: (user as any).Setting,
				SwbFamilies: (user as any).SwbFamilies,
				ActualIntervention: (user as any).ActualIntervention,
				FinanceSection: (user as any).FinanceSection,
				BankInformation: (user as any).BankInformation,
			});
		}

		// Handle access_loans field - PE_User doesn't have this field, set default
		let accessLoansValue: number = 0;
		
		// Handle bank_account field - use BankAccountApproval from PE_User
		let bankAccountValue: number = 0;
		if (user.BankAccountApproval !== null && user.BankAccountApproval !== undefined) {
			if (typeof user.BankAccountApproval === 'string') {
				const trimmed = user.BankAccountApproval.trim();
				const lowerTrimmed = trimmed.toLowerCase();
				if (lowerTrimmed === 'yes' || lowerTrimmed === '1' || lowerTrimmed === 'true') {
					bankAccountValue = 1;
				} else if (lowerTrimmed === 'no' || lowerTrimmed === '0' || lowerTrimmed === 'false') {
					bankAccountValue = 0;
				} else {
					bankAccountValue = 0;
				}
			} else if (typeof user.BankAccountApproval === 'boolean') {
				bankAccountValue = user.BankAccountApproval ? 1 : 0;
			} else if (typeof user.BankAccountApproval === 'number') {
				bankAccountValue = user.BankAccountApproval === 1 ? 1 : 0;
			} else {
				bankAccountValue = 0;
			}
		}

		// Helper function to normalize permission values (1/0, true/false, "Yes"/"No" -> boolean)
		// Returns true if permission granted (1, "Yes", true), false if denied (0, "No", false), null if not set
		const normalizePermission = (value: any): boolean | null => {
			if (value === null || value === undefined) return null;
			if (typeof value === 'boolean') return value;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') {
				const lower = value.toLowerCase().trim();
				if (lower === 'yes' || lower === '1' || lower === 'true') return true;
				if (lower === 'no' || lower === '0' || lower === 'false') return false;
				// If it's a string but doesn't match known patterns, return null
				return null;
			}
			return null;
		};

		// Admin users (UserType='Admin') get full access to ALL sections
		const isSuperUserValue = isAdmin;
		
		const userProfile = {
			username: user.UserId || user.email_address || "",
			email: user.email_address || user.UserId || "",
			full_name: user.UserFullName || null,
			department: null, // PE_User doesn't have PROGRAM field
			region: null, // PE_User doesn't have REGION field
			address: null,
			contact_no: null,
			access_level: user.UserType || null,
			access_add: null, // PE_User doesn't have CAN_ADD field
			access_edit: null, // PE_User doesn't have CAN_UPDATE field
			access_delete: null, // PE_User doesn't have CAN_DELETE field
			access_reports: null, // PE_User doesn't have SEE_REPORTS field
			section: null, // PE_User doesn't have SECTION field
			supper_user: supperUserValue,
			access_loans: isSuperUserValue ? 1 : accessLoansValue, // Admin users have access to loans
			bank_account: isSuperUserValue ? 1 : bankAccountValue, // Admin users have access to bank accounts
			// Admin users get access to ALL sections (set to true), otherwise use normalized permissions
			BaselineQOL: isSuperUserValue ? true : normalizePermission((user as any).BaselineApproval),
			Dashboard: isSuperUserValue ? true : null, // Admin users have access to Dashboard
			PowerBI: isSuperUserValue ? true : null, // Admin users have access to PowerBI
			Family_Development_Plan: isSuperUserValue ? true : null, // Admin users have access
			Family_Approval_CRC: isSuperUserValue ? true : null, // Admin users have access
			Family_Income: isSuperUserValue ? true : null, // Admin users have access
			ROP: isSuperUserValue ? true : null, // Admin users have access to ROP
			Setting: isSuperUserValue ? true : normalizePermission((user as any).Setting), // Admin users have access to Settings
			Other: isSuperUserValue ? true : null, // Admin users have access
			SWB_Families: isSuperUserValue ? true : normalizePermission((user as any).SwbFamilies), // Admin users have access
		};

		return NextResponse.json({
			success: true,
			user: userProfile
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
				message: "Error fetching user profile: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

