import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export async function readWordDocument(filePath: string): Promise<string> {
    try {
        const absolutePath = path.join(process.cwd(), filePath);
        const buffer = fs.readFileSync(absolutePath);

        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        console.error('Error reading Word document:', error);
        throw new Error('Failed to read Word document');
    }
}

export async function convertWordToHtml(filePath: string): Promise<string> {
    try {
        const absolutePath = path.join(process.cwd(), filePath);
        const buffer = fs.readFileSync(absolutePath);

        const result = await mammoth.convertToHtml({ buffer });
        return result.value;
    } catch (error) {
        console.error('Error converting Word document:', error);
        throw new Error('Failed to convert Word document');
    }
}
