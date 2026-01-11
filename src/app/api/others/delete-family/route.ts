import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";

export const maxDuration = 120;

export async function DELETE(request: NextRequest) {
	try {
		// Check authentication
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

		const searchParams = request.nextUrl.searchParams;
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		
		// First, verify the family exists
		const verifyRequest = pool.request();
		verifyRequest.input("formNumber", formNumber);
		const verifyQuery = `
			SELECT [FormNumber], [Full_Name], [CNICNumber]
			FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`;
		const verifyResult = await verifyRequest.query(verifyQuery);
		
		if (!verifyResult.recordset || verifyResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Family not found with the provided Form Number" },
				{ status: 404 }
			);
		}

		// Get all MemberNos for this FormNumber
		const getMemberNosRequest = pool.request();
		getMemberNosRequest.input("formNumber", formNumber);
		const memberNosQuery = `
			SELECT [MemberNo] 
			FROM [SJDA_Users].[dbo].[PE_FamilyMember] 
			WHERE [FormNo] = @formNumber
		`;
		const memberNosResult = await getMemberNosRequest.query(memberNosQuery);
		const memberNos = memberNosResult.recordset.map((r: any) => r.MemberNo);

		const dbRequest = pool.request();
		(dbRequest as any).timeout = 120000;
		dbRequest.input("formNumber", formNumber);

		// Delete PE_Livelihood records by MemberNo (if any exist)
		if (memberNos.length > 0) {
			for (const memberNo of memberNos) {
				try {
					const deleteLivelihoodByMember = pool.request();
					deleteLivelihoodByMember.input("memberNo", memberNo);
					await deleteLivelihoodByMember.query(`
						DELETE FROM [SJDA_Users].[dbo].[PE_Livelihood]
						WHERE [MemberNo] = @memberNo
					`);
				} catch (err) {
					console.log("Error deleting livelihood record:", err);
				}
			}
		}

		// Delete PE_Education records by MemberNo (if any exist)
		if (memberNos.length > 0) {
			for (const memberNo of memberNos) {
				try {
					const deleteEducationByMember = pool.request();
					deleteEducationByMember.input("memberNo", memberNo);
					await deleteEducationByMember.query(`
						DELETE FROM [SJDA_Users].[dbo].[PE_Education]
						WHERE [MemberNo] = @memberNo
					`);
				} catch (err) {
					console.log("Error deleting education record:", err);
				}
			}
		}

		// Delete PE_FamilyMember records by FormNumber
		try {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
				WHERE [FormNo] = @formNumber
			`);
		} catch (err) {
			console.log("Error deleting family members:", err);
		}

		// Delete PE_Application_BasicInfo record by FormNumber
		const deleteBasicInfoResult = await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Application_BasicInfo]
			WHERE [FormNumber] = @formNumber
		`);

		if (deleteBasicInfoResult.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "Family record not found" },
				{ status: 404 }
			);
		}

		// Delete related records from other tables that might reference FormNumber
		// Delete from PE_FamilyDevelopmentPlan_Feasibility
		try {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Feasibility]
				WHERE [FamilyID] = @formNumber
			`);
		} catch (err) {
			console.log("Error deleting feasibility records:", err);
		}

		// Delete from PE_FamilyDevelopmentPlan_Economic (if exists)
		try {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Economic]
				WHERE [FamilyID] = @formNumber
			`);
		} catch (err) {
			console.log("Error deleting economic records:", err);
		}

		// Delete from PE_FamilyDevelopmentPlan_Social (if exists)
		try {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_FamilyDevelopmentPlan_Social]
				WHERE [FamilyID] = @formNumber
			`);
		} catch (err) {
			console.log("Error deleting social records:", err);
		}

		// Delete from PE_PlannedSelfSufficiency (if exists)
		try {
			await dbRequest.query(`
				DELETE FROM [SJDA_Users].[dbo].[PE_PlannedSelfSufficiency]
				WHERE [FormNumber] = @formNumber
			`);
		} catch (err) {
			console.log("Error deleting planned self-sufficiency records:", err);
		}

		return NextResponse.json({
			success: true,
			message: "Family and all related records deleted successfully",
		});
	} catch (error: any) {
		console.error("Error deleting family:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete family",
			},
			{ status: 500 }
		);
	}
}


