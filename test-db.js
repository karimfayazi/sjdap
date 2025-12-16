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

async function testDatabase() {
    try {
        console.log('Testing database connection...');
        const pool = await sql.connect(trackingSystemConnection);
        console.log('Connected to database successfully');

        // Test query to see if there are any loan records
        const result = await pool.request().query(`
            SELECT TOP 5
                [Intervention_ID], [Family_ID], [Letter_Ref], [Letter_Date]
            FROM [SJDA_Tracking_System].[dbo].[Loan_Authorization_Process]
            WHERE [Intervention_ID] IS NOT NULL
        `);

        console.log('Loan records found:', result.recordset.length);
        console.log('Sample records:', result.recordset.slice(0, 2));

        await pool.close();
        console.log('Database test completed successfully');
    } catch (error) {
        console.error('Database test failed:', error);
    }
}

testDatabase();
