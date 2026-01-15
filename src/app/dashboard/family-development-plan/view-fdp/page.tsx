"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";

type FamilyInfo = {
	FamilyID: string;
	HeadName: string;
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	BaselinePerCapitaAsPctOfSelfSuff: number;
	BaselinePovertyLevel: string;
	MaxSocialSupportAmount: number;
	MaxEconomicSupport: number;
};

type FeasibilityStudy = {
	FDP_ID: number;
	MemberID: string;
	MemberName: string;
	PlanCategory: string;
	FeasibilityType: string;
	TotalInvestmentRequired: number;
	InvestmentFromPEProgram: number;
	ApprovalStatus: string;
	PrimaryIndustry: string;
	SubField: string;
	Trade: string;
	CostPerParticipant: number;
};

type EconomicIntervention = {
	FDP_EconomicID: number;
	BeneficiaryName: string;
	InterventionType: string;
	FieldOfInvestment: string;
	InvestmentFromPEProgram: number;
	IncrementalMonthlyIncome: number;
	ApprovalStatus: string;
};

type SocialIntervention = {
	BeneficiaryName?: string;
	EducationInterventionType?: string;
	EduTotalPEContribution?: number;
	HealthTotalPEContribution?: number;
	HabitatTotalPEContribution?: number;
	FoodSupportTotalPEContribution?: number;
};

function ViewFDPContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
	const [feasibilityStudies, setFeasibilityStudies] = useState<FeasibilityStudy[]>([]);
	const [economicInterventions, setEconomicInterventions] = useState<EconomicIntervention[]>([]);
	const [educationInterventions, setEducationInterventions] = useState<SocialIntervention[]>([]);
	const [healthInterventions, setHealthInterventions] = useState<SocialIntervention[]>([]);
	const [housingInterventions, setHousingInterventions] = useState<SocialIntervention[]>([]);
	const [foodInterventions, setFoodInterventions] = useState<SocialIntervention[]>([]);
	const [totalSocialSupport, setTotalSocialSupport] = useState(0);

	useEffect(() => {
		if (!formNumber) {
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/family-development-plan/view-fdp?formNumber=${encodeURIComponent(formNumber)}`);
				const data = await response.json();

				if (data.success && data.data) {
					setFamilyInfo(data.data.familyInfo);
					setFeasibilityStudies(data.data.feasibilityStudies || []);
					setEconomicInterventions(data.data.economicInterventions || []);
					setEducationInterventions(data.data.educationInterventions || []);
					setHealthInterventions(data.data.healthInterventions || []);
					setHousingInterventions(data.data.housingInterventions || []);
					setFoodInterventions(data.data.foodInterventions || []);
					setTotalSocialSupport(data.data.totalSocialSupport || 0);
				} else {
					setError(data.message || "Failed to load FDP overview data");
				}
			} catch (err: any) {
				console.error("Error fetching FDP overview data:", err);
				setError(err.message || "Failed to load FDP overview data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber]);

	const formatCurrency = (value: number): string => {
		return `Rs. ${value.toLocaleString()}`;
	};

	const formatPercent = (value: number): string => {
		return `${value.toFixed(2)}%`;
	};

	const downloadPDF = () => {
		if (!familyInfo) return;

		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		});

		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 12;
		const contentWidth = pageWidth - (margin * 2);
		let yPos = margin;
		const lineHeight = 6;
		const sectionSpacing = 8;

		// Header with colored background
		pdf.setFillColor(11, 77, 43); // #0b4d2b - Green color
		pdf.rect(margin, yPos, contentWidth, 15, 'F');
		
		// Title
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(18);
		pdf.setFont("helvetica", "bold");
		pdf.text("Overview of Family Development Plan [FDP]", pageWidth / 2, yPos + 10, { align: 'center' });
		yPos += 18;

		// Family ID
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(10);
		pdf.setFont("helvetica", "normal");
		pdf.text(`Family ID: ${familyInfo.FamilyID}`, pageWidth / 2, yPos, { align: 'center' });
		yPos += sectionSpacing;

		// Section 1: Family-Level Information
		pdf.setFillColor(240, 240, 240); // Light gray background
		pdf.rect(margin, yPos, contentWidth, 7, 'F');
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(13);
		pdf.setFont("helvetica", "bold");
		pdf.text("1. Family-Level Information", margin + 3, yPos + 5);
		yPos += 10;

		pdf.setFontSize(8);
		pdf.setFont("helvetica", "normal");
		const familyInfoData = [
			["Family ID", familyInfo.FamilyID],
			["Head Name (Self)", familyInfo.HeadName],
			["Baseline Family Income", formatCurrency(familyInfo.BaselineFamilyIncome)],
			["Family Members Count", familyInfo.FamilyMembersCount.toString()],
			["Family Per Capita Income", formatCurrency(familyInfo.FamilyPerCapitaIncome)],
			["Self-Sufficiency Income Per Capita", formatCurrency(familyInfo.SelfSufficiencyIncomePerCapita)],
			["Baseline Per Capita as % of Self-Sufficiency", formatPercent(familyInfo.BaselinePerCapitaAsPctOfSelfSuff)],
			["Baseline Poverty Level", familyInfo.BaselinePovertyLevel],
			["Max Social Support Amount", familyInfo.MaxSocialSupportAmount > 0 ? `PKR ${familyInfo.MaxSocialSupportAmount.toLocaleString()}` : "-"],
			["Max Economic Support", `PKR ${familyInfo.MaxEconomicSupport.toLocaleString()}`],
		];

		// Two-column layout with borders
		const col1X = margin;
		const col2X = pageWidth / 2 + 5;
		const labelWidth = 60;
		
		familyInfoData.forEach(([label, value], index) => {
			const xPos = index % 2 === 0 ? col1X : col2X;
			const currentY = yPos + Math.floor(index / 2) * (lineHeight + 1);
			
			if (currentY > pageHeight - 20) {
				pdf.addPage();
				yPos = margin;
				return;
			}
			
			// Draw subtle border
			pdf.setDrawColor(220, 220, 220);
			pdf.line(xPos, currentY - 3, xPos + (contentWidth / 2) - 5, currentY - 3);
			
			pdf.setFont("helvetica", "bold");
			pdf.setFontSize(8);
			pdf.text(`${label}:`, xPos, currentY);
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(8);
			pdf.text(value, xPos + labelWidth, currentY);
		});

		yPos += Math.ceil(familyInfoData.length / 2) * (lineHeight + 1) + sectionSpacing;

		// Section 2: Feasibility Studies
		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 7, 'F');
		pdf.setFontSize(13);
		pdf.setFont("helvetica", "bold");
		pdf.text("2. Feasibility Studies", margin + 3, yPos + 5);
		yPos += 10;

		if (feasibilityStudies.length > 0) {
			// Table header with background
			pdf.setFillColor(11, 77, 43);
			pdf.rect(margin, yPos, contentWidth, 6, 'F');
			pdf.setTextColor(255, 255, 255);
			pdf.setFontSize(8);
			pdf.setFont("helvetica", "bold");
			const headers = ["ID", "Category", "Type/Industry", "PE Investment", "Cost/Part."];
			const colWidths = [12, 25, 50, 35, 35];
			let xPos = margin + 2;
			
			headers.forEach((header, idx) => {
				pdf.text(header, xPos, yPos + 4);
				xPos += colWidths[idx];
			});
			yPos += 8;

			pdf.setTextColor(0, 0, 0);
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(7);
			feasibilityStudies.slice(0, 4).forEach((study: any, idx) => {
				if (yPos > pageHeight - 20) return;
				
				// Alternate row background
				if (idx % 2 === 0) {
					pdf.setFillColor(250, 250, 250);
					pdf.rect(margin, yPos - 4, contentWidth, 5, 'F');
				}
				
				xPos = margin + 2;
				const typeDisplay = study.PlanCategory === "ECONOMIC" 
					? (study.FeasibilityType || "-").substring(0, 20)
					: study.PlanCategory === "SKILLS"
					? (study.PrimaryIndustry || "-").substring(0, 20)
					: "-";
				const rowData = [
					study.FDP_ID.toString(),
					(study.PlanCategory || "-").substring(0, 10),
					typeDisplay,
					study.InvestmentFromPEProgram ? `${parseFloat(study.InvestmentFromPEProgram.toString()).toLocaleString()}` : "-",
					study.CostPerParticipant ? `${parseFloat(study.CostPerParticipant.toString()).toLocaleString()}` : "-",
				];
				rowData.forEach((cell, cellIdx) => {
					pdf.text(cell, xPos, yPos);
					xPos += colWidths[cellIdx];
				});
				
				// Draw row border
				pdf.setDrawColor(220, 220, 220);
				pdf.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
				
				yPos += 6;
			});
			if (feasibilityStudies.length > 4) {
				pdf.setFontSize(7);
				pdf.setFont("helvetica", "italic");
				pdf.setTextColor(100, 100, 100);
				pdf.text(`... and ${feasibilityStudies.length - 4} more record(s)`, margin + 2, yPos);
				yPos += 5;
			}
		} else {
			pdf.setFontSize(8);
			pdf.setFont("helvetica", "italic");
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found in this section", margin + 2, yPos);
			yPos += lineHeight;
		}

		yPos += sectionSpacing;

		// Section 3: Economic Interventions
		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 7, 'F');
		pdf.setFontSize(13);
		pdf.setFont("helvetica", "bold");
		pdf.text("3. Economic Interventions", margin + 3, yPos + 5);
		yPos += 10;

		if (economicInterventions.length > 0) {
			// Table header with background
			pdf.setFillColor(11, 77, 43);
			pdf.rect(margin, yPos, contentWidth, 6, 'F');
			pdf.setTextColor(255, 255, 255);
			pdf.setFontSize(8);
			pdf.setFont("helvetica", "bold");
			const headers = ["ID", "Beneficiary", "Type", "PE Investment", "Inc. Income", "Status"];
			const colWidths = [12, 42, 28, 35, 35, 25];
			let xPos = margin + 2;
			
			headers.forEach((header, idx) => {
				pdf.text(header, xPos, yPos + 4);
				xPos += colWidths[idx];
			});
			yPos += 8;

			pdf.setTextColor(0, 0, 0);
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(7);
			economicInterventions.slice(0, 4).forEach((intervention, idx) => {
				if (yPos > pageHeight - 20) return;
				
				// Alternate row background
				if (idx % 2 === 0) {
					pdf.setFillColor(250, 250, 250);
					pdf.rect(margin, yPos - 4, contentWidth, 5, 'F');
				}
				
				xPos = margin + 2;
				const rowData = [
					intervention.FDP_EconomicID.toString(),
					(intervention.BeneficiaryName || "-").substring(0, 20),
					(intervention.InterventionType || "-").substring(0, 15),
					intervention.InvestmentFromPEProgram ? `PKR ${parseFloat(intervention.InvestmentFromPEProgram.toString()).toLocaleString()}` : "-",
					intervention.IncrementalMonthlyIncome ? `PKR ${parseFloat(intervention.IncrementalMonthlyIncome.toString()).toLocaleString()}` : "-",
					(intervention.ApprovalStatus || "Pending").substring(0, 10),
				];
				rowData.forEach((cell, cellIdx) => {
					pdf.text(cell, xPos, yPos);
					xPos += colWidths[cellIdx];
				});
				
				// Draw row border
				pdf.setDrawColor(220, 220, 220);
				pdf.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
				
				yPos += 6;
			});
			if (economicInterventions.length > 4) {
				pdf.setFontSize(7);
				pdf.setFont("helvetica", "italic");
				pdf.setTextColor(100, 100, 100);
				pdf.text(`... and ${economicInterventions.length - 4} more record(s)`, margin + 2, yPos);
				yPos += 5;
			}
		} else {
			pdf.setFontSize(8);
			pdf.setFont("helvetica", "italic");
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found in this section", margin + 2, yPos);
			yPos += lineHeight;
		}

		yPos += sectionSpacing;

		// Section 4: Social Interventions
		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 7, 'F');
		pdf.setFontSize(13);
		pdf.setFont("helvetica", "bold");
		pdf.text("4. Social Interventions", margin + 3, yPos + 5);
		yPos += 10;

		// Create a nice box layout for each intervention type
		const interventionBoxHeight = 8;
		const boxSpacing = 2;

		// Education Support
		pdf.setDrawColor(11, 77, 43);
		pdf.setLineWidth(0.5);
		pdf.rect(margin, yPos, contentWidth, interventionBoxHeight, 'S');
		pdf.setFillColor(245, 255, 245);
		pdf.rect(margin + 1, yPos + 1, 25, interventionBoxHeight - 2, 'F');
		pdf.setFontSize(9);
		pdf.setFont("helvetica", "bold");
		pdf.setTextColor(11, 77, 43);
		pdf.text("Education Support", margin + 3, yPos + 5);
		pdf.setTextColor(0, 0, 0);
		if (educationInterventions.length > 0) {
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(8);
			const eduCount = educationInterventions.length;
			const eduTotal = educationInterventions.reduce((sum: number, i: any) => sum + (parseFloat(i.EduTotalPEContribution?.toString() || "0") || 0), 0);
			pdf.text(`${eduCount} record(s)`, margin + 30, yPos + 3);
			pdf.setFont("helvetica", "bold");
			pdf.text(`Total: PKR ${eduTotal.toLocaleString()}`, margin + 30, yPos + 6);
		} else {
			pdf.setFont("helvetica", "italic");
			pdf.setFontSize(8);
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found", margin + 30, yPos + 4.5);
		}
		yPos += interventionBoxHeight + boxSpacing;

		// Health Support
		pdf.setDrawColor(11, 77, 43);
		pdf.rect(margin, yPos, contentWidth, interventionBoxHeight, 'S');
		pdf.setFillColor(245, 255, 245);
		pdf.rect(margin + 1, yPos + 1, 25, interventionBoxHeight - 2, 'F');
		pdf.setFontSize(9);
		pdf.setFont("helvetica", "bold");
		pdf.setTextColor(11, 77, 43);
		pdf.text("Health Support", margin + 3, yPos + 5);
		pdf.setTextColor(0, 0, 0);
		if (healthInterventions.length > 0) {
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(8);
			const healthCount = healthInterventions.length;
			const healthTotal = healthInterventions.reduce((sum: number, i: any) => sum + (parseFloat(i.HealthTotalPEContribution?.toString() || "0") || 0), 0);
			pdf.text(`${healthCount} record(s)`, margin + 30, yPos + 3);
			pdf.setFont("helvetica", "bold");
			pdf.text(`Total: PKR ${healthTotal.toLocaleString()}`, margin + 30, yPos + 6);
		} else {
			pdf.setFont("helvetica", "italic");
			pdf.setFontSize(8);
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found", margin + 30, yPos + 4.5);
		}
		yPos += interventionBoxHeight + boxSpacing;

		// Housing Support
		pdf.setDrawColor(11, 77, 43);
		pdf.rect(margin, yPos, contentWidth, interventionBoxHeight, 'S');
		pdf.setFillColor(245, 255, 245);
		pdf.rect(margin + 1, yPos + 1, 25, interventionBoxHeight - 2, 'F');
		pdf.setFontSize(9);
		pdf.setFont("helvetica", "bold");
		pdf.setTextColor(11, 77, 43);
		pdf.text("Housing Support", margin + 3, yPos + 5);
		pdf.setTextColor(0, 0, 0);
		if (housingInterventions.length > 0) {
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(8);
			const housingCount = housingInterventions.length;
			const housingTotal = housingInterventions.reduce((sum: number, i: any) => sum + (parseFloat(i.HabitatTotalPEContribution?.toString() || "0") || 0), 0);
			pdf.text(`${housingCount} record(s)`, margin + 30, yPos + 3);
			pdf.setFont("helvetica", "bold");
			pdf.text(`Total: PKR ${housingTotal.toLocaleString()}`, margin + 30, yPos + 6);
		} else {
			pdf.setFont("helvetica", "italic");
			pdf.setFontSize(8);
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found", margin + 30, yPos + 4.5);
		}
		yPos += interventionBoxHeight + boxSpacing;

		// Food Support
		pdf.setDrawColor(11, 77, 43);
		pdf.rect(margin, yPos, contentWidth, interventionBoxHeight, 'S');
		pdf.setFillColor(245, 255, 245);
		pdf.rect(margin + 1, yPos + 1, 25, interventionBoxHeight - 2, 'F');
		pdf.setFontSize(9);
		pdf.setFont("helvetica", "bold");
		pdf.setTextColor(11, 77, 43);
		pdf.text("Food Support", margin + 3, yPos + 5);
		pdf.setTextColor(0, 0, 0);
		if (foodInterventions.length > 0) {
			pdf.setFont("helvetica", "normal");
			pdf.setFontSize(8);
			const foodCount = foodInterventions.length;
			const foodTotal = foodInterventions.reduce((sum: number, i: any) => sum + (parseFloat(i.FoodSupportTotalPEContribution?.toString() || "0") || 0), 0);
			pdf.text(`${foodCount} record(s)`, margin + 30, yPos + 3);
			pdf.setFont("helvetica", "bold");
			pdf.text(`Total: PKR ${foodTotal.toLocaleString()}`, margin + 30, yPos + 6);
		} else {
			pdf.setFont("helvetica", "italic");
			pdf.setFontSize(8);
			pdf.setTextColor(120, 120, 120);
			pdf.text("No Intervention found", margin + 30, yPos + 4.5);
		}
		yPos += interventionBoxHeight + sectionSpacing;

		// Section 5: Summary
		pdf.setFillColor(11, 77, 43);
		pdf.rect(margin, yPos, contentWidth, 10, 'F');
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(13);
		pdf.setFont("helvetica", "bold");
		pdf.text("5. Summary", margin + 3, yPos + 6);
		yPos += 12;

		// Summary box with border
		pdf.setDrawColor(11, 77, 43);
		pdf.setLineWidth(1);
		pdf.rect(margin, yPos, contentWidth, 12, 'S');
		pdf.setFillColor(250, 255, 250);
		pdf.rect(margin + 1, yPos + 1, contentWidth - 2, 10, 'F');
		
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(11);
		pdf.setFont("helvetica", "bold");
		pdf.text("Total Social Support:", margin + 5, yPos + 7);
		pdf.setFontSize(14);
		pdf.setTextColor(11, 77, 43);
		pdf.text(`PKR ${totalSocialSupport.toLocaleString()}`, margin + 60, yPos + 7);
		pdf.setTextColor(0, 0, 0);
		pdf.setFont("helvetica", "normal");

		// Save PDF
		pdf.save(`FDP_Overview_${familyInfo.FamilyID}_${new Date().toISOString().split('T')[0]}.pdf`);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading FDP Overview...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
					{error}
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
						onClick={() => router.push(`/dashboard/family-development-plan`)}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Overview of Family Development Plan [FDP]</h1>
						<p className="text-gray-600 mt-2">
							{formNumber && (
								<span>Family ID: {formNumber}</span>
							)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => router.push(`/dashboard/family-development-plan/crc-approval?formNumber=${formNumber}`)}
						disabled={!formNumber}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						CRC-Approval
					</button>
					<button
						onClick={downloadPDF}
						disabled={!familyInfo}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Download PDF
					</button>
				</div>
			</div>

			{/* Family-Level Information */}
			{familyInfo && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">1. Family-Level Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family ID</label>
							<input
								type="text"
								value={familyInfo.FamilyID}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Head Name (Self)</label>
							<input
								type="text"
								value={familyInfo.HeadName}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Family Income</label>
							<input
								type="text"
								value={formatCurrency(familyInfo.BaselineFamilyIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Members Count</label>
							<input
								type="text"
								value={familyInfo.FamilyMembersCount}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Per Capita Income</label>
							<input
								type="text"
								value={formatCurrency(familyInfo.FamilyPerCapitaIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Self-Sufficiency Income Per Capita</label>
							<input
								type="text"
								value={formatCurrency(familyInfo.SelfSufficiencyIncomePerCapita)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Per Capita as % of Self-Sufficiency</label>
							<input
								type="text"
								value={formatPercent(familyInfo.BaselinePerCapitaAsPctOfSelfSuff)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Poverty Level</label>
							<input
								type="text"
								value={familyInfo.BaselinePovertyLevel}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Max Social Support Amount</label>
							<input
								type="text"
								value={familyInfo.MaxSocialSupportAmount > 0 
									? `PKR ${familyInfo.MaxSocialSupportAmount.toLocaleString()}` 
									: "-"}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Max Economic Support</label>
							<input
								type="text"
								value={`PKR ${familyInfo.MaxEconomicSupport.toLocaleString()}`}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Feasibility Studies */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Feasibility Studies</h2>
				{feasibilityStudies.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Category</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Industry</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Per Participant</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{feasibilityStudies.map((study) => (
									<tr key={study.FDP_ID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{study.FDP_ID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{study.PlanCategory || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{study.PlanCategory === "ECONOMIC" ? (study.FeasibilityType || "-") : 
											 study.PlanCategory === "SKILLS" ? (study.PrimaryIndustry || "-") : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{study.InvestmentFromPEProgram ? `PKR ${parseFloat(study.InvestmentFromPEProgram.toString()).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{study.CostPerParticipant ? `PKR ${parseFloat(study.CostPerParticipant.toString()).toLocaleString()}` : "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-gray-500 text-center py-8">No Intervention found in this section</p>
				)}
			</div>

			{/* Economic Interventions */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Economic Interventions</h2>
				{economicInterventions.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field of Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incremental Income</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{economicInterventions.map((intervention) => (
									<tr key={intervention.FDP_EconomicID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FDP_EconomicID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.BeneficiaryName || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.InterventionType || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FieldOfInvestment || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{intervention.InvestmentFromPEProgram ? `PKR ${parseFloat(intervention.InvestmentFromPEProgram.toString()).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{intervention.IncrementalMonthlyIncome ? `PKR ${parseFloat(intervention.IncrementalMonthlyIncome.toString()).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												intervention.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												intervention.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{intervention.ApprovalStatus || "Pending"}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-gray-500 text-center py-8">No Intervention found in this section</p>
				)}
			</div>

			{/* Social Interventions */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">4. Social Interventions</h2>
				
				{/* Education Support */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">Education Support</h3>
					{educationInterventions.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{educationInterventions.map((intervention: any, index: number) => (
										<tr key={intervention.FDP_SocialEduID || index} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FDP_SocialEduID || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.BeneficiaryName || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.EducationInterventionType || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.EduTotalPEContribution ? `PKR ${parseFloat(intervention.EduTotalPEContribution.toString()).toLocaleString()}` : "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-center py-4">No Intervention found in this section</p>
					)}
				</div>

				{/* Health Support */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">Health Support</h3>
					{healthInterventions.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{healthInterventions.map((intervention: any, index: number) => (
										<tr key={intervention.FDP_HealthSupportID || index} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FDP_HealthSupportID || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.BeneficiaryName || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.HealthTotalPEContribution ? `PKR ${parseFloat(intervention.HealthTotalPEContribution.toString()).toLocaleString()}` : "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-center py-4">No Intervention found in this section</p>
					)}
				</div>

				{/* Housing Support */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">Housing Support</h3>
					{housingInterventions.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{housingInterventions.map((intervention: any, index: number) => (
										<tr key={intervention.FDP_HabitatSupportID || index} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FDP_HabitatSupportID || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.HeadName || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.HabitatTotalPEContribution ? `PKR ${parseFloat(intervention.HabitatTotalPEContribution.toString()).toLocaleString()}` : "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-center py-4">No Intervention found in this section</p>
					)}
				</div>

				{/* Food Support */}
				<div className="mb-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">Food Support</h3>
					{foodInterventions.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poverty Level</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PE Contribution</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{foodInterventions.map((intervention: any, index: number) => (
										<tr key={intervention.FDP_FoodSupportID || index} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.FDP_FoodSupportID || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.HeadName || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intervention.BaselinePovertyLevel || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{intervention.FoodSupportTotalPEContribution ? `PKR ${parseFloat(intervention.FoodSupportTotalPEContribution.toString()).toLocaleString()}` : "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-center py-4">No Intervention found in this section</p>
					)}
				</div>
			</div>

			{/* Summary */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">5. Summary</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Total Social Support</label>
						<input
							type="text"
							value={`PKR ${totalSocialSupport.toLocaleString()}`}
							readOnly
							className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ViewFDPPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<ViewFDPContent />
		</Suspense>
	);
}

