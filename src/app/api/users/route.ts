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
		
		// Build dynamic query with filters (aligned with PE_User definition)
		// Include all permission fields for complete user management
		let query = `
			SELECT TOP (1000) 
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
				[user_update_date]
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

		return NextResponse.json({
			success: true,
			users: users
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

		// Helper function to convert boolean/number to 0 or 1
		const toBoolValue = (val: any) => {
			if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return 1;
			if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return 0;
			return 0;
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
				GETDATE(),
				GETDATE()
			)
		`;

		await insertReq.query(insertQuery);

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
		const isAdmin = permUser?.UserType && typeof permUser.UserType === 'string' && permUser.UserType.trim().toLowerCase() === 'admin';
		const isAdminByIdentifier = currentUserId && currentUserId.toLowerCase() === 'admin';

		if (!isAdmin && !isAdminByIdentifier) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin users can update users." },
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

		// Helper function to convert boolean/number to 0 or 1
		const toBoolValue = (val: any) => {
			if (val === true || val === 1 || val === "1" || val === "true" || val === "Yes" || val === "yes") return 1;
			if (val === false || val === 0 || val === "0" || val === "false" || val === "No" || val === "no") return 0;
			return 0;
		};

		// Use email_address or UserId for lookup
		const lookupValue = data.email_address || data.UserId;
		updateReq.input("lookup_value", lookupValue);
		updateReq.input("UserId", data.UserId || null);
		updateReq.input("email_address", data.email_address || null);
		updateReq.input("UserFullName", data.UserFullName || null);
		updateReq.input("UserType", data.UserType || null);
		updateReq.input("Designation", data.Designation || null);
		updateReq.input("Active", toBoolValue(data.Active));
		updateReq.input("Regional_Council", data.Regional_Council || data.RC || null);
		updateReq.input("Local_Council", data.Local_Council || data.LC || null);
		updateReq.input("Setting", toBoolValue(data.Setting));
		updateReq.input("SwbFamilies", toBoolValue(data.SwbFamilies));
		updateReq.input("ActualIntervention", toBoolValue(data.ActualIntervention));
		updateReq.input("FinanceSection", toBoolValue(data.FinanceSection));
		updateReq.input("BankInformation", toBoolValue(data.BankInformation));
		updateReq.input("BaselineApproval", toBoolValue(data.BaselineApproval));
		updateReq.input("FeasibilityApproval", toBoolValue(data.FeasibilityApproval));
		updateReq.input("FdpApproval", toBoolValue(data.FdpApproval));
		updateReq.input("InterventionApproval", toBoolValue(data.InterventionApproval));
		updateReq.input("BankAccountApproval", toBoolValue(data.BankAccountApproval));

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_User]
			SET
				[UserId] = COALESCE(@UserId, [UserId]),
				[email_address] = COALESCE(@email_address, [email_address]),
				[UserFullName] = COALESCE(@UserFullName, [UserFullName]),
				[UserType] = COALESCE(@UserType, [UserType]),
				[Designation] = COALESCE(@Designation, [Designation]),
				[Active] = COALESCE(@Active, [Active]),
				[Regional_Council] = COALESCE(@Regional_Council, [Regional_Council]),
				[Local_Council] = COALESCE(@Local_Council, [Local_Council]),
				[Setting] = COALESCE(@Setting, [Setting]),
				[SwbFamilies] = COALESCE(@SwbFamilies, [SwbFamilies]),
				[ActualIntervention] = COALESCE(@ActualIntervention, [ActualIntervention]),
				[FinanceSection] = COALESCE(@FinanceSection, [FinanceSection]),
				[BankInformation] = COALESCE(@BankInformation, [BankInformation]),
				[BaselineApproval] = COALESCE(@BaselineApproval, [BaselineApproval]),
				[FeasibilityApproval] = COALESCE(@FeasibilityApproval, [FeasibilityApproval]),
				[FdpApproval] = COALESCE(@FdpApproval, [FdpApproval]),
				[InterventionApproval] = COALESCE(@InterventionApproval, [InterventionApproval]),
				[BankAccountApproval] = COALESCE(@BankAccountApproval, [BankAccountApproval]),
				[user_update_date] = GETDATE()
			WHERE [UserId] = @lookup_value OR [email_address] = @lookup_value
		`;

		const result = await updateReq.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found." },
				{ status: 404 }
			);
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
		const isAdmin = permUser?.UserType && typeof permUser.UserType === 'string' && permUser.UserType.trim().toLowerCase() === 'admin';
		const isAdminByIdentifier = currentUserId && currentUserId.toLowerCase() === 'admin';

		if (!isAdmin && !isAdminByIdentifier) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin users can delete users." },
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

