import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Auth
		const authCookie = request.cookies.get("auth");
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized", members: [], interventions: {} },
				{ status: 401 }
			);
		}

		const userId = authCookie.value.split(":")[1];
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Invalid session", members: [], interventions: {} },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required", members: [], interventions: {} },
				{ status: 400 }
			);
		}

		// Validate formNumber format (basic validation)
		if (typeof formNumber !== "string" || formNumber.length > 50) {
			return NextResponse.json(
				{ success: false, message: "Invalid Form Number format", members: [], interventions: {} },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNumber", sql.VarChar, formNumber);
		sqlRequest.input("InterventionStatus", sql.VarChar, "Open");
		sqlRequest.input("ApprovalStatus", sql.VarChar, "Approved");

		// Fetch ONLY members that are linked to Open + Approved interventions for this FormNumber
		// Match: PE_Interventions.MemberID = PE_FamilyMember.BeneficiaryID
		const membersQuery = `
			SELECT DISTINCT
				fm.[BeneficiaryID],
				fm.[FullName],
				fm.[BFormOrCNIC],
				fm.[Relationship],
				fm.[Gender],
				fm.[DOBMonth],
				fm.[DOBYear],
				fm.[MonthlyIncome]
			FROM [SJDA_Users].[dbo].[PE_Interventions] i
			INNER JOIN [SJDA_Users].[dbo].[PE_FamilyMember] fm
				ON fm.[BeneficiaryID] = i.[MemberID]
			WHERE i.[FormNumber] = @FormNumber
				AND LOWER(LTRIM(RTRIM(i.[InterventionStatus]))) = LOWER(LTRIM(RTRIM(@InterventionStatus)))
				AND LOWER(LTRIM(RTRIM(i.[ApprovalStatus]))) = LOWER(LTRIM(RTRIM(@ApprovalStatus)))
			ORDER BY fm.[BeneficiaryID]
		`;

		const membersResult = await sqlRequest.query(membersQuery);
		const members = membersResult.recordset || [];

		// Find the Self member by Relationship
		const selfMember = members.find((m: any) => {
			const rel = String(m?.Relationship ?? "").trim().toLowerCase();
			return rel === "self";
		});

		// Fetch interventions for each member (only Open + Approved)
		const interventions: Record<string, {
			economic: boolean;
			education: boolean;
			food: boolean;
			habitat: boolean;
		}> = {};

		// Fetch PE Investment Amount for each member from Economic Development
		const peInvestmentAmounts: Record<string, number> = {};

		// Get beneficiary IDs for checking interventions
		const memberNos = members.map((m: any) => m.BeneficiaryID).filter(Boolean);
		
		// Check Economic Development (by BeneficiaryID) and get PE Investment Amount
		let economicMemberNos = new Set<string>();
		if (memberNos.length > 0) {
			// Use parameterized query with table variable approach
			const economicRequest = pool.request();
			const memberNosParam = memberNos.map((m: string) => m.replace(/'/g, "''")).join("','");
			const economicQuery = `
				SELECT 
					[BeneficiaryID],
					SUM(CAST([InvestmentFromPEProgram] AS DECIMAL(18, 2))) as TotalPEInvestment
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [IsActive] = 1
					AND [BeneficiaryID] IN ('${memberNosParam}')
				GROUP BY [BeneficiaryID]
			`;
			const economicResult = await economicRequest.query(economicQuery);
			(economicResult.recordset || []).forEach((r: any) => {
				economicMemberNos.add(r.BeneficiaryID);
				peInvestmentAmounts[r.BeneficiaryID] = parseFloat(r.TotalPEInvestment) || 0;
			});
		}

		// Check Social Education (by BeneficiaryID)
		let educationMemberNos = new Set<string>();
		if (memberNos.length > 0) {
			const educationRequest = pool.request();
			const memberNosParam = memberNos.map((m: string) => m.replace(/'/g, "''")).join("','");
			const educationQuery = `
				SELECT DISTINCT [BeneficiaryID]
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [IsActive] = 1
					AND [BeneficiaryID] IN ('${memberNosParam}')
			`;
			const educationResult = await educationRequest.query(educationQuery);
			educationMemberNos = new Set(
				(educationResult.recordset || []).map((r: any) => r.BeneficiaryID)
			);
		}

		// Check Food Support - only for the Self member
		const selfMemberId = selfMember?.BeneficiaryID;
		let foodMemberNos = new Set<string>();
		if (selfMemberId) {
			const foodRequest = pool.request();
			foodRequest.input("FormNo", sql.VarChar, formNumber);
			const foodQuery = `
				SELECT DISTINCT [FormNumber]
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [IsActive] = 1
					AND [FormNumber] = @FormNo
			`;
			const foodResult = await foodRequest.query(foodQuery);
			const hasFoodSupport = (foodResult.recordset || []).length > 0;
			
			// Only add the Self member if food support exists
			if (hasFoodSupport) {
				foodMemberNos.add(selfMemberId);
			}
		}

		// Check Habitat Support - only for the Self member
		let habitatMemberNos = new Set<string>();
		if (selfMemberId) {
			const habitatRequest = pool.request();
			habitatRequest.input("FormNo", sql.VarChar, formNumber);
			const habitatQuery = `
				SELECT DISTINCT [FormNumber]
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [IsActive] = 1
					AND [FormNumber] = @FormNo
			`;
			const habitatResult = await habitatRequest.query(habitatQuery);
			const hasHabitatSupport = (habitatResult.recordset || []).length > 0;
			
			// Only add the Self member if habitat support exists
			if (hasHabitatSupport) {
				habitatMemberNos.add(selfMemberId);
			}
		}

		// Build interventions object for each member
		members.forEach((member: any) => {
			const memberNo = member.BeneficiaryID;

			interventions[memberNo] = {
				economic: economicMemberNos.has(memberNo),
				education: educationMemberNos.has(memberNo),
				food: foodMemberNos.has(memberNo),
				habitat: habitatMemberNos.has(memberNo),
			};
		});

		// Fetch bank details for all members in bulk
		const bankDetailsMap: Record<string, { BankNo: number | null; BankName: string | null; AccountNo: string | null }> = {};
		
		if (memberNos.length > 0) {
			try {
				const bankRequest = pool.request();
				const memberNosParam = memberNos.map((m: string) => m.replace(/'/g, "''")).join("','");
				const bankQuery = `
					SELECT
						[BeneficiaryID],
						MAX([BankNo]) AS BankNo,
						MAX([BankName]) AS BankName,
						MAX([AccountNo]) AS AccountNo
					FROM [SJDA_Users].[dbo].[PE_BankInformation]
					WHERE [FormNumber] = @FormNumber
						AND [BeneficiaryID] IN ('${memberNosParam}')
					GROUP BY [BeneficiaryID]
				`;
				bankRequest.input("FormNumber", sql.VarChar, formNumber);
				(bankRequest as any).timeout = 120000;
				const bankResult = await bankRequest.query(bankQuery);
				
				(bankResult.recordset || []).forEach((row: any) => {
					bankDetailsMap[row.BeneficiaryID] = {
						BankNo: row.BankNo ? parseInt(row.BankNo, 10) : null,
						BankName: row.BankName || null,
						AccountNo: row.AccountNo || null
					};
				});
			} catch (bankError) {
				console.error("Error fetching bank details:", bankError);
				// Continue without bank details if query fails
			}
		}

		// Add PE Investment Amount and bank details to each member
		const membersWithPEInvestment = members.map((member: any) => ({
			...member,
			PEInvestmentAmount: peInvestmentAmounts[member.BeneficiaryID] || 0,
			BankNo: bankDetailsMap[member.BeneficiaryID]?.BankNo || null,
			BankName: bankDetailsMap[member.BeneficiaryID]?.BankName || null,
			AccountNo: bankDetailsMap[member.BeneficiaryID]?.AccountNo || null,
		}));

		return NextResponse.json({
			success: true,
			members: membersWithPEInvestment,
			interventions,
		});
	} catch (error) {
		console.error("Error fetching ROPS family members:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching ROPS family members: " + errorMessage,
				members: [],
				interventions: {},
			},
			{ status: 500 }
		);
	}
}
