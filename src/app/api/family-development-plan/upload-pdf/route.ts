import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const formNumber = formData.get("formNumber") as string;
		const memberNo = formData.get("memberNo") as string;

		if (!file) {
			return NextResponse.json(
				{ success: false, message: "No file provided" },
				{ status: 400 }
			);
		}

		if (file.type !== "application/pdf") {
			return NextResponse.json(
				{ success: false, message: "Only PDF files are allowed" },
				{ status: 400 }
			);
		}

		if (file.size > 10 * 1024 * 1024) { // 10MB limit
			return NextResponse.json(
				{ success: false, message: "File size must be less than 10MB" },
				{ status: 400 }
			);
		}

		// Create directory structure: public/uploads/feasibility-study/{formNumber}/
		const uploadDir = path.join(process.cwd(), "public", "uploads", "feasibility-study", formNumber || "unknown");
		
		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true });
		}

		// Generate unique filename
		const timestamp = Date.now();
		const fileName = `Feasibility_${formNumber}_${memberNo}_${timestamp}.pdf`;
		const filePath = path.join(uploadDir, fileName);

		// Save file
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await writeFile(filePath, buffer);

		// Return relative path for database storage
		const relativePath = `/uploads/feasibility-study/${formNumber}/${fileName}`;

		return NextResponse.json({
			success: true,
			message: "File uploaded successfully",
			filePath: relativePath,
			fileName: fileName,
		});
	} catch (error: any) {
		console.error("Error uploading PDF:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Error uploading PDF file",
			},
			{ status: 500 }
		);
	}
}

