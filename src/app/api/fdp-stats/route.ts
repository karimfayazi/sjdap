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

		// Fetch Family Development Plan statistics
		// Count unique families from all FDP tables
		const pool = await getPeDb();
		const sqlRequest = pool.request();
		(sqlRequest as any).timeout = 120000;

		const query = `
			WITH AllFDPRecords AS (
				-- Health Support
				SELECT [FormNumber] as FormNumber, [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_HealthSupport]
				WHERE [IsActive] = 1
				
				UNION ALL
				
				-- Food Support
				SELECT [FamilyID] as FormNumber, [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_FoodSupport]
				WHERE [IsActive] = 1
				
				UNION ALL
				
				-- Education Support
				SELECT [FamilyID] as FormNumber, [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_SocialEducation]
				WHERE [IsActive] = 1
				
				UNION ALL
				
				-- Housing Support
				SELECT [FamilyID] as FormNumber, [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_HabitatSupport]
				WHERE [IsActive] = 1
				
				UNION ALL
				
				-- Economic Support
				SELECT [FormNumber] as FormNumber, [ApprovalStatus]
				FROM [SJDA_Users].[dbo].[PE_FDP_Economic]
				WHERE [IsActive] = 1
			),
			FamilyStatus AS (
				SELECT DISTINCT 
					FormNumber,
					CASE 
						WHEN EXISTS (
							SELECT 1 FROM AllFDPRecords r2 
							WHERE r2.FormNumber = r1.FormNumber 
							AND (LOWER(LTRIM(RTRIM(r2.[ApprovalStatus]))) LIKE '%approve%' 
								OR LOWER(LTRIM(RTRIM(r2.[ApprovalStatus]))) = 'approved' 
								OR LOWER(LTRIM(RTRIM(r2.[ApprovalStatus]))) = 'complete')
						) THEN 'Approved'
						WHEN EXISTS (
							SELECT 1 FROM AllFDPRecords r2 
							WHERE r2.FormNumber = r1.FormNumber 
							AND (LOWER(LTRIM(RTRIM(r2.[ApprovalStatus]))) LIKE '%reject%' 
								OR LOWER(LTRIM(RTRIM(r2.[ApprovalStatus]))) = 'rejected')
						) THEN 'Rejected'
						ELSE 'Pending'
					END as ApprovalStatus
				FROM AllFDPRecords r1
			)
			SELECT 
				COUNT(*) as TotalFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Pending' THEN 1 ELSE 0 END) as PendingFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Approved' THEN 1 ELSE 0 END) as ApprovedFamilies,
				SUM(CASE WHEN ApprovalStatus = 'Rejected' THEN 1 ELSE 0 END) as RejectedFamilies
			FROM FamilyStatus
		`;

		const result = await sqlRequest.query(query);
		const stats = result.recordset[0] || {
			TotalFamilies: 0,
			PendingFamilies: 0,
			ApprovedFamilies: 0,
			RejectedFamilies: 0,
		};

		return NextResponse.json({
			success: true,
			stats: {
				total: parseInt(stats.TotalFamilies) || 0,
				approved: parseInt(stats.ApprovedFamilies) || 0,
				pending: parseInt(stats.PendingFamilies) || 0,
				rejected: parseInt(stats.RejectedFamilies) || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching FDP statistics:", error);

		const errorMessage = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{
				success: false,
				message: "Error fetching FDP statistics: " + errorMessage,
				stats: {
					total: 0,
					approved: 0,
					pending: 0,
					rejected: 0,
				},
			},
			{ status: 500 }
		);
	}
}
