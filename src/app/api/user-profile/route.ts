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
		
		// Debug logging for specific user
		if (userId === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DATABASE RAW DATA FOR barkat.ebrahim@sjdap.org ===');
			console.log('All user fields:', Object.keys(user));
			console.log('access_loans field exists?', 'access_loans' in user);
			console.log('access_loans value:', user.access_loans);
			console.log('access_loans type:', typeof user.access_loans);
			console.log('=========================================================');
		}

		// Map database fields to UserProfile type
		// Handle Supper_User field - it might be stored as bit (0/1), string ('Yes'/'No'), or boolean
		// Preserve original value but normalize to "Yes"/"No" for consistency
		let supperUserValue: string | boolean | number | null = null;
		if (user.Supper_User !== null && user.Supper_User !== undefined) {
			// Check if it's already a string (preserve it, but trim whitespace)
			if (typeof user.Supper_User === 'string') {
				const trimmed = user.Supper_User.trim();
				// Normalize common variations to "Yes"
				const lowerTrimmed = trimmed.toLowerCase();
				if (lowerTrimmed === 'yes' || lowerTrimmed === '1' || lowerTrimmed === 'true') {
					supperUserValue = 'Yes';
				} else if (lowerTrimmed === 'no' || lowerTrimmed === '0' || lowerTrimmed === 'false') {
					supperUserValue = 'No';
				} else {
					// Preserve original if it doesn't match known patterns
					supperUserValue = trimmed;
				}
			} else if (typeof user.Supper_User === 'boolean') {
				supperUserValue = user.Supper_User ? 'Yes' : 'No';
			} else if (typeof user.Supper_User === 'number') {
				supperUserValue = user.Supper_User === 1 ? 'Yes' : 'No';
			} else {
				// For any other type, convert to string and normalize
				const strValue = String(user.Supper_User).trim().toLowerCase();
				supperUserValue = (strValue === 'yes' || strValue === '1' || strValue === 'true') ? 'Yes' : 'No';
			}
		}
		
		// Debug logging for admin user - log all permission fields
		if (userId && userId.toLowerCase() === 'admin') {
			console.log('=== ADMIN USER PROFILE DEBUG ===');
			console.log('Supper_User:', {
				original: user.Supper_User,
				normalized: supperUserValue,
				type: typeof user.Supper_User
			});
			console.log('Section Permissions:', {
				BaselineQOL: (user as any).BaselineQOL,
				Dashboard: (user as any).Dashboard,
				PowerBI: (user as any).PowerBI,
				Family_Development_Plan: (user as any).Family_Development_Plan,
				Family_Approval_CRC: (user as any).Family_Approval_CRC,
				Family_Income: (user as any).Family_Income,
				ROP: (user as any).ROP,
				Setting: (user as any).Setting,
				Other: (user as any).Other,
				SWB_Families: (user as any).SWB_Families,
			});
			console.log('Finance Permissions:', {
				access_loans: {
					original: user.access_loans,
					normalized: accessLoansValue,
					type: typeof user.access_loans
				},
				bank_account: {
					original: user.bank_account,
					normalized: bankAccountValue,
					type: typeof user.bank_account
				},
			});
			console.log('===============================');
		}

		// Handle access_loans field - normalize to 0/1 for consistency
		let accessLoansValue: number = 0;
		if (user.access_loans !== null && user.access_loans !== undefined) {
			if (typeof user.access_loans === 'string') {
				const trimmed = user.access_loans.trim();
				const lowerTrimmed = trimmed.toLowerCase();
				if (lowerTrimmed === 'yes' || lowerTrimmed === '1' || lowerTrimmed === 'true') {
					accessLoansValue = 1;
				} else if (lowerTrimmed === 'no' || lowerTrimmed === '0' || lowerTrimmed === 'false') {
					accessLoansValue = 0;
				} else {
					accessLoansValue = 0;
				}
			} else if (typeof user.access_loans === 'boolean') {
				accessLoansValue = user.access_loans ? 1 : 0;
			} else if (typeof user.access_loans === 'number') {
				accessLoansValue = user.access_loans === 1 ? 1 : 0;
			} else {
				accessLoansValue = 0;
			}
		}
		
		// Additional logging for specific user
		if (user.USER_ID === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DEBUGGING USER: barkat.ebrahim@sjdap.org ===');
			console.log('Raw access_loans from DB:', user.access_loans);
			console.log('Type of access_loans:', typeof user.access_loans);
			console.log('Normalized accessLoansValue:', accessLoansValue);
			console.log('==============================================');
		}

		// Handle bank_account field - normalize to 0/1
		let bankAccountValue: number = 0;
		if (user.bank_account !== null && user.bank_account !== undefined) {
			if (typeof user.bank_account === 'string') {
				const trimmed = user.bank_account.trim();
				const lowerTrimmed = trimmed.toLowerCase();
				if (lowerTrimmed === 'yes' || lowerTrimmed === '1' || lowerTrimmed === 'true') {
					bankAccountValue = 1;
				} else if (lowerTrimmed === 'no' || lowerTrimmed === '0' || lowerTrimmed === 'false') {
					bankAccountValue = 0;
				} else {
					bankAccountValue = 0;
				}
			} else if (typeof user.bank_account === 'boolean') {
				bankAccountValue = user.bank_account ? 1 : 0;
			} else if (typeof user.bank_account === 'number') {
				bankAccountValue = user.bank_account === 1 ? 1 : 0;
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

		// For super users, set all section permissions to true (they have access to everything)
		// This ensures super users bypass all permission checks
		const isSuperUserValue = isSuperUser(supperUserValue);
		
		const userProfile = {
			username: user.USER_ID || "",
			email: user.USER_ID || "", // Using USER_ID as email if no email field exists
			full_name: user.USER_FULL_NAME || null,
			department: user.PROGRAM || null,
			region: user.REGION || null,
			address: null, // Add if field exists in database
			contact_no: null, // Add if field exists in database
			access_level: user.USER_TYPE || null,
			access_add: user.CAN_ADD ? (typeof user.CAN_ADD === 'boolean' ? user.CAN_ADD : user.CAN_ADD === 1) : null,
			access_edit: user.CAN_UPDATE ? (typeof user.CAN_UPDATE === 'boolean' ? user.CAN_UPDATE : user.CAN_UPDATE === 1) : null,
			access_delete: user.CAN_DELETE ? (typeof user.CAN_DELETE === 'boolean' ? user.CAN_DELETE : user.CAN_DELETE === 1) : null,
			access_reports: user.SEE_REPORTS ? (typeof user.SEE_REPORTS === 'boolean' ? user.SEE_REPORTS : user.SEE_REPORTS === 1) : null,
			section: user.SECTION || null,
			supper_user: supperUserValue,
			access_loans: isSuperUserValue ? 1 : accessLoansValue, // Super users have access to loans
			bank_account: isSuperUserValue ? 1 : bankAccountValue, // Super users have access to bank accounts
			// Super users get access to ALL sections (set to true), otherwise use normalized permissions
			BaselineQOL: isSuperUserValue ? true : normalizePermission((user as any).BaselineQOL),
			Dashboard: isSuperUserValue ? true : normalizePermission((user as any).Dashboard),
			PowerBI: isSuperUserValue ? true : normalizePermission((user as any).PowerBI),
			Family_Development_Plan: isSuperUserValue ? true : normalizePermission((user as any).Family_Development_Plan),
			Family_Approval_CRC: isSuperUserValue ? true : normalizePermission((user as any).Family_Approval_CRC),
			Family_Income: isSuperUserValue ? true : normalizePermission((user as any).Family_Income),
			ROP: isSuperUserValue ? true : normalizePermission((user as any).ROP),
			Setting: isSuperUserValue ? true : normalizePermission((user as any).Setting),
			Other: isSuperUserValue ? true : normalizePermission((user as any).Other),
			SWB_Families: isSuperUserValue ? true : normalizePermission((user as any).SWB_Families),
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

