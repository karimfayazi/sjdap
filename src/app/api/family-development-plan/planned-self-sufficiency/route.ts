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

		// Fetch basic family information
		const basicInfoQuery = `
			SELECT 
				[FormNumber],
				[Full_Name],
				[RegionalCommunity],
				[LocalCommunity],
				[Area_Type],
				[Intake_family_Income],
				[MonthlyIncome_Remittance],
				[MonthlyIncome_Rental],
				[MonthlyIncome_OtherSources],
				[SubmittedBy]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @FormNumber
		`;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);
		const basicInfoResult = await sqlRequest.query(basicInfoQuery);
		const basicInfo = basicInfoResult.recordset[0];

		if (!basicInfo) {
			return NextResponse.json(
				{
					success: false,
					message: "Family not found",
				},
				{ status: 404 }
			);
		}

		// Fetch family members count and total member income
		const membersQuery = `
			SELECT 
				COUNT(*) as TotalMembers,
				SUM(ISNULL([MonthlyIncome], 0)) as TotalMemberIncome
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNumber
		`;

		const membersResult = await sqlRequest.query(membersQuery);
		const membersData = membersResult.recordset[0];
		const totalMembers = membersData?.TotalMembers || 0;
		const totalMemberIncome = membersData?.TotalMemberIncome || 0;

		// Get Mentor from SubmittedBy field in PE_Application_BasicInfo
		const mentor = basicInfo.SubmittedBy || null;

		// Calculate baseline family income
		const baselineFamilyIncome = 
			(basicInfo.MonthlyIncome_Remittance || 0) +
			(basicInfo.MonthlyIncome_Rental || 0) +
			(basicInfo.MonthlyIncome_OtherSources || 0) +
			totalMemberIncome;

		// Determine self-sufficiency income per capita based on area type
		const areaType = basicInfo.Area_Type || "Rural";
		const selfSufficiencyIncomePerCapita = 
			areaType === "Urban" ? 19200 :
			areaType === "Peri-Urban" ? 16100 :
			10800; // Rural

		// Calculate baseline per capita income
		const baselinePerCapita = totalMembers > 0 
			? baselineFamilyIncome / totalMembers 
			: 0;

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

		const baselineIncomeLevel = calculatePovertyLevel(baselinePerCapita, areaType);

		// Fetch approved ECONOMIC interventions only
		const economicQuery = `
			SELECT 
				[FDP_EconomicID],
				[InvestmentFromPEProgram],
				[IncrementalMonthlyIncome],
				[InterventionType],
				[ApprovalStatus],
				[ApprovalDate],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FormNumber] = @FormNumber
				AND [IsActive] = 1
				AND UPPER(LTRIM(RTRIM([InterventionType]))) = 'ECONOMIC'
				AND UPPER(LTRIM(RTRIM([ApprovalStatus]))) = 'APPROVED'
			ORDER BY 
				CASE WHEN [ApprovalDate] IS NOT NULL THEN [ApprovalDate] ELSE '1900-01-01' END ASC,
				CASE WHEN [CreatedAt] IS NOT NULL THEN [CreatedAt] ELSE '1900-01-01' END ASC,
				[FDP_EconomicID] ASC
		`;

		const economicResult = await sqlRequest.query(economicQuery);
		const economicInterventions = economicResult.recordset || [];

		// Take only first 4 approved economic interventions and map to slots 1-4
		const approvedEconomicInterventions = economicInterventions.slice(0, 4);

		// Build interventions array with incremental income mapped to slots
		const interventions = approvedEconomicInterventions.map((intervention: any, index: number) => {
			const incrementalIncome = intervention.IncrementalMonthlyIncome != null 
				? (typeof intervention.IncrementalMonthlyIncome === 'number' ? intervention.IncrementalMonthlyIncome : parseFloat(intervention.IncrementalMonthlyIncome) || 0)
				: 0;
			
			return {
				InterventionNumber: index + 1,
				Investment: intervention.InvestmentFromPEProgram || 0,
				IncrementalIncome: incrementalIncome,
				IncrementalIncomePerCapita: totalMembers > 0 
					? incrementalIncome / totalMembers 
					: 0,
				InterventionType: intervention.InterventionType || "Economic",
			};
		});

		// Fill remaining slots (up to 4) with zero values if needed
		while (interventions.length < 4) {
			interventions.push({
				InterventionNumber: interventions.length + 1,
				Investment: 0,
				IncrementalIncome: 0,
				IncrementalIncomePerCapita: 0,
				InterventionType: "Economic",
			});
		}

		// Return data
		return NextResponse.json({
			success: true,
			data: {
				familyInfo: {
					FamilyNumber: basicInfo.FormNumber,
					HeadName: basicInfo.Full_Name,
					RegionalCouncil: basicInfo.RegionalCommunity,
					LocalCommunity: basicInfo.LocalCommunity,
					AreaType: areaType,
					BaselineIncomeLevel: baselineIncomeLevel,
					TotalMembers: totalMembers,
					BaselineFamilyIncome: baselineFamilyIncome,
					SelfSufficiencyIncomePerCapita: selfSufficiencyIncomePerCapita,
					Mentor: mentor,
				},
				interventions: interventions,
			},
		});
	} catch (error: any) {
		console.error("Error fetching Planned Self-Sufficiency Status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching Planned Self-Sufficiency Status",
			},
			{ status: 500 }
		);
	}
}

