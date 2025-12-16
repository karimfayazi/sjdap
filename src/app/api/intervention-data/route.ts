import { NextRequest, NextResponse } from "next/server";
import { getPlanInterventionDb, getBaselineDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

// GET - Fetch intervention data by intervention ID
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const listMode = searchParams.get("list") === "true";

        const pool = await getPlanInterventionDb();

        if (listMode) {
            const familyId = searchParams.get("familyId");
            const mentor = searchParams.get("mentor");
            const headName = searchParams.get("headName");
            const interventionId = searchParams.get("interventionId");
            const status = searchParams.get("status");
            const loanAmount = searchParams.get("loanAmount");
            const financeOfficer = searchParams.get("financeOfficer");

            const query = `
                SELECT TOP (1000)
                    v.[FAMILY_ID],
                    v.[PROGRAM],
                    v.[REGIONAL COUNCIL],
                    v.[LOCAL COUNCIL],
                    v.[JAMAT KHANA],
                    v.[HEAD NAME],
                    v.[AREA TYPE],
                    v.[MENTOR],
                    v.[INTERVENTION_ID],
                    v.[INTERVENTION_STATUS],
                    v.[INTERVENTION_FRAMEWORK_DIMENSIONS],
                    v.[MAIN_INTERVENTION],
                    v.[INTERVENTION_TYPE],
                    v.[TOTAL_AMOUNT],
                    v.[LOAN_AMOUNT],
                    v.[MEMBER_ID],
                    v.[ACTIVE],
                    v.[CNIC],
                    v.[MAIN_TRADE],
                    v.[SUB_TRADES],
                    v.[Finance_Officer],
                    m.[FULL NAME] as MEMBER_NAME
                FROM [SJDA_Plan_Intervetnion].[dbo].[View_Economic_Loan_Process] v
                LEFT JOIN [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_MEMBERS] m
                    ON v.[MEMBER_ID] COLLATE SQL_Latin1_General_CP1_CI_AS
                        = m.[MEMBER_ID] COLLATE SQL_Latin1_General_CP1_CI_AS
                WHERE 1 = 1
                    ${familyId ? "AND v.[FAMILY_ID] LIKE @familyId" : ""}
                    ${mentor ? "AND v.[MENTOR] LIKE @mentor" : ""}
                    ${headName ? "AND v.[HEAD NAME] LIKE @headName" : ""}
                    ${interventionId ? "AND v.[INTERVENTION_ID] LIKE @interventionId" : ""}
                    ${status ? "AND v.[INTERVENTION_STATUS] LIKE @status" : ""}
                    ${loanAmount ? "AND v.[LOAN_AMOUNT] = @loanAmount" : ""}
                    ${
                        financeOfficer
                            ? `AND v.[MENTOR] COLLATE SQL_Latin1_General_CP1_CI_AS IN (
                                    SELECT u.[USER_FULL_NAME] COLLATE SQL_Latin1_General_CP1_CI_AS
                                    FROM [SJDA_Users].[dbo].[Table_User] u
                                    WHERE u.[Finance_Officer] = @financeOfficer
                                )`
                            : ""
                    }
                ORDER BY v.[INTERVENTION_ID] DESC
            `;

            const listRequest = pool.request();
            if (familyId) listRequest.input("familyId", `%${familyId}%`);
            if (mentor) listRequest.input("mentor", `%${mentor}%`);
            if (headName) listRequest.input("headName", `%${headName}%`);
            if (interventionId) listRequest.input("interventionId", `%${interventionId}%`);
            if (status) listRequest.input("status", `%${status}%`);
            if (loanAmount) listRequest.input("loanAmount", Number(loanAmount));
            if (financeOfficer) listRequest.input("financeOfficer", financeOfficer);
            (listRequest as any).timeout = 120000;

            const listResult = await listRequest.query(query);

            return NextResponse.json({
                success: true,
                interventions: listResult.recordset || []
            });
        }

        const interventionId = searchParams.get("interventionId");
        if (!interventionId) {
            return NextResponse.json(
                { success: false, message: "Intervention ID is required" },
                { status: 400 }
            );
        }

        const query = `
            SELECT TOP (1)
                [INTERVENTION_ID],
                [FAMILY_ID],
                [PROGRAM],
                [REGIONAL COUNCIL] as REGIONAL_COUNCIL,
                [HEAD NAME] as HEAD_NAME,
                [MENTOR],
                [INTERVENTION_STATUS],
                [INTERVENTION_FRAMEWORK_DIMENSIONS],
                [MAIN_INTERVENTION],
                [LOAN_AMOUNT],
                [MEMBER_ID],
                [CNIC],
                [MAIN_TRADE],
                [SUB_TRADES]
            FROM [SJDA_Plan_Intervetnion].[dbo].[View_Economic_Loan_Process]
            WHERE [INTERVENTION_ID] = @interventionId
        `;

        const request_query = pool.request();
        request_query.input("interventionId", interventionId);
        (request_query as any).timeout = 120000;

        const result = await request_query.query(query);

        if (result.recordset && result.recordset.length > 0) {
            const interventionData = result.recordset[0];
            let memberName = null;

            if (interventionData.MEMBER_ID) {
                try {
                    const baselinePool = await getBaselineDb();
                    const memberQuery = `
                        SELECT TOP (1) [FULL NAME] as FULL_NAME
                        FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_MEMBERS]
                        WHERE [MEMBER_ID] = @memberId
                    `;

                    const memberRequest = baselinePool.request();
                    memberRequest.input("memberId", interventionData.MEMBER_ID);
                    (memberRequest as any).timeout = 120000;

                    const memberResult = await memberRequest.query(memberQuery);
                    if (memberResult.recordset && memberResult.recordset.length > 0) {
                        memberName = memberResult.recordset[0].FULL_NAME;
                    }
                } catch (memberError) {
                    console.warn("Error fetching member name:", memberError);
                }
            }

            return NextResponse.json({
                success: true,
                intervention: {
                    ...interventionData,
                    MEMBER_NAME: memberName
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                message: "Intervention data not found"
            });
        }
    } catch (error) {
        console.error("Error fetching intervention data:", error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                success: false,
                message: "Error fetching intervention data: " + errorMessage
            },
            { status: 500 }
        );
    }
}
