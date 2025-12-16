const sql = require('mssql');

const trackingSystemConnection = {
    server: 'sql.live.sjdap.local',
    database: 'SJDA_Tracking_System',
    user: '_websitsjda',
    password: 'MIS4SJDA@786',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectionTimeout: 60000,
        requestTimeout: 120000
    }
};

async function debugPDFData() {
    try {
        console.log('Testing PDF data retrieval...');
        const pool = await sql.connect(trackingSystemConnection);

        // Get the specific loan record
        const result = await pool.request()
            .input("interventionId", 'ECONOMIC-11956')
            .query(`
                SELECT TOP (1)
                    [Intervention_ID], [Family_ID], [Member_ID], [Letter_Ref], [Letter_Date],
                    [Bank_Name], [Bank_Branch], [Account_Title], [Account_Number],
                    [Lien_Percentage], [Beneficiary_Name], [Beneficiary_CNIC],
                    [Beneficiary_Contact], [Beneficiary_Address], [Loan_Type], [Loan_Purpose],
                    [Recommended_Amount], [Recommended_Tenure_Months], [Grace_Period_Months],
                    [Recommended_Branch], [Loan_Status], [Post_Date], [Post_By],
                    [Approved_Date], [Approved_By]
                FROM [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
                WHERE [Intervention_ID] = @interventionId
            `);

        if (result.recordset.length === 0) {
            console.log('No loan record found');
            return;
        }

        const loanData = result.recordset[0];
        console.log('Loan data:', JSON.stringify(loanData, null, 2));

        // Check each field for null/undefined
        console.log('Field validation:');
        Object.keys(loanData).forEach(key => {
            const value = loanData[key];
            console.log(`${key}: ${value} (type: ${typeof value}, isNull: ${value === null}, isUndefined: ${value === undefined})`);
        });

        // Test the values that would be used in PDF
        const beneficiaryName = loanData.Beneficiary_Name || 'N/A';
        const beneficiaryCNIC = loanData.Beneficiary_CNIC || 'N/A';
        const beneficiaryContact = loanData.Beneficiary_Contact || 'N/A';
        const beneficiaryAddress = loanData.Beneficiary_Address || 'N/A';
        const loanAmount = loanData.Recommended_Amount || 'N/A';

        console.log('PDF values:');
        console.log('beneficiaryName:', beneficiaryName, typeof beneficiaryName);
        console.log('beneficiaryCNIC:', beneficiaryCNIC, typeof beneficiaryCNIC);
        console.log('beneficiaryContact:', beneficiaryContact, typeof beneficiaryContact);
        console.log('beneficiaryAddress:', beneficiaryAddress, typeof beneficiaryAddress);
        console.log('loanAmount:', loanAmount, typeof loanAmount);

        await pool.close();
    } catch (error) {
        console.error('Database test failed:', error);
    }
}

debugPDFData();
