import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId") || "";
		const fullName = searchParams.get("fullName") || "";
		const userType = searchParams.get("userType") || "";
		const designation = searchParams.get("designation") || "";
		const program = searchParams.get("program") || "";
		const region = searchParams.get("region") || "";
		const area = searchParams.get("area") || "";
		const section = searchParams.get("section") || "";
		const active = searchParams.get("active") || "";
		const bankAccount = searchParams.get("bankAccount") || "";

		const pool = await getDb();
		
		// Build dynamic query with filters (permission columns have been removed)
		let query = `
			SELECT TOP (1000) 
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
			WHERE 1=1
		`;

		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		if (userId) {
			query += " AND ([UserId] LIKE @userId OR [email_address] LIKE @userId)";
			request_query.input("userId", `%${userId}%`);
		}

		if (fullName) {
			query += " AND [UserFullName] LIKE @fullName";
			request_query.input("fullName", `%${fullName}%`);
		}

		if (userType) {
			query += " AND [UserType] = @userType";
			request_query.input("userType", userType);
		}

		if (designation) {
			query += " AND [Designation] LIKE @designation";
			request_query.input("designation", `%${designation}%`);
		}

		if (active !== "") {
			query += " AND [Active] = @active";
			request_query.input("active", active === "true" ? 1 : 0);
		}

		if (bankAccount === "Yes" || bankAccount === "true") {
			query += " AND ([BankAccountApproval] = 1 OR [BankAccountApproval] = 'Yes' OR [BankAccountApproval] = '1')";
		}

		query += " ORDER BY [UserId]";

		const result = await request_query.query(query);
		const users = result.recordset || [];

		// Fetch regional councils for each user from PE_User_RegionalCouncilAccess
		const usersWithRegionalCouncils = await Promise.all(
			users.map(async (user: any) => {
				const userId = user.UserId || user.email_address;
				if (!userId) return { ...user, RegionalCouncils: [] };

				try {
					const rcRequest = pool.request();
					(rcRequest as any).timeout = 120000;
					rcRequest.input("userId", userId);

					const rcQuery = `
						SELECT 
							ura.[RegionalCouncilId],
							rc.[RegionalCouncilCode],
							rc.[RegionalCouncilName]
						FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
						INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc
							ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId]
						WHERE ura.[UserId] = @userId
						ORDER BY rc.[RegionalCouncilName]
					`;

					const rcResult = await rcRequest.query(rcQuery);
					const regionalCouncils = (rcResult.recordset || []).map((rc: any) => ({
						RegionalCouncilId: rc.RegionalCouncilId,
						RegionalCouncilCode: rc.RegionalCouncilCode,
						RegionalCouncilName: rc.RegionalCouncilName
					}));

					return {
						...user,
						RegionalCouncils: regionalCouncils
					};
				} catch (error) {
					console.error(`Error fetching regional councils for user ${userId}:`, error);
					return { ...user, RegionalCouncils: [] };
				}
			})
		);

		return NextResponse.json({
			success: true,
			users: usersWithRegionalCouncils
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		
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
				message: "Error fetching users: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const currentUserId = authCookie.value.split(":")[1];
		if (!currentUserId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();

		// ALL USERS CAN CREATE USERS - NO PERMISSION CHECKS

		const data = await request.json();

		// Basic validation - use email_address as primary identifier
		if (!data.email_address || !data.UserFullName || !data.Password || !data.UserType) {
			return NextResponse.json(
				{ success: false, message: "email_address, UserFullName, Password, and UserType are required." },
				{ status: 400 }
			);
		}

		// Helper function to convert boolean/number to "Yes" or "No"
		// Database fields are now VARCHAR(3) with "Yes"/"No" values
		const toBoolValue = (val: any): string => {
			if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return "Yes";
			if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return "No";
			return "No"; // Default to "No" for null/undefined/unknown values
		};

		const insertReq = pool.request();
		(insertReq as any).timeout = 120000;

		// Generate UserId if not provided (use email_address or generate one)
		const userId = data.UserId || data.email_address || `user_${Date.now()}`;
		
		insertReq.input("UserId", userId);
		insertReq.input("email_address", data.email_address);
		insertReq.input("UserFullName", data.UserFullName);
		insertReq.input("Password", data.Password);
		insertReq.input("UserType", data.UserType);
		insertReq.input("Designation", data.Designation || null);
		insertReq.input("Active", toBoolValue(data.Active));
		insertReq.input("Regional_Council", data.Regional_Council || data.RC || null);
		insertReq.input("Local_Council", data.Local_Council || data.LC || null);
		insertReq.input("AccessScope", data.AccessScope || null);
		insertReq.input("Setting", toBoolValue(data.Setting));
		insertReq.input("SwbFamilies", toBoolValue(data.SwbFamilies));
		insertReq.input("ActualIntervention", toBoolValue(data.ActualIntervention));
		insertReq.input("FinanceSection", toBoolValue(data.FinanceSection));
		insertReq.input("BankInformation", toBoolValue(data.BankInformation));
		insertReq.input("BaselineApproval", toBoolValue(data.BaselineApproval));
		insertReq.input("FeasibilityApproval", toBoolValue(data.FeasibilityApproval));
		insertReq.input("FdpApproval", toBoolValue(data.FdpApproval));
		insertReq.input("InterventionApproval", toBoolValue(data.InterventionApproval));
		insertReq.input("BankAccountApproval", toBoolValue(data.BankAccountApproval));
		insertReq.input("Baseline", toBoolValue(data.Baseline));
		insertReq.input("FamilyDevelopmentPlan", toBoolValue(data.FamilyDevelopmentPlan));
		insertReq.input("ROPs", toBoolValue(data.ROPs));
		insertReq.input("FamilyIncome", toBoolValue(data.FamilyIncome));

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_User] (
				[UserId],
				[email_address],
				[UserFullName],
				[Password],
				[UserType],
				[Designation],
				[Active],
				[Regional_Council],
				[Local_Council],
				[AccessScope],
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
				[Baseline],
				[FamilyDevelopmentPlan],
				[ROPs],
				[FamilyIncome],
				[user_create_date],
				[user_update_date]
			)
			VALUES (
				@UserId,
				@email_address,
				@UserFullName,
				@Password,
				@UserType,
				@Designation,
				@Active,
				@Regional_Council,
				@Local_Council,
				@AccessScope,
				@Setting,
				@SwbFamilies,
				@ActualIntervention,
				@FinanceSection,
				@BankInformation,
				@BaselineApproval,
				@FeasibilityApproval,
				@FdpApproval,
				@InterventionApproval,
				@BankAccountApproval,
				@Baseline,
				@FamilyDevelopmentPlan,
				@ROPs,
				@FamilyIncome,
				GETDATE(),
				GETDATE()
			)
		`;

		await insertReq.query(insertQuery);

		// Handle multiple regional councils if provided
		if (data.RegionalCouncils && Array.isArray(data.RegionalCouncils) && data.RegionalCouncils.length > 0) {
			try {
				// Delete any existing regional council access for this user (in case of duplicates)
				const deleteReq = pool.request();
				(deleteReq as any).timeout = 120000;
				deleteReq.input("userId", userId);
				await deleteReq.query(`
					DELETE FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess]
					WHERE [UserId] = @userId
				`);

				// Insert new regional council access
				for (const rcId of data.RegionalCouncils) {
					if (rcId) {
						const rcInsertReq = pool.request();
						(rcInsertReq as any).timeout = 120000;
						rcInsertReq.input("userId", userId);
						rcInsertReq.input("regionalCouncilId", rcId);
						
						await rcInsertReq.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ([UserId], [RegionalCouncilId])
							VALUES (@userId, @regionalCouncilId)
						`);
					}
				}
			} catch (rcError) {
				console.error("Error inserting regional council access:", rcError);
				// Don't fail the entire request if regional council insertion fails
			}
		}

		return NextResponse.json({
			success: true,
			message: "User created successfully.",
		});
	} catch (error) {
		console.error("Error creating user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error creating user: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const currentUserId = authCookie.value.split(":")[1];
		if (!currentUserId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();

		// Check permissions of current user (must be admin)
		const permResult = await pool
			.request()
			.input("current_user_id", currentUserId)
			.input("current_email", currentUserId)
			.query(
				"SELECT TOP(1) [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @current_user_id OR [email_address] = @current_email"
			);

		const permUser = permResult.recordset?.[0];
		const userTypeLower = permUser?.UserType && typeof permUser.UserType === 'string' ? permUser.UserType.trim().toLowerCase() : '';
		const isAdmin = userTypeLower === 'admin' || userTypeLower === 'super admin';
		const isAdminByIdentifier = currentUserId && currentUserId.toLowerCase() === 'admin';

		if (!isAdmin && !isAdminByIdentifier) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin or Super Admin users can update users." },
				{ status: 403 }
			);
		}

		const data = await request.json();

		// Basic validation - use email_address or UserId
		if (!data.email_address && !data.UserId) {
			return NextResponse.json(
				{ success: false, message: "email_address or UserId is required." },
				{ status: 400 }
			);
		}

		const updateReq = pool.request();
		(updateReq as any).timeout = 120000;

		// Use email_address or UserId for lookup
		// Note: email_address should not be updated, only used for lookup
		// Check if email_address is provided and looks like an email
		const isEmailLookup = data.email_address && typeof data.email_address === 'string' && data.email_address.includes('@');
		const lookupEmail = isEmailLookup ? data.email_address : null;
		// Only use UserId if it's provided and doesn't look like an email
		const lookupUserId = (!isEmailLookup && data.UserId) ? data.UserId : null;
		
		updateReq.input("lookup_email", lookupEmail);
		updateReq.input("lookup_userid", lookupUserId);
		// Note: UserId is an IDENTITY column and cannot be updated, so we don't include it in the UPDATE
		// Note: email_address should not be updated, so we don't include it in the UPDATE
		updateReq.input("UserFullName", data.UserFullName || null);
		updateReq.input("UserType", data.UserType || null);
		updateReq.input("Designation", data.Designation || null);
		updateReq.input("Regional_Council", data.Regional_Council || data.RC || null);
		updateReq.input("Local_Council", data.Local_Council || data.LC || null);
		updateReq.input("AccessScope", data.AccessScope || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_User]
			SET
				[UserFullName] = COALESCE(@UserFullName, [UserFullName]),
				[UserType] = COALESCE(@UserType, [UserType]),
				[Designation] = COALESCE(@Designation, [Designation]),
				[Regional_Council] = COALESCE(@Regional_Council, [Regional_Council]),
				[Local_Council] = COALESCE(@Local_Council, [Local_Council]),
				[AccessScope] = COALESCE(@AccessScope, [AccessScope]),
				[user_update_date] = GETDATE()
			WHERE (@lookup_email IS NOT NULL AND [email_address] = @lookup_email)
			   OR (@lookup_userid IS NOT NULL AND [UserId] = @lookup_userid)
		`;

		const result = await updateReq.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found." },
				{ status: 404 }
			);
		}

		// Get the actual userId from the database
		const userIdReq = pool.request();
		(userIdReq as any).timeout = 120000;
		userIdReq.input("lookup_email", lookupEmail);
		userIdReq.input("lookup_userid", lookupUserId);
		
		const userIdResult = await userIdReq.query(`
			SELECT TOP(1) [UserId]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE (@lookup_email IS NOT NULL AND [email_address] = @lookup_email)
			   OR (@lookup_userid IS NOT NULL AND [UserId] = @lookup_userid)
		`);

		const actualUserId = userIdResult.recordset?.[0]?.UserId;

		// Handle multiple regional councils if provided
		if (actualUserId && data.RegionalCouncils !== undefined) {
			try {
				// Delete existing regional council access for this user
				const deleteReq = pool.request();
				(deleteReq as any).timeout = 120000;
				deleteReq.input("userId", actualUserId);
				await deleteReq.query(`
					DELETE FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess]
					WHERE [UserId] = @userId
				`);

				// Insert new regional council access if array is provided and not empty
				if (Array.isArray(data.RegionalCouncils) && data.RegionalCouncils.length > 0) {
					for (const rcId of data.RegionalCouncils) {
						if (rcId) {
							const rcInsertReq = pool.request();
							(rcInsertReq as any).timeout = 120000;
							rcInsertReq.input("userId", actualUserId);
							rcInsertReq.input("regionalCouncilId", rcId);
							
							await rcInsertReq.query(`
								INSERT INTO [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ([UserId], [RegionalCouncilId])
								VALUES (@userId, @regionalCouncilId)
							`);
						}
					}
				}
			} catch (rcError) {
				console.error("Error updating regional council access:", rcError);
				// Don't fail the entire request if regional council update fails
			}
		}

		return NextResponse.json({
			success: true,
			message: "User updated successfully.",
		});
	} catch (error) {
		console.error("Error updating user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating user: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const currentUserId = authCookie.value.split(":")[1];
		if (!currentUserId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		const pool = await getDb();

		// Check permissions of current user (must be admin)
		const permResult = await pool
			.request()
			.input("current_user_id", currentUserId)
			.input("current_email", currentUserId)
			.query(
				"SELECT TOP(1) [UserType] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @current_user_id OR [email_address] = @current_email"
			);

		const permUser = permResult.recordset?.[0];
		const userTypeLower = permUser?.UserType && typeof permUser.UserType === 'string' ? permUser.UserType.trim().toLowerCase() : '';
		const isAdmin = userTypeLower === 'admin' || userTypeLower === 'super admin';
		const isAdminByIdentifier = currentUserId && currentUserId.toLowerCase() === 'admin';

		if (!isAdmin && !isAdminByIdentifier) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin or Super Admin users can delete users." },
				{ status: 403 }
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "UserId or email_address is required." },
				{ status: 400 }
			);
		}

		// Prevent deleting yourself
		if (userId === currentUserId) {
			return NextResponse.json(
				{ success: false, message: "You cannot delete your own account." },
				{ status: 400 }
			);
		}

		const deleteReq = pool.request();
		(deleteReq as any).timeout = 120000;

		deleteReq.input("lookup_value", userId);

		const deleteQuery = `
			DELETE FROM [SJDA_Users].[dbo].[PE_User]
			WHERE [UserId] = @lookup_value OR [email_address] = @lookup_value
		`;

		const result = await deleteReq.query(deleteQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found." },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "User deleted successfully.",
		});
	} catch (error) {
		console.error("Error deleting user:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error deleting user: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

