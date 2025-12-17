import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const formNo = searchParams.get("formNo");

		if (!formNo) {
			return NextResponse.json(
				{ success: false, message: "Form No is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();

		// Get application data from PE_ApplicationPerson
		const applicationRequest = pool.request();
		applicationRequest.input("formNo", formNo);
		const applicationQuery = `
			SELECT TOP 1
				[FormNo],
				[TotalFamilyMembers],
				[Remarks]
			FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
			WHERE [FormNo] = @formNo
		`;
		const applicationResult = await applicationRequest.query(applicationQuery);
		const applicationData = applicationResult.recordset[0];

		if (!applicationData) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		// Create application object without ApplicationId
		const application = {
			ApplicationId: null,
			FormNo: applicationData.FormNo,
			TotalFamilyMembers: applicationData.TotalFamilyMembers,
			Remarks: applicationData.Remarks,
			CreatedAt: null,
			CreatedBy: null
		};

		// Get family heads with lookup values - match using FormNo
		const familyHeadsRequest = pool.request();
		familyHeadsRequest.input("formNo", formNo);
		const familyHeadsQuery = `
			SELECT 
				[FormNo],
				[PersonRole],
				[FullName],
				[CNICNo],
				[MotherTongue],
				[ResidentialAddress],
				[PrimaryContactNo],
				[RegionalCouncil],
				[LocalCouncil],
				[CurrentJK],
				[PrimaryLocationSettlement],
				[AreaOfOrigin],
				[HouseStatusName]
			FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
			WHERE [FormNo] = @formNo
		`;
		const familyHeadsResult = await familyHeadsRequest.query(familyHeadsQuery);
		// Add ApplicationId as null since PE_Application doesn't exist
		const familyHeads = (familyHeadsResult.recordset || []).map((head: any) => ({
			...head,
			ApplicationId: null
		}));

		// Get family members with lookup values - match using FormNo
		const familyMembersRequest = pool.request();
		familyMembersRequest.input("formNo", formNo);
		const familyMembersQuery = `
			SELECT 
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
		// Add ApplicationId as null since PE_Application doesn't exist
		const familyMembers = (familyMembersResult.recordset || []).map((member: any) => ({
			...member,
			ApplicationId: null
		}));

		// Get education and livelihood data for each family member
		// Since PE_Application doesn't exist, we'll use FormNo to match education and livelihood records
		const enrichedFamilyMembers = await Promise.all(
			familyMembers.map(async (member: any) => {
				// Get education data - try to match by MemberNo and FormNo
				const memberNo = member.MemberNo || "";
				const educationRequest = pool.request();
				educationRequest.input("formNo", formNo);
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
					WHERE [MemberNo] = @memberNo
				`;
				const educationResult = await educationRequest.query(educationQuery);
				const education = educationResult.recordset[0] || null;

				// Get livelihood data - try to match by MemberNo and FormNo
				const livelihoodRequest = pool.request();
				livelihoodRequest.input("formNo", formNo);
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
		console.error("Error fetching application details by FormNo:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch application details",
			},
			{ status: 500 }
		);
	}
}

