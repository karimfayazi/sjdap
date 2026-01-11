import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";
import { getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
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

		// Get user's full name and user type
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_TYPE] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.USER_FULL_NAME || null;
		const isAdmin = user?.USER_TYPE?.toLowerCase() === "admin";

		// Build query - fetch all columns from the view
		const pool = await getBaselineDb();
		
		// Calculate last night's date range (yesterday 6 PM to today 6 AM)
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		
		// Last night start: yesterday 6 PM
		const lastNightStart = new Date(yesterday);
		lastNightStart.setHours(18, 0, 0, 0);
		
		// Last night end: today 6 AM
		const lastNightEnd = new Date(today);
		lastNightEnd.setHours(6, 0, 0, 0);
		
		const query = `
			SELECT *
			FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_Intervnetion_All]
			ORDER BY [FAMILY_ID]
		`;

		const request_query = pool.request();
		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;

		// Note: Add mentor filtering if needed based on view structure
		// if (!isAdmin && userFullName) {
		// 	query += " AND [MENTOR] = @mentor";
		// 	request_query.input("mentor", userFullName);
		// }

		const result = await request_query.query(query);
		
		// Filter for last night updates - check multiple possible date fields
		const lastNightUpdates: any[] = [];
		const allInterventions = result.recordset || [];
		
		allInterventions.forEach((intervention: any) => {
			// Check various date field names
			const dateFields = ['UPDATED_DATE', 'CREATED_DATE', 'POST_DATE', 'SYSTEMDATE', 'Updated_Date', 'Created_Date', 'Post_Date', 'SystemDate'];
			let isLastNightUpdate = false;
			
			for (const field of dateFields) {
				const dateValue = intervention[field];
				if (dateValue) {
					try {
						const updateDate = new Date(dateValue);
						if (updateDate >= lastNightStart && updateDate < lastNightEnd) {
							isLastNightUpdate = true;
							break;
						}
					} catch (e) {
						// Invalid date, skip
					}
				}
			}
			
			if (isLastNightUpdate) {
				lastNightUpdates.push(intervention);
			}
		});
		
		return NextResponse.json({ 
			success: true, 
			interventions: allInterventions,
			lastNightUpdates: lastNightUpdates,
			lastNightCount: lastNightUpdates.length
		});
	} catch (error) {
		console.error("Error fetching actual interventions:", error);
		
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
					interventions: []
				},
				{ status: 503 }
			);
		}
		
		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					interventions: []
				},
				{ status: 504 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching actual interventions: " + errorMessage,
				interventions: []
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

		// ALL USERS CAN UPDATE - NO PERMISSION CHECKS

		const data = await request.json();

		// Validate required fields - need at least one identifier
		if (!data.FAMILY_ID && !data.INTERVENTION_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID or Intervention ID is required for update" },
				{ status: 400 }
			);
		}

		// Get user's full name for tracking updates
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const userFullName = userResult.recordset?.[0]?.USER_FULL_NAME || userId;

		// Note: Since we're working with a view, we need to update the underlying table
		// The view View_SEDP_FEAP_Intervnetion_All likely joins multiple tables
		// For now, we'll attempt to update based on the most common identifier
		const pool = await getBaselineDb();
		
		// Build dynamic UPDATE query based on available fields
		// This is a simplified approach - you may need to adjust based on your actual table structure
		const updateFields: string[] = [];
		const request_query = pool.request();

		// Add update fields (exclude identifiers and system fields)
		const excludedFields = ['FAMILY_ID', 'INTERVENTION_ID', 'MEMBER_ID', 'ID', 'CREATED_DATE', 'UPDATED_DATE', 'SYSTEMDATE'];
		Object.keys(data).forEach(key => {
			if (!excludedFields.some(excluded => key.toUpperCase().includes(excluded))) {
				updateFields.push(`[${key}] = @${key}`);
				request_query.input(key, data[key] || null);
			}
		});

		if (updateFields.length === 0) {
			return NextResponse.json(
				{ success: false, message: "No fields to update" },
				{ status: 400 }
			);
		}

		// Build WHERE clause - use INTERVENTION_ID if available, otherwise FAMILY_ID
		let whereClause = "";
		if (data.INTERVENTION_ID) {
			whereClause = "WHERE [INTERVENTION_ID] = @INTERVENTION_ID";
			request_query.input("INTERVENTION_ID", data.INTERVENTION_ID);
		} else if (data.FAMILY_ID) {
			whereClause = "WHERE [FAMILY_ID] = @FAMILY_ID";
			request_query.input("FAMILY_ID", data.FAMILY_ID);
		}

		// Note: You may need to adjust the table name based on your actual database structure
		// This assumes the view is based on a table that can be updated
		// If the view joins multiple tables, you'll need to update each table separately
		const updateQuery = `
			UPDATE [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_Intervnetion_All]
			SET ${updateFields.join(", ")}
			${whereClause}
		`;

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;

		// Note: If the view is not directly updatable, you may need to:
		// 1. Identify the underlying table(s)
		// 2. Update the appropriate table(s) based on the view structure
		// 3. For now, we'll attempt the update and handle errors gracefully

		try {
			const result = await request_query.query(updateQuery);
			
			if (result.rowsAffected[0] === 0) {
				return NextResponse.json(
					{ success: false, message: "No record found to update or view is not directly updatable" },
					{ status: 404 }
				);
			}

			return NextResponse.json({
				success: true,
				message: "Intervention record updated successfully"
			});
		} catch (updateError: any) {
			// If view is not updatable, provide helpful error message
			const errorMessage = updateError.message || String(updateError);
			if (errorMessage.includes("not updatable") || errorMessage.includes("VIEW")) {
				return NextResponse.json(
					{ 
						success: false, 
						message: "This view is not directly updatable. Please update the underlying table(s) directly." 
					},
					{ status: 400 }
				);
			}
			throw updateError;
		}

	} catch (error) {
		console.error("Error updating actual intervention:", error);
		
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
				message: "Error updating actual intervention: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

