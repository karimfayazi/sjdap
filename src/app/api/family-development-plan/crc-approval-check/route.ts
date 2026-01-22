import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

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
		sqlRequest.input("formNumber", sql.VarChar(50), formNumber);

		// Check approval status from Approval_Log
		const approvalCheckQuery = `
			SELECT TOP 1 [LogID]
			FROM [SJDA_Users].[dbo].[Approval_Log]
			WHERE [ModuleName] = 'FDP' 
				AND [ActionLevel] = 'Approved' 
				AND [FormNumber] = @formNumber
			ORDER BY [LogID] DESC
		`;

		const approvalResult = await sqlRequest.query(approvalCheckQuery);
		const isApproved = (approvalResult.recordset?.length || 0) > 0;
		const approvalLogId = approvalResult.recordset?.[0]?.LogID || null;

		// Fetch family information
		const familyQuery = `
			SELECT 
				[FormNumber],
				[Full_Name],
				[CNICNumber],
				[RegionalCommunity],
				[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`;

		const familyResult = await sqlRequest.query(familyQuery);
		const familyData = familyResult.recordset?.[0] || null;

		const family = familyData ? {
			FormNumber: familyData.FormNumber || formNumber,
			Full_Name: familyData.Full_Name || null,
			CNICNumber: familyData.CNICNumber || null,
			RegionalCommunity: familyData.RegionalCommunity || null,
			LocalCommunity: familyData.LocalCommunity || null,
		} : null;

		// Calculate Total Economic Support
		let totalEconomicSupport = 0;
		try {
			const economicQuery = `
				SELECT SUM(ISNULL([InvestmentFromPEProgram], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			const economicResult = await sqlRequest.query(economicQuery);
			totalEconomicSupport = parseFloat(economicResult.recordset?.[0]?.Total || "0") || 0;
		} catch (err) {
			console.error("Error fetching economic support:", err);
		}

		// Calculate Total Social Support
		let totalSocialSupport = 0;
		try {
			// Education Support
			const educationQuery = `
				SELECT SUM(ISNULL([EduTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			const educationResult = await sqlRequest.query(educationQuery);
			totalSocialSupport += parseFloat(educationResult.recordset?.[0]?.Total || "0") || 0;

			// Health Support
			const healthQuery = `
				SELECT SUM(ISNULL([HealthTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			const healthResult = await sqlRequest.query(healthQuery);
			totalSocialSupport += parseFloat(healthResult.recordset?.[0]?.Total || "0") || 0;

			// Housing Support
			const housingQuery = `
				SELECT SUM(ISNULL([HabitatTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			const housingResult = await sqlRequest.query(housingQuery);
			totalSocialSupport += parseFloat(housingResult.recordset?.[0]?.Total || "0") || 0;

			// Food Support
			const foodQuery = `
				SELECT SUM(ISNULL([FoodSupportTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
			`;
			const foodResult = await sqlRequest.query(foodQuery);
			totalSocialSupport += parseFloat(foodResult.recordset?.[0]?.Total || "0") || 0;
		} catch (err) {
			console.error("Error fetching social support:", err);
		}

		return NextResponse.json({
			success: true,
			isApproved,
			approvalLogId: approvalLogId || undefined,
			family,
			totals: {
				economic: totalEconomicSupport,
				social: totalSocialSupport,
			},
		});
	} catch (error: any) {
		console.error("Error checking CRC approval status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error checking CRC approval status",
			},
			{ status: 500 }
		);
	}
}
