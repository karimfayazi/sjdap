import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";
import { getSelfSufficiencyIncomePerCapita, getPovertyLevelByPercent } from "@/config/selfSufficiency";

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
		const familyMembers = parseInt(membersData?.TotalMembers || 0) || 0;
		const totalMemberIncome = parseFloat(membersData?.TotalMemberIncome || 0) || 0;

		// Get Mentor from SubmittedBy field in PE_Application_BasicInfo
		const mentor = basicInfo.SubmittedBy || null;

		// Get requiredPerCapitaPM from config (based on area type)
		const areaType = (basicInfo.Area_Type || "Rural").trim();
		const requiredPerCapitaPM = getSelfSufficiencyIncomePerCapita(areaType);

		// Fetch accepted economic interventions ordered by CreatedAt ASC
		// This defines the sequence for Intervention 1..4
		const economicQuery = `
			SELECT 
				[InvestmentFromPEProgram],
				[CurrentMonthlyIncome],
				[IncrementalMonthlyIncome],
				[CreatedAt]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FormNumber] = @FormNumber
				AND [ApprovalStatus] = 'Accepted'
			ORDER BY [CreatedAt] ASC
		`;

		const economicResult = await sqlRequest.query(economicQuery);
		const acceptedInterventions = economicResult.recordset || [];

		// Calculate baselineIncomePM as Total Family Baseline Income
		// Total Family Baseline Income = Family Income + Total Member Income
		// Family Income = MonthlyIncome_Remittance + MonthlyIncome_Rental + MonthlyIncome_OtherSources
		const familyIncome = 
			(parseFloat(basicInfo.MonthlyIncome_Remittance || 0) || 0) +
			(parseFloat(basicInfo.MonthlyIncome_Rental || 0) || 0) +
			(parseFloat(basicInfo.MonthlyIncome_OtherSources || 0) || 0);
		
		// Total Family Baseline Income = Family Income + Total Member Income
		const baselineIncomePM = familyIncome + totalMemberIncome;

		// Temporary debug logging for formNumber PE-00006
		if (formNumber === "PE-00006") {
			console.log("[DEBUG PE-00006] Baseline Income Calculation:");
			console.log("  - MonthlyIncome_Remittance:", basicInfo.MonthlyIncome_Remittance);
			console.log("  - MonthlyIncome_Rental:", basicInfo.MonthlyIncome_Rental);
			console.log("  - MonthlyIncome_OtherSources:", basicInfo.MonthlyIncome_OtherSources);
			console.log("  - Family Income (sum of above):", familyIncome);
			console.log("  - Total Member Income:", totalMemberIncome);
			console.log("  - baselineIncomePM (Family Income + Total Member Income):", baselineIncomePM);
		}

		// Calculate targetIncomePM = requiredPerCapitaPM * familyMembers
		const targetIncomePM = requiredPerCapitaPM * familyMembers;

		// Calculate baseline values
		const baselinePerCapita = familyMembers > 0 
			? baselineIncomePM / familyMembers 
			: 0;
		const baselinePercent = requiredPerCapitaPM > 0
			? baselinePerCapita / requiredPerCapitaPM
			: 0;
		const baselinePovertyLevel = getPovertyLevelByPercent(baselinePercent);
		const baselineSSStatus = baselineIncomePM - targetIncomePM;

		// Take first 4 accepted interventions (ordered by CreatedAt ASC)
		const plannedInterventions = acceptedInterventions.slice(0, 4);

		// Calculate interventions with cumulative values
		// Start with baseline income
		let cumulativeIncome = baselineIncomePM;
		const interventions: Array<{
			idx: number;
			investment: number;
			incrementalIncome: number;
			incomeAfter: number;
			perCapita: number;
			percent: number;
			povertyLevel: string;
			ssStatus: number;
		}> = [];

		// Process up to 4 interventions
		for (let i = 0; i < 4; i++) {
			const intervention = plannedInterventions[i];
			
			// Get investment and incremental income from the intervention record
			// Use ISNULL equivalent: if null/undefined, use 0
			const investment = intervention 
				? (parseFloat(intervention.InvestmentFromPEProgram || 0) || 0)
				: 0;
			const incrementalIncome = intervention
				? (parseFloat(intervention.IncrementalMonthlyIncome || 0) || 0)
				: 0;

			// Calculate cumulative income after this intervention
			// incomeAfter[i] = baselineIncomePM + inc[1] + inc[2] + ... + inc[i]
			cumulativeIncome += incrementalIncome;

			// Calculate per capita after this intervention
			const perCapitaAfter = familyMembers > 0 
				? cumulativeIncome / familyMembers 
				: 0;

			// Calculate percent after this intervention (as decimal)
			const percentAfter = requiredPerCapitaPM > 0
				? perCapitaAfter / requiredPerCapitaPM
				: 0;

			// Calculate poverty level
			const povertyLevelAfter = getPovertyLevelByPercent(percentAfter);

			// Calculate self-sufficiency status
			const ssStatusAfter = cumulativeIncome - targetIncomePM;

			interventions.push({
				idx: i + 1,
				investment: investment,
				incrementalIncome: incrementalIncome,
				incomeAfter: cumulativeIncome,
				perCapita: perCapitaAfter,
				percent: percentAfter,
				povertyLevel: povertyLevelAfter,
				ssStatus: ssStatusAfter,
			});
		}

		// Calculate total investment
		const totalInvestment = interventions.reduce((sum, inv) => sum + (inv.investment || 0), 0);

		// Return data matching Excel structure
		return NextResponse.json({
			success: true,
			familyInfo: {
				FamilyNumber: basicInfo.FormNumber,
				HeadName: basicInfo.Full_Name,
				RegionalCouncil: basicInfo.RegionalCommunity,
				LocalCommunity: basicInfo.LocalCommunity,
				AreaType: areaType,
				TotalMembers: familyMembers,
				Mentor: mentor,
			},
			requiredPerCapitaPM: requiredPerCapitaPM,
			familyMembers: familyMembers,
			targetIncomePM: targetIncomePM,
			baselineIncomePM: baselineIncomePM,
			baseline: {
				perCapita: baselinePerCapita,
				percent: baselinePercent,
				povertyLevel: baselinePovertyLevel,
				ssStatus: baselineSSStatus,
			},
			interventions: interventions,
			totalInvestment: totalInvestment,
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

