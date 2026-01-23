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
	TotalMembers: number;
	Mentor?: string | null;
};

type PlannedSelfSufficiencyData = {
	familyInfo: FamilyInfo;
	requiredPerCapitaPM: number;
	familyMembers: number;
	targetIncomePM: number;
	baselineIncomePM: number;
	baseline: {
		perCapita: number;
		percent: number;
		povertyLevel: string;
		ssStatus: number;
	};
	interventions: Array<{
		idx: number;
		investment: number;
		incrementalIncome: number;
		incomeAfter: number;
		perCapita: number;
		percent: number;
		povertyLevel: string;
		ssStatus: number;
	}>;
	totalInvestment: number;
};

function PlannedSelfSufficiencyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");

	const [data, setData] = useState<PlannedSelfSufficiencyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Helper function: Format number with commas (no decimals)
	const formatNumber = (value: number | null | undefined): string => {
		if (value === null || value === undefined || isNaN(value)) return "-";
		const roundedValue = Math.round(value);
		return roundedValue.toLocaleString();
	};

	// Helper function: Format percent (2 decimals)
	const formatPercent = (value: number | null | undefined): string => {
		if (value === null || value === undefined || isNaN(value)) return "-";
		return `${(value * 100).toFixed(2)}%`;
	};

	// Helper function: Format status with parentheses for negative values
	const formatStatusParen = (value: number): string => {
		if (value < 0) {
			return `(${formatNumber(Math.abs(value))})`;
		}
		return formatNumber(value);
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
					setData(result);
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
			{ label: 'Family Number', value: data.familyInfo.FamilyNumber || 'N/A' },
			{ label: 'Head Name', value: data.familyInfo.HeadName || 'N/A' },
			{ label: 'Regional Council', value: data.familyInfo.RegionalCouncil || 'N/A' },
			{ label: 'Local Community', value: data.familyInfo.LocalCommunity || 'N/A' },
			{ label: 'Area Type', value: data.familyInfo.AreaType || 'N/A' },
			{ label: 'Total Members', value: data.familyInfo.TotalMembers?.toString() || '0' },
			{ label: 'Mentor', value: data.familyInfo.Mentor || 'N/A' },
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

		// Table Headers
		const colWidths = [50, 28, 28, 25, 30, 25, 25];
		const headers = ['Label', 'Investment', 'Amount', 'Per Capita', '% of Self-Sufficiency', 'Poverty Level', 'Status'];
		let xPos = margin;

		pdf.setFillColor(240, 240, 240);
		pdf.rect(margin, yPos, contentWidth, 8, 'F');
		pdf.setTextColor(0, 0, 0);
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'bold');

		headers.forEach((header, i) => {
			const textWidth = pdf.getTextWidth(header);
			pdf.text(header, xPos + (colWidths[i] - textWidth) / 2, yPos + 6);
			xPos += colWidths[i];
		});

		yPos += 8;
		pdf.setDrawColor(200, 200, 200);
		pdf.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 5;

		// Helper function to right-align text
		const rightAlignText = (text: string, colWidth: number, xPos: number): void => {
			const textWidth = pdf.getTextWidth(text);
			pdf.text(text, xPos + colWidth - textWidth - 2, yPos + 5);
		};

		// Self-Sufficiency Income Required Per Capita PM
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(9);
		xPos = margin;
		pdf.text('Self-Sufficiency Income Required Per Capita PM', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment
		xPos += colWidths[2]; // Skip Amount
		rightAlignText(formatNumber(data.requiredPerCapitaPM), colWidths[3], xPos);
		xPos += colWidths[3];
		rightAlignText('100.00%', colWidths[4], xPos);
		xPos += colWidths[4];
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Number of family members
		xPos = margin;
		pdf.text('Number of family members', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment
		rightAlignText(data.familyMembers.toString(), colWidths[2], xPos);
		xPos += colWidths[2];
		xPos += colWidths[3]; // Skip Per Capita
		xPos += colWidths[4]; // Skip %
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Self-Sufficiency Income Target
		xPos = margin;
		pdf.text('Self-Sufficiency Income Target', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		pdf.text('Calculated', xPos + 2, yPos + 5);
		xPos += colWidths[1];
		rightAlignText(formatNumber(data.targetIncomePM), colWidths[2], xPos);
		xPos += colWidths[2];
		xPos += colWidths[3]; // Skip Per Capita
		xPos += colWidths[4]; // Skip %
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 7;

		// Baseline Income PM
		pdf.setFillColor(255, 245, 230); // Light orange
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		xPos = margin;
		pdf.setTextColor(0, 0, 0);
		pdf.text('Baseline Income PM', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment
		rightAlignText(formatNumber(data.baselineIncomePM), colWidths[2], xPos);
		xPos += colWidths[2];
		rightAlignText(formatNumber(data.baseline.perCapita), colWidths[3], xPos);
		xPos += colWidths[3];
		rightAlignText(formatPercent(data.baseline.percent), colWidths[4], xPos);
		xPos += colWidths[4];
		pdf.text(data.baseline.povertyLevel, xPos + 2, yPos + 5);
		xPos += colWidths[5];
		rightAlignText(formatStatusParen(data.baseline.ssStatus), colWidths[6], xPos);
		yPos += 9;

		// Self-Sufficiency Status (Baseline)
		xPos = margin;
		pdf.setFillColor(255, 255, 255);
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		pdf.text('Self-Sufficiency Status', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		xPos += colWidths[1]; // Skip Investment
		xPos += colWidths[2]; // Skip Amount
		xPos += colWidths[3]; // Skip Per Capita
		xPos += colWidths[4]; // Skip %
		xPos += colWidths[5]; // Skip Poverty Level
		rightAlignText(formatStatusParen(data.baseline.ssStatus), colWidths[6], xPos);
		yPos += 9;

		// Interventions
		for (let i = 0; i < 4; i++) {
			const inv = data.interventions[i];

			// Incremental Income from Intervention
			pdf.setFillColor(230, 245, 255); // Light blue
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.setTextColor(0, 0, 0);
			pdf.text(`Incremental Income from Intervention ${inv.idx}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			rightAlignText(inv.investment > 0 ? formatNumber(inv.investment) : '-', colWidths[1], xPos);
			xPos += colWidths[1];
			rightAlignText(inv.incrementalIncome > 0 ? formatNumber(inv.incrementalIncome) : '-', colWidths[2], xPos);
			xPos += colWidths[2];
			rightAlignText(inv.incrementalIncome > 0 ? formatNumber(inv.incrementalIncome / data.familyMembers) : '-', colWidths[3], xPos);
			xPos += colWidths[3];
			rightAlignText(inv.incrementalIncome > 0 ? formatPercent((inv.incrementalIncome / data.familyMembers) / data.requiredPerCapitaPM) : '-', colWidths[4], xPos);
			xPos += colWidths[4];
			xPos += colWidths[5]; // Skip Poverty Level
			xPos += colWidths[6]; // Skip Status
			yPos += 9;

			// Income after Intervention
			pdf.setFillColor(240, 255, 240); // Light green
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			xPos = margin;
			pdf.text(`Income after Intervention ${inv.idx}`, xPos + 2, yPos + 5);
			xPos += colWidths[0];
			pdf.text('Calculated', xPos + 2, yPos + 5);
			xPos += colWidths[1];
			rightAlignText(formatNumber(inv.incomeAfter), colWidths[2], xPos);
			xPos += colWidths[2];
			rightAlignText(formatNumber(inv.perCapita), colWidths[3], xPos);
			xPos += colWidths[3];
			rightAlignText(formatPercent(inv.percent), colWidths[4], xPos);
			xPos += colWidths[4];
			pdf.text(inv.povertyLevel, xPos + 2, yPos + 5);
			xPos += colWidths[5];
			rightAlignText(formatStatusParen(inv.ssStatus), colWidths[6], xPos);
			yPos += 9;

			// Self-Sufficiency Status
			xPos = margin;
			pdf.setFillColor(255, 255, 255);
			pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
			pdf.text('Self-Sufficiency Status', xPos + 2, yPos + 5);
			xPos += colWidths[0];
			xPos += colWidths[1]; // Skip Investment
			xPos += colWidths[2]; // Skip Amount
			xPos += colWidths[3]; // Skip Per Capita
			xPos += colWidths[4]; // Skip %
			xPos += colWidths[5]; // Skip Poverty Level
			rightAlignText(formatStatusParen(inv.ssStatus), colWidths[6], xPos);
			yPos += 9;
		}

		// Total Investment
		pdf.setFillColor(255, 250, 205); // Light yellow
		pdf.rect(margin, yPos - 2, contentWidth, 7, 'F');
		pdf.setFont('helvetica', 'bold');
		xPos = margin;
		pdf.text('Total Investment', xPos + 2, yPos + 5);
		xPos += colWidths[0];
		rightAlignText(formatNumber(data.totalInvestment), colWidths[1], xPos);
		xPos += colWidths[1];
		xPos += colWidths[2]; // Skip Amount
		xPos += colWidths[3]; // Skip Per Capita
		xPos += colWidths[4]; // Skip %
		xPos += colWidths[5]; // Skip Poverty Level
		xPos += colWidths[6]; // Skip Status
		yPos += 9;

		// Footer note
		pdf.setFont('helvetica', 'italic');
		pdf.setFontSize(8);
		pdf.setTextColor(100, 100, 100);
		pdf.text('* Investment refers to funding required from PE Program', margin, yPos + 5);

		// Save PDF
		pdf.save(`Planned_Self_Sufficiency_Status_${formNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
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
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
						<p className="text-sm opacity-90">Total Members</p>
						<p className="text-lg font-bold">{data.familyInfo.TotalMembers || 0}</p>
					</div>
					<div>
						<p className="text-sm opacity-90">Mentor</p>
						<p className="text-lg font-bold">{data.familyInfo.Mentor || "-"}</p>
					</div>
				</div>
				
				{/* Summary Section */}
				<div className="border-t border-white/20 pt-4 mt-4">
					<h3 className="text-lg font-semibold mb-4">Summary</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
						<div>
							<p className="text-sm opacity-90">Required Per Capita PM</p>
							<p className="text-lg font-bold">{formatNumber(data.requiredPerCapitaPM)}</p>
						</div>
						<div>
							<p className="text-sm opacity-90">Family Members</p>
							<p className="text-lg font-bold">{data.familyMembers}</p>
						</div>
						<div>
							<p className="text-sm opacity-90">Target Income PM</p>
							<p className="text-lg font-bold">{formatNumber(data.targetIncomePM)}</p>
						</div>
						<div>
							<p className="text-sm opacity-90">Baseline Income PM</p>
							<p className="text-lg font-bold">{formatNumber(data.baselineIncomePM)}</p>
						</div>
						<div>
							<p className="text-sm opacity-90">Baseline %</p>
							<p className="text-lg font-bold">{formatPercent(data.baseline.percent)}</p>
						</div>
						<div>
							<p className="text-sm opacity-90">Baseline Poverty Level</p>
							<p className="text-lg font-bold">{data.baseline.povertyLevel}</p>
						</div>
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
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Label</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Investment *</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Per Capita</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">% of Self-Sufficiency</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Poverty Level</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Self-Sufficiency Status</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{/* Self-Sufficiency Income Required Per Capita PM */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Self-Sufficiency Income Required Per Capita PM</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatNumber(data.requiredPerCapitaPM)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">100.00%</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Number of family members */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Number of family members</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{data.familyMembers}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Self-Sufficiency Income Target */}
							<tr className="bg-blue-50">
								<td className="px-4 py-3 text-sm text-gray-900">Self-Sufficiency Income Target</td>
								<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatNumber(data.targetIncomePM)}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
							</tr>
							{/* Baseline Income PM */}
							<tr className="bg-orange-50 border-l-4 border-orange-400">
								<td className="px-4 py-3 text-sm font-medium text-gray-900">Baseline Income PM</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatNumber(data.baselineIncomePM)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatNumber(data.baseline.perCapita)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatPercent(data.baseline.percent)}</td>
								<td className="px-4 py-3 text-sm font-semibold text-orange-600">{data.baseline.povertyLevel}</td>
								<td className={`px-4 py-3 text-sm font-semibold text-right ${data.baseline.ssStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
									{formatStatusParen(data.baseline.ssStatus)}
								</td>
							</tr>
							{/* Self-Sufficiency Status (Baseline) */}
							<tr>
								<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
								<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
								<td className={`px-4 py-3 text-sm font-semibold text-right ${data.baseline.ssStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
									{formatStatusParen(data.baseline.ssStatus)}
								</td>
							</tr>
							{/* Interventions */}
							{data.interventions.map((inv) => (
								<React.Fragment key={inv.idx}>
									{/* Incremental Income */}
									<tr className={inv.investment > 0 || inv.incrementalIncome > 0 ? "bg-blue-50 border-l-4 border-blue-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm text-gray-900">
											Incremental Income from Intervention {inv.idx}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
											{inv.investment > 0 ? formatNumber(inv.investment) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
											{inv.incrementalIncome > 0 ? formatNumber(inv.incrementalIncome) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
											{inv.incrementalIncome > 0 ? formatNumber(inv.incrementalIncome / data.familyMembers) : "-"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
											{inv.incrementalIncome > 0 ? formatPercent((inv.incrementalIncome / data.familyMembers) / data.requiredPerCapitaPM) : "-"}
										</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
									</tr>
									{/* Income after Intervention */}
									<tr className={inv.investment > 0 ? "bg-green-50 border-l-4 border-green-400" : "bg-gray-50"}>
										<td className="px-4 py-3 text-sm font-medium text-gray-900">
											Income after Intervention {inv.idx}
										</td>
										<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
										<td className="px-4 py-3 text-sm font-bold bg-yellow-50 text-gray-900 text-right">{formatNumber(inv.incomeAfter)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatNumber(inv.perCapita)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatPercent(inv.percent)}</td>
										<td className="px-4 py-3 text-sm font-semibold text-green-600">{inv.povertyLevel}</td>
										<td className={`px-4 py-3 text-sm font-semibold text-right ${inv.ssStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
											{formatStatusParen(inv.ssStatus)}
										</td>
									</tr>
									{/* Self-Sufficiency Status */}
									<tr>
										<td className="px-4 py-3 text-sm text-gray-700">Self-Sufficiency Status</td>
										<td className="px-4 py-3 text-sm font-semibold bg-yellow-50 text-green-600">Calculated</td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className="px-4 py-3 text-sm text-gray-700"></td>
										<td className={`px-4 py-3 text-sm font-semibold text-right ${inv.ssStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
											{formatStatusParen(inv.ssStatus)}
										</td>
									</tr>
								</React.Fragment>
							))}
							{/* Total Investment */}
							<tr className="bg-yellow-50 border-l-4 border-yellow-400">
								<td className="px-4 py-3 text-sm font-bold text-gray-900">Total Investment</td>
								<td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatNumber(data.totalInvestment)}</td>
								<td className="px-4 py-3 text-sm text-gray-700"></td>
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
