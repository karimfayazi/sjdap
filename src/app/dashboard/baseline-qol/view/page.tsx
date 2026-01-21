"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, FileText, X, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import jsPDF from "jspdf";

type ApplicationDetails = {
	application: {
		ApplicationId: number | null;
		FormNo: string;
		TotalFamilyMembers: string | number;
		Remarks: string | null;
		CreatedAt: string | null;
		UpdatedAt?: string | null;
		CreatedBy: string | null;
	};
	familyHeads: Array<{
		FormNo: string;
		ApplicationId: number | null;
		PersonRole: string;
		FullName: string;
		CNICNo: string;
		MotherTongue: string;
		ResidentialAddress: string;
		PrimaryContactNo: string;
		SecondaryContactNumber?: string | null;
		RegionalCouncil: string;
		LocalCouncil: string;
		CurrentJK: string;
		PrimaryLocationSettlement: string;
		AreaOfOrigin: string;
		HouseStatusName: string | null;
		ApplicationDate?: string | null;
		ReceivedByName?: string | null;
		ReceivedByDate?: string | null;
		DateOfBirth?: string | null;
		HealthInsuranceProgram?: string | null;
		MonthlyIncome_Remittance?: number | null;
		MonthlyIncome_Rental?: number | null;
		MonthlyIncome_OtherSources?: number | null;
		Intake_family_Income?: number | null;
		Area_Type?: string | null;
		Status?: string | null;
		CurrentLevel?: string | null;
		SubmittedAt?: string | null;
		SubmittedBy?: string | null;
		Locked?: boolean | null;
		Land_Barren_Kanal?: number | string | null;
		Land_Barren_Value_Rs?: number | null;
		Land_Agriculture_Kanal?: number | string | null;
		Land_Agriculture_Value_Rs?: number | null;
		Livestock_Number?: number | string | null;
		Livestock_Value_Rs?: number | null;
		Fruit_Trees_Number?: number | string | null;
		Fruit_Trees_Value_Rs?: number | null;
		Vehicles_4W_Number?: number | string | null;
		Vehicles_4W_Value_Rs?: number | null;
		Motorcycle_2W_Number?: number | string | null;
		Motorcycle_2W_Value_Rs?: number | null;
	}>;
	familyMembers: Array<{
		ApplicationId: number | null;
		MemberNo: string;
		FullName: string;
		BFormOrCNIC: string;
		RelationshipId: number;
		RelationshipName: string;
		RelationshipOther: string | null;
		GenderId: number;
		GenderName: string;
		MaritalStatusId: number;
		MaritalStatusName: string;
		DOBMonth: string;
		DOBYear: string;
		OccupationId: number | null;
		OccupationName: string | null;
		OccupationOther: string | null;
		PrimaryLocation: string | null;
		IsPrimaryEarner: boolean | null;
		education: {
			EducationID: number;
			IsCurrentlyStudying: string;
			InstitutionType: string;
			InstitutionTypeOther: string;
			CurrentClass: string;
			CurrentClassOther: string;
			HighestQualification: string;
			HighestQualificationOther: string;
		} | null;
		livelihood: {
			LivelihoodID: number;
			IsCurrentlyEarning: string;
			EarningSource: string;
			EarningSourceOther: string;
			SalariedWorkSector: string;
			SalariedWorkSectorOther: string;
			WorkField: string;
			WorkFieldOther: string;
			MonthlyIncome: number;
			JoblessDuration: string;
			ReasonNotEarning: string;
			ReasonNotEarningOther: string;
		} | null;
	}>;
};

function ApplicationDetailsContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNo = searchParams.get("formNo") || searchParams.get("formNumber");
	
	const [details, setDetails] = useState<ApplicationDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showIncomeModal, setShowIncomeModal] = useState(false);
	const [approvalRemarks, setApprovalRemarks] = useState("");
	const [savingStatus, setSavingStatus] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
	const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
	const [loadingLogs, setLoadingLogs] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [successMessage, setSuccessMessage] = useState({ title: "", message: "", type: "", remarks: "" });

	const formatCurrency = (value: number | null | undefined): string => {
		if (value === null || value === undefined) return "N/A";
		return `Rs. ${Math.round(value).toLocaleString()}`;
	};

	// Determine location type based on PrimaryLocationSettlement
	const getLocationType = (primaryLocation: string | null | undefined): "Rural" | "Urban" | "Peri-Urban" => {
		if (!primaryLocation) return "Rural"; // Default to Rural
		const location = primaryLocation.toLowerCase();
		// You can customize this logic based on your location naming conventions
		// For now, checking for common urban/peri-urban indicators
		if (location.includes("urban") || location.includes("city") || location.includes("town")) {
			return "Urban";
		}
		if (location.includes("peri") || location.includes("suburban")) {
			return "Peri-Urban";
		}
		return "Rural"; // Default
	};

	// Calculate Poverty Level based on Per Capita Income and Location Type
	const calculatePovertyLevel = (perCapitaIncome: number, locationType: "Rural" | "Urban" | "Peri-Urban") => {
		const thresholds = {
			Rural: {
				"+1": { min: 13500, max: Infinity, label: "One Step Ahead of Poverty Level: Level Plus One (+1)", percentage: "125%" },
				"0": { min: 10800, max: 13499, label: "Above Poverty Line: Level NIL", percentage: "100%" },
				"-1": { min: 8100, max: 10799, label: "Below Poverty Line: Level Minus One (-1)", percentage: ">=75% - <100%" },
				"-2": { min: 5400, max: 8099, label: "Significantly Below Poverty Line: Level Minus Two (-2)", percentage: ">=50% - <75%" },
				"-3": { min: 2700, max: 5399, label: "Extreme Poverty: Level Minus Three (-3)", percentage: ">=25% - <50%" },
				"-4": { min: 0, max: 2699, label: "Ultra Poverty: Level Minus Four (-4)", percentage: "< 25%" },
			},
			Urban: {
				"+1": { min: 24000, max: Infinity, label: "One Step Ahead of Poverty Level: Level Plus One (+1)", percentage: "125%" },
				"0": { min: 19200, max: 23999, label: "Above Poverty Line: Level NIL", percentage: "100%" },
				"-1": { min: 14400, max: 19199, label: "Below Poverty Line: Level Minus One (-1)", percentage: ">=75% - <100%" },
				"-2": { min: 9600, max: 14399, label: "Significantly Below Poverty Line: Level Minus Two (-2)", percentage: ">=50% - <75%" },
				"-3": { min: 4800, max: 9599, label: "Extreme Poverty: Level Minus Three (-3)", percentage: ">=25% - <50%" },
				"-4": { min: 0, max: 4799, label: "Ultra Poverty: Level Minus Four (-4)", percentage: "< 25%" },
			},
			"Peri-Urban": {
				"+1": { min: 20100, max: Infinity, label: "One Step Ahead of Poverty Level: Level Plus One (+1)", percentage: "125%" },
				"0": { min: 16100, max: 20099, label: "Above Poverty Line: Level NIL", percentage: "100%" },
				"-1": { min: 12100, max: 16099, label: "Below Poverty Line: Level Minus One (-1)", percentage: ">=75% - <100%" },
				"-2": { min: 8100, max: 12099, label: "Significantly Below Poverty Line: Level Minus Two (-2)", percentage: ">=50% - <75%" },
				"-3": { min: 4025, max: 8099, label: "Extreme Poverty: Level Minus Three (-3)", percentage: ">=25% - <50%" },
				"-4": { min: 0, max: 4024, label: "Ultra Poverty: Level Minus Four (-4)", percentage: "< 25%" },
			},
		};

		const locationThresholds = thresholds[locationType];
		
		for (const [level, threshold] of Object.entries(locationThresholds)) {
			if (perCapitaIncome >= threshold.min && perCapitaIncome <= threshold.max) {
				return {
					level,
					label: threshold.label,
					percentage: threshold.percentage,
					locationType,
				};
			}
		}

		// Fallback (shouldn't happen, but just in case)
		return {
			level: "-4",
			label: "Ultra Poverty: Level Minus Four (-4)",
			percentage: "< 25%",
			locationType,
		};
	};

	const downloadIncomePDF = () => {
		if (!details || !details.familyHeads || details.familyHeads.length === 0) return;

		const head = details.familyHeads[0];
		// Calculate Family Income from Monthly Income fields (Remittance + Rental + Other Sources)
		const familyIncome = (head.MonthlyIncome_Remittance || 0) +
			(head.MonthlyIncome_Rental || 0) +
			(head.MonthlyIncome_OtherSources || 0);
		// Calculate Total Member Income (sum of all members' monthly income)
		const memberIncome = details.familyMembers?.reduce((sum, member) => {
			return sum + (member.livelihood?.MonthlyIncome || 0);
		}, 0) || 0;
		// Total Family Income = Family Income + Total Member Income
		const totalFamilyIncome = familyIncome + memberIncome;
		const totalMembers = details.familyMembers?.length || 0;
		// Family Per Capita Income = (Family Income + Total Member Income) / Total Members
		const perCapitaIncome = totalMembers > 0 ? totalFamilyIncome / totalMembers : 0;
		// Use Area_Type instead of getLocationType
		const locationType = (head.Area_Type || "Rural") as "Rural" | "Urban" | "Peri-Urban";
		const povertyLevel = calculatePovertyLevel(perCapitaIncome, locationType);
		// Calculate % of Self-Sufficiency Income = (Per Capita Income / Intake Income) * 100
		const intakeIncome = head.Intake_family_Income || 0;
		const selfSufficiencyPercentage = intakeIncome > 0 ? (perCapitaIncome / intakeIncome) * 100 : 0;

		// Create PDF in portrait orientation
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		});

		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 15;
		const contentWidth = pageWidth - (margin * 2);
		let yPos = margin;

		// Helper function to add a new page if needed
		const checkPageBreak = (requiredSpace: number = 10) => {
			if (yPos + requiredSpace > pageHeight - margin) {
				pdf.addPage();
				yPos = margin;
				return true;
			}
			return false;
		};

		// Helper function to add text with wrapping
		const addText = (text: string, x: number, y: number, options: any = {}) => {
			const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], maxWidth = contentWidth } = options;
			pdf.setFontSize(fontSize);
			pdf.setFont('helvetica', fontStyle);
			pdf.setTextColor(color[0], color[1], color[2]);
			const lines = pdf.splitTextToSize(text, maxWidth);
			pdf.text(lines, x, y);
			return lines.length * (fontSize * 0.35); // Approximate line height
		};

		// Header with green background
		pdf.setFillColor(11, 77, 43); // #0b4d2b
		pdf.rect(margin, yPos, contentWidth, 12, 'F');
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Income Levels', margin + 5, yPos + 8);
		yPos += 18;

		// Family Information Section
		checkPageBreak(25);
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Family Information', margin, yPos);
		yPos += 7;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		// Family Information Grid (2 columns)
		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		const familyInfo = [
			{ label: 'Form Number', value: details.application.FormNo || 'N/A' },
			{ label: 'Full Name [Head Name]', value: head.FullName || 'N/A' },
			{ label: 'CNIC No', value: head.CNICNo || 'N/A' },
			{ label: 'Primary Contact No', value: head.PrimaryContactNo || 'N/A' },
			{ label: 'Regional Council', value: head.RegionalCouncil || 'N/A' },
			{ label: 'Local Council', value: head.LocalCouncil || 'N/A' },
		];

		let col1X = margin;
		let col2X = margin + (contentWidth / 2) + 5;
		let currentY = yPos;

		familyInfo.forEach((info, index) => {
			if (index % 2 === 0) {
				currentY = yPos + (Math.floor(index / 2) * 10);
				checkPageBreak(10);
			}
			const xPos = index % 2 === 0 ? col1X : col2X;
			const y = currentY;

			pdf.setFont('helvetica', 'bold');
			pdf.setFontSize(9);
			pdf.text(info.label + ':', xPos, y);
			pdf.setFont('helvetica', 'normal');
			pdf.text(info.value, xPos, y + 5);
		});

		yPos = currentY + 10;
		yPos += 5;

		// Family Income Section
		checkPageBreak(30);
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Family Income', margin, yPos);
		yPos += 7;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		// Show Intake Family Income instead of individual income sources
		checkPageBreak(10);
		pdf.setFont('helvetica', 'normal');
		pdf.text('Intake Family Income:', margin, yPos);
		pdf.setFont('helvetica', 'bold');
		const intakeIncomeText = formatCurrency(head.Intake_family_Income || 0);
		const intakeIncomeWidth = pdf.getTextWidth(intakeIncomeText);
		pdf.text(intakeIncomeText, pageWidth - margin - intakeIncomeWidth, yPos);
		yPos += 6;
		pdf.setDrawColor(240, 240, 240);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 2;

		// Family Income (bold) - using Intake_family_Income
		checkPageBreak(10);
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;
		pdf.setFontSize(11);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Family Income', margin, yPos);
		pdf.setTextColor(11, 77, 43); // #0b4d2b
		const familyIncomeText = formatCurrency(familyIncome);
		const familyIncomeWidth = pdf.getTextWidth(familyIncomeText);
		pdf.text(familyIncomeText, pageWidth - margin - familyIncomeWidth, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 8;

		// Total Member Income Section
		checkPageBreak(30);
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Total Member Income', margin, yPos);
		yPos += 7;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		if (details.familyMembers && details.familyMembers.length > 0) {
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');
			details.familyMembers.forEach((member) => {
				checkPageBreak(8);
				const memberName = member.FullName || 'Member';
				const memberIncome = formatCurrency(member.livelihood?.MonthlyIncome || 0);
				pdf.text(memberName + ' - Monthly Income', margin, yPos);
				pdf.setFont('helvetica', 'bold');
				const memberIncomeWidth = pdf.getTextWidth(memberIncome);
				pdf.text(memberIncome, pageWidth - margin - memberIncomeWidth, yPos);
				pdf.setFont('helvetica', 'normal');
				yPos += 6;
				pdf.setDrawColor(240, 240, 240);
				pdf.line(margin, yPos, pageWidth - margin, yPos);
				yPos += 2;
			});

			// Total Member Income (bold)
			checkPageBreak(10);
			pdf.setDrawColor(200, 200, 200);
			pdf.line(margin, yPos, pageWidth - margin, yPos);
			yPos += 5;
			pdf.setFontSize(11);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Total Member Income', margin, yPos);
			pdf.setTextColor(11, 77, 43); // #0b4d2b
			const totalMemberIncomeText = formatCurrency(memberIncome);
			const totalMemberIncomeWidth = pdf.getTextWidth(totalMemberIncomeText);
			pdf.text(totalMemberIncomeText, pageWidth - margin - totalMemberIncomeWidth, yPos);
			pdf.setTextColor(0, 0, 0);
			yPos += 8;
		} else {
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'italic');
			pdf.setTextColor(128, 128, 128);
			pdf.text('No family members found', margin, yPos);
			pdf.setTextColor(0, 0, 0);
			yPos += 8;
		}

		// Total Family Income Section
		checkPageBreak(20);
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Total Family Income', margin, yPos);
		yPos += 7;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		checkPageBreak(10);
		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		const familyIncomeDisplay = formatCurrency(familyIncome);
		const memberIncomeDisplay = formatCurrency(memberIncome);
		const totalFamilyIncomeDisplay = formatCurrency(totalFamilyIncome);
		const calculationText = familyIncomeDisplay + ' + ' + memberIncomeDisplay;
		pdf.text(calculationText, margin, yPos);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(11, 77, 43); // #0b4d2b
		const totalFamilyIncomeDisplayWidth = pdf.getTextWidth(totalFamilyIncomeDisplay);
		pdf.text(totalFamilyIncomeDisplay, pageWidth - margin - totalFamilyIncomeDisplayWidth, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 8;

		// Summary Section
		checkPageBreak(50);
		pdf.setFillColor(240, 240, 240); // Light gray background
		pdf.rect(margin, yPos, contentWidth, 50, 'F');
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Summary', margin + 5, yPos + 8);
		yPos += 12;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin + 5, yPos, pageWidth - margin - 5, yPos);
		yPos += 5;

		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		checkPageBreak(8);
		pdf.text('Total Members:', margin + 5, yPos);
		pdf.setFont('helvetica', 'bold');
		const totalMembersText = totalMembers.toString();
		const totalMembersWidth = pdf.getTextWidth(totalMembersText);
		pdf.text(totalMembersText, pageWidth - margin - 5 - totalMembersWidth, yPos);
		yPos += 7;

		checkPageBreak(10);
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin + 5, yPos, pageWidth - margin - 5, yPos);
		yPos += 5;
		pdf.setFontSize(11);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Family Per Capita Income', margin + 5, yPos);
		pdf.setTextColor(11, 77, 43); // #0b4d2b
		const perCapitaIncomeText = formatCurrency(perCapitaIncome);
		const perCapitaIncomeWidth = pdf.getTextWidth(perCapitaIncomeText);
		pdf.text(perCapitaIncomeText, pageWidth - margin - 5 - perCapitaIncomeWidth, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 5;
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'italic');
		pdf.setTextColor(128, 128, 128);
		pdf.text('Per Capita Income = (Family Income + Total Member Income) / Total Members', margin + 5, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 8;

		// % of Self-Sufficiency Income Section
		checkPageBreak(15);
		pdf.setFontSize(11);
		pdf.setFont('helvetica', 'bold');
		pdf.text('% of Self-Sufficiency Income', margin + 5, yPos);
		pdf.setTextColor(11, 77, 43); // #0b4d2b
		const selfSufficiencyText = selfSufficiencyPercentage.toFixed(2) + '%';
		const selfSufficiencyWidth = pdf.getTextWidth(selfSufficiencyText);
		pdf.text(selfSufficiencyText, pageWidth - margin - 5 - selfSufficiencyWidth, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 5;
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'italic');
		pdf.setTextColor(128, 128, 128);
		pdf.text('Self-Sufficiency % = (Per Capita Income / Intake Income) × 100', margin + 5, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 8;

		// Poverty Level Section
		checkPageBreak(30);
		pdf.setFillColor(255, 255, 255); // White background
		pdf.setDrawColor(11, 77, 43); // Green border
		pdf.setLineWidth(0.5);
		pdf.rect(margin + 5, yPos, contentWidth - 10, 25, 'FD');
		yPos += 5;

		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		checkPageBreak(6);
		pdf.text('Location Type:', margin + 10, yPos);
		pdf.setFont('helvetica', 'bold');
		const locationTypeWidth = pdf.getTextWidth(locationType);
		pdf.text(locationType, pageWidth - margin - 10 - locationTypeWidth, yPos);
		yPos += 6;

		checkPageBreak(6);
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin + 10, yPos, pageWidth - margin - 10, yPos);
		yPos += 5;
		pdf.setFontSize(11);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Poverty Level', margin + 10, yPos);
		pdf.setTextColor(11, 77, 43); // #0b4d2b
		const povertyLevelText = 'Level ' + povertyLevel.level;
		const povertyLevelWidth = pdf.getTextWidth(povertyLevelText);
		pdf.text(povertyLevelText, pageWidth - margin - 10 - povertyLevelWidth, yPos);
		pdf.setTextColor(0, 0, 0);
		yPos += 6;

		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'normal');
		const povertyLabelLines = pdf.splitTextToSize(povertyLevel.label, contentWidth - 20);
		pdf.text(povertyLabelLines, margin + 10, yPos);
		yPos += (povertyLabelLines.length * 4) + 2;

		pdf.setFontSize(8);
		pdf.setTextColor(128, 128, 128);
		pdf.text('Percentage of Poverty Line: ' + povertyLevel.percentage, margin + 10, yPos);
		yPos += 4;
		pdf.text('Per Capita Income: ' + formatCurrency(perCapitaIncome) + ' (' + locationType + ')', margin + 10, yPos);

		// Save PDF
		const fileName = `Income_Levels_${details.application.FormNo}_${new Date().toISOString().split('T')[0]}.pdf`;
		pdf.save(fileName);
	};

	useEffect(() => {
		if (formNo) {
			fetchApplicationDetails();
			fetchApprovalStatus();
			fetchApprovalLogs();
		} else {
			setError("Form No is missing from the URL");
			setLoading(false);
		}
	}, [formNo]);

	const fetchApprovalStatus = async () => {
		if (!formNo) return;

		try {
			const response = await fetch(`/api/baseline-qol-approval`);
			const data = await response.json().catch(() => ({}));

			if (response.ok && data.success) {
				const record = data.records.find((r: any) => r.FormNumber === formNo);
				if (record) {
					setApprovalStatus(record.ApprovalStatus);
				}
			}
		} catch (err) {
			console.error("Error fetching approval status:", err);
		}
	};

	const fetchApprovalLogs = async () => {
		if (!formNo) return;

		try {
			setLoadingLogs(true);
			const response = await fetch(
				`/api/approval-log?recordId=${encodeURIComponent(formNo)}&moduleName=${encodeURIComponent("Baseline")}`
			);
			const data = await response.json().catch(() => ({}));

			if (response.ok && data.success) {
				setApprovalLogs(data.records || []);
			}
		} catch (err) {
			console.error("Error fetching approval logs:", err);
		} finally {
			setLoadingLogs(false);
		}
	};

	const updateApprovalStatus = async (newStatus: string) => {
		if (!formNo) return;

		try {
			setSavingStatus(true);
			setSaveError(null);

			const response = await fetch("/api/baseline-approval", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					formNumber: formNo,
					approvalStatus: newStatus,
					remarks: approvalRemarks,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				throw new Error(data?.message || "Failed to update approval status");
			}

			// Store remarks before clearing
			const remarksToShow = approvalRemarks;

			// Update approval status
			setApprovalStatus(newStatus);

			// Refresh approval logs
			fetchApprovalLogs();

			// Clear remarks
			setApprovalRemarks("");

			// Show success modal
			if (newStatus === "Approved") {
				setSuccessMessage({
					title: "Approval Status",
					message: "The baseline application has been successfully approved.",
					type: "success",
					remarks: remarksToShow
				});
			} else if (newStatus === "Rejected") {
				setSuccessMessage({
					title: "Approval Status",
					message: "The baseline application has been rejected.",
					type: "error",
					remarks: remarksToShow
				});
			}
			setShowSuccessModal(true);
		} catch (err) {
			console.error("Error updating approval status:", err);
			const message =
				err instanceof Error
					? err.message
					: "Error updating approval status. Please try again.";
			setSaveError(message);
		} finally {
			setSavingStatus(false);
		}
	};

	const isApproved = () => {
		if (!approvalStatus) return false;
		const statusLower = (approvalStatus || "").toString().trim().toLowerCase();
		return statusLower === "approved" || statusLower.includes("approve");
	};

	const getStatusBadge = (status: string | null) => {
		if (!status) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					<Clock className="h-3 w-3 mr-1" />
					Pending
				</span>
			);
		}
		const statusLower = status.toLowerCase();
		if (statusLower === "approved" || statusLower.includes("approve")) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
					<CheckCircle className="h-3 w-3 mr-1" />
					Approved
				</span>
			);
		} else if (statusLower === "rejected" || statusLower.includes("reject")) {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
					<XCircle className="h-3 w-3 mr-1" />
					Rejected
				</span>
			);
		} else {
			return (
				<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
					<Clock className="h-3 w-3 mr-1" />
					{status}
				</span>
			);
		}
	};

	const fetchApplicationDetails = async () => {
		if (!formNo) return;

		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`/api/baseline-applications/by-formno?formNo=${encodeURIComponent(formNo)}`);
			const data = await response.json();

			if (data.success) {
				setDetails(data.data);
			} else {
				setError(data.message || "Failed to fetch application details");
			}
		} catch (err: any) {
			console.error("Error fetching application details:", err);
			setError(err.message || "Error fetching application details");
		} finally {
			setLoading(false);
		}
	};

	const downloadPDF = () => {
		if (!details) return;

		// Create PDF in landscape orientation
		const pdf = new jsPDF({
			orientation: 'landscape',
			unit: 'mm',
			format: 'a4'
		});
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 15;
		const contentWidth = pageWidth - (margin * 2);
		let yPos = margin;

		// Helper function to add a new page if needed
		const checkPageBreak = (requiredSpace: number = 10) => {
			if (yPos + requiredSpace > pageHeight - margin) {
				pdf.addPage('a4', 'landscape');
				yPos = margin;
				return true;
			}
			return false;
		};

		// Helper function to draw a horizontal line
		const drawLine = () => {
			pdf.setDrawColor(200, 200, 200);
			pdf.line(margin, yPos, pageWidth - margin, yPos);
			yPos += 3;
		};

		// Helper function to draw a box/rectangle
		const drawBox = (x: number, y: number, width: number, height: number, fillColor?: [number, number, number]) => {
			if (fillColor) {
				pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
				pdf.rect(x, y, width, height, "F");
			}
			pdf.setDrawColor(200, 200, 200);
			pdf.rect(x, y, width, height);
		};

		// Header Section with Background - Reduced height by 20% (from 30 to 24)
		pdf.setFillColor(11, 77, 43); // Dark green background
		pdf.rect(0, 0, pageWidth, 24, "F");
		
		// Header Text - Using Arial as Calibri alternative (jsPDF doesn't support Calibri)
		// Reduced font sizes for title
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(14); // Reduced from 16
		pdf.setFont("arial", "bold");
		pdf.text("SILVER JUBILEE DEVELOPMENT AGENCY PAKISTAN", pageWidth / 2, 11, { align: "center" });
		
		pdf.setFontSize(10); // Reduced from 12
		pdf.setFont("arial", "normal");
		pdf.text("Application Details Report", pageWidth / 2, 17, { align: "center" });
		
		pdf.setTextColor(0, 0, 0);
		yPos = 35; // Adjusted for reduced header height

		// Application Information Section
		checkPageBreak(30);
		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 8, "F");
		pdf.setDrawColor(11, 77, 43);
		pdf.rect(margin, yPos, contentWidth, 8);
		
		pdf.setFontSize(12); // Reduced from 14
		pdf.setFont("arial", "bold");
		pdf.setTextColor(11, 77, 43);
		pdf.text("APPLICATION INFORMATION", margin + 5, yPos + 6);
		yPos += 12;

		pdf.setFontSize(10);
		pdf.setFont("arial", "normal");
		pdf.setTextColor(0, 0, 0);

		// Application Info in two columns
		const appInfoLeft: Array<[string, string | number | null | undefined]> = [
			["Form No", details.application.FormNo],
			["Total Family Members", details.application.TotalFamilyMembers],
		];
		const appInfoRight: Array<[string, string | number | null | undefined]> = [
			["Remarks", details.application.Remarks || "N/A"],
		];

				const startY = yPos;
				appInfoLeft.forEach(([label, value], index) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, margin + 5, yPos);
					pdf.setFont("arial", "normal");
			const valueText = String(value || "N/A");
			const lines = pdf.splitTextToSize(valueText, 70);
			pdf.text(lines, margin + 50, yPos);
			yPos += Math.max(6, lines.length * 6);
		});

				yPos = startY;
				appInfoRight.forEach(([label, value], index) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, pageWidth / 2 + 5, yPos);
					pdf.setFont("arial", "normal");
			const valueText = String(value || "N/A");
			const lines = pdf.splitTextToSize(valueText, 70);
			pdf.text(lines, pageWidth / 2 + 50, yPos);
			yPos += Math.max(6, lines.length * 6);
		});

		yPos += 10;

		// Family Heads
		if (details.familyHeads && details.familyHeads.length > 0) {
			details.familyHeads.forEach((head, index) => {
				checkPageBreak(50);

				// Section Header
				pdf.setFillColor(240, 240, 240);
				pdf.rect(margin, yPos, contentWidth, 8, "F");
				pdf.setDrawColor(11, 77, 43);
				pdf.rect(margin, yPos, contentWidth, 8);
				
				pdf.setFontSize(12); // Same as Application Information
				pdf.setFont("arial", "bold");
				pdf.setTextColor(11, 77, 43);
				pdf.text("FAMILY HEAD", margin + 5, yPos + 6); // Changed from "FAMILY HEAD ${index + 1}"
				yPos += 12;

				pdf.setFontSize(10);
				pdf.setFont("arial", "normal");
				pdf.setTextColor(0, 0, 0);

				// Family Head Info in two columns
				const headInfoLeft: Array<[string, string | number | null | undefined]> = [
					["Full Name", head.FullName],
					["CNIC No", head.CNICNo],
					["Mother Tongue", head.MotherTongue],
					["Primary Contact No", head.PrimaryContactNo],
					["Regional Council", head.RegionalCouncil],
					["Current JK", head.CurrentJK],
				];
				const headInfoRight: Array<[string, string | number | null | undefined]> = [
					["Person Role", head.PersonRole],
					["Residential Address", head.ResidentialAddress],
					["Local Council", head.LocalCouncil],
					["Primary Location Settlement", head.PrimaryLocationSettlement],
					["Area of Origin", head.AreaOfOrigin],
					["Area Type", head.Area_Type || "N/A"],
					["Intake Family Income", head.Intake_family_Income ? formatCurrency(head.Intake_family_Income) : "N/A"],
					["House Status", head.HouseStatusName],
				];

				const startY = yPos;
				headInfoLeft.forEach(([label, value]) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, margin + 5, yPos);
					pdf.setFont("arial", "normal");
					const valueText = String(value || "N/A");
					const lines = pdf.splitTextToSize(valueText, 75);
					pdf.text(lines, margin + 50, yPos);
					yPos += Math.max(6, lines.length * 6);
					checkPageBreak(8);
				});

				yPos = startY;
				headInfoRight.forEach(([label, value]) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, pageWidth / 2 + 5, yPos);
					pdf.setFont("arial", "normal");
					const valueText = String(value || "N/A");
					const lines = pdf.splitTextToSize(valueText, 75);
					pdf.text(lines, pageWidth / 2 + 50, yPos);
					yPos += Math.max(6, lines.length * 6);
					checkPageBreak(8);
				});

				// Take the maximum Y position from both columns
				yPos = Math.max(yPos, startY + (headInfoLeft.length * 8));
				yPos += 10;
				drawLine();
				yPos += 5;
			});
		}

		// Family Members
		if (details.familyMembers && details.familyMembers.length > 0) {
			details.familyMembers.forEach((member, index) => {
				checkPageBreak(60);

				// Section Header
				pdf.setFillColor(240, 240, 240);
				pdf.rect(margin, yPos, contentWidth, 8, "F");
				pdf.setDrawColor(11, 77, 43);
				pdf.rect(margin, yPos, contentWidth, 8);
				
				pdf.setFontSize(12);
				pdf.setFont("arial", "bold");
				pdf.setTextColor(11, 77, 43);
				pdf.text(`FAMILY MEMBER ${index + 1} - ${member.MemberNo}`, margin + 5, yPos + 6);
				yPos += 12;

				pdf.setFontSize(10);
				pdf.setFont("arial", "normal");
				pdf.setTextColor(0, 0, 0);

				// Member Info in two columns
				const memberInfoLeft: Array<[string, string | number | null | undefined]> = [
					["Full Name", member.FullName],
					["Relationship", member.RelationshipName],
					["Marital Status", member.MaritalStatusName],
					["Date of Birth", `${member.DOBMonth || "N/A"}/${member.DOBYear || "N/A"}`],
					["Primary Location", member.PrimaryLocation || "N/A"],
				];
				const memberInfoRight: Array<[string, string | number | null | undefined]> = [
					["B-Form/CNIC", member.BFormOrCNIC],
					["Gender", member.GenderName],
					["Occupation", member.OccupationName || "N/A"],
					["Is Primary Earner", member.IsPrimaryEarner ? "Yes" : "No"],
				];

				const startY = yPos;
				memberInfoLeft.forEach(([label, value]) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, margin + 5, yPos);
					pdf.setFont("arial", "normal");
					const valueText = String(value || "N/A");
					const lines = pdf.splitTextToSize(valueText, 75);
					pdf.text(lines, margin + 50, yPos);
					yPos += Math.max(6, lines.length * 6);
					checkPageBreak(8);
				});

				yPos = startY;
				memberInfoRight.forEach(([label, value]) => {
					pdf.setFont("arial", "bold");
					pdf.text(`${label}:`, pageWidth / 2 + 5, yPos);
					pdf.setFont("arial", "normal");
					const valueText = String(value || "N/A");
					const lines = pdf.splitTextToSize(valueText, 75);
					pdf.text(lines, pageWidth / 2 + 50, yPos);
					yPos += Math.max(6, lines.length * 6);
					checkPageBreak(8);
				});

				yPos = Math.max(yPos, startY + (memberInfoLeft.length * 8));
				yPos += 5;

				// Education Section
				if (member.education) {
					checkPageBreak(30);
					pdf.setFillColor(250, 250, 250);
					pdf.rect(margin + 5, yPos, contentWidth - 10, 6, "F");
					pdf.setDrawColor(200, 200, 200);
					pdf.rect(margin + 5, yPos, contentWidth - 10, 6);
					
					pdf.setFontSize(11);
					pdf.setFont("arial", "bold");
					pdf.setTextColor(11, 77, 43);
					pdf.text("Education Information", margin + 10, yPos + 4.5);
					yPos += 10;

					pdf.setFontSize(9);
					pdf.setFont("arial", "normal");
					pdf.setTextColor(0, 0, 0);

					const eduInfo: Array<[string, string | number | null | undefined]> = [
						["Currently Studying", member.education.IsCurrentlyStudying],
						["Institution Type", member.education.InstitutionType],
						["Current Class", member.education.CurrentClass],
						["Highest Qualification", member.education.HighestQualification],
					];
					eduInfo.forEach(([label, value]) => {
						checkPageBreak(8);
						pdf.setFont("arial", "bold");
						pdf.text(`${label}:`, margin + 10, yPos);
						pdf.setFont("arial", "normal");
						const valueText = String(value || "N/A");
						const lines = pdf.splitTextToSize(valueText, 150);
						pdf.text(lines, margin + 70, yPos);
						yPos += Math.max(5, lines.length * 5);
					});
					yPos += 3;
				}

				// Livelihood Section
				if (member.livelihood) {
					checkPageBreak(30);
					pdf.setFillColor(250, 250, 250);
					pdf.rect(margin + 5, yPos, contentWidth - 10, 6, "F");
					pdf.setDrawColor(200, 200, 200);
					pdf.rect(margin + 5, yPos, contentWidth - 10, 6);
					
					pdf.setFontSize(11);
					pdf.setFont("arial", "bold");
					pdf.setTextColor(11, 77, 43);
					pdf.text("Livelihood Information", margin + 10, yPos + 4.5);
					yPos += 10;

					pdf.setFontSize(9);
					pdf.setFont("arial", "normal");
					pdf.setTextColor(0, 0, 0);

					const livInfo: Array<[string, string | number | null | undefined]> = [
						["Currently Earning", member.livelihood.IsCurrentlyEarning],
						["Earning Source", member.livelihood.EarningSource],
						["Monthly Income", member.livelihood.MonthlyIncome ? `Rs. ${member.livelihood.MonthlyIncome.toLocaleString()}` : "N/A"],
						["Jobless Duration", member.livelihood.JoblessDuration],
						["Reason Not Earning", member.livelihood.ReasonNotEarning],
					];
					livInfo.forEach(([label, value]) => {
						checkPageBreak(8);
						pdf.setFont("arial", "bold");
						pdf.text(`${label}:`, margin + 10, yPos);
						pdf.setFont("arial", "normal");
						const valueText = String(value || "N/A");
						const lines = pdf.splitTextToSize(valueText, 150);
						pdf.text(lines, margin + 70, yPos);
						yPos += Math.max(5, lines.length * 5);
					});
					yPos += 3;
				}

				yPos += 5;
				drawLine();
				yPos += 5;
			});
		}

		// Add page numbers
		const totalPages = (pdf as any).internal.getNumberOfPages();
		for (let i = 1; i <= totalPages; i++) {
			pdf.setPage(i);
			pdf.setFontSize(8);
			pdf.setTextColor(128, 128, 128);
			pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
			
			// Footer line
			pdf.setDrawColor(200, 200, 200);
			pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
		}

		pdf.save(`Application-${details.application.FormNo}.pdf`);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading application details...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
					<p className="text-red-700">{error}</p>
					<button
						onClick={() => router.back()}
						className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	if (!details) {
		return (
			<div className="space-y-6">
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
					<h2 className="text-xl font-bold text-yellow-800 mb-2">No Data Found</h2>
					<p className="text-yellow-700">Application details not found for Form No: {formNo}</p>
					<button
						onClick={() => router.back()}
						className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
						<div className="flex items-center gap-3 mt-2">
							<p className="text-gray-600">Form No: {details.application.FormNo}</p>
							{approvalStatus && getStatusBadge(approvalStatus)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setShowIncomeModal(true)}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						<DollarSign className="h-4 w-4" />
						Show Income Levels
					</button>
				<button
					onClick={downloadPDF}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
				>
					<FileText className="h-4 w-4" />
					Download PDF
				</button>
				</div>
			</div>

			{/* Application Basic Information */}
			{details.familyHeads && details.familyHeads.length > 0 && details.familyHeads[0] && (
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Application Basic Information</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
						<p className="text-sm text-gray-900">{details.application.FormNo}</p>
					</div>
						{details.familyHeads[0].ApplicationDate && (
					<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
								<p className="text-sm text-gray-900">{new Date(details.familyHeads[0].ApplicationDate).toLocaleDateString()}</p>
					</div>
						)}
						{details.familyHeads[0].ReceivedByName && (
					<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Received By Name</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].ReceivedByName}</p>
					</div>
						)}
						{details.familyHeads[0].ReceivedByDate && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Received By Date</label>
								<p className="text-sm text-gray-900">{new Date(details.familyHeads[0].ReceivedByDate).toLocaleDateString()}</p>
				</div>
						)}
						{details.familyHeads[0].DateOfBirth && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
								<p className="text-sm text-gray-900">{new Date(details.familyHeads[0].DateOfBirth).toLocaleDateString()}</p>
			</div>
						)}
						{details.familyHeads[0].Status && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].Status}</p>
							</div>
						)}
						{details.familyHeads[0].CurrentLevel && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Current Level</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].CurrentLevel}</p>
							</div>
						)}
						{details.familyHeads[0].SubmittedAt && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted At</label>
								<p className="text-sm text-gray-900">{new Date(details.familyHeads[0].SubmittedAt).toLocaleDateString()}</p>
							</div>
						)}
						{details.familyHeads[0].SubmittedBy && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Submitted By</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].SubmittedBy}</p>
							</div>
						)}
						{details.familyHeads[0].Locked !== null && details.familyHeads[0].Locked !== undefined && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Locked</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].Locked ? "Yes" : "No"}</p>
							</div>
						)}
						{details.application.CreatedAt && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
								<p className="text-sm text-gray-900">{new Date(details.application.CreatedAt).toLocaleString()}</p>
							</div>
						)}
						{details.application.UpdatedAt && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
								<p className="text-sm text-gray-900">{new Date(details.application.UpdatedAt).toLocaleString()}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Family Heads */}
			{details.familyHeads && details.familyHeads.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Head Information</h2>
					{details.familyHeads.map((head, index) => (
						<div key={`${head.FormNo}-${head.ApplicationId}-${index}`} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
									<p className="text-sm text-gray-900">{head.FullName || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Person Role</label>
									<p className="text-sm text-gray-900">{head.PersonRole || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">CNIC No</label>
									<p className="text-sm text-gray-900">{head.CNICNo || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Mother Tongue</label>
									<p className="text-sm text-gray-900">{head.MotherTongue || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact No</label>
									<p className="text-sm text-gray-900">{head.PrimaryContactNo || "N/A"}</p>
								</div>
								{head.SecondaryContactNumber && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Secondary Contact Number</label>
										<p className="text-sm text-gray-900">{head.SecondaryContactNumber}</p>
									</div>
								)}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
									<p className="text-sm text-gray-900">{head.ResidentialAddress || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
									<p className="text-sm text-gray-900">{head.RegionalCouncil || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
									<p className="text-sm text-gray-900">{head.LocalCouncil || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Current JK</label>
									<p className="text-sm text-gray-900">{head.CurrentJK || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Primary Location Settlement</label>
									<p className="text-sm text-gray-900">{head.PrimaryLocationSettlement || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Area of Origin</label>
									<p className="text-sm text-gray-900">{head.AreaOfOrigin || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
									<p className="text-sm text-gray-900">{head.Area_Type || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Intake Family Income</label>
									<p className="text-sm text-gray-900">{head.Intake_family_Income ? formatCurrency(head.Intake_family_Income) : "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">House Ownership Status</label>
									<p className="text-sm text-gray-900">{head.HouseStatusName || "N/A"}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Health Insurance and Family Income */}
			{details.familyHeads && details.familyHeads.length > 0 && details.familyHeads[0] && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Health Insurance & Family Income</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{details.familyHeads[0].HealthInsuranceProgram && (
									<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Health Insurance Program</label>
								<p className="text-sm text-gray-900">{details.familyHeads[0].HealthInsuranceProgram}</p>
									</div>
						)}
						{details.familyHeads[0].MonthlyIncome_Remittance !== null && details.familyHeads[0].MonthlyIncome_Remittance !== undefined && (
									<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Remittance</label>
								<p className="text-sm text-gray-900">{formatCurrency(details.familyHeads[0].MonthlyIncome_Remittance)}</p>
									</div>
						)}
						{details.familyHeads[0].MonthlyIncome_Rental !== null && details.familyHeads[0].MonthlyIncome_Rental !== undefined && (
									<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Rental</label>
								<p className="text-sm text-gray-900">{formatCurrency(details.familyHeads[0].MonthlyIncome_Rental)}</p>
									</div>
						)}
						{details.familyHeads[0].MonthlyIncome_OtherSources !== null && details.familyHeads[0].MonthlyIncome_OtherSources !== undefined && (
									<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income - Other Sources</label>
								<p className="text-sm text-gray-900">{formatCurrency(details.familyHeads[0].MonthlyIncome_OtherSources)}</p>
									</div>
						)}
									</div>
									</div>
			)}

			{/* Financial Assets */}
			{details.familyHeads && details.familyHeads.length > 0 && details.familyHeads[0] && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Assets</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full border border-gray-300">
							<thead className="bg-gray-50">
								<tr>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Particulars</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Number/Kanal</th>
									<th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Approx. Value (Rs.)</th>
								</tr>
							</thead>
							<tbody className="bg-white">
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Barren (Kanal)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Land_Barren_Kanal || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Land_Barren_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Land-Agriculture (Kanal)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Land_Agriculture_Kanal || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Land_Agriculture_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Livestock</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Livestock_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Livestock_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Fruit Trees</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Fruit_Trees_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Fruit_Trees_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Vehicles (4-wheeler)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Vehicles_4W_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Vehicles_4W_Value_Rs)}</td>
								</tr>
								<tr>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Motorcycle (2-wheeler)</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{details.familyHeads[0].Motorcycle_2W_Number || "N/A"}</td>
									<td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(details.familyHeads[0].Motorcycle_2W_Value_Rs)}</td>
								</tr>
							</tbody>
						</table>
									</div>
									</div>
			)}

			{/* Family Members */}
			{/* Member Level Information - Grid View */}
			{details.familyMembers && details.familyMembers.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Member Level Information</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Member No</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">B-Form/CNIC</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marital Status</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB Month</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB Year</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Location</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Is Primary Earner</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Is Currently Studying</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution Type</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Class</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Qualification</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Is Currently Earning</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earning Source</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salaried Work Sector</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Field</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Income</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobless Duration</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason Not Earning</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{details.familyMembers.map((member, index) => (
									<tr key={member.MemberNo} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">{member.MemberNo || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.FullName || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.BFormOrCNIC || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.RelationshipName || member.RelationshipId || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.GenderName || member.GenderId || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.MaritalStatusName || member.MaritalStatusId || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.DOBMonth || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.DOBYear || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.OccupationName || member.OccupationId || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.PrimaryLocation || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{member.IsPrimaryEarner === true || String(member.IsPrimaryEarner) === "Yes" || String(member.IsPrimaryEarner) === "1" ? "Yes" : 
											 member.IsPrimaryEarner === false || String(member.IsPrimaryEarner) === "No" || String(member.IsPrimaryEarner) === "0" ? "No" : "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.education?.IsCurrentlyStudying || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.education?.InstitutionType || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.education?.CurrentClass || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.education?.HighestQualification || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{(() => {
												const earning = member.livelihood?.IsCurrentlyEarning;
												if (!earning) return "N/A";
												const earningStr = String(earning).toLowerCase();
												if (earningStr === "yes" || earningStr === "1" || earningStr === "true") return "Yes";
												if (earningStr === "no" || earningStr === "0" || earningStr === "false") return "No";
												return String(earning);
											})()}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.livelihood?.EarningSource || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.livelihood?.SalariedWorkSector || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.livelihood?.WorkField || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{member.livelihood?.MonthlyIncome ? formatCurrency(member.livelihood.MonthlyIncome) : "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.livelihood?.JoblessDuration || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{member.livelihood?.ReasonNotEarning || "N/A"}</td>
									</tr>
								))}
							</tbody>
						</table>
									</div>
								</div>
			)}

			{/* Approval Log */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="bg-[#0b4d2b] px-6 py-4">
					<h2 className="text-xl font-semibold text-white">Approval History</h2>
				</div>
				{loadingLogs ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
						<span className="ml-3 text-gray-600">Loading approval logs...</span>
					</div>
				) : approvalLogs.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log ID</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Level</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action By</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action At</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{approvalLogs.map((log, idx) => (
									<tr key={log.LogID || idx} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.LogID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											{log.ActionLevel ? (
												<span
													className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
														(log.ActionLevel || "")
															.toString()
															.trim()
															.toLowerCase()
															.includes("approve")
															? "bg-emerald-50 text-emerald-700 border border-emerald-200"
															: (log.ActionLevel || "")
																	.toString()
																	.trim()
																	.toLowerCase()
																	.includes("reject")
															? "bg-red-50 text-red-700 border border-red-200"
															: "bg-amber-50 text-amber-700 border border-amber-200"
													}`}
												>
													{log.ActionLevel}
												</span>
											) : (
												"N/A"
											)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionBy || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{log.ActionAt
												? new Date(log.ActionAt).toLocaleString("en-US", {
														year: "numeric",
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
												  })
												: "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.ActionType || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{log.Remarks || "N/A"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-12 text-center">
						<p className="text-gray-500">No approval logs found.</p>
					</div>
				)}
			</div>

			{/* Success Modal */}
			{showSuccessModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all">
						{/* Modal Header */}
						<div className={`px-6 py-4 rounded-t-lg ${
							successMessage.type === "success" 
								? "bg-gradient-to-r from-green-500 to-emerald-600" 
								: "bg-gradient-to-r from-red-500 to-rose-600"
						}`}>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{successMessage.type === "success" ? (
										<div className="bg-white/20 rounded-full p-2">
											<CheckCircle className="h-6 w-6 text-white" />
										</div>
									) : (
										<div className="bg-white/20 rounded-full p-2">
											<XCircle className="h-6 w-6 text-white" />
										</div>
									)}
									<h3 className="text-xl font-bold text-white">{successMessage.title}</h3>
								</div>
								<button
									onClick={() => setShowSuccessModal(false)}
									className="text-white hover:text-gray-200 transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Modal Body */}
						<div className="px-6 py-6">
							<div className="mb-4">
								<p className={`text-base ${
									successMessage.type === "success" 
										? "text-green-700" 
										: "text-red-700"
								} font-medium`}>
									{successMessage.message}
								</p>
							</div>
							{successMessage.remarks && (
								<div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
									<p className="text-xs font-medium text-gray-600 mb-1">Remarks:</p>
									<p className="text-sm text-gray-700">{successMessage.remarks}</p>
								</div>
							)}
						</div>

						{/* Modal Footer */}
						<div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
							<button
								onClick={() => setShowSuccessModal(false)}
								className={`px-6 py-2 rounded-md font-medium transition-colors ${
									successMessage.type === "success"
										? "bg-green-600 text-white hover:bg-green-700"
										: "bg-red-600 text-white hover:bg-red-700"
								}`}
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Income Levels Modal */}
			{showIncomeModal && details && details.familyHeads && details.familyHeads.length > 0 && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						{/* Modal Header */}
						<div className="bg-[#0b4d2b] text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
							<h2 className="text-xl font-semibold">Income Levels</h2>
							<div className="flex items-center gap-3">
								<button
									onClick={downloadIncomePDF}
									className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-[#0b4d2b] rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
								>
									<FileText className="h-4 w-4" />
									Download PDF
								</button>
								<button
									onClick={() => setShowIncomeModal(false)}
									className="text-white hover:text-gray-200 transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Modal Body */}
						<div className="p-6 space-y-6">
							{/* Basic Information */}
							<div className="space-y-3">
								<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Family Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
										<p className="text-sm text-gray-900">{details.application.FormNo}</p>
											</div>
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Full Name [Head Name]</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].FullName || "N/A"}</p>
											</div>
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">CNIC No</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].CNICNo || "N/A"}</p>
											</div>
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact No</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].PrimaryContactNo || "N/A"}</p>
											</div>
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].RegionalCouncil || "N/A"}</p>
											</div>
											<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].LocalCouncil || "N/A"}</p>
										</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Intake Family Income</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].Intake_family_Income ? formatCurrency(details.familyHeads[0].Intake_family_Income) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
										<p className="text-sm text-gray-900">{details.familyHeads[0].Area_Type || "N/A"}</p>
									</div>
									</div>
							</div>

							{/* Family Income */}
							<div className="space-y-3">
								<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Family Income</h3>
								<div className="space-y-2">
									<div className="flex justify-between items-center py-2 border-b border-gray-100">
										<span className="text-sm text-gray-700">Monthly Income - Remittance</span>
										<span className="text-sm font-medium text-gray-900">
											{formatCurrency(Math.round(details.familyHeads[0].MonthlyIncome_Remittance || 0))}
										</span>
											</div>
									<div className="flex justify-between items-center py-2 border-b border-gray-100">
										<span className="text-sm text-gray-700">Monthly Income - Rental</span>
										<span className="text-sm font-medium text-gray-900">
											{formatCurrency(Math.round(details.familyHeads[0].MonthlyIncome_Rental || 0))}
										</span>
											</div>
									<div className="flex justify-between items-center py-2 border-b border-gray-100">
										<span className="text-sm text-gray-700">Monthly Income - Other Sources</span>
										<span className="text-sm font-medium text-gray-900">
											{formatCurrency(Math.round(details.familyHeads[0].MonthlyIncome_OtherSources || 0))}
										</span>
											</div>
									<div className="flex justify-between items-center py-2 pt-3 border-t-2 border-gray-300">
										<span className="text-base font-semibold text-gray-900">Family Income</span>
										<span className="text-base font-bold text-[#0b4d2b]">
											{formatCurrency(
												Math.round(
													(details.familyHeads[0].MonthlyIncome_Remittance || 0) +
													(details.familyHeads[0].MonthlyIncome_Rental || 0) +
													(details.familyHeads[0].MonthlyIncome_OtherSources || 0)
												)
											)}
										</span>
											</div>
											</div>
										</div>

							{/* Member Income */}
							<div className="space-y-3">
								<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Total Member Income</h3>
								<div className="space-y-2">
									{details.familyMembers && details.familyMembers.length > 0 ? (
										<>
											{details.familyMembers.map((member, index) => (
												<div key={member.MemberNo} className="flex justify-between items-center py-2 border-b border-gray-100">
													<span className="text-sm text-gray-700">
														{member.FullName || `Member ${index + 1}`} - Monthly Income
													</span>
													<span className="text-sm font-medium text-gray-900">
														{formatCurrency(Math.round(member.livelihood?.MonthlyIncome || 0))}
													</span>
									</div>
											))}
											<div className="flex justify-between items-center py-2 pt-3 border-t-2 border-gray-300">
												<span className="text-base font-semibold text-gray-900">Total Member Income</span>
												<span className="text-base font-bold text-[#0b4d2b]">
													{formatCurrency(
														Math.round(
															details.familyMembers.reduce((sum, member) => {
																return sum + (member.livelihood?.MonthlyIncome || 0);
															}, 0)
														)
													)}
												</span>
							</div>
										</>
									) : (
										<p className="text-sm text-gray-500">No family members found</p>
									)}
								</div>
							</div>

							{/* Summary */}
							<div className="bg-gray-50 rounded-lg p-4 space-y-3">
								<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2">Summary</h3>
								{(() => {
									// Calculate Family Income from Monthly Income fields (Remittance + Rental + Other Sources)
									const familyIncome = Math.round(
										(details.familyHeads[0].MonthlyIncome_Remittance || 0) +
										(details.familyHeads[0].MonthlyIncome_Rental || 0) +
										(details.familyHeads[0].MonthlyIncome_OtherSources || 0)
									);
									// Calculate Total Member Income (sum of all members' monthly income)
									const memberIncome = Math.round(
										details.familyMembers?.reduce((sum, member) => {
											return sum + (member.livelihood?.MonthlyIncome || 0);
										}, 0) || 0
									);
									// Total Family Baseline Income = Family Income + Total Member Income
									const totalFamilyIncome = Math.round(familyIncome + memberIncome);
									const totalMembers = details.familyMembers?.length || 0;
									// Family Per Capita Income = (Family Income + Total Member Income) / Total Members
									const perCapitaIncome = totalMembers > 0 ? Math.round(totalFamilyIncome / totalMembers) : 0;
									// Use Area_Type instead of getLocationType
									const locationType = (details.familyHeads[0].Area_Type || "Rural") as "Rural" | "Urban" | "Peri-Urban";
									const povertyLevel = calculatePovertyLevel(perCapitaIncome, locationType);
									// Calculate % of Self-Sufficiency Income = (Per Capita Income / Intake Income) * 100
									const intakeIncome = Math.round(details.familyHeads[0].Intake_family_Income || 0);
									const selfSufficiencyPercentage = intakeIncome > 0 ? Math.round((perCapitaIncome / intakeIncome) * 100 * 100) / 100 : 0;

									// Format numbers without currency symbol for calculations (rounded)
									const formatNumber = (value: number): string => {
										return Math.round(value).toLocaleString();
									};

									return (
										<div className="space-y-4">
											{/* Family Income Display */}
											<div className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="flex justify-between items-center">
													<span className="text-sm font-medium text-gray-700">Family Income</span>
													<span className="text-base font-bold text-[#0b4d2b]">
														{formatCurrency(familyIncome)}
													</span>
												</div>
											</div>

											{/* Total Family Baseline Income Calculation */}
											<div className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="space-y-2">
													<div className="text-sm font-medium text-gray-700 mb-2">
														Family Income [Not Member Income] + Total Member Income = Total Family Baseline Income
													</div>
													<div className="text-lg font-semibold text-gray-900 text-center py-3 bg-gray-50 rounded border">
														{formatNumber(familyIncome)} + {formatNumber(memberIncome)} = {formatNumber(totalFamilyIncome)}
													</div>
												</div>
											</div>

											{/* Total Members */}
											<div className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="flex justify-between items-center">
													<span className="text-sm font-medium text-gray-700">Total Members</span>
													<span className="text-lg font-bold text-gray-900">= {totalMembers}</span>
												</div>
											</div>

											{/* Family Per Capita Income Calculation */}
											<div className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="space-y-2">
													<div className="text-sm font-medium text-gray-700 mb-2">
														Family Per Capita Income
													</div>
													<div className="text-lg font-semibold text-gray-900 text-center py-3 bg-gray-50 rounded border">
														{formatNumber(totalFamilyIncome)} / {totalMembers} = {formatNumber(perCapitaIncome)}
													</div>
													<div className="text-center mt-2">
														<span className="text-base font-bold text-[#0b4d2b]">
															Rs. {formatNumber(perCapitaIncome)}
														</span>
													</div>
												</div>
											</div>

											{/* % of Self-Sufficiency Income */}
											<div className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="space-y-2">
													<div className="text-sm font-medium text-gray-700 mb-2">
														% of Self-Sufficiency Income
													</div>
													<div className="text-lg font-semibold text-gray-900 text-center py-3 bg-gray-50 rounded border">
														{formatNumber(perCapitaIncome)} / {formatNumber(intakeIncome)} = {Math.round(selfSufficiencyPercentage)}%
													</div>
													<div className="text-center mt-2">
														<span className="text-base font-bold text-[#0b4d2b]">
															{Math.round(selfSufficiencyPercentage)}%
														</span>
													</div>
												</div>
											</div>

											{/* Poverty Level */}
											<div className="bg-white rounded-lg p-4 border-2 border-[#0b4d2b]">
												<div className="space-y-2">
													<div className="flex justify-between items-center">
														<span className="text-sm font-medium text-gray-700">Location Type</span>
														<span className="text-sm font-bold text-gray-900">{locationType}</span>
													</div>
													<div className="flex justify-between items-center pt-2 border-t border-gray-200">
														<span className="text-base font-semibold text-gray-900">Poverty Level</span>
														<span className="text-base font-bold text-[#0b4d2b]">
															Level {povertyLevel.level}
														</span>
													</div>
													<div className="text-sm text-gray-700 mt-2">
														{povertyLevel.label}
													</div>
													<div className="text-xs text-gray-500 mt-1">
														Percentage of Poverty Line: {povertyLevel.percentage}
													</div>
													<div className="text-xs text-gray-500 mt-1">
														Per Capita Income: {formatCurrency(perCapitaIncome)} ({locationType})
													</div>
												</div>
											</div>
										</div>
									);
								})()}
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
							<button
								onClick={() => setShowIncomeModal(false)}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function ApplicationDetailsPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading application details...</span>
				</div>
			</div>
		}>
			<ApplicationDetailsContent />
		</Suspense>
	);
}

