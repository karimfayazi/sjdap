"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";

type SWBFamilyData = {
	CNIC?: string;
	Received_Application?: string;
	BTS_Number?: string;
	FAMILY_ID?: string;
	Regional_Council?: string;
	Local_Council?: string;
	Jamat_Khana?: string;
	Programme?: string;
	Beneficiary_Name?: string;
	Gender?: string;
	VIST_FEAP?: string;
	Already_FEAP_Programme?: string;
	Potential_family_declaration_by_FEAP?: string;
	If_no_reason?: string;
	FDP_Status?: string;
	SWB_to_stop_support_from_date?: string;
	Remarks?: string;
	Mentor_Name?: string;
	Social_Support_Amount?: number;
	Economic_Support_Amount?: number;
	update_date?: string;
};

function ViewSWBFamilyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const cnic = searchParams.get("cnic");

	const [family, setFamily] = useState<SWBFamilyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFamily = async () => {
			if (!cnic) {
				setError("Missing CNIC in the URL.");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/swb-families?cnic=${encodeURIComponent(cnic)}`);
				const data = await response.json();

				if (data.success && data.swbFamily) {
					setFamily(data.swbFamily);
				} else {
					setError(data.message || "SWB family record not found.");
				}
			} catch (err) {
				console.error("Error fetching SWB family record:", err);
				setError("Error fetching SWB family record.");
			} finally {
				setLoading(false);
			}
		};

		fetchFamily();
	}, [cnic]);

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | undefined) => {
		if (!amount) return "N/A";
		return new Intl.NumberFormat('en-PK', {
			style: 'currency',
			currency: 'PKR'
		}).format(amount);
	};

	const downloadPDF = () => {
		if (!family) return;

		// Create PDF in landscape orientation
		const doc = new jsPDF("landscape", "mm", "a4");
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const margin = 15;
		const headerHeight = 30;
		const footerHeight = 20;
		const contentStartY = margin + headerHeight;
		const contentEndY = pageHeight - footerHeight;
		let yPos = contentStartY;
		let currentPage = 1;

		// Helper function to add header
		const addHeader = () => {
			// Header background - Dark green
			doc.setFillColor(0, 100, 0); // Dark green
			doc.rect(0, 0, pageWidth, headerHeight, "F");
			
			// Title - Reduced by 25% (from 20 to 15)
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(15);
			doc.setFont("helvetica", "bold");
			doc.text("SWB FAMILY DETAILS REPORT", pageWidth / 2, 18, { align: "center" });
			
			// Reset text color
			doc.setTextColor(0, 0, 0);
		};

		// Helper function to add footer
		const addFooter = (pageNum: number, totalPages: number) => {
			const footerY = pageHeight - 10;
			
			// Footer line
			doc.setDrawColor(200, 200, 200);
			doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
			
			// Footer text
			doc.setFontSize(8);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(100, 100, 100);
			
			// Organization name - wrap if needed
			const orgText = "SJDA - Social Welfare Board Family Management System";
			const orgTextWidth = doc.getTextWidth(orgText);
			if (orgTextWidth > pageWidth - margin * 2 - 40) {
				// Split into two lines if too long
				const orgLines = doc.splitTextToSize(orgText, pageWidth - margin * 2 - 40);
				doc.text(orgLines, margin, footerY - 2);
			} else {
				doc.text(orgText, margin, footerY);
			}
			
			// Page number
			doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
			
			// Reset text color
			doc.setTextColor(0, 0, 0);
		};

		// Helper function to check if new page needed
		const checkNewPage = (requiredSpace: number) => {
			if (yPos + requiredSpace > contentEndY) {
				addFooter(currentPage, 0); // Will update total pages later
				doc.addPage();
				currentPage++;
				addHeader();
				yPos = contentStartY;
				return true;
			}
			return false;
		};

		// Helper function to add section
		const addSection = (title: string, data: Array<{ label: string; value: string }>) => {
			checkNewPage(15);
			
			// Section title background
			doc.setFillColor(240, 240, 240);
			doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 8, 2, 2, "F");
			
			// Section title
			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(11, 77, 43);
			doc.text(title, margin + 3, yPos);
			yPos += 10;
			
			// Reset text color
			doc.setTextColor(0, 0, 0);
			
			// Calculate column width for two-column layout
			const columnWidth = (pageWidth - margin * 3) / 2;
			const leftColumnX = margin;
			const rightColumnX = margin + columnWidth + margin;
			const labelMaxWidth = 50; // Maximum width for labels
			const valueStartOffset = 55; // Space for labels
			const valueMaxWidth = columnWidth - valueStartOffset; // Available width for values
			let currentColumn = 0; // 0 = left, 1 = right
			let leftColumnY = yPos;
			let rightColumnY = yPos;
			
			data.forEach((item, index) => {
				const isLeftColumn = currentColumn === 0;
				const currentX = isLeftColumn ? leftColumnX : rightColumnX;
				let currentY = isLeftColumn ? leftColumnY : rightColumnY;
				
				// Check if we need a new page
				if (currentY + 10 > contentEndY) {
					if (isLeftColumn && currentColumn === 0) {
						// Move to right column if available
						currentColumn = 1;
						currentY = rightColumnY;
					} else {
						// Need new page
						addFooter(currentPage, 0);
						doc.addPage();
						currentPage++;
						addHeader();
						yPos = contentStartY;
						leftColumnY = yPos;
						rightColumnY = yPos;
						currentColumn = 0;
						currentY = leftColumnY;
					}
				}
				
				// Label - wrap if too long
				doc.setFontSize(9);
				doc.setFont("helvetica", "bold");
				const labelText = `${item.label}:`;
				const labelLines = doc.splitTextToSize(labelText, labelMaxWidth);
				doc.text(labelLines, currentX, currentY);
				
				// Value - wrap properly
				doc.setFont("helvetica", "normal");
				const valueText = item.value || "N/A";
				const valueLines = doc.splitTextToSize(valueText, valueMaxWidth);
				
				// Calculate starting Y for value (align with first line of label)
				const valueY = currentY;
				doc.text(valueLines, currentX + valueStartOffset, valueY);
				
				// Update Y position based on the maximum height of label or value
				// Use proper line height (4.5mm per line for font size 9)
				const lineHeight = 4.5;
				const labelHeight = labelLines.length * lineHeight;
				const valueHeight = valueLines.length * lineHeight;
				const itemHeight = Math.max(labelHeight, valueHeight) + 2;
				
				if (isLeftColumn) {
					leftColumnY += itemHeight;
				} else {
					rightColumnY += itemHeight;
				}
				
				// Switch column after each item
				currentColumn = currentColumn === 0 ? 1 : 0;
			});
			
			// Set yPos to the maximum of both columns
			yPos = Math.max(leftColumnY, rightColumnY) + 5;
		};

		// Add header to first page
		addHeader();

		// Basic Information
		addSection("Basic Information", [
			{ label: "CNIC", value: family.CNIC || "" },
			{ label: "Family ID", value: family.FAMILY_ID || "" },
			{ label: "BTS Number", value: family.BTS_Number || "" },
			{ label: "Beneficiary Name", value: family.Beneficiary_Name || "" },
			{ label: "Gender", value: family.Gender || "" },
			{ label: "Received Application", value: formatDate(family.Received_Application) },
		]);

		// Location Information
		addSection("Location Information", [
			{ label: "Regional Council", value: family.Regional_Council || "" },
			{ label: "Local Council", value: family.Local_Council || "" },
			{ label: "Jamat Khana", value: family.Jamat_Khana || "" },
			{ label: "Programme", value: family.Programme || "" },
			{ label: "Mentor Name", value: family.Mentor_Name || "" },
		]);

		// FEAP Information
		addSection("FEAP Information", [
			{ label: "Visit Family", value: family.VIST_FEAP || "" },
			{ label: "Already FEAP Programme", value: family.Already_FEAP_Programme || "" },
			{ label: "Potential Family Declaration by FEAP/SEDP Staff", value: family.Potential_family_declaration_by_FEAP || "" },
			{ label: "If No Reason", value: family.If_no_reason || "" },
		]);

		// Status and Support Information
		addSection("Status and Support Information", [
			{ label: "FDP Status", value: family.FDP_Status || "" },
			{ label: "SWB to Stop Support From Date", value: formatDate(family.SWB_to_stop_support_from_date) },
			{ label: "Social Support Amount", value: formatCurrency(family.Social_Support_Amount) },
			{ label: "Economic Support Amount", value: formatCurrency(family.Economic_Support_Amount) },
			{ label: "Remarks", value: family.Remarks || "" },
			{ label: "Update Date", value: formatDate(family.update_date) },
		]);

		// Add footer to all pages
		const totalPages = doc.getNumberOfPages();
		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i);
			addFooter(i, totalPages);
		}

		// Save PDF
		const fileName = `SWB_Family_${family.CNIC || "Report"}_${new Date().toISOString().split('T')[0]}.pdf`;
		doc.save(fileName);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
						<p className="text-gray-600 mt-2">Loading SWB family record...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	if (error || !family) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
						<p className="text-gray-600 mt-2">View SWB family information</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/swb-families")}
						className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to SWB Families
					</button>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-700">{error || "SWB family record not found."}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">SWB Family Details</h1>
					<p className="text-gray-600 mt-2">View SWB family information</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={downloadPDF}
						className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						<Download className="h-4 w-4" />
						Download PDF
					</button>
					<button
						onClick={() => router.push("/dashboard/swb-families")}
						className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to SWB Families
					</button>
				</div>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Basic Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
							<p className="text-sm text-gray-900">{family.CNIC || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Family ID</label>
							<p className="text-sm text-gray-900">{family.FAMILY_ID || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">BTS Number</label>
							<p className="text-sm text-gray-900">{family.BTS_Number || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
							<p className="text-sm text-gray-900">{family.Beneficiary_Name || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
							<p className="text-sm text-gray-900">{family.Gender || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Received Application</label>
							<p className="text-sm text-gray-900">{formatDate(family.Received_Application)}</p>
						</div>
					</div>

					{/* Location Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Location Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Council</label>
							<p className="text-sm text-gray-900">{family.Regional_Council || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Council</label>
							<p className="text-sm text-gray-900">{family.Local_Council || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Jamat Khana</label>
							<p className="text-sm text-gray-900">{family.Jamat_Khana || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
							<p className="text-sm text-gray-900">{family.Programme || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Mentor Name</label>
							<p className="text-sm text-gray-900">{family.Mentor_Name || "N/A"}</p>
						</div>
					</div>

					{/* FEAP Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">FEAP Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Visit Family</label>
							<p className="text-sm text-gray-900">{family.VIST_FEAP || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Already FEAP Programme</label>
							<p className="text-sm text-gray-900">{family.Already_FEAP_Programme || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Potential Family Declaration by FEAP/SEDP Staff</label>
							<p className="text-sm text-gray-900">{family.Potential_family_declaration_by_FEAP || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">If No Reason</label>
							<p className="text-sm text-gray-900">{family.If_no_reason || "N/A"}</p>
						</div>
					</div>

					{/* Status and Support Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Status and Support Information</h2>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">FDP Status</label>
							<p className="text-sm text-gray-900">{family.FDP_Status || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">SWB to Stop Support From Date</label>
							<p className="text-sm text-gray-900">{formatDate(family.SWB_to_stop_support_from_date)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Social Support Amount</label>
							<p className="text-sm text-gray-900">{formatCurrency(family.Social_Support_Amount)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Economic Support Amount</label>
							<p className="text-sm text-gray-900">{formatCurrency(family.Economic_Support_Amount)}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
							<p className="text-sm text-gray-900">{family.Remarks || "N/A"}</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Update Date</label>
							<p className="text-sm text-gray-900">{formatDate(family.update_date)}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ViewSWBFamilyPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">View SWB Family</h1>
						<p className="text-gray-600 mt-2">Loading...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ViewSWBFamilyContent />
		</Suspense>
	);
}

