import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// Helper function to update/insert PE_Family_Status table
async function updateFamilyStatus(
	familyId: string,
	request: NextRequest
) {
	try {
		console.log(`[PE_Family_Status] Starting update for Form_Number: ${familyId}`);
		
		// Get logged-in user information
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			console.warn("[PE_Family_Status] No auth cookie found, skipping update");
			return;
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			console.warn("[PE_Family_Status] Invalid user ID in auth cookie, skipping update");
			return;
		}

		console.log(`[PE_Family_Status] User ID: ${userId}`);

		// Get user's full name for MENTOR, FAMILY_MENTOR and USER_NAME
		const userPool = await getDb();
		const userResult = await userPool
			.request()
			.input("user_id", userId)
			.query(
				"SELECT TOP(1) [USER_FULL_NAME], [USER_NAME] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
			);

		const user = userResult.recordset?.[0];
		const mentorName = user?.USER_FULL_NAME || user?.USER_NAME || userId;
		const familyMentor = user?.USER_FULL_NAME || user?.USER_NAME || userId;
		const userName = user?.USER_NAME || userId;

		console.log(`[PE_Family_Status] User details - Mentor: ${mentorName}, Family_Mentor: ${familyMentor}, User_Name: ${userName}`);

		// Use PE database connection (same as basic info)
		const pool = await getPeDb();
		
		// First, verify table exists
		try {
			const tableCheckRequest = pool.request();
			const tableCheckQuery = `
				SELECT TABLE_NAME 
				FROM INFORMATION_SCHEMA.TABLES 
				WHERE TABLE_SCHEMA = 'dbo' 
				AND TABLE_NAME = 'PE_Family_Status'
			`;
			const tableCheckResult = await tableCheckRequest.query(tableCheckQuery);
			
			if (tableCheckResult.recordset.length === 0) {
				console.error("[PE_Family_Status] Table PE_Family_Status does not exist in database");
				return;
			}
			console.log("[PE_Family_Status] Table exists, proceeding with insert/update");
		} catch (tableCheckError: any) {
			console.error("[PE_Family_Status] Error checking table existence:", tableCheckError);
			return;
		}
		
		// Check if record exists
		const checkRequest = pool.request();
		checkRequest.input("Form_Number", familyId);
		const checkQuery = `
			SELECT [Form_Number]
			FROM [SJDA_Users].[dbo].[PE_Family_Status]
			WHERE [Form_Number] = @Form_Number
		`;
		const checkResult = await checkRequest.query(checkQuery);

		console.log(`[PE_Family_Status] Record exists check: ${checkResult.recordset.length > 0 ? 'Yes' : 'No'}`);

		if (checkResult.recordset.length > 0) {
			// UPDATE existing record (but don't update Mentor, Family_Mentor and Application_Date)
			const updateRequest = pool.request();
			updateRequest.input("Form_Number", familyId);
			updateRequest.input("Family_Status_Level", "Application");
			updateRequest.input("User_Name", userName);

			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_Family_Status]
				SET
					[Family_Status_Level] = @Family_Status_Level,
					[User_Name] = @User_Name,
					[System_Date] = GETDATE()
				WHERE [Form_Number] = @Form_Number
			`;

			const updateResult = await updateRequest.query(updateQuery);
			console.log(`[PE_Family_Status] Updated record for Form_Number: ${familyId}, Rows affected: ${updateResult.rowsAffected?.[0] || 0}`);
		} else {
			// INSERT new record (with Mentor, Family_Mentor and Application_Date)
			const insertRequest = pool.request();
			insertRequest.input("Form_Number", familyId);
			insertRequest.input("Family_Status_Level", "Application");
			insertRequest.input("Mentor", mentorName);
			insertRequest.input("Family_Mentor", familyMentor);
			insertRequest.input("Application_Date", new Date());
			insertRequest.input("User_Name", userName);

			const insertQuery = `
				INSERT INTO [SJDA_Users].[dbo].[PE_Family_Status]
				([Form_Number], [Family_Status_Level], [Mentor], [Family_Mentor], [Application_Date], [User_Name], [System_Date])
				VALUES
				(@Form_Number, @Family_Status_Level, @Mentor, @Family_Mentor, @Application_Date, @User_Name, GETDATE())
			`;

			const insertResult = await insertRequest.query(insertQuery);
			console.log(`[PE_Family_Status] Inserted new record for Form_Number: ${familyId}, Rows affected: ${insertResult.rowsAffected?.[0] || 0}`);
		}
		
		console.log(`[PE_Family_Status] Successfully completed for Form_Number: ${familyId}`);
	} catch (error: any) {
		// Log error with full details but don't fail the main operation
		console.error("[PE_Family_Status] Error updating PE_Family_Status:", {
			error: error.message,
			stack: error.stack,
			formNumber: familyId
		});
		// Re-throw to see the error in the response if needed
		// But we'll catch it in the calling function
	}
}

// Helper function to convert income value to number or 0
// Always returns a number (0 if empty/null) to ensure values are saved
function parseIncomeValue(value: any): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') {
		return isNaN(value) ? 0 : value;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') return 0;
		// Try to parse as number
		const parsed = parseFloat(trimmed);
		if (!isNaN(parsed)) {
			return parsed;
		}
		// If not a valid number, return 0
		return 0;
	}
	return 0;
}

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
				OR TABLE_NAME LIKE '%PE_Application%'
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
	
	// Default fallback
	return "PE_Application_BasicInfo";
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const tableName = await findTableName(pool);

		const request_query = pool.request();
		request_query.input("FormNumber", formNumber);

		const query = `
			SELECT TOP 1
				[FormNumber],
				[ApplicationDate],
				[ReceivedByName],
				[ReceivedByDate],
				[Full_Name],
				[DateOfBirth],
				[CNICNumber],
				[MotherTongue],
				[ResidentialAddress],
				[PrimaryContactNumber],
				[SecondaryContactNumber],
				[RegionalCommunity],
				[LocalCommunity],
				[CurrentCommunityCenter],
				[PrimaryLocationSettlement],
				[AreaOfOrigin],
				[Area_Type],
				[Intake_family_Income],
				[HouseOwnershipStatus],
				[HealthInsuranceProgram],
				[MonthlyIncome_Remittance],
				[MonthlyIncome_Rental],
				[MonthlyIncome_OtherSources],
				[Land_Barren_Kanal],
				[Land_Barren_Value_Rs],
				[Land_Agriculture_Kanal],
				[Land_Agriculture_Value_Rs],
				[Livestock_Number],
				[Livestock_Value_Rs],
				[Fruit_Trees_Number],
				[Fruit_Trees_Value_Rs],
				[Vehicles_4W_Number],
				[Vehicles_4W_Value_Rs],
				[Motorcycle_2W_Number],
				[Motorcycle_2W_Value_Rs],
				[Status],
				[CurrentLevel],
				[SubmittedAt],
				[SubmittedBy],
				[Locked],
				[CreatedAt],
				[UpdatedAt]
			FROM [SJDA_Users].[dbo].[${tableName}]
			WHERE [FormNumber] = @FormNumber
		`;

		const result = await request_query.query(query);

		if (result.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			data: result.recordset[0],
		});
	} catch (error: any) {
		console.error("Error fetching basic info:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch application basic info",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.FormNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const tableName = await findTableName(pool);

		const request_query = pool.request();

		// Check if FormNumber already exists
		request_query.input("FormNumber", body.FormNumber);
		const checkQuery = `
			SELECT [FormNumber]
			FROM [SJDA_Users].[dbo].[${tableName}]
			WHERE [FormNumber] = @FormNumber
		`;
		const checkResult = await request_query.query(checkQuery);

		if (checkResult.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "Form Number already exists" },
				{ status: 400 }
			);
		}

		// Check if CNIC already exists (if provided)
		if (body.CNICNumber && body.CNICNumber.trim() !== "") {
			const cnicCheckRequest = pool.request();
			cnicCheckRequest.input("CNICNumber", body.CNICNumber.trim());
			const cnicCheckQuery = `
				SELECT [FormNumber], [CNICNumber]
				FROM [SJDA_Users].[dbo].[${tableName}]
				WHERE LTRIM(RTRIM([CNICNumber])) = LTRIM(RTRIM(@CNICNumber))
			`;
			const cnicCheckResult = await cnicCheckRequest.query(cnicCheckQuery);

			if (cnicCheckResult.recordset.length > 0) {
				return NextResponse.json(
					{ success: false, message: "This CNIC is already used. Please use a different CNIC number." },
					{ status: 400 }
				);
			}
		}

		// Get current user information for SubmittedBy
		const authCookie = request.cookies.get("auth");
		let submittedBy = null;
		
		if (authCookie && authCookie.value) {
			const userId = authCookie.value.split(":")[1];
			if (userId) {
				try {
					const userPool = await getDb();
					const userResult = await userPool
						.request()
						.input("user_id", userId)
						.query(
							"SELECT TOP(1) [USER_FULL_NAME], [USER_ID] FROM [SJDA_Users].[dbo].[Table_User] WHERE [USER_ID] = @user_id"
						);
					
					const user = userResult.recordset?.[0];
					if (user) {
						submittedBy = user.USER_FULL_NAME || user.USER_ID;
					}
				} catch (userError) {
					console.error("Error fetching user info for SubmittedBy:", userError);
					// Continue without SubmittedBy if there's an error
				}
			}
		}

		// Insert new record
		const insertRequest = pool.request();
		insertRequest.input("FormNumber", body.FormNumber);
		insertRequest.input("ApplicationDate", body.ApplicationDate || null);
		insertRequest.input("ReceivedByName", body.ReceivedByName || null);
		insertRequest.input("ReceivedByDate", body.ReceivedByDate || null);
		insertRequest.input("Full_Name", body.Full_Name || null);
		insertRequest.input("DateOfBirth", body.DateOfBirth || null);
		insertRequest.input("CNICNumber", body.CNICNumber || null);
		insertRequest.input("MotherTongue", body.MotherTongue || null);
		insertRequest.input("ResidentialAddress", body.ResidentialAddress || null);
		insertRequest.input("PrimaryContactNumber", body.PrimaryContactNumber || null);
		insertRequest.input("SecondaryContactNumber", body.SecondaryContactNumber || null);
		insertRequest.input("RegionalCommunity", body.RegionalCommunity || null);
		insertRequest.input("LocalCommunity", body.LocalCommunity || null);
		insertRequest.input("CurrentCommunityCenter", body.CurrentCommunityCenter || null);
		insertRequest.input("PrimaryLocationSettlement", body.PrimaryLocationSettlement || null);
		insertRequest.input("AreaOfOrigin", body.AreaOfOrigin || null);
		insertRequest.input("Area_Type", body.Area_Type || null);
		insertRequest.input("Intake_family_Income", body.Intake_family_Income ? parseFloat(body.Intake_family_Income.toString()) : null);
		insertRequest.input("HouseOwnershipStatus", body.HouseOwnershipStatus || null);
		insertRequest.input("HealthInsuranceProgram", body.HealthInsuranceProgram || null);
		
		// Add SubmittedAt and SubmittedBy only for new records (first time save)
		if (submittedBy) {
			insertRequest.input("SubmittedBy", submittedBy);
		}
		// Parse income values - ensure they're numbers, default to 0
		let remittanceValue = parseIncomeValue(body.MonthlyIncome_Remittance);
		let rentalValue = parseIncomeValue(body.MonthlyIncome_Rental);
		let otherSourcesValue = parseIncomeValue(body.MonthlyIncome_OtherSources);
		
		// Ensure values are never null or undefined
		if (remittanceValue === null || remittanceValue === undefined) remittanceValue = 0;
		if (rentalValue === null || rentalValue === undefined) rentalValue = 0;
		if (otherSourcesValue === null || otherSourcesValue === undefined) otherSourcesValue = 0;
		
		console.log("Inserting MonthlyIncome values:", {
			MonthlyIncome_Remittance: remittanceValue,
			MonthlyIncome_Rental: rentalValue,
			MonthlyIncome_OtherSources: otherSourcesValue,
			types: {
				Remittance: typeof remittanceValue,
				Rental: typeof rentalValue,
				OtherSources: typeof otherSourcesValue,
			},
			raw: {
				Remittance: body.MonthlyIncome_Remittance,
				Rental: body.MonthlyIncome_Rental,
				OtherSources: body.MonthlyIncome_OtherSources,
			}
		});
		
		// Don't specify type - let SQL Server handle conversion based on column type
		// This works for DECIMAL, NUMERIC, FLOAT, VARCHAR, NVARCHAR, etc.
		insertRequest.input("MonthlyIncome_Remittance", remittanceValue);
		insertRequest.input("MonthlyIncome_Rental", rentalValue);
		insertRequest.input("MonthlyIncome_OtherSources", otherSourcesValue);
		
		// Financial Assets fields
		insertRequest.input("Land_Barren_Kanal", body.Land_Barren_Kanal || null);
		insertRequest.input("Land_Barren_Value_Rs", parseIncomeValue(body.Land_Barren_Value_Rs));
		insertRequest.input("Land_Agriculture_Kanal", body.Land_Agriculture_Kanal || null);
		insertRequest.input("Land_Agriculture_Value_Rs", parseIncomeValue(body.Land_Agriculture_Value_Rs));
		insertRequest.input("Livestock_Number", body.Livestock_Number || null);
		insertRequest.input("Livestock_Value_Rs", parseIncomeValue(body.Livestock_Value_Rs));
		insertRequest.input("Fruit_Trees_Number", body.Fruit_Trees_Number || null);
		insertRequest.input("Fruit_Trees_Value_Rs", parseIncomeValue(body.Fruit_Trees_Value_Rs));
		insertRequest.input("Vehicles_4W_Number", body.Vehicles_4W_Number || null);
		insertRequest.input("Vehicles_4W_Value_Rs", parseIncomeValue(body.Vehicles_4W_Value_Rs));
		insertRequest.input("Motorcycle_2W_Number", body.Motorcycle_2W_Number || null);
		insertRequest.input("Motorcycle_2W_Value_Rs", parseIncomeValue(body.Motorcycle_2W_Value_Rs));

		// Build INSERT query with SubmittedAt and SubmittedBy (only for new records)
		const submittedFields = submittedBy ? `[SubmittedAt], [SubmittedBy],` : '';
		const submittedValues = submittedBy ? `GETDATE(), @SubmittedBy,` : '';
		
		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[${tableName}]
			(
				[FormNumber],
				[ApplicationDate],
				[ReceivedByName],
				[ReceivedByDate],
				[Full_Name],
				[DateOfBirth],
				[CNICNumber],
				[MotherTongue],
				[ResidentialAddress],
				[PrimaryContactNumber],
				[SecondaryContactNumber],
				[RegionalCommunity],
				[LocalCommunity],
				[CurrentCommunityCenter],
				[PrimaryLocationSettlement],
				[AreaOfOrigin],
				[Area_Type],
				[Intake_family_Income],
				[HouseOwnershipStatus],
				[HealthInsuranceProgram],
				[MonthlyIncome_Remittance],
				[MonthlyIncome_Rental],
				[MonthlyIncome_OtherSources],
				[Land_Barren_Kanal],
				[Land_Barren_Value_Rs],
				[Land_Agriculture_Kanal],
				[Land_Agriculture_Value_Rs],
				[Livestock_Number],
				[Livestock_Value_Rs],
				[Fruit_Trees_Number],
				[Fruit_Trees_Value_Rs],
				[Vehicles_4W_Number],
				[Vehicles_4W_Value_Rs],
				[Motorcycle_2W_Number],
				[Motorcycle_2W_Value_Rs],
				${submittedFields}
				[CreatedAt],
				[UpdatedAt]
			)
			VALUES
			(
				@FormNumber,
				@ApplicationDate,
				@ReceivedByName,
				@ReceivedByDate,
				@Full_Name,
				@DateOfBirth,
				@CNICNumber,
				@MotherTongue,
				@ResidentialAddress,
				@PrimaryContactNumber,
				@SecondaryContactNumber,
				@RegionalCommunity,
				@LocalCommunity,
				@CurrentCommunityCenter,
				@PrimaryLocationSettlement,
				@AreaOfOrigin,
				@Area_Type,
				@Intake_family_Income,
				@HouseOwnershipStatus,
				@HealthInsuranceProgram,
				@MonthlyIncome_Remittance,
				@MonthlyIncome_Rental,
				@MonthlyIncome_OtherSources,
				@Land_Barren_Kanal,
				@Land_Barren_Value_Rs,
				@Land_Agriculture_Kanal,
				@Land_Agriculture_Value_Rs,
				@Livestock_Number,
				@Livestock_Value_Rs,
				@Fruit_Trees_Number,
				@Fruit_Trees_Value_Rs,
				@Vehicles_4W_Number,
				@Vehicles_4W_Value_Rs,
				@Motorcycle_2W_Number,
				@Motorcycle_2W_Value_Rs,
				${submittedValues}
				GETDATE(),
				GETDATE()
			)
		`;

		await insertRequest.query(insertQuery);

		// Update/Insert PE_Family_Status table
		try {
			await updateFamilyStatus(body.FormNumber, request);
		} catch (familyStatusError: any) {
			// Log error but don't fail the main operation
			console.error("Error in updateFamilyStatus (non-blocking):", familyStatusError);
		}

		return NextResponse.json({
			success: true,
			message: "Application basic info created successfully",
		});
	} catch (error: any) {
		console.error("Error creating basic info:", error);
		const errorMessage = error.message || "Failed to create application basic info";
		
		// Check if it's a table not found error
		if (errorMessage.includes("Invalid object name") || errorMessage.includes("PE_Application")) {
			return NextResponse.json(
				{
					success: false,
					message: `Database table not found. Please verify that the table 'PE_Application_BasicInfo' exists in the SJDA_Users database. Error: ${errorMessage}`,
				},
				{ status: 500 }
			);
		}
		
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.FormNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const tableName = await findTableName(pool);

		const request_query = pool.request();

		// Check if FormNumber exists
		request_query.input("FormNumber", body.FormNumber);
		const checkQuery = `
			SELECT [FormNumber]
			FROM [SJDA_Users].[dbo].[${tableName}]
			WHERE [FormNumber] = @FormNumber
		`;
		const checkResult = await request_query.query(checkQuery);

		if (checkResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Application not found" },
				{ status: 404 }
			);
		}

		// Update record
		const updateRequest = pool.request();
		updateRequest.input("FormNumber", body.FormNumber);
		updateRequest.input("ApplicationDate", body.ApplicationDate || null);
		updateRequest.input("ReceivedByName", body.ReceivedByName || null);
		updateRequest.input("ReceivedByDate", body.ReceivedByDate || null);
		updateRequest.input("Full_Name", body.Full_Name || null);
		updateRequest.input("DateOfBirth", body.DateOfBirth || null);
		updateRequest.input("CNICNumber", body.CNICNumber || null);
		updateRequest.input("MotherTongue", body.MotherTongue || null);
		updateRequest.input("ResidentialAddress", body.ResidentialAddress || null);
		updateRequest.input("PrimaryContactNumber", body.PrimaryContactNumber || null);
		updateRequest.input("SecondaryContactNumber", body.SecondaryContactNumber || null);
		updateRequest.input("RegionalCommunity", body.RegionalCommunity || null);
		updateRequest.input("LocalCommunity", body.LocalCommunity || null);
		updateRequest.input("CurrentCommunityCenter", body.CurrentCommunityCenter || null);
		updateRequest.input("PrimaryLocationSettlement", body.PrimaryLocationSettlement || null);
		updateRequest.input("AreaOfOrigin", body.AreaOfOrigin || null);
		updateRequest.input("Area_Type", body.Area_Type || null);
		updateRequest.input("Intake_family_Income", body.Intake_family_Income ? parseFloat(body.Intake_family_Income.toString()) : null);
		updateRequest.input("HouseOwnershipStatus", body.HouseOwnershipStatus || null);
		updateRequest.input("HealthInsuranceProgram", body.HealthInsuranceProgram || null);
		// Parse income values - ensure they're numbers, default to 0
		let remittanceValue = parseIncomeValue(body.MonthlyIncome_Remittance);
		let rentalValue = parseIncomeValue(body.MonthlyIncome_Rental);
		let otherSourcesValue = parseIncomeValue(body.MonthlyIncome_OtherSources);
		
		// Ensure values are never null or undefined
		if (remittanceValue === null || remittanceValue === undefined) remittanceValue = 0;
		if (rentalValue === null || rentalValue === undefined) rentalValue = 0;
		if (otherSourcesValue === null || otherSourcesValue === undefined) otherSourcesValue = 0;
		
		console.log("Updating MonthlyIncome values:", {
			MonthlyIncome_Remittance: remittanceValue,
			MonthlyIncome_Rental: rentalValue,
			MonthlyIncome_OtherSources: otherSourcesValue,
			types: {
				Remittance: typeof remittanceValue,
				Rental: typeof rentalValue,
				OtherSources: typeof otherSourcesValue,
			},
			raw: {
				Remittance: body.MonthlyIncome_Remittance,
				Rental: body.MonthlyIncome_Rental,
				OtherSources: body.MonthlyIncome_OtherSources,
			}
		});
		
		// Don't specify type - let SQL Server handle conversion based on column type
		// This works for DECIMAL, NUMERIC, FLOAT, VARCHAR, NVARCHAR, etc.
		updateRequest.input("MonthlyIncome_Remittance", remittanceValue);
		updateRequest.input("MonthlyIncome_Rental", rentalValue);
		updateRequest.input("MonthlyIncome_OtherSources", otherSourcesValue);
		
		// Financial Assets fields
		updateRequest.input("Land_Barren_Kanal", body.Land_Barren_Kanal || null);
		updateRequest.input("Land_Barren_Value_Rs", parseIncomeValue(body.Land_Barren_Value_Rs));
		updateRequest.input("Land_Agriculture_Kanal", body.Land_Agriculture_Kanal || null);
		updateRequest.input("Land_Agriculture_Value_Rs", parseIncomeValue(body.Land_Agriculture_Value_Rs));
		updateRequest.input("Livestock_Number", body.Livestock_Number || null);
		updateRequest.input("Livestock_Value_Rs", parseIncomeValue(body.Livestock_Value_Rs));
		updateRequest.input("Fruit_Trees_Number", body.Fruit_Trees_Number || null);
		updateRequest.input("Fruit_Trees_Value_Rs", parseIncomeValue(body.Fruit_Trees_Value_Rs));
		updateRequest.input("Vehicles_4W_Number", body.Vehicles_4W_Number || null);
		updateRequest.input("Vehicles_4W_Value_Rs", parseIncomeValue(body.Vehicles_4W_Value_Rs));
		updateRequest.input("Motorcycle_2W_Number", body.Motorcycle_2W_Number || null);
		updateRequest.input("Motorcycle_2W_Value_Rs", parseIncomeValue(body.Motorcycle_2W_Value_Rs));

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[${tableName}]
			SET
				[ApplicationDate] = @ApplicationDate,
				[ReceivedByName] = @ReceivedByName,
				[ReceivedByDate] = @ReceivedByDate,
				[Full_Name] = @Full_Name,
				[DateOfBirth] = @DateOfBirth,
				[CNICNumber] = @CNICNumber,
				[MotherTongue] = @MotherTongue,
				[ResidentialAddress] = @ResidentialAddress,
				[PrimaryContactNumber] = @PrimaryContactNumber,
				[SecondaryContactNumber] = @SecondaryContactNumber,
				[RegionalCommunity] = @RegionalCommunity,
				[LocalCommunity] = @LocalCommunity,
				[CurrentCommunityCenter] = @CurrentCommunityCenter,
				[PrimaryLocationSettlement] = @PrimaryLocationSettlement,
				[AreaOfOrigin] = @AreaOfOrigin,
				[Area_Type] = @Area_Type,
				[Intake_family_Income] = @Intake_family_Income,
				[HouseOwnershipStatus] = @HouseOwnershipStatus,
				[HealthInsuranceProgram] = @HealthInsuranceProgram,
				[MonthlyIncome_Remittance] = @MonthlyIncome_Remittance,
				[MonthlyIncome_Rental] = @MonthlyIncome_Rental,
				[MonthlyIncome_OtherSources] = @MonthlyIncome_OtherSources,
				[Land_Barren_Kanal] = @Land_Barren_Kanal,
				[Land_Barren_Value_Rs] = @Land_Barren_Value_Rs,
				[Land_Agriculture_Kanal] = @Land_Agriculture_Kanal,
				[Land_Agriculture_Value_Rs] = @Land_Agriculture_Value_Rs,
				[Livestock_Number] = @Livestock_Number,
				[Livestock_Value_Rs] = @Livestock_Value_Rs,
				[Fruit_Trees_Number] = @Fruit_Trees_Number,
				[Fruit_Trees_Value_Rs] = @Fruit_Trees_Value_Rs,
				[Vehicles_4W_Number] = @Vehicles_4W_Number,
				[Vehicles_4W_Value_Rs] = @Vehicles_4W_Value_Rs,
				[Motorcycle_2W_Number] = @Motorcycle_2W_Number,
				[Motorcycle_2W_Value_Rs] = @Motorcycle_2W_Value_Rs,
				[UpdatedAt] = GETDATE()
			WHERE [FormNumber] = @FormNumber
		`;

		const updateResult = await updateRequest.query(updateQuery);
		
		console.log("Update query executed. Rows affected:", updateResult.rowsAffected);
		console.log("Update result:", updateResult);

		// Update/Insert PE_Family_Status table
		try {
			await updateFamilyStatus(body.FormNumber, request);
		} catch (familyStatusError: any) {
			// Log error but don't fail the main operation
			console.error("Error in updateFamilyStatus (non-blocking):", familyStatusError);
		}

		return NextResponse.json({
			success: true,
			message: "Application basic info updated successfully",
			rowsAffected: updateResult.rowsAffected?.[0] || 0,
		});
	} catch (error: any) {
		console.error("Error updating basic info:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update application basic info",
			},
			{ status: 500 }
		);
	}
}

