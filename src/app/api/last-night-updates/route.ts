import { NextRequest, NextResponse } from "next/server";
import { getBaselineDb, getPeDb, getPlanInterventionDb, getTrackingSystemDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		// Get logged-in user information
		const authCookie = request.cookies.get("auth");
		
		if (!authCookie || !authCookie.value) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Calculate last night's date range (yesterday 6 PM to today 6 AM)
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		
		// Last night start: yesterday 6 PM
		const lastNightStart = new Date(yesterday);
		lastNightStart.setHours(18, 0, 0, 0);
		
		// Last night end: today 6 AM
		const lastNightEnd = new Date(today);
		lastNightEnd.setHours(6, 0, 0, 0);

		const lastNightStartStr = lastNightStart.toISOString().slice(0, 19).replace('T', ' ');
		const lastNightEndStr = lastNightEnd.toISOString().slice(0, 19).replace('T', ' ');

		const allUpdates: any[] = [];

		// 1. Actual Interventions
		try {
			const baselinePool = await getBaselineDb();
			const interventionQuery = `
				SELECT 
					'Actual Intervention' as Section,
					[FAMILY_ID] as FamilyID,
					[INTERVENTION_ID] as RecordID,
					[HEAD NAME] as HeadName,
					[MENTOR] as Mentor,
					[INTERVENTION_STATUS] as Status,
					COALESCE([UPDATED_DATE], [CREATED_DATE], [POST_DATE], [SYSTEMDATE]) as UpdateDate,
					COALESCE([UPDATED_DATE], [CREATED_DATE], [POST_DATE], [SYSTEMDATE]) as DateField
				FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_Intervnetion_All]
				WHERE (
					([UPDATED_DATE] >= @startDate AND [UPDATED_DATE] < @endDate) OR
					([CREATED_DATE] >= @startDate AND [CREATED_DATE] < @endDate) OR
					([POST_DATE] >= @startDate AND [POST_DATE] < @endDate) OR
					([SYSTEMDATE] >= @startDate AND [SYSTEMDATE] < @endDate)
				)
			`;
			const interventionReq = baselinePool.request();
			interventionReq.input("startDate", sql.DateTime, lastNightStart);
			interventionReq.input("endDate", sql.DateTime, lastNightEnd);
			(interventionReq as any).timeout = 120000;
			const interventionResult = await interventionReq.query(interventionQuery);
			allUpdates.push(...(interventionResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Actual Interventions:", error);
		}

		// 2. Financial Assets (Baseline QOL)
		try {
			const pePool = await getPeDb();
			const financialAssetsQuery = `
				SELECT 
					'Financial Assets' as Section,
					[Family_ID] as FamilyID,
					CAST([Family_ID] AS NVARCHAR(50)) as RecordID,
					NULL as HeadName,
					NULL as Mentor,
					NULL as Status,
					[Updated_Date] as UpdateDate,
					[Updated_Date] as DateField
				FROM [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
				WHERE [Updated_Date] >= @startDate AND [Updated_Date] < @endDate
			`;
			const faReq = pePool.request();
			faReq.input("startDate", sql.DateTime, lastNightStart);
			faReq.input("endDate", sql.DateTime, lastNightEnd);
			(faReq as any).timeout = 120000;
			const faResult = await faReq.query(financialAssetsQuery);
			allUpdates.push(...(faResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Financial Assets:", error);
		}

		// 3. Family Status Log
		try {
			const pePool = await getPeDb();
			const familyStatusQuery = `
				SELECT 
					'Family Status Log' as Section,
					[FormNumber] as FamilyID,
					[FormNumber] as RecordID,
					NULL as HeadName,
					[UserId] as Mentor,
					[ApplicationStatus] as Status,
					[SystemDate] as UpdateDate,
					[SystemDate] as DateField
				FROM [SJDA_Users].[dbo].[PE_Family_Status_Log]
				WHERE [SystemDate] >= @startDate AND [SystemDate] < @endDate
			`;
			const fsReq = pePool.request();
			fsReq.input("startDate", sql.DateTime, lastNightStart);
			fsReq.input("endDate", sql.DateTime, lastNightEnd);
			(fsReq as any).timeout = 120000;
			const fsResult = await fsReq.query(familyStatusQuery);
			allUpdates.push(...(fsResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Family Status Log:", error);
		}

		// 4. Bank Information
		try {
			const trackingPool = await getTrackingSystemDb();
			const bankQuery = `
				SELECT 
					'Bank Information' as Section,
					[FAMILY_ID] as FamilyID,
					CAST([FAMILY_ID] AS NVARCHAR(50)) as RecordID,
					NULL as HeadName,
					[MENTOR] as Mentor,
					NULL as Status,
					[UPDATED_DATE] as UpdateDate,
					[UPDATED_DATE] as DateField
				FROM [SJDA_Tracking_System].[dbo].[Bank_Information]
				WHERE [UPDATED_DATE] >= @startDate AND [UPDATED_DATE] < @endDate
			`;
			const bankReq = trackingPool.request();
			bankReq.input("startDate", sql.DateTime, lastNightStart);
			bankReq.input("endDate", sql.DateTime, lastNightEnd);
			(bankReq as any).timeout = 120000;
			const bankResult = await bankReq.query(bankQuery);
			allUpdates.push(...(bankResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Bank Information:", error);
		}

		// 5. Loan Process
		try {
			const trackingPool = await getTrackingSystemDb();
			const loanQuery = `
				SELECT 
					'Loan Process' as Section,
					[Family_ID] as FamilyID,
					[Intervention_ID] as RecordID,
					[FULL NAME] as HeadName,
					NULL as Mentor,
					[Loan_Status] as Status,
					[Post_Date] as UpdateDate,
					[Post_Date] as DateField
				FROM [SJDA_Tracking_System].[dbo].[View_Loan_for_Bank]
				WHERE [Post_Date] >= @startDate AND [Post_Date] < @endDate
			`;
			const loanReq = trackingPool.request();
			loanReq.input("startDate", sql.DateTime, lastNightStart);
			loanReq.input("endDate", sql.DateTime, lastNightEnd);
			(loanReq as any).timeout = 120000;
			const loanResult = await loanReq.query(loanQuery);
			allUpdates.push(...(loanResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Loan Process:", error);
		}

		// 6. ROP Update
		try {
			const planPool = await getPlanInterventionDb();
			const ropQuery = `
				SELECT 
					'ROP Update' as Section,
					NULL as FamilyID,
					[INTERVENTION_ID] + '-' + [MONTH_ROP] as RecordID,
					NULL as HeadName,
					[MENTOR] as Mentor,
					NULL as Status,
					[SYSTEMDATE] as UpdateDate,
					[SYSTEMDATE] as DateField
				FROM [SJDA_Plan_Intervetnion].[dbo].[TABLE_ROP]
				WHERE [SYSTEMDATE] >= @startDate AND [SYSTEMDATE] < @endDate
			`;
			const ropReq = planPool.request();
			ropReq.input("startDate", sql.DateTime, lastNightStart);
			ropReq.input("endDate", sql.DateTime, lastNightEnd);
			(ropReq as any).timeout = 120000;
			const ropResult = await ropReq.query(ropQuery);
			allUpdates.push(...(ropResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching ROP Update:", error);
		}

		// 7. Baseline Applications (PE_Application_BasicInfo)
		try {
			const pePool = await getPeDb();
			const baselineQuery = `
				SELECT 
					'Baseline Application' as Section,
					[FormNumber] as FamilyID,
					[FormNumber] as RecordID,
					[Full_Name] as HeadName,
					NULL as Mentor,
					NULL as Status,
					[UpdatedAt] as UpdateDate,
					[UpdatedAt] as DateField
				FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
				WHERE [UpdatedAt] >= @startDate AND [UpdatedAt] < @endDate
			`;
			const baselineReq = pePool.request();
			baselineReq.input("startDate", sql.DateTime, lastNightStart);
			baselineReq.input("endDate", sql.DateTime, lastNightEnd);
			(baselineReq as any).timeout = 120000;
			const baselineResult = await baselineReq.query(baselineQuery);
			allUpdates.push(...(baselineResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Baseline Applications:", error);
		}

		// 8. Family Status (PE_Family_Status)
		try {
			const pePool = await getPeDb();
			const familyStatusQuery = `
				SELECT 
					'Family Status' as Section,
					[Form_Number] as FamilyID,
					[Form_Number] as RecordID,
					NULL as HeadName,
					[User_Name] as Mentor,
					[Family_Status_Level] as Status,
					[System_Date] as UpdateDate,
					[System_Date] as DateField
				FROM [SJDA_Users].[dbo].[PE_Family_Status]
				WHERE [System_Date] >= @startDate AND [System_Date] < @endDate
			`;
			const fsReq = pePool.request();
			fsReq.input("startDate", sql.DateTime, lastNightStart);
			fsReq.input("endDate", sql.DateTime, lastNightEnd);
			(fsReq as any).timeout = 120000;
			const fsResult = await fsReq.query(familyStatusQuery);
			allUpdates.push(...(fsResult.recordset || []));
		} catch (error: any) {
			console.error("Error fetching Family Status:", error);
		}

		// Sort by update date (most recent first)
		allUpdates.sort((a, b) => {
			const dateA = a.UpdateDate ? new Date(a.UpdateDate).getTime() : 0;
			const dateB = b.UpdateDate ? new Date(b.UpdateDate).getTime() : 0;
			return dateB - dateA;
		});

		// Group by section
		const updatesBySection: Record<string, any[]> = {};
		allUpdates.forEach(update => {
			const section = update.Section || 'Unknown';
			if (!updatesBySection[section]) {
				updatesBySection[section] = [];
			}
			updatesBySection[section].push(update);
		});

		return NextResponse.json({
			success: true,
			updates: allUpdates,
			updatesBySection: updatesBySection,
			totalCount: allUpdates.length,
			lastNightStart: lastNightStart.toISOString(),
			lastNightEnd: lastNightEnd.toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching last night updates:", error);
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isConnectionError = 
			errorMessage.includes("ENOTFOUND") ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("Failed to connect") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ConnectionError");
		
		if (isConnectionError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Please Re-Connect VPN",
					updates: [],
					updatesBySection: {},
					totalCount: 0
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{ 
				success: false, 
				message: "Error fetching last night updates: " + errorMessage,
				updates: [],
				updatesBySection: {},
				totalCount: 0
			},
			{ status: 500 }
		);
	}
}
