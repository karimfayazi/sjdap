import { NextRequest, NextResponse } from "next/server";
import { getDb, getFdpDb } from "@/lib/db";

export const maxDuration = 120;

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

		// Check designation from SJDA_Users (only EDO can approve)
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [DESIGNATION], [USER_FULL_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const designation = (user?.DESIGNATION || "").toString().trim().toUpperCase();

		if (designation !== "EDO") {
			return NextResponse.json(
				{
					success: false,
					message: "Access denied. Only EDO users can update feasibility status.",
				},
				{ status: 403 }
			);
		}

		const body = await request.json().catch(() => ({}));
		const { familyId, memberId, status, remarks } = body || {};

		if (!familyId || !memberId) {
			return NextResponse.json(
				{
					success: false,
					message: "Family ID and Member ID are required.",
				},
				{ status: 400 }
			);
		}

		const fdpPool = await getFdpDb();
		const reqQuery = fdpPool.request();
		(reqQuery as any).timeout = 120000;

		reqQuery.input("familyId", familyId);
		reqQuery.input("memberId", memberId);
		reqQuery.input("status", status ?? null);
		reqQuery.input("remarks", remarks ?? null);

		const updateQuery = `
			UPDATE [SJDA_FDP].[dbo].[View_Family_Feasibility]
			SET 
				[STATUS] = ISNULL(@status, [STATUS]),
				[REMARKS] = @remarks,
				[UPDATE_DATE] = GETDATE()
			WHERE [FAMILY ID] = @familyId
			  AND [MEMBER_ID] = @memberId
		`;

		const result = await reqQuery.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Record not found or not updateable.",
				},
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Status updated successfully.",
		});
	} catch (error) {
		console.error("Error updating feasibility status:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				success: false,
				message: "Error updating feasibility status: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}


