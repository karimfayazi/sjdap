import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");
		const excludeRecordId = searchParams.get("excludeRecordId"); // For edit mode - exclude current record
		const excludeRecordType = searchParams.get("excludeRecordType"); // "food", "education", "health", "housing"

		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		sqlRequest.input("formNumber", sql.VarChar, formNumber);

		let totalSocialSupport = 0;

		// Fetch Education Support Total PE Contribution
		try {
			let educationQuery = `
				SELECT SUM(ISNULL([EduTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [FamilyID] = @formNumber
					AND [IsActive] = 1
			`;
			
			if (excludeRecordType === "education" && excludeRecordId) {
				sqlRequest.input("excludeRecordId", sql.Int, parseInt(excludeRecordId));
				educationQuery += ` AND [FDP_SocialEduID] != @excludeRecordId`;
			}
			
			const educationResult = await sqlRequest.query(educationQuery);
			totalSocialSupport += parseFloat(educationResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Education Support table not found or error:", err);
		}

		// Fetch Health Support Total PE Contribution
		try {
			let healthQuery = `
				SELECT SUM(ISNULL([HealthTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			
			if (excludeRecordType === "health" && excludeRecordId) {
				sqlRequest.input("excludeHealthRecordId", sql.Int, parseInt(excludeRecordId));
				healthQuery += ` AND [FDP_HealthSupportID] != @excludeHealthRecordId`;
			}
			
			const healthResult = await sqlRequest.query(healthQuery);
			totalSocialSupport += parseFloat(healthResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Health Support table not found or error:", err);
		}

		// Fetch Housing Support Total PE Contribution
		try {
			let housingQuery = `
				SELECT SUM(ISNULL([HabitatTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [FamilyID] = @formNumber
					AND [IsActive] = 1
			`;
			
			if (excludeRecordType === "housing" && excludeRecordId) {
				sqlRequest.input("excludeHousingRecordId", sql.Int, parseInt(excludeRecordId));
				housingQuery += ` AND [FDP_HabitatSupportID] != @excludeHousingRecordId`;
			}
			
			const housingResult = await sqlRequest.query(housingQuery);
			totalSocialSupport += parseFloat(housingResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Housing Support table not found or error:", err);
		}

		// Fetch Food Support Total PE Contribution
		try {
			let foodQuery = `
				SELECT SUM(ISNULL([FoodSupportTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [FamilyID] = @formNumber
					AND [IsActive] = 1
			`;
			
			if (excludeRecordType === "food" && excludeRecordId) {
				sqlRequest.input("excludeFoodRecordId", sql.Int, parseInt(excludeRecordId));
				foodQuery += ` AND [FDP_FoodSupportID] != @excludeFoodRecordId`;
			}
			
			const foodResult = await sqlRequest.query(foodQuery);
			totalSocialSupport += parseFloat(foodResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Food Support table not found or error:", err);
		}

		return NextResponse.json({
			success: true,
			data: {
				totalSocialSupport: totalSocialSupport,
			},
		});
	} catch (error: any) {
		console.error("Error fetching total social support:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching total social support",
			},
			{ status: 500 }
		);
	}
}


