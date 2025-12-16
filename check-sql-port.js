// Script to check SQL Server port and test connection
// Run with: node check-sql-port.js

const sql = require('mssql');

async function checkSQLPort() {
    console.log('='.repeat(70));
    console.log('SQL Server Port Finder and Connection Tester');
    console.log('='.repeat(70));
    console.log('\nThis script will help you find the correct connection string.\n');

    // Instructions
    console.log('STEP 1: Find the Port Number');
    console.log('--------------------------------');
    console.log('1. Open SQL Server Configuration Manager');
    console.log('2. Go to: SQL Server Network Configuration → Protocols for SQLEXPRESS');
    console.log('3. Double-click "TCP/IP"');
    console.log('4. Go to "IP Addresses" tab');
    console.log('5. Scroll to the bottom to find "IPAll" section');
    console.log('6. Look for "TCP Dynamic Ports" (e.g., 1433, 49152, 49153, etc.)');
    console.log('7. Note this port number\n');

    console.log('STEP 2: Test Connection');
    console.log('--------------------------------');
    console.log('Trying different connection methods...\n');

    // Try different connection formats
    const attempts = [
        {
            name: 'Method 1: localhost with instance',
            conn: 'Server=localhost\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;'
        },
        {
            name: 'Method 2: Computer name with instance',
            conn: 'Server=SJDAP-MS-LT-KF\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;'
        },
        {
            name: 'Method 3: localhost with default port 1433',
            conn: 'Server=localhost,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;'
        },
        {
            name: 'Method 4: Computer name with default port 1433',
            conn: 'Server=SJDAP-MS-LT-KF,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;'
        },
        {
            name: 'Method 5: 127.0.0.1 with instance',
            conn: 'Server=127.0.0.1\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;'
        },
    ];

    let successFound = false;

    for (const attempt of attempts) {
        try {
            process.stdout.write(`Testing ${attempt.name}... `);
            const pool = await sql.connect(attempt.conn);
            console.log('✓ SUCCESS!\n');
            
            // Test query
            const result = await pool.request().query('SELECT DB_NAME() as dbname, @@VERSION as version');
            console.log(`  Connected to database: ${result.recordset[0].dbname}`);
            console.log(`\n  ✓ Working connection string:`);
            console.log(`  ${attempt.conn}`);
            console.log(`\n  Add this to your .env.local file:`);
            console.log(`  MSSQL_PE_DB_CONNECTION="${attempt.conn}"`);
            
            await pool.close();
            successFound = true;
            break;
        } catch (error) {
            const errorMsg = error.message.substring(0, 60);
            console.log(`✗ Failed: ${errorMsg}`);
        }
    }

    if (!successFound) {
        console.log('\n' + '='.repeat(70));
        console.log('ALL AUTOMATIC CONNECTION ATTEMPTS FAILED');
        console.log('='.repeat(70));
        console.log('\nYou need to manually find the port and create .env.local file.\n');
        console.log('MANUAL STEPS:');
        console.log('1. Open SQL Server Configuration Manager');
        console.log('2. Go to: SQL Server Network Configuration → Protocols for SQLEXPRESS');
        console.log('3. Double-click "TCP/IP" → IP Addresses tab');
        console.log('4. Scroll to "IPAll" section at the bottom');
        console.log('5. Note the "TCP Dynamic Ports" value (e.g., 1433, 49152)');
        console.log('6. Create .env.local file in project root with:');
        console.log('   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"');
        console.log('   (Replace <PORT> with the port number from step 5)');
        console.log('7. Restart your Next.js application');
        console.log('\nALTERNATIVE: If SQL Server Browser is running, try:');
        console.log('   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"');
    }

    console.log('\n' + '='.repeat(70));
}

checkSQLPort().catch(console.error);

