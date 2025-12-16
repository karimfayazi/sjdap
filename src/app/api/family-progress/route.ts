import { NextRequest, NextResponse } from "next/server";
import { getFdpDb, getDb } from "@/lib/db";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Get logged-in user information
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

		// Get query parameters for filtering
		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId") || "";

		// Build query
		const pool = await getFdpDb();
		let query = `
			SELECT TOP (1000) 
				[FAMILY_ID],
				[FAMILY_PROGRESS_STATUS],
				[REMARKS],
				[MENTOR],
				[FDP_APPROVED_DATE],
				[FAMILY_TYPE],
				[CRC_APPROVAL_FAMILY_INCOME],
				[FAMILY_MENTOR],
				[EXPECTED_GRADUCATION_DATE],
				[PROGRAM_TYPE],
				[FAMILY_FROM],
				[STATUS_DATE],
				[USER_NAME],
				[SYSTEM_DATE],
				[DROPOUT_CATEGORY],
				[Community_Affiliation]
			FROM [SJDA_FDP].[dbo].[Table_FAMILY_PROGRESS]
			WHERE 1=1
		`;

		const request_query = pool.request();

		if (familyId) {
			query += " AND [FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		query += " ORDER BY [FAMILY_ID]";

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			families: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching family progress:", error);
		
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
					message: "Please Re-Connect VPN",
					families: []
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					families: []
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching family progress: " + errorMessage,
				families: []
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get logged-in user information
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

		// Get user's full name for USER_NAME
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userName = user?.USER_FULL_NAME || null;

		const data = await request.json();

		// Validate required fields
		if (!data.FAMILY_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getFdpDb();
		
		const query = `
			INSERT INTO [SJDA_FDP].[dbo].[Table_FAMILY_PROGRESS]
			(
				[FAMILY_ID],
				[FAMILY_PROGRESS_STATUS],
				[REMARKS],
				[MENTOR],
				[FDP_APPROVED_DATE],
				[FAMILY_TYPE],
				[CRC_APPROVAL_FAMILY_INCOME],
				[FAMILY_MENTOR],
				[EXPECTED_GRADUCATION_DATE],
				[PROGRAM_TYPE],
				[FAMILY_FROM],
				[STATUS_DATE],
				[USER_NAME],
				[SYSTEM_DATE],
				[DROPOUT_CATEGORY],
				[Community_Affiliation]
			)
			VALUES
			(
				@FAMILY_ID,
				@FAMILY_PROGRESS_STATUS,
				@REMARKS,
				@MENTOR,
				@FDP_APPROVED_DATE,
				@FAMILY_TYPE,
				@CRC_APPROVAL_FAMILY_INCOME,
				@FAMILY_MENTOR,
				@EXPECTED_GRADUCATION_DATE,
				@PROGRAM_TYPE,
				@FAMILY_FROM,
				@STATUS_DATE,
				@USER_NAME,
				GETDATE(),
				@DROPOUT_CATEGORY,
				@Community_Affiliation
			)
		`;

		const dbRequest = pool.request();
		dbRequest.input("FAMILY_ID", data.FAMILY_ID);
		dbRequest.input("FAMILY_PROGRESS_STATUS", data.FAMILY_PROGRESS_STATUS || null);
		dbRequest.input("REMARKS", data.REMARKS || null);
		dbRequest.input("MENTOR", data.MENTOR || null);
		dbRequest.input("FDP_APPROVED_DATE", data.FDP_APPROVED_DATE ? new Date(data.FDP_APPROVED_DATE) : null);
		dbRequest.input("FAMILY_TYPE", data.FAMILY_TYPE || null);
		dbRequest.input("CRC_APPROVAL_FAMILY_INCOME", data.CRC_APPROVAL_FAMILY_INCOME || null);
		dbRequest.input("FAMILY_MENTOR", data.FAMILY_MENTOR || null);
		dbRequest.input("EXPECTED_GRADUCATION_DATE", data.EXPECTED_GRADUCATION_DATE ? new Date(data.EXPECTED_GRADUCATION_DATE) : null);
		dbRequest.input("PROGRAM_TYPE", data.PROGRAM_TYPE || null);
		dbRequest.input("FAMILY_FROM", data.FAMILY_FROM || null);
		dbRequest.input("STATUS_DATE", data.STATUS_DATE ? new Date(data.STATUS_DATE) : null);
		dbRequest.input("USER_NAME", userName);
		dbRequest.input("DROPOUT_CATEGORY", data.DROPOUT_CATEGORY || null);
		dbRequest.input("Community_Affiliation", data.Community_Affiliation || null);
		
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		await dbRequest.query(query);

		return NextResponse.json({
			success: true,
			message: "Family progress record created successfully"
		});
	} catch (error) {
		console.error("Error creating family progress:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error creating family progress: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		// Get logged-in user information
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

		// Get user's full name for USER_NAME
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userName = user?.USER_FULL_NAME || null;

		const data = await request.json();

		// Validate required fields
		if (!data.FAMILY_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getFdpDb();
		
		const query = `
			UPDATE [SJDA_FDP].[dbo].[Table_FAMILY_PROGRESS]
			SET
				[FAMILY_PROGRESS_STATUS] = @FAMILY_PROGRESS_STATUS,
				[REMARKS] = @REMARKS,
				[MENTOR] = @MENTOR,
				[FDP_APPROVED_DATE] = @FDP_APPROVED_DATE,
				[FAMILY_TYPE] = @FAMILY_TYPE,
				[CRC_APPROVAL_FAMILY_INCOME] = @CRC_APPROVAL_FAMILY_INCOME,
				[FAMILY_MENTOR] = @FAMILY_MENTOR,
				[EXPECTED_GRADUCATION_DATE] = @EXPECTED_GRADUCATION_DATE,
				[PROGRAM_TYPE] = @PROGRAM_TYPE,
				[FAMILY_FROM] = @FAMILY_FROM,
				[STATUS_DATE] = @STATUS_DATE,
				[USER_NAME] = @USER_NAME,
				[SYSTEM_DATE] = GETDATE(),
				[DROPOUT_CATEGORY] = @DROPOUT_CATEGORY,
				[Community_Affiliation] = @Community_Affiliation
			WHERE [FAMILY_ID] = @FAMILY_ID
		`;

		const dbRequest = pool.request();
		dbRequest.input("FAMILY_ID", data.FAMILY_ID);
		dbRequest.input("FAMILY_PROGRESS_STATUS", data.FAMILY_PROGRESS_STATUS || null);
		dbRequest.input("REMARKS", data.REMARKS || null);
		dbRequest.input("MENTOR", data.MENTOR || null);
		dbRequest.input("FDP_APPROVED_DATE", data.FDP_APPROVED_DATE ? new Date(data.FDP_APPROVED_DATE) : null);
		dbRequest.input("FAMILY_TYPE", data.FAMILY_TYPE || null);
		dbRequest.input("CRC_APPROVAL_FAMILY_INCOME", data.CRC_APPROVAL_FAMILY_INCOME || null);
		dbRequest.input("FAMILY_MENTOR", data.FAMILY_MENTOR || null);
		dbRequest.input("EXPECTED_GRADUCATION_DATE", data.EXPECTED_GRADUCATION_DATE ? new Date(data.EXPECTED_GRADUCATION_DATE) : null);
		dbRequest.input("PROGRAM_TYPE", data.PROGRAM_TYPE || null);
		dbRequest.input("FAMILY_FROM", data.FAMILY_FROM || null);
		dbRequest.input("STATUS_DATE", data.STATUS_DATE ? new Date(data.STATUS_DATE) : null);
		dbRequest.input("USER_NAME", userName);
		dbRequest.input("DROPOUT_CATEGORY", data.DROPOUT_CATEGORY || null);
		dbRequest.input("Community_Affiliation", data.Community_Affiliation || null);
		
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		const result = await dbRequest.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found with the provided Family ID" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Family progress record updated successfully"
		});
	} catch (error) {
		console.error("Error updating family progress:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error updating family progress: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Get logged-in user information
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

		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId");

		if (!familyId) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getFdpDb();
		const dbRequest = pool.request();
		
		const query = `
			DELETE FROM [SJDA_FDP].[dbo].[Table_FAMILY_PROGRESS]
			WHERE [FAMILY_ID] = @FAMILY_ID
		`;

		dbRequest.input("FAMILY_ID", familyId);
		
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		const result = await dbRequest.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found with the provided Family ID" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Family progress record deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting family progress:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error deleting family progress: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

