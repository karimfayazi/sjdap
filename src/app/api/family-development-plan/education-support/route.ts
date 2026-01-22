import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";
import { getUserIdFromNextRequest } from "@/lib/auth";

export const maxDuration = 120;

/**
 * NOTE: The CHECK constraint on EducationInterventionType column in PE_FDP_SocialEducation table
 * currently only allows "Admitted" and "Transferred". To support "Regular Support", the constraint
 * needs to be updated in the database:
 * 
 * ALTER TABLE [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
 * DROP CONSTRAINT CK__PE_FDP_So__Educa__226010D3;
 * 
 * ALTER TABLE [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
 * ADD CONSTRAINT CK__PE_FDP_So__Educa__226010D3 
 * CHECK ([EducationInterventionType] IN ('Admitted', 'Transferred', 'Regular'));
 */

export async function POST(request: NextRequest) {
	try {
		// Get userId from auth cookie
		const userId = getUserIdFromNextRequest(request);
		
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: "Not authenticated",
				},
				{ status: 401 }
			);
		}

		// Get user's full name (username) for CreatedBy
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.UserFullName || userId;

		const body = await request.json();
		
		// Validate FormNumber
		const formNumber = body.FormNumber || body.FamilyID || "";
		if (!formNumber || formNumber.trim() === "") {
			return NextResponse.json(
				{
					success: false,
					message: "FormNumber is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Input parameters
		sqlRequest.input("FormNumber", sql.VarChar, formNumber);
		sqlRequest.input("MaxSocialSupportAmount", sql.Decimal(18, 2), body.MaxSocialSupportAmount || null);
		
		// Validate and normalize EducationInterventionType
		const allowedValues = ["Admitted", "Transferred", "Regular Support"];
		let interventionType = body.EducationInterventionType ? String(body.EducationInterventionType).trim() : "";
		
		if (!interventionType || !allowedValues.includes(interventionType)) {
			return NextResponse.json(
				{
					success: false,
					message: `Invalid EducationInterventionType. Must be one of: ${allowedValues.join(", ")}`,
				},
				{ status: 400 }
			);
		}
		
		// Query the CHECK constraint to see what values are allowed
		let constraintCheckQuery = `
			SELECT 
				cc.name AS ConstraintName,
				cc.definition AS ConstraintDefinition
			FROM sys.check_constraints cc
			INNER JOIN sys.objects o ON cc.parent_object_id = o.object_id
			INNER JOIN sys.columns col ON cc.parent_column_id = col.column_id AND cc.parent_object_id = col.object_id
			WHERE o.name = 'PE_FDP_SocialEducation' 
			AND col.name = 'EducationInterventionType'
		`;
		
		try {
			const constraintResult = await pool.request().query(constraintCheckQuery);
			if (constraintResult.recordset.length > 0) {
				console.log("CHECK Constraint Definition:", constraintResult.recordset[0].ConstraintDefinition);
			}
		} catch (err) {
			console.log("Could not query constraint definition:", err);
		}
		
		// Check if Regular Support is selected (use original value for logic)
		const isRegularSupport = interventionType === "Regular Support";
		
		// Map "Regular Support" to a database-compatible value
		// The CHECK constraint might only allow "Admitted" and "Transferred"
		// If "Regular" is not allowed, we'll try NULL or use a workaround
		let dbInterventionType: string | null;
		
		if (isRegularSupport) {
			// Try "Regular" first - if constraint fails, we'll need to handle differently
			// The constraint might only allow "Admitted" and "Transferred"
			dbInterventionType = "Regular";
		} else {
			dbInterventionType = interventionType;
		}
		
		// Log the value being sent for debugging
		console.log("EducationInterventionType mapping:", {
			original: interventionType,
			mapped: dbInterventionType,
			bodyValue: body.EducationInterventionType,
			isRegularSupport: isRegularSupport
		});
		
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
		sqlRequest.input("EducationInterventionType", sql.VarChar, dbInterventionType);
		sqlRequest.input("BaselineReasonNotStudying", sql.NVarChar, isRegularSupport ? null : (body.BaselineReasonNotStudying || null));
		sqlRequest.input("AdmittedToSchoolType", sql.VarChar, body.AdmittedToSchoolType || null);
		sqlRequest.input("AdmittedToClassLevel", sql.VarChar, body.AdmittedToClassLevel || null);
		sqlRequest.input("BaselineSchoolType", sql.VarChar, body.BaselineSchoolType || null);
		sqlRequest.input("TransferredToSchoolType", sql.VarChar, body.TransferredToSchoolType || null);
		sqlRequest.input("TransferredToClassLevel", sql.VarChar, body.TransferredToClassLevel || null);
		sqlRequest.input("CreatedBy", sql.VarChar, userFullName);
		sqlRequest.input("ApprovalStatus", sql.NVarChar, "Pending");

		// Query existing records to see what values are actually stored
		const checkQuery = `
			SELECT DISTINCT [EducationInterventionType]
			FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			WHERE [IsActive] = 1
			ORDER BY [EducationInterventionType]
		`;
		const existingTypes = await pool.request().query(checkQuery);
		console.log("Existing EducationInterventionType values in database:", existingTypes.recordset);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			(
				[FormNumber], [MaxSocialSupportAmount],
				[EduOneTimeAdmissionTotalCost], [EduOneTimeAdmissionFamilyContribution], [EduOneTimeAdmissionPEContribution],
				[EduMonthlyTuitionTotalCost], [EduMonthlyTuitionFamilyContribution], [EduMonthlyTuitionPEContribution], [EduTuitionNumberOfMonths],
				[EduMonthlyHostelTotalCost], [EduMonthlyHostelFamilyContribution], [EduMonthlyHostelPEContribution], [EduHostelNumberOfMonths],
				[EduMonthlyTransportTotalCost], [EduMonthlyTransportFamilyContribution], [EduMonthlyTransportPEContribution], [EduTransportNumberOfMonths],
				[BeneficiaryID], [BeneficiaryName], [BeneficiaryAge], [BeneficiaryGender],
				[EducationInterventionType], [BaselineReasonNotStudying], [AdmittedToSchoolType], [AdmittedToClassLevel],
				[BaselineSchoolType], [TransferredToSchoolType], [TransferredToClassLevel],
				[CreatedBy], [CreatedAt], [ApprovalStatus], [IsActive]
			)
			VALUES
			(
				@FormNumber, @MaxSocialSupportAmount,
				@EduOneTimeAdmissionTotalCost, @EduOneTimeAdmissionFamilyContribution, @EduOneTimeAdmissionPEContribution,
				@EduMonthlyTuitionTotalCost, @EduMonthlyTuitionFamilyContribution, @EduMonthlyTuitionPEContribution, @EduTuitionNumberOfMonths,
				@EduMonthlyHostelTotalCost, @EduMonthlyHostelFamilyContribution, @EduMonthlyHostelPEContribution, @EduHostelNumberOfMonths,
				@EduMonthlyTransportTotalCost, @EduMonthlyTransportFamilyContribution, @EduMonthlyTransportPEContribution, @EduTransportNumberOfMonths,
				@BeneficiaryID, @BeneficiaryName, @BeneficiaryAge, @BeneficiaryGender,
				@EducationInterventionType, @BaselineReasonNotStudying, @AdmittedToSchoolType, @AdmittedToClassLevel,
				@BaselineSchoolType, @TransferredToSchoolType, @TransferredToClassLevel,
				@CreatedBy, GETDATE(), @ApprovalStatus, 1
			)
		`;

		console.log("Executing INSERT with EducationInterventionType:", dbInterventionType);
		
		try {
			await sqlRequest.query(insertQuery);
		} catch (insertError: any) {
			// If the error is about the CHECK constraint and we're trying to insert "Regular"
			if (insertError.message && insertError.message.includes("CHECK constraint") && dbInterventionType === "Regular") {
				console.error("CHECK constraint error - 'Regular' is not allowed. Constraint likely only allows 'Admitted' and 'Transferred'.");
				console.error("Error details:", insertError.message);
				
				// The constraint doesn't allow "Regular" - we need to inform the user
				// or use an alternative approach (e.g., NULL if allowed, or update the constraint)
				return NextResponse.json(
					{
						success: false,
						message: "The database constraint does not allow 'Regular Support' as an Education Intervention Type. The database only allows 'Admitted' and 'Transferred'. Please contact the database administrator to update the constraint to allow 'Regular Support'.",
						errorDetails: insertError.message
					},
					{ status: 400 }
				);
			}
			throw insertError; // Re-throw if it's a different error
		}

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
			sqlRequest.input("FormNumber", sql.VarChar, familyID);
			query += ` AND [FormNumber] = @FormNumber`;
			if (beneficiaryID) {
				sqlRequest.input("BeneficiaryID", sql.VarChar, beneficiaryID);
				query += ` AND [BeneficiaryID] = @BeneficiaryID`;
			}
			query += ` ORDER BY [FDP_SocialEduID] DESC`;
		}

		const result = await sqlRequest.query(query);

		// Map "Regular" back to "Regular Support" for display
		const mapInterventionTypeForDisplay = (type: string | null | undefined): string => {
			if (!type) return type || "";
			return type === "Regular" ? "Regular Support" : type;
		};

		// Transform records to map database values to display values
		const transformRecord = (record: any) => {
			if (!record) return record;
			return {
				...record,
				EducationInterventionType: mapInterventionTypeForDisplay(record.EducationInterventionType)
			};
		};

		// If fdpSocialEduId is provided, return single record; otherwise return all records
		if (fdpSocialEduId) {
			const record = result.recordset[0] || null;
			return NextResponse.json({
				success: true,
				data: transformRecord(record),
			});
		} else {
			const records = result.recordset || [];
			return NextResponse.json({
				success: true,
				data: records.map(transformRecord),
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
		// Get userId from auth cookie
		const userId = getUserIdFromNextRequest(request);
		
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: "Not authenticated",
				},
				{ status: 401 }
			);
		}

		// Get user's full name (username) for UpdatedBy
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.input("email_address", userId)
			.query(
				"SELECT TOP(1) [UserFullName] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
			);

		const user = userResult.recordset?.[0];
		const userFullName = user?.UserFullName || userId;

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
		
		// Validate and normalize EducationInterventionType
		const allowedValues = ["Admitted", "Transferred", "Regular Support"];
		let interventionType = body.EducationInterventionType ? String(body.EducationInterventionType).trim() : "";
		
		if (!interventionType || !allowedValues.includes(interventionType)) {
			return NextResponse.json(
				{
					success: false,
					message: `Invalid EducationInterventionType. Must be one of: ${allowedValues.join(", ")}`,
				},
				{ status: 400 }
			);
		}
		
		// Check if Regular Support is selected (use original value for logic)
		const isRegularSupport = interventionType === "Regular Support";
		
		// Map "Regular Support" to a database-compatible value
		// The CHECK constraint might only allow "Admitted" and "Transferred"
		// If "Regular" is not allowed, we'll try NULL or use a workaround
		let dbInterventionType: string | null;
		
		if (isRegularSupport) {
			// Try "Regular" first - if constraint fails, we'll need to handle differently
			// The constraint might only allow "Admitted" and "Transferred"
			dbInterventionType = "Regular";
		} else {
			dbInterventionType = interventionType;
		}
		
		// Log the value being sent for debugging
		console.log("EducationInterventionType mapping (PUT):", {
			original: interventionType,
			mapped: dbInterventionType,
			bodyValue: body.EducationInterventionType,
			isRegularSupport: isRegularSupport
		});
		
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
		sqlRequest.input("EducationInterventionType", sql.VarChar, dbInterventionType);
		sqlRequest.input("BaselineReasonNotStudying", sql.NVarChar, isRegularSupport ? null : (body.BaselineReasonNotStudying || null));
		sqlRequest.input("AdmittedToSchoolType", sql.VarChar, body.AdmittedToSchoolType || null);
		sqlRequest.input("AdmittedToClassLevel", sql.VarChar, body.AdmittedToClassLevel || null);
		sqlRequest.input("BaselineSchoolType", sql.VarChar, body.BaselineSchoolType || null);
		sqlRequest.input("TransferredToSchoolType", sql.VarChar, body.TransferredToSchoolType || null);
		sqlRequest.input("TransferredToClassLevel", sql.VarChar, body.TransferredToClassLevel || null);
		sqlRequest.input("UpdatedBy", sql.VarChar, userFullName);

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

		console.log("Executing UPDATE with EducationInterventionType:", dbInterventionType);
		
		try {
			await sqlRequest.query(updateQuery);
		} catch (updateError: any) {
			// If the error is about the CHECK constraint and we're trying to update to "Regular"
			if (updateError.message && updateError.message.includes("CHECK constraint") && dbInterventionType === "Regular") {
				console.error("CHECK constraint error - 'Regular' is not allowed. Constraint likely only allows 'Admitted' and 'Transferred'.");
				console.error("Error details:", updateError.message);
				
				// The constraint doesn't allow "Regular" - we need to inform the user
				// or use an alternative approach (e.g., NULL if allowed, or update the constraint)
				return NextResponse.json(
					{
						success: false,
						message: "The database constraint does not allow 'Regular Support' as an Education Intervention Type. The database only allows 'Admitted' and 'Transferred'. Please contact the database administrator to update the constraint to allow 'Regular Support'.",
						errorDetails: updateError.message
					},
					{ status: 400 }
				);
			}
			throw updateError; // Re-throw if it's a different error
		}

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


