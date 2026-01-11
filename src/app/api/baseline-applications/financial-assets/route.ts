import { NextRequest, NextResponse } from "next/server";
import { getPeDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const familyId = searchParams.get("familyId");

		if (!familyId) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();

		const request_query = pool.request();
		request_query.input("Family_ID", familyId);

		const query = `
			SELECT TOP 1
				[Family_ID],
				[Land_Barren_Kanal],
				[Land_Barren_Value_Rs],
				[Land_Agriculture_Kanal],
				[Land_Agriculture_Value_Rs],
				[Livestock_Number],
				[Livestock_Value_Rs],
				[Fruit_Trees_Number],
				[Fruit_Trees_Value_Rs],
				[Vehicles_4W_Number],
				[Vehicles_4W_Value_Rs],
				[Motorcycle_2W_Number],
				[Motorcycle_2W_Value_Rs],
				[Entry_Date],
				[Updated_Date]
			FROM [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
			WHERE [Family_ID] = @Family_ID
		`;

		const result = await request_query.query(query);

		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: true,
				data: null,
				message: "No financial assets found for this family",
			});
		}

		return NextResponse.json({
			success: true,
			data: result.recordset[0],
		});
	} catch (error: any) {
		console.error("Error fetching financial assets:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch financial assets",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.Family_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();

		const request_query = pool.request();

		// Check if Family_ID already exists
		request_query.input("Family_ID", body.Family_ID);
		const checkQuery = `
			SELECT [Family_ID]
			FROM [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
			WHERE [Family_ID] = @Family_ID
		`;
		const checkResult = await request_query.query(checkQuery);

		if (checkResult.recordset.length > 0) {
			return NextResponse.json(
				{ success: false, message: "Financial assets record already exists for this Family ID. Use PUT to update." },
				{ status: 400 }
			);
		}

		// Insert new record
		const insertRequest = pool.request();
		insertRequest.input("Family_ID", body.Family_ID);
		insertRequest.input("Land_Barren_Kanal", body.Land_Barren_Kanal || null);
		insertRequest.input("Land_Barren_Value_Rs", body.Land_Barren_Value_Rs || null);
		insertRequest.input("Land_Agriculture_Kanal", body.Land_Agriculture_Kanal || null);
		insertRequest.input("Land_Agriculture_Value_Rs", body.Land_Agriculture_Value_Rs || null);
		insertRequest.input("Livestock_Number", body.Livestock_Number || null);
		insertRequest.input("Livestock_Value_Rs", body.Livestock_Value_Rs || null);
		insertRequest.input("Fruit_Trees_Number", body.Fruit_Trees_Number || null);
		insertRequest.input("Fruit_Trees_Value_Rs", body.Fruit_Trees_Value_Rs || null);
		insertRequest.input("Vehicles_4W_Number", body.Vehicles_4W_Number || null);
		insertRequest.input("Vehicles_4W_Value_Rs", body.Vehicles_4W_Value_Rs || null);
		insertRequest.input("Motorcycle_2W_Number", body.Motorcycle_2W_Number || null);
		insertRequest.input("Motorcycle_2W_Value_Rs", body.Motorcycle_2W_Value_Rs || null);

		const insertQuery = `
			INSERT INTO [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
			(
				[Family_ID],
				[Land_Barren_Kanal],
				[Land_Barren_Value_Rs],
				[Land_Agriculture_Kanal],
				[Land_Agriculture_Value_Rs],
				[Livestock_Number],
				[Livestock_Value_Rs],
				[Fruit_Trees_Number],
				[Fruit_Trees_Value_Rs],
				[Vehicles_4W_Number],
				[Vehicles_4W_Value_Rs],
				[Motorcycle_2W_Number],
				[Motorcycle_2W_Value_Rs],
				[Entry_Date],
				[Updated_Date]
			)
			VALUES
			(
				@Family_ID,
				@Land_Barren_Kanal,
				@Land_Barren_Value_Rs,
				@Land_Agriculture_Kanal,
				@Land_Agriculture_Value_Rs,
				@Livestock_Number,
				@Livestock_Value_Rs,
				@Fruit_Trees_Number,
				@Fruit_Trees_Value_Rs,
				@Vehicles_4W_Number,
				@Vehicles_4W_Value_Rs,
				@Motorcycle_2W_Number,
				@Motorcycle_2W_Value_Rs,
				GETDATE(),
				GETDATE()
			)
		`;

		await insertRequest.query(insertQuery);

		return NextResponse.json({
			success: true,
			message: "Financial assets created successfully",
		});
	} catch (error: any) {
		console.error("Error creating financial assets:", error);
		const errorMessage = error.message || "Failed to create financial assets";
		
		// Check if it's a table not found error
		if (errorMessage.includes("Invalid object name") || errorMessage.includes("PE_Financial_Assets_Matrix")) {
			return NextResponse.json(
				{
					success: false,
					message: `Database table not found. Please verify that the table 'PE_Financial_Assets_Matrix' exists in the SJDA_Users database. Error: ${errorMessage}`,
				},
				{ status: 500 }
			);
		}
		
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();

		if (!body.Family_ID) {
			return NextResponse.json(
				{ success: false, message: "Family ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getPeDb();

		const request_query = pool.request();

		// Check if Family_ID exists
		request_query.input("Family_ID", body.Family_ID);
		const checkQuery = `
			SELECT [Family_ID]
			FROM [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
			WHERE [Family_ID] = @Family_ID
		`;
		const checkResult = await request_query.query(checkQuery);

		if (checkResult.recordset.length === 0) {
			// If record doesn't exist, create it (upsert behavior)
			const insertRequest = pool.request();
			insertRequest.input("Family_ID", body.Family_ID);
			insertRequest.input("Land_Barren_Kanal", body.Land_Barren_Kanal || null);
			insertRequest.input("Land_Barren_Value_Rs", body.Land_Barren_Value_Rs || null);
			insertRequest.input("Land_Agriculture_Kanal", body.Land_Agriculture_Kanal || null);
			insertRequest.input("Land_Agriculture_Value_Rs", body.Land_Agriculture_Value_Rs || null);
			insertRequest.input("Livestock_Number", body.Livestock_Number || null);
			insertRequest.input("Livestock_Value_Rs", body.Livestock_Value_Rs || null);
			insertRequest.input("Fruit_Trees_Number", body.Fruit_Trees_Number || null);
			insertRequest.input("Fruit_Trees_Value_Rs", body.Fruit_Trees_Value_Rs || null);
			insertRequest.input("Vehicles_4W_Number", body.Vehicles_4W_Number || null);
			insertRequest.input("Vehicles_4W_Value_Rs", body.Vehicles_4W_Value_Rs || null);
			insertRequest.input("Motorcycle_2W_Number", body.Motorcycle_2W_Number || null);
			insertRequest.input("Motorcycle_2W_Value_Rs", body.Motorcycle_2W_Value_Rs || null);

			const insertQuery = `
				INSERT INTO [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
				(
					[Family_ID],
					[Land_Barren_Kanal],
					[Land_Barren_Value_Rs],
					[Land_Agriculture_Kanal],
					[Land_Agriculture_Value_Rs],
					[Livestock_Number],
					[Livestock_Value_Rs],
					[Fruit_Trees_Number],
					[Fruit_Trees_Value_Rs],
					[Vehicles_4W_Number],
					[Vehicles_4W_Value_Rs],
					[Motorcycle_2W_Number],
					[Motorcycle_2W_Value_Rs],
					[Entry_Date],
					[Updated_Date]
				)
				VALUES
				(
					@Family_ID,
					@Land_Barren_Kanal,
					@Land_Barren_Value_Rs,
					@Land_Agriculture_Kanal,
					@Land_Agriculture_Value_Rs,
					@Livestock_Number,
					@Livestock_Value_Rs,
					@Fruit_Trees_Number,
					@Fruit_Trees_Value_Rs,
					@Vehicles_4W_Number,
					@Vehicles_4W_Value_Rs,
					@Motorcycle_2W_Number,
					@Motorcycle_2W_Value_Rs,
					GETDATE(),
					GETDATE()
				)
			`;

			await insertRequest.query(insertQuery);

			return NextResponse.json({
				success: true,
				message: "Financial assets created successfully",
			});
		}

		// Update existing record
		const updateRequest = pool.request();
		updateRequest.input("Family_ID", body.Family_ID);
		updateRequest.input("Land_Barren_Kanal", body.Land_Barren_Kanal || null);
		updateRequest.input("Land_Barren_Value_Rs", body.Land_Barren_Value_Rs || null);
		updateRequest.input("Land_Agriculture_Kanal", body.Land_Agriculture_Kanal || null);
		updateRequest.input("Land_Agriculture_Value_Rs", body.Land_Agriculture_Value_Rs || null);
		updateRequest.input("Livestock_Number", body.Livestock_Number || null);
		updateRequest.input("Livestock_Value_Rs", body.Livestock_Value_Rs || null);
		updateRequest.input("Fruit_Trees_Number", body.Fruit_Trees_Number || null);
		updateRequest.input("Fruit_Trees_Value_Rs", body.Fruit_Trees_Value_Rs || null);
		updateRequest.input("Vehicles_4W_Number", body.Vehicles_4W_Number || null);
		updateRequest.input("Vehicles_4W_Value_Rs", body.Vehicles_4W_Value_Rs || null);
		updateRequest.input("Motorcycle_2W_Number", body.Motorcycle_2W_Number || null);
		updateRequest.input("Motorcycle_2W_Value_Rs", body.Motorcycle_2W_Value_Rs || null);

		const updateQuery = `
			UPDATE [SJDA_Users].[dbo].[PE_Financial_Assets_Matrix]
			SET
				[Land_Barren_Kanal] = @Land_Barren_Kanal,
				[Land_Barren_Value_Rs] = @Land_Barren_Value_Rs,
				[Land_Agriculture_Kanal] = @Land_Agriculture_Kanal,
				[Land_Agriculture_Value_Rs] = @Land_Agriculture_Value_Rs,
				[Livestock_Number] = @Livestock_Number,
				[Livestock_Value_Rs] = @Livestock_Value_Rs,
				[Fruit_Trees_Number] = @Fruit_Trees_Number,
				[Fruit_Trees_Value_Rs] = @Fruit_Trees_Value_Rs,
				[Vehicles_4W_Number] = @Vehicles_4W_Number,
				[Vehicles_4W_Value_Rs] = @Vehicles_4W_Value_Rs,
				[Motorcycle_2W_Number] = @Motorcycle_2W_Number,
				[Motorcycle_2W_Value_Rs] = @Motorcycle_2W_Value_Rs,
				[Updated_Date] = GETDATE()
			WHERE [Family_ID] = @Family_ID
		`;

		await updateRequest.query(updateQuery);

		return NextResponse.json({
			success: true,
			message: "Financial assets updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating financial assets:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update financial assets",
			},
			{ status: 500 }
		);
	}
}











