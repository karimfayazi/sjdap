import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
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

		const { searchParams } = new URL(request.url);
		const interventionId = searchParams.get("interventionId");
		if (!interventionId) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("InterventionID", sql.Int, parseInt(interventionId));

		const query = `
			SELECT 
				i.[InterventionID],
				i.[FormNumber],
				i.[Section],
				i.[InterventionStatus],
				i.[InterventionCategory],
				i.[SubCategory],
				i.[MainIntervention],
				i.[InterventionType],
				i.[FinancialCategory],
				i.[TotalAmount],
				i.[InterventionStartDate],
				i.[InterventionEndDate],
				i.[Remarks],
				i.[MemberID],
				i.[ApprovalStatus],
				i.[CreatedBy] as Mentor,
				i.[CreatedAt],
				b.[Full_Name] as FamilyFullName,
				b.[CNICNumber] as FamilyCNIC,
				b.[RegionalCommunity],
				b.[LocalCommunity],
				m.[FullName] as MemberName,
				m.[BFormOrCNIC] as MemberCNIC
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b
				ON i.[FormNumber] = b.[FormNumber]
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m
				ON i.[MemberID] = m.[BeneficiaryID]
			WHERE i.[InterventionID] = @InterventionID
		`;

		const result = await sqlRequest.query(query);
		const intervention = result.recordset[0];

		if (!intervention) {
			return NextResponse.json(
				{ success: false, message: "Intervention not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			intervention,
		});
	} catch (error) {
		console.error("Error fetching intervention:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching intervention: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
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

		const { getDb } = await import("@/lib/db");
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
		const interventionId = searchParams.get("interventionId");
		if (!interventionId) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { ApprovalStatus, Remarks } = body;

		if (!ApprovalStatus) {
			return NextResponse.json(
				{ success: false, message: "Approval Status is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const transaction = new sql.Transaction(pool);
		
		try {
			await transaction.begin();

			const updateRequest = new sql.Request(transaction);
			updateRequest.input("InterventionID", sql.Int, parseInt(interventionId));
			updateRequest.input("ApprovalStatus", sql.NVarChar, ApprovalStatus);
			updateRequest.input("Remarks", sql.NVarChar, Remarks || null);

			const updateQuery = `
				UPDATE [SJDA_Users].[dbo].[PE_Interventions]
				SET 
					[ApprovalStatus] = @ApprovalStatus,
					[Remarks] = @Remarks
				WHERE [InterventionID] = @InterventionID
			`;

			await updateRequest.query(updateQuery);

			const formNumberRequest = new sql.Request(transaction);
			formNumberRequest.input("InterventionID", sql.Int, parseInt(interventionId));
			const formNumberQuery = `
				SELECT [FormNumber]
				FROM [SJDA_Users].[dbo].[PE_Interventions]
				WHERE [InterventionID] = @InterventionID
			`;
			const formNumberResult = await formNumberRequest.query(formNumberQuery);
			const formNumber = formNumberResult.recordset[0]?.FormNumber || null;

			const logRequest = new sql.Request(transaction);
			logRequest.input("ModuleName", sql.NVarChar, "Intervention");
			logRequest.input("RecordID", sql.Int, parseInt(interventionId));
			logRequest.input("ActionLevel", sql.VarChar, ApprovalStatus);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, ApprovalStatus === "Approved" ? "Approval" : ApprovalStatus === "Rejected" ? "Rejection" : "Update");
			logRequest.input("Remarks", sql.NVarChar, Remarks || null);
			logRequest.input("FormNumber", sql.VarChar, formNumber);

			const insertLogQuery = `
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks], [FormNumber])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks, @FormNumber)
			`;

			await logRequest.query(insertLogQuery);

			await transaction.commit();

			return NextResponse.json({
				success: true,
				message: "Intervention updated successfully",
			});
		} catch (error) {
			await transaction.rollback();
			throw error;
		}
	} catch (error) {
		console.error("Error updating intervention:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error updating intervention: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
