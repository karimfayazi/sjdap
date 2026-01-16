import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// GET - Fetch CRC Family Status record(s)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");
		const familyStatusId = searchParams.get("familyStatusId");

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		if (familyStatusId) {
			// Fetch specific record by ID
			sqlRequest.input("FamilyStatusId", sql.Int, parseInt(familyStatusId));
			const query = `
				SELECT TOP 1 *
				FROM [SJDA_Users].[dbo].[PE_CRC_Family_Status]
				WHERE [Family_Status_Id] = @FamilyStatusId
			`;
			const result = await sqlRequest.query(query);
			
			if (result.recordset.length === 0) {
				return NextResponse.json(
					{ success: false, message: "Record not found" },
					{ status: 404 }
				);
			}

			const record = result.recordset[0];
			let mentor = null;
			let submittedAt = null;
			
			// If Form_Number exists, fetch Mentor and SubmittedAt from PE_Application_BasicInfo
			if (record.Form_Number) {
				const basicInfoRequest = pool.request();
				basicInfoRequest.input("FormNumber", sql.VarChar, record.Form_Number);
				const basicInfoQuery = `
					SELECT TOP 1 
						ISNULL(u.[UserFullName], app.[SubmittedBy]) as SubmittedBy,
						app.[SubmittedAt]
					FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
					LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON app.[SubmittedBy] = u.[UserFullName]
					WHERE app.[FormNumber] = @FormNumber
				`;
				const basicInfoResult = await basicInfoRequest.query(basicInfoQuery);
				mentor = basicInfoResult.recordset?.[0]?.SubmittedBy || null;
				submittedAt = basicInfoResult.recordset?.[0]?.SubmittedAt || null;
			}

			return NextResponse.json({
				success: true,
				data: record,
				mentor: mentor,
				submittedAt: submittedAt,
			});
		} else if (formNumber) {
			// Fetch record(s) by Form Number and also get Mentor and SubmittedAt from PE_Application_BasicInfo
			sqlRequest.input("FormNumber", sql.VarChar, formNumber);
			
			// Get Mentor and SubmittedAt from PE_Application_BasicInfo
			const basicInfoQuery = `
				SELECT TOP 1 
					ISNULL(u.[UserFullName], app.[SubmittedBy]) as SubmittedBy,
					app.[SubmittedAt]
				FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo] app
				LEFT JOIN [SJDA_Users].[dbo].[PE_User] u ON app.[SubmittedBy] = u.[UserFullName]
				WHERE app.[FormNumber] = @FormNumber
			`;
			const basicInfoResult = await sqlRequest.query(basicInfoQuery);
			const mentor = basicInfoResult.recordset?.[0]?.SubmittedBy || null;
			const submittedAt = basicInfoResult.recordset?.[0]?.SubmittedAt || null;
			
			// Fetch CRC Family Status records
			const query = `
				SELECT *
				FROM [SJDA_Users].[dbo].[PE_CRC_Family_Status]
				WHERE [Form_Number] = @FormNumber
				ORDER BY [Family_Status_Id] DESC
			`;
			const result = await sqlRequest.query(query);

			return NextResponse.json({
				success: true,
				data: result.recordset || [],
				mentor: mentor,
				submittedAt: submittedAt,
			});
		} else {
			return NextResponse.json(
				{ success: false, message: "Form Number or Family Status ID is required" },
				{ status: 400 }
			);
		}
	} catch (error: any) {
		console.error("Error fetching CRC Family Status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching CRC Family Status",
			},
			{ status: 500 }
		);
	}
}

// POST - Create new CRC Family Status record
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.Form_Number) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Get user information for User_Name
		let userName = null;
		try {
			const authCookie = request.cookies.get("auth");
			if (authCookie && authCookie.value) {
				const userId = authCookie.value.split(":")[1];
				if (userId) {
					const userPool = await getDb();
					const userResult = await userPool
						.request()
						.input("user_id", userId)
						.query(
							"SELECT TOP(1) [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
						);
					const user = userResult.recordset?.[0];
					userName = user?.UserId || user?.email_address || userId;
				}
			}
		} catch (userError) {
			console.error("Error fetching user info:", userError);
		}

		// Prepare parameters
		sqlRequest.input("Form_Number", sql.VarChar, body.Form_Number);
		sqlRequest.input("Family_Status_Level", sql.VarChar, body.Family_Status_Level || null);
		sqlRequest.input("Mentor", sql.VarChar, body.Mentor || null);
		sqlRequest.input("Family_Mentor", sql.VarChar, body.Family_Mentor || null);
		sqlRequest.input("Application_Date", sql.DateTime, body.Application_Date ? new Date(body.Application_Date) : null);
		sqlRequest.input("FDP_Approved_Date", sql.DateTime, body.FDP_Approved_Date ? new Date(body.FDP_Approved_Date) : null);
		sqlRequest.input("Self_Sufficient_Date", sql.DateTime, body.Self_Sufficient_Date ? new Date(body.Self_Sufficient_Date) : null);
		sqlRequest.input("Graduated_Date", sql.DateTime, body.Graduated_Date ? new Date(body.Graduated_Date) : null);
		sqlRequest.input("Dropout_Date", sql.DateTime, body.Dropout_Date ? new Date(body.Dropout_Date) : null);
		sqlRequest.input("Program_Type", sql.VarChar, body.Program_Type || null);
		sqlRequest.input("Family_From", sql.VarChar, body.Family_From || null);
		sqlRequest.input("Dropout_Category", sql.VarChar, body.Dropout_Category || null);
		sqlRequest.input("Community_Affiliation", sql.VarChar, body.Community_Affiliation || null);
		sqlRequest.input("Application_Status", sql.VarChar, body.Application_Status || null);
		sqlRequest.input("FDP_Development_Status", sql.VarChar, body.FDP_Development_Status || null);
		sqlRequest.input("FDP_Development_Date", sql.DateTime, body.FDP_Development_Date ? new Date(body.FDP_Development_Date) : null);
		sqlRequest.input("CRC_Approval_Status", sql.VarChar, body.CRC_Approval_Status || null);
		sqlRequest.input("CRC_Approval_Date", sql.DateTime, body.CRC_Approval_Date ? new Date(body.CRC_Approval_Date) : null);
		sqlRequest.input("Intervention_Status", sql.VarChar, body.Intervention_Status || null);
		sqlRequest.input("Intervention_Start_Date", sql.DateTime, body.Intervention_Start_Date ? new Date(body.Intervention_Start_Date) : null);
		sqlRequest.input("User_Name", sql.VarChar, userName);
		sqlRequest.input("Remarks", sql.NVarChar, body.Remarks || null);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_CRC_Family_Status]
			(
				[Form_Number],
				[Family_Status_Level],
				[Mentor],
				[Family_Mentor],
				[Application_Date],
				[FDP_Approved_Date],
				[Self_Sufficient_Date],
				[Graduated_Date],
				[Dropout_Date],
				[Program_Type],
				[Family_From],
				[Dropout_Category],
				[Community_Affiliation],
				[Application_Status],
				[FDP_Development_Status],
				[FDP_Development_Date],
				[CRC_Approval_Status],
				[CRC_Approval_Date],
				[Intervention_Status],
				[Intervention_Start_Date],
				[User_Name],
				[System_Date],
				[Remarks]
			)
			VALUES
			(
				@Form_Number,
				@Family_Status_Level,
				@Mentor,
				@Family_Mentor,
				@Application_Date,
				@FDP_Approved_Date,
				@Self_Sufficient_Date,
				@Graduated_Date,
				@Dropout_Date,
				@Program_Type,
				@Family_From,
				@Dropout_Category,
				@Community_Affiliation,
				@Application_Status,
				@FDP_Development_Status,
				@FDP_Development_Date,
				@CRC_Approval_Status,
				@CRC_Approval_Date,
				@Intervention_Status,
				@Intervention_Start_Date,
				@User_Name,
				GETDATE(),
				@Remarks
			);
			SELECT SCOPE_IDENTITY() AS Family_Status_Id;
		`;

		const result = await sqlRequest.query(insertQuery);
		const newId = result.recordset[0]?.Family_Status_Id;

		return NextResponse.json({
			success: true,
			message: "CRC Family Status record created successfully",
			data: { Family_Status_Id: newId },
		});
	} catch (error: any) {
		console.error("Error creating CRC Family Status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error creating CRC Family Status",
			},
			{ status: 500 }
		);
	}
}

// PUT - Update existing CRC Family Status record
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.Family_Status_Id) {
			return NextResponse.json(
				{ success: false, message: "Family Status ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();

		// Get user information for User_Name
		let userName = null;
		try {
			const authCookie = request.cookies.get("auth");
			if (authCookie && authCookie.value) {
				const userId = authCookie.value.split(":")[1];
				if (userId) {
					const userPool = await getDb();
					const userResult = await userPool
						.request()
						.input("user_id", userId)
						.query(
							"SELECT TOP(1) [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
						);
					const user = userResult.recordset?.[0];
					userName = user?.UserId || user?.email_address || userId;
				}
			}
		} catch (userError) {
			console.error("Error fetching user info:", userError);
		}

		// Prepare parameters
		sqlRequest.input("Family_Status_Id", sql.Int, body.Family_Status_Id);
		sqlRequest.input("Form_Number", sql.VarChar, body.Form_Number || null);
		sqlRequest.input("Family_Status_Level", sql.VarChar, body.Family_Status_Level || null);
		sqlRequest.input("Mentor", sql.VarChar, body.Mentor || null);
		sqlRequest.input("Family_Mentor", sql.VarChar, body.Family_Mentor || null);
		sqlRequest.input("Application_Date", sql.DateTime, body.Application_Date ? new Date(body.Application_Date) : null);
		sqlRequest.input("FDP_Approved_Date", sql.DateTime, body.FDP_Approved_Date ? new Date(body.FDP_Approved_Date) : null);
		sqlRequest.input("Self_Sufficient_Date", sql.DateTime, body.Self_Sufficient_Date ? new Date(body.Self_Sufficient_Date) : null);
		sqlRequest.input("Graduated_Date", sql.DateTime, body.Graduated_Date ? new Date(body.Graduated_Date) : null);
		sqlRequest.input("Dropout_Date", sql.DateTime, body.Dropout_Date ? new Date(body.Dropout_Date) : null);
		sqlRequest.input("Program_Type", sql.VarChar, body.Program_Type || null);
		sqlRequest.input("Family_From", sql.VarChar, body.Family_From || null);
		sqlRequest.input("Dropout_Category", sql.VarChar, body.Dropout_Category || null);
		sqlRequest.input("Community_Affiliation", sql.VarChar, body.Community_Affiliation || null);
		sqlRequest.input("Application_Status", sql.VarChar, body.Application_Status || null);
		sqlRequest.input("FDP_Development_Status", sql.VarChar, body.FDP_Development_Status || null);
		sqlRequest.input("FDP_Development_Date", sql.DateTime, body.FDP_Development_Date ? new Date(body.FDP_Development_Date) : null);
		sqlRequest.input("CRC_Approval_Status", sql.VarChar, body.CRC_Approval_Status || null);
		sqlRequest.input("CRC_Approval_Date", sql.DateTime, body.CRC_Approval_Date ? new Date(body.CRC_Approval_Date) : null);
		sqlRequest.input("Intervention_Status", sql.VarChar, body.Intervention_Status || null);
		sqlRequest.input("Intervention_Start_Date", sql.DateTime, body.Intervention_Start_Date ? new Date(body.Intervention_Start_Date) : null);
		sqlRequest.input("User_Name", sql.VarChar, userName);
		sqlRequest.input("Remarks", sql.NVarChar, body.Remarks || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_CRC_Family_Status]
			SET
				[Form_Number] = @Form_Number,
				[Family_Status_Level] = @Family_Status_Level,
				[Mentor] = @Mentor,
				[Family_Mentor] = @Family_Mentor,
				[Application_Date] = @Application_Date,
				[FDP_Approved_Date] = @FDP_Approved_Date,
				[Self_Sufficient_Date] = @Self_Sufficient_Date,
				[Graduated_Date] = @Graduated_Date,
				[Dropout_Date] = @Dropout_Date,
				[Program_Type] = @Program_Type,
				[Family_From] = @Family_From,
				[Dropout_Category] = @Dropout_Category,
				[Community_Affiliation] = @Community_Affiliation,
				[Application_Status] = @Application_Status,
				[FDP_Development_Status] = @FDP_Development_Status,
				[FDP_Development_Date] = @FDP_Development_Date,
				[CRC_Approval_Status] = @CRC_Approval_Status,
				[CRC_Approval_Date] = @CRC_Approval_Date,
				[Intervention_Status] = @Intervention_Status,
				[Intervention_Start_Date] = @Intervention_Start_Date,
				[User_Name] = @User_Name,
				[System_Date] = GETDATE(),
				[Remarks] = @Remarks
			WHERE [Family_Status_Id] = @Family_Status_Id
		`;

		await sqlRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "CRC Family Status record updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating CRC Family Status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error updating CRC Family Status",
			},
			{ status: 500 }
		);
	}
}
