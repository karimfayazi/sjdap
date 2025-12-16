import { NextRequest, NextResponse } from "next/server";
import { getTrackingSystemDb, getPlanInterventionDb, getBaselineDb } from "@/lib/db";
import jsPDF from 'jspdf';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const interventionId = searchParams.get("interventionId");

		if (!interventionId) {
			return NextResponse.json(
				{ success: false, message: "Intervention ID is required" },
				{ status: 400 }
			);
		}

		// Fetch loan data
		const trackingPool = await getTrackingSystemDb();
		const loanResult = await trackingPool.request()
			.input("interventionId", interventionId)
			.query(`
				SELECT TOP (1)
					[Intervention_ID], [Family_ID], [Letter_Ref], [Letter_Date], [Bank_Name], [Bank_Branch],
					[Beneficiary_Name], [Beneficiary_CNIC], [Beneficiary_Contact], [Beneficiary_Address],
					[Recommended_Amount], [Recommended_Tenure_Months], [Grace_Period_Months], [Loan_Status]
				FROM [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
				WHERE [Intervention_ID] = @interventionId
			`);

		if (loanResult.recordset.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Loan record not found" },
				{ status: 404 }
			);
		}

		const loanData = loanResult.recordset[0];

		// Fetch intervention data for additional details
		let interventionData = null;
		try {
			const planInterventionPool = await getPlanInterventionDb();
			const interventionResult = await planInterventionPool.request()
				.input("interventionId", interventionId)
				.query(`
					SELECT TOP (1)
						[INTERVENTION_ID], [FAMILY_ID], [PROGRAM], [REGIONAL COUNCIL],
						[HEAD NAME], [MENTOR], [INTERVENTION_STATUS],
						[LOAN_AMOUNT], [MEMBER_ID]
					FROM [SJDA_Plan_Intervetnion].[dbo].[View_Economic_Loan_Process]
					WHERE [INTERVENTION_ID] = @interventionId
				`);

			if (interventionResult.recordset.length > 0) {
				interventionData = interventionResult.recordset[0];

				// If MEMBER_ID exists, fetch member name
				if (interventionData.MEMBER_ID) {
					try {
						const baselinePool = await getBaselineDb();
						const memberResult = await baselinePool.request()
							.input("memberId", interventionData.MEMBER_ID)
							.query(`
								SELECT [FULL NAME] as FULL_NAME
								FROM [SJDA_BASELINEDB].[dbo].[View_SEDP_FEAP_MEMBERS]
								WHERE [MEMBER_ID] = @memberId
							`);

						if (memberResult.recordset.length > 0) {
							interventionData.MEMBER_NAME = memberResult.recordset[0].FULL_NAME;
						}
					} catch (memberError) {
						console.warn("Could not fetch member name:", memberError);
					}
				}
			}
		} catch (interventionError) {
			console.warn("Could not fetch intervention data:", interventionError);
		}

		// Create professional PDF matching Word document format
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		});

		// Set professional font
		try {
			pdf.setFont('times-roman', 'normal');
		} catch (fontError) {
			pdf.setFont('helvetica', 'normal');
		}

		// Page dimensions and margins (matching Word document)
		const pageWidth = pdf.internal.pageSize.width;
		const marginLeft = 25;
		const marginTop = 30;
		let yPosition = marginTop;

		// Helper function for text with word wrap
		const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11) => {
			pdf.setFontSize(fontSize);
			const lines = pdf.splitTextToSize(text, maxWidth);
			pdf.text(lines, x, y);
			return y + (lines.length * 5); // 5mm line height
		};

		// 1. Reference and Date (top corners)
		pdf.setFontSize(11);
		pdf.text(`Ref: ${loanData.Letter_Ref || 'N/A'}`, marginLeft, yPosition);

		// Format date as DD/MM/YYYY
		const formatDateForWord = (date: Date | string) => {
			try {
				const dateObj = date instanceof Date ? date : new Date(date);
				return dateObj.toLocaleDateString('en-GB', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				});
			} catch (dateError) {
				return new Date().toLocaleDateString('en-GB', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				});
			}
		};

		const letterDate = loanData.Letter_Date ? new Date(loanData.Letter_Date) : new Date();
		const formattedLetterDate = formatDateForWord(letterDate);
		const familyIdText = String(loanData.Family_ID || 'N/A');
		const mentorName = String(interventionData?.MENTOR || 'N/A');

		// Left-side: Ref & date
		pdf.setFontSize(11);
		pdf.text(`Ref: ${loanData.Letter_Ref || 'N/A'}`, marginLeft, yPosition);
		pdf.text(`Dated : ${formattedLetterDate}`, marginLeft, yPosition + 6);

		// Right-side: Family ID and Mentor
		const rightX = pageWidth - marginLeft;
		pdf.text(familyIdText, rightX, yPosition, { align: 'right' });
		pdf.setFontSize(8);
		pdf.text(`Mentor: ${mentorName}`, rightX, yPosition + 6, { align: 'right' });
		pdf.setFontSize(11);

		yPosition += 14;

		// 2. Bank Manager Address Block
		pdf.text('The Branch Manager,', marginLeft, yPosition);
		yPosition += 5;
		pdf.text('HBL Microfinance Bank,', marginLeft, yPosition);
		yPosition += 5;
		pdf.text('Garden Branch, Karachi', marginLeft, yPosition);
		yPosition += 10;

		// 3. Subject (Bold, larger font)
		pdf.setFont('times-roman', 'bold');
		pdf.setFontSize(12);
		const subjectText = 'Subject: Client Recommendation & Irrevocable Authorization of Lien Marking & Encashment';
		yPosition = addWrappedText(subjectText, marginLeft, yPosition, pageWidth - 50, 12);
		yPosition += 5;

		// 4. Introduction paragraph
		pdf.setFont('times-roman', 'normal');
		pdf.setFontSize(11);
		const introText = 'We are being the authorized signatories/representatives of Silver Jubilee Development Agency and hereby pass standing and irrevocable instruction regarding the following account as collateral arrangement.';
		yPosition = addWrappedText(introText, marginLeft, yPosition, pageWidth - 50);
		yPosition += 10;

		// 5. Account Details Table Header (Bold)
		pdf.setFont('times-roman', 'bold');
		pdf.setFontSize(11);
		const col1X = marginLeft;
		const col2X = marginLeft + 80;
		const col3X = marginLeft + 120;

		pdf.text('Title of Account', col1X, yPosition);
		pdf.text('Account No.', col2X, yPosition);
		pdf.text('Branch', col3X, yPosition);
		yPosition += 5;

		// Account Details Data (Normal font)
		pdf.setFont('times-roman', 'normal');
		pdf.text('Silver Jubilee Development Agency', col1X, yPosition);
		pdf.text('0111010080381018', col2X, yPosition);
		pdf.text('Garden Branch Karachi', col3X, yPosition);
		yPosition += 10;

		// Account explanation paragraph
		const accountText = 'The standing and irrevocable instructions have been issued to create the bank charge over the above-referred account as collateral up to 110% of the loan amount sanctioned to the applicant as per detail below.';
		yPosition = addWrappedText(accountText, marginLeft, yPosition, pageWidth - 60, 11);
		yPosition += 3;

		// 6. Beneficiary Details (Numbered list 1-10) as table
		pdf.setFont('times-roman', 'normal');
		pdf.setFontSize(11);

		const beneficiaryName = String(loanData.Beneficiary_Name || (interventionData && interventionData.MEMBER_NAME) || (interventionData && interventionData['HEAD NAME']) || 'N/A');
		const beneficiaryCNIC = String(loanData.Beneficiary_CNIC || (interventionData && interventionData.CNIC) || 'N/A');
		const beneficiaryContact = String(loanData.Beneficiary_Contact || 'N/A');
		const beneficiaryAddress = String(loanData.Beneficiary_Address || 'N/A');
		const loanAmount = String(loanData.Recommended_Amount || (interventionData && interventionData.LOAN_AMOUNT) || 'N/A');
		const formatCurrencyValue = (value: string) => {
			const numeric = Number(value.replace(/,/g, ''));
			if (isNaN(numeric)) return value;
			return numeric.toLocaleString('en-PK');
		};
		const loanType = String((interventionData && interventionData.MAIN_INTERVENTION) || 'Economic Development');
		const loanPurpose = String((interventionData && interventionData['INTERVENTION_FRAMEWORK_DIMENSIONS']) || 'Business Development');
		const bankName = String(loanData.Bank_Name || 'HBL Microfinance Bank');
		const bankBranch = String(loanData.Bank_Branch || 'Garden Branch');
		const tenureMonths = String(loanData.Recommended_Tenure_Months || 'N/A');
		const graceMonths = String(loanData.Grace_Period_Months || 'N/A');

		const rowHeight = 6;
		const tableItems = [
			{ label: '1. Name', value: beneficiaryName },
			{ label: '2. CNIC', value: beneficiaryCNIC },
			{ label: '3. Contact Number', value: beneficiaryContact },
			{ label: '4. Address', value: beneficiaryAddress },
			{ label: '5. Purpose of the Loan', value: `${loanType} - ${loanPurpose}` },
			{ label: '6. Recommended Amount', value: `PKR ${formatCurrencyValue(loanAmount)}` },
			{ label: '7. Recommended Tenure', value: `${tenureMonths} Months (this is exclusive of grace period)` },
			{ label: '8. Grace Period', value: `${graceMonths} Months` },
			{ label: '9. Recommended Branch', value: `${bankName} - ${bankBranch} Branch` },
			{ label: '10. Take social guarantee from beneficiary (signatures from two persons)', value: '', needsColon: false }
		];

		const labelX = marginLeft;
		const valueX = marginLeft + 90;

		tableItems.forEach((item) => {
			const labelText = item.needsColon === false ? item.label : `${item.label} :`;
			pdf.text(labelText, labelX, yPosition);
			if (item.value) {
				pdf.text(item.value, valueX, yPosition);
			}
			yPosition += rowHeight;
		});

		yPosition += 3;

		// 7. Authorization Instructions
		const authText = 'The standing and irrevocable instructions hereby authorized the bank;';
		yPosition = addWrappedText(authText, marginLeft, yPosition, pageWidth - 50);
		yPosition += 3;

		// Numbered authorization points
		pdf.text('1. To mark lien on account as 110% of the above-mentioned recommended amount.', marginLeft + 8, yPosition);
		yPosition += 5;

		const point2 = '2. Settlement complete liability (principal and accrued service charges) directly from Silver Jubilee Development Agency under lien amount in case of loan default by the above-referred applicant.';
		yPosition = addWrappedText(point2, marginLeft + 8, yPosition, pageWidth - 40);
		yPosition += 8;

		// 8. Irrevocable Authorization Text
		const irrevocableText = 'This authorization for the stated accounts is Irrevocable until the entire liability owed by the above borrower satisfactorily paid off to HBL Microfinance Bank.';
		yPosition = addWrappedText(irrevocableText, marginLeft, yPosition, pageWidth - 50);
		yPosition += 3;

		// 9. Confidentiality Clause
		const confidentialityText = 'This confidential document is not meant to be shared with the Beneficiary, Each Party shall maintain the confidentiality of all such information and, without obtaining the other Party\'s written consent, shall not disclose it to any third parties.';
		yPosition = addWrappedText(confidentialityText, marginLeft, yPosition, pageWidth - 50);
		yPosition += 10;

		// 10. Signature Section
		pdf.setFont('times-roman', 'italic');
		pdf.setFontSize(11);
		pdf.text('For and on behalf of', marginLeft, yPosition);
		yPosition += 5;

		pdf.setFont('times-roman', 'bold');
		pdf.setFontSize(12);
		pdf.text('Silver Jubilee Development Agency', marginLeft, yPosition);

		// Return PDF
		const pdfBuffer = pdf.output('arraybuffer');
		const filename = `Loan_Authorization_${String(loanData.Letter_Ref || 'N/A')}.pdf`;

		return new NextResponse(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});

	} catch (error) {
		console.error("PDF Generation Error:", error);
		return NextResponse.json(
			{ success: false, message: "Failed to generate PDF. Please try again." },
			{ status: 500 }
		);
	}
}