import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// Helper function to find the correct table name
async function findTableName(pool: sql.ConnectionPool): Promise<string> {
	try {
		const tableCheckQuery = `
			SELECT TABLE_NAME
			FROM INFORMATION_SCHEMA.TABLES
			WHERE TABLE_SCHEMA = 'dbo'
			AND (
				TABLE_NAME = 'PE_Application_BasicInfo' 
				OR TABLE_NAME = 'PE_ApplicationBasicInfo'
				OR TABLE_NAME LIKE '%Application%Basic%'
			)
			ORDER BY 
				CASE 
					WHEN TABLE_NAME = 'PE_Application_BasicInfo' THEN 1
					WHEN TABLE_NAME = 'PE_ApplicationBasicInfo' THEN 2
					ELSE 3
				END
		`;
		const tableCheckResult = await pool.request().query(tableCheckQuery);
		
		if (tableCheckResult.recordset.length > 0) {
			return tableCheckResult.recordset[0].TABLE_NAME;
		}
	} catch (tableCheckError) {
		console.error("Error checking table name:", tableCheckError);
	}
	
	return "PE_Application_BasicInfo";
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: formNoOrId } = await params;

		if (!formNoOrId) {
			return NextResponse.json(
				{ success: false, message: "Form No or Application ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const tableName = await findTableName(pool);

		// Check if id is a FormNo (starts with "PE-") or ApplicationId (numeric)
		const isFormNo = formNoOrId.startsWith("PE-");
		let formNo = formNoOrId;
		let applicationId: number | null = null;

		// Try to get application from PE_Application table if it exists (for ApplicationId lookup)
		if (!isFormNo) {
			try {
				const appIdRequest = pool.request();
				appIdRequest.input("applicationId", parseInt(formNoOrId));
				const appIdQuery = `
					SELECT [ApplicationId], [FormNo], [TotalFamilyMembers], [Remarks], [CreatedAt], [CreatedBy]
					FROM [SJDA_Users].[dbo].[PE_Application]
					WHERE [ApplicationId] = @applicationId
				`;
				const appIdResult = await appIdRequest.query(appIdQuery);
				if (appIdResult.recordset && appIdResult.recordset.length > 0) {
					const app = appIdResult.recordset[0];
					applicationId = app.ApplicationId;
					formNo = app.FormNo;
				}
			} catch (err) {
				// PE_Application table might not exist, continue with FormNo lookup
				console.log("PE_Application table not found, using FormNo lookup");
			}
		}

		// Get application details from PE_Application_BasicInfo using FormNo
		const applicationRequest = pool.request();
		applicationRequest.input("formNo", formNo);
		
		// Get basic info from PE_Application_BasicInfo
		const basicInfoQuery = `
			SELECT TOP 1
				[FormNumber] as FormNo,
				[Full_Name] as FullName,
				[CNICNumber] as CNICNo,
				[PrimaryContactNumber] as PrimaryContactNo,
				[RegionalCommunity] as RegionalCouncil,
				[LocalCommunity] as LocalCouncil,
				[CreatedAt],
				[UpdatedAt]
			FROM [SJDA_Users].[dbo].[${tableName}]
			WHERE [FormNumber] = @formNo
		`;
		const basicInfoResult = await applicationRequest.query(basicInfoQuery);
		const basicInfo = basicInfoResult.recordset[0];

		if (!basicInfo) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		// Update formNo from basicInfo
		formNo = basicInfo.FormNo;

		// Create application object compatible with the frontend
		const application = {
			ApplicationId: applicationId || 0,
			FormNo: formNo,
			TotalFamilyMembers: null,
			Remarks: null,
			CreatedAt: basicInfo.CreatedAt,
			CreatedBy: null
		};

		// Get family heads - try PE_ApplicationPerson first, fallback to basic info
		const familyHeadsRequest = pool.request();
		familyHeadsRequest.input("formNo", formNo);
		if (applicationId) {
			familyHeadsRequest.input("applicationId", applicationId);
		}
		
		let familyHeads: any[] = [];
		try {
			const familyHeadsQuery = `
				SELECT 
					ap.[FormNo],
					ap.[ApplicationId],
					ap.[PersonRole],
					ap.[FullName],
					ap.[CNICNo],
					ap.[MotherTongue],
					ap.[ResidentialAddress],
					ap.[PrimaryContactNo],
					ap.[RegionalCouncil],
					ap.[LocalCouncil],
					ap.[CurrentJK],
					ap.[PrimaryLocationSettlement],
					ap.[AreaOfOrigin],
					ap.[HouseStatusName]
				FROM [SJDA_Users].[dbo].[PE_ApplicationPerson] ap
				WHERE ap.[FormNo] = @formNo
			`;
			const familyHeadsResult = await familyHeadsRequest.query(familyHeadsQuery);
			familyHeads = familyHeadsResult.recordset || [];
		} catch (err) {
			// If PE_ApplicationPerson doesn't exist or has no data, create from basic info
			console.log("PE_ApplicationPerson not found, using basic info");
			familyHeads = [{
				FormNo: formNo,
				ApplicationId: applicationId || 0,
				PersonRole: null,
				FullName: basicInfo.FullName,
				CNICNo: basicInfo.CNICNo,
				MotherTongue: null,
				ResidentialAddress: null,
				PrimaryContactNo: basicInfo.PrimaryContactNo,
				RegionalCouncil: basicInfo.RegionalCouncil,
				LocalCouncil: basicInfo.LocalCouncil,
				CurrentJK: null,
				PrimaryLocationSettlement: null,
				AreaOfOrigin: null,
				HouseStatusName: null
			}];
		}

		// Get family members with lookup values - match using FormNo
		// Try with lookup tables first, fallback to simple query if lookup tables don't exist
		let familyMembers: any[] = [];
		try {
			const familyMembersRequest = pool.request();
			familyMembersRequest.input("formNo", formNo);
			if (applicationId) {
				familyMembersRequest.input("applicationId", applicationId);
			}
			const familyMembersQuery = `
				SELECT 
					fm.[ApplicationId],
					fm.[FormNo],
					fm.[BeneficiaryID],
					fm.[FullName],
					fm.[BFormOrCNIC],
					fm.[RelationshipId],
					rel.[RelationshipName],
					fm.[RelationshipOther],
					fm.[GenderId],
					gen.[GenderName],
					fm.[MaritalStatusId],
					ms.[MaritalStatusName],
					fm.[DOBMonth],
					fm.[DOBYear],
					fm.[OccupationId],
					occ.[OccupationName],
					fm.[OccupationOther],
					fm.[PrimaryLocation],
					fm.[IsPrimaryEarner]
				FROM [SJDA_Users].[dbo].[PE_FamilyMember] fm
				LEFT JOIN [SJDA_Users].[dbo].[PE_LU_Relationship] rel ON fm.[RelationshipId] = rel.[RelationshipId]
				LEFT JOIN [SJDA_Users].[dbo].[PE_LU_Gender] gen ON fm.[GenderId] = gen.[GenderId]
				LEFT JOIN [SJDA_Users].[dbo].[PE_LU_MaritalStatus] ms ON fm.[MaritalStatusId] = ms.[MaritalStatusId]
				LEFT JOIN [SJDA_Users].[dbo].[PE_LU_PrimaryOccupation] occ ON fm.[OccupationId] = occ.[OccupationId]
				WHERE fm.[FormNo] = @formNo
				ORDER BY fm.[BeneficiaryID]
			`;
			const familyMembersResult = await familyMembersRequest.query(familyMembersQuery);
			familyMembers = familyMembersResult.recordset || [];
		} catch (err: any) {
			// If lookup tables don't exist, use simple query without joins
			console.log("Lookup tables not found, using simple query:", err.message);
			try {
				const familyMembersRequest = pool.request();
				familyMembersRequest.input("formNo", formNo);
				if (applicationId) {
					familyMembersRequest.input("applicationId", applicationId);
				}
				const simpleQuery = `
					SELECT 
						fm.[ApplicationId],
						fm.[FormNo],
						fm.[MemberNo],
						fm.[FullName],
						fm.[BFormOrCNIC],
						fm.[RelationshipId],
						NULL as [RelationshipName],
						fm.[RelationshipOther],
						fm.[GenderId],
						NULL as [GenderName],
						fm.[MaritalStatusId],
						NULL as [MaritalStatusName],
						fm.[DOBMonth],
						fm.[DOBYear],
						fm.[OccupationId],
						NULL as [OccupationName],
						fm.[OccupationOther],
						fm.[PrimaryLocation],
						fm.[IsPrimaryEarner]
					FROM [SJDA_Users].[dbo].[PE_FamilyMember] fm
					WHERE fm.[FormNo] = @formNo
					ORDER BY fm.[MemberNo]
				`;
				const familyMembersResult = await familyMembersRequest.query(simpleQuery);
				familyMembers = familyMembersResult.recordset || [];
			} catch (innerErr: any) {
				console.error("Error fetching family members:", innerErr);
				// Return empty array if even the simple query fails
				familyMembers = [];
			}
		}

		// Get education and livelihood data for each family member
		const enrichedFamilyMembers = await Promise.all(
			familyMembers.map(async (member: any) => {
				// Get education data
				const memberNo = member.MemberNo || "";
				const educationRequest = pool.request();
				if (applicationId) {
					educationRequest.input("applicationId", applicationId);
				}
				educationRequest.input("memberNo", memberNo);
				educationRequest.input("formNo", formNo);
				const educationQuery = applicationId
					? `
						SELECT 
							[EducationID],
							[IsCurrentlyStudying],
							[InstitutionType],
							[InstitutionTypeOther],
							[CurrentClass],
							[CurrentClassOther],
							[HighestQualification],
							[HighestQualificationOther]
						FROM [SJDA_Users].[dbo].[PE_Education]
						WHERE [FamilyID] = @applicationId AND [MemberNo] = @memberNo
					`
					: `
						SELECT 
							[EducationID],
							[IsCurrentlyStudying],
							[InstitutionType],
							[InstitutionTypeOther],
							[CurrentClass],
							[CurrentClassOther],
							[HighestQualification],
							[HighestQualificationOther]
						FROM [SJDA_Users].[dbo].[PE_Education]
						WHERE [MemberNo] = @memberNo
					`;
				const educationResult = await educationRequest.query(educationQuery);
				const education = educationResult.recordset[0] || null;

				// Get livelihood data
				const livelihoodRequest = pool.request();
				if (applicationId) {
					livelihoodRequest.input("applicationId", applicationId);
				}
				livelihoodRequest.input("memberNo", memberNo);
				livelihoodRequest.input("formNo", formNo);
				const livelihoodQuery = applicationId
					? `
						SELECT 
							[LivelihoodID],
							[IsCurrentlyEarning],
							[EarningSource],
							[EarningSourceOther],
							[SalariedWorkSector],
							[SalariedWorkSectorOther],
							[WorkField],
							[WorkFieldOther],
							[MonthlyIncome],
							[JoblessDuration],
							[ReasonNotEarning],
							[ReasonNotEarningOther]
						FROM [SJDA_Users].[dbo].[PE_Livelihood]
						WHERE [FamilyID] = @applicationId AND [MemberNo] = @memberNo
					`
					: `
						SELECT 
							[LivelihoodID],
							[IsCurrentlyEarning],
							[EarningSource],
							[EarningSourceOther],
							[SalariedWorkSector],
							[SalariedWorkSectorOther],
							[WorkField],
							[WorkFieldOther],
							[MonthlyIncome],
							[JoblessDuration],
							[ReasonNotEarning],
							[ReasonNotEarningOther]
						FROM [SJDA_Users].[dbo].[PE_Livelihood]
						WHERE [MemberNo] = @memberNo
					`;
				const livelihoodResult = await livelihoodRequest.query(livelihoodQuery);
				const livelihood = livelihoodResult.recordset[0] || null;

				return {
					...member,
					education,
					livelihood,
				};
			})
		);

		return NextResponse.json({
			success: true,
			data: {
				application,
				familyHeads,
				familyMembers: enrichedFamilyMembers,
			},
		});
	} catch (error: any) {
		console.error("Error fetching application details:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch application details",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Check authentication
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session" },
				{ status: 401 }
			);
		}

		// ALL USERS CAN DELETE - NO PERMISSION CHECKS

		const { id: applicationId } = await params;

		if (!applicationId) {
			return NextResponse.json(
				{ success: false, message: "Application ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		
		// First, get the FormNo from the application to ensure we delete all related records
		const getFormNoRequest = pool.request();
		getFormNoRequest.input("applicationId", applicationId);
		const getFormNoQuery = `
			SELECT [FormNo] 
			FROM [SJDA_Users].[dbo].[PE_Application]
			WHERE [ApplicationId] = @applicationId
		`;
		const formNoResult = await getFormNoRequest.query(getFormNoQuery);
		const formNo = formNoResult.recordset[0]?.FormNo;

		const dbRequest = pool.request();
		(dbRequest as any).timeout = 120000;
		dbRequest.input("applicationId", applicationId);
		if (formNo) {
			dbRequest.input("formNo", formNo);
		}

		// Get all MemberNos for this FormNo/ApplicationId to ensure complete deletion
		const getMemberNosRequest = pool.request();
		getMemberNosRequest.input("applicationId", applicationId);
		if (formNo) {
			getMemberNosRequest.input("formNo", formNo);
		}
		const memberNosQuery = formNo 
			? `SELECT [MemberNo] FROM [SJDA_Users].[dbo].[PE_FamilyMember] WHERE [ApplicationId] = @applicationId OR [FormNo] = @formNo`
			: `SELECT [MemberNo] FROM [SJDA_Users].[dbo].[PE_FamilyMember] WHERE [ApplicationId] = @applicationId`;
		const memberNosResult = await getMemberNosRequest.query(memberNosQuery);
		const memberNos = memberNosResult.recordset.map((r: any) => r.MemberNo);

		// Delete PE_Livelihood records - delete by FamilyID (ApplicationId) and also by MemberNo to ensure all records are deleted
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Livelihood]
			WHERE [FamilyID] = @applicationId
		`);
		
		// Also delete by MemberNo to catch any records that might be linked by MemberNo
		if (memberNos.length > 0) {
			for (const memberNo of memberNos) {
				const deleteLivelihoodByMember = pool.request();
				deleteLivelihoodByMember.input("memberNo", memberNo);
				await deleteLivelihoodByMember.query(`
					DELETE FROM [SJDA_Users].[dbo].[PE_Livelihood]
					WHERE [MemberNo] = @memberNo
				`);
			}
		}

		// Delete PE_Education records - delete by FamilyID (ApplicationId) and also by MemberNo to ensure all records are deleted
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Education]
			WHERE [FamilyID] = @applicationId
		`);
		
		// Also delete by MemberNo to catch any records that might be linked by MemberNo
		if (memberNos.length > 0) {
			for (const memberNo of memberNos) {
				const deleteEducationByMember = pool.request();
				deleteEducationByMember.input("memberNo", memberNo);
				await deleteEducationByMember.query(`
					DELETE FROM [SJDA_Users].[dbo].[PE_Education]
					WHERE [MemberNo] = @memberNo
				`);
			}
		}

		// Delete PE_FamilyMember records - delete by both ApplicationId and FormNo to ensure all are deleted
		if (formNo) {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				WHERE [ApplicationId] = @applicationId OR [FormNo] = @formNo
			`);
		} else {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				WHERE [ApplicationId] = @applicationId
			`);
		}

		// Delete PE_ApplicationPerson records - delete by both ApplicationId and FormNo to ensure all are deleted
		if (formNo) {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
				WHERE [ApplicationId] = @applicationId OR [FormNo] = @formNo
			`);
		} else {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
				WHERE [ApplicationId] = @applicationId
			`);
		}

		// Delete PE_Application record (main record - delete last)
		const deleteAppResult = await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Application]
			WHERE [ApplicationId] = @applicationId
		`);

		if (deleteAppResult.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Family and all related records deleted successfully",
		});
	} catch (error: any) {
		console.error("Error deleting application:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete application",
			},
			{ status: 500 }
		);
	}
}

