"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";

type FamilyInfo = {
	FamilyNumber: string;
	HeadName: string;
	RegionalCouncil: string;
	LocalCommunity: string;
	AreaType: string;
	BaselineIncomeLevel: string;
	TotalMembers: number;
	BaselineFamilyIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	Mentor?: string | null;
};

type Intervention = {
	InterventionNumber: number;
	Investment: number;
	IncrementalIncome: number;
	IncrementalIncomePerCapita: number;
	InterventionType: string;
};

type SelfSufficiencyData = {
	familyInfo: FamilyInfo;
	interventions: Intervention[];
};

function PlannedSelfSufficiencyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");

	const [data, setData] = useState<SelfSufficiencyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Helper function: Format number with commas
	const formatNumber = (value: number | null | undefined): string => {
		if (value === null || value === undefined || isNaN(value)) return "-";
		const roundedValue = Math.round(value);
		return roundedValue.toLocaleString();
	};

	// Alias for PDF compatibility
	const formatCurrency = formatNumber;

	// Helper function: Format status with parentheses for negative values
	const formatStatusParen = (value: number): string => {
		if (value < 0) {
			return `(${formatNumber(Math.abs(value))})`;
		}
		return formatNumber(value);
	};

	// Helper function: Format percent
	const formatPercent = (value: number): string => {
		if (isNaN(value)) return "-";
		return `${Math.round(value)}%`;
	};

	// Helper function: Get poverty level based on percentage
	const getPovertyLevel = (percent: number): string => {
		if (percent < 40) return "-3";
		if (percent < 70) return "-2";
		if (percent < 100) return "-1";
		if (percent < 140) return "Nil";
		return "+1";
	};

	// Calculate % of self-sufficiency
	const calculateSelfSufficiencyPercent = (perCapitaIncome: number, selfSufficiencyIncome: number): number => {
		if (selfSufficiencyIncome <= 0) return 0;
		return (perCapitaIncome / selfSufficiencyIncome) * 100;
	};

	// Calculate self-sufficiency status (difference)
	const calculateSelfSufficiencyStatus = (totalIncome: number, selfSufficiencyTarget: number): number => {
		return totalIncome - selfSufficiencyTarget;
	};

	// Legacy poverty level calculation (kept for backward compatibility)
	const calculatePovertyLevel = (perCapitaIncome: number, areaType: string, selfSufficiencyIncome?: number): string => {
		// If self-sufficiency income is provided, use percentage-based calculation
		if (selfSufficiencyIncome && selfSufficiencyIncome > 0) {
			const percent = (perCapitaIncome / selfSufficiencyIncome) * 100;
			return getPovertyLevel(percent);
		}

		const thresholds: { [key: string]: { [key: number]: string } } = {
			"Rural": {
				0: "Level -4",
				2700: "Level -3",
				5400: "Level -2",
				8100: "Level -1",
				10800: "Level 0",
				13500: "Level +1",
			},
			"Urban": {
				0: "Level -4",
				4800: "Level -3",
				9600: "Level -2",
				14400: "Level -1",
				19200: "Level 0",
				24000: "Level +1",
			},
			"Peri-Urban": {
				0: "Level -4",
				4025: "Level -3",
				8100: "Level -2",
				12100: "Level -1",
				16100: "Level 0",
				20100: "Level +1",
			},
		};

		const areaThresholds = thresholds[areaType] || thresholds["Rural"];
		const sortedLevels = Object.keys(areaThresholds)
			.map(Number)
			.sort((a, b) => b - a);

		for (const threshold of sortedLevels) {
			if (perCapitaIncome >= threshold) {
				return areaThresholds[threshold];
			}
		}

		return "Level -4";
	};

	// Fetch data
	useEffect(() => {
		if (!formNumber) {
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				const response = await fetch(`/api/family-development-plan/planned-self-sufficiency?formNumber=${encodeURIComponent(formNumber)}`);
				const result = await response.json();

				if (result.success) {
					setData(result.data);
				} else {
					setError(result.message || "Failed to load data");
				}
			} catch (err: any) {
				console.error("Error fetching data:", err);
				setError(err.message || "Failed to load data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber]);


	const downloadPDF = () => {
		if (!data) return;

		const pdf = new jsPDF({
			orientation: 'landscape',
			unit: 'mm',
			format: 'a4'
		});

		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 10;
		const contentWidth = pageWidth - (margin * 2);
		let yPos = margin;

		// Header with green background
		pdf.setFillColor(11, 77, 43); // #0b4d2b
		pdf.rect(margin, yPos, contentWidth, 12, 'F');
		pdf.setTextColor(255, 255, 255);
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Planned Self-Sufficiency Status', margin + 5, yPos + 8);
		yPos += 18;

		// Family Information Section
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(12);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Family Information', margin, yPos);
		yPos += 7;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		// Family Info Grid
		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		const familyInfo = [
			{ label: 'Family Number', value: data.familyInfo.FamilyNumber },
			{ label: 'Head Name', value: data.familyInfo.HeadName },
			{ label: 'Regional Council', value: data.familyInfo.RegionalCouncil },
			{ label: 'Local Community', value: data.familyInfo.LocalCommunity },
			{ label: 'Area Type', value: data.familyInfo.AreaType },
			{ label: 'Baseline Income Level', value: data.familyInfo.BaselineIncomeLevel },
			{ label: 'Total Members', value: data.familyInfo.TotalMembers.toString() },
			{ label: 'Mentor', value: data.familyInfo.Mentor || '-' },
		];

		let col1X = margin;
		let col2X = margin + (contentWidth / 2) + 5;
		let currentY = yPos;

		familyInfo.forEach((info, index) => {
			if (index % 2 === 0) {
				currentY = yPos + (Math.floor(index / 2) * 8);
			}
			const xPos = index % 2 === 0 ? col1X : col2X;
			const y = currentY;

			pdf.setFont('helvetica', 'bold');
			pdf.setFontSize(9);
			pdf.text(info.label + ':', xPos, y);
			pdf.setFont('helvetica', 'normal');
			pdf.text(info.value || 'N/A', xPos + 50, y);
		});

		yPos = currentY + 12;

		// Self-Sufficiency Status Table
		pdf.setFontSize(12);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Planned Self-Sufficiency Status', margin, yPos);
		yPos += 8;

		// Table Headers
		// Adjusted column widths: [Investment *, Investment, Amount, Per Capita, % of Self-Sufficiency, Poverty Level, Status]
		const colWidths = [50, 28, 28, 25, 30, 25, 25];
		const headers = ['Investment *', 'Investment', 'Amount', 'Per Capita', '% of Self-Sufficiency', 'Poverty Level', 'Status'];
		let xPos = margin;

		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 8, 'F');
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'bold');

		headers.forEach((header, i) => {
			// Center align headers for better appearance
			const textWidth = pdf.getTextWidth(header);
			pdf.text(header, xPos + (colWidths[i] - textWidth) / 2, yPos + 6);
			xPos += colWidths[i];
		});

		yPos += 8;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		// Helper function to right-align text in a column
		const rightAlignText = (text: string, colWidth: number, xPos: number): void => {
			const textWidth = pdf.getTextWidth(text);
			pdf.text(text, xPos + colWidth - textWidth - 2, yPos + 5);
		};

		// Self-Sufficiency Income Required Per Capita
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(9);
		xPos = margin;
		pdf.text('Self-Sufficiency Income Required Per Capita PM', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment column
		xPos += colWidths[2]; // Skip Amount column
		rightAlignText(formatCurrency(data.familyInfo.SelfSufficiencyIncomePerCapita), colWidths[3], xPos); // Per Capita
		xPos += colWidths[3];
		rightAlignText('100%', colWidths[4], xPos); // % of Self-Sufficiency
		xPos += colWidths[4];
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Number of family members
		xPos = margin;
		pdf.text('Number of family members', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment column
		xPos += colWidths[2]; // Skip Amount column
		rightAlignText(data.familyInfo.TotalMembers.toString(), colWidths[3], xPos); // Per Capita
		xPos += colWidths[3];
		xPos += colWidths[4]; // Skip % column
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Self-Sufficiency Income Target
		const selfSufficiencyTarget = data.familyInfo.SelfSufficiencyIncomePerCapita * data.familyInfo.TotalMembers;
		xPos = margin;
		pdf.text('Self-Sufficiency Income Target', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment column
		pdf.text('Calculated', xPos + 2, yPos + 5); // Amount column
		xPos += colWidths[2];
		rightAlignText(formatCurrency(selfSufficiencyTarget), colWidths[3], xPos); // Per Capita (but showing total)
		xPos += colWidths[3];
		xPos += colWidths[4]; // Skip % column
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Baseline Income
		const baselinePerCapita = data.familyInfo.TotalMembers > 0 
			? data.familyInfo.BaselineFamilyIncome / data.familyInfo.TotalMembers 
			: 0;
		const baselinePercent = calculateSelfSufficiencyPercent(baselinePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const baselinePovertyLevel = calculatePovertyLevel(baselinePerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const baselineStatus = calculateSelfSufficiencyStatus(data.familyInfo.BaselineFamilyIncome, selfSufficiencyTarget);

		pdf.setFillColor(255, 245, 230); // Light orange for baseline
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		xPos = margin;
		pdf.setTextColor(0, 0, 0);
		pdf.text('Baseline Income PM', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment column
		rightAlignText(formatCurrency(data.familyInfo.BaselineFamilyIncome), colWidths[2], xPos); // Amount
		xPos += colWidths[2];
		rightAlignText(formatCurrency(baselinePerCapita), colWidths[3], xPos); // Per Capita
		xPos += colWidths[3];
		rightAlignText(`${baselinePercent.toFixed(0)}%`, colWidths[4], xPos); // % of Self-Sufficiency
		xPos += colWidths[4];
		pdf.text(baselinePovertyLevel, xPos + 2, yPos + 5); // Poverty Level (left align)
		xPos += colWidths[5];
		rightAlignText(formatCurrency(baselineStatus), colWidths[6], xPos); // Status
		yPos += 9;

		// Calculate incremental income values (same logic as UI)
		const approvedEconomicInterventions = data.interventions
			.filter((inv) => {
				const interventionType = (inv.InterventionType || "").trim().toUpperCase();
				return interventionType === "ECONOMIC";
			})
			.slice(0, 4);

		const inc1 = approvedEconomicInterventions[0]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[0].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[0].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[0].IncrementalIncome) || 0)
			: 0;
		const inc2 = approvedEconomicInterventions[1]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[1].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[1].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[1].IncrementalIncome) || 0)
			: 0;
		const inc3 = approvedEconomicInterventions[2]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[2].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[2].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[2].IncrementalIncome) || 0)
			: 0;
		const inc4 = approvedEconomicInterventions[3]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[3].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[3].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[3].IncrementalIncome) || 0)
			: 0;

		const incrementalIncomes = [inc1, inc2, inc3, inc4];

		// Interventions
		let cumulativeIncome = data.familyInfo.BaselineFamilyIncome;
		for (let i = 0; i < 4; i++) {
			const incrementalIncome = incrementalIncomes[i] || 0;
			const intervention = data.interventions[i] || null;
			
			// Calculate incremental income per capita and % of self-sufficiency
			const incrementalIncomePerCapita = data.familyInfo.TotalMembers > 0 
				? incrementalIncome / data.familyInfo.TotalMembers 
				: 0;
			const incrementalIncomePercent = calculateSelfSufficiencyPercent(
				incrementalIncomePerCapita, 
				data.familyInfo.SelfSufficiencyIncomePerCapita
			);

			// Calculate cumulative income after this intervention
			cumulativeIncome += incrementalIncome;
			const cumulativePerCapita = data.familyInfo.TotalMembers > 0 
				? cumulativeIncome / data.familyInfo.TotalMembers 
				: 0;
			const cumulativePercent = calculateSelfSufficiencyPercent(cumulativePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
			const cumulativePovertyLevel = calculatePovertyLevel(cumulativePerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
			const cumulativeStatus = calculateSelfSufficiencyStatus(cumulativeIncome, selfSufficiencyTarget);

			// Incremental Income row
			pdf.setFillColor(230, 245, 255); // Light blue for incremental
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.setTextColor(0, 0, 0);
			pdf.text(`Incremental Income from Intervention ${i + 1}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			rightAlignText(intervention?.Investment ? formatCurrency(intervention.Investment) : '-', colWidths[1], xPos); // Investment
			xPos += colWidths[1];
			rightAlignText(incrementalIncome > 0 ? formatCurrency(incrementalIncome) : '-', colWidths[2], xPos); // Amount
			xPos += colWidths[2];
			rightAlignText(incrementalIncomePerCapita > 0 ? formatCurrency(incrementalIncomePerCapita) : '-', colWidths[3], xPos); // Per Capita
			xPos += colWidths[3];
			rightAlignText(incrementalIncome > 0 ? `${incrementalIncomePercent.toFixed(0)}%` : '-', colWidths[4], xPos); // % of Self-Sufficiency
			xPos += colWidths[4];
			xPos += colWidths[5]; // Skip Poverty Level
			xPos += colWidths[6]; // Skip Status
			yPos += 9;

			// Income after Intervention row
			pdf.setFillColor(240, 255, 240); // Light green for after intervention
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.text(`Income after Intervention ${i + 1}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('Calculated', xPos + 2, yPos + 5); // Investment column
			xPos += colWidths[1];
			rightAlignText(formatCurrency(cumulativeIncome), colWidths[2], xPos); // Amount
			xPos += colWidths[2];
			rightAlignText(formatCurrency(cumulativePerCapita), colWidths[3], xPos); // Per Capita
			xPos += colWidths[3];
			rightAlignText(`${cumulativePercent.toFixed(0)}%`, colWidths[4], xPos); // % of Self-Sufficiency
			xPos += colWidths[4];
			pdf.text(cumulativePovertyLevel, xPos + 2, yPos + 5); // Poverty Level (left align)
			xPos += colWidths[5];
			xPos += colWidths[6]; // Skip Status
			yPos += 9;

			// Self-Sufficiency Status row
			xPos = margin;
			pdf.setFillColor(255, 255, 255);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			pdf.text(`Self-Sufficiency Status`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			xPos += colWidths[1]; // Skip Investment column
			xPos += colWidths[2]; // Skip Amount column
			xPos += colWidths[3]; // Skip Per Capita column
			xPos += colWidths[4]; // Skip % column
			xPos += colWidths[5]; // Skip Poverty Level
			rightAlignText(formatCurrency(cumulativeStatus), colWidths[6], xPos); // Status
			yPos += 9;
		}

		// Total Investment
		const totalInvestment = data.interventions.slice(0, 4).reduce((sum, inv) => sum + (inv.Investment || 0), 0);
		pdf.setFillColor(255, 250, 205); // Light yellow
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		pdf.setFont('helvetica', 'bold');
		xPos = margin;
		pdf.text('Total Investment', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		rightAlignText(formatCurrency(totalInvestment), colWidths[1], xPos); // Investment column
		xPos += colWidths[1];
		xPos += colWidths[2]; // Skip Amount column
		xPos += colWidths[3]; // Skip Per Capita column
		xPos += colWidths[4]; // Skip % column
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 9;

		// Footer note
		pdf.setFont('helvetica', 'italic');
		pdf.setFontSize(8);
		pdf.setTextColor(100, 100, 100);
		pdf.text('* Investment refers to funding required from PE Program', margin, yPos + 5);

		// Save PDF
		pdf.save(`Planned_Self_Sufficiency_Status_${data.familyInfo.FamilyNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
	};


	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading Planned Self-Sufficiency Status...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Planned Self-Sufficiency Status</h1>
					</div>
				</div>
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
					{error}
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Planned Self-Sufficiency Status</h1>
					</div>
				</div>
				<div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
					No data available for this family.
				</div>
			</div>
		);
	}

	// Helper function to calculate incremental income from approved ECONOMIC interventions
	const calculateIncrementalIncome = () => {
		// Filter approved ECONOMIC interventions (already filtered by API, but ensure here too)
		const approvedEconomicInterventions = data.interventions
			.filter((inv) => {
				const interventionType = (inv.InterventionType || "").trim().toUpperCase();
				return interventionType === "ECONOMIC";
			})
			.slice(0, 4); // Take only first 4

		// Extract incremental income values for slots 1-4
		const inc1 = approvedEconomicInterventions[0]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[0].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[0].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[0].IncrementalIncome) || 0)
			: 0;
		
		const inc2 = approvedEconomicInterventions[1]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[1].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[1].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[1].IncrementalIncome) || 0)
			: 0;
		
		const inc3 = approvedEconomicInterventions[2]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[2].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[2].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[2].IncrementalIncome) || 0)
			: 0;
		
		const inc4 = approvedEconomicInterventions[3]?.IncrementalIncome != null
			? (typeof approvedEconomicInterventions[3].IncrementalIncome === 'number' 
				? approvedEconomicInterventions[3].IncrementalIncome 
				: parseFloat(approvedEconomicInterventions[3].IncrementalIncome) || 0)
			: 0;

		const totalIncrementalIncome = inc1 + inc2 + inc3 + inc4;

		return { inc1, inc2, inc3, inc4, totalIncrementalIncome };
	};

	const { inc1, inc2, inc3, inc4, totalIncrementalIncome } = calculateIncrementalIncome();

	// Calculate values
	const selfSufficiencyTarget = data.familyInfo.SelfSufficiencyIncomePerCapita * data.familyInfo.TotalMembers;
	const baselinePerCapita = data.familyInfo.TotalMembers > 0 
		? data.familyInfo.BaselineFamilyIncome / data.familyInfo.TotalMembers 
		: 0;
	const baselinePercent = calculateSelfSufficiencyPercent(baselinePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
	const baselinePovertyLevel = getPovertyLevel(baselinePercent);
	const baselineStatus = calculateSelfSufficiencyStatus(data.familyInfo.BaselineFamilyIncome, selfSufficiencyTarget);

	// Calculate cumulative values for each intervention
	let cumulativeIncome = data.familyInfo.BaselineFamilyIncome;
	const interventionRows: Array<{
		interventionNumber: number;
		investment: number;
		incrementalIncome: number;
		incrementalIncomePerCapita: number;
		incrementalIncomePercent: number; // % of Self-Sufficiency for incremental income
		incomeAfter: number;
		incomeAfterPerCapita: number;
		incomeAfterPercent: number;
		incomeAfterPovertyLevel: string;
		incomeAfterStatus: number;
		interventionType: string;
	}> = [];

	// Get approved economic interventions for investment values
	const approvedEconomicInterventions = data.interventions
		.filter((inv) => {
			const interventionType = (inv.InterventionType || "").trim().toUpperCase();
			return interventionType === "ECONOMIC";
		})
		.slice(0, 4);

	// Extract investment values for slots 1-4
	const investments = [
		approvedEconomicInterventions[0]?.Investment != null
			? (typeof approvedEconomicInterventions[0].Investment === 'number' 
				? approvedEconomicInterventions[0].Investment 
				: parseFloat(approvedEconomicInterventions[0].Investment) || 0)
			: 0,
		approvedEconomicInterventions[1]?.Investment != null
			? (typeof approvedEconomicInterventions[1].Investment === 'number' 
				? approvedEconomicInterventions[1].Investment 
				: parseFloat(approvedEconomicInterventions[1].Investment) || 0)
			: 0,
		approvedEconomicInterventions[2]?.Investment != null
			? (typeof approvedEconomicInterventions[2].Investment === 'number' 
				? approvedEconomicInterventions[2].Investment 
				: parseFloat(approvedEconomicInterventions[2].Investment) || 0)
			: 0,
		approvedEconomicInterventions[3]?.Investment != null
			? (typeof approvedEconomicInterventions[3].Investment === 'number' 
				? approvedEconomicInterventions[3].Investment 
				: parseFloat(approvedEconomicInterventions[3].Investment) || 0)
			: 0,
	];

	// Use the calculated incremental income values for slots 1-4
	const incrementalIncomes = [inc1, inc2, inc3, inc4];
	
	for (let i = 0; i < 4; i++) {
		const incrementalIncome = incrementalIncomes[i] || 0;
		const investment = investments[i] || 0;
		
		// Calculate incremental income per capita
		const incrementalIncomePerCapita = data.familyInfo.TotalMembers > 0 
			? incrementalIncome / data.familyInfo.TotalMembers 
			: 0;
		
		// Calculate % of Self-Sufficiency for incremental income
		const incrementalIncomePercent = calculateSelfSufficiencyPercent(
			incrementalIncomePerCapita, 
			data.familyInfo.SelfSufficiencyIncomePerCapita
		);
		
		// Calculate cumulative income after this intervention
		cumulativeIncome += incrementalIncome;
		const cumulativePerCapita = data.familyInfo.TotalMembers > 0 
			? cumulativeIncome / data.familyInfo.TotalMembers 
			: 0;
		const cumulativePercent = calculateSelfSufficiencyPercent(cumulativePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const cumulativePovertyLevel = getPovertyLevel(cumulativePercent);
		const cumulativeStatus = calculateSelfSufficiencyStatus(cumulativeIncome, selfSufficiencyTarget);

		interventionRows.push({
			interventionNumber: i + 1,
			investment: investment,
			incrementalIncome: incrementalIncome,
			incrementalIncomePerCapita: incrementalIncomePerCapita,
			incrementalIncomePercent: incrementalIncomePercent,
			incomeAfter: cumulativeIncome,
			incomeAfterPerCapita: cumulativePerCapita,
			incomeAfterPercent: cumulativePercent,
			incomeAfterPovertyLevel: cumulativePovertyLevel,
			incomeAfterStatus: cumulativeStatus,
			interventionType: "Economic",
		});
	}

	const totalInvestment = investments.reduce((sum, inv) => sum + (inv || 0), 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Planned Self-Sufficiency Status</h1>
						<p className="text-gray-600 mt-2">
							{formNumber && <span>Form Number: {formNumber}</span>}
						</p>
					</div>
				</div>
				<button
					onClick={downloadPDF}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
				>
					<Download className="h-4 w-4" />
					Download PDF
				</button>
			</div>

			{/* Family Information */}
			<div className="bg-gradient-to-r from-[#0b4d2b] to-[#0a3d22] rounded-lg shadow-lg p-6 text-white">
				<h2 className="text-xl font-semibold mb-4">Family Information</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p className="text-sm opacity-90">Family Number</p>
						<p className="text-lg font-bold">{data.familyInfo.FamilyNumber || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Head Name</p>
						<p className="text-lg font-bold">{data.familyInfo.HeadName || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Regional Council</p>
						<p className="text-lg font-bold">{data.familyInfo.RegionalCouncil || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Local Community</p>
						<p className="text-lg font-bold">{data.familyInfo.LocalCommunity || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Area Type</p>
						<p className="text-lg font-bold">{data.familyInfo.AreaType || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Baseline Income Level</p>
						<p className="text-lg font-bold">{data.familyInfo.BaselineIncomeLevel || "-"}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Total Members</p>
						<p className="text-lg font-bold">{data.familyInfo.TotalMembers || 0}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Mentor</p>
						<p className="text-lg font-bold">{data.familyInfo.Mentor || "-"}</p>
					</div>
				</div>
			</div>

			{/* FDP Economic Development - Planned Self-Sufficiency Status Table */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				<div className="bg-[#0b4d2b] text-white px-6 py-4">
					<h2 className="text-xl font-semibold">FDP Economic Development</h2>
					<p className="text-sm opacity-90 mt-1">Planned Self-Sufficiency Status:</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Label</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Investment *</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Per Capita</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">% of Self-Sufficiency</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Poverty Level</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{/* Self-Sufficiency Income Required Per Capita PM */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Self-Sufficiency Income Required Per Capita PM</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNumber(data.familyInfo.SelfSufficiencyIncomePerCapita)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">100%</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Number of family members */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Number of family members</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{data.familyInfo.TotalMembers}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Self-Sufficiency Income Target */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Self-Sufficiency Income Target</td>
								<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNumber(selfSufficiencyTarget)}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Baseline Income */}
							<tr className="bg-orange-50 border-l-4 border-orange-400">
								<td className="px-4 py-3 text-sm font-medium text-gray-900">Baseline Income PM</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNumber(data.familyInfo.BaselineFamilyIncome)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNumber(baselinePerCapita)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPercent(baselinePercent)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-orange-600">{getPovertyLevel(baselinePercent)}</td>
							</tr>
							{/* Self-Sufficiency Status */}
							<tr>
								<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
								<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
								<td className={`px-4 py-3 text-sm font-semibold ${baselineStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
									{formatStatusParen(baselineStatus)}
								</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Interventions */}
							{interventionRows.map((row, index) => (
								<React.Fragment key={index}>
									{/* Incremental Income */}
									<tr className={row.investment > 0 || row.incrementalIncome > 0 ? "bg-blue-50 border-l-4 border-blue-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm text-gray-900">
											Incremental Income from Intervention {row.interventionNumber}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.investment > 0 ? formatNumber(row.investment) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.incrementalIncome > 0 ? formatNumber(row.incrementalIncome) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.incrementalIncome > 0 ? formatNumber(row.incrementalIncomePerCapita) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.incrementalIncome > 0 ? formatPercent(row.incrementalIncomePercent) : "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
									</tr>
									{/* Income after Intervention */}
									<tr className={row.investment > 0 ? "bg-green-50 border-l-4 border-green-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm font-medium text-gray-900">
											Income after Intervention {row.interventionNumber}
										</td>
										<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
										<td className="px-4 py-3 text-sm font-bold bg-yellow-50 text-gray-900">{formatNumber(row.incomeAfter)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNumber(row.incomeAfterPerCapita)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPercent(row.incomeAfterPercent)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-green-600">{row.incomeAfterPovertyLevel}</td>
									</tr>
									{/* Self-Sufficiency Status */}
									<tr>
										<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
										<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
										<td className={`px-4 py-3 text-sm font-semibold ${row.incomeAfterStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
											{formatStatusParen(row.incomeAfterStatus)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
									</tr>
								</React.Fragment>
							))}
							{/* Total Investment */}
							<tr className="bg-yellow-50 border-l-4 border-yellow-400">
								<td className="px-4 py-3 text-sm font-bold text-gray-900">Total Investment</td>
								<td className="px-4 py-3 text-sm font-bold text-gray-900">{formatNumber(totalInvestment)}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
					<p className="text-xs text-gray-600 italic">* Investment refers to funding required from PE Program</p>
				</div>
			</div>
		</div>
	);
}

export default function PlannedSelfSufficiencyPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<PlannedSelfSufficiencyContent />
		</Suspense>
	);
}

