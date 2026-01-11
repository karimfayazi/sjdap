import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Input parameters
		sqlRequest.input("FamilyID", sql.VarChar, body.FamilyID);
		sqlRequest.input("MaxSocialSupportAmount", sql.Decimal(18, 2), body.MaxSocialSupportAmount || null);
		// Set one-time admission costs to 0 if Regular Support is selected
		const oneTimeCost = isRegularSupport ? 0 : (body.EduOneTimeAdmissionTotalCost || 0);
		const oneTimeFamily = isRegularSupport ? 0 : (body.EduOneTimeAdmissionFamilyContribution || 0);
		const oneTimePE = isRegularSupport ? 0 : (body.EduOneTimeAdmissionPEContribution || 0);
		sqlRequest.input("EduOneTimeAdmissionTotalCost", sql.Decimal(18, 2), oneTimeCost);
		sqlRequest.input("EduOneTimeAdmissionFamilyContribution", sql.Decimal(18, 2), oneTimeFamily);
		sqlRequest.input("EduOneTimeAdmissionPEContribution", sql.Decimal(18, 2), oneTimePE);
		sqlRequest.input("EduMonthlyTuitionTotalCost", sql.Decimal(18, 2), body.EduMonthlyTuitionTotalCost || 0);
		sqlRequest.input("EduMonthlyTuitionFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyTuitionFamilyContribution || 0);
		sqlRequest.input("EduMonthlyTuitionPEContribution", sql.Decimal(18, 2), body.EduMonthlyTuitionPEContribution || 0);
		sqlRequest.input("EduTuitionNumberOfMonths", sql.Int, body.EduTuitionNumberOfMonths || 0);
		sqlRequest.input("EduMonthlyHostelTotalCost", sql.Decimal(18, 2), body.EduMonthlyHostelTotalCost || 0);
		sqlRequest.input("EduMonthlyHostelFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyHostelFamilyContribution || 0);
		sqlRequest.input("EduMonthlyHostelPEContribution", sql.Decimal(18, 2), body.EduMonthlyHostelPEContribution || 0);
		sqlRequest.input("EduHostelNumberOfMonths", sql.Int, body.EduHostelNumberOfMonths || 0);
		sqlRequest.input("EduMonthlyTransportTotalCost", sql.Decimal(18, 2), body.EduMonthlyTransportTotalCost || 0);
		sqlRequest.input("EduMonthlyTransportFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyTransportFamilyContribution || 0);
		sqlRequest.input("EduMonthlyTransportPEContribution", sql.Decimal(18, 2), body.EduMonthlyTransportPEContribution || 0);
		sqlRequest.input("EduTransportNumberOfMonths", sql.Int, body.EduTransportNumberOfMonths || 0);
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || null);
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || null);
		sqlRequest.input("BeneficiaryGender", sql.VarChar, body.BeneficiaryGender || null);
		sqlRequest.input("EducationInterventionType", sql.VarChar, body.EducationInterventionType);
		const isRegularSupport = body.EducationInterventionType === "Regular Support";
		sqlRequest.input("RegularSupport", sql.Bit, isRegularSupport || body.RegularSupport || false);
		sqlRequest.input("BaselineReasonNotStudying", sql.NVarChar, isRegularSupport ? null : (body.BaselineReasonNotStudying || null));
		sqlRequest.input("AdmittedToSchoolType", sql.VarChar, body.AdmittedToSchoolType || null);
		sqlRequest.input("AdmittedToClassLevel", sql.VarChar, body.AdmittedToClassLevel || null);
		sqlRequest.input("BaselineSchoolType", sql.VarChar, body.BaselineSchoolType || null);
		sqlRequest.input("TransferredToSchoolType", sql.VarChar, body.TransferredToSchoolType || null);
		sqlRequest.input("TransferredToClassLevel", sql.VarChar, body.TransferredToClassLevel || null);
		sqlRequest.input("CreatedBy", sql.VarChar, body.CreatedBy || "System");

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			(
				[FamilyID], [MaxSocialSupportAmount],
				[EduOneTimeAdmissionTotalCost], [EduOneTimeAdmissionFamilyContribution], [EduOneTimeAdmissionPEContribution],
				[EduMonthlyTuitionTotalCost], [EduMonthlyTuitionFamilyContribution], [EduMonthlyTuitionPEContribution], [EduTuitionNumberOfMonths],
				[EduMonthlyHostelTotalCost], [EduMonthlyHostelFamilyContribution], [EduMonthlyHostelPEContribution], [EduHostelNumberOfMonths],
				[EduMonthlyTransportTotalCost], [EduMonthlyTransportFamilyContribution], [EduMonthlyTransportPEContribution], [EduTransportNumberOfMonths],
				[BeneficiaryID], [BeneficiaryName], [BeneficiaryAge], [BeneficiaryGender],
				[EducationInterventionType], [RegularSupport], [BaselineReasonNotStudying], [AdmittedToSchoolType], [AdmittedToClassLevel],
				[BaselineSchoolType], [TransferredToSchoolType], [TransferredToClassLevel],
				[CreatedBy], [CreatedAt], [IsActive]
			)
			VALUES
			(
				@FamilyID, @MaxSocialSupportAmount,
				@EduOneTimeAdmissionTotalCost, @EduOneTimeAdmissionFamilyContribution, @EduOneTimeAdmissionPEContribution,
				@EduMonthlyTuitionTotalCost, @EduMonthlyTuitionFamilyContribution, @EduMonthlyTuitionPEContribution, @EduTuitionNumberOfMonths,
				@EduMonthlyHostelTotalCost, @EduMonthlyHostelFamilyContribution, @EduMonthlyHostelPEContribution, @EduHostelNumberOfMonths,
				@EduMonthlyTransportTotalCost, @EduMonthlyTransportFamilyContribution, @EduMonthlyTransportPEContribution, @EduTransportNumberOfMonths,
				@BeneficiaryID, @BeneficiaryName, @BeneficiaryAge, @BeneficiaryGender,
				@EducationInterventionType, @RegularSupport, @BaselineReasonNotStudying, @AdmittedToSchoolType, @AdmittedToClassLevel,
				@BaselineSchoolType, @TransferredToSchoolType, @TransferredToClassLevel,
				@CreatedBy, GETDATE(), 1
			)
		`;

		await sqlRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Education Support data saved successfully",
		});
	} catch (error: any) {
		console.error("Error saving Education Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error saving Education Support data",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpSocialEduId = searchParams.get("fdpSocialEduId");
		const familyID = searchParams.get("familyID");
		const beneficiaryID = searchParams.get("beneficiaryID");

		if (!fdpSocialEduId && !familyID) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Social Education ID or Family ID is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		let query = `
			SELECT *
			FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			WHERE [IsActive] = 1
		`;

		if (fdpSocialEduId) {
			sqlRequest.input("FDP_SocialEduID", sql.Int, parseInt(fdpSocialEduId));
			query += ` AND [FDP_SocialEduID] = @FDP_SocialEduID`;
		} else if (familyID) {
			sqlRequest.input("FamilyID", sql.VarChar, familyID);
			query += ` AND [FamilyID] = @FamilyID`;
			if (beneficiaryID) {
				sqlRequest.input("BeneficiaryID", sql.VarChar, beneficiaryID);
				query += ` AND [BeneficiaryID] = @BeneficiaryID`;
			}
			query += ` ORDER BY [FDP_SocialEduID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// If fdpSocialEduId is provided, return single record; otherwise return all records
		if (fdpSocialEduId) {
			return NextResponse.json({
				success: true,
				data: result.recordset[0] || null,
			});
		} else {
			return NextResponse.json({
				success: true,
				data: result.recordset || [],
			});
		}
	} catch (error: any) {
		console.error("Error fetching Education Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching Education Support data",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fdpSocialEduId = searchParams.get("fdpSocialEduId");

		if (!fdpSocialEduId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP Social Education ID is required for update",
				},
				{ status: 400 }
			);
		}

		const body = await request.json();
		const pool = await getPeDb();
		const sqlRequest = pool.request();

		sqlRequest.input("FDP_SocialEduID", sql.Int, parseInt(fdpSocialEduId));
		sqlRequest.input("MaxSocialSupportAmount", sql.Decimal(18, 2), body.MaxSocialSupportAmount || null);
		
		// Check if Regular Support is selected
		const isRegularSupport = body.EducationInterventionType === "Regular Support";
		
		// Set one-time admission costs to 0 if Regular Support is selected
		const oneTimeCost = isRegularSupport ? 0 : (body.EduOneTimeAdmissionTotalCost || 0);
		const oneTimeFamily = isRegularSupport ? 0 : (body.EduOneTimeAdmissionFamilyContribution || 0);
		const oneTimePE = isRegularSupport ? 0 : (body.EduOneTimeAdmissionPEContribution || 0);
		sqlRequest.input("EduOneTimeAdmissionTotalCost", sql.Decimal(18, 2), oneTimeCost);
		sqlRequest.input("EduOneTimeAdmissionFamilyContribution", sql.Decimal(18, 2), oneTimeFamily);
		sqlRequest.input("EduOneTimeAdmissionPEContribution", sql.Decimal(18, 2), oneTimePE);
		sqlRequest.input("EduMonthlyTuitionTotalCost", sql.Decimal(18, 2), body.EduMonthlyTuitionTotalCost || 0);
		sqlRequest.input("EduMonthlyTuitionFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyTuitionFamilyContribution || 0);
		sqlRequest.input("EduMonthlyTuitionPEContribution", sql.Decimal(18, 2), body.EduMonthlyTuitionPEContribution || 0);
		sqlRequest.input("EduTuitionNumberOfMonths", sql.Int, body.EduTuitionNumberOfMonths || 0);
		sqlRequest.input("EduMonthlyHostelTotalCost", sql.Decimal(18, 2), body.EduMonthlyHostelTotalCost || 0);
		sqlRequest.input("EduMonthlyHostelFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyHostelFamilyContribution || 0);
		sqlRequest.input("EduMonthlyHostelPEContribution", sql.Decimal(18, 2), body.EduMonthlyHostelPEContribution || 0);
		sqlRequest.input("EduHostelNumberOfMonths", sql.Int, body.EduHostelNumberOfMonths || 0);
		sqlRequest.input("EduMonthlyTransportTotalCost", sql.Decimal(18, 2), body.EduMonthlyTransportTotalCost || 0);
		sqlRequest.input("EduMonthlyTransportFamilyContribution", sql.Decimal(18, 2), body.EduMonthlyTransportFamilyContribution || 0);
		sqlRequest.input("EduMonthlyTransportPEContribution", sql.Decimal(18, 2), body.EduMonthlyTransportPEContribution || 0);
		sqlRequest.input("EduTransportNumberOfMonths", sql.Int, body.EduTransportNumberOfMonths || 0);
		sqlRequest.input("BeneficiaryID", sql.VarChar, body.BeneficiaryID);
		sqlRequest.input("BeneficiaryName", sql.NVarChar, body.BeneficiaryName || null);
		sqlRequest.input("BeneficiaryAge", sql.Int, body.BeneficiaryAge || null);
		sqlRequest.input("BeneficiaryGender", sql.VarChar, body.BeneficiaryGender || null);
		sqlRequest.input("EducationInterventionType", sql.VarChar, body.EducationInterventionType);
		sqlRequest.input("RegularSupport", sql.Bit, isRegularSupport || body.RegularSupport || false);
		sqlRequest.input("BaselineReasonNotStudying", sql.NVarChar, isRegularSupport ? null : (body.BaselineReasonNotStudying || null));
		sqlRequest.input("AdmittedToSchoolType", sql.VarChar, body.AdmittedToSchoolType || null);
		sqlRequest.input("AdmittedToClassLevel", sql.VarChar, body.AdmittedToClassLevel || null);
		sqlRequest.input("BaselineSchoolType", sql.VarChar, body.BaselineSchoolType || null);
		sqlRequest.input("TransferredToSchoolType", sql.VarChar, body.TransferredToSchoolType || null);
		sqlRequest.input("TransferredToClassLevel", sql.VarChar, body.TransferredToClassLevel || null);
		sqlRequest.input("UpdatedBy", sql.VarChar, body.UpdatedBy || "System");

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			SET
				[MaxSocialSupportAmount] = @MaxSocialSupportAmount,
				[EduOneTimeAdmissionTotalCost] = @EduOneTimeAdmissionTotalCost,
				[EduOneTimeAdmissionFamilyContribution] = @EduOneTimeAdmissionFamilyContribution,
				[EduOneTimeAdmissionPEContribution] = @EduOneTimeAdmissionPEContribution,
				[EduMonthlyTuitionTotalCost] = @EduMonthlyTuitionTotalCost,
				[EduMonthlyTuitionFamilyContribution] = @EduMonthlyTuitionFamilyContribution,
				[EduMonthlyTuitionPEContribution] = @EduMonthlyTuitionPEContribution,
				[EduTuitionNumberOfMonths] = @EduTuitionNumberOfMonths,
				[EduMonthlyHostelTotalCost] = @EduMonthlyHostelTotalCost,
				[EduMonthlyHostelFamilyContribution] = @EduMonthlyHostelFamilyContribution,
				[EduMonthlyHostelPEContribution] = @EduMonthlyHostelPEContribution,
				[EduHostelNumberOfMonths] = @EduHostelNumberOfMonths,
				[EduMonthlyTransportTotalCost] = @EduMonthlyTransportTotalCost,
				[EduMonthlyTransportFamilyContribution] = @EduMonthlyTransportFamilyContribution,
				[EduMonthlyTransportPEContribution] = @EduMonthlyTransportPEContribution,
				[EduTransportNumberOfMonths] = @EduTransportNumberOfMonths,
				[BeneficiaryID] = @BeneficiaryID,
				[BeneficiaryName] = @BeneficiaryName,
				[BeneficiaryAge] = @BeneficiaryAge,
				[BeneficiaryGender] = @BeneficiaryGender,
				[EducationInterventionType] = @EducationInterventionType,
				[RegularSupport] = @RegularSupport,
				[BaselineReasonNotStudying] = @BaselineReasonNotStudying,
				[AdmittedToSchoolType] = @AdmittedToSchoolType,
				[AdmittedToClassLevel] = @AdmittedToClassLevel,
				[BaselineSchoolType] = @BaselineSchoolType,
				[TransferredToSchoolType] = @TransferredToSchoolType,
				[TransferredToClassLevel] = @TransferredToClassLevel,
				[UpdatedBy] = @UpdatedBy,
				[UpdatedAt] = GETDATE()
			WHERE [FDP_SocialEduID] = @FDP_SocialEduID
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Education Support data updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating Education Support data:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating Education Support data",
			},
			{ status: 500 }
		);
	}
}


