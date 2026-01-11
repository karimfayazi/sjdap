import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb } from "@/lib/db";

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

		const searchParams = request.nextUrl.searchParams;
		
		// Check if requesting a single record by CNIC only
		if (!searchParams.get("getOptions") && !searchParams.get("getFamilyHead")) {
			const cnicForSingle = searchParams.get("cnic");
			const familyIdForSingle = searchParams.get("familyId");
			if (cnicForSingle) {
				const pool = await getBaselineDb();
				const request_query = pool.request();
				(request_query as any).timeout = 120000;

				let singleRecordQuery = `
					SELECT TOP 1
						[CNIC],
						[Received_Application],
						[BTS_Number],
						[FAMILY_ID],
						[Regional_Council],
						[Local_Council],
						[Jamat_Khana],
						[Programme],
						[Beneficiary_Name],
						[Gender],
						[VIST_FEAP],
						[Already_FEAP_Programme],
						[Potential_family_declaration_by_FEAP],
						[If_no_reason],
						[FDP_Status],
						[SWB_to_stop_support_from_date],
						[Remarks],
						[Mentor_Name],
						[Social_Support_Amount],
						[Economic_Support_Amount],
						[update_date]
					FROM [SJDA_BASELINEDB].[dbo].[SWB_Cases]
					WHERE [CNIC] = @cnic
				`;

				// If familyId is also provided, use it for more specific lookup
				if (familyIdForSingle) {
					singleRecordQuery += ` AND [FAMILY_ID] = @familyId`;
					request_query.input("familyId", familyIdForSingle);
				}

				singleRecordQuery += ` ORDER BY [update_date] DESC`;

				request_query.input("cnic", cnicForSingle);
				const result = await request_query.query(singleRecordQuery);

				if (result.recordset && result.recordset.length > 0) {
					return NextResponse.json({
						success: true,
						swbFamily: result.recordset[0]
					});
				} else {
					return NextResponse.json({
						success: false,
						message: "SWB family record not found"
					}, { status: 404 });
				}
			}
		}
		
		// Check if requesting family head by family ID
		const getFamilyHead = searchParams.get("getFamilyHead");
		if (getFamilyHead) {
			const familyIdForHead = searchParams.get("familyId");
			if (familyIdForHead) {
				const pool = await getBaselineDb();
				const request_query = pool.request();
				(request_query as any).timeout = 120000;

				const familyHeadQuery = `
					SELECT TOP 1 [HEAD NAME] AS Head_Name
					FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies]
					WHERE [FAMILY_ID] = @familyId
				`;

				request_query.input("familyId", familyIdForHead);
				const result = await request_query.query(familyHeadQuery);

				const headName = result.recordset?.[0]?.Head_Name || null;

				return NextResponse.json({
					success: true,
					headName: headName
				});
			}
		}
		
		// Check if requesting dropdown options
		const getOptions = searchParams.get("getOptions");

		if (getOptions) {
			const pool = await getBaselineDb();
			const request_query = pool.request();
			(request_query as any).timeout = 120000;

			// Check if filtering by Regional Council
			const regionalCouncil = searchParams.get("regionalCouncil");

			if (regionalCouncil) {
				// Get Local Council and Jamat Khana filtered by Regional Council
				const locationQuery = `
					SELECT DISTINCT 
						[REGIONAL COUNCIL] AS Regional_Council,
						[LOCAL COUNCIL] AS Local_Council,
						[JAMAT KHANA] AS Jamat_Khana
					FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies]
					WHERE [REGIONAL COUNCIL] = @regionalCouncil
						AND [REGIONAL COUNCIL] IS NOT NULL 
						AND [REGIONAL COUNCIL] != ''
					ORDER BY [LOCAL COUNCIL], [JAMAT KHANA]
				`;

				request_query.input("regionalCouncil", regionalCouncil);
				const locationResult = await request_query.query(locationQuery);

				const locations = (locationResult.recordset || []).map(r => ({
					localCouncil: r.Local_Council || "",
					jamatKhana: r.Jamat_Khana || ""
				}));

				// Get unique Local Councils
				const localCouncils = [...new Set(locations.map(l => l.localCouncil).filter(Boolean))].sort();
				
				// Get unique Jamat Khanas
				const jamatKhanas = [...new Set(locations.map(l => l.jamatKhana).filter(Boolean))].sort();

				return NextResponse.json({
					success: true,
					localCouncils,
					jamatKhanas
				});
			}

			// Get all Regional Councils
			const regionalCouncilQuery = `
				SELECT DISTINCT [REGIONAL COUNCIL] AS Regional_Council
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies]
				WHERE [REGIONAL COUNCIL] IS NOT NULL 
					AND [REGIONAL COUNCIL] != ''
				ORDER BY [REGIONAL COUNCIL]
			`;

			const programmeQuery = `
				SELECT DISTINCT [Programme]
				FROM [SJDA_BASELINEDB].[dbo].[SWB_Cases]
				WHERE [Programme] IS NOT NULL 
					AND [Programme] != ''
				ORDER BY [Programme]
			`;

			const mentorQuery = `
				SELECT DISTINCT [MENTOR] AS Mentor_Name
				FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP_Intake_Famiies]
				WHERE [MENTOR] IS NOT NULL 
					AND [MENTOR] != ''
				ORDER BY [MENTOR]
			`;

			const regionalCouncilResult = await request_query.query(regionalCouncilQuery);
			const programmeResult = await request_query.query(programmeQuery);
			const mentorResult = await request_query.query(mentorQuery);

			const regionalCouncils = (regionalCouncilResult.recordset || [])
				.map(r => r.Regional_Council)
				.filter(Boolean)
				.sort();

			const programmes = (programmeResult.recordset || [])
				.map(r => r.Programme)
				.filter(Boolean)
				.sort();

			const mentors = (mentorResult.recordset || [])
				.map(r => r.Mentor_Name)
				.filter(Boolean)
				.sort();

			return NextResponse.json({
				success: true,
				regionalCouncils,
				programmes,
				mentors
			});
		}

		// Get filter parameters
		const cnic = searchParams.get("cnic") || "";
		const familyId = searchParams.get("familyId") || "";
		const btsNumber = searchParams.get("btsNumber") || "";
		const regionalCouncil = searchParams.get("regionalCouncil") || "";
		const localCouncil = searchParams.get("localCouncil") || "";
		const programme = searchParams.get("programme") || "";
		const beneficiaryName = searchParams.get("beneficiaryName") || "";
		const mentorName = searchParams.get("mentorName") || "";
		const fdpStatus = searchParams.get("fdpStatus") || "";

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		let query = `
			SELECT 
				[CNIC],
				[Received_Application],
				[BTS_Number],
				[FAMILY_ID],
				[Regional_Council],
				[Local_Council],
				[Jamat_Khana],
				[Programme],
				[Beneficiary_Name],
				[Gender],
				[VIST_FEAP],
				[Already_FEAP_Programme],
				[Potential_family_declaration_by_FEAP],
				[If_no_reason],
				[FDP_Status],
				[SWB_to_stop_support_from_date],
				[Remarks],
				[Mentor_Name],
				[Social_Support_Amount],
				[Economic_Support_Amount],
				[update_date]
			FROM [SJDA_BASELINEDB].[dbo].[SWB_Cases]
			WHERE 1=1
		`;

		if (cnic) {
			query += " AND [CNIC] LIKE @cnic";
			request_query.input("cnic", `%${cnic}%`);
		}

		if (familyId) {
			query += " AND [FAMILY_ID] LIKE @familyId";
			request_query.input("familyId", `%${familyId}%`);
		}

		if (btsNumber) {
			query += " AND [BTS_Number] LIKE @btsNumber";
			request_query.input("btsNumber", `%${btsNumber}%`);
		}

		if (regionalCouncil) {
			query += " AND [Regional_Council] = @regionalCouncil";
			request_query.input("regionalCouncil", regionalCouncil);
		}

		if (localCouncil) {
			query += " AND [Local_Council] = @localCouncil";
			request_query.input("localCouncil", localCouncil);
		}

		if (programme) {
			query += " AND [Programme] = @programme";
			request_query.input("programme", programme);
		}

		if (beneficiaryName) {
			query += " AND [Beneficiary_Name] LIKE @beneficiaryName";
			request_query.input("beneficiaryName", `%${beneficiaryName}%`);
		}

		if (mentorName) {
			query += " AND [Mentor_Name] = @mentorName";
			request_query.input("mentorName", mentorName);
		}

		if (fdpStatus) {
			query += " AND [FDP_Status] = @fdpStatus";
			request_query.input("fdpStatus", fdpStatus);
		}

		query += " ORDER BY [FAMILY_ID]";

		const result = await request_query.query(query);
		
		return NextResponse.json({ 
			success: true, 
			swbFamilies: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching SWB families:", error);

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
					swbFamilies: []
				},
				{ status: 503 }
			);
		}

		if (isTimeoutError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Request timeout. The query is taking too long. Please try again or contact support if the issue persists.",
					swbFamilies: []
				},
				{ status: 504 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error fetching SWB families: " + errorMessage,
				swbFamilies: []
			},
			{ status: 500 }
		);
	}
}

// POST - Insert new SWB family record
export async function POST(request: NextRequest) {
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

		const swbData = await request.json();

		// Validate required fields
		if (!swbData.CNIC || !swbData.FAMILY_ID) {
			return NextResponse.json(
				{ success: false, message: "CNIC and Family ID are required" },
				{ status: 400 }
			);
		}

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const insertQuery = `
			INSERT INTO [SJDA_BASELINEDB].[dbo].[SWB_Cases]
			(
				[CNIC],
				[Received_Application],
				[BTS_Number],
				[FAMILY_ID],
				[Regional_Council],
				[Local_Council],
				[Jamat_Khana],
				[Programme],
				[Beneficiary_Name],
				[Gender],
				[VIST_FEAP],
				[Already_FEAP_Programme],
				[Potential_family_declaration_by_FEAP],
				[If_no_reason],
				[FDP_Status],
				[SWB_to_stop_support_from_date],
				[Remarks],
				[Mentor_Name],
				[Social_Support_Amount],
				[Economic_Support_Amount],
				[update_date]
			)
			VALUES
			(
				@CNIC,
				@Received_Application,
				@BTS_Number,
				@FAMILY_ID,
				@Regional_Council,
				@Local_Council,
				@Jamat_Khana,
				@Programme,
				@Beneficiary_Name,
				@Gender,
				@VIST_FEAP,
				@Already_FEAP_Programme,
				@Potential_family_declaration_by_FEAP,
				@If_no_reason,
				@FDP_Status,
				@SWB_to_stop_support_from_date,
				@Remarks,
				@Mentor_Name,
				@Social_Support_Amount,
				@Economic_Support_Amount,
				GETDATE()
			)
		`;

		request_query.input("CNIC", swbData.CNIC);
		request_query.input("Received_Application", swbData.Received_Application || null);
		request_query.input("BTS_Number", swbData.BTS_Number || null);
		request_query.input("FAMILY_ID", swbData.FAMILY_ID);
		request_query.input("Regional_Council", swbData.Regional_Council || null);
		request_query.input("Local_Council", swbData.Local_Council || null);
		request_query.input("Jamat_Khana", swbData.Jamat_Khana || null);
		request_query.input("Programme", swbData.Programme || null);
		request_query.input("Beneficiary_Name", swbData.Beneficiary_Name || null);
		request_query.input("Gender", swbData.Gender || null);
		request_query.input("VIST_FEAP", swbData.VIST_FEAP || null);
		request_query.input("Already_FEAP_Programme", swbData.Already_FEAP_Programme || null);
		request_query.input("Potential_family_declaration_by_FEAP", swbData.Potential_family_declaration_by_FEAP || null);
		request_query.input("If_no_reason", swbData.If_no_reason || null);
		request_query.input("FDP_Status", swbData.FDP_Status || null);
		request_query.input("SWB_to_stop_support_from_date", swbData.SWB_to_stop_support_from_date || null);
		request_query.input("Remarks", swbData.Remarks || null);
		request_query.input("Mentor_Name", swbData.Mentor_Name || null);
		request_query.input("Social_Support_Amount", swbData.Social_Support_Amount ? parseFloat(swbData.Social_Support_Amount) : null);
		request_query.input("Economic_Support_Amount", swbData.Economic_Support_Amount ? parseFloat(swbData.Economic_Support_Amount) : null);

		await request_query.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "SWB family record saved successfully"
		});
	} catch (error) {
		console.error("Error saving SWB family record:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error saving SWB family record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

// PUT - Update SWB family record
export async function PUT(request: NextRequest) {
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

		const swbData = await request.json();
		const searchParams = request.nextUrl.searchParams;
		const originalCnic = searchParams.get("cnic");

		if (!originalCnic) {
			return NextResponse.json(
				{ success: false, message: "CNIC is required to identify the record" },
				{ status: 400 }
			);
		}

		// Validate required fields
		if (!swbData.CNIC) {
			return NextResponse.json(
				{ success: false, message: "CNIC is required" },
				{ status: 400 }
			);
		}

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const updateQuery = `
			UPDATE [SJDA_BASELINEDB].[dbo].[SWB_Cases]
			SET
				[CNIC] = @CNIC,
				[Received_Application] = @Received_Application,
				[BTS_Number] = @BTS_Number,
				[FAMILY_ID] = @FAMILY_ID,
				[Regional_Council] = @Regional_Council,
				[Local_Council] = @Local_Council,
				[Jamat_Khana] = @Jamat_Khana,
				[Programme] = @Programme,
				[Beneficiary_Name] = @Beneficiary_Name,
				[Gender] = @Gender,
				[VIST_FEAP] = @VIST_FEAP,
				[Already_FEAP_Programme] = @Already_FEAP_Programme,
				[Potential_family_declaration_by_FEAP] = @Potential_family_declaration_by_FEAP,
				[If_no_reason] = @If_no_reason,
				[FDP_Status] = @FDP_Status,
				[SWB_to_stop_support_from_date] = @SWB_to_stop_support_from_date,
				[Remarks] = @Remarks,
				[Mentor_Name] = @Mentor_Name,
				[Social_Support_Amount] = @Social_Support_Amount,
				[Economic_Support_Amount] = @Economic_Support_Amount,
				[update_date] = GETDATE()
			WHERE [CNIC] = @Original_CNIC
		`;

		request_query.input("Original_CNIC", originalCnic);
		request_query.input("CNIC", swbData.CNIC);
		request_query.input("Received_Application", swbData.Received_Application || null);
		request_query.input("BTS_Number", swbData.BTS_Number || null);
		request_query.input("FAMILY_ID", swbData.FAMILY_ID);
		request_query.input("Regional_Council", swbData.Regional_Council || null);
		request_query.input("Local_Council", swbData.Local_Council || null);
		request_query.input("Jamat_Khana", swbData.Jamat_Khana || null);
		request_query.input("Programme", swbData.Programme || null);
		request_query.input("Beneficiary_Name", swbData.Beneficiary_Name || null);
		request_query.input("Gender", swbData.Gender || null);
		request_query.input("VIST_FEAP", swbData.VIST_FEAP || null);
		request_query.input("Already_FEAP_Programme", swbData.Already_FEAP_Programme || null);
		request_query.input("Potential_family_declaration_by_FEAP", swbData.Potential_family_declaration_by_FEAP || null);
		request_query.input("If_no_reason", swbData.If_no_reason || null);
		request_query.input("FDP_Status", swbData.FDP_Status || null);
		request_query.input("SWB_to_stop_support_from_date", swbData.SWB_to_stop_support_from_date || null);
		request_query.input("Remarks", swbData.Remarks || null);
		request_query.input("Mentor_Name", swbData.Mentor_Name || null);
		request_query.input("Social_Support_Amount", swbData.Social_Support_Amount ? parseFloat(swbData.Social_Support_Amount) : null);
		request_query.input("Economic_Support_Amount", swbData.Economic_Support_Amount ? parseFloat(swbData.Economic_Support_Amount) : null);

		const result = await request_query.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found to update" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "SWB family record updated successfully"
		});
	} catch (error) {
		console.error("Error updating SWB family record:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error updating SWB family record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete SWB family record
export async function DELETE(request: NextRequest) {
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

		const searchParams = request.nextUrl.searchParams;
		const cnic = searchParams.get("cnic");
		const familyId = searchParams.get("familyId");

		if (!cnic || !familyId) {
			return NextResponse.json(
				{ success: false, message: "CNIC and Family ID are required" },
				{ status: 400 }
			);
		}

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const deleteQuery = `
			DELETE FROM [SJDA_BASELINEDB].[dbo].[SWB_Cases]
			WHERE [CNIC] = @CNIC AND [FAMILY_ID] = @FAMILY_ID
		`;

		request_query.input("CNIC", cnic);
		request_query.input("FAMILY_ID", familyId);

		const result = await request_query.query(deleteQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "No record found to delete" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "SWB family record deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting SWB family record:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError =
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");

		if (isConnectionError) {
			return NextResponse.json(
				{
					success: false,
					message: "Please Re-Connect VPN"
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Error deleting SWB family record: " + errorMessage
			},
			{ status: 500 }
		);
	}
}

