import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb, getDb } from "@/lib/db";

// Increase timeout for this route to 120 seconds
export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Get logged-in user information
		const authCookie = request.cookies.get("auth");

		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", families: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", families: [] },
				{ status: 401 }
			);
		}

		// Get user's program and area
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_TYPE], [PROGRAM], [AREA] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found", families: [] },
				{ status: 404 }
			);
		}

		const isAdmin = user.USER_TYPE?.toLowerCase() === "admin";
		const userProgram: string | null = user.PROGRAM || null;
		const userArea: string | null = user.AREA || null;

		const searchParams = request.nextUrl.searchParams;
		const familyId = searchParams.get("familyId");

		if (!familyId) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required", families: [] },
				{ status: 400 }
			);
		}

		const pool = await getBaselineDb();
		const request_query = pool.request();
		(request_query as any).timeout = 120000;

		const query = `
			SELECT TOP (1)
				[FAMILY_ID],
				[PROGRAM],
				[AREA],
				[REGIONAL COUNCIL] as REGIONAL_COUNCIL,
				[LOCAL COUNCIL] as LOCAL_COUNCIL,
				[JAMAT KHANA] as JAMAT_KHANA,
				[HEAD NAME] as HEAD_NAME,
				[CNIC],
				[CONTACT],
				[PER CAPITA INCOME] as PER_CAPITA_INCOME,
				[TOTAL FAMILY MEMBER] as TOTAL_FAMILY_MEMBER,
				[AREA TYPE] as AREA_TYPE
			FROM [SJDA_BASELINEDB].[dbo].[View_FEAP_SEDP]
			WHERE [FAMILY_ID] = @familyId
		`;

		request_query.input("familyId", familyId);
		const result = await request_query.query(query);
		const families = result.recordset || [];

		// No such family at all
		if (!families.length) {
			return NextResponse.json(
				{
					success: false,
					message: "Family not found for the provided Family ID.",
					families: []
				},
				{ status: 404 }
			);
		}

		// Admin can always see
		if (isAdmin) {
			return NextResponse.json({
				success: true,
				families
			});
		}

		// Non-admin: enforce same program and area (case-insensitive, trimmed)
		const family = families[0];
		const familyProgram = (family.PROGRAM ?? "").toString().trim().toLowerCase();
		const familyArea = (family.AREA ?? "").toString().trim().toLowerCase();
		const userProgLower = (userProgram ?? "").toString().trim().toLowerCase();
		const userAreaLower = (userArea ?? "").toString().trim().toLowerCase();

		const sameProgram = !!userProgram && familyProgram === userProgLower;
		const sameArea = !!userArea && familyArea === userAreaLower;

		if (!sameProgram || !sameArea) {
			return NextResponse.json(
				{
					success: false,
					message: "You do not have access to view other region data. Please contact Manager MIS.",
					families: []
				},
				{ status: 403 }
			);
		}

		return NextResponse.json({
			success: true,
			families: [family]
		});
	} catch (error) {
		console.error("Error fetching family for bank search:", error);

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
				message: "Error fetching family information: " + errorMessage,
				families: []
			},
			{ status: 500 }
		);
	}
}


