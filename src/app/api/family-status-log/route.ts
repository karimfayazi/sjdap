import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		
		// Get filter parameters
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = (page - 1) * limit;
		const formNumberFilter = (searchParams.get("formNumber") || "").trim();
		const applicationStatusFilter = (searchParams.get("applicationStatus") || "").trim();
		const fdpDevelopmentStatusFilter = (searchParams.get("fdpDevelopmentStatus") || "").trim();
		const crcApprovalStatusFilter = (searchParams.get("crcApprovalStatus") || "").trim();
		const interventionStatusFilter = (searchParams.get("interventionStatus") || "").trim();

		const pool = await getPeDb();
		
		// Build WHERE clause for filters using table aliases
		const whereConditions: string[] = [];
		
		if (formNumberFilter) {
			whereConditions.push(`fsl.[FormNumber] LIKE '%${formNumberFilter.replace(/'/g, "''")}%'`);
		}
		if (applicationStatusFilter) {
			whereConditions.push(`fsl.[ApplicationStatus] LIKE '%${applicationStatusFilter.replace(/'/g, "''")}%'`);
		}
		if (fdpDevelopmentStatusFilter) {
			whereConditions.push(`fsl.[FDPDevelopmentStatus] LIKE '%${fdpDevelopmentStatusFilter.replace(/'/g, "''")}%'`);
		}
		if (crcApprovalStatusFilter) {
			whereConditions.push(`fsl.[CRCApprovalStatus] LIKE '%${crcApprovalStatusFilter.replace(/'/g, "''")}%'`);
		}
		if (interventionStatusFilter) {
			whereConditions.push(`fsl.[InterventionStatus] LIKE '%${interventionStatusFilter.replace(/'/g, "''")}%'`);
		}
		
		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

		// Query to get total count
		const countQuery = `
			SELECT COUNT(*) as Total
			FROM [SJDA_Users].[dbo].[PE_Family_Status_Log] fsl
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] app ON fsl.[FormNumber] = app.[FormNumber]
			${whereClause}
		`;

		const countResult = await pool.request().query(countQuery);
		const total = countResult.recordset[0]?.Total || 0;

		// Query to get data with pagination - JOIN with PE_Application_BasicInfo
		const query = `
			SELECT 
				fsl.[FormNumber],
				fsl.[ApplicationStatus],
				fsl.[ApplicationDate],
				fsl.[FDPDevelopmentStatus],
				fsl.[FDPDevelopmentDate],
				fsl.[CRCApprovalStatus],
				fsl.[CRCApprovalDate],
				fsl.[InterventionStatus],
				fsl.[InterventionStartDate],
				fsl.[SystemDate],
				fsl.[UserId],
				fsl.[Remarks],
				app.[ApplicationDate] as BasicInfo_ApplicationDate,
				app.[Full_Name],
				app.[RegionalCommunity],
				app.[LocalCommunity]
			FROM [SJDA_Users].[dbo].[PE_Family_Status_Log] fsl
			LEFT JOIN [SJDA_Users].[dbo].[PE_Application_BasicInfo] app ON fsl.[FormNumber] = app.[FormNumber]
			${whereClause}
			ORDER BY fsl.[FormNumber] DESC
			OFFSET ${offset} ROWS
			FETCH NEXT ${limit} ROWS ONLY
		`;

		const result = await pool.request().query(query);

		return NextResponse.json({
			success: true,
			data: result.recordset || [],
			total: total,
			page: page,
			limit: limit
		});
	} catch (error: any) {
		console.error("Error fetching family status log:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error fetching family status log",
			},
			{ status: 500 }
		);
	}
}

