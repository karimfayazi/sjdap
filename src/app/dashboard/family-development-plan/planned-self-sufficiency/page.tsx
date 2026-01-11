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

	// Calculate poverty level
	const calculatePovertyLevel = (perCapitaIncome: number, areaType: string, selfSufficiencyIncome?: number): string => {
		// If per capita income is at or above self-sufficiency level, return "Nil"
		if (selfSufficiencyIncome && perCapitaIncome >= selfSufficiencyIncome) {
			return "Nil";
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

	// Calculate % of self-sufficiency
	const calculateSelfSufficiencyPercent = (perCapitaIncome: number, selfSufficiencyIncome: number): number => {
		if (selfSufficiencyIncome <= 0) return 0;
		return (perCapitaIncome / selfSufficiencyIncome) * 100;
	};

	// Calculate self-sufficiency status (difference)
	const calculateSelfSufficiencyStatus = (totalIncome: number, selfSufficiencyTarget: number): number => {
		return totalIncome - selfSufficiencyTarget;
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

	const formatCurrency = (value: number): string => {
		return value.toLocaleString();
	};

	const formatNumber = (value: number | null | undefined): string => {
		if (value === null || value === undefined) return "-";
		return value.toLocaleString();
	};

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
		const colWidths = [45, 35, 25, 25, 25, 25];
		const headers = ['Investment *', 'Amount', 'Per Capita', '% of Self-Sufficiency', 'Poverty Level', 'Status'];
		let xPos = margin;

		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 8, 'F');
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'bold');

		headers.forEach((header, i) => {
			pdf.text(header, xPos + 2, yPos + 6);
			xPos += colWidths[i];
		});

		yPos += 8;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		// Self-Sufficiency Income Required Per Capita
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(9);
		xPos = margin;
		pdf.text('Self-Sufficiency Income Required Per Capita PM', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		pdf.text('', xPos + 2, yPos + 5); // Amount
		xPos += colWidths[1];
		pdf.text(formatCurrency(data.familyInfo.SelfSufficiencyIncomePerCapita), xPos + 2, yPos + 5);
		xPos += colWidths[2];
		pdf.text('100%', xPos + 2, yPos + 5);
		xPos += colWidths[3];
		pdf.text('', xPos + 2, yPos + 5); // Poverty Level
		xPos += colWidths[4];
		pdf.text('', xPos + 2, yPos + 5); // Status
		yPos += 7;

		// Number of family members
		xPos = margin;
		pdf.text('Number of family members', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[1];
		pdf.text(data.familyInfo.TotalMembers.toString(), xPos + 2, yPos + 5);
		xPos += colWidths[2];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[3];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[4];
		pdf.text('', xPos + 2, yPos + 5);
		yPos += 7;

		// Self-Sufficiency Income Target
		const selfSufficiencyTarget = data.familyInfo.SelfSufficiencyIncomePerCapita * data.familyInfo.TotalMembers;
		xPos = margin;
		pdf.text('Self-Sufficiency Income Target', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		pdf.text('Calculated', xPos + 2, yPos + 5);
		xPos += colWidths[1];
		pdf.text(formatCurrency(selfSufficiencyTarget), xPos + 2, yPos + 5);
		xPos += colWidths[2];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[3];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[4];
		pdf.text('', xPos + 2, yPos + 5);
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
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[1];
		pdf.text(formatCurrency(data.familyInfo.BaselineFamilyIncome), xPos + 2, yPos + 5);
		xPos += colWidths[2];
		pdf.text(formatCurrency(baselinePerCapita), xPos + 2, yPos + 5);
		xPos += colWidths[3];
		pdf.text(`${baselinePercent.toFixed(0)}%`, xPos + 2, yPos + 5);
		xPos += colWidths[4];
		pdf.text(baselinePovertyLevel, xPos + 2, yPos + 5);
		xPos += colWidths[5];
		pdf.text(formatCurrency(baselineStatus), xPos + 2, yPos + 5);
		yPos += 9;

		// Interventions
		let cumulativeIncome = data.familyInfo.BaselineFamilyIncome;
		data.interventions.forEach((intervention, index) => {
			cumulativeIncome += intervention.IncrementalIncome;
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
			pdf.text(`Incremental Income from Intervention ${intervention.InterventionNumber}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text(formatCurrency(intervention.Investment), xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text(formatCurrency(intervention.IncrementalIncome), xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text(formatCurrency(intervention.IncrementalIncomePerCapita), xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text('', xPos + 2, yPos + 5);
			yPos += 9;

			// Income after Intervention row
			pdf.setFillColor(240, 255, 240); // Light green for after intervention
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.text(`Income after Intervention ${intervention.InterventionNumber}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('Calculated', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text(formatCurrency(cumulativeIncome), xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text(formatCurrency(cumulativePerCapita), xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text(`${cumulativePercent.toFixed(0)}%`, xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text(cumulativePovertyLevel, xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text(formatCurrency(cumulativeStatus), xPos + 2, yPos + 5);
			yPos += 9;

			// Self-Sufficiency Status row
			xPos = margin;
			pdf.setFillColor(255, 255, 255);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			pdf.text(`Self-Sufficiency Status`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text(formatCurrency(cumulativeStatus), xPos + 2, yPos + 5);
			yPos += 9;
		});

		// Fill remaining interventions with "-"
		for (let i = data.interventions.length; i < 4; i++) {
			// Incremental Income row
			pdf.setFillColor(245, 245, 245);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.text(`Incremental Income from Intervention ${i + 1}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('-', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text('-', xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text('-', xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text('', xPos + 2, yPos + 5);
			yPos += 9;

			// Income after Intervention row (use last cumulative values)
			const lastCumulativeIncome = data.interventions.length > 0 
				? data.familyInfo.BaselineFamilyIncome + data.interventions.reduce((sum, inv) => sum + inv.IncrementalIncome, 0)
				: data.familyInfo.BaselineFamilyIncome;
			const lastCumulativePerCapita = data.familyInfo.TotalMembers > 0 
				? lastCumulativeIncome / data.familyInfo.TotalMembers 
				: 0;
			const lastCumulativePercent = calculateSelfSufficiencyPercent(lastCumulativePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
			const lastCumulativePovertyLevel = calculatePovertyLevel(lastCumulativePerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
			const lastCumulativeStatus = calculateSelfSufficiencyStatus(lastCumulativeIncome, selfSufficiencyTarget);

			pdf.setFillColor(240, 255, 240);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.text(`Income after Intervention ${i + 1}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('Calculated', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text(formatCurrency(lastCumulativeIncome), xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text(formatCurrency(lastCumulativePerCapita), xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text(`${lastCumulativePercent.toFixed(0)}%`, xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text(lastCumulativePovertyLevel, xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text(formatCurrency(lastCumulativeStatus), xPos + 2, yPos + 5);
			yPos += 9;

			// Self-Sufficiency Status row
			xPos = margin;
			pdf.setFillColor(255, 255, 255);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			pdf.text(`Self-Sufficiency Status`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[2];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[3];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[4];
			pdf.text('', xPos + 2, yPos + 5);
			xPos += colWidths[5];
			pdf.text(formatCurrency(lastCumulativeStatus), xPos + 2, yPos + 5);
			yPos += 9;
		}

		// Total Investment
		const totalInvestment = data.interventions.reduce((sum, inv) => sum + inv.Investment, 0);
		pdf.setFillColor(255, 250, 205); // Light yellow
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		pdf.setFont('helvetica', 'bold');
		xPos = margin;
		pdf.text('Total Investment', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		pdf.text(formatCurrency(totalInvestment), xPos + 2, yPos + 5);
		xPos += colWidths[1];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[2];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[3];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[4];
		pdf.text('', xPos + 2, yPos + 5);
		xPos += colWidths[5];
		pdf.text('', xPos + 2, yPos + 5);
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

	// Calculate values
	const selfSufficiencyTarget = data.familyInfo.SelfSufficiencyIncomePerCapita * data.familyInfo.TotalMembers;
	const baselinePerCapita = data.familyInfo.TotalMembers > 0 
		? data.familyInfo.BaselineFamilyIncome / data.familyInfo.TotalMembers 
		: 0;
	const baselinePercent = calculateSelfSufficiencyPercent(baselinePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
	const baselinePovertyLevel = calculatePovertyLevel(baselinePerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
	const baselineStatus = calculateSelfSufficiencyStatus(data.familyInfo.BaselineFamilyIncome, selfSufficiencyTarget);

	// Calculate cumulative values for each intervention
	let cumulativeIncome = data.familyInfo.BaselineFamilyIncome;
	const interventionRows: Array<{
		interventionNumber: number;
		investment: number;
		incrementalIncome: number;
		incrementalIncomePerCapita: number;
		incomeAfter: number;
		incomeAfterPerCapita: number;
		incomeAfterPercent: number;
		incomeAfterPovertyLevel: string;
		incomeAfterStatus: number;
		interventionType: string;
	}> = [];

	data.interventions.forEach((intervention) => {
		cumulativeIncome += intervention.IncrementalIncome;
		const cumulativePerCapita = data.familyInfo.TotalMembers > 0 
			? cumulativeIncome / data.familyInfo.TotalMembers 
			: 0;
		const cumulativePercent = calculateSelfSufficiencyPercent(cumulativePerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const cumulativePovertyLevel = calculatePovertyLevel(cumulativePerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const cumulativeStatus = calculateSelfSufficiencyStatus(cumulativeIncome, selfSufficiencyTarget);

		interventionRows.push({
			interventionNumber: intervention.InterventionNumber,
			investment: intervention.Investment,
			incrementalIncome: intervention.IncrementalIncome,
			incrementalIncomePerCapita: intervention.IncrementalIncomePerCapita,
			incomeAfter: cumulativeIncome,
			incomeAfterPerCapita: cumulativePerCapita,
			incomeAfterPercent: cumulativePercent,
			incomeAfterPovertyLevel: cumulativePovertyLevel,
			incomeAfterStatus: cumulativeStatus,
			interventionType: intervention.InterventionType,
		});
	});

	// Fill remaining interventions (up to 4)
	while (interventionRows.length < 4) {
		const lastIncome = interventionRows.length > 0 
			? interventionRows[interventionRows.length - 1].incomeAfter
			: data.familyInfo.BaselineFamilyIncome;
		const lastPerCapita = data.familyInfo.TotalMembers > 0 
			? lastIncome / data.familyInfo.TotalMembers 
			: 0;
		const lastPercent = calculateSelfSufficiencyPercent(lastPerCapita, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const lastPovertyLevel = calculatePovertyLevel(lastPerCapita, data.familyInfo.AreaType, data.familyInfo.SelfSufficiencyIncomePerCapita);
		const lastStatus = calculateSelfSufficiencyStatus(lastIncome, selfSufficiencyTarget);

		interventionRows.push({
			interventionNumber: interventionRows.length + 1,
			investment: 0,
			incrementalIncome: 0,
			incrementalIncomePerCapita: 0,
			incomeAfter: lastIncome,
			incomeAfterPerCapita: lastPerCapita,
			incomeAfterPercent: lastPercent,
			incomeAfterPovertyLevel: lastPovertyLevel,
			incomeAfterStatus: lastStatus,
			interventionType: "",
		});
	}

	const totalInvestment = data.interventions.reduce((sum, inv) => sum + inv.Investment, 0);

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
				</div>
			</div>

			{/* Planned Self-Sufficiency Status Table */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				<div className="bg-[#0b4d2b] text-white px-6 py-4">
					<h2 className="text-xl font-semibold">Planned Self-Sufficiency Status</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Investment *</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Per Capita</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">% of Self-Sufficiency</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Poverty Level</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{/* Self-Sufficiency Income Required Per Capita PM */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Self-Sufficiency Income Required Per Capita PM</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(data.familyInfo.SelfSufficiencyIncomePerCapita)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">100%</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
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
								<td className="px-4 py-3 text-sm font-semibold text-blue-600">Calculated</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(selfSufficiencyTarget)}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Baseline Income */}
							<tr className="bg-orange-50 border-l-4 border-orange-400">
								<td className="px-4 py-3 text-sm font-medium text-gray-900">Baseline Income PM</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(data.familyInfo.BaselineFamilyIncome)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(baselinePerCapita)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{baselinePercent.toFixed(0)}%</td>
								<td className="px-4 py-3 text-sm font-semibold text-orange-600">{baselinePovertyLevel}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(baselineStatus)}</td>
							</tr>
							{/* Self-Sufficiency Status */}
							<tr>
								<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(baselineStatus)}</td>
							</tr>
							{/* Interventions */}
							{interventionRows.map((row, index) => (
								<React.Fragment key={index}>
									{/* Incremental Income */}
									<tr className={row.investment > 0 ? "bg-blue-50 border-l-4 border-blue-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm text-gray-900">
											Incremental Income from Intervention {row.interventionNumber}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.investment > 0 ? formatCurrency(row.investment) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.incrementalIncome > 0 ? formatCurrency(row.incrementalIncome) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">
											{row.incrementalIncomePerCapita > 0 ? formatCurrency(row.incrementalIncomePerCapita) : "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
									</tr>
									{/* Income after Intervention */}
									<tr className={row.investment > 0 ? "bg-green-50 border-l-4 border-green-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm font-medium text-gray-900">
											Income after Intervention {row.interventionNumber}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-green-600">Calculated</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(row.incomeAfter)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(row.incomeAfterPerCapita)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.incomeAfterPercent.toFixed(0)}%</td>
										<td className="px-4 py-3 text-sm font-semibold text-green-600">{row.incomeAfterPovertyLevel === "Nil" ? "Nil" : row.incomeAfterPovertyLevel}</td>
									</tr>
									{/* Self-Sufficiency Status */}
									<tr>
										<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(row.incomeAfterStatus)}</td>
									</tr>
								</React.Fragment>
							))}
							{/* Total Investment */}
							<tr className="bg-yellow-50 border-l-4 border-yellow-400">
								<td className="px-4 py-3 text-sm font-bold text-gray-900">Total Investment</td>
								<td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(totalInvestment)}</td>
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

