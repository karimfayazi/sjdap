import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get("action");

		// Get list of tables
		if (action === "getTables") {
			const pool = await getPeDb();
			const result = await pool.request().query(`
				SELECT TABLE_SCHEMA, TABLE_NAME
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_TYPE = 'BASE TABLE'
				ORDER BY TABLE_SCHEMA, TABLE_NAME
			`);

			return NextResponse.json({
				success: true,
				tables: result.recordset || []
			});
		}

		// Get table structure
		if (action === "getTableStructure") {
			const tableName = searchParams.get("tableName");
			if (!tableName) {
				return NextResponse.json(
					{ success: false, message: "Table name is required" },
					{ status: 400 }
				);
			}

			const pool = await getPeDb();
			const request = pool.request();
			request.input("tableName", tableName);
			const result = await request.query(`
				SELECT 
					COLUMN_NAME,
					DATA_TYPE,
					CHARACTER_MAXIMUM_LENGTH,
					IS_NULLABLE,
					COLUMN_DEFAULT
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_NAME = @tableName
				ORDER BY ORDINAL_POSITION
			`);

			return NextResponse.json({
				success: true,
				columns: result.recordset || []
			});
		}

		// Get relationship options
		if (action === "getRelationships") {
			const pool = await getPeDb();
			const relationshipQuery = `
				SELECT [RelationshipId], [RelationshipName]
				FROM [SJDA_Users].[dbo].[PE_LU_Relationship]
				ORDER BY [RelationshipId]
			`;

			const result = await pool.request().query(relationshipQuery);
			const relationships = result.recordset || [];

			return NextResponse.json({
				success: true,
				relationships: relationships
			});
		}

		// Get gender options
		if (action === "getGenders") {
			const pool = await getPeDb();
			const genderQuery = `
				SELECT [GenderId], [GenderName]
				FROM [SJDA_Users].[dbo].[PE_LU_Gender]
				ORDER BY [GenderId]
			`;

			const result = await pool.request().query(genderQuery);
			const genders = result.recordset || [];

			return NextResponse.json({
				success: true,
				genders: genders
			});
		}

		// Get marital status options
		if (action === "getMaritalStatuses") {
			const pool = await getPeDb();
			const maritalStatusQuery = `
				SELECT [MaritalStatusId], [MaritalStatusName]
				FROM [SJDA_Users].[dbo].[PE_LU_MaritalStatus]
				ORDER BY [MaritalStatusId]
			`;

			const result = await pool.request().query(maritalStatusQuery);
			const maritalStatuses = result.recordset || [];

			return NextResponse.json({
				success: true,
				maritalStatuses: maritalStatuses
			});
		}

		// Get house status options
		if (action === "getHouseStatuses") {
			const pool = await getPeDb();
			const houseStatusQuery = `
				SELECT [HouseStatusId], [HouseStatusName]
				FROM [SJDA_Users].[dbo].[PE_LU_HouseStatus]
				ORDER BY [HouseStatusId]
			`;

			const result = await pool.request().query(houseStatusQuery);
			const houseStatuses = result.recordset || [];

			return NextResponse.json({
				success: true,
				houseStatuses: houseStatuses
			});
		}

		// Get occupation options
		if (action === "getOccupations") {
			const pool = await getPeDb();
			const occupationQuery = `
				SELECT [OccupationId], [OccupationName]
				FROM [SJDA_Users].[dbo].[PE_LU_PrimaryOccupation]
				ORDER BY [OccupationId]
			`;

			const result = await pool.request().query(occupationQuery);
			const occupations = result.recordset || [];

			return NextResponse.json({
				success: true,
				occupations: occupations
			});
		}

		// Get location hierarchy
		if (action === "getLocationHierarchy") {
			const pool = await getPeDb();
			const locationQuery = `
				SELECT [LocationId], [RC], [LC], [JK]
				FROM [SJDA_Users].[dbo].[PE_LU_LocationHierarchy]
				ORDER BY [RC], [LC], [JK]
			`;

			const result = await pool.request().query(locationQuery);
			const locations = result.recordset || [];

			return NextResponse.json({
				success: true,
				locations: locations
			});
		}

		// Get next Form No
		if (action === "getNextFormNo") {
			const pool = await getPeDb();
			const formNoQuery = `
				SELECT [FormNo]
				FROM [SJDA_Users].[dbo].[PE_Application]
				WHERE [FormNo] LIKE 'PE-%'
				ORDER BY [ApplicationId] DESC
			`;

			const result = await pool.request().query(formNoQuery);
			let nextFormNo = "PE-00001";
			let maxNum = 0;

			if (result.recordset && result.recordset.length > 0) {
				// Find the maximum number from all FormNo values
				for (const row of result.recordset) {
					const formNo = row.FormNo;
					if (formNo && formNo.startsWith('PE-')) {
						const num = parseInt(formNo.substring(3));
						if (!isNaN(num) && num > maxNum) {
							maxNum = num;
						}
					}
				}
				
				if (maxNum > 0) {
					nextFormNo = `PE-${(maxNum + 1).toString().padStart(5, '0')}`;
				}
			}

			return NextResponse.json({
				success: true,
				nextFormNo: nextFormNo
			});
		}

		// Get data from PE_ApplicationPerson
		const pool = await getPeDb();
		
		// Get filter parameters
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = (page - 1) * limit;
		const formNoFilter = (searchParams.get("formNo") || "").trim();
		const personRoleFilter = (searchParams.get("personRole") || "").trim();
		const dobMonthFilter = (searchParams.get("dobMonth") || "").trim();
		const dobYearFilter = (searchParams.get("dobYear") || "").trim();
		const cnicNoFilter = (searchParams.get("cnicNo") || "").trim();
		const motherTongueFilter = (searchParams.get("motherTongue") || "").trim();
		const residentialAddressFilter = (searchParams.get("residentialAddress") || "").trim();
		const primaryContactNoFilter = (searchParams.get("primaryContactNo") || "").trim();
		const currentJKFilter = (searchParams.get("currentJK") || "").trim();
		const localCouncilFilter = (searchParams.get("localCouncil") || "").trim();
		const primaryLocationSettlementFilter = (searchParams.get("primaryLocationSettlement") || "").trim();
		const areaOfOriginFilter = (searchParams.get("areaOfOrigin") || "").trim();
		const fullNameFilter = (searchParams.get("fullName") || "").trim();
		const regionalCouncilFilter = (searchParams.get("regionalCouncil") || "").trim();
		const houseStatusNameFilter = (searchParams.get("houseStatusName") || "").trim();
		const totalFamilyMembersFilter = (searchParams.get("totalFamilyMembers") || "").trim();
		const remarksFilter = (searchParams.get("remarks") || "").trim();

		// Build WHERE clause for filters
		const whereConditions: string[] = [];
		
		if (formNoFilter) {
			whereConditions.push(`[FormNo] LIKE '%${formNoFilter.replace(/'/g, "''")}%'`);
		}
		if (personRoleFilter) {
			whereConditions.push(`[PersonRole] LIKE '%${personRoleFilter.replace(/'/g, "''")}%'`);
		}
		if (dobMonthFilter) {
			whereConditions.push(`[DOBMonth] LIKE '%${dobMonthFilter.replace(/'/g, "''")}%'`);
		}
		if (dobYearFilter) {
			whereConditions.push(`[DOBYear] LIKE '%${dobYearFilter.replace(/'/g, "''")}%'`);
		}
		if (cnicNoFilter) {
			whereConditions.push(`[CNICNo] LIKE '%${cnicNoFilter.replace(/'/g, "''")}%'`);
		}
		if (motherTongueFilter) {
			whereConditions.push(`[MotherTongue] LIKE '%${motherTongueFilter.replace(/'/g, "''")}%'`);
		}
		if (residentialAddressFilter) {
			whereConditions.push(`[ResidentialAddress] LIKE '%${residentialAddressFilter.replace(/'/g, "''")}%'`);
		}
		if (primaryContactNoFilter) {
			whereConditions.push(`[PrimaryContactNo] LIKE '%${primaryContactNoFilter.replace(/'/g, "''")}%'`);
		}
		if (currentJKFilter) {
			whereConditions.push(`[CurrentJK] LIKE '%${currentJKFilter.replace(/'/g, "''")}%'`);
		}
		if (localCouncilFilter) {
			whereConditions.push(`[LocalCouncil] LIKE '%${localCouncilFilter.replace(/'/g, "''")}%'`);
		}
		if (primaryLocationSettlementFilter) {
			whereConditions.push(`[PrimaryLocationSettlement] LIKE '%${primaryLocationSettlementFilter.replace(/'/g, "''")}%'`);
		}
		if (areaOfOriginFilter) {
			whereConditions.push(`[AreaOfOrigin] LIKE '%${areaOfOriginFilter.replace(/'/g, "''")}%'`);
		}
		if (fullNameFilter) {
			whereConditions.push(`[FullName] LIKE '%${fullNameFilter.replace(/'/g, "''")}%'`);
		}
		if (regionalCouncilFilter) {
			whereConditions.push(`[RegionalCouncil] LIKE '%${regionalCouncilFilter.replace(/'/g, "''")}%'`);
		}
		if (houseStatusNameFilter) {
			whereConditions.push(`[HouseStatusName] LIKE '%${houseStatusNameFilter.replace(/'/g, "''")}%'`);
		}
		if (totalFamilyMembersFilter) {
			whereConditions.push(`[TotalFamilyMembers] LIKE '%${totalFamilyMembersFilter.replace(/'/g, "''")}%'`);
		}
		if (remarksFilter) {
			whereConditions.push(`[Remarks] LIKE '%${remarksFilter.replace(/'/g, "''")}%'`);
		}
		
		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Query to get data from PE_ApplicationPerson
		const query = `
			SELECT 
				[FormNo],
				[PersonRole],
				[CNICNo],
				[MotherTongue],
				[ResidentialAddress],
				[PrimaryContactNo],
				[CurrentJK],
				[LocalCouncil],
				[PrimaryLocationSettlement],
				[AreaOfOrigin],
				[FullName],
				[RegionalCouncil],
				[HouseStatusName],
				[TotalFamilyMembers],
				[Remarks]
			FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
			${whereClause}
			ORDER BY [FormNo] DESC
			OFFSET ${offset} ROWS
			FETCH NEXT ${limit} ROWS ONLY
		`;
		
		console.log("Executing query with filters:", whereClause);
		
		const result = await pool.request().query(query);
		const records = result.recordset || [];
		
		// Get total count with same filters
		const countQuery = `
			SELECT COUNT(*) as total 
			FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
			${whereClause}
		`;
		const countResult = await pool.request().query(countQuery);
		const total = countResult.recordset[0]?.total || 0;

		return NextResponse.json({
			success: true,
			data: records || [],
			total: total,
			page: page,
			limit: limit,
			tableName: "dbo.PE_Application"
		});
	} catch (error: any) {
		console.error("Error fetching baseline applications:", error);
		return NextResponse.json(
			{ 
				success: false, 
				message: error.message || "Failed to fetch baseline applications data" 
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { application, familyHeads, familyMembers } = body;

		if (!application) {
			return NextResponse.json(
				{ success: false, message: "Application data is required" },
				{ status: 400 }
			);
		}

		const formNoValue = (application.FormNo || "").trim();
		if (!formNoValue) {
			return NextResponse.json(
				{ success: false, message: "FormNo is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const transaction = new sql.Transaction(pool);

		try {
			await transaction.begin();

			// First, find the correct table name and schema
			const tablesCheck = await pool.request().query(`
				SELECT TABLE_SCHEMA, TABLE_NAME
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_TYPE = 'BASE TABLE'
				AND (TABLE_NAME LIKE '%Application%' OR TABLE_NAME LIKE '%PE%')
				ORDER BY TABLE_SCHEMA, TABLE_NAME
			`);
			
			let appTableName = "PE_Application";
			let appTableSchema = "dbo";
			
			if (tablesCheck.recordset && tablesCheck.recordset.length > 0) {
				const appTable = tablesCheck.recordset.find((t: any) => 
					t.TABLE_NAME.toLowerCase().includes("application") || 
					t.TABLE_NAME.toLowerCase() === "pe_application"
				);
				if (appTable) {
					appTableName = appTable.TABLE_NAME;
					appTableSchema = appTable.TABLE_SCHEMA || "dbo";
				}
			}

			// Insert main application
			const applicationRequest = new sql.Request(transaction);
			
			// Get current user from auth cookie if available
			const authCookie = request.cookies.get("auth");
			let createdBy = "System";
			if (authCookie && authCookie.value) {
				const userId = authCookie.value.split(":")[1];
				if (userId) createdBy = userId;
			}

			applicationRequest.input("FormNo", formNoValue);
			applicationRequest.input("TotalFamilyMembers", application.TotalFamilyMembers || null);
			applicationRequest.input("Remarks", application.Remarks || null);
			applicationRequest.input("CreatedBy", createdBy);

			const safeAppTableName = appTableName.replace(/\]/g, "]]");
			const safeAppSchema = appTableSchema.replace(/\]/g, "]]");

			const applicationResult = await applicationRequest.query(`
				INSERT INTO [${safeAppSchema}].[${safeAppTableName}] 
				([FormNo], [TotalFamilyMembers], [Remarks], [CreatedAt], [CreatedBy])
				OUTPUT INSERTED.[ApplicationId]
				VALUES (@FormNo, @TotalFamilyMembers, @Remarks, GETDATE(), @CreatedBy)
			`);

			const applicationId = applicationResult.recordset[0]?.ApplicationId;
			
			if (!applicationId) {
				throw new Error("Failed to create application");
			}

			// Insert family heads if provided into PE_ApplicationPerson table
			if (familyHeads && Array.isArray(familyHeads) && familyHeads.length > 0) {
				for (const head of familyHeads) {
					const headRequest = new sql.Request(transaction);
					
					headRequest.input("ApplicationId", applicationId);
					headRequest.input("PersonRole", head.PersonRole || null);
					headRequest.input("FullName", head.FullName || null);
					headRequest.input("CNICNo", head.CNICNo || null);
					headRequest.input("MotherTongue", head.MotherTongue || null);
					headRequest.input("ResidentialAddress", head.ResidentialAddress || null);
					headRequest.input("PrimaryContactNo", head.PrimaryContactNo || null);
					headRequest.input("RegionalCouncil", head.RegionalCouncil || null);
					headRequest.input("LocalCouncil", head.LocalCouncil || null);
					headRequest.input("CurrentJK", head.CurrentJK || null);
					headRequest.input("PrimaryLocationSettlement", head.PrimaryLocationSettlement || null);
					headRequest.input("AreaOfOrigin", head.AreaOfOrigin || null);
					headRequest.input("HouseStatusName", head.HouseStatusName || null);
					headRequest.input("FormNo", formNoValue);

					await headRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_ApplicationPerson]
						([ApplicationId], [FormNo], [PersonRole], [FullName], [CNICNo],
						 [MotherTongue], [ResidentialAddress], [PrimaryContactNo],
						 [RegionalCouncil], [LocalCouncil], [CurrentJK], [PrimaryLocationSettlement], [AreaOfOrigin], [HouseStatusName])
						VALUES 
						(@ApplicationId, @FormNo, @PersonRole, @FullName, @CNICNo,
						 @MotherTongue, @ResidentialAddress, @PrimaryContactNo,
						 @RegionalCouncil, @LocalCouncil, @CurrentJK, @PrimaryLocationSettlement, @AreaOfOrigin, @HouseStatusName)
					`);
				}
			}

			// Insert family members if provided into PE_FamilyMember table
			if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
				for (const member of familyMembers) {
					const memberRequest = new sql.Request(transaction);
					
					// MemberNo is already formatted as PE-{FormNo}-{MemberNumber} from frontend
					memberRequest.input("ApplicationId", applicationId);
					memberRequest.input("MemberNo", member.MemberNo || null);
					memberRequest.input("FullName", member.FullName || null);
					memberRequest.input("BFormOrCNIC", member.BFormOrCNIC || null);
					memberRequest.input("RelationshipId", member.RelationshipId || null);
					memberRequest.input("GenderId", member.GenderId || null);
					memberRequest.input("MaritalStatusId", member.MaritalStatusId || null);
					memberRequest.input("DOBMonth", member.DOBMonth || null);
					memberRequest.input("DOBYear", member.DOBYear || null);

					await memberRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_FamilyMember]
						([ApplicationId], [MemberNo], [FullName], [BFormOrCNIC], [RelationshipId],
						 [GenderId], [MaritalStatusId], [DOBMonth], [DOBYear])
						VALUES 
						(@ApplicationId, @MemberNo, @FullName, @BFormOrCNIC, @RelationshipId,
						 @GenderId, @MaritalStatusId, @DOBMonth, @DOBYear)
					`);

					// Insert education data if family member was created and education data exists
					if (member.MemberNo && member.education) {
						const educationRequest = new sql.Request(transaction);
						
						educationRequest.input("FamilyID", applicationId);
						educationRequest.input("MemberNo", member.MemberNo);
						educationRequest.input("IsCurrentlyStudying", member.education.IsCurrentlyStudying || null);
						educationRequest.input("InstitutionType", member.education.InstitutionType || null);
						educationRequest.input("InstitutionTypeOther", member.education.InstitutionTypeOther || null);
						educationRequest.input("CurrentClass", member.education.CurrentClass || null);
						educationRequest.input("CurrentClassOther", member.education.CurrentClassOther || null);
						educationRequest.input("LastFormalQualification", member.education.LastFormalQualification || null);
						educationRequest.input("LastFormalQualificationOther", member.education.LastFormalQualificationOther || null);
						educationRequest.input("HighestQualification", member.education.HighestQualification || null);
						educationRequest.input("HighestQualificationOther", member.education.HighestQualificationOther || null);
						educationRequest.input("CreatedBy", createdBy);

						await educationRequest.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_Education]
							([FamilyID], [MemberNo], [IsCurrentlyStudying], [InstitutionType], [InstitutionTypeOther],
							 [CurrentClass], [CurrentClassOther], [LastFormalQualification], [LastFormalQualificationOther],
							 [HighestQualification], [HighestQualificationOther], [CreatedBy])
							VALUES 
							(@FamilyID, @MemberNo, @IsCurrentlyStudying, @InstitutionType, @InstitutionTypeOther,
							 @CurrentClass, @CurrentClassOther, @LastFormalQualification, @LastFormalQualificationOther,
							 @HighestQualification, @HighestQualificationOther, @CreatedBy)
						`);
					}

					// Insert livelihood data if family member was created and livelihood data exists
					if (member.MemberNo && member.livelihood) {
						const livelihoodRequest = new sql.Request(transaction);
						
						livelihoodRequest.input("FamilyID", applicationId);
						livelihoodRequest.input("MemberNo", member.MemberNo);
						livelihoodRequest.input("IsCurrentlyEarning", member.livelihood.IsCurrentlyEarning || null);
						livelihoodRequest.input("EarningSource", member.livelihood.EarningSource || null);
						livelihoodRequest.input("EarningSourceOther", member.livelihood.EarningSourceOther || null);
						livelihoodRequest.input("SalariedWorkSector", member.livelihood.SalariedWorkSector || null);
						livelihoodRequest.input("SalariedWorkSectorOther", member.livelihood.SalariedWorkSectorOther || null);
						livelihoodRequest.input("WorkField", member.livelihood.WorkField || null);
						livelihoodRequest.input("WorkFieldOther", member.livelihood.WorkFieldOther || null);
						livelihoodRequest.input("MonthlyIncome", member.livelihood.MonthlyIncome ? parseFloat(member.livelihood.MonthlyIncome) : null);
						livelihoodRequest.input("JoblessDuration", member.livelihood.JoblessDuration || null);
						livelihoodRequest.input("ReasonNotEarning", member.livelihood.ReasonNotEarning || null);
						livelihoodRequest.input("ReasonNotEarningOther", member.livelihood.ReasonNotEarningOther || null);
						livelihoodRequest.input("CreatedBy", createdBy);

						await livelihoodRequest.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_Livelihood]
							([FamilyID], [MemberNo], [IsCurrentlyEarning], [EarningSource], [EarningSourceOther],
							 [SalariedWorkSector], [SalariedWorkSectorOther], [WorkField], [WorkFieldOther],
							 [MonthlyIncome], [JoblessDuration], [ReasonNotEarning], [ReasonNotEarningOther], [CreatedBy])
							VALUES 
							(@FamilyID, @MemberNo, @IsCurrentlyEarning, @EarningSource, @EarningSourceOther,
							 @SalariedWorkSector, @SalariedWorkSectorOther, @WorkField, @WorkFieldOther,
							 @MonthlyIncome, @JoblessDuration, @ReasonNotEarning, @ReasonNotEarningOther, @CreatedBy)
						`);
					}
				}
			}

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Application created successfully",
				applicationId: applicationId
			});
		} catch (error: any) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("Error creating application:", error);
		return NextResponse.json(
			{ 
				success: false, 
				message: error.message || "Failed to create application" 
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { application, familyHeads, familyMembers } = body;

		if (!application || !application.FormNo) {
			return NextResponse.json(
				{ success: false, message: "FormNo is required for update" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const transaction = new sql.Transaction(pool);

		try {
			await transaction.begin();

			const formNoValue = application.FormNo.trim();

			// Check if application exists in PE_ApplicationPerson
			const checkRequest = new sql.Request(transaction);
			checkRequest.input("FormNo", formNoValue);
			const checkResult = await checkRequest.query(`
				SELECT TOP 1 [FormNo]
				FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
				WHERE [FormNo] = @FormNo
			`);

			if (checkResult.recordset.length === 0) {
				await transaction.rollback();
				return NextResponse.json(
					{ success: false, message: "Application not found" },
					{ status: 404 }
				);
			}

			// Get all MemberNos for this FormNo to clean up related data
			const getMemberNosRequest = new sql.Request(transaction);
			getMemberNosRequest.input("FormNo", formNoValue);
			const memberNosQuery = `SELECT [MemberNo] FROM [SJDA_Users].[dbo].[PE_FamilyMember] WHERE [FormNo] = @FormNo`;
			const memberNosResult = await getMemberNosRequest.query(memberNosQuery);
			const memberNos = memberNosResult.recordset.map((r: any) => r.MemberNo);

			// Delete related records by MemberNo
			if (memberNos.length > 0) {
				for (const memberNo of memberNos) {
					const deleteLivelihoodRequest = new sql.Request(transaction);
					deleteLivelihoodRequest.input("MemberNo", memberNo);
					await deleteLivelihoodRequest.query(`
						DELETE FROM [SJDA_Users].[dbo].[PE_Livelihood]
						WHERE [MemberNo] = @MemberNo
					`);

					const deleteEducationRequest = new sql.Request(transaction);
					deleteEducationRequest.input("MemberNo", memberNo);
					await deleteEducationRequest.query(`
						DELETE FROM [SJDA_Users].[dbo].[PE_Education]
						WHERE [MemberNo] = @MemberNo
					`);
				}
			}

			// Delete family members by FormNo
			const cleanupRequest = new sql.Request(transaction);
			cleanupRequest.input("FormNo", formNoValue);
			await cleanupRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				WHERE [FormNo] = @FormNo
			`);

			// Delete existing family heads
			const deleteHeadsRequest = new sql.Request(transaction);
			deleteHeadsRequest.input("FormNo", formNoValue);
			await deleteHeadsRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
				WHERE [FormNo] = @FormNo
			`);

			// Insert updated family heads
			if (Array.isArray(familyHeads)) {
				for (const head of familyHeads) {
					const headRequest = new sql.Request(transaction);
					headRequest.input("FormNo", formNoValue);
					headRequest.input("PersonRole", head.PersonRole || null);
					headRequest.input("FullName", head.FullName || null);
					headRequest.input("CNICNo", head.CNICNo || null);
					headRequest.input("MotherTongue", head.MotherTongue || null);
					headRequest.input("ResidentialAddress", head.ResidentialAddress || null);
					headRequest.input("PrimaryContactNo", head.PrimaryContactNo || null);
					headRequest.input("RegionalCouncil", head.RegionalCouncil || null);
					headRequest.input("LocalCouncil", head.LocalCouncil || null);
					headRequest.input("CurrentJK", head.CurrentJK || null);
					headRequest.input("PrimaryLocationSettlement", head.PrimaryLocationSettlement || null);
					headRequest.input("AreaOfOrigin", head.AreaOfOrigin || null);
					headRequest.input("HouseStatusName", head.HouseStatusName || null);
					headRequest.input("TotalFamilyMembers", application.TotalFamilyMembers || null);
					headRequest.input("Remarks", application.Remarks || null);

					await headRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_ApplicationPerson]
						([FormNo], [PersonRole], [FullName], [CNICNo],
						 [MotherTongue], [ResidentialAddress], [PrimaryContactNo], [RegionalCouncil],
						 [LocalCouncil], [CurrentJK], [PrimaryLocationSettlement], [AreaOfOrigin], [HouseStatusName],
						 [TotalFamilyMembers], [Remarks])
						VALUES 
						(@FormNo, @PersonRole, @FullName, @CNICNo,
						 @MotherTongue, @ResidentialAddress, @PrimaryContactNo, @RegionalCouncil,
						 @LocalCouncil, @CurrentJK, @PrimaryLocationSettlement, @AreaOfOrigin, @HouseStatusName,
						 @TotalFamilyMembers, @Remarks)
					`);
				}
			}

			// Insert family members and related data (if any)
			if (Array.isArray(familyMembers) && familyMembers.length > 0) {
				for (const member of familyMembers) {
					const memberRequest = new sql.Request(transaction);
					memberRequest.input("FormNo", formNoValue);
					memberRequest.input("MemberNo", member.MemberNo || null);
					memberRequest.input("FullName", member.FullName || null);
					memberRequest.input("BFormOrCNIC", member.BFormOrCNIC || null);
					memberRequest.input("RelationshipId", member.RelationshipId || null);
					memberRequest.input("GenderId", member.GenderId || null);
					memberRequest.input("MaritalStatusId", member.MaritalStatusId || null);
					memberRequest.input("DOBMonth", member.DOBMonth || null);
					memberRequest.input("DOBYear", member.DOBYear || null);

					await memberRequest.query(`
						INSERT INTO [SJDA_Users].[dbo].[PE_FamilyMember]
						([FormNo], [MemberNo], [FullName], [BFormOrCNIC], [RelationshipId],
						 [GenderId], [MaritalStatusId], [DOBMonth], [DOBYear])
						VALUES 
						(@FormNo, @MemberNo, @FullName, @BFormOrCNIC, @RelationshipId,
						 @GenderId, @MaritalStatusId, @DOBMonth, @DOBYear)
					`);

					if (member.MemberNo && member.education) {
						const eduRequest = new sql.Request(transaction);
						eduRequest.input("MemberNo", member.MemberNo);
						eduRequest.input("IsCurrentlyStudying", member.education.IsCurrentlyStudying || null);
						eduRequest.input("InstitutionType", member.education.InstitutionType || null);
						eduRequest.input("InstitutionTypeOther", member.education.InstitutionTypeOther || null);
						eduRequest.input("CurrentClass", member.education.CurrentClass || null);
						eduRequest.input("CurrentClassOther", member.education.CurrentClassOther || null);
						eduRequest.input("LastFormalQualification", member.education.LastFormalQualification || null);
						eduRequest.input("LastFormalQualificationOther", member.education.LastFormalQualificationOther || null);
						eduRequest.input("HighestQualification", member.education.HighestQualification || null);
						eduRequest.input("HighestQualificationOther", member.education.HighestQualificationOther || null);

						await eduRequest.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_Education]
							([MemberNo], [IsCurrentlyStudying], [InstitutionType], [InstitutionTypeOther],
							 [CurrentClass], [CurrentClassOther], [LastFormalQualification], [LastFormalQualificationOther],
							 [HighestQualification], [HighestQualificationOther])
							VALUES
							(@MemberNo, @IsCurrentlyStudying, @InstitutionType, @InstitutionTypeOther,
							 @CurrentClass, @CurrentClassOther, @LastFormalQualification, @LastFormalQualificationOther,
							 @HighestQualification, @HighestQualificationOther)
						`);
					}

					if (member.MemberNo && member.livelihood) {
						const livelihoodRequest = new sql.Request(transaction);
						livelihoodRequest.input("MemberNo", member.MemberNo);
						livelihoodRequest.input("IsCurrentlyEarning", member.livelihood.IsCurrentlyEarning || null);
						livelihoodRequest.input("EarningSource", member.livelihood.EarningSource || null);
						livelihoodRequest.input("EarningSourceOther", member.livelihood.EarningSourceOther || null);
						livelihoodRequest.input("SalariedWorkSector", member.livelihood.SalariedWorkSector || null);
						livelihoodRequest.input("SalariedWorkSectorOther", member.livelihood.SalariedWorkSectorOther || null);
						livelihoodRequest.input("WorkField", member.livelihood.WorkField || null);
						livelihoodRequest.input("WorkFieldOther", member.livelihood.WorkFieldOther || null);
						livelihoodRequest.input("MonthlyIncome", member.livelihood.MonthlyIncome || null);
						livelihoodRequest.input("JoblessDuration", member.livelihood.JoblessDuration || null);
						livelihoodRequest.input("ReasonNotEarning", member.livelihood.ReasonNotEarning || null);
						livelihoodRequest.input("ReasonNotEarningOther", member.livelihood.ReasonNotEarningOther || null);

						await livelihoodRequest.query(`
							INSERT INTO [SJDA_Users].[dbo].[PE_Livelihood]
							([MemberNo], [IsCurrentlyEarning], [EarningSource], [EarningSourceOther],
							 [SalariedWorkSector], [SalariedWorkSectorOther], [WorkField], [WorkFieldOther],
							 [MonthlyIncome], [JoblessDuration], [ReasonNotEarning], [ReasonNotEarningOther])
							VALUES
							(@MemberNo, @IsCurrentlyEarning, @EarningSource, @EarningSourceOther,
							 @SalariedWorkSector, @SalariedWorkSectorOther, @WorkField, @WorkFieldOther,
							 @MonthlyIncome, @JoblessDuration, @ReasonNotEarning, @ReasonNotEarningOther)
						`);
					}
				}
			}

			await transaction.commit();
			return NextResponse.json({
				success: true,
				message: "Application updated successfully",
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error: any) {
		console.error("Error updating application:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update application",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Check authentication
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNo = searchParams.get("formNo");

		if (!formNo) {
			return NextResponse.json(
				{ success: false, message: "FormNo is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		
		// Get all MemberNos for this FormNo to ensure complete deletion
		const getMemberNosRequest = pool.request();
		getMemberNosRequest.input("formNo", formNo);
		const memberNosQuery = `SELECT [MemberNo] FROM [SJDA_Users].[dbo].[PE_FamilyMember] WHERE [FormNo] = @formNo`;
		const memberNosResult = await getMemberNosRequest.query(memberNosQuery);
		const memberNos = memberNosResult.recordset.map((r: any) => r.MemberNo);

		const dbRequest = pool.request();
		(dbRequest as any).timeout = 120000;
		dbRequest.input("formNo", formNo);

		// Delete PE_Livelihood records by MemberNo
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

		// Delete PE_Education records by MemberNo
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

		// Delete PE_FamilyMember records by FormNo
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @formNo
		`);

		// Delete PE_ApplicationPerson records by FormNo
		const deletePersonResult = await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_ApplicationPerson]
			WHERE [FormNo] = @formNo
		`);

		// Delete PE_Application record by FormNo (if exists)
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Application]
			WHERE [FormNo] = @formNo
		`);

		if (deletePersonResult.rowsAffected[0] === 0) {
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

