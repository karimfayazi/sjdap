const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function readWordDocument() {
    try {
        const filePath = path.join(__dirname, 'public', 'uploads', 'word-format', 'Letter Making.docx');

        if (!fs.existsSync(filePath)) {
            console.log('Word document not found at:', filePath);
            return;
        }

        const buffer = fs.readFileSync(filePath);

        // Get HTML content
        const htmlResult = await mammoth.convertToHtml({ buffer });
        console.log('=== HTML STRUCTURE ===');
        console.log(htmlResult.value);

        // Get raw text
        const textResult = await mammoth.extractRawText({ buffer });
        console.log('\n=== RAW TEXT ===');
        console.log(textResult.value);

    } catch (error) {
        console.error('Error reading document:', error);
    }
}

readWordDocument();
