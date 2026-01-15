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
		sqlRequest.input("FormNumber", sql.VarChar, formNumber);

		// Query View_FDP_Approval to get FDP Status
		// Query both with alias and without to handle different SQL Server behaviors
		const query = `
			SELECT 
				[FormNumber],
				[FDP Status],
				[FDP Status] AS FDPStatus
			FROM [SJDA_Users].[dbo].[View_FDP_Approval]
			WHERE [FormNumber] = @FormNumber
		`;

		const result = await sqlRequest.query(query);
		const records = result.recordset || [];

		console.log("Query executed for FormNumber:", formNumber);
		console.log("Number of records returned:", records.length);

		// Get FDP Status from View_FDP_Approval
		let fdpStatus: string | null = null;
		
		if (records.length > 0) {
			const record = records[0];
			
			// Debug: log the record to see what's available
			console.log("FormNumber:", formNumber);
			console.log("Record keys:", Object.keys(record));
			console.log("Full record:", JSON.stringify(record, null, 2));
			
			// Try multiple ways to access the column
			// 1. Try with space in bracket notation first (most reliable for SQL Server column names with spaces)
			if ((record as any)["FDP Status"] !== undefined && (record as any)["FDP Status"] !== null) {
				fdpStatus = String((record as any)["FDP Status"]).trim();
			}
			// 2. Try alias
			else if (record.FDPStatus !== undefined && record.FDPStatus !== null) {
				fdpStatus = String(record.FDPStatus).trim();
			}
			// 3. Try iterating through all keys to find FDP Status
			else {
				const keys = Object.keys(record);
				for (const key of keys) {
					// Check if key contains "FDP" and "Status" (case insensitive)
					const keyLower = key.toLowerCase();
					if ((keyLower.includes("fdp") && keyLower.includes("status")) || 
					    key === "FDP Status" || key === "FDPStatus") {
						const value = (record as any)[key];
						if (value !== undefined && value !== null) {
							fdpStatus = String(value).trim();
							console.log("Found FDP Status via key:", key, "Value:", fdpStatus);
							break;
						}
					}
				}
			}
			
			// If value is empty string after trim, set to null
			if (fdpStatus === "") {
				fdpStatus = null;
			}
		}
		
		console.log("Final FDP Status for", formNumber, ":", fdpStatus, "(records found:", records.length, ")");

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
			FROM [SJDA_Users].[dbo].[PE_FDP_Economic]
			WHERE [FormNumber] = @FormNumber AND [IsActive] = 1
			
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
