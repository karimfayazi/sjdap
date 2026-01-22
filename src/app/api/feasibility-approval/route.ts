import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";
import { getUserIdFromNextRequest } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/rbac-utils";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Permission check removed - allow all authenticated users
		// Get userId directly from auth cookie
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

		// Check if user is Super Admin for data filtering
		const isSuperAdminUser = await isSuperAdmin(userId);

		// Fetch feasibility data with joins
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;
		sqlRequest.input("userId", userId);

		// Build WHERE clause for regional council filtering using subquery
		let regionalCouncilFilter = '';
		if (!isSuperAdminUser) {
			// Use EXISTS subquery to filter by user's regional councils
			// This is safer and more efficient than fetching names first
			regionalCouncilFilter = `
				AND EXISTS (
					SELECT 1
					FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
					INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc
						ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId]
					WHERE ura.[UserId] = @userId
						AND rc.[RegionalCouncilName] = b.[RegionalCommunity]
				)
			`;
		}

		const query = `
			SELECT 
				f.[FDP_ID],
				f.[FormNumber],
				f.[MemberID],
				f.[MemberName],
				f.[PlanCategory],
				f.[FeasibilityType],
				f.[InvestmentRationale],
				f.[MarketBusinessAnalysis],
				f.[TotalSalesRevenue],
				f.[TotalDirectCosts],
				f.[TotalIndirectCosts],
				f.[NetProfitLoss],
				f.[TotalInvestmentRequired],
				f.[InvestmentFromPEProgram],
				f.[SubField],
				f.[Trade],
				f.[TrainingInstitution],
				f.[InstitutionType],
				f.[InstitutionCertifiedBy],
				f.[CourseTitle],
				f.[CourseDeliveryType],
				f.[HoursOfInstruction],
				f.[DurationWeeks],
				f.[StartDate],
				f.[EndDate],
				f.[CostPerParticipant],
				f.[ExpectedStartingSalary],
				f.[FeasibilityPdfPath],
				f.[ApprovalStatus],
				f.[ApprovalRemarks],
				f.[SystemDate],
				f.[CreatedBy],
				-- Current Baseline Income from member's MonthlyIncome
				ISNULL(m.[MonthlyIncome], 0) AS [CurrentBaselineIncome],
				-- Family Member Info
				m.[BeneficiaryID],
				m.[FormNo] AS MemberFormNo,
				m.[FullName] AS MemberFullName,
				m.[BFormOrCNIC] AS MemberBFormOrCNIC,
				m.[Gender] AS MemberGender,
				-- Application Basic Info
				b.[FormNumber] AS ApplicationFormNumber,
				b.[Full_Name] AS ApplicationFullName,
				b.[CNICNumber],
				b.[RegionalCommunity],
				b.[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility] f
			LEFT JOIN [SJDA_Users].[dbo].[PE_FamilyMember] m 
				ON f.[MemberID] = m.[BeneficiaryID] AND f.[FormNumber] = m.[FormNo]
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] b 
				ON f.[FormNumber] = b.[FormNumber]
			WHERE 1=1 ${regionalCouncilFilter}
			ORDER BY f.[FDP_ID] DESC
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		// Group records by FormNumber (family grouping)
		const groupedByFormNumber: Record<string, {
			family: {
				formNumber: string;
				fullName: string;
				cnicNumber: string;
				regionalCommunity: string;
				localCommunity: string;
			};
			feasibilityRecords: any[];
		}> = {};

		records.forEach((record: any) => {
			const formNumber = (record.FormNumber || record.ApplicationFormNumber || "").trim();
			if (!formNumber) return; // Skip records without FormNumber

			if (!groupedByFormNumber[formNumber]) {
				groupedByFormNumber[formNumber] = {
					family: {
						formNumber: formNumber,
						fullName: record.ApplicationFullName || "N/A",
						cnicNumber: record.CNICNumber || "N/A",
						regionalCommunity: record.RegionalCommunity || "N/A",
						localCommunity: record.LocalCommunity || "N/A",
					},
					feasibilityRecords: [],
				};
			}

			// Calculate FamilyContribution = TotalInvestmentRequired - InvestmentFromPEProgram
			const totalCost = record.TotalInvestmentRequired != null ? Number(record.TotalInvestmentRequired) : 0;
			const peContribution = record.InvestmentFromPEProgram != null ? Number(record.InvestmentFromPEProgram) : 0;
			const familyContribution = totalCost - peContribution;

			// Calculate PE-Support based on PlanCategory
			const planCategory = (record.PlanCategory || "").trim().toUpperCase();
			let peSupport = 0;
			if (planCategory === "ECONOMIC") {
				peSupport = peContribution;
			} else if (planCategory === "SKILLS") {
				peSupport = record.CostPerParticipant != null ? Number(record.CostPerParticipant) : 0;
			}

			groupedByFormNumber[formNumber].feasibilityRecords.push({
				fdpId: record.FDP_ID,
				formNumber: record.FormNumber || null,
				memberId: record.MemberID || null,
				memberName: record.MemberName || null,
				planCategory: record.PlanCategory || null,
				feasibilityType: record.FeasibilityType || null,
				peSupport: peSupport,
				approvalStatus: record.ApprovalStatus || null,
				createdBy: record.CreatedBy || "N/A",
				submittedAt: record.SystemDate || null,
				submittedBy: record.CreatedBy || "N/A",
				totalCost: totalCost,
				familyContribution: familyContribution,
				peContribution: peContribution,
				remarks: record.ApprovalRemarks || null,
				// Keep all original fields for detail view
				...record,
			});
		});

		// Convert to array format
		const groupedFamilies = Object.values(groupedByFormNumber);

		return NextResponse.json({
			success: true,
			records, // Keep for backward compatibility
			groupedFamilies, // New grouped format
		});
	} catch (error) {
		console.error("Error fetching feasibility approval data:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching feasibility approval data: " + errorMessage,
				records: [],
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		// Permission check removed - allow all authenticated users
		// Get userId directly from auth cookie
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

		const body = await request.json().catch(() => ({}));
		const { fdpId, approvalStatus, approvalRemarks } = body || {};

		if (!fdpId) {
			return NextResponse.json(
				{
					success: false,
					message: "FDP_ID is required.",
				},
				{ status: 400 }
			);
		}

		// Get user's full name for ActionBy
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

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FDP_ID", sql.Int, fdpId);
		sqlRequest.input("ApprovalStatus", sql.VarChar, approvalStatus || null);
		sqlRequest.input("ApprovalRemarks", sql.NVarChar, approvalRemarks || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			SET 
				[ApprovalStatus] = ISNULL(@ApprovalStatus, [ApprovalStatus]),
				[ApprovalRemarks] = @ApprovalRemarks
			WHERE [FDP_ID] = @FDP_ID
		`;

		const result = await sqlRequest.query(updateQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "Record not found or not updateable.",
				},
				{ status: 404 }
			);
		}

		// Get FormNumber from the feasibility record
		let formNumber = null;
		try {
			const formNumberRequest = pool.request();
			formNumberRequest.input("FDP_ID", sql.Int, fdpId);
			const formNumberQuery = `
				SELECT TOP 1 [FormNumber]
				FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
				WHERE [FDP_ID] = @FDP_ID
			`;
			const formNumberResult = await formNumberRequest.query(formNumberQuery);
			formNumber = formNumberResult.recordset?.[0]?.FormNumber || null;
		} catch (formNumberError) {
			console.error("Error fetching FormNumber:", formNumberError);
		}

		// Insert into Approval_Log
		try {
			const logRequest = pool.request();
			logRequest.input("ModuleName", sql.NVarChar, "Feasibility Plan");
			logRequest.input("RecordID", sql.Int, fdpId);
			logRequest.input("ActionLevel", sql.VarChar, approvalStatus || null);
			logRequest.input("ActionBy", sql.NVarChar, userFullName);
			logRequest.input("ActionType", sql.VarChar, "Approval");
			logRequest.input("Remarks", sql.NVarChar, approvalRemarks || null);
			logRequest.input("FormNumber", sql.VarChar, formNumber);

			const insertLogQuery = `
				INSERT INTO [SJDA_Users].[dbo].[Approval_Log]
				([ModuleName], [RecordID], [ActionLevel], [ActionBy], [ActionAt], [ActionType], [Remarks], [FormNumber])
				VALUES
				(@ModuleName, @RecordID, @ActionLevel, @ActionBy, GETDATE(), @ActionType, @Remarks, @FormNumber)
			`;

			await logRequest.query(insertLogQuery);
		} catch (logError) {
			// Log error but don't fail the main operation
			console.error("Error inserting into Approval_Log:", logError);
		}

		return NextResponse.json({
			success: true,
			message: "Approval status updated successfully.",
		});
	} catch (error) {
		console.error("Error updating feasibility approval status:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);

		return NextResponse.json(
			{
				success: false,
				message: "Error updating feasibility approval status: " + errorMessage,
			},
			{ status: 500 }
		);
	}
}
