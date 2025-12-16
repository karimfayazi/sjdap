"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText, Download } from "lucide-react";

type QOLBaselineData = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	CNIC: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
	POVERTY_LEVEL: string | null;
};

type FamilyMember = {
	FAMILY_ID: string | null;
	MEMBER_ID: string | null;
	FULL_NAME: string | null;
	CNIC: string | null;
	RELATION: string | null;
	GENDER: string | null;
	AGE: number | null;
	MARITAL_STATUS: string | null;
	OCCUPATION: string | null;
	CURRENT_EDUCATION: string | null;
	HIGHEST_QLF: string | null;
	EARNING_SOURCE: string | null;
	MONTHLY_INCOME: number | null;
};

export default function QOLBaselineFamilyDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const familyId = params.familyId as string;

	const [familyData, setFamilyData] = useState<QOLBaselineData | null>(null);
	const [members, setMembers] = useState<FamilyMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUser, setCurrentUser] = useState<string | null>(null);

	useEffect(() => {
		if (familyId) {
			fetchFamilyData();
			fetchFamilyMembers();
			fetchCurrentUser();
		}
	}, [familyId]);

	const fetchCurrentUser = async () => {
		try {
			const response = await fetch('/api/user-info');
			const data = await response.json();
			if (data.success && data.user) {
				setCurrentUser(data.user.name || data.user.USER_FULL_NAME || "Unknown User");
			}
		} catch (err) {
			console.error("Error fetching user info:", err);
		}
	};

	const fetchFamilyData = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`/api/qol-baseline-data?familyId=${encodeURIComponent(familyId)}`);
			const data = await response.json();

			if (data.success && data.families && data.families.length > 0) {
				setFamilyData(data.families[0]);
			} else {
				setError("Family not found");
			}
		} catch (err) {
			setError("Error fetching family data");
			console.error("Error fetching family data:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchFamilyMembers = async () => {
		try {
			const response = await fetch(`/api/family-members?familyId=${encodeURIComponent(familyId)}`);
			const data = await response.json();

			if (data.success) {
				setMembers(data.members || []);
			}
		} catch (err) {
			console.error("Error fetching family members:", err);
		}
	};

	const formatNumber = (value: number | null) => {
		if (value === null || value === undefined) return "N/A";
		return value.toLocaleString();
	};

	const downloadPDF = () => {
		if (!familyData) return;

		// Create a new window for PDF content
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		// Format the data for display
		const formatFieldName = (key: string) => {
			return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
		};

		const formatValue = (value: any) => {
			if (value === null || value === undefined) return "N/A";
			if (typeof value === 'number') return formatNumber(value);
			return String(value);
		};

		const downloadDate = new Date().toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});

		const currentUserName = currentUser || "Unknown User";

		// Create HTML content for PDF with professional styling
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>QOL Baseline Report - ${familyData.FAMILY_ID || "N/A"}</title>
				<style>
					@page {
						margin: 1cm;
						size: A4;
					}
					* {
						margin: 0;
						padding: 0;
						box-sizing: border-box;
					}
					body {
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
						font-size: 11pt;
						line-height: 1.6;
						color: #2c3e50;
						padding: 20px;
						background: #ffffff;
					}
					.header {
						background: linear-gradient(135deg, #0b4d2b 0%, #0a3d22 100%);
						color: #ffffff;
						padding: 30px 25px;
						margin: -20px -20px 25px -20px;
						text-align: center;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
					}
					.header h1 {
						font-size: 28pt;
						font-weight: 700;
						margin: 0 0 10px 0;
						letter-spacing: 0.5px;
					}
					.header .subtitle {
						font-size: 14pt;
						font-weight: 400;
						opacity: 0.95;
						margin-top: 8px;
					}
					.report-info {
						background-color: #f8f9fa;
						border-left: 4px solid #0b4d2b;
						padding: 15px 20px;
						margin: 20px 0;
						border-radius: 4px;
					}
					.report-info-row {
						display: flex;
						justify-content: space-between;
						margin: 8px 0;
						font-size: 10pt;
					}
					.report-info-label {
						font-weight: 600;
						color: #0b4d2b;
						min-width: 140px;
					}
					.report-info-value {
						color: #2c3e50;
						flex: 1;
					}
					.section {
						margin-top: 35px;
						page-break-inside: avoid;
					}
					.section-title {
						font-size: 16pt;
						font-weight: 700;
						color: #0b4d2b;
						margin-bottom: 20px;
						padding-bottom: 10px;
						border-bottom: 3px solid #0b4d2b;
						text-transform: uppercase;
						letter-spacing: 0.5px;
					}
					.content {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 20px;
						margin-top: 15px;
					}
					.field {
						margin-bottom: 18px;
						page-break-inside: avoid;
					}
					.field-label {
						font-weight: 600;
						color: #34495e;
						margin-bottom: 6px;
						font-size: 10pt;
						text-transform: capitalize;
					}
					.field-value {
						background-color: #f8f9fa;
						padding: 10px 12px;
						border-radius: 4px;
						font-size: 10pt;
						color: #2c3e50;
						border: 1px solid #e9ecef;
						min-height: 20px;
					}
					.members-table {
						width: 100%;
						border-collapse: collapse;
						margin-top: 20px;
						font-size: 9pt;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
					}
					.members-table th {
						background: linear-gradient(135deg, #0b4d2b 0%, #0a3d22 100%);
						color: #ffffff;
						font-weight: 600;
						padding: 12px 8px;
						text-align: left;
						border: 1px solid #0a3d22;
						font-size: 9pt;
						text-transform: uppercase;
						letter-spacing: 0.3px;
					}
					.members-table td {
						border: 1px solid #dee2e6;
						padding: 10px 8px;
						text-align: left;
						font-size: 9pt;
						color: #495057;
					}
					.members-table tr:nth-child(even) {
						background-color: #f8f9fa;
					}
					.members-table tr:hover {
						background-color: #e9ecef;
					}
					.footer {
						margin-top: 40px;
						padding-top: 20px;
						border-top: 2px solid #dee2e6;
						text-align: center;
						color: #6c757d;
						font-size: 9pt;
					}
					.footer-info {
						display: flex;
						justify-content: space-between;
						margin-top: 15px;
						padding-top: 15px;
						border-top: 1px solid #e9ecef;
					}
					.footer-item {
						flex: 1;
						text-align: center;
					}
					.footer-label {
						font-weight: 600;
						color: #0b4d2b;
						margin-bottom: 5px;
						font-size: 9pt;
					}
					.footer-value {
						color: #495057;
						font-size: 9pt;
					}
					@media print {
						body {
							margin: 0;
							padding: 15px;
						}
						.section {
							page-break-inside: avoid;
						}
						.members-table {
							page-break-inside: auto;
						}
						.members-table tr {
							page-break-inside: avoid;
							page-break-after: auto;
						}
						.members-table thead {
							display: table-header-group;
						}
						.members-table tfoot {
							display: table-footer-group;
						}
					}
				</style>
			</head>
			<body>
				<div class="header">
					<h1>QOL Baseline Report</h1>
					<div class="subtitle">Family ID: ${familyData.FAMILY_ID || "N/A"}</div>
					<div class="subtitle" style="margin-top: 5px;">Family Head: ${familyData.HEAD_NAME || "N/A"}</div>
				</div>
				
				<div class="report-info">
					<div class="report-info-row">
						<span class="report-info-label">Download Date:</span>
						<span class="report-info-value">${downloadDate}</span>
					</div>
					<div class="report-info-row">
						<span class="report-info-label">Current User:</span>
						<span class="report-info-value">${currentUserName}</span>
					</div>
				</div>
				
				<div class="section">
					<div class="section-title">Family Information</div>
					<div class="content">
						${Object.entries(familyData).map(([key, value]) => `
							<div class="field">
								<div class="field-label">${formatFieldName(key)}</div>
								<div class="field-value">${formatValue(value)}</div>
							</div>
						`).join('')}
					</div>
				</div>

				${members.length > 0 ? `
					<div class="section">
						<div class="section-title">Family Members (${members.length})</div>
						<table class="members-table">
							<thead>
								<tr>
									<th>Member ID</th>
									<th>Full Name</th>
									<th>CNIC</th>
									<th>Relation</th>
									<th>Gender</th>
									<th>Age</th>
									<th>Marital Status</th>
									<th>Occupation</th>
									<th>Current Education</th>
									<th>Highest Qualification</th>
									<th>Earning Source</th>
									<th>Monthly Income</th>
								</tr>
							</thead>
							<tbody>
								${members.map(member => `
									<tr>
										<td>${member.MEMBER_ID || "N/A"}</td>
										<td>${member.FULL_NAME || "N/A"}</td>
										<td>${member.CNIC || "N/A"}</td>
										<td>${member.RELATION || "N/A"}</td>
										<td>${member.GENDER || "N/A"}</td>
										<td>${member.AGE || "N/A"}</td>
										<td>${member.MARITAL_STATUS || "N/A"}</td>
										<td>${member.OCCUPATION || "N/A"}</td>
										<td>${member.CURRENT_EDUCATION || "N/A"}</td>
										<td>${member.HIGHEST_QLF || "N/A"}</td>
										<td>${member.EARNING_SOURCE || "N/A"}</td>
										<td>${formatNumber(member.MONTHLY_INCOME)}</td>
									</tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				` : ''}

				<div class="footer">
					<div style="margin-bottom: 15px; font-size: 9pt; color: #6c757d;">
						This is a system-generated report. For any discrepancies, please contact the administrator.
					</div>
					<div class="footer-info">
						<div class="footer-item">
							<div class="footer-label">Download Date</div>
							<div class="footer-value">${downloadDate}</div>
						</div>
						<div class="footer-item">
							<div class="footer-label">Current User</div>
							<div class="footer-value">${currentUserName}</div>
						</div>
					</div>
				</div>
			</body>
			</html>
		`;

		printWindow.document.write(htmlContent);
		printWindow.document.close();

		// Wait for content to load, then print
		setTimeout(() => {
			printWindow.print();
		}, 250);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
						<p className="mt-4 text-gray-600">Loading family details...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error || !familyData) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<button
						onClick={() => router.push('/dashboard/qol-baseline')}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error || "Family not found"}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Family ID - {familyData.FAMILY_ID || "N/A"}</h1>
					<p className="text-gray-600 mt-2">Family Head: {familyData.HEAD_NAME || "N/A"}</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={downloadPDF}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<FileText className="h-4 w-4" />
						Download PDF
					</button>
					<button
						onClick={() => router.push('/dashboard/qol-baseline')}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to List
					</button>
				</div>
			</div>

			{/* Family Information */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
					<h2 className="text-xl font-semibold text-gray-900">Family Information</h2>
				</div>
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{Object.entries(familyData).map(([key, value]) => (
							<div key={key}>
								<label className="block text-sm font-semibold text-gray-700 mb-1">
									{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
								</label>
								<p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
									{typeof value === 'number' ? formatNumber(value) : (value || "N/A")}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Family Members */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
					<h2 className="text-xl font-semibold text-gray-900">
						Family Members {members.length > 0 && `(${members.length})`}
					</h2>
				</div>
				<div className="p-6">
					{members.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No members found for this family.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member ID</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relation</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marital Status</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Education</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Qualification</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earning Source</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Income</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{members.map((member, index) => (
										<tr key={member.MEMBER_ID || index} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.MEMBER_ID || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.FULL_NAME || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.CNIC || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.RELATION || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.GENDER || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.AGE || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.MARITAL_STATUS || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.OCCUPATION || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.CURRENT_EDUCATION || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.HIGHEST_QLF || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{member.EARNING_SOURCE || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{formatNumber(member.MONTHLY_INCOME)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

