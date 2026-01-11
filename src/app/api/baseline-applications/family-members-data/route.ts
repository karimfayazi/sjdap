import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const formNumber = searchParams.get("formNumber");

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_query = pool.request();
		request_query.input("FormNo", formNumber);

		const query = `
			SELECT 
				[FormNo],
				[MemberNo],
				[FullName],
				[BFormOrCNIC],
				[Relationship],
				[Gender],
				[MaritalStatus],
				[DOBMonth],
				[DOBYear],
				[Occupation],
				[PrimaryLocation],
				[IsPrimaryEarner],
				[IsCurrentlyStudying],
				[InstitutionType],
				[CurrentClass],
				[HighestQualification],
				[IsCurrentlyEarning],
				[EarningSource],
				[SalariedWorkSector],
				[WorkField],
				[MonthlyIncome],
				[JoblessDuration],
				[ReasonNotEarning]
			FROM [SJDA_Users].[dbo].[PE_FamilyMember]
			WHERE [FormNo] = @FormNo
			ORDER BY [MemberNo]
		`;

		const result = await request_query.query(query);

		return NextResponse.json({
			success: true,
			data: result.recordset || [],
		});
	} catch (error: any) {
		console.error("Error fetching family members:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch family members",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { formNumber, familyMembers, familyIncome } = body;

		if (!formNumber) {
			return NextResponse.json(
				{ success: false, message: "Form Number is required" },
				{ status: 400 }
			);
		}

		// Get current user from auth cookie for CreatedBy/UpdatedBy
		const authCookie = request.cookies.get("auth");
		let currentUser = "System";
		if (authCookie && authCookie.value) {
			const userId = authCookie.value.split(":")[1];
			if (userId) currentUser = userId;
		}

		let pool;
		try {
			pool = await getDb();
			if (!pool) {
				return NextResponse.json(
					{ success: false, message: "Database connection failed: pool is null" },
					{ status: 500 }
				);
			}
		} catch (dbError: any) {
			console.error("Database connection error:", dbError);
			return NextResponse.json(
				{ 
					success: false, 
					message: `Database connection failed: ${dbError.message || String(dbError)}` 
				},
				{ status: 500 }
			);
		}
		
		let transaction;
		try {
			transaction = new sql.Transaction(pool);
			await transaction.begin();
			console.log("Transaction started successfully");
		} catch (txError: any) {
			console.error("Error initializing transaction:", txError);
			return NextResponse.json(
				{ 
					success: false, 
					message: `Failed to start transaction: ${txError.message || String(txError)}` 
				},
				{ status: 500 }
			);
		}

		try {

			// Process family members - UPDATE if exists, INSERT if not
			if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
				console.log(`Starting to process ${familyMembers.length} family members (UPDATE or INSERT)`);
				
				// Helper functions
				const toNullIfEmpty = (value: any) => {
					if (value === null || value === undefined || value === "" || (typeof value === "string" && value.trim() === "")) {
						return null;
					}
					return value;
				};
				
				const toBoolean = (value: any): boolean | null => {
					if (value === null || value === undefined || value === "") {
						return null;
					}
					if (typeof value === "boolean") {
						return value;
					}
					if (typeof value === "string") {
						const lower = value.toLowerCase().trim();
						if (lower.includes("yes") || lower.includes("true") || lower.startsWith("1")) {
							return true;
						}
						if (lower.includes("no") || lower.includes("false") || lower.startsWith("2") || lower.startsWith("0")) {
							return false;
						}
						const num = parseInt(lower, 10);
						if (!isNaN(num)) {
							return num === 1;
						}
					}
					if (typeof value === "number") {
						return value === 1 || value === 1.0;
					}
					return null;
				};
				
				for (let i = 0; i < familyMembers.length; i++) {
					const member = familyMembers[i];
					try {
						// Validate required fields
						if (!member.MemberNo || !member.FullName) {
							throw new Error(`Member ${i + 1} is missing required fields: MemberNo=${member.MemberNo}, FullName=${member.FullName}`);
						}
						
						// Check if this MemberNo already exists
						const checkMemberRequest = new sql.Request(transaction);
						checkMemberRequest.input("MemberNo", member.MemberNo);
						const memberCheckResult = await checkMemberRequest.query(`
							SELECT COUNT(*) as RecordCount 
							FROM [SJDA_Users].[dbo].[PE_FamilyMember] 
							WHERE [MemberNo] = @MemberNo
						`);
						const memberExists = (memberCheckResult.recordset[0]?.RecordCount || 0) > 0;
						
						const memberRequest = new sql.Request(transaction);
						
						// Prepare all input values
						// Ensure FormNo and MemberNo are set correctly
						const formNoValue = formNumber || member.FormNo || "";
						const memberNoValue = member.MemberNo || "";
						
						if (!formNoValue) {
							throw new Error(`Member ${i + 1} is missing FormNo`);
						}
						if (!memberNoValue) {
							throw new Error(`Member ${i + 1} is missing MemberNo`);
						}
						
						console.log(`Member ${i + 1} - FormNo: ${formNoValue}, MemberNo: ${memberNoValue}`);
						
						memberRequest.input("FormNo", formNoValue);
						memberRequest.input("MemberNo", memberNoValue);
						memberRequest.input("FullName", member.FullName || null);
						memberRequest.input("BFormOrCNIC", toNullIfEmpty(member.BFormOrCNIC));
						memberRequest.input("Relationship", toNullIfEmpty(member.RelationshipId || member.Relationship));
						memberRequest.input("Gender", toNullIfEmpty(member.GenderId || member.Gender));
						memberRequest.input("MaritalStatus", toNullIfEmpty(member.MaritalStatusId || member.MaritalStatus));
						memberRequest.input("DOBMonth", toNullIfEmpty(member.DOBMonth));
						memberRequest.input("DOBYear", toNullIfEmpty(member.DOBYear));
						memberRequest.input("Occupation", toNullIfEmpty(member.OccupationId || member.Occupation));
						memberRequest.input("PrimaryLocation", toNullIfEmpty(member.PrimaryLocation));
						
						// Handle IsPrimaryEarner - it's nvarchar(50) NOT NULL
						let isPrimaryEarnerValue: string;
						if (member.IsPrimaryEarner === true || member.IsPrimaryEarner === "true" || member.IsPrimaryEarner === 1 || member.IsPrimaryEarner === "1" || member.IsPrimaryEarner === "True") {
							isPrimaryEarnerValue = "Yes";
						} else if (member.IsPrimaryEarner === false || member.IsPrimaryEarner === "false" || member.IsPrimaryEarner === 0 || member.IsPrimaryEarner === "0" || member.IsPrimaryEarner === "False") {
							isPrimaryEarnerValue = "No";
						} else if (typeof member.IsPrimaryEarner === "string") {
							const lower = member.IsPrimaryEarner.toLowerCase().trim();
							if (lower.includes("yes") || lower.startsWith("1")) {
								isPrimaryEarnerValue = "Yes";
							} else {
								isPrimaryEarnerValue = "No";
							}
						} else {
							isPrimaryEarnerValue = "No";
						}
						memberRequest.input("IsPrimaryEarner", isPrimaryEarnerValue);
						
						// Education fields
						const isCurrentlyStudyingValue = toNullIfEmpty(member.education?.IsCurrentlyStudying);
						memberRequest.input("IsCurrentlyStudying", isCurrentlyStudyingValue);
						memberRequest.input("InstitutionType", toNullIfEmpty(member.education?.InstitutionType));
						memberRequest.input("CurrentClass", toNullIfEmpty(member.education?.CurrentClass));
						memberRequest.input("HighestQualification", toNullIfEmpty(member.education?.HighestQualification));
						
						// Livelihood fields
						const isCurrentlyEarning = toBoolean(member.livelihood?.IsCurrentlyEarning);
						memberRequest.input("IsCurrentlyEarning", isCurrentlyEarning);
						memberRequest.input("EarningSource", toNullIfEmpty(member.livelihood?.EarningSource));
						memberRequest.input("SalariedWorkSector", toNullIfEmpty(member.livelihood?.SalariedWorkSector));
						memberRequest.input("WorkField", toNullIfEmpty(member.livelihood?.WorkField));
						
						// Handle MonthlyIncome
						let monthlyIncome = null;
						if (member.livelihood?.MonthlyIncome !== null && 
							member.livelihood?.MonthlyIncome !== undefined && 
							member.livelihood?.MonthlyIncome !== "") {
							const incomeValue = parseFloat(member.livelihood.MonthlyIncome.toString());
							monthlyIncome = isNaN(incomeValue) ? null : incomeValue;
						}
						memberRequest.input("MonthlyIncome", monthlyIncome);
						
						memberRequest.input("JoblessDuration", toNullIfEmpty(member.livelihood?.JoblessDuration));
						memberRequest.input("ReasonNotEarning", toNullIfEmpty(member.livelihood?.ReasonNotEarning));
						
						const now = new Date();
						
						if (memberExists) {
							// UPDATE existing member
							memberRequest.input("UpdatedOn", now);
							memberRequest.input("UpdatedBy", currentUser);
							
							console.log(`Updating member ${i + 1}/${familyMembers.length}: FormNo=${formNoValue}, MemberNo=${memberNoValue}`);
							
							const updateQuery = `
								UPDATE [SJDA_Users].[dbo].[PE_FamilyMember]
								SET [FormNo] = @FormNo,
									[FullName] = @FullName,
									[BFormOrCNIC] = @BFormOrCNIC,
									[Relationship] = @Relationship,
									[Gender] = @Gender,
									[MaritalStatus] = @MaritalStatus,
									[DOBMonth] = @DOBMonth,
									[DOBYear] = @DOBYear,
									[Occupation] = @Occupation,
									[PrimaryLocation] = @PrimaryLocation,
									[IsPrimaryEarner] = @IsPrimaryEarner,
									[IsCurrentlyStudying] = @IsCurrentlyStudying,
									[InstitutionType] = @InstitutionType,
									[CurrentClass] = @CurrentClass,
									[HighestQualification] = @HighestQualification,
									[IsCurrentlyEarning] = @IsCurrentlyEarning,
									[EarningSource] = @EarningSource,
									[SalariedWorkSector] = @SalariedWorkSector,
									[WorkField] = @WorkField,
									[MonthlyIncome] = @MonthlyIncome,
									[JoblessDuration] = @JoblessDuration,
									[ReasonNotEarning] = @ReasonNotEarning,
									[UpdatedOn] = @UpdatedOn,
									[UpdatedBy] = @UpdatedBy
								WHERE [MemberNo] = @MemberNo
							`;
							
							const result = await memberRequest.query(updateQuery);
							console.log(`Successfully updated member ${i + 1}: FormNo=${formNoValue}, MemberNo=${memberNoValue}, rows affected:`, result.rowsAffected);
						} else {
							// INSERT new member
							memberRequest.input("CreatedOn", now);
							memberRequest.input("CreatedBy", currentUser);
							memberRequest.input("UpdatedOn", now);
							memberRequest.input("UpdatedBy", currentUser);
							
							console.log(`Inserting new member ${i + 1}/${familyMembers.length}: FormNo=${formNoValue}, MemberNo=${memberNoValue}`);
							
							const insertQuery = `
								INSERT INTO [SJDA_Users].[dbo].[PE_FamilyMember]
								([FormNo], [MemberNo], [FullName], [BFormOrCNIC], [Relationship],
								 [Gender], [MaritalStatus], [DOBMonth], [DOBYear], [Occupation], 
								 [PrimaryLocation], [IsPrimaryEarner],
								 [IsCurrentlyStudying], [InstitutionType],
								 [CurrentClass],
								 [HighestQualification],
								 [IsCurrentlyEarning], [EarningSource],
								 [SalariedWorkSector], [WorkField],
								 [MonthlyIncome], [JoblessDuration], [ReasonNotEarning],
								 [CreatedOn], [CreatedBy], [UpdatedOn], [UpdatedBy])
								VALUES 
								(@FormNo, @MemberNo, @FullName, @BFormOrCNIC, @Relationship,
								 @Gender, @MaritalStatus, @DOBMonth, @DOBYear, @Occupation,
								 @PrimaryLocation, @IsPrimaryEarner,
								 @IsCurrentlyStudying, @InstitutionType,
								 @CurrentClass,
								 @HighestQualification,
								 @IsCurrentlyEarning, @EarningSource,
								 @SalariedWorkSector, @WorkField,
								 @MonthlyIncome, @JoblessDuration, @ReasonNotEarning,
								 @CreatedOn, @CreatedBy, @UpdatedOn, @UpdatedBy)
							`;
							
							const result = await memberRequest.query(insertQuery);
							console.log(`Successfully inserted member ${i + 1}: FormNo=${formNoValue}, MemberNo=${memberNoValue}, rows affected:`, result.rowsAffected);
						}
					} catch (memberError: any) {
						console.error(`Error inserting member ${i + 1} (${member.MemberNo}):`, memberError);
						console.error("Member data:", JSON.stringify(member, null, 2));
						console.error("Error details:", {
							message: memberError.message,
							number: memberError.number,
							state: memberError.state,
							class: memberError.class,
							lineNumber: memberError.lineNumber,
							originalError: memberError.originalError
						});
						
						// Extract detailed error information
						let memberErrorMessage = memberError.message || "Unknown error";
						if (memberError.number) {
							memberErrorMessage = `SQL Error ${memberError.number}: ${memberErrorMessage}`;
						}
						if (memberError.originalError) {
							memberErrorMessage += ` (Original: ${memberError.originalError.message || memberError.originalError})`;
						}
						
						// Include SQL error number in the thrown error for better debugging
						const errorToThrow = new Error(`Failed to save member ${i + 1} (${member.MemberNo || 'Unknown'}): ${memberErrorMessage}`);
						(errorToThrow as any).sqlErrorNumber = memberError.number;
						(errorToThrow as any).sqlErrorState = memberError.state;
						throw errorToThrow;
					}
				}
			}

			// Save family income (if there's a table for it, otherwise we can add it to PE_Application_BasicInfo or a separate table)
			// For now, we'll skip this as the user didn't specify a table for family income

			try {
				await transaction.commit();
				console.log("Transaction committed successfully");
			} catch (commitError: any) {
				console.error("Error committing transaction:", commitError);
				throw new Error(`Failed to commit transaction: ${commitError.message || commitError}`);
			}

			return NextResponse.json({
				success: true,
				message: "Family members data saved successfully",
			});
		} catch (error: any) {
			// Try to rollback the transaction if it's still active
			try {
				if (transaction) {
					await transaction.rollback();
					console.log("Transaction rolled back successfully");
				}
			} catch (rollbackError: any) {
				console.error("Error during rollback:", rollbackError);
			}
			
			console.error("Transaction error:", error);
			console.error("Error details:", {
				message: error.message,
				number: error.number,
				state: error.state,
				class: error.class,
				serverName: error.serverName,
				procName: error.procName,
				lineNumber: error.lineNumber,
				originalError: error.originalError,
				sqlErrorNumber: (error as any).sqlErrorNumber,
				sqlErrorState: (error as any).sqlErrorState
			});
			
			// Extract more detailed error information
			let errorMessage = error.message || "Transaction has been aborted";
			if (error.number || (error as any).sqlErrorNumber) {
				const errorNum = error.number || (error as any).sqlErrorNumber;
				errorMessage = `SQL Error ${errorNum}: ${errorMessage}`;
			}
			if (error.originalError) {
				errorMessage += ` (Original: ${error.originalError.message || error.originalError})`;
			}
			
			throw new Error(errorMessage);
		}
	} catch (error: any) {
		console.error("Error saving family members data:", error);
		
		// Extract error message from various possible error structures
		let errorMessage = "Failed to save family members data";
		
		if (error) {
			if (typeof error === 'string') {
				errorMessage = error;
			} else if (error.message) {
				errorMessage = error.message;
			} else if (error.originalError) {
				errorMessage = error.originalError.message || String(error.originalError);
			} else {
				errorMessage = String(error);
			}
		}
		
		// Log full error for debugging
		console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
		
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
				details: process.env.NODE_ENV === 'development' ? {
					errorNumber: error?.number,
					errorState: error?.state,
					errorClass: error?.class,
					lineNumber: error?.lineNumber,
					stack: error?.stack,
					originalError: error?.originalError ? String(error.originalError) : undefined
				} : undefined
			},
			{ status: 500 }
		);
	}
}

