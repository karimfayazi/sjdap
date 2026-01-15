import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Form Number is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const sqlRequest = pool.request();
		sqlRequest.input("FormNumber", sql.VarChar(50), formNumber);

		// Fetch basic family information
		const basicInfoQuery = `
			SELECT 
				[FormNumber],
				[Full_Name],
				[RegionalCommunity],
				[LocalCommunity],
				[Area_Type],
				[Intake_family_Income],
				[MonthlyIncome_Remittance],
				[MonthlyIncome_Rental],
				[MonthlyIncome_OtherSources],
				[SubmittedBy]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @FormNumber
		`;

		const basicInfoResult = await sqlRequest.query(basicInfoQuery);
		const basicInfo = basicInfoResult.recordset[0];

		// Fetch family members count
		const membersQuery = `
			SELECT 
				COUNT(*) as TotalMembers,
				SUM(ISNULL([MonthlyIncome], 0)) as TotalMemberIncome
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNumber
		`;

		const membersResult = await sqlRequest.query(membersQuery);
		const membersData = membersResult.recordset[0];
		const totalMembers = membersData?.TotalMembers || 0;
		const totalMemberIncome = membersData?.TotalMemberIncome || 0;

		// Calculate baseline family income
		const baselineFamilyIncome = 
			(basicInfo?.MonthlyIncome_Remittance || 0) +
			(basicInfo?.MonthlyIncome_Rental || 0) +
			(basicInfo?.MonthlyIncome_OtherSources || 0) +
			totalMemberIncome;

		// Calculate baseline per capita income
		const baselinePerCapita = totalMembers > 0 
			? baselineFamilyIncome / totalMembers 
			: 0;

		// Determine self-sufficiency income per capita based on area type
		const areaType = basicInfo?.Area_Type || "Rural";
		const selfSufficiencyIncomePerCapita = 
			areaType === "Urban" ? 19200 :
			areaType === "Peri-Urban" ? 16100 :
			10800; // Rural

		// Calculate poverty level
		const calculatePovertyLevel = (perCapitaIncome: number, areaType: string): string => {
			const thresholds: { [key: string]: { [key: number]: string } } = {
				"Rural": {
					0: "Level -4",
					2700: "Level -3",
					5400: "Level -2",
					8100: "Level -1",
					10800: "Level 0",
					13500: "Level +1",
				},
				"Urban": {
					0: "Level -4",
					4800: "Level -3",
					9600: "Level -2",
					14400: "Level -1",
					19200: "Level 0",
					24000: "Level +1",
				},
				"Peri-Urban": {
					0: "Level -4",
					4025: "Level -3",
					8100: "Level -2",
					12100: "Level -1",
					16100: "Level 0",
					20100: "Level +1",
				},
			};

			const areaThresholds = thresholds[areaType] || thresholds["Rural"];
			const sortedLevels = Object.keys(areaThresholds)
				.map(Number)
				.sort((a, b) => b - a);

			for (const threshold of sortedLevels) {
				if (perCapitaIncome >= threshold) {
					return areaThresholds[threshold];
				}
			}

			return "Level -4";
		};

		const baselineIncomeLevel = calculatePovertyLevel(baselinePerCapita, areaType);

		// Query View_FDP_Approval to get FDP Status
		// Use alias to avoid issues with column names containing spaces
		const query = `
			SELECT 
				[FormNumber],
				[FDP Status] AS FDPStatus
			FROM [SJDA_Users].[dbo].[View_FDP_Approval]
			WHERE [FormNumber] = @FormNumber
		`;

		console.log("Executing query for FormNumber:", formNumber);
		const result = await sqlRequest.query(query);
		const records = result.recordset || [];
		console.log("Query result - records count:", records.length);

		// Get FDP Status from View_FDP_Approval
		let fdpStatus: string | null = null;
		
		if (records.length > 0) {
			const record = records[0];
			
			// Debug: log the record to see what's available
			console.log("FormNumber:", formNumber);
			console.log("Record keys:", Object.keys(record));
			console.log("Full record:", JSON.stringify(record, null, 2));
			
			// Get all keys from the record
			const keys = Object.keys(record);
			console.log("Available keys in record:", keys);
			
			// Try multiple ways to access the column (in order of likelihood)
			// Method 1: Try alias (FDPStatus) - most reliable
			if (record.FDPStatus !== undefined && record.FDPStatus !== null) {
				const value = String(record.FDPStatus).trim();
				if (value !== "" && value !== "null" && value !== "undefined") {
					fdpStatus = value;
					console.log("✓ Found FDP Status via FDPStatus alias:", fdpStatus);
				}
			}
			
			// Method 2: Try with space in bracket notation (FDP Status)
			if (!fdpStatus && (record as any)["FDP Status"] !== undefined && (record as any)["FDP Status"] !== null) {
				const value = String((record as any)["FDP Status"]).trim();
				if (value !== "" && value !== "null" && value !== "undefined") {
					fdpStatus = value;
					console.log("✓ Found FDP Status via 'FDP Status' key:", fdpStatus);
				}
			}
			
			// Method 3: Try iterating through all keys to find FDP Status (case-insensitive search)
			if (!fdpStatus) {
				for (const key of keys) {
					// Skip FormNumber
					if (key === "FormNumber" || key.toLowerCase() === "formnumber") continue;
					
					// Check if key contains "FDP" and "Status" (case insensitive, ignore spaces and underscores)
					const keyLower = key.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
					if (keyLower.includes("fdp") && keyLower.includes("status")) {
						const value = (record as any)[key];
						if (value !== undefined && value !== null) {
							const strValue = String(value).trim();
							if (strValue !== "" && strValue !== "null" && strValue !== "undefined") {
								fdpStatus = strValue;
								console.log("✓ Found FDP Status via key iteration - Key:", key, "Value:", fdpStatus);
								break;
							}
						}
					}
				}
			}
			
			// Method 4: Try accessing by index if it's the second column (fallback)
			if (!fdpStatus && keys.length >= 2) {
				const secondKey = keys[1]; // Usually FormNumber is first, FDP Status is second
				if (secondKey && secondKey !== "FormNumber" && secondKey.toLowerCase() !== "formnumber") {
					const value = (record as any)[secondKey];
					if (value !== undefined && value !== null) {
						const strValue = String(value).trim();
						if (strValue !== "" && strValue !== "null" && strValue !== "undefined") {
							fdpStatus = strValue;
							console.log("✓ Found FDP Status via second column - Key:", secondKey, "Value:", fdpStatus);
						}
					}
				}
			}
			
			// If value is empty string after trim, set to null
			if (fdpStatus === "" || fdpStatus === null) {
				fdpStatus = null;
			}
		} else {
			console.log("⚠ No records found in View_FDP_Approval for FormNumber:", formNumber);
		}
		
		console.log("Final FDP Status for", formNumber, ":", fdpStatus || "null", "(records found:", records.length, ")");

		// Check if all approval statuses are "Approved" from underlying tables
		// Get all approval statuses from different FDP sections
		const approvalCheckQuery = `
			SELECT 
				'Health' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
			WHERE [FormNumber] = @FormNumber AND [IsActive] = 1
			
			UNION ALL
			
			SELECT 
				'Food' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
			WHERE [FamilyID] = @FormNumber AND [IsActive] = 1
			
			UNION ALL
			
			SELECT 
				'Education' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
			WHERE [FamilyID] = @FormNumber AND [IsActive] = 1
			
			UNION ALL
			
			SELECT 
				'Housing' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
			WHERE [FamilyID] = @FormNumber AND [IsActive] = 1
			
			UNION ALL
			
			SELECT 
				'Economic' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
			WHERE [FamilyID] = @FormNumber AND [IsActive] = 1
			
			UNION ALL
			
			SELECT 
				'Feasibility' as Section,
				[ApprovalStatus]
			FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
			WHERE [FamilyID] = @FormNumber
		`;

		const approvalResult = await sqlRequest.query(approvalCheckQuery);
		const approvalRecords = approvalResult.recordset || [];

		// Check if there are any records and if all are "Approved"
		let allApproved = false;
		if (approvalRecords.length > 0) {
			// Check if all approval statuses are "Approved" (case-insensitive)
			const allApprovedCheck = approvalRecords.every((record: any) => {
				const status = (record.ApprovalStatus || "").toString().trim().toLowerCase();
				return status.includes("approve") || status === "approved" || status === "complete";
			});
			allApproved = allApprovedCheck;
		}

		// Return the actual FDP Status value
		// Calculate Total Economic Support from PE
		let totalEconomicSupport = 0;
		try {
			const economicQuery = `
				SELECT SUM(ISNULL([InvestmentFromPEProgram], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_EconomicDevelopment]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
					AND [ApprovalStatus] = 'Approved'
			`;
			const economicResult = await sqlRequest.query(economicQuery);
			totalEconomicSupport = parseFloat(economicResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Error fetching economic support:", err);
		}

		// Calculate Total Social Support from PE
		let totalSocialSupport = 0;
		try {
			// Education Support
			const educationQuery = `
				SELECT SUM(ISNULL([EduTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
			`;
			const educationResult = await sqlRequest.query(educationQuery);
			totalSocialSupport += parseFloat(educationResult.recordset[0]?.Total || 0);

			// Health Support
			const healthQuery = `
				SELECT SUM(ISNULL([HealthTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [FormNumber] = @FormNumber
					AND [IsActive] = 1
			`;
			const healthResult = await sqlRequest.query(healthQuery);
			totalSocialSupport += parseFloat(healthResult.recordset[0]?.Total || 0);

			// Housing Support
			const housingQuery = `
				SELECT SUM(ISNULL([HabitatTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
			`;
			const housingResult = await sqlRequest.query(housingQuery);
			totalSocialSupport += parseFloat(housingResult.recordset[0]?.Total || 0);

			// Food Support
			const foodQuery = `
				SELECT SUM(ISNULL([FoodSupportTotalPEContribution], 0)) as Total
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [FamilyID] = @FormNumber
					AND [IsActive] = 1
			`;
			const foodResult = await sqlRequest.query(foodQuery);
			totalSocialSupport += parseFloat(foodResult.recordset[0]?.Total || 0);
		} catch (err) {
			console.log("Error fetching social support:", err);
		}

		// Return the fdpStatus if it exists, otherwise return null (frontend will handle "Not found" display)
		const finalFdpStatus = fdpStatus !== null && fdpStatus !== undefined && fdpStatus !== "" 
			? fdpStatus 
			: null;

		return NextResponse.json({
			success: true,
			allApproved,
			fdpStatus: finalFdpStatus,
			approvalCount: approvalRecords.length,
			hasRecord: records.length > 0,
			familyInfo: basicInfo ? {
				FamilyNumber: basicInfo.FormNumber,
				HeadName: basicInfo.Full_Name,
				RegionalCouncil: basicInfo.RegionalCommunity,
				LocalCommunity: basicInfo.LocalCommunity,
				AreaType: areaType,
				BaselineIncomeLevel: baselineIncomeLevel,
				TotalMembers: totalMembers,
				Mentor: basicInfo.SubmittedBy || null,
			} : null,
			totalEconomicSupport,
			totalSocialSupport,
		});
	} catch (error: any) {
		console.error("Error checking CRC approval status:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error checking CRC approval status",
			},
			{ status: 500 }
		);
	}
}
