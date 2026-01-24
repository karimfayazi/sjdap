import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", familyFlags: {}, economicAcceptedIds: [] },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", familyFlags: {}, economicAcceptedIds: [] },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required", familyFlags: {}, economicAcceptedIds: [] },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber.trim());

		// Check family-level FDP tables for Accepted records
		// Using CASE WHEN EXISTS pattern for efficient single query
		const familyFlagsQuery = `
			SELECT
				CASE WHEN EXISTS (
					SELECT 1 
					FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
					WHERE [FormNumber] = @FormNumber 
						AND [ApprovalStatus] = 'Accepted'
				) THEN 1 ELSE 0 END AS FoodAccepted,
				CASE WHEN EXISTS (
					SELECT 1 
					FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
					WHERE [FormNumber] = @FormNumber 
						AND [ApprovalStatus] = 'Accepted'
				) THEN 1 ELSE 0 END AS HabitatAccepted,
				CASE WHEN EXISTS (
					SELECT 1 
					FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
					WHERE [FormNumber] = @FormNumber 
						AND [ApprovalStatus] = 'Accepted'
				) THEN 1 ELSE 0 END AS HealthAccepted,
				CASE WHEN EXISTS (
					SELECT 1 
					FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
					WHERE [FormNumber] = @FormNumber 
						AND [ApprovalStatus] = 'Accepted'
				) THEN 1 ELSE 0 END AS SocialEduAccepted
		`;

		const familyFlagsResult = await sqlRequest.query(familyFlagsQuery);
		const familyFlagsRow = familyFlagsResult.recordset?.[0] || {};

		const familyFlags = {
			food: (familyFlagsRow.FoodAccepted || 0) === 1,
			habitat: (familyFlagsRow.HabitatAccepted || 0) === 1,
			health: (familyFlagsRow.HealthAccepted || 0) === 1,
			socialEdu: (familyFlagsRow.SocialEduAccepted || 0) === 1,
		};

		// Get all BeneficiaryIDs that have Accepted Economic Development records
		const economicQuery = `
			SELECT DISTINCT [BeneficiaryID]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FormNumber] = @FormNumber
				AND [ApprovalStatus] = 'Accepted'
		`;

		const economicResult = await sqlRequest.query(economicQuery);
		const economicAcceptedIds = (economicResult.recordset || [])
			.map((row: any) => row.BeneficiaryID)
			.filter((id: any) => id && String(id).trim() !== "");

		return NextResponse.json({
			success: true,
			familyFlags,
			economicAcceptedIds,
		});
	} catch (error) {
		console.error("Error fetching member actions:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching member actions: " + errorMessage,
				familyFlags: {},
				economicAcceptedIds: [],
			},
			{ status: 500 }
		);
	}
}
