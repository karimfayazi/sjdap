"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import jsPDF from "jspdf";

type ApplicationDetails = {
	application: {
		ApplicationId: number | null;
		FormNo: string;
		TotalFamilyMembers: string | number;
		Remarks: string | null;
		CreatedAt: string | null;
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
		RegionalCouncil: string;
		LocalCouncil: string;
		CurrentJK: string;
		PrimaryLocationSettlement: string;
		AreaOfOrigin: string;
		HouseStatusName: string;
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

function ApplicationDetailsContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNo = searchParams.get("formNo");
	
	const [details, setDetails] = useState<ApplicationDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (formNo) {
			fetchApplicationDetails();
		} else {
			setError("Form No is missing from the URL");
			setLoading(false);
		}
	}, [formNo]);

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
				pdf.addPage();
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
						["Last Formal Qualification", member.education.LastFormalQualification],
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
					<div className="space-y-6">
						{details.familyMembers.map((member, index) => (
							<div key={member.MemberNo} className="border border-gray-200 rounded-lg p-4">
								<h3 className="text-lg font-medium text-gray-900 mb-4">
									Member {index + 1} - {member.MemberNo}
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
										<p className="text-sm text-gray-900">{member.FullName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">B-Form/CNIC</label>
										<p className="text-sm text-gray-900">{member.BFormOrCNIC || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
										<p className="text-sm text-gray-900">{member.RelationshipName || "N/A"}</p>
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
										<p className="text-sm text-gray-900">{member.DOBMonth && member.DOBYear ? `${member.DOBMonth}/${member.DOBYear}` : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
										<p className="text-sm text-gray-900">{member.OccupationName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Primary Location</label>
										<p className="text-sm text-gray-900">{member.PrimaryLocation || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Is Primary Earner</label>
										<p className="text-sm text-gray-900">{member.IsPrimaryEarner ? "Yes" : "No"}</p>
									</div>
								</div>

								{/* Education Information */}
								{member.education && (
									<div className="mt-4 pt-4 border-t border-gray-200">
										<h4 className="text-md font-semibold text-gray-900 mb-3">Education Information</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Currently Studying</label>
												<p className="text-sm text-gray-900">{member.education.IsCurrentlyStudying || "N/A"}</p>
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
												<label className="block text-sm font-medium text-gray-700 mb-1">Last Formal Qualification</label>
												<p className="text-sm text-gray-900">{member.education.LastFormalQualification || "N/A"}</p>
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
									<div className="mt-4 pt-4 border-t border-gray-200">
										<h4 className="text-md font-semibold text-gray-900 mb-3">Livelihood Information</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Currently Earning</label>
												<p className="text-sm text-gray-900">{member.livelihood.IsCurrentlyEarning || "N/A"}</p>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Earning Source</label>
												<p className="text-sm text-gray-900">{member.livelihood.EarningSource || "N/A"}</p>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
												<p className="text-sm text-gray-900">{member.livelihood.MonthlyIncome ? `Rs. ${member.livelihood.MonthlyIncome}` : "N/A"}</p>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Jobless Duration</label>
												<p className="text-sm text-gray-900">{member.livelihood.JoblessDuration || "N/A"}</p>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700 mb-1">Reason Not Earning</label>
												<p className="text-sm text-gray-900">{member.livelihood.ReasonNotEarning || "N/A"}</p>
											</div>
										</div>
									</div>
								)}
							</div>
						))}
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

