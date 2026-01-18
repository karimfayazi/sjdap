import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperUser, normalizePermission } from "@/lib/auth-utils";

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
		// Select only columns that exist in the table (permission columns have been removed)
		const result = await request_query.query(
			`SELECT TOP(1) 
				[UserId],
				[email_address],
				[UserFullName],
				[Password],
				[UserType],
				[Designation],
				[Regional_Council],
				[Local_Council],
				[user_create_date],
				[user_update_date],
				[AccessScope]
			FROM [SJDA_Users].[dbo].[PE_User] 
			WHERE [UserId] = @user_id OR [email_address] = @email_address`
		);

		const user = result.recordset?.[0];

		if (!user) {
			console.error('[user-profile] User not found in database:', {
				userId: userId,
				queryParams: { user_id: userId, email_address: userId }
			});
			return NextResponse.json(
				{ 
					success: false, 
					message: `User not found in database. Searched for UserId or email_address: ${userId}`,
					debug: {
						searchedUserId: userId,
						recordsetLength: result.recordset?.length || 0
					}
				},
				{ status: 404 }
			);
		}
		
		// Debug: Log successful user retrieval
		console.log('[user-profile] User found in database:', {
			userId: userId,
			email: user.email_address,
			userFullName: user.UserFullName,
			userType: user.UserType
		});

		// Map database fields to UserProfile type
		// Note: PE_User table has different structure, so we'll map available fields
		// Check if UserType is 'Super Admin' or 'Admin' - Super Admin users have full access to all sections
		const userType = user.UserType && typeof user.UserType === 'string' ? user.UserType.trim() : '';
		const isSuperAdmin = userType === 'Super Admin';
		const isAdminUserType = userType.toLowerCase() === 'admin';
		const userIdentifier = user.UserId || user.email_address;
		const isAdminByIdentifier = userIdentifier && userIdentifier.toLowerCase() === 'admin';
		const isAdmin = isSuperAdmin || isAdminUserType || isAdminByIdentifier;
		
		// Debug logging for Super Admin detection
		if (isSuperAdmin) {
			console.log('[user-profile] === SUPER ADMIN DETECTED ===');
			console.log('[user-profile] UserType:', userType);
			console.log('[user-profile] Email:', user.email_address);
			console.log('[user-profile] UserId:', user.UserId);
			console.log('[user-profile] Super Admin will have access to ALL sections and pages');
		}
		
		// Active field has been removed from table - default to true (all users are active)
		const isActive = true;
		
		// Set supper_user to 'Yes' if admin or super admin, otherwise null
		let supperUserValue: string | boolean | number | null = isAdmin ? 'Yes' : null;
		
		// Permission columns have been removed - no need to check individual permissions

		// Permission columns have been removed from table - grant access to all users
		// All users now have access to all sections
		const isSuperUserValue = true; // All users are treated as having full access
		
		console.log('[user-profile] Permission columns removed - granting access to all sections for all users');
		
		// Map all fields to userProfile
		// Since permission columns have been removed, grant access to ALL sections for ALL users
		const userProfile = {
			username: user.UserId || user.email_address || "",
			email: user.email_address || user.UserId || "",
			full_name: user.UserFullName || null,
			department: null, // PE_User doesn't have PROGRAM field
			region: null, // PE_User doesn't have REGION field
			address: null,
			contact_no: null,
			access_level: user.UserType || null,
			active: isActive, // All users are active
			access_add: null, // PE_User doesn't have CAN_ADD field
			access_edit: null, // PE_User doesn't have CAN_UPDATE field
			access_delete: null, // PE_User doesn't have CAN_DELETE field
			access_reports: null, // PE_User doesn't have SEE_REPORTS field
			section: null, // PE_User doesn't have SECTION field
			supper_user: 'Yes', // All users have full access
			access_loans: 1, // All users have access to loans
			bank_account: 1, // All users have access to bank accounts
			// Grant access to ALL sections for ALL users (permission columns removed)
			BaselineQOL: true,
			Dashboard: true,
			PowerBI: true,
			Family_Development_Plan: true,
			Family_Approval_CRC: true,
			Family_Income: true,
			ROP: true,
			Setting: true,
			Other: true,
			SWB_Families: true,
			ActualIntervention: true,
			FinanceSection: true,
			BankInformation: true,
			BaselineApproval: true,
			FeasibilityApproval: true,
			FdpApproval: true,
			InterventionApproval: true,
			BankAccountApproval: true,
		};

		// Check if client wants raw user data
		const requestUrl = new URL(request.url);
		const includeRaw = requestUrl.searchParams.get('raw') === 'true';

		const response: any = {
			success: true,
			user: userProfile
		};

		// Include raw user data if requested
		if (includeRaw) {
			// Return all fields exactly as they come from the database
			// Use direct access with fallbacks for case sensitivity
			response.rawUser = {
				UserId: user.UserId,
				email_address: user.email_address,
				UserFullName: user.UserFullName,
				Password: user.Password ? '***' : null, // Don't expose password
				UserType: user.UserType,
				Designation: user.Designation,
				Regional_Council: user.Regional_Council,
				Local_Council: user.Local_Council,
				user_create_date: user.user_create_date,
				user_update_date: user.user_update_date,
				AccessScope: user.AccessScope,
				Active: user.Active,
				Setting: userAny.Setting ?? userAny.setting ?? getUserField("Setting") ?? null,
				SwbFamilies: userAny.SwbFamilies ?? userAny.swbFamilies ?? getUserField("SwbFamilies") ?? null,
				ActualIntervention: userAny.ActualIntervention ?? userAny.actualIntervention ?? getUserField("ActualIntervention") ?? null,
				FinanceSection: userAny.FinanceSection ?? userAny.financeSection ?? getUserField("FinanceSection") ?? null,
				BankInformation: userAny.BankInformation ?? userAny.bankInformation ?? getUserField("BankInformation") ?? null,
				BaselineApproval: userAny.BaselineApproval ?? userAny.baselineApproval ?? getUserField("BaselineApproval") ?? null,
				FeasibilityApproval: userAny.FeasibilityApproval ?? userAny.feasibilityApproval ?? getUserField("FeasibilityApproval") ?? null,
				FdpApproval: userAny.FdpApproval ?? userAny.fdpApproval ?? getUserField("FdpApproval") ?? null,
				InterventionApproval: userAny.InterventionApproval ?? userAny.interventionApproval ?? getUserField("InterventionApproval") ?? null,
				BankAccountApproval: userAny.BankAccountApproval ?? userAny.bankAccountApproval ?? getUserField("BankAccountApproval") ?? null,
				Baseline: baselineRaw ?? null, // Use the baselineRaw value we already retrieved with all fallbacks
				FamilyDevelopmentPlan: userAny.FamilyDevelopmentPlan ?? userAny.familyDevelopmentPlan ?? getUserField("FamilyDevelopmentPlan") ?? null,
				ROPs: ropsValue ?? null,
				FamilyIncome: userAny.FamilyIncome ?? userAny.familyIncome ?? getUserField("FamilyIncome") ?? null,
			};
			
			// Debug: Log all keys from the raw user object to verify all fields are included
			console.log('[user-profile] Raw user data keys:', Object.keys(response.rawUser));
			console.log('[user-profile] Raw user data (first 500 chars):', JSON.stringify(response.rawUser).substring(0, 500));
		}

		return NextResponse.json(response);
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

