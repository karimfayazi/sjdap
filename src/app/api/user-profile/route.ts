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
		// Explicitly select all columns including ROPs to ensure correct case handling
		// Use alias for ROPs to ensure consistent field name
		const result = await request_query.query(
			`SELECT TOP(1) 
				[UserId],
				[email_address],
				[UserFullName],
				[Password],
				[UserType],
				[Designation],
				[Active],
				[Regional_Council],
				[Local_Council],
				[Setting],
				[SwbFamilies],
				[ActualIntervention],
				[FinanceSection],
				[BankInformation],
				[BaselineApproval],
				[FeasibilityApproval],
				[FdpApproval],
				[InterventionApproval],
				[BankAccountApproval],
				[user_create_date],
				[user_update_date],
				[AccessScope],
				[Baseline],
				[FamilyDevelopmentPlan],
				[ROPs],
				[FamilyIncome]
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
		
		// Debug: Log all keys from database result to verify ROPs field name
		console.log('[user-profile] Database result keys:', Object.keys(user));
		const ropsKeys = Object.keys(user).filter(k => k.toLowerCase().includes('rop'));
		if (ropsKeys.length > 0) {
			console.log('[user-profile] ROPs-related keys in database result:', ropsKeys);
			ropsKeys.forEach(key => {
				console.log(`[user-profile] ${key} value:`, (user as any)[key], `type:`, typeof (user as any)[key]);
			});
		} else {
			console.log('[user-profile] WARNING: No ROPs-related keys found in database result!');
		}
		
		// Debug logging for specific user
		if (userId === 'barkat.ebrahim@sjdap.org' || user.email_address === 'barkat.ebrahim@sjdap.org') {
			console.log('=== DATABASE RAW DATA FOR barkat.ebrahim@sjdap.org ===');
			console.log('All user fields:', Object.keys(user));
			console.log('=========================================================');
		}

		// Map database fields to UserProfile type
		// Note: PE_User table has different structure, so we'll map available fields
		// Check if UserType is 'Super Admin' or 'Admin' - Super Admin users have full access to all sections
		const userType = user.UserType && typeof user.UserType === 'string' ? user.UserType.trim() : '';
		const isSuperAdmin = userType === 'Super Admin';
		const isAdminUserType = userType.toLowerCase() === 'admin';
		const userIdentifier = user.UserId || user.email_address;
		const isAdminByIdentifier = userIdentifier && userIdentifier.toLowerCase() === 'admin';
		const isAdmin = isSuperAdmin || isAdminUserType || isAdminByIdentifier;
		
		// Set supper_user to 'Yes' if admin or super admin, otherwise null
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
		// Database now uses VARCHAR(3) with "Yes"/"No" values
		let bankAccountValue: number = 0;
		if (user.BankAccountApproval !== null && user.BankAccountApproval !== undefined) {
			if (typeof user.BankAccountApproval === 'string') {
				const trimmed = user.BankAccountApproval.trim();
				const lowerTrimmed = trimmed.toLowerCase();
				// Check for "Yes" (new format) or legacy "1"/"true"
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

		// Super Admin users (UserType='Super Admin') get full access to ALL sections
		const isSuperUserValue = isSuperAdmin;
		
		// Get all permission field values from database
		// All fields from SQL: Setting, SwbFamilies, ActualIntervention, FinanceSection, 
		// BankInformation, BaselineApproval, FeasibilityApproval, FdpApproval, 
		// InterventionApproval, BankAccountApproval, Baseline, FamilyDevelopmentPlan, 
		// ROPs, FamilyIncome, AccessScope
		// Note: Handle case-insensitive access for SQL Server column names
		
		// Declare userAny once at the top of the scope to avoid duplicate declarations
		const userAny = user as any;
		
		const getUserField = (fieldName: string) => {
			// Try exact case first, then try common variations
			if (userAny[fieldName] !== undefined) return userAny[fieldName];
			if (userAny[fieldName.toLowerCase()] !== undefined) return userAny[fieldName.toLowerCase()];
			if (userAny[fieldName.toUpperCase()] !== undefined) return userAny[fieldName.toUpperCase()];
			// Try to find by case-insensitive match in object keys
			const keys = Object.keys(userAny);
			const matchedKey = keys.find(k => k.toLowerCase() === fieldName.toLowerCase());
			if (matchedKey) return userAny[matchedKey];
			return null;
		};
		
		// Get Setting field - SQL Server BIT fields can return as boolean true/false or number 1/0
		// Try multiple approaches to handle SQL Server case sensitivity and data type variations
		let settingRaw = userAny.Setting ?? userAny.setting ?? userAny.SETTING;
		if (settingRaw === null || settingRaw === undefined) {
			settingRaw = getUserField("Setting");
		}
		
		// Debug logging for Setting field - especially for the specific user
		if (userId === 'karim.fayazi@sjdap.org' || user.email_address === 'karim.fayazi@sjdap.org') {
			console.log('[user-profile] === SETTING FIELD DEBUG FOR karim.fayazi@sjdap.org ===');
			console.log('[user-profile] All user object keys:', Object.keys(user));
			console.log('[user-profile] Setting field variations:', {
				'Setting (exact)': userAny.Setting,
				'setting (lower)': userAny.setting,
				'SETTING (upper)': userAny.SETTING,
				'getUserField("Setting") result': getUserField("Setting"),
				'final settingRaw': settingRaw,
				'settingRaw type': typeof settingRaw,
				'settingRaw value': settingRaw,
				'settingRaw === 1': settingRaw === 1,
				'settingRaw === true': settingRaw === true,
				'settingRaw === "1"': settingRaw === "1",
				'normalizePermission(settingRaw)': normalizePermission(settingRaw)
			});
		}
		const swbFamiliesRaw = getUserField("SwbFamilies");
		const actualInterventionRaw = getUserField("ActualIntervention");
		const financeSectionRaw = getUserField("FinanceSection");
		const bankInformationRaw = getUserField("BankInformation");
		const baselineApprovalRaw = getUserField("BaselineApproval");
		const feasibilityApprovalRaw = getUserField("FeasibilityApproval");
		const fdpApprovalRaw = getUserField("FdpApproval");
		const interventionApprovalRaw = getUserField("InterventionApproval");
		const bankAccountApprovalRaw = getUserField("BankAccountApproval");
		// Get Baseline field - SQL Server BIT fields can return as boolean true/false or number 1/0
		// Try multiple approaches to handle SQL Server case sensitivity and data type variations
		let baselineRaw = userAny.Baseline ?? userAny.baseline ?? userAny.BASELINE;
		if (baselineRaw === null || baselineRaw === undefined) {
			baselineRaw = getUserField("Baseline");
		}
		
		// Additional debug: Log Baseline field for all users to help diagnose
		console.log('[user-profile] Baseline field retrieval:', {
			userId: userId,
			email: user.email_address,
			directBaseline: userAny.Baseline,
			baselineRaw: baselineRaw,
			baselineRawType: typeof baselineRaw,
			normalized: normalizePermission(baselineRaw),
			allKeys: Object.keys(user).filter(k => k.toLowerCase().includes('baseline'))
		});
		const familyDevPlanRaw = getUserField("FamilyDevelopmentPlan");
		// Try ROPs with different case variations - this is critical for ROPs field
		// Try multiple variations to handle SQL Server case sensitivity
		// Direct access first, then fallback to helper function
		// Note: userAny is already defined above, reuse it
		let ropsRaw = userAny.ROPs ?? userAny.Rops ?? userAny.rops ?? userAny.ROP ?? userAny.rop;
		if (ropsRaw === null || ropsRaw === undefined) {
			// Try using helper function as fallback
			ropsRaw = getUserField("ROPs") || getUserField("Rops") || getUserField("rops") || getUserField("ROP") || getUserField("rop");
		}
		const familyIncomeRaw = getUserField("FamilyIncome");
		const accessScopeRaw = getUserField("AccessScope");
		
		// Debug: Log all available keys to help identify the exact field name for ROPs
		if (typeof user === 'object' && user !== null) {
			const allKeys = Object.keys(user as any);
			const ropsRelatedKeys = allKeys.filter(k => k.toLowerCase().includes('rop'));
			console.log('[user-profile] All user keys:', allKeys);
			if (ropsRelatedKeys.length > 0) {
				console.log('[user-profile] ROPs-related keys found:', ropsRelatedKeys);
				console.log('[user-profile] ROPs field values from all variations:', {
					ROPs: (user as any).ROPs,
					Rops: (user as any).Rops,
					rops: (user as any).rops,
					ROP: (user as any).ROP,
					rop: (user as any).rop,
					finalValue: ropsRaw
				});
			} else {
				console.log('[user-profile] WARNING: No ROPs-related keys found in user object!');
			}
		}
		
		// Debug: Log the raw database values for permission fields
		// Note: SQL Server BIT fields can return as boolean true/false or number 1/0
		// The normalizePermission function handles both cases
		console.log('[user-profile] Permission field values:', {
			Setting: { raw: settingRaw, type: typeof settingRaw, normalized: normalizePermission(settingRaw) },
			SwbFamilies: { raw: swbFamiliesRaw, type: typeof swbFamiliesRaw, normalized: normalizePermission(swbFamiliesRaw) },
			ActualIntervention: { raw: actualInterventionRaw, type: typeof actualInterventionRaw, normalized: normalizePermission(actualInterventionRaw) },
			FinanceSection: { raw: financeSectionRaw, type: typeof financeSectionRaw, normalized: normalizePermission(financeSectionRaw) },
			BankInformation: { raw: bankInformationRaw, type: typeof bankInformationRaw, normalized: normalizePermission(bankInformationRaw) },
			BaselineApproval: { raw: baselineApprovalRaw, type: typeof baselineApprovalRaw, normalized: normalizePermission(baselineApprovalRaw) },
			FeasibilityApproval: { raw: feasibilityApprovalRaw, type: typeof feasibilityApprovalRaw, normalized: normalizePermission(feasibilityApprovalRaw) },
			FdpApproval: { raw: fdpApprovalRaw, type: typeof fdpApprovalRaw, normalized: normalizePermission(fdpApprovalRaw) },
			InterventionApproval: { raw: interventionApprovalRaw, type: typeof interventionApprovalRaw, normalized: normalizePermission(interventionApprovalRaw) },
			BankAccountApproval: { raw: bankAccountApprovalRaw, type: typeof bankAccountApprovalRaw, normalized: normalizePermission(bankAccountApprovalRaw) },
			Baseline: { raw: baselineRaw, type: typeof baselineRaw, normalized: normalizePermission(baselineRaw), note: 'This maps to BaselineQOL in userProfile' },
			FamilyDevelopmentPlan: { raw: familyDevPlanRaw, type: typeof familyDevPlanRaw, normalized: normalizePermission(familyDevPlanRaw) },
			ROPs: { raw: ropsRaw, type: typeof ropsRaw, normalized: normalizePermission(ropsRaw), note: 'This maps to ROP in userProfile' },
			FamilyIncome: { raw: familyIncomeRaw, type: typeof familyIncomeRaw, normalized: normalizePermission(familyIncomeRaw) },
			AccessScope: { raw: accessScopeRaw, type: typeof accessScopeRaw, normalized: normalizePermission(accessScopeRaw) },
		});
		
		// Map all SQL permission fields to userProfile
		// If field value = 1 or true, user has access; if 0 or false, user does not have access
		// Super Admin users get access to ALL sections regardless of individual permissions
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
			access_loans: isSuperUserValue ? 1 : accessLoansValue, // Super Admin users have access to loans
			bank_account: isSuperUserValue ? 1 : bankAccountValue, // Super Admin users have access to bank accounts
			// Map database columns to application sections
			// If field value = 1 or true, user has access; if 0 or false, user does not have access
			BaselineQOL: (() => {
				// If Super Admin, grant access
				if (isSuperUserValue) {
					return true;
				}
				// Normalize the Baseline field value
				// SQL Server BIT can return as: boolean true/false, number 1/0, or string "1"/"0"
				const normalized = normalizePermission(baselineRaw);
				console.log('[user-profile] BaselineQOL mapping:', {
					userId: userId,
					email: user.email_address,
					baselineRaw: baselineRaw,
					baselineRawType: typeof baselineRaw,
					normalized: normalized,
					isSuperUser: isSuperUserValue,
					finalBaselineQOL: normalized
				});
				return normalized;
			})(), // Baseline -> BaselineQOL (handles boolean true/false or number 1/0)
			Dashboard: isSuperUserValue ? true : null, // Super Admin users have access to Dashboard
			PowerBI: isSuperUserValue ? true : null, // Super Admin users have access to PowerBI
			Family_Development_Plan: isSuperUserValue ? true : normalizePermission(familyDevPlanRaw), // FamilyDevelopmentPlan -> Family_Development_Plan
			Family_Approval_CRC: isSuperUserValue ? true : null, // Super Admin users have access
			Family_Income: isSuperUserValue ? true : normalizePermission(familyIncomeRaw), // FamilyIncome -> Family_Income
			ROP: (() => {
				// If Super Admin, grant access
				if (isSuperUserValue) {
					console.log('[user-profile] ROPs: Super Admin - granting access');
					return true;
				}
				// Normalize the ROPs field value (1 = access, 0/null = no access)
				const normalized = normalizePermission(ropsRaw);
				console.log('[user-profile] ROPs permission check:', {
					rawValue: ropsRaw,
					rawType: typeof ropsRaw,
					normalized: normalized,
					isSuperUser: isSuperUserValue,
					finalAccess: normalized,
					note: 'If ROPs = 1 in database, user should have access. If 0 or null, no access.'
				});
				return normalized;
			})(), // ROPs -> ROP (if ROPs = 1 in database, user has access)
			Setting: (() => {
				// If Super Admin, grant access
				if (isSuperUserValue) {
					return true;
				}
				// Normalize the Setting field value
				// Database now uses VARCHAR(3) with "Yes"/"No" values
				// normalizePermission handles: "Yes" -> true, "No" -> false
				const normalized = normalizePermission(settingRaw);
				// Debug logging for all users to help troubleshoot
				console.log('[user-profile] Setting permission mapping:', {
					userId: userId,
					email: user.email_address,
					settingRaw: settingRaw,
					settingRawType: typeof settingRaw,
					normalized: normalized,
					isSuperUser: isSuperUserValue,
					finalSetting: normalized,
					note: 'If Setting = "Yes" in database, user should have access. If "No" or null, no access.'
				});
				return normalized;
			})(), // Setting field - "Yes" = access granted, "No" = access denied
			Other: isSuperUserValue ? true : null, // Super Admin users have access
			SWB_Families: isSuperUserValue ? true : normalizePermission(swbFamiliesRaw), // SwbFamilies -> SWB_Families
			ActualIntervention: isSuperUserValue ? true : normalizePermission(actualInterventionRaw), // ActualIntervention field
			FinanceSection: isSuperUserValue ? true : normalizePermission(financeSectionRaw), // FinanceSection field
			BankInformation: isSuperUserValue ? true : normalizePermission(bankInformationRaw), // BankInformation field
			BaselineApproval: isSuperUserValue ? true : normalizePermission(baselineApprovalRaw), // BaselineApproval field
			FeasibilityApproval: isSuperUserValue ? true : normalizePermission(feasibilityApprovalRaw), // FeasibilityApproval field
			FdpApproval: isSuperUserValue ? true : normalizePermission(fdpApprovalRaw), // FdpApproval field
			InterventionApproval: isSuperUserValue ? true : normalizePermission(interventionApprovalRaw), // InterventionApproval field
			BankAccountApproval: isSuperUserValue ? true : normalizePermission(bankAccountApprovalRaw), // BankAccountApproval field
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
				Baseline: userAny.Baseline ?? userAny.baseline ?? getUserField("Baseline") ?? null,
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

