import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
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
		const tableName = await findTableName(pool);

		// Get application data from PE_Application_BasicInfo
		const applicationRequest = pool.request();
		applicationRequest.input("formNo", formNo);
		const applicationQuery = `
			SELECT TOP 1
				app.[FormNumber],
				app.[ApplicationDate],
				app.[ReceivedByName],
				app.[ReceivedByDate],
				app.[Full_Name],
				app.[DateOfBirth],
				app.[CNICNumber],
				app.[MotherTongue],
				app.[ResidentialAddress],
				app.[PrimaryContactNumber],
				app.[SecondaryContactNumber],
				app.[RegionalCommunity],
				app.[LocalCommunity],
				app.[CurrentCommunityCenter],
				app.[PrimaryLocationSettlement],
				app.[AreaOfOrigin],
				app.[CreatedAt],
				app.[UpdatedAt],
				app.[HouseOwnershipStatus],
				app.[HealthInsuranceProgram],
				app.[MonthlyIncome_Remittance],
				app.[MonthlyIncome_Rental],
				app.[MonthlyIncome_OtherSources],
				app.[Status],
				app.[CurrentLevel],
				app.[SubmittedAt],
				ISNULL(u.[UserFullName], app.[SubmittedBy]) as SubmittedBy,
				app.[Locked],
				app.[Land_Barren_Kanal],
				app.[Land_Barren_Value_Rs],
				app.[Land_Agriculture_Kanal],
				app.[Land_Agriculture_Value_Rs],
				app.[Livestock_Number],
				app.[Livestock_Value_Rs],
				app.[Fruit_Trees_Number],
				app.[Fruit_Trees_Value_Rs],
				app.[Vehicles_4W_Number],
				app.[Vehicles_4W_Value_Rs],
				app.[Motorcycle_2W_Number],
				app.[Motorcycle_2W_Value_Rs],
				app.[Intake_family_Income],
				app.[Area_Type]
			FROM [SJDA_Users].[dbo].[${tableName}] app
			LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON app.[SubmittedBy] = u.[UserFullName]
			WHERE app.[FormNumber] = @formNo
		`;
		const applicationResult = await applicationRequest.query(applicationQuery);
		const applicationData = applicationResult.recordset[0];

		if (!applicationData) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		// Create application object without ApplicationId (for backward compatibility)
		const application = {
			ApplicationId: null,
			FormNo: applicationData.FormNumber,
			TotalFamilyMembers: null, // Not in new table structure
			Remarks: null, // Not in new table structure
			CreatedAt: applicationData.CreatedAt,
			UpdatedAt: applicationData.UpdatedAt,
			CreatedBy: null
		};

		// Map the basic info record to a family head structure (for backward compatibility)
		// The new table structure has all info in one record, so we'll treat it as a single family head
		const familyHeads = [{
			FormNo: applicationData.FormNumber,
			ApplicationId: null,
			PersonRole: "Head",
			FullName: applicationData.Full_Name,
			CNICNo: applicationData.CNICNumber,
			MotherTongue: applicationData.MotherTongue,
			ResidentialAddress: applicationData.ResidentialAddress,
			PrimaryContactNo: applicationData.PrimaryContactNumber,
			SecondaryContactNumber: applicationData.SecondaryContactNumber,
			RegionalCouncil: applicationData.RegionalCommunity,
			LocalCouncil: applicationData.LocalCommunity,
			CurrentJK: applicationData.CurrentCommunityCenter,
			PrimaryLocationSettlement: applicationData.PrimaryLocationSettlement,
			AreaOfOrigin: applicationData.AreaOfOrigin,
			HouseStatusName: applicationData.HouseOwnershipStatus || null,
			// Additional fields from consolidated table
			ApplicationDate: applicationData.ApplicationDate,
			ReceivedByName: applicationData.ReceivedByName,
			ReceivedByDate: applicationData.ReceivedByDate,
			DateOfBirth: applicationData.DateOfBirth,
			HealthInsuranceProgram: applicationData.HealthInsuranceProgram,
			MonthlyIncome_Remittance: applicationData.MonthlyIncome_Remittance,
			MonthlyIncome_Rental: applicationData.MonthlyIncome_Rental,
			MonthlyIncome_OtherSources: applicationData.MonthlyIncome_OtherSources,
			Intake_family_Income: applicationData.Intake_family_Income,
			Area_Type: applicationData.Area_Type,
			Status: applicationData.Status,
			CurrentLevel: applicationData.CurrentLevel,
			SubmittedAt: applicationData.SubmittedAt,
			SubmittedBy: applicationData.SubmittedBy,
			Locked: applicationData.Locked,
			// Financial Assets
			Land_Barren_Kanal: applicationData.Land_Barren_Kanal,
			Land_Barren_Value_Rs: applicationData.Land_Barren_Value_Rs,
			Land_Agriculture_Kanal: applicationData.Land_Agriculture_Kanal,
			Land_Agriculture_Value_Rs: applicationData.Land_Agriculture_Value_Rs,
			Livestock_Number: applicationData.Livestock_Number,
			Livestock_Value_Rs: applicationData.Livestock_Value_Rs,
			Fruit_Trees_Number: applicationData.Fruit_Trees_Number,
			Fruit_Trees_Value_Rs: applicationData.Fruit_Trees_Value_Rs,
			Vehicles_4W_Number: applicationData.Vehicles_4W_Number,
			Vehicles_4W_Value_Rs: applicationData.Vehicles_4W_Value_Rs,
			Motorcycle_2W_Number: applicationData.Motorcycle_2W_Number,
			Motorcycle_2W_Value_Rs: applicationData.Motorcycle_2W_Value_Rs,
		}];

		// Get family members - all fields are in PE_FamilyMember table
		const familyMembersRequest = pool.request();
		familyMembersRequest.input("formNo", formNo);
		
		const familyMembersQuery = `
			SELECT 
				[FormNo],
				[BeneficiaryID],
				[FullName],
				[BFormOrCNIC],
				[Relationship] as RelationshipId,
				[Relationship] as RelationshipName,
				[Gender] as GenderId,
				[Gender] as GenderName,
				[MaritalStatus] as MaritalStatusId,
				[MaritalStatus] as MaritalStatusName,
				[DOBMonth],
				[DOBYear],
				[Occupation] as OccupationId,
				[Occupation] as OccupationName,
				[PrimaryLocation],
				[IsPrimaryEarner],
				[IsCurrentlyStudying],
				[InstitutionType],
				[CurrentClass],
				[HighestQualification],
				[IsCurrentlyEarning],
				[EarningSource],
				[SalariedWorkSector],
				[WorkField],
				[MonthlyIncome],
				[JoblessDuration],
				[ReasonNotEarning]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @formNo
			ORDER BY [BeneficiaryID]
		`;
		
		const familyMembersResult = await familyMembersRequest.query(familyMembersQuery);
		
		// Map the results to include education and livelihood as nested objects for backward compatibility
		const enrichedFamilyMembers = (familyMembersResult.recordset || []).map((member: any) => ({
			ApplicationId: null,
			FormNo: member.FormNo,
			BeneficiaryID: member.BeneficiaryID,
			FullName: member.FullName,
			BFormOrCNIC: member.BFormOrCNIC,
			RelationshipId: member.RelationshipId || member.Relationship,
			RelationshipName: member.RelationshipName || member.Relationship,
			GenderId: member.GenderId || member.Gender,
			GenderName: member.GenderName || member.Gender,
			MaritalStatusId: member.MaritalStatusId || member.MaritalStatus,
			MaritalStatusName: member.MaritalStatusName || member.MaritalStatus,
			DOBMonth: member.DOBMonth,
			DOBYear: member.DOBYear,
			OccupationId: member.OccupationId || member.Occupation,
			OccupationName: member.OccupationName || member.Occupation,
			PrimaryLocation: member.PrimaryLocation,
			IsPrimaryEarner: member.IsPrimaryEarner,
			education: {
				EducationID: null,
				IsCurrentlyStudying: member.IsCurrentlyStudying,
				InstitutionType: member.InstitutionType,
				CurrentClass: member.CurrentClass,
				HighestQualification: member.HighestQualification,
			},
			livelihood: {
				LivelihoodID: null,
				IsCurrentlyEarning: member.IsCurrentlyEarning,
				EarningSource: member.EarningSource,
				SalariedWorkSector: member.SalariedWorkSector,
				WorkField: member.WorkField,
				MonthlyIncome: member.MonthlyIncome,
				JoblessDuration: member.JoblessDuration,
				ReasonNotEarning: member.ReasonNotEarning,
			},
		}));

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

