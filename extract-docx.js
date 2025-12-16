const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function extractWordContent() {
    try {
        const filePath = path.join(__dirname, 'public', 'uploads', 'word-format', 'Letter Making.docx');
        console.log('Reading file from:', filePath);

        if (!fs.existsSync(filePath)) {
            console.error('File does not exist:', filePath);
            return;
        }

        const buffer = fs.readFileSync(filePath);
        console.log('File size:', buffer.length, 'bytes');

        // Extract raw text
        const result = await mammoth.extractRawText({ buffer });
        console.log('\n=== WORD DOCUMENT CONTENT ===\n');
        console.log(result.value);
        console.log('\n=== END OF CONTENT ===\n');

        // Also try HTML conversion
        const htmlResult = await mammoth.convertToHtml({ buffer });
        console.log('\n=== HTML CONTENT ===\n');
        console.log(htmlResult.value);

    } catch (error) {
        console.error('Error reading Word document:', error);
    }
}

extractWordContent();
