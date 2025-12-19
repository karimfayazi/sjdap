"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import jsPDF from "jspdf";

type ApplicationDetails = {
	application: {
		ApplicationId: number;
		FormNo: string;
		TotalFamilyMembers: string | number;
		Remarks: string | null;
		CreatedAt: string | null;
		CreatedBy: string | null;
	};
	familyHeads: Array<{
		FormNo: string;
		ApplicationId: number;
		PersonRole: string;
		FullName: string;
		DOBMonth: string;
		DOBYear: string;
		CNICNo: string;
		MotherTongue: string;
		ResidentialAddress: string;
		PrimaryContactNo: string;
		RegionalCouncil: string;
		LocalCouncil: string;
		CurrentJK: string;
		PrimaryLocationSettlement: string;
		AreaOfOrigin: string;
		HouseStatusName: string;
	}>;
	familyMembers: Array<{
		ApplicationId: number;
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
			LastFormalQualification: string;
			LastFormalQualificationOther: string;
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

export default function ApplicationDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const applicationId = params?.id as string;
	
	const [details, setDetails] = useState<ApplicationDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (applicationId) {
			fetchApplicationDetails();
		} else {
			setError("Application ID is missing from the URL");
			setLoading(false);
		}
	}, [applicationId]);

	const fetchApplicationDetails = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`/api/baseline-applications/${applicationId}`);
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

		const pdf = new jsPDF({
			orientation: 'landscape',
			unit: 'mm',
			format: 'a4'
		});

		const pageWidth = pdf.internal.pageSize.width;
		const pageHeight = pdf.internal.pageSize.height;
		const marginLeft = 15;
		const marginRight = 15;
		const marginTop = 20;
		const contentWidth = pageWidth - marginLeft - marginRight;
		let yPosition = marginTop;

		// Helper function to add text with word wrap
		const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal', color: number[] = [0, 0, 0]) => {
			pdf.setFontSize(fontSize);
			pdf.setFont('helvetica', fontStyle);
			pdf.setTextColor(color[0], color[1], color[2]);
			const lines = pdf.splitTextToSize(text || 'N/A', maxWidth);
			pdf.text(lines, x, y);
			return lines.length * (fontSize * 0.35); // Return height used
		};

		// Helper function to add centered text
		const addCenteredText = (text: string, y: number, fontSize: number = 10, fontStyle: string = 'normal', color: number[] = [0, 0, 0]) => {
			pdf.setFontSize(fontSize);
			pdf.setFont('helvetica', fontStyle);
			pdf.setTextColor(color[0], color[1], color[2]);
			const textWidth = pdf.getTextWidth(text);
			const x = (pageWidth - textWidth) / 2;
			pdf.text(text, x, y);
			return fontSize * 0.35; // Return height used
		};

		// Helper function to add a section header
		const addSectionHeader = (title: string, y: number) => {
			pdf.setFillColor(11, 77, 43); // #0b4d2b
			pdf.rect(marginLeft, y - 8, contentWidth, 8, 'F');
			addText(title, marginLeft + 2, y - 2, contentWidth - 4, 10, 'bold', [255, 255, 255]);
			return y + 5;
		};

		// Helper function to add a field
		const addField = (label: string, value: string | number | null | undefined, x: number, y: number, labelWidth: number = 60, valueWidth: number = 0): number => {
			const valueW = valueWidth || (contentWidth - labelWidth - 10);
			const labelHeight = addText(label + ':', x, y, labelWidth, 8, 'bold', [52, 73, 94]);
			const valueText = value !== null && value !== undefined ? String(value) : 'N/A';
			const valueHeight = addText(valueText, x + labelWidth + 5, y, valueW, 8, 'normal', [44, 62, 80]);
			return Math.max(labelHeight, valueHeight) + 4;
		};

		// Header
		pdf.setFillColor(11, 77, 43);
		pdf.rect(marginLeft, yPosition, contentWidth, 20, 'F');
		// Centered title with reduced font size
		addCenteredText('QOL APPLICATION DETAILS', yPosition + 8, 14, 'bold', [255, 255, 255]);
		// Family ID with small text
		addCenteredText(`Family ID: ${details.application.ApplicationId}`, yPosition + 14, 9, 'normal', [255, 255, 255]);
		yPosition += 25;

		// Application Information Section (with smaller text)
		pdf.setFillColor(11, 77, 43); // #0b4d2b
		pdf.rect(marginLeft, yPosition - 8, contentWidth, 7, 'F');
		addText('Application Information', marginLeft + 2, yPosition - 2, contentWidth - 4, 9, 'bold', [255, 255, 255]);
		yPosition += 2;
		const appFields: Array<[string, string | number | null | undefined]> = [
			['Application ID', details.application.ApplicationId],
			['Form No', details.application.FormNo],
			['Total Family Members', details.application.TotalFamilyMembers],
			['Remarks', details.application.Remarks],
		];

		appFields.forEach(([label, value], index) => {
			if (index % 2 === 0) {
				yPosition += addField(label, value, marginLeft, yPosition, 60, (contentWidth - 65) / 2);
			} else {
				const prevY = yPosition - 8;
				addField(label, value, marginLeft + (contentWidth / 2) + 5, prevY, 60, (contentWidth - 65) / 2);
			}
		});
		yPosition += 5;

		// Check if we need a new page (landscape height is ~210mm)
		if (yPosition > pageHeight - 20) {
			pdf.addPage();
			yPosition = marginTop;
		}

		// Family Heads Section
		if (details.familyHeads && details.familyHeads.length > 0) {
			details.familyHeads.forEach((head, headIndex) => {
				if (yPosition > pageHeight - 20) {
					pdf.addPage();
					yPosition = marginTop;
				}
				pdf.setFillColor(11, 77, 43); // #0b4d2b
				pdf.rect(marginLeft, yPosition - 8, contentWidth, 7, 'F');
				addText('Family Head Information', marginLeft + 2, yPosition - 2, contentWidth - 4, 9, 'bold', [255, 255, 255]);
				yPosition += 2;
				
				const headFields: Array<[string, string | number | null | undefined]> = [
					['Full Name', head.FullName],
					['Person Role', head.PersonRole],
					['Date of Birth', head.DOBMonth && head.DOBYear ? `${head.DOBMonth}/${head.DOBYear}` : null],
					['CNIC No', head.CNICNo],
					['Primary Contact No', head.PrimaryContactNo],
					['Regional Council', head.RegionalCouncil],
					['Local Council', head.LocalCouncil],
					['Current JK', head.CurrentJK],
					['Residential Address', head.ResidentialAddress],
					['House Status', head.HouseStatusName],
				];

				headFields.forEach(([label, value], index) => {
					if (index % 2 === 0) {
						yPosition += addField(label, value, marginLeft, yPosition, 70, (contentWidth - 75) / 2);
					} else {
						const prevY = yPosition - 8;
						addField(label, value, marginLeft + (contentWidth / 2) + 5, prevY, 70, (contentWidth - 75) / 2);
					}
				});
				yPosition += 5;
			});
		}

		// Family Members Section
		if (details.familyMembers && details.familyMembers.length > 0) {
			details.familyMembers.forEach((member, memberIndex) => {
				if (yPosition > pageHeight - 20) {
					pdf.addPage();
					yPosition = marginTop;
				}
				pdf.setFillColor(11, 77, 43); // #0b4d2b
				pdf.rect(marginLeft, yPosition - 8, contentWidth, 7, 'F');
				addText(`Family Member ${memberIndex + 1}`, marginLeft + 2, yPosition - 2, contentWidth - 4, 9, 'bold', [255, 255, 255]);
				yPosition += 2;
				
				// Basic Information
				addText('Basic Information', marginLeft, yPosition, contentWidth, 9, 'bold', [52, 73, 94]);
				yPosition += 5;

				const basicFields: Array<[string, string | number | null | undefined]> = [
					['Full Name', member.FullName],
					['Member No', member.MemberNo],
					['B-Form/CNIC', member.BFormOrCNIC],
					['Relationship', member.RelationshipName + (member.RelationshipOther ? ` (${member.RelationshipOther})` : '')],
					['Gender', member.GenderName],
					['Marital Status', member.MaritalStatusName],
					['Date of Birth', member.DOBMonth && member.DOBYear ? `${member.DOBMonth}/${member.DOBYear}` : null],
					['Occupation', (member.OccupationName || '') + (member.OccupationOther ? ` (${member.OccupationOther})` : '')],
					['Primary Location', member.PrimaryLocation],
					['Is Primary Earner', member.IsPrimaryEarner === true ? 'Yes' : member.IsPrimaryEarner === false ? 'No' : 'N/A'],
				];

				basicFields.forEach(([label, value], index) => {
					if (index % 2 === 0) {
						yPosition += addField(label, value, marginLeft, yPosition, 65, (contentWidth - 70) / 2);
					} else {
						const prevY = yPosition - 8;
						addField(label, value, marginLeft + (contentWidth / 2) + 5, prevY, 65, (contentWidth - 70) / 2);
					}
				});
				yPosition += 5;

				// Education Information
				if (member.education) {
					if (yPosition > pageHeight - 20) {
						pdf.addPage();
						yPosition = marginTop;
					}
					addText('Education Information', marginLeft, yPosition, contentWidth, 9, 'bold', [52, 73, 94]);
					yPosition += 5;

					const eduFields: Array<[string, string | number | null | undefined]> = [
						['Currently Studying', member.education.IsCurrentlyStudying === '1' ? 'Yes' : member.education.IsCurrentlyStudying === '2' ? 'No' : member.education.IsCurrentlyStudying === '99' ? 'Not applicable' : 'N/A'],
						['Institution Type', member.education.InstitutionType],
						['Institution Type Other', member.education.InstitutionTypeOther],
						['Current Class', member.education.CurrentClass],
						['Current Class Other', member.education.CurrentClassOther],
						['Last Formal Qualification', member.education.LastFormalQualification],
						['Last Formal Qualification Other', member.education.LastFormalQualificationOther],
						['Highest Qualification', member.education.HighestQualification],
						['Highest Qualification Other', member.education.HighestQualificationOther],
					];

					eduFields.forEach(([label, value], index) => {
						if (index % 2 === 0) {
							yPosition += addField(label, value, marginLeft, yPosition, 75, (contentWidth - 80) / 2);
						} else {
							const prevY = yPosition - 8;
							addField(label, value, marginLeft + (contentWidth / 2) + 5, prevY, 75, (contentWidth - 80) / 2);
						}
					});
					yPosition += 5;
				}

				// Livelihood Information
				if (member.livelihood) {
					if (yPosition > pageHeight - 20) {
						pdf.addPage();
						yPosition = marginTop;
					}
					addText('Livelihood Information', marginLeft, yPosition, contentWidth, 9, 'bold', [52, 73, 94]);
					yPosition += 5;

					const livFields: Array<[string, string | number | null | undefined]> = [
						['Currently Earning', member.livelihood.IsCurrentlyEarning === '1' ? 'Yes' : member.livelihood.IsCurrentlyEarning === '2' ? 'No' : member.livelihood.IsCurrentlyEarning === '99' ? 'Not applicable' : 'N/A'],
						['Earning Source', member.livelihood.EarningSource],
						['Earning Source Other', member.livelihood.EarningSourceOther],
						['Salaried Work Sector', member.livelihood.SalariedWorkSector],
						['Salaried Work Sector Other', member.livelihood.SalariedWorkSectorOther],
						['Work Field', member.livelihood.WorkField],
						['Work Field Other', member.livelihood.WorkFieldOther],
						['Monthly Income', member.livelihood.MonthlyIncome ? `PKR ${member.livelihood.MonthlyIncome.toLocaleString()}` : null],
						['Jobless Duration', member.livelihood.JoblessDuration],
						['Reason Not Earning', member.livelihood.ReasonNotEarning],
						['Reason Not Earning Other', member.livelihood.ReasonNotEarningOther],
					];

					livFields.forEach(([label, value], index) => {
						if (index % 2 === 0) {
							yPosition += addField(label, value, marginLeft, yPosition, 75, (contentWidth - 80) / 2);
						} else {
							const prevY = yPosition - 8;
							addField(label, value, marginLeft + (contentWidth / 2) + 5, prevY, 75, (contentWidth - 80) / 2);
						}
					});
					yPosition += 5;
				}
			});
		}

		// Footer
		const totalPages = (pdf as any).internal.getNumberOfPages();
		for (let i = 1; i <= totalPages; i++) {
			pdf.setPage(i);
			pdf.setFontSize(8);
			pdf.setTextColor(108, 117, 125);
			pdf.text(
				`Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleString()}`,
				pageWidth / 2,
				pdf.internal.pageSize.height - 10,
				{ align: 'center' }
			);
		}

		// Save PDF
		pdf.save(`QOL_Application_${details.application.FormNo}_${new Date().toISOString().split('T')[0]}.pdf`);
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
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={() => router.back()}
						className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
					<p className="text-yellow-600 mb-4">Application not found</p>
					<button
						onClick={() => router.back()}
						className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
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
						<p className="text-gray-600 mt-2">Form No: {details.application.FormNo}</p>
					</div>
				</div>
				<button
					onClick={downloadPDF}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
				>
					<FileText className="h-4 w-4" />
					Download PDF
				</button>
			</div>

			{/* Application Information */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-4">Application Information</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Application ID</label>
						<p className="text-sm text-gray-900">{details.application.ApplicationId}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Form No</label>
						<p className="text-sm text-gray-900">{details.application.FormNo}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Total Family Members</label>
						<p className="text-sm text-gray-900">{details.application.TotalFamilyMembers}</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
						<p className="text-sm text-gray-900">{details.application.Remarks || "N/A"}</p>
					</div>
				</div>
			</div>

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
									<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
									<p className="text-sm text-gray-900">
										{head.DOBMonth && head.DOBYear ? `${head.DOBMonth}/${head.DOBYear}` : "N/A"}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">CNIC No</label>
									<p className="text-sm text-gray-900">{head.CNICNo || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact No</label>
									<p className="text-sm text-gray-900">{head.PrimaryContactNo || "N/A"}</p>
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
									<label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
									<p className="text-sm text-gray-900">{head.ResidentialAddress || "N/A"}</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">House Status</label>
									<p className="text-sm text-gray-900">{head.HouseStatusName || "N/A"}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Family Members */}
			{details.familyMembers && details.familyMembers.length > 0 && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Family Members</h2>
					{details.familyMembers.map((member, index) => (
						<div key={member.MemberNo} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
							<h3 className="text-lg font-medium text-gray-800 mb-4">Family Member {index + 1}</h3>
							
							{/* Basic Information */}
							<div className="mb-4">
								<h4 className="text-md font-medium text-gray-700 mb-3">Basic Information</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
										<p className="text-sm text-gray-900">{member.FullName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Member No</label>
										<p className="text-sm text-gray-900">{member.MemberNo || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">B-Form/CNIC</label>
										<p className="text-sm text-gray-900">{member.BFormOrCNIC || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
										<p className="text-sm text-gray-900">
											{member.RelationshipName || "N/A"}
											{member.RelationshipOther && ` (${member.RelationshipOther})`}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
										<p className="text-sm text-gray-900">{member.GenderName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
										<p className="text-sm text-gray-900">{member.MaritalStatusName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
										<p className="text-sm text-gray-900">
											{member.DOBMonth && member.DOBYear ? `${member.DOBMonth}/${member.DOBYear}` : "N/A"}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
										<p className="text-sm text-gray-900">
											{member.OccupationName || "N/A"}
											{member.OccupationOther && ` (${member.OccupationOther})`}
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Primary Location</label>
										<p className="text-sm text-gray-900">{member.PrimaryLocation || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Is Primary Earner</label>
										<p className="text-sm text-gray-900">
											{member.IsPrimaryEarner === true ? "Yes" : member.IsPrimaryEarner === false ? "No" : "N/A"}
										</p>
									</div>
								</div>
							</div>

							{/* Education Information */}
							{member.education && (
								<div className="mb-4">
									<h4 className="text-md font-medium text-gray-700 mb-3">Education Information</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Currently Studying</label>
											<p className="text-sm text-gray-900">
												{member.education.IsCurrentlyStudying === "1" ? "Yes" : 
												 member.education.IsCurrentlyStudying === "2" ? "No" : 
												 member.education.IsCurrentlyStudying === "99" ? "Not applicable" : "N/A"}
											</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
											<p className="text-sm text-gray-900">{member.education.InstitutionType || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Current Class</label>
											<p className="text-sm text-gray-900">{member.education.CurrentClass || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Highest Qualification</label>
											<p className="text-sm text-gray-900">{member.education.HighestQualification || "N/A"}</p>
										</div>
									</div>
								</div>
							)}

							{/* Livelihood Information */}
							{member.livelihood && (
								<div>
									<h4 className="text-md font-medium text-gray-700 mb-3">Livelihood Information</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Currently Earning</label>
											<p className="text-sm text-gray-900">
												{member.livelihood.IsCurrentlyEarning === "1" ? "Yes" : 
												 member.livelihood.IsCurrentlyEarning === "2" ? "No" : 
												 member.livelihood.IsCurrentlyEarning === "99" ? "Not applicable" : "N/A"}
											</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Earning Source</label>
											<p className="text-sm text-gray-900">{member.livelihood.EarningSource || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
											<p className="text-sm text-gray-900">
												{member.livelihood.MonthlyIncome ? `PKR ${member.livelihood.MonthlyIncome.toLocaleString()}` : "N/A"}
											</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Work Field</label>
											<p className="text-sm text-gray-900">{member.livelihood.WorkField || "N/A"}</p>
										</div>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

