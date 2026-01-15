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
		sqlRequest.input("FormNumber", sql.VarChar, formNumber);

		// Fetch Health Support approval status
		let healthSupport: any[] = [];
		try {
			const healthQuery = `
				SELECT 
					[FDP_HealthSupportID],
					[FormNumber],
					[HeadName],
					[HealthMonthlyTotalCost],
					[HealthMonthlyFamilyContribution],
					[HealthMonthlyPEContribution],
					[HealthNumberOfMonths],
					[HealthTotalCost],
					[HealthTotalFamilyContribution],
					[HealthTotalPEContribution],
					[BeneficiaryID],
					[BeneficiaryName],
					[ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [FormNumber] = @FormNumber
					AND [IsActive] = 1
				ORDER BY [FDP_HealthSupportID] DESC
			`;
			const healthResult = await sqlRequest.query(healthQuery);
			healthSupport = healthResult.recordset || [];
		} catch (err) {
			console.log("Error fetching Health Support:", err);
		}

		// Fetch Food Support approval status
		let foodSupport: any[] = [];
		try {
			const foodQuery = `
				SELECT 
					[FDP_FoodSupportID],
					[FamilyID],
					[HeadName],
					[BaselineFamilyIncome],
					[FamilyMembersCount],
					[FamilyPerCapitaIncome],
					[SelfSufficiencyIncomePerCapita],
					[BaselinePerCapitaAsPctOfSelfSuff],
					[BaselinePovertyLevel],
					[MaxSocialSupportAmount],
					[FoodSupportMonthlyTotalCost],
					[FoodSupportMonthlyFamilyContribution],
					[FoodSupportMonthlyPEContribution],
					[FoodSupportNumberOfMonths],
					[FoodSupportTotalCost],
					[FoodSupportTotalFamilyContribution],
					[FoodSupportTotalPEContribution],
					[CreatedBy],
					[CreatedAt],
					[UpdatedBy],
					[UpdatedAt],
					[IsActive],
					[ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
				ORDER BY [FDP_FoodSupportID] DESC
			`;
			const foodResult = await sqlRequest.query(foodQuery);
			foodSupport = foodResult.recordset || [];
		} catch (err) {
			console.log("Error fetching Food Support:", err);
		}

		// Fetch Education Support approval status
		let educationSupport: any[] = [];
		try {
			const educationQuery = `
				SELECT 
					[FDP_SocialEduID],
					[FamilyID],
					[MaxSocialSupportAmount],
					[EduOneTimeAdmissionTotalCost],
					[EduOneTimeAdmissionFamilyContribution],
					[EduOneTimeAdmissionPEContribution],
					[EduMonthlyTuitionTotalCost],
					[EduMonthlyTuitionFamilyContribution],
					[EduMonthlyTuitionPEContribution],
					[EduTuitionNumberOfMonths],
					[EduMonthlyHostelTotalCost],
					[EduMonthlyHostelFamilyContribution],
					[EduMonthlyHostelPEContribution],
					[EduHostelNumberOfMonths],
					[EduMonthlyTransportTotalCost],
					[EduMonthlyTransportFamilyContribution],
					[EduMonthlyTransportPEContribution],
					[EduTransportNumberOfMonths],
					[EduTotalSupportCost],
					[EduTotalFamilyContribution],
					[EduTotalPEContribution],
					[BeneficiaryID],
					[BeneficiaryName],
					[BeneficiaryAge],
					[BeneficiaryGender],
					[EducationInterventionType],
					[BaselineReasonNotStudying],
					[AdmittedToSchoolType],
					[AdmittedToClassLevel],
					[BaselineSchoolType],
					[TransferredToSchoolType],
					[TransferredToClassLevel],
					[CreatedBy],
					[CreatedAt],
					[UpdatedBy],
					[UpdatedAt],
					[IsActive],
					[ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
				ORDER BY [FDP_SocialEduID] DESC
			`;
			const educationResult = await sqlRequest.query(educationQuery);
			educationSupport = educationResult.recordset || [];
		} catch (err) {
			console.log("Error fetching Education Support:", err);
		}

		// Fetch Housing Support approval status
		let housingSupport: any[] = [];
		try {
			const housingQuery = `
				SELECT 
					[FDP_HabitatSupportID],
					[FamilyID],
					[HeadName],
					[AreaType],
					[HabitatMonthlyTotalCost],
					[HabitatMonthlyFamilyContribution],
					[HabitatMonthlyPEContribution],
					[HabitatNumberOfMonths],
					[HabitatTotalCost],
					[HabitatTotalFamilyContribution],
					[HabitatTotalPEContribution],
					[CreatedBy],
					[CreatedAt],
					[UpdatedBy],
					[UpdatedAt],
					[IsActive],
					[ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
				ORDER BY [FDP_HabitatSupportID] DESC
			`;
			const housingResult = await sqlRequest.query(housingQuery);
			housingSupport = housingResult.recordset || [];
		} catch (err) {
			console.log("Error fetching Housing Support:", err);
		}

		// Fetch Economic Support approval status
		let economicSupport: any[] = [];
		try {
			const economicQuery = `
				SELECT 
					[FDP_EconomicID],
					[FamilyID],
					[BaselineFamilyIncome],
					[FamilyMembersCount],
					[SelfSufficiencyIncomePerCapita],
					[BaselinePovertyLevel],
					[BeneficiaryID],
					[BeneficiaryName],
					[BeneficiaryAge],
					[BeneficiaryGender],
					[BeneficiaryCurrentOccupation],
					[InterventionType],
					[FieldOfInvestment],
					[SubFieldOfInvestment],
					[Trade],
					[SkillsDevelopmentCourse],
					[Institution],
					[InvestmentRequiredTotal],
					[ContributionFromBeneficiary],
					[InvestmentFromPEProgram],
					[GrantAmount],
					[LoanAmount],
					[InvestmentValidationStatus],
					[PlannedMonthlyIncome],
					[CurrentMonthlyIncome],
					[FeasibilityID],
					[ApprovalStatus],
					[ApprovalDate],
					[ApprovalRemarks],
					[CreatedBy],
					[CreatedAt],
					[UpdatedBy],
					[UpdatedAt],
					[IsActive],
					[IncrementalMonthlyIncome]
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
				ORDER BY [FDP_EconomicID] DESC
			`;
			const economicResult = await sqlRequest.query(economicQuery);
			economicSupport = economicResult.recordset || [];
		} catch (err) {
			console.log("Error fetching Economic Support:", err);
		}

		return NextResponse.json({
			success: true,
			data: {
				healthSupport,
				foodSupport,
				educationSupport,
				housingSupport,
				economicSupport,
			},
		});
	} catch (error: any) {
		console.error("Error fetching approval status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching approval status",
			},
			{ status: 500 }
		);
	}
}
