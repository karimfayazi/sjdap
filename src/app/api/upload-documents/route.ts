import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const interventionId = formData.get("interventionId") as string;
        const letterRef = formData.get("letterRef") as string;

        if (!interventionId || !letterRef) {
            return NextResponse.json(
                { success: false, message: "Intervention ID and Letter Reference are required" },
                { status: 400 }
            );
        }

        // Create main folder for this loan process inside Next.js public directory
        // so that files are directly accessible via /uploads/... URLs
        const mainFolder = path.join(process.cwd(), "public", "uploads", "loan-process", letterRef);
        const cnicFolder = path.join(mainFolder, "CNIC");
        const kycFolder = path.join(mainFolder, "KYC");
        const agreementFolder = path.join(mainFolder, "AGREEMENT_LETTER");

        // Create directories if they don't exist
        [mainFolder, cnicFolder, kycFolder, agreementFolder].forEach(folder => {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
            }
        });

        const uploadedFiles: { [key: string]: string } = {};

        // Handle CNIC file
        const cnicFile = formData.get("cnic") as File;
        if (cnicFile) {
            const cnicFileName = `CNIC_${interventionId}_${Date.now()}${path.extname(cnicFile.name)}`;
            const cnicPath = path.join(cnicFolder, cnicFileName);

            const cnicBuffer = Buffer.from(await cnicFile.arrayBuffer());
            fs.writeFileSync(cnicPath, cnicBuffer);
            uploadedFiles.cnic = `/uploads/loan-process/${letterRef}/CNIC/${cnicFileName}`;
        }

        // Handle KYC file
        const kycFile = formData.get("kyc") as File;
        if (kycFile) {
            const kycFileName = `KYC_${interventionId}_${Date.now()}${path.extname(kycFile.name)}`;
            const kycPath = path.join(kycFolder, kycFileName);

            const kycBuffer = Buffer.from(await kycFile.arrayBuffer());
            fs.writeFileSync(kycPath, kycBuffer);
            uploadedFiles.kyc = `/uploads/loan-process/${letterRef}/KYC/${kycFileName}`;
        }

        // Handle Agreement Letter file
        const agreementFile = formData.get("agreementLetter") as File;
        if (agreementFile) {
            const agreementFileName = `AGREEMENT_${interventionId}_${Date.now()}${path.extname(agreementFile.name)}`;
            const agreementPath = path.join(agreementFolder, agreementFileName);

            const agreementBuffer = Buffer.from(await agreementFile.arrayBuffer());
            fs.writeFileSync(agreementPath, agreementBuffer);
            uploadedFiles.agreementLetter = `/uploads/loan-process/${letterRef}/AGREEMENT_LETTER/${agreementFileName}`;
        }

        return NextResponse.json({
            success: true,
            message: "Documents uploaded successfully",
            files: uploadedFiles,
            folders: {
                main: mainFolder,
                cnic: cnicFolder,
                kyc: kycFolder,
                agreement: agreementFolder
            }
        });

    } catch (error) {
        console.error("Error uploading documents:", error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                success: false,
                message: "Error uploading documents: " + errorMessage
            },
            { status: 500 }
        );
    }
}
