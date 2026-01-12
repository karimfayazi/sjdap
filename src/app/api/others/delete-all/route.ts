import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";

const TABLES_TO_DELETE = [
	"PE_Application_BasicInfo",
	"PE_Family_Status",
	"PE_FamilyDevelopmentPlan_Feasibility",
	"PE_FamilyMember",
	"PE_FDP_EconomicDevelopment",
	"PE_FDP_FoodSupport",
	"PE_FDP_HabitatSupport",
	"PE_FDP_HealthSupport",
	"PE_FDP_SocialEducation",
	"PE_Interventions",
];

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

		// Check if user is Super User
		const pool = await getPeDb();
		const permResult = await pool
			.request()
			.input("user_id", userId)
			.query(`
				SELECT TOP(1) [USER_TYPE], [Supper_User] 
				FROM [SJDA_Users].[dbo].[Table_User] 
				WHERE [USER_ID] = @user_id
			`);

		const permUser = permResult.recordset?.[0];
		const isAdmin = permUser?.USER_TYPE?.toLowerCase() === "admin";
		const isSuperUser =
			permUser?.Supper_User === 1 ||
			permUser?.Supper_User === "1" ||
			permUser?.Supper_User === true ||
			permUser?.Supper_User === "true";

		if (!isAdmin && !isSuperUser) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Access denied. Only Admin or Super User can delete all data." 
				},
				{ status: 403 }
			);
		}

		const deletedTables: string[] = [];
		const progress: { [key: string]: { status: "pending" | "deleting" | "success" | "error"; message?: string } } = {};
		const errors: string[] = [];

		// Delete data from each table
		for (const tableName of TABLES_TO_DELETE) {
			try {
				progress[tableName] = { status: "deleting" };

				const deleteRequest = pool.request();
				(deleteRequest as any).timeout = 120000; // 2 minutes timeout

				const deleteQuery = `DELETE FROM [SJDA_Users].[dbo].[${tableName}]`;
				
				const result = await deleteRequest.query(deleteQuery);
				const rowsAffected = result.rowsAffected[0] || 0;

				deletedTables.push(tableName);
				progress[tableName] = {
					status: "success",
					message: `Deleted ${rowsAffected.toLocaleString()} record(s)`,
				};
			} catch (error: any) {
				const errorMessage = error.message || "Unknown error";
				errors.push(`${tableName}: ${errorMessage}`);
				progress[tableName] = {
					status: "error",
					message: errorMessage,
				};
				console.error(`Error deleting from ${tableName}:`, error);
			}
		}

		if (errors.length > 0) {
			return NextResponse.json({
				success: false,
				message: `Some tables failed to delete. ${errors.length} error(s) occurred.`,
				deletedTables,
				progress,
				errors,
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully deleted all data from ${deletedTables.length} table(s)`,
			deletedTables,
			progress,
		});
	} catch (error: any) {
		console.error("Error in delete-all:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete all data",
			},
			{ status: 500 }
		);
	}
}
