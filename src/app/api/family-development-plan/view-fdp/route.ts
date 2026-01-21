import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

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
		sqlRequest.input("formNumber", sql.VarChar, formNumber);

		// Fetch baseline family data directly from database
		const baselineQuery = `
			SELECT 
				app.[MonthlyIncome_Remittance],
				app.[MonthlyIncome_Rental],
				app.[MonthlyIncome_OtherSources],
				ISNULL(fm.MemberCount, 0) as FamilyMembersCount,
				ISNULL(fm.TotalMemberIncome, 0) as TotalMemberIncome,
				(
					ISNULL(app.[MonthlyIncome_Remittance], 0) +
					ISNULL(app.[MonthlyIncome_Rental], 0) +
					ISNULL(app.[MonthlyIncome_OtherSources], 0) +
					ISNULL(fm.TotalMemberIncome, 0)
				) as BaselineFamilyIncome,
				app.[Area_Type]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
			LEFT JOIN (
				SELECT
					[FormNo],
					COUNT(*) as MemberCount,
					SUM(ISNULL([MonthlyIncome], 0)) as TotalMemberIncome
				FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				GROUP BY [FormNo]
			) fm ON app.[FormNumber] = fm.[FormNo]
			WHERE app.[FormNumber] = @formNumber
		`;
		const baselineResult = await sqlRequest.query(baselineQuery);
		const baselineRow = baselineResult.recordset[0] || {};
		
		// Get self-sufficiency income per capita based on area type
		const areaType = baselineRow.Area_Type || "Rural";
		const selfSufficiencyIncomePerCapita = 
			areaType === "Urban" ? 19200 :
			areaType === "Peri-Urban" ? 16100 :
			10800; // Rural
		
		const baselineFamilyIncome = parseFloat(baselineRow.BaselineFamilyIncome) || 0;
		const familyMembersCount = parseInt(baselineRow.FamilyMembersCount) || 0;
		const familyPerCapitaIncome = familyMembersCount > 0 ? baselineFamilyIncome / familyMembersCount : 0;
		const baselinePerCapitaAsPctOfSelfSuff = selfSufficiencyIncomePerCapita > 0
			? (familyPerCapitaIncome / selfSufficiencyIncomePerCapita) * 100
			: 0;

		// Fetch basic info for head name
		const basicInfoQuery = `
			SELECT TOP 1
				[Full_Name],
				[Area_Type]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`;
		const basicInfoResult = await sqlRequest.query(basicInfoQuery);
		const basicInfo = basicInfoResult.recordset[0] || {};

		// Calculate poverty level
		const calculatePovertyLevel = (perCapitaIncome: number, areaType: string): string => {
			const thresholds: { [key: string]: { [key: number]: string } } = {
				"Rural": {
					0: "Level -4",
					2700: "Level -3",
					5400: "Level -2",
					8100: "Level -1",
					10800: "Level 0",
					13500: "Level +1",
				},
				"Urban": {
					0: "Level -4",
					4800: "Level -3",
					9600: "Level -2",
					14400: "Level -1",
					19200: "Level 0",
					24000: "Level +1",
				},
				"Peri-Urban": {
					0: "Level -4",
					4025: "Level -3",
					8100: "Level -2",
					12100: "Level -1",
					16100: "Level 0",
					20100: "Level +1",
				},
			};

			const areaThresholds = thresholds[areaType] || thresholds["Rural"];
			const sortedLevels = Object.keys(areaThresholds)
				.map(Number)
				.sort((a, b) => b - a);

			for (const threshold of sortedLevels) {
				if (perCapitaIncome >= threshold) {
					return areaThresholds[threshold];
				}
			}

			return "Level -4";
		};

		// Calculate Max Social Support based on Income Level
		const calculateMaxSocialSupport = (incomeLevel: string): number => {
			switch (incomeLevel) {
				case "Level -4":
					return 468000;
				case "Level -3":
					return 360000;
				case "Level -2":
					return 264000;
				case "Level -1":
					return 180000;
				default:
					return 0;
			}
		};

		// Calculate poverty level
		const povertyLevel = calculatePovertyLevel(familyPerCapitaIncome, areaType);
		const maxSocialSupport = calculateMaxSocialSupport(povertyLevel);

		// Prepare family-level information
		const familyInfo = {
			FormNumber: formNumber,
			HeadName: basicInfo.Full_Name || "",
			BaselineFamilyIncome: baselineFamilyIncome,
			FamilyMembersCount: familyMembersCount,
			FamilyPerCapitaIncome: familyPerCapitaIncome,
			SelfSufficiencyIncomePerCapita: selfSufficiencyIncomePerCapita,
			BaselinePerCapitaAsPctOfSelfSuff: baselinePerCapitaAsPctOfSelfSuff,
			BaselinePovertyLevel: povertyLevel,
			MaxSocialSupportAmount: maxSocialSupport,
			MaxEconomicSupport: 500000, // Fixed value as per requirement
		};

		// Fetch Feasibility Studies
		const feasibilityQuery = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FormNumber] = @formNumber
			ORDER BY [FDP_ID] ASC
		`;
		const feasibilityResult = await sqlRequest.query(feasibilityQuery);
		const feasibilityStudies = feasibilityResult.recordset || [];

		// Fetch Economic Interventions
		const economicQuery = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FormNumber] = @formNumber
				AND [IsActive] = 1
			ORDER BY [FDP_EconomicID] ASC
		`;
		const economicResult = await sqlRequest.query(economicQuery);
		const economicInterventions = economicResult.recordset || [];

		// Fetch Education Support
		const educationQuery = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			WHERE [FormNumber] = @formNumber
				AND [IsActive] = 1
			ORDER BY [FDP_SocialEduID] ASC
		`;
		const educationResult = await sqlRequest.query(educationQuery);
		const educationInterventions = educationResult.recordset || [];

		// Fetch Health Support (if table exists)
		let healthInterventions: any[] = [];
		try {
			const healthQuery = `
				SELECT *
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [FormNumber] = @formNumber
					AND [IsActive] = 1
				ORDER BY [FDP_HealthSupportID] ASC
			`;
			const healthResult = await sqlRequest.query(healthQuery);
			healthInterventions = healthResult.recordset || [];
		} catch (err) {
			// Table might not exist yet, ignore
			console.log("Health Support table not found or error:", err);
		}

		// Fetch Housing Support
		const housingQuery = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			WHERE [FormNumber] = @formNumber
				AND [IsActive] = 1
			ORDER BY [FDP_HabitatSupportID] ASC
		`;
		const housingResult = await sqlRequest.query(housingQuery);
		const housingInterventions = housingResult.recordset || [];

		// Fetch Food Support
		const foodQuery = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
			WHERE [FormNumber] = @formNumber
				AND [IsActive] = 1
			ORDER BY [FDP_FoodSupportID] ASC
		`;
		const foodResult = await sqlRequest.query(foodQuery);
		const foodInterventions = foodResult.recordset || [];

		// Calculate Total Social Support
		const totalSocialSupport = 
			educationInterventions.reduce((sum: number, record: any) => sum + (parseFloat(record.EduTotalPEContribution) || 0), 0) +
			healthInterventions.reduce((sum: number, record: any) => sum + (parseFloat(record.HealthTotalPEContribution) || 0), 0) +
			housingInterventions.reduce((sum: number, record: any) => sum + (parseFloat(record.HabitatTotalPEContribution) || 0), 0) +
			foodInterventions.reduce((sum: number, record: any) => sum + (parseFloat(record.FoodSupportTotalPEContribution) || 0), 0);

		// Fetch current approval status from EconomicDevelopment (use first record's status as overall status)
		let approvalStatus: string | null = null;
		let approvalRemarks: string | null = null;
		if (economicInterventions.length > 0) {
			approvalStatus = economicInterventions[0].ApprovalStatus || null;
			approvalRemarks = economicInterventions[0].ApprovalRemarks || null;
		}

		return NextResponse.json({
			success: true,
			data: {
				familyInfo,
				feasibilityStudies,
				economicInterventions,
				educationInterventions,
				healthInterventions,
				housingInterventions,
				foodInterventions,
				totalSocialSupport,
				approvalStatus,
				approvalRemarks,
			},
		});
	} catch (error: any) {
		console.error("Error fetching FDP overview data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching FDP overview data",
			},
			{ status: 500 }
		);
	}
}

