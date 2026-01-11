import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";

// DELETE - Delete a family member by MemberNo
export async function DELETE(request: NextRequest) {
	try {
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
		const memberNo = searchParams.get("memberNo");

		if (!memberNo) {
			return NextResponse.json(
				{ success: false, message: "MemberNo is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const dbRequest = pool.request();
		dbRequest.input("memberNo", memberNo);

		// Delete related education records
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Education]
			WHERE [MemberNo] = @memberNo
		`);

		// Delete related livelihood records
		await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_Livelihood]
			WHERE [MemberNo] = @memberNo
		`);

		// Delete the family member record
		const result = await dbRequest.query(`
			DELETE FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [MemberNo] = @memberNo
		`);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "Family member not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Family member and related records deleted successfully",
		});
	} catch (error: any) {
		console.error("Error deleting family member:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete family member",
			},
			{ status: 500 }
		);
	}
}


















