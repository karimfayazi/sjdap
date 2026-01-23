import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperUser, normalizePermission } from "@/lib/auth-utils";
import { getAllowedPermissionIds, getUserAllowedPermissions } from "@/lib/permission-service";
import { isSuperAdmin } from "@/lib/rbac-utils";
import { getUserIdFromNextRequest } from "@/lib/auth";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
	// Log all request cookies for debugging
	const allCookies = request.cookies.getAll();
	console.log('[user-profile:API] All cookies:', allCookies.map(c => ({ name: c.name, value: c.value?.substring(0, 50) + '...' })));
	
	try {
		// Log raw cookie for debugging
		const authCookie = request.cookies.get("auth");
		console.log('[user-profile:API] Raw auth cookie:', authCookie?.value || 'NOT FOUND');
		console.log('[user-profile:API] Auth cookie exists:', !!authCookie);
		console.log('[user-profile:API] Auth cookie value length:', authCookie?.value?.length || 0);
		
		// Use robust userId extraction that handles URL encoding
		let userId: string | null;
		try {
			userId = getUserIdFromNextRequest(request);
			console.log('[user-profile:API] Extracted userId:', userId);
		} catch (parseError: any) {
			console.error('[user-profile:API] Error parsing userId from cookie:', {
				error: parseError?.message,
				stack: parseError?.stack,
				cookieValue: authCookie?.value
			});
			return NextResponse.json(
				{ 
					success: false, 
					error: "Not authenticated",
					message: "Invalid session cookie format"
				},
				{ status: 401 }
			);
		}
		
		if (!userId || userId.trim() === '') {
			console.error('[user-profile:API] No userId extracted - returning 401', {
				hasAuthCookie: !!authCookie,
				cookieValue: authCookie?.value || null,
				cookieValueLength: authCookie?.value?.length || 0
			});
			return NextResponse.json(
				{ 
					success: false, 
					error: "Not authenticated",
					message: "Unauthorized - Invalid or missing session"
				},
				{ status: 401 }
			);
		}

		// Get database connection - wrap in try-catch to handle connection errors
		let pool;
		try {
			pool = await getDb();
			console.log('[user-profile:API] Database connection established');
		} catch (dbError: any) {
			console.error('[user-profile:API] Database connection error:', {
				error: dbError?.message,
				stack: dbError?.stack,
				userId: userId
			});
			return NextResponse.json(
				{
					success: false,
					error: "Database connection failed",
					message: "Unable to connect to database. Please try again later."
				},
				{ status: 503 }
			);
		}

		const request_query = pool.request();
		
		// Handle both numeric UserId and string email_address
		// Try to parse userId as number first, if it fails, treat as string (email)
		let userIdNum: number | null = null;
		try {
			if (!isNaN(Number(userId)) && userId.trim() !== '') {
				userIdNum = parseInt(userId, 10);
				if (isNaN(userIdNum) || userIdNum <= 0) {
					userIdNum = null;
				}
			}
		} catch (parseError: any) {
			console.warn('[user-profile:API] Error parsing userId as number, treating as string:', parseError?.message);
			userIdNum = null;
		}
		
		if (userIdNum !== null && userIdNum > 0) {
			request_query.input("user_id", userIdNum);
		} else {
			request_query.input("user_id", userId);
		}
		request_query.input("email_address", userId);
		(request_query as any).timeout = 120000;
		
		console.log('[user-profile:API] Querying user:', {
			userId: userId,
			userIdNum: userIdNum,
			queryType: userIdNum !== null ? 'numeric' : 'string',
			queryParams: {
				user_id: userIdNum !== null ? userIdNum : userId,
				email_address: userId
			}
		});
		
		// Select only columns that exist in the table (permission columns have been removed)
		// Using ISNULL to handle potential NULL values gracefully
		let result;
		try {
			result = await request_query.query(
				`SELECT TOP(1) 
					[UserId],
					[email_address],
					ISNULL([UserFullName], '') AS [UserFullName],
					[Password],
					ISNULL([UserType], '') AS [UserType],
					ISNULL([Designation], '') AS [Designation],
					ISNULL([Regional_Council], '') AS [Regional_Council],
					ISNULL([Local_Council], '') AS [Local_Council],
					[user_create_date],
					[user_update_date],
					ISNULL([AccessScope], '') AS [AccessScope]
				FROM [SJDA_Users].[dbo].[PE_User] 
				WHERE ([UserId] = @user_id OR [email_address] = @email_address)`
			);
		} catch (queryError: any) {
			console.error('[user-profile] Database query error, trying fallback query:', {
				error: queryError,
				message: queryError?.message,
				code: queryError?.code,
				number: queryError?.number,
				userId: userId
			});
			
			// Try a simpler fallback query with only essential columns
			try {
				const fallbackRequest = pool.request();
				if (userIdNum !== null && userIdNum > 0) {
					fallbackRequest.input("user_id", userIdNum);
				} else {
					fallbackRequest.input("user_id", userId);
				}
				fallbackRequest.input("email_address", userId);
				(fallbackRequest as any).timeout = 120000;
				
				result = await fallbackRequest.query(
					`SELECT TOP(1) 
						[UserId],
						[email_address],
						[UserFullName],
						[UserType]
					FROM [SJDA_Users].[dbo].[PE_User] 
					WHERE ([UserId] = @user_id OR [email_address] = @email_address)`
				);
				console.log('[user-profile] Fallback query succeeded');
			} catch (fallbackError: any) {
				console.error('[user-profile] Fallback query also failed:', fallbackError);
				throw queryError; // Throw original error
			}
		}

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
		const userType = (user.UserType && typeof user.UserType === 'string') ? user.UserType.trim() : '';
		const isSuperAdminByType = userType === 'Super Admin';
		const isAdminUserType = userType && userType.length > 0 ? userType.toLowerCase() === 'admin' : false;
		const userIdentifier = user.UserId || user.email_address || '';
		const isAdminByIdentifier = userIdentifier && typeof userIdentifier === 'string' && userIdentifier.toLowerCase() === 'admin';
		const isAdmin = isSuperAdminByType || isAdminUserType || isAdminByIdentifier;
		
		// Debug logging for Super Admin detection
		if (isSuperAdminByType) {
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
		
		// Ensure UserType is properly set - handle null, undefined, and trim whitespace
		const userTypeValue = user.UserType 
			? (typeof user.UserType === 'string' ? user.UserType.trim() : String(user.UserType).trim())
			: null;
		
		console.log('[user-profile] UserType mapping:', {
			rawUserType: user.UserType,
			userTypeValue: userTypeValue,
			userId: user.UserId,
			email: user.email_address
		});
		
		// Get user's allowed permissions from PE_Rights_UserPermission (SINGLE SOURCE OF TRUTH)
		const userIdForPerms = user.UserId || user.email_address;
		
		let isSuperAdminUser = false;
		let allowedPermissionIds: any[] = [];
		let allowedPermissions: any[] = [];
		
		try {
			isSuperAdminUser = await isSuperAdmin(userIdForPerms);
			console.log('[user-profile:API] Super admin check result:', isSuperAdminUser);
			
			if (!isSuperAdminUser) {
				try {
					allowedPermissionIds = await getAllowedPermissionIds(userIdForPerms);
					allowedPermissions = await getUserAllowedPermissions(userIdForPerms);
				} catch (permError: any) {
					console.error('[user-profile:API] Error fetching permissions:', {
						error: permError?.message,
						stack: permError?.stack,
						userId: userIdForPerms
					});
					// Continue with empty permissions - don't fail the request
					allowedPermissionIds = [];
					allowedPermissions = [];
				}
			}
		} catch (superAdminError: any) {
			console.error('[user-profile:API] Error checking super admin status:', {
				error: superAdminError?.message,
				stack: superAdminError?.stack,
				userId: userIdForPerms
			});
			// Continue with default values - don't fail the request
			isSuperAdminUser = false;
			allowedPermissionIds = [];
			allowedPermissions = [];
		}
		
		console.log('[user-profile:API] Permission check:', {
			userId: userIdForPerms,
			isSuperAdmin: isSuperAdminUser,
			allowedPermissionIds: allowedPermissionIds,
			allowedPermissionsCount: allowedPermissions.length
		});
		
		// Build section access based on actual permissions
		// Check if user has any permission for routes in each section
		const hasRouteInSection = (routePrefix: string): boolean => {
			if (isSuperAdminUser) return true;
			return allowedPermissions.some(p => p.RoutePath.startsWith(routePrefix));
		};
		
		// Safely get user fields with fallbacks for missing columns
		const userProfile = {
			username: user.UserId || user.email_address || "",
			email: user.email_address || user.UserId || "",
			full_name: (user.UserFullName !== undefined && user.UserFullName !== null) ? user.UserFullName : null,
			department: null, // PE_User doesn't have PROGRAM field
			region: null, // PE_User doesn't have REGION field
			address: null,
			contact_no: null,
			access_level: userTypeValue,
			active: isActive, // All users are active
			access_add: null, // PE_User doesn't have CAN_ADD field
			access_edit: null, // PE_User doesn't have CAN_UPDATE field
			access_delete: null, // PE_User doesn't have CAN_DELETE field
			access_reports: null, // PE_User doesn't have SEE_REPORTS field
			section: null, // PE_User doesn't have SECTION field
			supper_user: isSuperAdminUser ? 'Yes' : null, // Only Super Admin has full access
			access_loans: hasRouteInSection('/dashboard/finance') ? 1 : 0,
			bank_account: hasRouteInSection('/dashboard/finance/bank-information') ? 1 : 0,
			// Section access based on actual permissions from PE_Rights_UserPermission
			BaselineQOL: hasRouteInSection('/dashboard/baseline-qol'),
			Dashboard: hasRouteInSection('/dashboard'),
			PowerBI: false, // Not implemented yet
			Family_Development_Plan: hasRouteInSection('/dashboard/family-development-plan'),
			Family_Income: hasRouteInSection('/dashboard/family-income'),
			ROP: hasRouteInSection('/dashboard/rops'),
			Setting: hasRouteInSection('/dashboard/settings'),
			Other: hasRouteInSection('/dashboard/others'),
			SWB_Families: hasRouteInSection('/dashboard/swb-families'),
			ActualIntervention: hasRouteInSection('/dashboard/actual-intervention'),
			FinanceSection: hasRouteInSection('/dashboard/finance'),
			BankInformation: hasRouteInSection('/dashboard/finance/bank-information'),
			BaselineApproval: hasRouteInSection('/dashboard/approval-section/baseline-approval'),
			FeasibilityApproval: hasRouteInSection('/dashboard/feasibility-approval'),
			FdpApproval: hasRouteInSection('/dashboard/approval-section/family-development-plan-approval'),
			InterventionApproval: hasRouteInSection('/dashboard/approval-section/intervention-approval'),
			BankAccountApproval: hasRouteInSection('/dashboard/approval-section/bank-account-approval'),
			// Include permission metadata for debugging (only in dev)
			...(process.env.NODE_ENV === 'development' ? {
				_allowedPermissionIds: allowedPermissionIds,
				_allowedPermissions: allowedPermissions,
			} : {}),
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
				// Removed: Active, Setting, SwbFamilies, ActualIntervention, FinanceSection, BankInformation, BaselineApproval, FeasibilityApproval, FdpApproval, InterventionApproval, BankAccountApproval, Baseline, FamilyDevelopmentPlan, ROPs, FamilyIncome
			};
			
			// Debug: Log all keys from the raw user object to verify all fields are included
			console.log('[user-profile] Raw user data keys:', Object.keys(response.rawUser));
			console.log('[user-profile] Raw user data (first 500 chars):', JSON.stringify(response.rawUser).substring(0, 500));
		}

		return NextResponse.json(response);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		
		// Log full error details for debugging
		console.error("[user-profile:API] UNEXPECTED ERROR - Full error details:", {
			message: errorMessage,
			stack: errorStack,
			error: error,
			errorName: error instanceof Error ? error.name : typeof error,
			errorType: typeof error
		});
		
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError") ||
			errorMessage.includes("Connection is closed");

		const isTimeoutError = 
			errorMessage.includes("Timeout") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("Request failed to complete");

		const isSqlError = 
			errorMessage.includes("Invalid column name") ||
			errorMessage.includes("Invalid object name") ||
			errorMessage.includes("SQL") ||
			(error as any)?.number !== undefined;

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

		// Return more detailed error for SQL errors to help debugging
		if (isSqlError) {
			return NextResponse.json(
				{
					success: false,
					message: "Database error: " + errorMessage,
					error: errorMessage,
					debug: {
						errorType: "SQL Error",
						errorNumber: (error as any)?.number,
						errorState: (error as any)?.state,
						errorClass: (error as any)?.class
					}
				},
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error fetching user profile: " + errorMessage,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}

