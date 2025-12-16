import { NextRequest, NextResponse } from "next/server";
import { getPlanInterventionDb, getDb } from "@/lib/db";

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
		const interventionId = searchParams.get("interventionId") || "";
		const monthRop = searchParams.get("monthRop") || "";
		const mentor = searchParams.get("mentor") || "";
		const paymentType = searchParams.get("paymentType") || "";
		const getOptions = searchParams.get("getOptions") === "true";

		// Build query
		const pool = await getPlanInterventionDb();
		
		if (getOptions) {
			// Return unique values for dropdowns
			const query = `
				SELECT DISTINCT
					[MENTOR]
				FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
				WHERE [MENTOR] IS NOT NULL
				ORDER BY [MENTOR]
			`;
			
			const result = await pool.request().query(query);
			const mentors = result.recordset.map((r: any) => r.MENTOR).filter(Boolean);
			
			// Get unique payment types
			const paymentTypeQuery = `
				SELECT DISTINCT
					[Payment_Type]
				FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
				WHERE [Payment_Type] IS NOT NULL
				ORDER BY [Payment_Type]
			`;
			
			const paymentTypeResult = await pool.request().query(paymentTypeQuery);
			const paymentTypes = paymentTypeResult.recordset.map((r: any) => r.Payment_Type).filter(Boolean);
			
			// Get unique month ROPs
			const monthRopQuery = `
				SELECT DISTINCT
					[MONTH_ROP]
				FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
				WHERE [MONTH_ROP] IS NOT NULL
				ORDER BY [MONTH_ROP]
			`;
			
			const monthRopResult = await pool.request().query(monthRopQuery);
			const monthRops = monthRopResult.recordset.map((r: any) => r.MONTH_ROP).filter(Boolean);
			
			return NextResponse.json({
				success: true,
				mentors,
				paymentTypes,
				monthRops
			});
		}

		let query = `
			SELECT 
				[INTERVENTION_ID],
				[MONTH_ROP],
				[AMOUNT],
				[REMARKS],
				[INTERVENTION_ID_MONTH_ROP],
				[SYSTEMDATE],
				[MENTOR],
				[Payment_Type]
			FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
			WHERE 1=1
		`;

		const request_query = pool.request();

		if (interventionId) {
			query += " AND [INTERVENTION_ID] LIKE @interventionId";
			request_query.input("interventionId", `%${interventionId}%`);
		}

		if (monthRop) {
			query += " AND [MONTH_ROP] = @monthRop";
			request_query.input("monthRop", monthRop);
		}

		if (mentor) {
			query += " AND [MENTOR] = @mentor";
			request_query.input("mentor", mentor);
		}

		if (paymentType) {
			query += " AND [Payment_Type] = @paymentType";
			request_query.input("paymentType", paymentType);
		}

		query += " ORDER BY [INTERVENTION_ID], [MONTH_ROP]";

		// Set request timeout to 120 seconds
		(request_query as any).timeout = 120000;
		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			rops: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching ROP update data:", error);
		
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
					rops: []
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					rops: []
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching ROP update data: " + errorMessage,
				rops: []
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

		const data = await request.json();

		// Validate required fields
		if (!data.INTERVENTION_ID_MONTH_ROP) {
			return NextResponse.json(
				{ success: false, message: "INTERVENTION_ID_MONTH_ROP is required" },
				{ status: 400 }
			);
		}

		const pool = await getPlanInterventionDb();
		
		const query = `
			UPDATE [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
			SET
				[INTERVENTION_ID] = @INTERVENTION_ID,
				[MONTH_ROP] = @MONTH_ROP,
				[AMOUNT] = @AMOUNT,
				[REMARKS] = @REMARKS,
				[MENTOR] = @MENTOR,
				[Payment_Type] = @Payment_Type,
				[SYSTEMDATE] = GETDATE()
			WHERE [INTERVENTION_ID_MONTH_ROP] = @INTERVENTION_ID_MONTH_ROP
		`;

		const dbRequest = pool.request();
		dbRequest.input("INTERVENTION_ID_MONTH_ROP", data.INTERVENTION_ID_MONTH_ROP);
		dbRequest.input("INTERVENTION_ID", data.INTERVENTION_ID || null);
		dbRequest.input("MONTH_ROP", data.MONTH_ROP || null);
		dbRequest.input("AMOUNT", data.AMOUNT || null);
		dbRequest.input("REMARKS", data.REMARKS || null);
		dbRequest.input("MENTOR", data.MENTOR || null);
		dbRequest.input("Payment_Type", data.Payment_Type || null);
		
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		const result = await dbRequest.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found with the provided INTERVENTION_ID_MONTH_ROP" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "ROP record updated successfully"
		});
	} catch (error) {
		console.error("Error updating ROP:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error updating ROP: " + errorMessage
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
		const interventionIdMonthRop = searchParams.get("interventionIdMonthRop");

		if (!interventionIdMonthRop) {
			return NextResponse.json(
				{ success: false, message: "INTERVENTION_ID_MONTH_ROP is required" },
				{ status: 400 }
			);
		}

		const pool = await getPlanInterventionDb();
		const dbRequest = pool.request();
		
		const query = `
			DELETE FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
			WHERE [INTERVENTION_ID_MONTH_ROP] = @INTERVENTION_ID_MONTH_ROP
		`;

		dbRequest.input("INTERVENTION_ID_MONTH_ROP", interventionIdMonthRop);
		
		// Set request timeout to 120 seconds
		(dbRequest as any).timeout = 120000;

		const result = await dbRequest.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found with the provided INTERVENTION_ID_MONTH_ROP" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "ROP record deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting ROP:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		return NextResponse.json(
			{ 
				success: false, 
				message: "Error deleting ROP: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

