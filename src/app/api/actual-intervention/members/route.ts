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

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		sqlRequest.input("FormNo", sql.VarChar, formNumber);

		// Fetch family members
		const membersQuery = `
			SELECT 
				[MemberNo],
				[FullName],
				[BFormOrCNIC],
				[Relationship],
				[Gender],
				[DOBMonth],
				[DOBYear],
				[MonthlyIncome]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNo
			ORDER BY [MemberNo]
		`;

		const membersResult = await sqlRequest.query(membersQuery);
		const members = membersResult.recordset || [];

		// Fetch interventions for each member
		const interventions: Record<string, {
			economic: boolean;
			education: boolean;
			food: boolean;
			habitat: boolean;
		}> = {};

		// Get member numbers for checking interventions
		const memberNos = members.map((m: any) => m.MemberNo).filter(Boolean);
		
		// Check Economic Development (by BeneficiaryID)
		let economicMemberNos = new Set<string>();
		if (memberNos.length > 0) {
			// Use parameterized query with table variable approach
			const economicRequest = pool.request();
			const memberNosParam = memberNos.map((m: string) => m.replace(/'/g, "''")).join("','");
			const economicQuery = `
				SELECT DISTINCT [BeneficiaryID]
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [IsActive] = 1
					AND [BeneficiaryID] IN ('${memberNosParam}')
			`;
			const economicResult = await economicRequest.query(economicQuery);
			economicMemberNos = new Set(
				(economicResult.recordset || []).map((r: any) => r.BeneficiaryID)
			);
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

		// Check Food Support - only for the first member ending with "-01"
		// Find the first member that ends with "-01"
		const firstMemberWith01 = memberNos.find((m: string) => {
			return m && m.endsWith("-01");
		});

		let foodMemberNos = new Set<string>();
		if (firstMemberWith01) {
			const foodRequest = pool.request();
			foodRequest.input("FormNo", sql.VarChar, formNumber);
			const foodQuery = `
				SELECT DISTINCT [FamilyID]
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [IsActive] = 1
					AND [FamilyID] = @FormNo
			`;
			const foodResult = await foodRequest.query(foodQuery);
			const hasFoodSupport = (foodResult.recordset || []).length > 0;
			
			// Only add the first member ending with "-01" if food support exists
			if (hasFoodSupport) {
				foodMemberNos.add(firstMemberWith01);
			}
		}

		// Check Habitat Support - only for the first member ending with "-01"
		let habitatMemberNos = new Set<string>();
		if (firstMemberWith01) {
			const habitatRequest = pool.request();
			habitatRequest.input("FormNo", sql.VarChar, formNumber);
			const habitatQuery = `
				SELECT DISTINCT [FamilyID]
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [IsActive] = 1
					AND [FamilyID] = @FormNo
			`;
			const habitatResult = await habitatRequest.query(habitatQuery);
			const hasHabitatSupport = (habitatResult.recordset || []).length > 0;
			
			// Only add the first member ending with "-01" if habitat support exists
			if (hasHabitatSupport) {
				habitatMemberNos.add(firstMemberWith01);
			}
		}

		// Build interventions object for each member
		members.forEach((member: any) => {
			const memberNo = member.MemberNo;

			interventions[memberNo] = {
				economic: economicMemberNos.has(memberNo),
				education: educationMemberNos.has(memberNo),
				food: foodMemberNos.has(memberNo),
				habitat: habitatMemberNos.has(memberNo),
			};
		});

		return NextResponse.json({
			success: true,
			members,
			interventions,
		});
	} catch (error) {
		console.error("Error fetching family members:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching family members: " + errorMessage,
				members: [],
				interventions: {},
			},
			{ status: 500 }
		);
	}
}
