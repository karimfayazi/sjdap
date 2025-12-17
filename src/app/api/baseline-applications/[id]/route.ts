import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";

export const maxDuration = 120;

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: applicationId } = await params;

		if (!applicationId) {
			return NextResponse.json(
				{ success: false, message: "Application ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();

		// Get application details
		const applicationRequest = pool.request();
		applicationRequest.input("applicationId", applicationId);
		const applicationQuery = `
			SELECT [ApplicationId], [FormNo], [TotalFamilyMembers], [Remarks], [CreatedAt], [CreatedBy]
			FROM [SJDA_Users].[dbo].[PE_Application]
			WHERE [ApplicationId] = @applicationId
		`;
		const applicationResult = await applicationRequest.query(applicationQuery);
		const application = applicationResult.recordset[0];

		if (!application) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		// Get FormNo from application for matching
		const formNo = application.FormNo;

		// Get family heads with lookup values - match using FormNo
		const familyHeadsRequest = pool.request();
		familyHeadsRequest.input("formNo", formNo);
		familyHeadsRequest.input("applicationId", applicationId);
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
		const familyHeads = familyHeadsResult.recordset || [];

		// Get family members with lookup values - match using FormNo
		const familyMembersRequest = pool.request();
		familyMembersRequest.input("formNo", formNo);
		familyMembersRequest.input("applicationId", applicationId);
		const familyMembersQuery = `
			SELECT 
				fm.[ApplicationId],
				fm.[FormNo],
				fm.[MemberNo],
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
			ORDER BY fm.[MemberNo]
		`;
		const familyMembersResult = await familyMembersRequest.query(familyMembersQuery);
		const familyMembers = familyMembersResult.recordset || [];

		// Get education and livelihood data for each family member
		const enrichedFamilyMembers = await Promise.all(
			familyMembers.map(async (member: any) => {
				// Get education data
				const memberNo = member.MemberNo || "";
				const educationRequest = pool.request();
				educationRequest.input("applicationId", applicationId);
				educationRequest.input("memberNo", memberNo);
				const educationQuery = `
					SELECT 
						[EducationID],
						[IsCurrentlyStudying],
						[InstitutionType],
						[InstitutionTypeOther],
						[CurrentClass],
						[CurrentClassOther],
						[LastFormalQualification],
						[LastFormalQualificationOther],
						[HighestQualification],
						[HighestQualificationOther]
					FROM [SJDA_Users].[dbo].[PE_Education]
					WHERE [FamilyID] = @applicationId AND [MemberNo] = @memberNo
				`;
				const educationResult = await educationRequest.query(educationQuery);
				const education = educationResult.recordset[0] || null;

				// Get livelihood data
				const livelihoodRequest = pool.request();
				livelihoodRequest.input("applicationId", applicationId);
				livelihoodRequest.input("memberNo", memberNo);
				const livelihoodQuery = `
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

		// TEMPORARY: Allow all authenticated users to delete applications
		// TODO: Restore super user check if needed
		/*
		// Check if user has Super User permission
		const userPool = await getDb();
		const userRequest = userPool.request();
		(userRequest as any).timeout = 120000;
		userRequest.input("user_id", userId);
		
		const userResult = await userRequest.query(
			"SELECT TOP(1) [Supper_User] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
		);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Check if user is Super User (checking for various formats: "Yes", "yes", 1, true, "1", "true")
		const isSuperUser =
			user.Supper_User === 1 ||
			user.Supper_User === "1" ||
			user.Supper_User === true ||
			user.Supper_User === "true" ||
			user.Supper_User === "Yes" ||
			user.Supper_User === "yes";

		if (!isSuperUser) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Super Users can delete applications." },
				{ status: 403 }
			);
		}
		*/

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

