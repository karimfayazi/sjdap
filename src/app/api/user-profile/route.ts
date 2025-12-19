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
		
		// Get SWB_Families field value - try exact name first, then case-insensitive lookup
		// Based on SQL: [SWB_Families] from [SJDA_Users].[dbo].[Table_User]
		let swbFamiliesValue = (user as any).SWB_Families;
		let swbFieldKey = 'SWB_Families';
		
		// If not found with exact name, try case-insensitive lookup
		if (swbFamiliesValue === undefined) {
			swbFieldKey = Object.keys(user).find(key => 
				key.toLowerCase() === 'swb_families' || 
				key.toLowerCase() === 'swbfamilies'
			) || 'SWB_Families';
			swbFamiliesValue = swbFieldKey ? (user as any)[swbFieldKey] : null;
		}
		
		// Debug logging for specific user
		if (userId === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DATABASE RAW DATA FOR barkat.ebrahim@sjdap.org ===');
			console.log('All user fields:', Object.keys(user));
			console.log('access_loans field exists?', 'access_loans' in user);
			console.log('access_loans value:', user.access_loans);
			console.log('access_loans type:', typeof user.access_loans);
			console.log('SWB_Families field key:', swbFieldKey);
			console.log('SWB_Families value:', swbFamiliesValue);
			console.log('=========================================================');
		}
		
		// Comprehensive debug logging for SWB_Families - check all possible field name variations
		console.log('=== COMPREHENSIVE SWB_Families FIELD CHECK ===');
		console.log('All user field keys:', Object.keys(user));
		console.log('Checking for SWB_Families variations:');
		console.log('  - SWB_Families:', (user as any).SWB_Families, 'exists:', 'SWB_Families' in user);
		console.log('  - swb_families:', (user as any).swb_families, 'exists:', 'swb_families' in user);
		console.log('  - SWB_FAMILIES:', (user as any).SWB_FAMILIES, 'exists:', 'SWB_FAMILIES' in user);
		console.log('  - Swb_Families:', (user as any).Swb_Families, 'exists:', 'Swb_Families' in user);
		console.log(`  - Found field with key: "${swbFieldKey}", value:`, swbFamiliesValue);
		if (!swbFieldKey || swbFamiliesValue === undefined) {
			console.log('  - WARNING: SWB_Families field may not exist or is undefined!');
		}
		console.log('================================================');

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
		// IMPORTANT: This function handles SWB_Families = 1 or true to grant access
		const normalizePermissionForAPI = (value: any): boolean | null => {
			if (value === null || value === undefined) return null;
			
			// Handle boolean: true -> true, false -> false
			if (typeof value === 'boolean') {
				return value === true;
			}
			
			// Handle number: 1 -> true, anything else -> false
			if (typeof value === 'number') {
				return value === 1;
			}
			
			// Handle string: normalize and check
			if (typeof value === 'string') {
				const lower = value.toLowerCase().trim();
				// Grant access for: "yes", "1", "true"
				if (lower === 'yes' || lower === '1' || lower === 'true') {
					return true;
				}
				// Deny access for: "no", "0", "false"
				if (lower === 'no' || lower === '0' || lower === 'false') {
					return false;
				}
				// Unknown string pattern -> return null (will be converted to false)
				return null;
			}
			
			// Unknown type -> return null (will be converted to false)
			return null;
		};

		// For super users, set all section permissions to true (they have access to everything)
		// This ensures super users bypass all permission checks
		const isSuperUserValue = isSuperUser(supperUserValue);

		// Debug logging for admin user - log all permission fields
		if (userId && userId.toLowerCase() === 'admin') {
			console.log('=== ADMIN USER PROFILE DEBUG ===');
			console.log('Supper_User:', {
				original: user.Supper_User,
				normalized: supperUserValue,
				type: typeof user.Supper_User
			});
			console.log('Section Permissions (RAW FROM DB):', {
				BaselineQOL: { value: (user as any).BaselineQOL, type: typeof (user as any).BaselineQOL },
				Dashboard: { value: (user as any).Dashboard, type: typeof (user as any).Dashboard },
				PowerBI: { value: (user as any).PowerBI, type: typeof (user as any).PowerBI },
				Family_Development_Plan: { value: (user as any).Family_Development_Plan, type: typeof (user as any).Family_Development_Plan },
				Family_Approval_CRC: { value: (user as any).Family_Approval_CRC, type: typeof (user as any).Family_Approval_CRC },
				Family_Income: { value: (user as any).Family_Income, type: typeof (user as any).Family_Income },
				ROP: { value: (user as any).ROP, type: typeof (user as any).ROP },
				Setting: { value: (user as any).Setting, type: typeof (user as any).Setting },
				Other: { value: (user as any).Other, type: typeof (user as any).Other },
				SWB_Families: { value: swbFamiliesValue, type: typeof swbFamiliesValue, normalized: normalizePermissionForAPI(swbFamiliesValue) },
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

		// Additional logging for specific user
		if (user.USER_ID === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DEBUGGING USER: barkat.ebrahim@sjdap.org ===');
			console.log('Raw access_loans from DB:', user.access_loans);
			console.log('Type of access_loans:', typeof user.access_loans);
			console.log('Normalized accessLoansValue:', accessLoansValue);
			console.log('Raw SWB_Families from DB:', swbFamiliesValue);
			console.log('Type of SWB_Families:', typeof swbFamiliesValue);
			console.log('Normalized SWB_Families:', normalizePermissionForAPI(swbFamiliesValue));
			console.log('==============================================');
		}
		
		// Log SWB_Families for all users to debug - CRITICAL for access control
		const swbNormalized = normalizePermissionForAPI(swbFamiliesValue);
		const swbFinal = isSuperUserValue ? true : (swbNormalized ?? false);
		console.log(`=== SWB_Families ACCESS CONTROL DEBUG for ${user.USER_ID} ===`);
		console.log('Field key found:', swbFieldKey);
		console.log('Raw SWB_Families from DB:', swbFamiliesValue, `(type: ${typeof swbFamiliesValue})`);
		console.log('After normalization:', swbNormalized);
		console.log('Is Super User:', isSuperUserValue);
		console.log('FINAL SWB_Families value in userProfile:', swbFinal);
		console.log(swbFinal ? '✅ ACCESS GRANTED' : '❌ ACCESS DENIED');
		console.log('==================================================');
		
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
			// Convert null to false for consistency (null means no permission, which is false)
			BaselineQOL: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).BaselineQOL) ?? false),
			Dashboard: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Dashboard) ?? false),
			PowerBI: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).PowerBI) ?? false),
			Family_Development_Plan: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Family_Development_Plan) ?? false),
			Family_Approval_CRC: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Family_Approval_CRC) ?? false),
			Family_Income: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Family_Income) ?? false),
			ROP: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).ROP) ?? false),
			Setting: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Setting) ?? false),
			Other: isSuperUserValue ? true : (normalizePermissionForAPI((user as any).Other) ?? false),
			// SWB_Families: If value is 1 or true, grant access. Super users always have access.
			// normalizePermissionForAPI converts: 1 -> true, true -> true, 0/false/null -> false
			SWB_Families: isSuperUserValue ? true : (normalizePermissionForAPI(swbFamiliesValue) ?? false),
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

