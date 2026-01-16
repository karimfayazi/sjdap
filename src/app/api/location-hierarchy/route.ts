import { NextRequest, NextResponse } from "next/server";
import { getPeDb, getDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
		const pool = await getPeDb();
		const query = `
			SELECT [LocationId], [RC], [LC], [JK]
			FROM [SJDA_Users].[dbo].[PE_LU_LocationHierarchy]
			ORDER BY [RC], [LC], [JK]
		`;

		const result = await pool.request().query(query);
		const locations = result.recordset || [];

		return NextResponse.json({
			success: true,
			data: locations
		});
	} catch (error: any) {
		console.error("Error fetching location hierarchy:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch location hierarchy"
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
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

		// ALL USERS CAN ADD - NO PERMISSION CHECKS

		const body = await request.json();
		const { RC, LC, JK } = body;

		if (!RC || !LC || !JK) {
			return NextResponse.json(
				{
					success: false,
					message: "RC, LC, and JK are required"
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_LU_LocationHierarchy] ([RC], [LC], [JK])
			VALUES (@RC, @LC, @JK);
			SELECT SCOPE_IDENTITY() AS LocationId;
		`;

		const dbRequest = pool.request();
		dbRequest.input("RC", sql.NVarChar, RC);
		dbRequest.input("LC", sql.NVarChar, LC);
		dbRequest.input("JK", sql.NVarChar, JK);

		const result = await dbRequest.query(insertQuery);
		const locationId = result.recordset[0]?.LocationId;

		return NextResponse.json({
			success: true,
			message: "Location hierarchy added successfully",
			data: { LocationId: locationId, RC, LC, JK }
		});
	} catch (error: any) {
		console.error("Error adding location hierarchy:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to add location hierarchy"
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
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

		// Check if user has Admin permission (UserType='Admin')
		const userPool = await getDb();
		const userRequest = userPool.request();
		(userRequest as any).timeout = 120000;
		userRequest.input("user_id", userId);
		userRequest.input("email_address", userId);
		
		const userResult = await userRequest.query(
			"SELECT TOP(1) [UserType], [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
		);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Check if user is Admin (UserType='Admin' or username='admin')
		const userIdentifier = user.UserId || user.email_address;
		const isAdminByIdentifier = userIdentifier && userIdentifier.toLowerCase() === 'admin';
		const userType = user.UserType;
		const isAdminByType = userType && typeof userType === 'string' && userType.trim().toLowerCase() === 'admin';
		const isSuperUser = isAdminByIdentifier || isAdminByType;

		if (!isSuperUser) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin users can update location hierarchy." },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { LocationId, RC, LC, JK } = body;

		if (!LocationId || !RC || !LC || !JK) {
			return NextResponse.json(
				{
					success: false,
					message: "LocationId, RC, LC, and JK are required"
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_LU_LocationHierarchy]
			SET [RC] = @RC, [LC] = @LC, [JK] = @JK
			WHERE [LocationId] = @LocationId
		`;

		const dbRequest = pool.request();
		dbRequest.input("LocationId", sql.Int, LocationId);
		dbRequest.input("RC", sql.NVarChar, RC);
		dbRequest.input("LC", sql.NVarChar, LC);
		dbRequest.input("JK", sql.NVarChar, JK);

		await dbRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Location hierarchy updated successfully"
		});
	} catch (error: any) {
		console.error("Error updating location hierarchy:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update location hierarchy"
			},
			{ status: 500 }
		);
	}
}

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

		// Check if user has Admin permission (UserType='Admin')
		const userPool = await getDb();
		const userRequest = userPool.request();
		(userRequest as any).timeout = 120000;
		userRequest.input("user_id", userId);
		userRequest.input("email_address", userId);
		
		const userResult = await userRequest.query(
			"SELECT TOP(1) [UserType], [UserId], [email_address] FROM [SJDA_Users].[dbo].[PE_User] WHERE [UserId] = @user_id OR [email_address] = @email_address"
		);

		const user = userResult.recordset?.[0];
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		// Check if user is Admin (UserType='Admin' or username='admin')
		const userIdentifier = user.UserId || user.email_address;
		const isAdminByIdentifier = userIdentifier && userIdentifier.toLowerCase() === 'admin';
		const userType = user.UserType;
		const isAdminByType = userType && typeof userType === 'string' && userType.trim().toLowerCase() === 'admin';
		const isSuperUser = isAdminByIdentifier || isAdminByType;

		if (!isSuperUser) {
			return NextResponse.json(
				{ success: false, message: "Access denied. Only Admin users can delete location hierarchy." },
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const locationId = searchParams.get("locationId");

		if (!locationId) {
			return NextResponse.json(
				{
					success: false,
					message: "LocationId is required"
				},
				{ status: 400 }
			);
		}

		const pool = await getPeDb();
		const deleteQuery = `
			DELETE FROM [SJDA_Users].[dbo].[PE_LU_LocationHierarchy]
			WHERE [LocationId] = @LocationId
		`;

		const dbRequest = pool.request();
		dbRequest.input("LocationId", sql.Int, parseInt(locationId));

		await dbRequest.query(deleteQuery);

		return NextResponse.json({
			success: true,
			message: "Location hierarchy deleted successfully"
		});
	} catch (error: any) {
		console.error("Error deleting location hierarchy:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete location hierarchy"
			},
			{ status: 500 }
		);
	}
}


