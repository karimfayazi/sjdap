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
		sqlRequest.input("formNumber", sql.NVarChar, formNumber);

		// Fetch baseline family income and area type
		const basicInfoQuery = `
			SELECT TOP 1
				[MonthlyIncome_Remittance],
				[MonthlyIncome_Rental],
				[MonthlyIncome_OtherSources],
				[Intake_family_Income],
				[Area_Type]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`;

		const basicInfoResult = await sqlRequest.query(basicInfoQuery);
		const basicInfo = basicInfoResult.recordset[0];

		if (!basicInfo) {
			return NextResponse.json(
				{
					success: false,
					message: "Application not found",
				},
				{ status: 404 }
			);
		}

		// Calculate family income (not including member income) - from Monthly Income fields
		const familyIncome = 
			(basicInfo.MonthlyIncome_Remittance || 0) +
			(basicInfo.MonthlyIncome_Rental || 0) +
			(basicInfo.MonthlyIncome_OtherSources || 0);

		// Fetch family members with their monthly income
		const membersQuery = `
			SELECT 
				[MonthlyIncome]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @formNumber
		`;

		const membersResult = await sqlRequest.query(membersQuery);
		const familyMembers = membersResult.recordset || [];
		const familyMembersCount = familyMembers.length;

		// Calculate total member income (sum of all members' monthly income)
		const totalMemberIncome = familyMembers.reduce((sum: number, member: any) => {
			return sum + (member.MonthlyIncome || 0);
		}, 0);

		// Total Family Baseline Income = Family Income + Total Member Income
		const baselineFamilyIncome = familyIncome + totalMemberIncome;

		// Get self-sufficiency income per capita (Intake_family_Income)
		const selfSufficiencyIncomePerCapita = basicInfo.Intake_family_Income || 0;

		// Calculate Family Per Capita Income = Total Family Baseline Income / Total Members
		const familyPerCapitaIncome = familyMembersCount > 0 
			? baselineFamilyIncome / familyMembersCount 
			: 0;

		// Calculate % of Self-Sufficiency Income = (Per Capita Income / Intake Income) * 100
		const baselineIncomePerCapitaAsPercentOfSelfSufficiency = selfSufficiencyIncomePerCapita > 0
			? (familyPerCapitaIncome / selfSufficiencyIncomePerCapita) * 100
			: 0;

		return NextResponse.json({
			success: true,
			data: {
				BaselineFamilyIncome: baselineFamilyIncome, // Total Family Baseline Income
				FamilyMembersCount: familyMembersCount,
				FamilyPerCapitaIncome: familyPerCapitaIncome,
				BaselineIncomePerCapitaAsPercentOfSelfSufficiency: baselineIncomePerCapitaAsPercentOfSelfSufficiency,
				SelfSufficiencyIncomePerCapita: selfSufficiencyIncomePerCapita,
				Area_Type: basicInfo.Area_Type || "Rural",
			},
		});
	} catch (error: any) {
		console.error("Error fetching baseline data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching baseline data",
			},
			{ status: 500 }
		);
	}
}


